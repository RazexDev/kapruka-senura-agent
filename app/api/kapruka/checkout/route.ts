import { NextRequest, NextResponse } from "next/server";

const MCP_PROTOCOL_VERSION = "2025-03-26";
const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
} as const;

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://senura.vercel.app",
];

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return "null";
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": getAllowedOrigin(request),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function parseMcpResponseBody(body: string, contentType: string | null, requestId: number): any {
  if (contentType?.includes("text/event-stream")) {
    for (const line of body.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const message = JSON.parse(line.slice(6));
        if (message.id === requestId) return message;
      } catch {
        continue;
      }
    }
    throw new Error("No matching JSON-RPC response found in SSE stream");
  }
  return JSON.parse(body);
}

async function postToMcp(payload: any, sessionId?: string): Promise<{ response: Response; body: string }> {
  const MCP_URL = process.env.KAPRUKA_MCP_URL;
  if (!MCP_URL) throw new Error("KAPRUKA_MCP_URL not configured");

  const headers = new Headers(MCP_HEADERS);
  if (sessionId) headers.set("Mcp-Session-Id", sessionId);
  if (payload.method === "tools/call" && payload.params?.name) {
    headers.set("Mcp-Method", "tools/call");
    headers.set("Mcp-Name", String(payload.params.name));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.text();
    return { response, body };
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("AbortError");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function initializeMcpSession(): Promise<string> {
  const { response, body } = await postToMcp({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "senura-kapruka-checkout", version: "1.0.0" },
    },
  });

  const sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("MCP server did not return a session ID");

  const initMessage = parseMcpResponseBody(body, response.headers.get("content-type"), 1);
  if (initMessage.error) throw new Error(initMessage.error.message);

  await postToMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, sessionId);
  return sessionId;
}

export async function POST(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin(request);
  const corsHeaders = { "Access-Control-Allow-Origin": allowedOrigin };

  try {
    const bodyText = await request.text();
    const data = JSON.parse(bodyText);

    console.log("Incoming checkout payload:", data);

    const {
      cart,
      senderName,
      senderEmail,
      recipientName,
      recipientAddress,
      deliveryCity,
      phoneNumber,
      preferredDeliveryDate,
      giftMessage
    } = data;

    if (!cart || !Array.isArray(cart) || cart.length === 0 || !senderName || !senderEmail || !recipientName || !recipientAddress || !deliveryCity || !phoneNumber || !preferredDeliveryDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const sessionId = await initializeMcpSession();

    try {
      const outboundPayload = {
        params: {
          cart: cart.map((item: any) => ({
            product_id: item.productId,
            quantity: item.quantity || 1
          })),
          recipient: {
            name: recipientName,
            phone: phoneNumber
          },
          delivery: {
            address: recipientAddress,
            city: deliveryCity,
            date: preferredDeliveryDate
          },
          sender: {
            name: senderName,
            email: senderEmail
          },
          gift_message: giftMessage || ""
        }
      };

      console.log("Outgoing Kapruka MCP payload:", JSON.stringify(outboundPayload, null, 2));

      const mcpResponse = await postToMcp({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "kapruka_create_order",
          arguments: outboundPayload
        }
      }, sessionId);

      const parsedResponse = parseMcpResponseBody(mcpResponse.body, mcpResponse.response.headers.get("content-type"), 2);

      if (parsedResponse.error) {
        console.error("MCP JSON-RPC Error:", parsedResponse.error);
        throw new Error(parsedResponse.error.message);
      }

      if (parsedResponse.result?.isError) {
         const textBlock = parsedResponse.result?.content?.find((block: any) => block.type === "text" && block.text);
         console.error("MCP Tool execution error:", textBlock?.text);
         throw new Error("Kapruka validation failed. Check server logs.");
      }

      const textBlock = parsedResponse.result?.content?.find((block: any) => block.type === "text" && block.text);
      console.log("Raw MCP Tool Response Text:", textBlock?.text);
      
      if (!textBlock?.text) {
        throw new Error("No URL returned from MCP");
      }

      let checkoutUrl = "";
      try {
        const parsedContent = JSON.parse(textBlock.text);
        checkoutUrl = parsedContent.url || parsedContent.checkoutUrl || parsedContent.checkout_url || parsedContent.redirectUrl;
      } catch {
        const urlMatch = textBlock.text.match(/https?:\/\/[^\s)"]+/);
        if (urlMatch) {
          checkoutUrl = urlMatch[0];
        }
      }

      if (!checkoutUrl) {
        throw new Error("Could not extract a valid URL from Kapruka MCP response.");
      }

      console.log("Extracted Kapruka URL:", checkoutUrl);

      if (checkoutUrl.includes("pydantic.dev")) {
         console.error("Caught a pydantic error embedded in URL response:", checkoutUrl);
         throw new Error("Validation failed on Kapruka server side.");
      }

      return NextResponse.json({ url: checkoutUrl }, { headers: corsHeaders });
    } catch (mcpError: any) {
      console.error("Failed during Kapruka MCP call:", mcpError);
      throw new Error(mcpError.message || "MCP interaction failed");
    }

  } catch (error: any) {
    console.error("Checkout route overarching error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500, headers: corsHeaders });
  }
}
