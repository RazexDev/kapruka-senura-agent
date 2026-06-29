export type ConversationIntent = 'browse' | 'gift' | 'clarify' | 'chitchat';

export function classifyIntent(
  message: string,
  conversationHistory: Array<{role:string, content:string}>
): ConversationIntent {
  const text = message.toLowerCase().trim()

  // 1. Catch short chitchat first
  const chitchatPatterns = [
    /^(hi|hello|hey|ayubowan|kohomada|kohoma)/i,
    /^(ok|okay|sure|alright|thanks|thank you|niyamai|ela)/i,
    /^(yes|no|yeah|nope|yep|ow|na)/i,
    /how are you/i, /what (is|are) you/i, /who are you/i, /your name/i,
  ]
  if (text.split(' ').length <= 3 && chitchatPatterns.some(p => p.test(text))) {
    return 'chitchat'
  }

  // 2. Check for explicit gift-giving flow setup
  const giftPatterns = [
    /gift for/i, /present for/i, /buy for/i, /get for/i,
    /birthday gift/i, /anniversary gift/i, /surprise for/i
  ]
  const isGift = giftPatterns.some(p => p.test(text))

  // 3. Check for explicit browsing / specific products
  const productPatterns = [
    /cake/i, /phone/i, /laptop/i, /computer/i, /flower/i, /chocolate/i,
    /mug/i, /watch/i, /perfume/i, /toy/i, /bag/i, /shoe/i, /dress/i, /saree/i,
    /hamper/i, /electronics/i, /accessories/i, /device/i
  ]
  const browsePatterns = [
    /what.*available/i, /show me/i, /do you have/i, /search/i, /browse/i,
    /what.*buy/i, /what.*get/i, /can i buy/i, /price/i, /how much/i,
    /what are the/i, /more/i, /other/i, /different/i, /else/i
  ]
  const isBrowsing = browsePatterns.some(p => p.test(text)) || productPatterns.some(p => p.test(text))

  // ── ROUTING LOGIC ──
  // If they mention a product, force a search immediately
  if (isBrowsing) return 'browse' 
  if (isGift) return 'gift'

  // 4. Fallback to clarify if answering questions in a flow
  const clarifyPatterns = [
    /^for my/i, /^budget/i, /^under rs/i, /^he likes/i, /^she likes/i, 
    /^he is/i, /^she is/i, /^my (brother|sister|mother|father|friend)/i
  ]
  if (clarifyPatterns.some(p => p.test(text))) return 'clarify'

  const isInGiftFlow = conversationHistory.some(m => 
    m.role === 'assistant' && (
      m.content.includes('who') || m.content.includes('budget') ||
      m.content.includes('occasion') || m.content.includes('personality') ||
      m.content.includes('relationship')
    )
  )

  if (isInGiftFlow) return 'clarify'

  return 'gift'
}

// ─── PERSONALITY → SEARCH TERMS ──────────────────────
// Personality keys resolve to actual Kapruka search terms
export const PERSONALITY_SEARCH: Record<string, string[]> = {
  'techy':        ['phone', 'electronics', 'watch', 'headphones'],
  'homebody':     ['plant', 'lamp', 'pillow', 'mug', 'cushion'],
  'foodie':       ['chocolate', 'hamper', 'cake', 'tea', 'coffee'],
  'fashionable':  ['perfume', 'bag', 'jewellery', 'dress'],
  'trendsetter':  ['perfume', 'bag', 'jewellery', 'sunglasses'],
  'adventurer':   ['bag', 'watch', 'camera', 'book'],
  'bookworm':     ['book', 'puzzle', 'board game'],
  'sporty':       ['watch', 'bag', 'bottle', 'hamper'],
  'traditional':  ['saree', 'jewellery', 'plant', 'frame'],
  'artistic':     ['frame', 'plant', 'lamp', 'book'],
  'gamer':        ['ps5', 'xbox', 'gaming', 'headphones'],
  'fitness':      ['watch', 'bottle', 'hamper', 'grooming kit'],
  'baby':         ['toy', 'teddy', 'blanket', 'book'],
  'kids':         ['toy', 'teddy', 'lego', 'book'],
}

