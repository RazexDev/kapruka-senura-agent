export type ConversationIntent = 'browse' | 'gift' | 'clarify' | 'chitchat';

export function classifyIntent(
  message: string,
  conversationHistory: Array<{role:string, content:string}>
): ConversationIntent {
  const text = message.toLowerCase().trim()

  const browsePatterns = [
    /what.*available/i, /any.*available/i, /show me/i, /list.*products/i,
    /what.*do you have/i, /do you have/i, /is there/i, /are there/i,
    /can i see/i, /let me see/i, /browse/i, /search for/i,
    /under rs/i, /below rs/i, /price range/i, /how much/i,
    /cheapest/i, /most expensive/i, /best.*price/i,
    /what.*types/i, /what.*kinds/i, /what.*options/i, /what.*categories/i,
    /list of/i, /all.*products/i, /available.*products/i, /currently available/i,
    /show.*phones/i, /show.*cakes/i, /show.*flowers/i, /show.*chocolate/i,
    /accessories/i, /devices/i, /products/i, /items/i,
    /what.*have/i, /do.*have/i, /any.*\?/i,
  ]

  const giftPatterns = [
    /gift for/i, /present for/i, /buy for/i, /get for/i,
    /amma|thaththa|yaluwa|akka|aiya|malli|nangi/i,
    /mother|father|friend|sister|brother|boss|teacher/i,
    /birthday gift/i, /anniversary gift/i, /surprise for/i,
    /something for (my|her|him|them)/i,
    /aran denna/i, /araganna/i,
  ]

  const chitchatPatterns = [
    /^(hi|hello|hey|ayubowan|kohomada|kohoma)/i,
    /^(ok|okay|sure|alright|thanks|thank you|niyamai)/i,
    /^(yes|no|yeah|nope|yep)/i,
    /how are you/i, /what (is|are) you/i, /who are you/i, /your name/i,
  ]

  if (text.split(' ').length <= 3) {
    if (chitchatPatterns.some(p => p.test(text))) return 'chitchat'
  }

  const browseScore = browsePatterns.filter(p => p.test(text)).length
  const giftScore = giftPatterns.filter(p => p.test(text)).length

  if (browseScore > 0 && giftScore === 0) return 'browse'
  if (giftScore > 0 && browseScore === 0) return 'gift'
  if (giftScore > 0 && browseScore > 0) return 'gift'

  const isInGiftFlow = conversationHistory.some(m => 
    m.role === 'assistant' && (
      m.content.includes('who') || m.content.includes('budget') ||
      m.content.includes('occasion') || m.content.includes('personality') ||
      m.content.includes('relationship')
    )
  )
  if (isInGiftFlow && browseScore === 0) return 'clarify'

  const isShortProductQuery = text.split(' ').length <= 4 && giftScore === 0
  return isShortProductQuery ? 'browse' : 'gift'
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

  // Combined text is used for ALL passes except budget
  const combinedText = `${historyText} ${currentText}`.trim()
  const combinedWords = combinedText.split(' ')

  // ── Sanitize input for search terms (FIX 1) ──
  const text = message
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, ' ')    // remove punctuation
    .replace(/\s+/g, ' ')           // normalize spaces
    .trim()

  // Filter out words that are clearly not product terms:
  const stopWords = new Set([
    // Question/browse words - not products
    'what','which','where','when','how','why','who',
    'is','are','do','does','did','can','could','would',
    'should','have','has','had','been','being','be',
    'show','find','get','give','tell','let','make',
    'available','currently','now','today','here',
    'any','some','all','every','each','few','many',
    'monawada','mokada','thiyena','thiyenawa','tiyena',
    'kohomada','danne','kiyala','inne','inna',
    'please','thanks','okay','yes','no','ok',
    'want','need','looking','search','buy','order',
    // Single chars and very short words
    'a','an','the','in','on','at','to','of','for',
    'and','or','but','with','from','by',
  ])

  // After splitting into words, filter stop words:
  const words = text
    .split(' ')
    .filter(w => w.length > 3 && !stopWords.has(w))

  const searchTerms: string[] = []
  searchTerms.push(...words.slice(0, 4))

  const PRODUCT_WORDS_NOT_PERSONALITY = new Set([
    'earbuds','headphones','earphones','speaker',
    'watch','smartwatch','fitness band','bottle',
    'water bottle','laptop','tablet','keyboard',
    'mouse','camera','phone','mobile',
    'book','novel','game','gaming',
    'bag','wallet','shoes','dress','saree',
    'candle','lamp','plant','pillow','mug',
    'chocolate','cake','flowers','hamper',
  ])

  // ── Pass 2: Personality detection ──
  let detectedPersonality: string | null = null
  const PERSONALITY_TRIGGERS: Record<string, string[]> = {
    'techy':       ['techy','tech-savvy','techie'],
    'tech-lover':  ['tech lover','tech-lover','loves tech'],
    'homebody':    ['homebody','home body','gedara inna',
                    'stays home','indoor'],
    'foodie':      ['foodie','food lover','loves food',
                    'food enthusiast'],
    'fashionable': ['fashionable','fashion lover',
                    'stylish','trendy'],
    'trendsetter': ['trendsetter','trend setter'],
    'adventurer':  ['adventurer','adventurous',
                    'loves travel','traveller'],
    'bookworm':    ['bookworm','book worm','loves reading',
                    'avid reader'],
    'sporty':      ['sporty','athletic','loves sport',
                    'fitness freak','gym'],
    'traditional': ['traditional','old fashioned',
                    'sampradayika'],
    'artistic':    ['artistic','creative','loves art'],
    'gamer':       ['gamer','gaming lover','loves games',
                    'plays games'],
    'fitness':     ['fitness','workout','loves gym',
                    'health freak'],
  }

  // ONLY match if the EXACT trigger phrase appears
  // NOT partial word matches
  for (const [personality, triggers] of Object.entries(PERSONALITY_TRIGGERS)) {
    const matchedTrigger = triggers.find(t => combinedText.includes(t))
    
    if (matchedTrigger) {
      if (PRODUCT_WORDS_NOT_PERSONALITY.has(matchedTrigger)) {
        console.log(`Skipping personality "${personality}" — "${matchedTrigger}" is a product word`)
        continue
      }
      
      detectedPersonality = personality
      console.log('  Detected personality:', personality)
      // Add personality search terms
      const terms = PERSONALITY_SEARCH[personality] ?? []
      for (const t of terms) {
        if (!searchTerms.includes(t)) searchTerms.push(t)
      }
      break
    }
  }

  // ── Pass 3: Relationship extraction from COMBINED text ──
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
      relationship = rel
      break
    }
  }

  // ── Pass 4: Occasion extraction from COMBINED text ──
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
      occasion = occ
      break
    }
  }

  // ── Pass 5: Add occasion boost terms (only if search terms still sparse) ──
  if (occasion !== 'unknown' && OCCASION_BOOST[occasion] && searchTerms.length < 2) {
    for (const t of OCCASION_BOOST[occasion]) {
      if (!searchTerms.includes(t)) searchTerms.push(t)
    }
  }

  // ── Pass 6: Budget extraction — use ONLY recent messages to avoid stale values ──
  let budgetMin = 0
  let budgetMax = 999999

  const recentBudgetText = [
    currentText,
    ...conversationHistory.slice(-2).map(m => m.content.toLowerCase()),
  ].join(' ')

  const budgetPatterns: [RegExp, (m: RegExpMatchArray) => { min: number; max: number }][] = [
    [/under\s*(?:rs\.?)?\s*(\d[\d,]*)/i,
      m => ({ min: 0, max: parseInt(m[1].replace(/,/g, '')) })],
    [/below\s*(?:rs\.?)?\s*(\d[\d,]*)/i,
      m => ({ min: 0, max: parseInt(m[1].replace(/,/g, '')) })],
    [/(?:rs\.?)?\s*(\d[\d,]*)\s*(?:to|-)\s*(?:rs\.?)?\s*(\d[\d,]*)/i,
      m => ({ min: parseInt(m[1].replace(/,/g, '')), max: parseInt(m[2].replace(/,/g, '')) })],
    [/budget\s*(?:of|is)?\s*(?:rs\.?)?\s*(\d[\d,]*)/i,
      m => ({ min: 0, max: parseInt(m[1].replace(/,/g, '')) })],
    [/(?:rs\.?)?\s*(\d[\d,]+)/i,
      m => {
        const n = parseInt(m[1].replace(/,/g, ''))
        return n > 100
          ? { min: Math.floor(n * 0.7), max: Math.ceil(n * 1.3) }
          : { min: 0, max: 999999 }
      }],
  ]

  for (const [pattern, handler] of budgetPatterns) {
    const match = recentBudgetText.match(pattern)
    if (match) {
      const result = handler(match)
      budgetMin = result.min
      budgetMax = result.max
      break
    }
  }

  // ── Pass 7: Build fallback terms from relationship ──
  const fallbackTerms: string[] = []
  const relationshipFallbacks: Record<string, string[]> = {
    'mother':  ['mug', 'saree', 'plant', 'flowers'],
    'father':  ['watch', 'wallet', 'book', 'perfume'],
    'brother': ['gaming', 'watch', 'bag', 'phone'],
    'sister':  ['jewellery', 'bag', 'perfume', 'cosmetics'],
    'partner': ['flowers', 'chocolate', 'perfume', 'jewellery'],
    'friend':  ['mug', 'chocolate', 'book', 'hamper'],
    'boss':    ['hamper', 'watch', 'book'],
    'teacher': ['book', 'plant', 'mug', 'flowers'],
  }
  const relFallbacks = relationshipFallbacks[relationship] ?? ['hamper', 'mug', 'chocolate']
  for (const t of relFallbacks) {
    if (!searchTerms.includes(t) && !fallbackTerms.includes(t)) fallbackTerms.push(t)
  }

  // ── Pass 8: Refinement detection ──
  const refinementPhrases = [
    'something cheaper', 'less expensive', 'budget option',
    'more premium', 'something expensive', 'better option',
    'different option', 'show more', 'other options',
    'not that', 'something else', 'change it',
    'try again', 'search again', 'show different',
    'find something cheaper', 'go more premium',
  ]
  const isRefinement = refinementPhrases.some(p => currentText.includes(p))

  if (isRefinement && searchTerms.length === 0) {
    // Inherit terms from last assistant message
    const lastMsg = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-1)[0]?.content ?? ''
    const inherited = lastMsg.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 4)
    for (const t of inherited) {
      if (!searchTerms.includes(t)) searchTerms.push(t)
    }
  }

  // ── Pass 9: Confidence + needsAI ──
  const hasSpecificProduct = searchTerms.length > 0
  const hasRelationship = relationship !== 'unknown'
  const hasOccasion = occasion !== 'unknown'
  const messageIsVague = currentText.split(' ').length < 3

  let confidence: 'high' | 'medium' | 'low'
  let needsAI = false

  if (hasSpecificProduct && searchTerms.length >= 2) {
    confidence = 'high'
    needsAI = false
  } else if (hasSpecificProduct || (hasRelationship && hasOccasion)) {
    confidence = 'medium'
    needsAI = false
  } else if (messageIsVague || (!hasSpecificProduct && !hasRelationship)) {
    confidence = 'low'
    needsAI = true  // Only truly vague inputs go to Gemini
  } else {
    confidence = 'medium'
    needsAI = false
  }

  const reasoning = [
    detectedPersonality ? `Personality: ${detectedPersonality}` : '',
    `Rel: ${relationship}`,
    `Occ: ${occasion}`,
    needsAI ? '→ Gemini (low confidence)' : '→ Local engine',
  ].filter(Boolean).join(' | ')

  console.log('🔍 Local engine:', reasoning)
  console.log('   Terms:', searchTerms.slice(0, 4))
  console.log('   Fallbacks:', fallbackTerms.slice(0, 3))
  console.log('   Needs AI:', needsAI)

  return {
    searchTerms: searchTerms.slice(0, 4),
    fallbackTerms: fallbackTerms.slice(0, 3),
    relationship,
    occasion,
    budgetMin,
    budgetMax,
    confidence,
    needsAI,
    reasoning,
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
