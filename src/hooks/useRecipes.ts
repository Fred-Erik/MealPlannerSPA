import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as recipesApi from '@/api/recipes'
import type { SaveRecipeInput } from '@/api/recipes'

export function useRecipes() {
  return useQuery({ queryKey: ['recipes'], queryFn: recipesApi.listRecipes })
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.getRecipe(id!),
    enabled: !!id,
  })
}

export function useSaveRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveRecipeInput) => recipesApi.saveRecipe(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['rotation'] })
      if (input.id) queryClient.invalidateQueries({ queryKey: ['recipe', input.id] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recipesApi.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['rotation'] })
    },
  })
}