// ─── OCCASION → BONUS SEARCH TERMS ───────────────────
export const OCCASION_BOOST: Record<string, string[]> = {
  'birthday':     ['cake', 'mug', 'chocolate', 'flowers'],
  'anniversary':  ['flowers', 'perfume', 'chocolate', 'jewellery'],
  'avurudu':      ['saree', 'hamper', 'plant', 'flowers'],
  'achievement':  ['watch', 'perfume', 'hamper', 'book'],
  'just_because': ['plant', 'mug', 'chocolate', 'book'],
  'wedding':      ['flowers', 'hamper', 'jewellery', 'frame'],
  'graduation':   ['watch', 'book', 'bag', 'hamper'],
  'mothers day':  ['flowers', 'saree', 'jewellery', 'mug'],
  'fathers day':  ['watch', 'wallet', 'perfume', 'book'],
  'christmas':    ['hamper', 'chocolate', 'toy', 'mug'],
  'valentines':   ['flowers', 'chocolate', 'perfume', 'jewellery'],
}

// ─── MAIN SEARCH FUNCTION ────────────────────────────

export interface SearchIntent {
  searchTerms: string[]
  fallbackTerms: string[]
  relationship: string
  occasion: string
  budgetMin: number
  budgetMax: number
  confidence: 'high' | 'medium' | 'low'
  needsAI: boolean
  reasoning: string
}

