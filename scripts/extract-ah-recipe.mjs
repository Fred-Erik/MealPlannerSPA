#!/usr/bin/env node
// Extracts structured recipe data from an Allerhande (ah.nl) recipe page.
// Allerhande embeds a schema.org Recipe as JSON-LD, which this script pulls out
// and normalizes (also does a best-effort split of ingredient strings into
// quantity/unit/name so the add-recipe payload can be built faster).
//
// Usage:
//   node scripts/extract-ah-recipe.mjs <url-or-saved-html-file> [--out <path>]
//
// Notes:
//   ah.nl is behind Akamai bot protection, so a direct fetch of the URL often
//   returns a challenge page instead of the real HTML. If that happens, save
//   the page from your browser (Ctrl+S, "Webpage, HTML only") and pass the
//   local .html file path instead.

import { readFile, writeFile } from 'node:fs/promises'

const [, , input, ...rest] = process.argv

if (!input) {
  console.error('Gebruik: node scripts/extract-ah-recipe.mjs <url-of-opgeslagen-html-bestand> [--out <path>]')
  process.exit(1)
}

const outIndex = rest.indexOf('--out')
const outPath = outIndex !== -1 ? rest[outIndex + 1] : null

const UNIT_MAP = {
  g: 'g', gram: 'g',
  kg: 'kg', kilo: 'kg',
  ml: 'ml',
  l: 'l', liter: 'l',
  el: 'el', eetlepel: 'el', eetlepels: 'el',
  tl: 'tl', theelepel: 'tl', theelepels: 'tl',
  teen: 'teentje', tenen: 'teentje', teentje: 'teentje', teentjes: 'teentje',
  blik: 'blik', blikje: 'blik', blikjes: 'blik',
  stuk: 'stuks', stuks: 'stuks',
  plakje: 'plakje', plakjes: 'plakje',
  zakje: 'zakje', zakjes: 'zakje',
  snufje: 'snufje',
  pot: 'pot', potje: 'pot',
  bakje: 'bakje', bakjes: 'bakje',
  takje: 'takje', takjes: 'takje',
  bosje: 'bosje',
  handje: 'handje', handjes: 'handje',
}

async function getHtml(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
    })
    const html = await response.text()
    if (!html.includes('"@type":"Recipe"')) {
      throw new Error(
        'Geen Recipe JSON-LD gevonden in de response (waarschijnlijk een Akamai bot-check). ' +
          'Sla de pagina op in de browser (Ctrl+S, "Webpagina, alleen HTML") en geef dat bestand als argument mee.',
      )
    }
    return html
  }
  return readFile(source, 'utf-8')
}

function extractRecipeJsonLd(html) {
  const scriptRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  let match
  while ((match = scriptRegex.exec(html))) {
    try {
      const json = JSON.parse(match[1])
      if (json['@type'] === 'Recipe') return json
    } catch {
      // not valid JSON or not the block we want, keep scanning
    }
  }
  throw new Error('Geen <script type="application/ld+json"> blok met een Recipe gevonden.')
}

// Units that AH always renders as a separate quantityUnit (never folded into the
// ingredient name), so a mismatch against these is trustworthy enough to auto-correct.
const RELIABLE_STRUCTURED_UNITS = new Set(['g', 'kg', 'ml', 'l', 'el', 'tl'])

// The JSON-LD recipeIngredient array is plain text (e.g. "1000 kg gnocchi") and AH's
// own generator occasionally glues the wrong unit onto it. The page also embeds a
// richer Next.js data blob per ingredient with a numeric quantity + quantityUnit,
// which we use here to cross-check/correct the naive text parse below.
function extractStructuredIngredientData(html) {
  const re =
    /\\?"name\\?":\{\\?"__typename\\?":\\?"SingularPluralName\\?",\\?"singular\\?":\\?"([^"\\]+)\\?"[^}]*\}\s*,\s*\\?"quantity\\?":([\d.]+)\s*,\s*\\?"quantityUnit\\?":\{\\?"__typename\\?":\\?"SingularPluralName\\?",\\?"singular\\?":\\?"([^"\\]*)\\?"/g
  const results = []
  let match
  while ((match = re.exec(html))) {
    results.push({ quantity: Number(match[2]), unit: match[3] || null })
  }
  return results
}

function parseQuantity(raw) {
  const normalized = raw.trim().replace(',', '.')
  if (/^\d+\/\d+$/.test(normalized)) {
    const [num, den] = normalized.split('/').map(Number)
    return den ? num / den : null
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function parseIngredient(text) {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s+(.*)$/)
  if (!match) {
    return { quantity: null, unit: null, name: trimmed }
  }
  const quantity = parseQuantity(match[1])
  const rest = match[2]
  const [firstWord, ...restWords] = rest.split(' ')
  const unit = UNIT_MAP[firstWord.toLowerCase()]
  if (unit) {
    return { quantity, unit, name: restWords.join(' ').trim() }
  }
  return { quantity, unit: null, name: rest.trim() }
}

function normalizeRecipe(recipeLd, sourceUrl, html) {
  const images = (recipeLd.image ?? []).filter(Boolean)
  const instructions = (recipeLd.recipeInstructions ?? [])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((step) => step.text?.trim())
    .filter(Boolean)

  const ingredientsRaw = recipeLd.recipeIngredient ?? []
  const structured = extractStructuredIngredientData(html)
  const canCrossCheck = structured.length === ingredientsRaw.length

  const ingredients = ingredientsRaw.map((text, i) => {
    const parsed = parseIngredient(text)
    const match = canCrossCheck ? structured[i] : null
    if (
      match &&
      RELIABLE_STRUCTURED_UNITS.has(match.unit) &&
      (match.quantity !== parsed.quantity || match.unit !== parsed.unit)
    ) {
      console.error(
        `Waarschuwing: "${text}" leek fout/dubbelzinnig geparsed, gecorrigeerd naar ${match.quantity} ${match.unit} op basis van paginadata.`,
      )
      return { quantity: match.quantity, unit: match.unit, name: parsed.name }
    }
    return parsed
  })

  return {
    name: recipeLd.name ?? null,
    servings: recipeLd.recipeYield ? Number(recipeLd.recipeYield) : null,
    totalTime: recipeLd.totalTime ?? null,
    imageUrl: images.at(-1) ?? null,
    sourceUrl: sourceUrl ?? recipeLd.url ?? null,
    instructions: instructions.join('\n'),
    ingredientsRaw,
    ingredients,
  }
}

try {
  const html = await getHtml(input)
  const recipeLd = extractRecipeJsonLd(html)
  const sourceUrl = /^https?:\/\//i.test(input) ? input : recipeLd.url
  const recipe = normalizeRecipe(recipeLd, sourceUrl, html)

  const json = JSON.stringify(recipe, null, 2)
  console.log(json)
  if (outPath) {
    await writeFile(outPath, json, 'utf-8')
    console.error(`\nWeggeschreven naar ${outPath}`)
  }
} catch (error) {
  console.error('Fout:', error.message ?? error)
  process.exit(1)
}
