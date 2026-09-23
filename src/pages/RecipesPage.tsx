import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRecipes } from '@/hooks/useRecipes'
import { useCategories } from '@/hooks/useCategories'
import { getPhotoUrl } from '@/api/recipes'

const ALL_CATEGORIES = 'alle'

export function RecipesPage() {
  const { data: recipes, isLoading } = useRecipes()
  const { data: categories } = useCategories()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(searchParams.get('categorie') ?? ALL_CATEGORIES)

  const filtered = useMemo(() => {
    if (!recipes) return []
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryId === ALL_CATEGORIES || recipe.categoryId === categoryId
      return matchesSearch && matchesCategory
    })
  }, [recipes, search, categoryId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Recepten</h1>
        <Button
          render={
            <Link to="/recepten/nieuw">
              <Plus className="mr-1 size-4" /> Nieuw recept
            </Link>
          }
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value ?? ALL_CATEGORIES)
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              if (!value || value === ALL_CATEGORIES) {
                next.delete('categorie')
              } else {
                next.set('categorie', value)
              }
              return next
            })
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Categorie">
              {(value: string | null) =>
                value === ALL_CATEGORIES || !value
                  ? 'Alle categorieën'
                  : categories?.find((category) => category.id === value)?.name
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Alle categorieën</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              to={`/recepten/${recipe.id}`}
              className="relative aspect-video overflow-hidden rounded-lg border bg-muted transition-colors hover:bg-accent"
            >
              {recipe.photoPath && (
                <img
                  src={getPhotoUrl(recipe.photoPath)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <Badge variant="secondary" className="absolute right-2 top-2">
                {recipe.category.name}
              </Badge>
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-10">
                <span className="font-medium text-white">{recipe.name}</span>
                <span className="text-xs text-white/80">
                  {recipe.lastCookedAt ? `Laatst gekookt: ${recipe.lastCookedAt}` : 'Nog niet gekookt'}
                </span>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground">Geen recepten gevonden.</p>
          )}
        </div>
      )}
    </div>
  )
}
