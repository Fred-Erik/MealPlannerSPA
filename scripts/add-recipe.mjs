#!/usr/bin/env node
// CLI used by the add-recipe agent skill to write recipes via the service-role key.
// Usage: node --env-file=.env scripts/add-recipe.mjs <command> [args]
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.')
  console.error('Run as: node --env-file=.env scripts/add-recipe.mjs <command>')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const [, , command, arg] = process.argv

async function listCategories() {
  const { data, error } = await supabase.from('categories').select('id, name').order('name')
  if (error) throw error
  console.log('Categorieën:')
  for (const category of data) {
    console.log(`  ${category.id}  ${category.name}`)
  }
}

async function listIngredientNames() {
  const { data, error } = await supabase
    .from('ingredient_names')
    .select('name, usage_count, units')
  if (error) throw error
  console.log('Bestaande ingrediëntnamen (hergebruik deze strings exact voor deduplicatie):')
  for (const row of data) {
    const units = (row.units ?? []).filter(Boolean).join(', ') || '(geen eenheid)'
    console.log(`  ${row.name}  [${row.usage_count}x, eenheden: ${units}]`)
  }
}

async function downloadPhoto(recipeId, photoUrl) {
  const response = await fetch(photoUrl)
  if (!response.ok) throw new Error(`Kon foto niet downloaden: ${response.status}`)
  const contentType = response.headers.get('content-type') ?? 'image/jpeg'
  const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
  const buffer = Buffer.from(await response.arrayBuffer())
  const path = `${recipeId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('recipe-photos')
    .upload(path, buffer, { contentType, upsert: true })
  if (error) throw error
  return path
}

async function addRecipe(payloadPath) {
  const raw = await readFile(payloadPath, 'utf-8')
  const payload = JSON.parse(raw)

  if (!payload.category_id) throw new Error('payload.category_id is verplicht (run `categories` om de id op te zoeken)')
  if (!payload.name) throw new Error('payload.name is verplicht')

  const recipeId = crypto.randomUUID()
  let photoPath = null
  if (payload.photo_url) {
    photoPath = await downloadPhoto(recipeId, payload.photo_url)
  }

  const { data, error } = await supabase.rpc('save_recipe', {
    payload: {
      id: recipeId,
      category_id: payload.category_id,
      name: payload.name,
      base_servings: payload.base_servings ?? 6,
      instructions: payload.instructions ?? null,
      source_url: payload.source_url ?? null,
      notes: payload.notes ?? null,
      photo_path: photoPath,
      last_cooked_at: payload.last_cooked_at ?? null,
      ingredients: (payload.ingredients ?? []).map((i) => ({
        quantity: i.quantity ?? null,
        unit: i.unit ?? null,
        name: i.name,
      })),
    },
  })
  if (error) throw error

  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', payload.category_id)
    .single()

  console.log('Recept toegevoegd — controleer onderstaande gegevens:')
  console.log(`  id: ${data}`)
  console.log(`  naam: ${payload.name}`)
  console.log(`  categorie: ${category?.name ?? payload.category_id}`)
  console.log(`  basis aantal personen: ${payload.base_servings ?? 6}`)
  console.log(`  bron: ${payload.source_url ?? '(geen)'}`)
  console.log(`  foto: ${photoPath ?? '(geen)'}`)
  console.log(`  ingrediënten (${(payload.ingredients ?? []).length}):`)
  for (const ingredient of payload.ingredients ?? []) {
    const qty = ingredient.quantity !== null && ingredient.quantity !== undefined ? `${ingredient.quantity} ` : ''
    const unit = ingredient.unit ? `${ingredient.unit} ` : ''
    console.log(`    - ${qty}${unit}${ingredient.name}`)
  }
}

try {
  switch (command) {
    case 'categories':
      await listCategories()
      break
    case 'ingredients':
      await listIngredientNames()
      break
    case 'add':
      if (!arg) throw new Error('Gebruik: add <pad-naar-payload.json>')
      await addRecipe(arg)
      break
    default:
      console.error('Onbekend commando. Gebruik: categories | ingredients | add <payload.json>')
      process.exit(1)
  }
} catch (error) {
  console.error('Fout:', error.message ?? error)
  process.exit(1)
}
