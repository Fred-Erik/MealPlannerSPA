import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as categoriesApi from '@/api/categories'
import type { CategoryRotation } from '@/types/domain'

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: categoriesApi.listCategories })
}

export function useRotation() {
  return useQuery({ queryKey: ['rotation'], queryFn: categoriesApi.getRotation })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => categoriesApi.createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['rotation'] })
    },
  })
}

export function useRenameCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoriesApi.renameCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['rotation'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['rotation'] })
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (categoryIds: string[]) => categoriesApi.reorderCategories(categoryIds),
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey: ['rotation'] })
      const previous = queryClient.getQueryData<CategoryRotation[]>(['rotation'])
      if (previous) {
        const orderIndex = new Map(categoryIds.map((id, i) => [id, i]))
        queryClient.setQueryData<CategoryRotation[]>(
          ['rotation'],
          previous.map((c) => ({ ...c, sortOrder: orderIndex.get(c.id) ?? c.sortOrder })),
        )
      }
      return { previous }
    },
    onError: (_err, _categoryIds, context) => {
      if (context?.previous) queryClient.setQueryData(['rotation'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rotation'] })
    },
  })
}
