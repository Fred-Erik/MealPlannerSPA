import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { sortCategoriesByRotation } from '@/lib/rotation'
import { getPhotoUrl } from '@/api/recipes'
import type { CategoryRotation, RecipeWithCategory } from '@/types/domain'

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipes: RecipeWithCategory[]
  rotation?: CategoryRotation[]
  excludeRecipeIds?: string[]
  selectedRecipeId?: string | null
  onSelect: (recipeId: string) => void
}

export function RecipePickerDialog({
  open,
  onOpenChange,
  recipes,
  rotation,
  excludeRecipeIds = [],
  selectedRecipeId,
  onSelect,
}: RecipePickerDialogProps) {
  const [search, setSearch] = useState('')
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const grouped = useMemo(() => {
    const filtered = recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    const byCategory = new Map<string, { name: string; recipes: RecipeWithCategory[] }>()
    for (const recipe of filtered) {
      const key = recipe.category.id
      if (!byCategory.has(key)) byCategory.set(key, { name: recipe.category.name, recipes: [] })
      byCategory.get(key)!.recipes.push(recipe)
    }
    const orderedIds = rotation
      ? sortCategoriesByRotation(rotation).map((c) => c.id)
      : Array.from(byCategory.keys()).sort()
    const ids = [...orderedIds.filter((id) => byCategory.has(id)), ...Array.from(byCategory.keys()).filter((id) => !orderedIds.includes(id))]
    return ids.map((id) => ({ id, ...byCategory.get(id)! }))
  }, [recipes, search, rotation])

  // Scroll to the category of the recipe being replaced so it's immediately visible.
  useEffect(() => {
    if (!open || !selectedRecipeId) return
    const categoryId = recipes.find((r) => r.id === selectedRecipeId)?.category.id
    if (!categoryId) return
    const frame = requestAnimationFrame(() => {
      categoryRefs.current[categoryId]?.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, selectedRecipeId, recipes])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) setSearch('')
      }}
    >
      <DialogContent className="max-h-[80vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <div className="sticky -top-4 z-10 -mx-4 -mt-4 space-y-2 bg-popover px-4 pt-4 pb-3">
          <DialogHeader>
            <DialogTitle>Kies een recept</DialogTitle>
          </DialogHeader>
          <Input placeholder="Zoeken…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-4">
          {grouped.map((group) => (
            <div
              key={group.id}
              className="min-w-0"
              ref={(el) => {
                categoryRefs.current[group.id] = el
              }}
            >
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">{group.name}</h3>
              <div className="space-y-1">
                {group.recipes.map((recipe) => {
                  const disabled = excludeRecipeIds.includes(recipe.id)
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onSelect(recipe.id)
                        onOpenChange(false)
                      }}
                      className="flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                        {recipe.photoPath && (
                          <img src={getPhotoUrl(recipe.photoPath)} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate">{recipe.name}</span>
                      {disabled && <Badge variant="secondary" className="shrink-0">Al gekozen</Badge>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <p className="text-sm text-muted-foreground">Geen recepten gevonden.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
