import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { RecipeWithCategory } from '@/types/domain'

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipes: RecipeWithCategory[]
  excludeRecipeIds?: string[]
  onSelect: (recipeId: string) => void
}

export function RecipePickerDialog({
  open,
  onOpenChange,
  recipes,
  excludeRecipeIds = [],
  onSelect,
}: RecipePickerDialogProps) {
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const filtered = recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    const byCategory = new Map<string, { name: string; recipes: RecipeWithCategory[] }>()
    for (const recipe of filtered) {
      const key = recipe.category.id
      if (!byCategory.has(key)) byCategory.set(key, { name: recipe.category.name, recipes: [] })
      byCategory.get(key)!.recipes.push(recipe)
    }
    return Array.from(byCategory.values()).sort((a, b) => a.name.localeCompare(b.name, 'nl'))
  }, [recipes, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kies een recept</DialogTitle>
        </DialogHeader>
        <Input placeholder="Zoeken…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.name}>
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
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>{recipe.name}</span>
                      {disabled && <Badge variant="secondary">Al gekozen</Badge>}
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
