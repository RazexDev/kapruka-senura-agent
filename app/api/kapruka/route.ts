import { NextRequest, NextResponse } from "next/server";
import { LRUCache } from "lru-cache";

const MCP_PROTOCOL_VERSION = "2025-03-26";

type RecipientProfile = {
  relationship: string;
  personality: string;
  budget: string;
  occasion: string;
};

type KaprukaProduct = {
  id: string;
  name: string;
  summary: string;
  price: { amount: number | null; currency: string };
  in_stock: boolean;
  image_url: string | null;
  url: string;
};

type ProductSummary = {
  name: string;
  price: { amount: number | null; currency: string };
  image: string | null;
  url: string;
};

type GiftMatch = ProductSummary & {
  reason: string;
};

type GiftSearchResponse = {
  bestMatch: GiftMatch;
  alternatives: ProductSummary[];
};

type SearchPlan = {
  q: string;
  min_price?: number;
  max_price?: number;
};

type BudgetRange = {
  min?: number;
  max?: number;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
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

const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
} as const;

const PERSONALITY_QUERIES: Record<string, string[]> = {
  Homebody:       ['pillow', 'lamp', 'cushion', 'plant', 'frame'],
  Foodie:         ['chocolate', 'hamper', 'cake', 'box'],
  Trendsetter:    ['perfume', 'bag', 'set', 'jewellery'],
  Traditionalist: ['saree', 'frame', 'plant', 'mug'],
  Adventurer:     ['bag', 'watch', 'set', 'book'],
};

const OCCASION_QUERIES: Record<string, string[]> = {
  Birthday:     ['cake', 'mug', 'chocolate', 'frame'],
  Avurudu:      ['saree', 'hamper', 'plant', 'set'],
  Anniversary:  ['flowers', 'set', 'perfume', 'chocolate'],
  'Just Because': ['plant', 'mug', 'book', 'lamp'],
  Achievement:  ['watch', 'book', 'set', 'perfume'],
};

const RELATIONSHIP_QUERIES: Record<string, string[]> = {
  Amma:         ['mug', 'saree', 'plant', 'frame'],
  Thaththa:     ['watch', 'book', 'set', 'bag'],
  Partner:      ['flowers', 'perfume', 'chocolate', 'set'],
  'Best Friend': ['mug', 'chocolate', 'toy', 'card'],
  Boss:         ['hamper', 'set', 'watch', 'book'],
  Teacher:      ['book', 'plant', 'mug', 'frame'],
  Yourself:     ['perfume', 'bag', 'book', 'lamp'],
};

const BLACKLIST = [
  'penis', 'anal', 'vagina', 'sex', 'lubricant',
  'enlargement', 'massage gel', 'dick', 'arrack',
  'whisky', 'whiskey', 'vodka', 'brandy', 'rum',
  'eggplant', 'egg plant',
];

const isBlacklisted = (name: string): boolean =>
  BLACKLIST.some((word) => name.toLowerCase().includes(word));

const ALLOWED_RELATIONSHIPS = [
  "Amma",
  "Thaththa",
  "Partner",
  "Best Friend",
  "Boss",
  "Teacher",
  "Yourself",
];
const ALLOWED_PERSONALITIES = [
  "Homebody",
  "Foodie",
  "Trendsetter",
  "Traditionalist",
  "Adventurer",
];
const ALLOWED_OCCASIONS = [
  "Birthday",
  "Avurudu",
  "Anniversary",
  "Just Because",
  "Achievement",
];
const ALLOWED_BUDGETS = [
  "Under Rs. 2,000",
  "Rs. 2,000–5,000",
  "Rs. 5,000–15,000",
  "Go all out 💎",
];

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://senura.vercel.app",
];

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60 * 1000,
});

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

