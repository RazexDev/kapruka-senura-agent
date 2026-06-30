import fs from 'fs'
import path from 'path'
import os from 'os'
const MCP_URL = process.env.KAPRUKA_MCP_URL ?? 'https://mcp.kapruka.com/mcp'

// ── Types ────────────────────────────────────────────

export interface CatalogEntry {
  searchTerm: string        // what to search in MCP
  displayName: string       // human readable
  keywords: string[]        // words that trigger this term
  category: string          // top-level category
  resultCount: number       // how many results exist
  lastVerified: number      // timestamp
}

export interface KaprukaCatalog {
  entries: CatalogEntry[]
  builtAt: number
  totalTerms: number
}

// ── In-memory cache ──────────────────────────────────
// Persists for the lifetime of the server process

let catalogCache: KaprukaCatalog | null = null
let buildPromise: Promise<KaprukaCatalog> | null = null

// ── Core MCP caller ──────────────────────────────────

import { initializeMcpSession, callMcpTool } from './mcpClient'

let mcpSessionId: string | null = null

async function getMcpSession(): Promise<string> {
  if (!mcpSessionId) {
    mcpSessionId = await initializeMcpSession()
  }
  return mcpSessionId
}

async function mcpSearch(
  query: string, 
  limit = 8,
  retryCount = 0
): Promise<any[]> {
  try {
    const sessionId = await getMcpSession()
    const args = {
      params: {
        q: query,
        limit,
        currency: "LKR",
        in_stock_only: true,
        sort: "relevance",
        response_format: "json"
      }
    }
    
    console.log('MCP payload:', JSON.stringify({
      name: 'kapruka_search_products',
      arguments: args
    }))

    const data = await callMcpTool(sessionId, 'kapruka_search_products', args, Date.now(), 0)
    
    const text = data.result?.content?.[0]?.text ?? '[]'
    
    // Detect rate limit in response text
    if (text.includes('Rate limit exceeded') || (data.result?.isError && text.toLowerCase().includes('rate limit'))) {
      if (retryCount < 3) {
        const waitTime = (retryCount + 1) * 3000
        console.log(
          `Rate limited for "${query}". ` +
          `Waiting ${waitTime/1000}s then retrying...`
        )
        await new Promise(r => setTimeout(r, waitTime))
        return mcpSearch(query, limit, retryCount + 1)
      }
      console.warn(`Gave up on "${query}" after 3 retries`)
      return []
    }
    
    if (data.result?.isError) {
      console.warn(`mcpSearch returned isError for "${query}":`, text)
      return []
    }
    
    // Detect no results
    if (text.includes('No products found')) {
      return []
    }
    
    let parsed;
    try {
      parsed = JSON.parse(text)
    } catch(e) {
      console.warn(`mcpSearch parse error for "${query}". Raw:`, text.slice(0, 100))
      return []
    }
    
    return Array.isArray(parsed) ? parsed :
      Array.isArray(parsed.products) ? parsed.products : 
      Array.isArray(parsed.results) ? parsed.results : []
  } catch(err: any) { 
    console.warn(`mcpSearch("${query}") failed:`, err.message ?? err)
    return [] 
  }
}

async function mcpListCategories(): Promise<any[]> {
  try {
    const sessionId = await getMcpSession()
    const args = {
      params: { depth: 2, response_format: "json" }
    }
    const data = await callMcpTool(sessionId, 'kapruka_list_categories', args, Date.now(), 0)
    
    if (data.result?.isError) {
      console.warn('mcpListCategories returned isError:', data.result?.content?.[0]?.text)
      return []
    }
    
    const text = data.result?.content?.[0]?.text ?? '[]'
    let parsed;
    try {
      parsed = JSON.parse(text)
    } catch(e) {
      console.warn('mcpListCategories parse error. Raw:', text.slice(0, 100))
      return []
    }
    
    return Array.isArray(parsed) ? parsed :
      Array.isArray(parsed.categories) ? parsed.categories :
      []
  } catch(err) { 
    console.error('mcpListCategories error:', err)
    return [] 
  }
}

// ── Build the catalog ─────────────────────────────────

