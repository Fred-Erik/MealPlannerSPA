export interface Category {
  id: string
  name: string
}

export interface CategoryRotation {
  id: string
  name: string
  sortOrder: number
  createdAt: string
  lastCookedAt: string | null
  recipeCount: number
}

export interface RecipeIngredient {
  id: string
  position: number
  quantity: number | null
  unit: string | null
  name: string
}

export interface Recipe {
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
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[]
}

export interface RecipeWithCategory extends Recipe {
  category: Category
}

export interface PlannedRecipe extends Recipe {
  category: Category
  ingredients: RecipeIngredient[]
}

export interface MealPlanItem {
  id: string
  mealPlanId: string
  recipeId: string
  servings: number
  position: number
  cookedAt: string | null
}

export interface MealPlanItemWithRecipe extends MealPlanItem {
  recipe: PlannedRecipe
}

export interface MealPlan {
  id: string
  weekStart: string
  createdAt: string
}

export interface MealPlanWithItems extends MealPlan {
  items: MealPlanItemWithRecipe[]
}

export interface Settings {
  defaultRecipesPerWeek: number
  defaultServings: number
}
