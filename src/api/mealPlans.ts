import { supabase } from '@/supabaseClient'
import type { MealPlan, MealPlanWithItems } from '@/types/domain'

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
  category: { id: string; name: string }
  ingredients: { id: string; position: number; quantity: number | null; unit: string | null; name: string }[]
}

interface MealPlanItemRow {
  id: string
  meal_plan_id: string
  recipe_id: string
  servings: number
  position: number
  cooked_at: string | null
  recipe: RecipeRow
}

interface MealPlanRow {
  id: string
  week_start: string
  created_at: string
  items: MealPlanItemRow[]
}

const PLAN_ITEMS_SELECT =
  '*, items:meal_plan_items(*, recipe:recipes(*, category:categories(id, name), ingredients:recipe_ingredients(*)))'

function mapPlan(row: MealPlanRow): MealPlanWithItems {
  return {
    id: row.id,
    weekStart: row.week_start,
    createdAt: row.created_at,
    items: row.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        mealPlanId: item.meal_plan_id,
        recipeId: item.recipe_id,
        servings: item.servings,
        position: item.position,
        cookedAt: item.cooked_at,
        recipe: {
          id: item.recipe.id,
          categoryId: item.recipe.category_id,
          name: item.recipe.name,
          baseServings: item.recipe.base_servings,
          instructions: item.recipe.instructions,
          sourceUrl: item.recipe.source_url,
          notes: item.recipe.notes,
          photoPath: item.recipe.photo_path,
          lastCookedAt: item.recipe.last_cooked_at,
          createdAt: item.recipe.created_at,
          updatedAt: item.recipe.updated_at,
          category: item.recipe.category,
          ingredients: item.recipe.ingredients
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((i) => ({ id: i.id, position: i.position, quantity: i.quantity, unit: i.unit, name: i.name })),
        },
      })),
  }
}

export async function getPlan(weekStart: string): Promise<MealPlanWithItems | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select(PLAN_ITEMS_SELECT)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapPlan(data)
}

export async function createPlan(weekStart: string): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({ week_start: weekStart })
    .select('id, week_start, created_at')
    .single()
  if (error) throw error
  return { id: data.id, weekStart: data.week_start, createdAt: data.created_at }
}

export interface NewMealPlanItem {
  recipeId: string
  servings: number
  position: number
}

export async function addItems(mealPlanId: string, items: NewMealPlanItem[]): Promise<void> {
  if (items.length === 0) return
  const { error } = await supabase.from('meal_plan_items').insert(
    items.map((item) => ({
      meal_plan_id: mealPlanId,
      recipe_id: item.recipeId,
      servings: item.servings,
      position: item.position,
    })),
  )
  if (error) throw error
}

export async function updateItem(
  itemId: string,
  updates: { recipeId?: string; servings?: number; cookedAt?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('meal_plan_items')
    .update({
      ...(updates.recipeId !== undefined && { recipe_id: updates.recipeId }),
      ...(updates.servings !== undefined && { servings: updates.servings }),
      ...(updates.cookedAt !== undefined && { cooked_at: updates.cookedAt }),
    })
    .eq('id', itemId)
  if (error) throw error
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('meal_plan_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function listArchive(beforeWeekStart: string): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, week_start, created_at')
    .lt('week_start', beforeWeekStart)
    .order('week_start', { ascending: false })
  if (error) throw error
  return data.map((row) => ({ id: row.id, weekStart: row.week_start, createdAt: row.created_at }))
}