function parseMcpResponseBody(
  body: string,
  contentType: string | null,
  requestId: number,
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

async function postToMcp(
  payload: JsonRpcRequest,
  sessionId?: string,
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
    if (err.name === "AbortError") {
      throw new Error("AbortError");
    }
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

async function callMcpTool(
  sessionId: string,
  tool: string,
  params: Record<string, unknown>,
  requestId: number,
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

function parseBudgetRange(budget: string | null | undefined): BudgetRange {
  if (!budget) return { min: 0, max: 999999 };
  const numbers = budget.match(/\d+/g);
  if (!numbers) return { min: 0, max: 999999 };
  
  if (numbers.length === 1) {
    return { min: 0, max: parseInt(numbers[0], 10) };
  } else if (numbers.length >= 2) {
    const sorted = [parseInt(numbers[0], 10), parseInt(numbers[1], 10)].sort((a,b)=>a-b);
    return { min: sorted[0], max: sorted[1] };
  }
  
  return { min: 0, max: 999999 };
}

function extractPrice(product: KaprukaProduct): number | null {
  if (product.price.amount != null) return product.price.amount;
  return null;
}

function buildSearchQueries(profile: RecipientProfile): string[] {
  const searchQuery = `${profile.occasion || ""} gift for ${profile.relationship || ""} ${profile.personality || ""}`.trim();
  return [searchQuery || "gift"];
}

function parseSearchResults(mcpResponse: JsonRpcResponse): KaprukaProduct[] {
  if (mcpResponse.error) {
    throw new Error(mcpResponse.error.message);
  }

  const textBlock = mcpResponse.result?.content?.find(
    (block) => block.type === "text" && block.text,
  );

  if (!textBlock?.text) {
    return [];
  }

  if (mcpResponse.result?.isError) {
    return [];
  }

  try {
    const parsed = JSON.parse(textBlock.text) as { results?: KaprukaProduct[] };
    return parsed.results ?? [];
  } catch {
    return [];
  }
}

async function searchProducts(
  sessionId: string,
  plan: SearchPlan,
  requestId: number,
): Promise<KaprukaProduct[]> {
  const mcpResponse = await callMcpTool(
    sessionId,
    "kapruka_search_products",
    {
      params: {
        q: plan.q,
        min_price: plan.min_price,
        max_price: plan.max_price,
        limit: 10,
        currency: "LKR",
        in_stock_only: true,
        sort: "relevance",
        response_format: "json",
      },
    },
    requestId,
  );

  const results = parseSearchResults(mcpResponse);
  console.log("Searching:", plan.q, "→", results.length, "results");
  return results;
}

function deduplicateProducts(products: KaprukaProduct[]): KaprukaProduct[] {
  const seen = new Map<string, KaprukaProduct>();

  for (const product of products) {
    const key = product.id || product.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, product);
    }
  }

  return [...seen.values()];
}

function isWithinBudget(
  amount: number | null,
  budget: BudgetRange,
): boolean {
  if (amount == null) {
    return false;
  }
  if (amount < 100) {
    return false;
  }

  if (budget.min != null && amount < budget.min) {
    return false;
  }

  if (budget.max != null && amount > budget.max) {
    return false;
  }

  return true;
}

function toProductSummary(product: KaprukaProduct): ProductSummary {
  return {
    name: product.name,
    price: product.price,
    image: product.image_url,
    url: product.url,
  };
}

function buildReason(profile: RecipientProfile): string {
  return `A thoughtful ${profile.occasion.toLowerCase()} pick for your ${profile.relationship.toLowerCase()}, within your ${profile.budget} budget.`;
}

function scoreProduct(
  product: KaprukaProduct,
  profile: RecipientProfile,
  budget: BudgetRange,
): number {
  let score = 0;
  const name = product.name.toLowerCase();
  const price = extractPrice(product);

  // Relationship name match
  const relKeywords: Record<string, string[]> = {
    Amma: ['amma', 'mother', 'mom'],
    Thaththa: ['thaththa', 'father', 'dad'],
    Partner: ['partner', 'love', 'wife', 'husband'],
    'Best Friend': ['friend', 'bestie'],
    Boss: ['boss', 'executive'],
    Teacher: ['teacher', 'educator'],
    Yourself: [],
  };
  const relWords = relKeywords[profile.relationship] ?? [];
  if (relWords.some((w) => name.includes(w))) score += 3;

  // Occasion keyword match
  const occasionWords: Record<string, string[]> = {
    Birthday: ['birthday', 'bday'],
    Avurudu: ['avurudu', 'sinhala', 'new year'],
    Anniversary: ['anniversary', 'love', 'wedding'],
    'Just Because': [],
    Achievement: ['achievement', 'congratulations', 'congrats'],
  };
  const occWords = occasionWords[profile.occasion] ?? [];
  if (occWords.some((w) => name.includes(w))) score += 2;

  // Personality keyword match
  const personalityWords: Record<string, string[]> = {
    Homebody: ['home', 'cozy', 'comfort', 'cushion', 'pillow', 'lamp', 'plant', 'frame'],
    Foodie: ['chocolate', 'cake', 'hamper', 'food', 'snack'],
    Trendsetter: ['perfume', 'bag', 'fashion', 'jewellery', 'set'],
    Traditionalist: ['saree', 'traditional', 'handmade', 'mug', 'frame'],
    Adventurer: ['watch', 'bag', 'book', 'travel', 'kit'],
  };
  const pWords = personalityWords[profile.personality] ?? [];
  for (const w of pWords) {
    if (name.includes(w)) score += 1;
  }

  // Price quality scoring
  if (price != null && budget.min != null && budget.max != null) {
    const mid25 = budget.min + (budget.max - budget.min) * 0.25;
    const mid75 = budget.min + (budget.max - budget.min) * 0.75;
    if (price >= mid25 && price <= mid75) score += 1; // middle 50%
    if (price <= budget.min + 50) score -= 1; // suspiciously cheap
  }

  return score;
}

function rankProducts(
  products: KaprukaProduct[],
  profile: RecipientProfile,
  budget: BudgetRange,
): Array<KaprukaProduct & { score: number }> {
  const cleaned = products.filter((p) => !isBlacklisted(p.name));
  const unique = deduplicateProducts(cleaned);

  // Primary: apply budget filter
  let filtered = unique.filter((p) => {
    const price = extractPrice(p);
    if (price == null) return false;
    if (budget.min != null && price < budget.min) return false;
    if (budget.max != null && price > budget.max) return false;
    return true;
  });

  // Relax budget by 30% if empty
  if (filtered.length === 0 && budget.max != null && budget.max < 999999) {
    const relaxedMax = budget.max * 1.3;
    filtered = unique.filter((p) => {
      const price = extractPrice(p);
      if (price == null) return false;
      if (budget.min != null && price < budget.min) return false;
      return price <= relaxedMax;
    });
  }

  // Last resort: ignore budget entirely
  if (filtered.length === 0) {
    console.warn('Budget relaxed - no products in range');
    filtered = unique;
  }

  console.log('After budget filter:', filtered.length, 'products in range');

  return filtered
    .map((p) => ({ ...p, score: scoreProduct(p, profile, budget) }))
    .sort((a, b) => b.score - a.score);
}

async function enrichProduct(mcpUrl: string, product: any) {
  try {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 3, method: 'tools/call',
        params: {
          name: 'kapruka_get_product',
          arguments: { product_id: product.id }
        }
      })
    })
    const data = await res.json()
    const detail = JSON.parse(data.result?.content?.[0]?.text ?? '{}')
    return {
      ...product,
      image: detail.images?.[0] ?? product.image,
      images: detail.images ?? [product.image],
      description: detail.description ?? '',
      stock_level: detail.stock_level ?? 'medium',
      rating: detail.rating ?? null,
      variants: detail.variants ?? [],
    }
  } catch {
    return product // fallback to original if enrichment fails
  }
}

