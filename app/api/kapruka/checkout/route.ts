import { NextRequest, NextResponse } from "next/server";

import { initializeMcpSession, callMcpTool } from "@/lib/mcpClient";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://senura.vercel.app",
];

function getAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return "*";
}

export async function POST(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin(request);
  const corsHeaders = { "Access-Control-Allow-Origin": allowedOrigin };

  try {
    const bodyText = await request.text();
    const data = JSON.parse(bodyText);

    console.log("Incoming checkout payload:", data);

    const cart = data.cart;
    const {
      senderName,
      senderEmail,
      recipientName,
      recipientAddress,
      deliveryCity,
      phoneNumber,
      preferredDeliveryDate,
      giftMessage,
      specialInstructions
    } = data.shippingDetails || data;

    if (!cart || !Array.isArray(cart) || cart.length === 0 || !senderName || !senderEmail || !recipientName || !recipientAddress || !deliveryCity || !phoneNumber || !preferredDeliveryDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const sessionId = await initializeMcpSession();

    try {
      const outboundPayload = {
        params: {
          cart: cart.map((item: any) => ({
            product_id: item.id,
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
            name: senderName
          },
          gift_message: giftMessage ? 
            (specialInstructions ? `${giftMessage} | Instructions: ${specialInstructions}` : giftMessage) 
            : (specialInstructions ? `Instructions: ${specialInstructions}` : "")
        }
      };

      console.log("Outgoing Kapruka MCP payload:", JSON.stringify(outboundPayload, null, 2));

      const parsedResponse = await callMcpTool(sessionId, "kapruka_create_order", outboundPayload, 2);

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
        throw new Error("Could not extract a valid URL from Kapruka MCP response. Raw: " + (textBlock?.text?.substring(0, 150) || "none"));
      }

      console.log("Extracted Kapruka URL:", checkoutUrl);

      if (checkoutUrl.includes("pydantic.dev")) {
         console.error("Caught a pydantic error embedded in URL response:", checkoutUrl);
         throw new Error("Validation failed on Kapruka server side.");
      }

      return NextResponse.json({ redirectUrl: checkoutUrl }, { headers: corsHeaders });
    } catch (mcpError: any) {
      console.error("Failed during Kapruka MCP call:", mcpError);
      throw new Error(mcpError.message || "MCP interaction failed");
    }

  } catch (error: any) {
    console.error("Checkout route overarching error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500, headers: corsHeaders });
  }
}
