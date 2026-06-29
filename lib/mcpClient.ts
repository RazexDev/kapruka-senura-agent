export const MCP_PROTOCOL_VERSION = "2025-03-26";

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: number | string;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
};

export const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
} as const;

export function parseMcpResponseBody(
  body: string,
  contentType: string | null,
  requestId: number | string,
): JsonRpcResponse {
  if (contentType?.includes("text/event-stream")) {
    for (const line of body.split("\n")) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      try {
        const message = JSON.parse(line.slice(6)) as JsonRpcResponse;
        if (message.id === requestId) {
          return message;
        }
      } catch {
        continue;
      }
    }

    throw new Error("No matching JSON-RPC response found in SSE stream");
  }

  return JSON.parse(body) as JsonRpcResponse;
}

export async function postToMcp(
  payload: JsonRpcRequest,
  sessionId?: string,
  timeoutMs: number = 8000
): Promise<{ response: Response; body: string }> {
  const MCP_URL = process.env.KAPRUKA_MCP_URL;
  if (!MCP_URL) throw new Error("KAPRUKA_MCP_URL not configured");

  const headers = new Headers(MCP_HEADERS);

  if (sessionId) {
    headers.set("Mcp-Session-Id", sessionId);
  }

  if (payload.method === "tools/call" && payload.params?.name) {
    headers.set("Mcp-Method", "tools/call");
    headers.set("Mcp-Name", String(payload.params.name));
  }

  const controller = new AbortController();
  let timeout: NodeJS.Timeout | undefined;
  if (timeoutMs > 0) {
    timeout = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: timeoutMs > 0 ? controller.signal : undefined,
    });
    const body = await response.text();
    return { response, body };
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("AbortError");
    }
    throw err;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function initializeMcpSession(): Promise<string> {
  const { response, body } = await postToMcp({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "senura-kapruka-proxy",
        version: "1.0.0",
      },
    },
  });

  const sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) {
    throw new Error("MCP server did not return a session ID");
  }

  const initMessage = parseMcpResponseBody(
    body,
    response.headers.get("content-type"),
    1,
  );

  if (initMessage.error) {
    throw new Error(initMessage.error.message);
  }

  await postToMcp(
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    },
    sessionId,
  );

  return sessionId;
}

export async function callMcpTool(
  sessionId: string,
  tool: string,
  params: Record<string, unknown>,
  requestId: number | string,
  timeoutMs: number = 8000
): Promise<JsonRpcResponse> {
  const { response, body } = await postToMcp(
    {
      jsonrpc: "2.0",
      id: requestId,
      method: "tools/call",
      params: {
        name: tool,
        arguments: params,
      },
    },
    sessionId,
    timeoutMs
  );

  if (!response.ok) {
    let errorMessage = `MCP server responded with status ${response.status}`;

    try {
      const errorBody = parseMcpResponseBody(
        body,
        response.headers.get("content-type"),
        requestId,
      );
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      }
    } catch {
      if (body) {
        errorMessage = body;
      }
    }

    throw new Error(errorMessage);
  }

  return parseMcpResponseBody(
    body,
    response.headers.get("content-type"),
    requestId,
  );
}