async function findGiftMatches(
  profile: RecipientProfile,
): Promise<GiftSearchResponse> {
  const sessionId = await initializeMcpSession();
  const budget = parseBudgetRange(profile.budget);
  const queries = buildSearchQueries(profile);

  // Run all queries and collect results
  const allProducts: KaprukaProduct[] = [];
  for (const [index, query] of queries.entries()) {
    const results = await searchProducts(
      sessionId,
      { q: query },
      2 + index,
    );
    allProducts.push(...results);
  }

  let ranked = rankProducts(allProducts, profile, budget);

  // Fallback: run a broader search if still not enough
  if (ranked.length < 4) {
    const fallback = await searchProducts(sessionId, { q: 'hamper' }, 100);
    allProducts.push(...fallback);
    ranked = rankProducts(allProducts, profile, budget);
  }

  const topFour = ranked.slice(0, 4);
  const [best, ...rest] = topFour;

  if (!best) {
    throw new Error('Could not find any suitable gifts.');
  }

  const reason = buildReason(profile);
  const bestMatch = { ...toProductSummary(best), id: best.id, reason };
  
  const MCP_URL = process.env.KAPRUKA_MCP_URL!;
  const enrichedBestMatch = await enrichProduct(MCP_URL, bestMatch);

  console.log(
    '✓ Senura found:', enrichedBestMatch.name,
    '| Price: Rs.', enrichedBestMatch.price.amount,
    '| Score:', best.score,
    '| Alternatives:', rest.map((a) => a.name),
  );

  return {
    bestMatch: enrichedBestMatch,
    alternatives: rest.map(toProductSummary),
  };
}

