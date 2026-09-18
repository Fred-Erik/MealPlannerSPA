import type { MealPlanItemWithRecipe } from '@/types/domain'

const COUNTABLE_UNITS = new Set([
  'stuks',
  'stuk',
  'st',
  'teentje',
  'teentjes',
  'blik',
  'blikken',
  'pak',
  'pakken',
  'bol',
  'krop',
  'bosje',
  'bosjes',
  'plak',
  'plakken',
])

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function roundQuantity(quantity: number, unit: string | null): number {
  const normalizedUnit = unit ? normalize(unit) : null
  if (normalizedUnit === null || COUNTABLE_UNITS.has(normalizedUnit)) {
    return Math.ceil(quantity)
  }
  return Math.round(quantity * 100) / 100
}

function formatQuantity(quantity: number): string {
  return quantity.toString()
}

interface IngredientGroup {
  displayName: string
  displayUnit: string | null
  totalQuantity: number
  hasQuantity: boolean
}

/**
 * Merges planned recipes' ingredients into a plain-text shopping list: scaled quantities merged
 * by normalized name + unit, followed by a blank line and the list of recipe names.
 */
export function buildShoppingList(items: MealPlanItemWithRecipe[]): string {
  const groups = new Map<string, IngredientGroup>()

  for (const item of items) {
    const { recipe } = item
    for (const ingredient of recipe.ingredients) {
      const key = `${normalize(ingredient.name)}|${ingredient.unit ? normalize(ingredient.unit) : ''}`
      const scaledQuantity =
        ingredient.quantity === null
          ? null
          : (ingredient.quantity * item.servings) / recipe.baseServings

      let group = groups.get(key)
      if (!group) {
        group = {
          displayName: ingredient.name.trim(),
          displayUnit: ingredient.unit ? ingredient.unit.trim() : null,
          totalQuantity: 0,
          hasQuantity: false,
        }
        groups.set(key, group)
      }
      if (scaledQuantity !== null) {
        group.totalQuantity += scaledQuantity
        group.hasQuantity = true
      }
    }
  }

  const lines = Array.from(groups.values())
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'nl'))
    .map((group) => {
      if (!group.hasQuantity) {
        return group.displayName
      }
      const rounded = roundQuantity(group.totalQuantity, group.displayUnit)
      const quantityText = formatQuantity(rounded)
      return group.displayUnit
        ? `${quantityText} ${group.displayUnit} ${group.displayName}`
        : `${quantityText} ${group.displayName}`
    })

  const recipeNames = items.map((item) => item.recipe.name)

  return [...lines, '', 'Recepten:', ...recipeNames].join('\n')
}
