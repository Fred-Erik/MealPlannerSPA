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
 * they can't block the rotation. A category with no remaining unused recipe is skipped in favor
 * of the next eligible category. Slots become `null` once eligible categories are exhausted.
 * `usedCategoryIds` (categories already present elsewhere in this week's plan) are pushed to the
 * back of the rotation so a new slot doesn't repeat a category that's already covered this week.
 */
export function suggestWeek(
  categories: CategoryRotation[],
  recipes: Recipe[],
  slotCount: number,
  usedCategoryIds: string[] = [],
): Array<SuggestedSlot | null> {
  const sorted = sortCategoriesByRotation(categories.filter((c) => c.recipeCount > 0))
  const usedSet = new Set(usedCategoryIds)
  const eligibleCategories = [...sorted.filter((c) => !usedSet.has(c.id)), ...sorted.filter((c) => usedSet.has(c.id))]
  const usedRecipeIds = new Set<string>()
  const slots: Array<SuggestedSlot | null> = []

  let categoryIndex = 0
  while (slots.length < slotCount) {
    const category = eligibleCategories[categoryIndex]
    categoryIndex++
    if (!category) {
      slots.push(null)
      continue
    }
    const candidateRecipes = sortRecipesByRotation(
      recipes.filter((r) => r.categoryId === category.id && !usedRecipeIds.has(r.id)),
    )
    const recipe = candidateRecipes[0]
    if (!recipe) continue
    usedRecipeIds.add(recipe.id)
    slots.push({ categoryId: category.id, recipeId: recipe.id })
  }

  return slots
}