function validateProfile(profile: unknown): profile is RecipientProfile {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return false;
  }
  return true;
}

function translateTerm(term: string): string {
  const t = term.toLowerCase().trim();
  const map: Record<string, string> = {
    "amma": "mother",
    "thaththa": "father",
    "appa": "father",
    "malli": "brother",
    "ayya": "brother",
    "thambi": "brother",
    "anna": "brother",
    "nangi": "sister",
    "akka": "sister",
    "thangachi": "sister",
    "yaluwa": "friend",
    "nanban": "friend",
    "avurudu": "new year",
    "aluth aurudu": "new year",
  };
  return map[t] || term;
}

export async function POST(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin(request);
  const corsHeaders = { "Access-Control-Allow-Origin": allowedOrigin };

  try {
    // 1. Rate Limiting
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";
    const tokenCount = (rateLimit.get(ip) as number) || 0;
    if (tokenCount >= 10) {
      console.warn("Rate limit hit:", ip);
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        {
          status: 429,
          headers: { ...corsHeaders, "Retry-After": "60" },
        },
      );
    }
    rateLimit.set(ip, tokenCount + 1);

    // 2. Request Size Limit
    const bodyText = await request.text();
    if (bodyText.length > 1024) {
      return NextResponse.json(
        { error: "Request too large" },
        { status: 413, headers: corsHeaders },
      );
    }

    // 3. Parse JSON
    let body: { recipientProfile?: unknown };
    try {
      body = JSON.parse(bodyText);
      console.log("Incoming Kapruka Search Params:", body);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 4. Input Validation
    if (!validateProfile(body.recipientProfile)) {
      return NextResponse.json(
        { error: "Invalid profile data" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Strip extra fields & Translate terms
    const cleanProfile: RecipientProfile = {
      relationship: translateTerm(String((body.recipientProfile as any).relationship || "")),
      personality: translateTerm(String((body.recipientProfile as any).vibe || (body.recipientProfile as any).personality || "")),
      occasion: translateTerm(String((body.recipientProfile as any).occasion || "")),
      budget: String((body.recipientProfile as any).budget || ""),
    };

    const result = await findGiftMatches(cleanProfile);

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    if (error.message === "AbortError" || error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. Please try again." },
        { status: 504, headers: corsHeaders },
      );
    }

    if (error.message === "Could not find any suitable gifts.") {
      return NextResponse.json(
        { error: "no_products_found" },
        { status: 404, headers: corsHeaders },
      );
    }

    console.error("Kapruka API error:", error);
    const err = error instanceof Error ? error : new Error(String(error));
    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Something went wrong. Please try again.",
        ...(isDev && { debug: err.message, stack: err.stack }),
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