async function buildCatalog(): Promise<KaprukaCatalog> {
  console.log('🔨 Building Kapruka catalog index...')
  const startTime = Date.now()
  const entries: CatalogEntry[] = []

  // PHASE 1: Skip category fetch entirely for now
  // const categories = await mcpListCategories()
  const categories: any[] = []
  console.log('Skipping category fetch, using seed terms only')

  // Extract category names as search terms
  const categoryTerms = new Set<string>()

  // PHASE 2: Test a broad set of seed terms
  // These are generic enough to discover what Kapruka has
  const seedTerms = [
    'cake', 'chocolate', 'flowers', 'mug', 'hamper',
    'phone', 'watch', 'perfume', 'bag', 'saree',
    'book', 'toy', 'plant', 'lamp', 'frame',
    'jewellery', 'pillow', 'set', 'teddy', 'skincare'
  ]

  // PHASE 3: Test each seed term against Kapruka
  // Build index of what actually returns results
  for (const term of seedTerms) {
    const products = await mcpSearch(term, 8)
    console.log(`  "${term}" → ${products.length} results`)
    if (products.length === 0) continue
    
    const productNames = products.map(
      (p: any) => p.name?.toLowerCase() ?? ''
    )
    const keywords = extractKeywordsFromNames(
      productNames, term
    )
    entries.push({
      searchTerm: term,
      displayName: toDisplayName(term),
      keywords,
      category: inferCategory(term, []),
      resultCount: products.length,
      lastVerified: Date.now()
    })
    
    // Delay between each search to avoid rate limits
    await new Promise(r => setTimeout(r, 2000))
  }

  // PHASE 4: Disabled - discovered terms cause rate limits
  // and extract low-quality keywords from product names
  // The 20 seed terms are sufficient for the catalog
  console.log('Phase 4 skipped - using seed terms only')

  const catalog: KaprukaCatalog = {
    entries,
    builtAt: Date.now(),
    totalTerms: entries.length
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(
    `✅ Catalog built: ${entries.length} terms in ${elapsed}s`
  )

  return catalog
}

// ── Helper functions ──────────────────────────────────

function extractKeywordsFromNames(
  names: string[],
  baseTerm: string
): string[] {
  const keywords = new Set<string>([baseTerm])

  // Words that are NEVER useful as search terms
  const stopWords = new Set([
    // Common English stops
    'the','for','and','with','in','of','a','an',
    'to','by','is','it','at','on','as','are','this',
    'that','from','or','but','so','top','best','new',
    'great','perfect','premium','special','beautiful',
    'elegant','luxury','selling','sri','lanka',
    'kapruka','gift','gifts','item','items','product',
    'products','online','available','stock','price',
    // Units and measurements - NEVER useful
    '11oz','325ml','250ml','500ml','750ml','1000ml',
    '100ml','200ml','350ml','450ml','600ml',
    '1kg','2kg','500g','250g','100g',
    // Sizes
    'small','medium','large','xlarge','xxl',
    'mini','micro','nano','ultra','super',
    // Generic adjectives
    'good','nice','love','happy','cute','cool',
    'awesome','amazing','wonderful','excellent',
    'quality','original','genuine','authentic',
    // Numbers and codes
    ...Array.from({length: 100}, (_,i) => String(i)),
  ])

  // Additional regex filters
  const isJunk = (word: string): boolean => {
    if (word.length < 4) return true          // too short
    if (word.length > 15) return true         // too long
    if (/^\d/.test(word)) return true         // starts with number
    if (/\d{2,}/.test(word)) return true      // contains 2+ digits
    if (stopWords.has(word)) return true      // stop word
    if (/^[^a-z]/.test(word)) return true    // non-letter start
    return false
  }

  for (const name of names) {
    const words = name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => !isJunk(w))

    // Only add SINGLE meaningful words as keywords
    // No multi-word phrases from product names
    // (they're too specific and won't match other products)
    for (const word of words) {
      keywords.add(word)
    }
  }

  return Array.from(keywords).slice(0, 10)
}

function toDisplayName(term: string): string {
  return term
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function inferCategory(
  term: string, 
  categories: any[]
): string {
  const electronics = ['phone','laptop','tablet',
    'headphones','camera','gaming','keyboard','mouse',
    'charger','speaker','monitor','watch']
  const fashion = ['saree','dress','shirt','bag',
    'wallet','shoes','jewellery','perfume','sunglasses',
    'belt','scarf','hat','tie']
  const food = ['cake','chocolate','hamper','flowers',
    'tea','coffee','wine','biscuit','candy','fruit']
  const home = ['lamp','plant','pillow','cushion',
    'mug','frame','candle','clock','blanket','towel']
  const beauty = ['skincare','cosmetics','shampoo',
    'soap','grooming','trimmer','hair']
  const toys = ['toy','teddy','puzzle','game','lego',
    'book']
  
  if (electronics.some(e => term.includes(e))) 
    return 'Electronics'
  if (fashion.some(e => term.includes(e))) 
    return 'Fashion'
  if (food.some(e => term.includes(e))) 
    return 'Food & Beverages'
  if (home.some(e => term.includes(e))) 
    return 'Home & Living'
  if (beauty.some(e => term.includes(e))) 
    return 'Beauty & Care'
  if (toys.some(e => term.includes(e))) 
    return 'Toys & Books'
  return 'Gifts'
}

// ── Public API ────────────────────────────────────────

const CACHE_FILE = path.join(
  os.tmpdir(), 
  '.kapruka-catalog-cache.json'
)

export async function getCatalog(): Promise<KaprukaCatalog> {
  // 1. Check memory cache (fastest)
  if (catalogCache && 
    Date.now() - catalogCache.builtAt < 6 * 60 * 60 * 1000) {
    return catalogCache
  }

  // 2. Check file cache (survives server restarts)
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8')
      const cached = JSON.parse(raw) as KaprukaCatalog
      const age = Date.now() - cached.builtAt
      const sixHours = 6 * 60 * 60 * 1000
      
      if (age < sixHours && cached.totalTerms > 0) {
        console.log(
          `📦 Loaded catalog from file cache ` +
          `(${cached.totalTerms} terms, ` +
          `${Math.round(age/60000)}min old)`
        )
        catalogCache = cached
        return cached
      }
    }
  } catch(err) {
    console.warn('File cache read failed:', err)
  }

  // 3. Build fresh catalog
  if (buildPromise) return buildPromise

  buildPromise = buildCatalog().then(catalog => {
    catalogCache = catalog
    buildPromise = null

    // Save to file cache
    try {
      fs.writeFileSync(
        CACHE_FILE, 
        JSON.stringify(catalog, null, 2)
      )
      console.log('💾 Catalog saved to file cache')
    } catch(err) {
      console.warn('File cache write failed:', err)
    }

    return catalog
  })

  return buildPromise
}

