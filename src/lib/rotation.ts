import type { CategoryRotation, Recipe } from '@/types/domain'

export interface SuggestedSlot {
  categoryId: string
  recipeId: string
}

function compareNullsFirst(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return -1
  if (b === null) return 1
  return a < b ? -1 : 1
}

/** Sorts categories by least-recently-cooked first; categories that were never cooked come first. */
export function sortCategoriesByRotation(categories: CategoryRotation[]): CategoryRotation[] {
  return [...categories].sort((a, b) => {
    const byLastCooked = compareNullsFirst(a.lastCookedAt, b.lastCookedAt)
    if (byLastCooked !== 0) return byLastCooked
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  })
}

function sortRecipesByRotation(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => {
    const byLastCooked = compareNullsFirst(a.lastCookedAt, b.lastCookedAt)
    if (byLastCooked !== 0) return byLastCooked
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  })
}

/**
 * Picks the next `slotCount` recipes: one per least-recently-cooked eligible category, then the
 * least-recently-cooked recipe within that category. Categories with no recipes are excluded so
 * they can't block the rotation. Slots become `null` when fewer eligible categories exist than
 * `slotCount`.
 */
export function suggestWeek(
  categories: CategoryRotation[],
  recipes: Recipe[],
  slotCount: number,
): Array<SuggestedSlot | null> {
  const eligibleCategories = sortCategoriesByRotation(categories.filter((c) => c.recipeCount > 0))
  const usedRecipeIds = new Set<string>()
  const slots: Array<SuggestedSlot | null> = []

  for (let i = 0; i < slotCount; i++) {
    const category = eligibleCategories[i]
    if (!category) {
      slots.push(null)
      continue
    }
    const candidateRecipes = sortRecipesByRotation(
      recipes.filter((r) => r.categoryId === category.id && !usedRecipeIds.has(r.id)),
    )
    const recipe = candidateRecipes[0]
    if (!recipe) {
      slots.push(null)
      continue
    }
    usedRecipeIds.add(recipe.id)
    slots.push({ categoryId: category.id, recipeId: recipe.id })
  }

  return slots
}
