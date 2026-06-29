import { NextRequest, NextResponse } from "next/server";
import { LRUCache } from "lru-cache";
import { 
  getCatalog, 
  findBestSearchTerms,
  getCategoryLabel 
} from '@/lib/kaprukaCatalog';
import { 
  classifyIntent, 
  localSearchEngine 
} from "@/lib/searchEngine";
import { calculateMatchScore } from '@/lib/searchEngine';



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
  id: string;
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

import { MCP_PROTOCOL_VERSION, MCP_HEADERS, JsonRpcRequest, JsonRpcResponse, parseMcpResponseBody, postToMcp, initializeMcpSession, callMcpTool } from '@/lib/mcpClient';

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
  const terms = new Set<string>();
  
  if (profile.personality && PERSONALITY_QUERIES[profile.personality]) {
    PERSONALITY_QUERIES[profile.personality].forEach(t => terms.add(t));
  }
  if (profile.occasion && OCCASION_QUERIES[profile.occasion]) {
    OCCASION_QUERIES[profile.occasion].forEach(t => terms.add(t));
  }
  if (profile.relationship && RELATIONSHIP_QUERIES[profile.relationship]) {
    RELATIONSHIP_QUERIES[profile.relationship].forEach(t => terms.add(t));
  }
  
  const queryList = Array.from(terms);
  return queryList.length > 0 ? queryList : ["gift"];
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