function matchesWholeWord(text: string, term: string): boolean {
  // Escape special regex chars in term
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i')
  return regex.test(text)
}

// Find best matching search terms for a user query
export function findBestSearchTerms(
  query: string,
  catalog: KaprukaCatalog,
  limit = 4
): string[] {
  const text = query
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = text
    .split(/\s+/)
    .filter(w => w.length > 3)

  const scored = catalog.entries.map(entry => {
    let score = 0

    // TIER 1: Exact search term in query (strongest signal)
    if (matchesWholeWord(text, entry.searchTerm)) {
      score += 200  // Very high — exact match wins
    }

    // TIER 2: Exact keyword match
    for (const kw of entry.keywords) {
      if (kw.length < 4) continue  // skip short keywords
      if (matchesWholeWord(text, kw)) {
        score += kw.length * 5  // longer = more specific
      }
    }

    // TIER 3: Word-level exact match
    for (const word of words) {
      if (word.length < 4) continue
      // Exact word matches a keyword
      if (entry.keywords.includes(word)) {
        score += 30
      }
      // Exact word matches search term
      if (entry.searchTerm === word) {
        score += 150
      }
    }

    // TIER 4: Typo tolerance — BUT only for longer words
    // and only when score is already 0 (no other match)
    if (score === 0) {
      for (const word of words) {
        // MINIMUM 6 chars for fuzzy — prevents short words
        // like "watch" matching "accessories"
        if (word.length < 6) continue
        if (entry.searchTerm.length < 5) continue
        
        const dist = levenshtein(word, entry.searchTerm)
        // Only allow distance of 1 for typos
        // Distance 2 only for very long words (8+ chars)
        if (dist === 1 && word.length >= 6) score += 50
        if (dist === 2 && word.length >= 8) score += 20
      }
    }

    return { entry, score }
  })

  // After scoring, filter out clearly wrong matches
  const filtered = scored.filter(s => {
    if (s.score === 0) return false
    
    // Verify the match makes intuitive sense:
    // At least one query word should share 3+ chars
    // with the search term or one of its keywords
    const queryWords = text.split(' ')
      .filter(w => w.length > 3)
    
    const termWords = [
      s.entry.searchTerm,
      ...s.entry.keywords
    ].join(' ')
    
    const hasCharOverlap = queryWords.some(qw =>
      termWords.includes(qw.slice(0,4))
    )
    
    // Allow if score is very high (explicit match)
    // or if there's character overlap
    return s.score >= 150 || hasCharOverlap
  })

  const results = filtered
    .sort((a, b) => b.score - a.score)

  console.log('Catalog scores:', results.slice(0,5).map(
    r => `${r.entry.searchTerm}:${r.score}`
  ))

  return results
    .slice(0, limit)
    .map(s => s.entry.searchTerm)
}

// Simple Levenshtein distance for typo tolerance
function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99
  const dp = Array.from({ length: a.length + 1 }, 
    (_, i) => Array.from({ length: b.length + 1 }, 
      (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i-1] === b[j-1] 
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], 
                       dp[i-1][j-1])
    }
  }
  return dp[a.length][b.length]
}

export function getCategoryLabel(
  searchTerms: string[],
  originalMessage: string,
  catalog: KaprukaCatalog
): string {
  // Use the first search term — this is now always
  // the user's actual word, not a catalog substitution
  const primaryTerm = searchTerms[0] ?? 'products'
  
  // Capitalize it properly
  const label = primaryTerm
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  
  // Pluralize if needed
  if (!label.endsWith('s') && 
      !label.endsWith('se') &&
      label.toLowerCase() !== 'skincare') {
    return label + 's'
  }
  
  return label
}
