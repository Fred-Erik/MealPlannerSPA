import { supabase } from '@/supabaseClient'
import type { Category, CategoryRotation } from '@/types/domain'

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id, name').order('name')
  if (error) throw error
  return data
}

export async function createCategory(name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select('id, name')
    .single()
  if (error) throw error
  return data
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function getRotation(): Promise<CategoryRotation[]> {
  const { data, error } = await supabase
    .from('category_rotation')
    .select('id, name, created_at, last_cooked_at, last_planned_at, recipe_count')
  if (error) throw error
  return data.map((row) => ({
    id: row.id!,
    name: row.name!,
    createdAt: row.created_at!,
    lastCookedAt: row.last_cooked_at,
    lastPlannedAt: row.last_planned_at,
    recipeCount: row.recipe_count!,
  }))
}
