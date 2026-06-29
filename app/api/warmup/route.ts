import { getCatalog } from '@/lib/kaprukaCatalog'
import { NextResponse } from 'next/server'

export async function GET() {
  const catalog = await getCatalog()
  return NextResponse.json({
    status: 'ready',
    terms: catalog.totalTerms,
    builtAt: new Date(catalog.builtAt).toISOString(),
    sample: catalog.entries.slice(0,5).map(e => ({
      term: e.searchTerm,
      results: e.resultCount,
      keywords: e.keywords.slice(0,3)
    }))
  })
}