export function localSearchEngine(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): SearchIntent {
  
  // ── Build combined context from FULL history + current message ──
  const currentText = message.toLowerCase()
    .replace(/[^\w\s\u0D80-\u0DFF]/g, ' ')  // keep Sinhala unicode
    .replace(/\s+/g, ' ')
    .trim()

  const historyText = conversationHistory
    .map(m => m.content)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')

  const combinedText = `${historyText} ${currentText}`.trim()

  // ── EXTENSIVE STOP WORDS (Removes conversational noise) ──
  const stopWords = new Set([
    'what','which','where','when','how','why','who','is','are','do','does','did',
    'can','could','would','should','have','has','had','been','being','be','show',
    'find','get','give','tell','let','make','available','currently','now','today',
    'here','there','any','some','all','every','each','few','many','monawada',
    'mokada','thiyena','thiyenawa','tiyena','kohomada','danne','kiyala','inne',
    'inna','please','thanks','okay','yes','no','ok','want','need','looking',
    'search','buy','order','a','an','the','in','on','at','to','of','for','and',
    'or','but','with','from','by','i','me','my','that','this','those','these',
    'it','its','as','like','something','anything','nothing','everything',
    'recommend','suggest','ideas','options','gifts','gift','present','presents',
    'item','items','product','products','best','cheap','expensive','good',
    // Refinement words added below:
    'more', 'other', 'different', 'else', 'another', 'again'
  ])

  // ── CONTEXT WORDS (Removed from search terms so they don't break Kapruka) ──
  const contextWords = new Set([
    'amma','ammi','mother','mom','mum','thaththa','father','dad','aiya','malli',
    'brother','bro','akka','nangi','sister','sis','partner','wife','husband',
    'girlfriend','boyfriend','gf','bf','yaluwa','friend','bestie','boss','teacher',
    'birthday','bday','anniversary','wedding','avurudu','graduation','christmas',
    'xmas','valentine','techy','tech','homebody','foodie','fashionable','trendsetter',
    'adventurer','bookworm','sporty','traditional','artistic','gamer','fitness'
  ])

  // Normalize plurals (Kapruka favors singular words like 'cake' or 'accessory')
  const normalizeWord = (w: string) => {
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'
    if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss')) return w.slice(0, -1)
    return w
  }

  // ── Pass 1: Extract EXPLICIT product words ──
  const cleanWords = message.toLowerCase()
    .replace(/[?!.,;:'"]/g, ' ')
    .split(/\s+/)
    // Notice we removed w.length > 3 to allow words like "toy" and "pc"
    .filter(w => w.length > 1 && !stopWords.has(w) && !contextWords.has(w)) 
    .map(normalizeWord)

  const searchTerms: string[] = [...cleanWords.slice(0, 4)]

  // ── Pass 2: Personality, Relationship, Occasion, Budget ──
  // Relationship
  const relationshipMap: Record<string, string[]> = {
    'mother':  ['amma', 'ammi', 'ammage', 'mother', 'mom', 'mum'],
    'father':  ['thaththa', 'thaththi', 'thathata', 'thaththata', 'thathage', 'father', 'dad'],
    'brother': ['aiya', 'malli', 'brother', 'bro'],
    'sister':  ['akka', 'nangi', 'sister', 'sis'],
    'partner': ['partner', 'wife', 'husband', 'girlfriend', 'boyfriend', 'gf', 'bf'],
    'friend':  ['yaluwa', 'yaluwaa', 'friend', 'bestie', 'bff'],
    'boss':    ['boss', 'manager', 'madam'],
    'teacher': ['teacher', 'miss', 'guru'],
    'self':    ['myself', 'for me'],
  }
  let relationship = 'unknown'
  for (const [rel, triggers] of Object.entries(relationshipMap)) {
    if (triggers.some(t => combinedText.includes(t))) {
      relationship = rel; break;
    }
  }

  // Occasion
  const occasionMap: Record<string, string[]> = {
    'birthday':     ['birthday', 'bday', 'piradenam', 'born'],
    'anniversary':  ['anniversary', 'wedding anniversary'],
    'avurudu':      ['avurudu', 'new year', 'aluth avurudda'],
    'achievement':  ['graduation', 'promoted', 'passed', 'won', 'achievement', 'new job'],
    'just_because': ['surprise', 'random', 'just because', 'no reason', 'thinking of'],
    'christmas':    ['christmas', 'xmas'],
    'valentines':   ['valentine', 'love day'],
    'mothers day':  ["mothers day", "mother's day"],
    'fathers day':  ["fathers day", "father's day"],
  }
  let occasion = 'unknown'
  for (const [occ, triggers] of Object.entries(occasionMap)) {
    if (triggers.some(t => combinedText.includes(t))) {
      occasion = occ; break;
    }
  }

  // Personality
  let detectedPersonality: string | null = null
  const PERSONALITY_TRIGGERS: Record<string, string[]> = {
    'techy':       ['techy','tech-savvy','techie'],
    'homebody':    ['homebody','home body','gedara inna'],
    'foodie':      ['foodie','food lover','loves food'],
    'fashionable': ['fashionable','fashion lover','stylish','trendy'],
    'trendsetter': ['trendsetter','trend setter'],
    'adventurer':  ['adventurer','adventurous','loves travel'],
    'bookworm':    ['bookworm','book worm','loves reading'],
    'sporty':      ['sporty','athletic','loves sport','gym'],
    'traditional': ['traditional','old fashioned','sampradayika'],
    'artistic':    ['artistic','creative','loves art'],
    'gamer':       ['gamer','gaming lover','loves games'],
    'fitness':     ['fitness','workout','loves gym'],
  }
  for (const [personality, triggers] of Object.entries(PERSONALITY_TRIGGERS)) {
    if (triggers.some(t => combinedText.includes(t))) {
      detectedPersonality = personality; break;
    }
  }

  // Budget
  let budgetMin = 0
  let budgetMax = 999999
  const budgetPatterns: [RegExp, (m: RegExpMatchArray) => { min: number; max: number }][] = [
    [/under\s*(?:rs\.?)?\s*(\d[\d,]*)/i, m => ({ min: 0, max: parseInt(m[1].replace(/,/g, '')) })],
    [/below\s*(?:rs\.?)?\s*(\d[\d,]*)/i, m => ({ min: 0, max: parseInt(m[1].replace(/,/g, '')) })],
    [/(?:rs\.?)?\s*(\d[\d,]*)\s*(?:to|-)\s*(?:rs\.?)?\s*(\d[\d,]*)/i, m => ({ min: parseInt(m[1].replace(/,/g, '')), max: parseInt(m[2].replace(/,/g, '')) })],
    [/budget\s*(?:of|is)?\s*(?:rs\.?)?\s*(\d[\d,]*)/i, m => ({ min: 0, max: parseInt(m[1].replace(/,/g, '')) })],
    [/(?:rs\.?)?\s*(\d[\d,]+)/i, m => {
      const n = parseInt(m[1].replace(/,/g, ''))
      return n > 100 ? { min: Math.floor(n * 0.7), max: Math.ceil(n * 1.3) } : { min: 0, max: 999999 }
    }],
  ]
  for (const [pattern, handler] of budgetPatterns) {
    const match = combinedText.match(pattern)
    if (match) {
      const result = handler(match); budgetMin = result.min; budgetMax = result.max; break;
    }
  }

  // ── CRITICAL FIX: Smart Fallback & Boost Logic ──
  const fallbackTerms: string[] = []
  
  if (searchTerms.length === 0) {
      // 1. The user DID NOT specify a product (e.g. "gift for my brother")
      // ONLY THEN do we inject personality, occasion, and relationship fallbacks to give ideas.
      if (detectedPersonality) {
          searchTerms.push(...(PERSONALITY_SEARCH[detectedPersonality] || []).slice(0, 2))
      }
      if (occasion !== 'unknown' && OCCASION_BOOST[occasion]) {
          searchTerms.push(...OCCASION_BOOST[occasion].slice(0, 2))
      }
      
      const relationshipFallbacks: Record<string, string[]> = {
        'mother':  ['mug', 'saree', 'plant', 'flowers'],
        'father':  ['watch', 'wallet', 'shirt', 'perfume'],
        'brother': ['gaming', 'watch', 'backpack', 'phone'],
        'sister':  ['jewellery', 'handbag', 'perfume', 'chocolate'],
        'partner': ['flowers', 'chocolate', 'perfume', 'watch'],
        'friend':  ['mug', 'chocolate', 'cake', 'hamper'],
        'boss':    ['hamper', 'pen', 'notebook'],
        'teacher': ['book', 'plant', 'mug', 'flowers'],
      }
      const relFallbacks = relationshipFallbacks[relationship] ?? ['gift', 'hamper', 'chocolate']
      fallbackTerms.push(...relFallbacks)
  } else {
      // 2. The user ASKED for something specific (e.g. "cakes", "computer accessories")
      // We DO NOT inject generic terms like "hamper" because Kapruka will search "cakes hamper" and fail.
      // We simply set a softer fallback of just the first specific word in case the full phrase fails.
      if (searchTerms.length > 1) {
          fallbackTerms.push(searchTerms[0])
      }
  }

  // ── Pass 8: Smart Refinement Detection ──
  const refinementPhrases = [
    'something cheaper', 'less expensive', 'budget option',
    'more premium', 'something expensive', 'better option',
    'different option', 'show more', 'other options',
    'not that', 'something else', 'change it',
    'try again', 'search again', 'show different',
    'find something cheaper', 'go more premium',
    'more', 'more please', 'another'
  ]

  const isRefinement = refinementPhrases.some(p => currentText.includes(p)) || currentText === 'more'

  if (isRefinement && searchTerms.length === 0) {
    // Look at the assistant's last message to find the exact quoted term it just searched for.
    // E.g., 'I showed the user 6 products for "Cakes".'
    const lastAssistantMsg = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-1)[0]?.content ?? ''

    const match = lastAssistantMsg.match(/for "([^"]+)"/i)
    if (match) {
      const carriedTerm = normalizeWord(match[1].toLowerCase())
      if (!searchTerms.includes(carriedTerm)) {
        searchTerms.push(carriedTerm)
      }
      console.log(`🧠 Context Retained: Inheriting "${carriedTerm}" from previous search.`)
    }
  }

  // Confidence Routing
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  let needsAI = false

  if (searchTerms.length > 0) confidence = 'high'
  else if (relationship !== 'unknown' && occasion !== 'unknown') confidence = 'medium'
  else {
    confidence = 'low'
    needsAI = true
  }

  return {
    searchTerms,
    fallbackTerms,
    relationship,
    occasion,
    budgetMin,
    budgetMax,
    confidence,
    needsAI,
    reasoning: `Rel: ${relationship} | Occ: ${occasion} | Terms: [${searchTerms.join(',')}]`,
  }
}

