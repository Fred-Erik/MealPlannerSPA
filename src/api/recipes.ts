import { supabase } from '@/supabaseClient'
import type { RecipeWithCategory, RecipeWithIngredients } from '@/types/domain'

interface RecipeRow {
  id: string
  category_id: string
  name: string
  base_servings: number
  instructions: string | null
  source_url: string | null
  notes: string | null
  photo_path: string | null
  last_cooked_at: string | null
  created_at: string
  updated_at: string
}

function mapRecipe(row: RecipeRow): {
  id: string
  categoryId: string
  name: string
  baseServings: number
  instructions: string | null
  sourceUrl: string | null
  notes: string | null
  photoPath: string | null
  lastCookedAt: string | null
  createdAt: string
  updatedAt: string
} {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    baseServings: row.base_servings,
    instructions: row.instructions,
    sourceUrl: row.source_url,
    notes: row.notes,
    photoPath: row.photo_path,
    lastCookedAt: row.last_cooked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listRecipes(): Promise<RecipeWithCategory[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, category:categories(id, name)')
    .order('name')
  if (error) throw error
  return data.map((row) => ({ ...mapRecipe(row), category: row.category }))
}

export async function getRecipe(id: string): Promise<RecipeWithIngredients & { category: { id: string; name: string } }> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, category:categories(id, name), ingredients:recipe_ingredients(*)')
    .eq('id', id)
    .order('position', { referencedTable: 'recipe_ingredients' })
    .single()
  if (error) throw error
  return {
    ...mapRecipe(data),
    category: data.category,
    ingredients: data.ingredients.map((i) => ({
      id: i.id,
      position: i.position,
      quantity: i.quantity,
      unit: i.unit,
      name: i.name,
    })),
  }
}

export interface SaveRecipeIngredientInput {
  quantity: number | null
  unit: string | null
  name: string
}

export interface SaveRecipeInput {
  id?: string
  categoryId: string
  name: string
  baseServings: number
  instructions: string | null
  sourceUrl: string | null
  notes: string | null
  photoPath: string | null
  lastCookedAt: string | null
  ingredients: SaveRecipeIngredientInput[]
}

export async function saveRecipe(input: SaveRecipeInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_recipe', {
    payload: {
      id: input.id ?? null,
      category_id: input.categoryId,
      name: input.name,
      base_servings: input.baseServings,
      instructions: input.instructions,
      source_url: input.sourceUrl,
      notes: input.notes,
      photo_path: input.photoPath,
      last_cooked_at: input.lastCookedAt,
      ingredients: input.ingredients.map((i) => ({
        quantity: i.quantity,
        unit: i.unit,
        name: i.name,
      })),
    },
  })
  if (error) throw error
  return data
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

const PHOTO_BUCKET = 'recipe-photos'

export async function uploadPhoto(recipeId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${recipeId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

export function getPhotoUrl(photoPath: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl
}