function decodeProductName(name: string): string {
  if (!name) return name
  return name
    // Decode numeric HTML entities
    .replace(/n#(\d+);/g, (_, code) => 
      String.fromCharCode(parseInt(code))
    )
    .replace(/&#(\d+);/g, (_, code) => 
      String.fromCharCode(parseInt(code))
    )
    // Decode common named entities  
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Clean up any remaining artifacts
    .replace(/\s+/g, ' ')
    .trim()
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
  const cleanedResults = results.map(p => ({
    ...p,
    name: decodeProductName(p.name ?? '')
  }));
  console.log("Searching:", plan.q, "→", cleanedResults.length, "results");
  return cleanedResults;
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
    id: product.id,
    name: product.name,
    price: product.price,
    image: (product as any).image_url || (product as any).image,
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

async function dynamicKaprukSearch(
  mcpUrl: string,
  terms: string[],
  fallbacks: string[],
  budget: BudgetRange,
  signal: AbortSignal
): Promise<KaprukaProduct[]> {
  const sessionId = await initializeMcpSession();
  let allProducts: KaprukaProduct[] = [];
  for (const [index, query] of terms.entries()) {
     const results = await searchProducts(sessionId, { q: query } as any, 2 + index);
     allProducts.push(...results);
  }
  return deduplicateProducts(allProducts);
}

function applyBlacklist(products: KaprukaProduct[]) {
  return products.filter((p) => !isBlacklisted(p.name));
}

function applyBudgetFilter(products: KaprukaProduct[], budget: BudgetRange) {
  return products.filter((p) => {
    const price = extractPrice(p);
    if (price == null) return false;
    if (budget.min != null && price < budget.min) return false;
    if (budget.max != null && price > budget.max) return false;
    return true;
  });
}

async function handleBrowseRequest(
  message: string,
  conversationHistory: Array<{role:string,content:string}>,
  mcpUrl: string,
  signal: AbortSignal
) {
  const localIntent = localSearchEngine(message, conversationHistory);
  const budgetRange = localIntent.budgetMax < 999999
    ? { min: localIntent.budgetMin, max: localIntent.budgetMax }
    : { min: 0, max: 999999 };

  // ── STAGE 1: Extract raw terms from user input ──────
  const cleanInput = message
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const UNIVERSAL_STOP_WORDS = new Set([
    'what','which','where','when','how','why','who',
    'show','find','get','tell','give','list','search',
    'available','currently','now','any','some','all',
    'have','has','there','these','those','this','that',
    'are','were','been','being','will','would','could',
    'please','want','need','looking','want','like',
    // Sinhala stop words
    'monawada','mokada','thiyena','thiyenawa','tiyena',
    'kohomada','danne','kiyala','inne','inna','eka',
    'mata','oyata','mama','oba','api','wenuwen',
    'aran','denna','dennam','araganna','hadanna',
    // Single and double char words
    'or','to','in','on','at','is','it','me','my',
    'we','us','do','be','an','as','of','by','up',
    'hi','ok','yes','no','hey',
  ])

  // Extract meaningful words from the message
  const rawTerms = cleanInput
    .split(/\s+/)
    .filter(w => 
      w.length >= 3 &&
      !UNIVERSAL_STOP_WORDS.has(w) &&
      !/^\d+$/.test(w)  // not pure number
    )
    .slice(0, 4)

  console.log('Raw user terms:', rawTerms)

  // ── STAGE 2: Run raw terms against Kapruka directly ─
  const rawResults = await dynamicKaprukSearch(
    mcpUrl,
    rawTerms,
    [],
    { min: 0, max: 999999 },
    signal
  )

  console.log(`Raw search found ${rawResults.length} results`)

  // ── STAGE 3: If raw search worked → use it ──────────
  if (rawResults.length >= 2) {
    console.log('✓ Raw terms worked — skipping catalog')
    
    const catalog = await getCatalog();
    const budgetFiltered = applyBudgetFilter(
      applyBlacklist(rawResults),
      budgetRange
    )
    
    const finalResults = budgetFiltered.length > 0 
      ? budgetFiltered 
      : rawResults.slice(0, 8)
    
    const categoryLabel = getCategoryLabel(
      rawTerms, message, catalog
    )
    
    return buildBrowseResponse(
      finalResults, rawTerms, categoryLabel, message, mcpUrl
    )
  }

  // ── STAGE 4: Raw search failed → try catalog ────────
  console.log('Raw terms returned <2 — consulting catalog')
  const catalog = await getCatalog()
  const catalogTerms = findBestSearchTerms(
    cleanInput, catalog, 3
  )

  console.log('Catalog suggested:', catalogTerms)

  const newCatalogTerms = catalogTerms.filter(
    t => !rawTerms.includes(t)
  )

  if (newCatalogTerms.length > 0) {
    const catalogResults = await dynamicKaprukSearch(
      mcpUrl,
      newCatalogTerms,
      [],
      budgetRange,
      signal
    )
    
    if (catalogResults.length > 0) {
      const categoryLabel = getCategoryLabel(
        newCatalogTerms, message, catalog
      )
      return buildBrowseResponse(
        catalogResults, newCatalogTerms, 
        categoryLabel, message, mcpUrl
      )
    }
  }

  // ── STAGE 5: Everything failed → honest empty state ─
  console.log('All searches failed for:', rawTerms)
  return NextResponse.json({
    mode: 'browse',
    products: [],
    totalFound: 0,
    searchTermsUsed: rawTerms,
    category: rawTerms[0] ?? 'products',
    emptyMessage: `Senura couldn't find "${rawTerms.join(', ')}" on Kapruka right now. Try a different keyword or browse by category?`
  })
}

// ── HELPER: Build consistent browse response ─────────
async function buildBrowseResponse(
  results: KaprukaProduct[],
  searchTerms: string[],
  categoryLabel: string,
  originalMessage: string,
  mcpUrl: string
) {
  const deduped = deduplicateProducts(results)
  const cleaned = deduped.map(p => ({
    ...p,
    name: decodeProductName(p.name ?? '')
  }))
  
  const ranked = cleaned
    .slice(0, 12)
    .map(p => ({
      ...p,
      matchScore: calculateMatchScore(
        {
          name: p.name,
          price: extractPrice(p) || 0,
          stock_level: (p as any).stock_level
        },
        {
          searchTerms,
          relationship: 'unknown',
          occasion: 'unknown',
          budgetMin: 0,
          budgetMax: 999999
        }
      )
    }))
    .sort((a, b) => b.matchScore - a.matchScore)

  const enriched = await Promise.all(
    ranked.slice(0, 4).map(p => enrichProduct(mcpUrl, p))
  );

  return NextResponse.json({
    mode: 'browse',
    products: [
      ...enriched,
      ...ranked.slice(4)
    ].map(p => ({
      id: p.id,
      name: p.name,
      price: typeof p.price === 'number' ? { amount: p.price, currency: "LKR" } : p.price,
      image: p.image_url || (p as any).image,
      url: p.url,
      matchScore: (p as any).matchScore
    })),
    totalFound: results.length,
    searchTermsUsed: searchTerms,
    category: categoryLabel
  })
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
    if (bodyText.length > 50000) {
      return NextResponse.json(
        { error: "Request too large" },
        { status: 413, headers: corsHeaders },
      );
    }

    // 3. Parse JSON
    let body: { recipientProfile?: unknown, message?: string, conversationHistory?: any[] };
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
    const isChatMode = typeof body.message === 'string';
    const isProfileMode = body.recipientProfile !== undefined;

    if (!isChatMode && !isProfileMode) {
      return NextResponse.json(
        { error: 'Request must include message or recipientProfile' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (isChatMode) {
      // CHAT MODE VALIDATION — lightweight
      if (typeof body.message !== 'string') {
        return NextResponse.json(
          { error: 'message must be a string' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (body.message.length > 500) {
        return NextResponse.json(
          { error: 'Message too long' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (body.message.trim().length === 0) {
        return NextResponse.json(
          { error: 'Message cannot be empty' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (!Array.isArray(body.conversationHistory)) {
        body.conversationHistory = [];
      }
      // Sanitize conversation history
      body.conversationHistory = body.conversationHistory
        .slice(-10) // only last 10 messages
        .filter((m: any) => 
          typeof m.role === 'string' && 
          typeof m.content === 'string' &&
          m.content.length < 1000
        )
        .map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.trim()
        }));
    }

    if (isProfileMode) {
      // PROFILE MODE VALIDATION — strict enum check (keep as-is)
      const ALLOWED_RELATIONSHIPS = ['Amma','Thaththa','Partner',
        'Best Friend','Boss','Teacher','Yourself'];
      const ALLOWED_PERSONALITIES = ['Homebody','Foodie',
        'Trendsetter','Traditionalist','Adventurer'];
      const ALLOWED_OCCASIONS = ['Birthday','Avurudu',
        'Anniversary','Just Because','Achievement'];
      const ALLOWED_BUDGETS = ['Under Rs. 2,000',
        'Rs. 2,000–5,000','Rs. 5,000–15,000','Go all out 💎'];

      const p: any = body.recipientProfile;
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        return NextResponse.json(
          { error: 'Invalid profile data' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (!ALLOWED_RELATIONSHIPS.includes(p.relationship) ||
          !ALLOWED_PERSONALITIES.includes(p.personality || p.vibe) ||
          !ALLOWED_OCCASIONS.includes(p.occasion) ||
          !ALLOWED_BUDGETS.includes(p.budget)) {
        return NextResponse.json(
          { error: 'Invalid profile values' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const intent = classifyIntent(
      body.message ?? '',
      body.conversationHistory ?? []
    );
    console.log('Intent classified as:', intent);
    
    if (intent === 'browse') {
      return await handleBrowseRequest(
        body.message ?? '',
        body.conversationHistory ?? [],
        process.env.KAPRUKA_MCP_URL!,
        new AbortController().signal
      );
    }

    let cleanProfile: RecipientProfile = { relationship: 'unknown', personality: '', occasion: 'unknown', budget: '' };
    
    if (isChatMode) {
      const convoHistory = body.conversationHistory ?? [];
      const localIntent = localSearchEngine(body.message!, convoHistory);
      
      // Enhance with catalog
      const catalog = await getCatalog();
      const catalogEnhanced = findBestSearchTerms(
        [
          localIntent.searchTerms.join(' '),
          localIntent.relationship,
          localIntent.occasion
        ].join(' '),
        catalog
      );

      const finalTerms = catalogEnhanced.length > 0
        ? catalogEnhanced
        : (localIntent.searchTerms.length > 0 ? localIntent.searchTerms : localIntent.fallbackTerms);
      
      cleanProfile = {
        relationship: localIntent.relationship !== 'unknown' ? localIntent.relationship : 'someone special',
        personality: finalTerms[0] ?? '',
        occasion: localIntent.occasion !== 'unknown' ? localIntent.occasion : 'unknown',
        budget: `${localIntent.budgetMin}-${localIntent.budgetMax}`
      };
    } else {
      // Strip extra fields & Translate terms
      cleanProfile = {
        relationship: translateTerm(String((body.recipientProfile as any).relationship || "")),
        personality: translateTerm(String((body.recipientProfile as any).vibe || (body.recipientProfile as any).personality || "")),
        occasion: translateTerm(String((body.recipientProfile as any).occasion || "")),
        budget: String((body.recipientProfile as any).budget || ""),
      };
    }

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