// ─── DYNAMIC MATCH SCORE ─────────────────────────────
// Returns a percentage (60–99) representing how well
// the product matches the user's intent.

export function calculateMatchScore(
  product: {
    name: string
    price: number | null
    stock_level?: string
  },
  intent: {
    searchTerms: string[]
    relationship: string
    occasion: string
    budgetMin: number
    budgetMax: number
  }
): number {
  let score = 0
  const name = product.name.toLowerCase()
  const price = product.price ?? 0

  // ── Term relevance (0–40 points) ──
  const termMatches = intent.searchTerms.filter(t =>
    name.includes(t.toLowerCase())
  ).length
  score += Math.min(termMatches * 10, 40)

  // ── Relationship keyword match (0–20 points) ──
  const relationshipKeywords: Record<string, string[]> = {
    mother:  ['mother', 'mom', 'amma', 'mum', 'her', 'lady', 'women', 'woman'],
    father:  ['father', 'dad', 'him', 'his', 'men', 'man'],
    brother: ['brother', 'him', 'his', 'men', 'man', 'boy'],
    sister:  ['sister', 'her', 'girl', 'lady', 'women'],
    partner: ['love', 'couple', 'wife', 'husband', 'her', 'him', 'romantic'],
    friend:  ['friend', 'bestie', 'bff'],
    boss:    ['premium', 'professional', 'executive'],
    teacher: ['teacher', 'education', 'learn'],
  }
  const relWords = relationshipKeywords[intent.relationship] ?? []
  if (relWords.some(w => name.includes(w))) score += 20

  // ── Occasion keyword match (0–20 points) ──
  const occasionKeywords: Record<string, string[]> = {
    birthday:    ['birthday', 'bday', 'born', 'celebration'],
    anniversary: ['anniversary', 'love', 'couple', 'wedding'],
    avurudu:     ['avurudu', 'new year', 'traditional'],
    achievement: ['achievement', 'success', 'graduation'],
    just_because: ['special', 'surprise', 'thinking'],
    christmas:   ['christmas', 'xmas', 'festive', 'holiday'],
    valentines:  ['valentine', 'love', 'romantic'],
  }
  const occWords = occasionKeywords[intent.occasion] ?? []
  if (occWords.some(w => name.includes(w))) score += 20

  // ── Budget fit (0–15 points) ──
  const budgetMax = intent.budgetMax === 999999 ? price * 2 : intent.budgetMax
  const budgetMin = intent.budgetMin
  const budgetRange = budgetMax - budgetMin
  if (budgetRange > 0 && price > 0) {
    const midpoint = budgetMin + budgetRange * 0.5
    const distanceFromMid = Math.abs(price - midpoint)
    const budgetScore = Math.max(0, 15 - (distanceFromMid / budgetRange) * 15)
    score += Math.round(budgetScore)
  } else {
    score += 8 // neutral if unlimited budget
  }

  // ── Stock level (0–5 points) ──
  if (product.stock_level === 'high') score += 5
  else if (product.stock_level === 'medium') score += 3
  else if (product.stock_level === 'low') score += 1

  // ── Convert to percentage (60–99%) ──
  // Raw score is out of 100; offset by 60 to give a floor
  const percentage = Math.min(99, Math.max(60, score + 60))
  return percentage
}
