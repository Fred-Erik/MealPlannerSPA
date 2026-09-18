import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as mealPlansApi from '@/api/mealPlans'
import { suggestWeek } from '@/lib/rotation'
import type { CategoryRotation, Recipe } from '@/types/domain'

export function useMealPlan(weekStart: string) {
  return useQuery({ queryKey: ['mealPlan', weekStart], queryFn: () => mealPlansApi.getPlan(weekStart) })
}

export function useArchive(beforeWeekStart: string) {
  return useQuery({ queryKey: ['archive', beforeWeekStart], queryFn: () => mealPlansApi.listArchive(beforeWeekStart) })
}

function invalidatePlan(queryClient: ReturnType<typeof useQueryClient>, weekStart: string) {
  queryClient.invalidateQueries({ queryKey: ['mealPlan', weekStart] })
  queryClient.invalidateQueries({ queryKey: ['rotation'] })
  queryClient.invalidateQueries({ queryKey: ['recipes'] })
}

interface GenerateWeekInput {
  weekStart: string
  categories: CategoryRotation[]
  recipes: Recipe[]
  slotCount: number
  defaultServings: number
}

/** Creates the week's plan (if missing) and fills its slots via the rotation algorithm. */
export function useGenerateWeek() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GenerateWeekInput) => {
      const plan = await mealPlansApi.createPlan(input.weekStart)
      const slots = suggestWeek(input.categories, input.recipes, input.slotCount)
      const items = slots
        .map((slot, position) => (slot ? { recipeId: slot.recipeId, servings: input.defaultServings, position } : null))
        .filter((item): item is NonNullable<typeof item> => item !== null)
      await mealPlansApi.addItems(plan.id, items)
      return plan
    },
    onSuccess: (_, input) => invalidatePlan(queryClient, input.weekStart),
  })
}

export function useAddPlanItem(weekStart: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { mealPlanId: string; recipeId: string; servings: number; position: number }) =>
      mealPlansApi.addItems(input.mealPlanId, [
        { recipeId: input.recipeId, servings: input.servings, position: input.position },
      ]),
    onSuccess: () => invalidatePlan(queryClient, weekStart),
  })
}

export function useUpdatePlanItem(weekStart: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { itemId: string; recipeId?: string; servings?: number; cookedAt?: string | null }) =>
      mealPlansApi.updateItem(input.itemId, input),
    onSuccess: () => invalidatePlan(queryClient, weekStart),
  })
}

export function useDeletePlanItem(weekStart: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => mealPlansApi.deleteItem(itemId),
    onSuccess: () => invalidatePlan(queryClient, weekStart),
  })
}
