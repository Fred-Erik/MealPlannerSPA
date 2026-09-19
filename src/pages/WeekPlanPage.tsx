import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Repeat, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RecipePickerDialog } from '@/components/week/RecipePickerDialog'
import { useMealPlan, useGenerateWeek, useUpdatePlanItem, useDeletePlanItem } from '@/hooks/useMealPlan'
import { useRotation } from '@/hooks/useCategories'
import { useRecipes } from '@/hooks/useRecipes'
import { useSettings } from '@/hooks/useSettings'
import {
  formatWeekLabel,
  getCurrentWeekStart,
  getNextWeekStart,
  getPreviousWeekStart,
  isEditableWeek,
} from '@/lib/week'
import { sortCategoriesByRotation } from '@/lib/rotation'
import { buildShoppingList } from '@/lib/shoppingList'
import { getPhotoUrl } from '@/api/recipes'
import { cn } from '@/lib/utils'

export function WeekPlanPage() {
  const params = useParams<{ weekStart?: string }>()
  const navigate = useNavigate()
  const weekStart = params.weekStart ?? getCurrentWeekStart()
  const editable = isEditableWeek(weekStart)
  const currentWeekStart = getCurrentWeekStart()
  const nextWeekStart = getNextWeekStart(currentWeekStart)
  const weekSubtitle =
    weekStart === currentWeekStart ? 'Deze week' : weekStart === nextWeekStart ? 'Komende week' : null

  const { data: plan, isLoading: planLoading } = useMealPlan(weekStart)
  const { data: rotation } = useRotation()
  const { data: recipes } = useRecipes()
  const { data: settings } = useSettings()

  const generateWeek = useGenerateWeek()
  const updateItem = useUpdatePlanItem(weekStart)
  const deleteItem = useDeletePlanItem(weekStart)

  // Target count used only until a plan exists; afterwards the actual item count is authoritative.
  const [pendingCount, setPendingCount] = useState(3)
  const [pickerOpenForItem, setPickerOpenForItem] = useState<string | null>(null)

  useEffect(() => {
    if (settings) setPendingCount(settings.defaultRecipesPerWeek)
  }, [settings])

  const recipeCount = plan ? plan.items.length : pendingCount

  async function handleIncrement() {
    if (!rotation || !recipes || !settings) return
    try {
      await generateWeek.mutateAsync({
        weekStart,
        categories: rotation,
        recipes,
        slotCount: recipeCount + 1,
        defaultServings: settings.defaultServings,
        existingRecipeIds: plan?.items.map((i) => i.recipeId) ?? [],
        existingPositions: plan?.items.map((i) => i.position) ?? [],
      })
    } catch {
      toast.error('Toevoegen mislukt.')
    }
  }

  async function handleDecrement() {
    if (!plan || plan.items.length === 0) {
      setPendingCount((n) => Math.max(0, n - 1))
      return
    }
    const lastItem = [...plan.items].sort((a, b) => b.position - a.position)[0]
    await deleteItem.mutateAsync(lastItem.id)
  }

  async function handleCookedToggle(itemId: string, checked: boolean) {
    await updateItem.mutateAsync({ itemId, cookedAt: checked ? getCurrentWeekStart() : null })
  }

  async function handleServingsChange(itemId: string, servings: number) {
    if (servings < 1) return
    await updateItem.mutateAsync({ itemId, servings })
  }

  async function handleReplace(itemId: string, recipeId: string) {
    await updateItem.mutateAsync({ itemId, recipeId, cookedAt: null })
  }

  async function handleCopyList() {
    if (!plan) return
    const text = buildShoppingList(plan.items)
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Boodschappenlijst gekopieerd.')
    } catch {
      toast.error('Kopiëren mislukt, gebruik de tekst hieronder.')
    }
  }

  const usedCategoryIds = new Set(plan?.items.map((i) => i.recipe.categoryId) ?? [])
  const upcomingCategories = rotation
    ? sortCategoriesByRotation(rotation.filter((c) => c.recipeCount > 0 && !usedCategoryIds.has(c.id)))
    : []

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate(`/week/${getPreviousWeekStart(weekStart)}`)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <h1 className="text-xl font-semibold">{formatWeekLabel(weekStart)}</h1>
                <Button variant="outline" size="icon" onClick={() => navigate(`/week/${getNextWeekStart(weekStart)}`)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              {!editable && <Badge variant="secondary">Alleen-lezen</Badge>}
            </div>
            {weekSubtitle && <p className="mt-0.5 text-sm text-muted-foreground">{weekSubtitle}</p>}
          </div>

          {editable && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-sky-50 px-3 py-2 mt-3">
              <span className="text-sm font-medium">Aantal recepten deze week</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDecrement}
                  disabled={deleteItem.isPending || generateWeek.isPending}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-5 text-center text-sm tabular-nums">{recipeCount}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleIncrement}
                  disabled={generateWeek.isPending}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

      {plan && (
        <Button onClick={handleCopyList} variant="secondary" className="w-fit bg-sky-200 py-5 px-3 -mt-5 mb-0">
          Boodschappenlijst kopiëren
        </Button>
      )}

        {planLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !plan ? (
          !editable && <p className="text-muted-foreground">Geen maaltijdplan voor deze week.</p>
        ) : (
          <div className="space-y-3">
            {plan.items.map((item) => (
              <Card key={item.id} className="my-5">
                <CardContent className="flex flex-col gap-3">
                  <div
                    className="flex cursor-pointer items-center gap-4"
                    onClick={() => navigate(`/recepten/${item.recipeId}`)}
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.recipe.photoPath && (
                        <img
                          src={getPhotoUrl(item.recipe.photoPath)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn('font-medium', item.cookedAt && 'line-through text-muted-foreground')}>
                        {item.recipe.name}
                      </span>
                      <div className="mt-1">
                        <Badge variant="secondary">{item.recipe.category.name}</Badge>
                      </div>
                    </div>
                  </div>
                  {editable && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Personen:</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => handleServingsChange(item.id, item.servings - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span>{item.servings}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => handleServingsChange(item.id, item.servings + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCookedToggle(item.id, !item.cookedAt)}
                          className={cn(
                            'border-dashed',
                            item.cookedAt &&
                              'border-solid border-green-600 bg-green-600/10 text-green-700 hover:bg-green-600/20 dark:text-green-400',
                          )}
                        >
                          {item.cookedAt && <Check className="size-3.5" />}
                          Gekookt
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setPickerOpenForItem(item.id)} title="Vervangen">
                          <Repeat className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteItem.mutate(item.id)}
                          title="Verwijderen"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Komende categorieën</h2>
        <div className="space-y-2">
          {upcomingCategories.slice(0, 6).map((category, index) => (
            <div
              key={category.id}
              className="rounded-lg border bg-card px-3 py-2 text-sm ring-1 ring-foreground/10"
              style={{ opacity: 1 - index * 0.17 }}
            >
              {category.name}
            </div>
          ))}
        </div>
      </div>

      {recipes && (
        <RecipePickerDialog
          open={!!pickerOpenForItem}
          onOpenChange={(open) => !open && setPickerOpenForItem(null)}
          recipes={recipes}
          rotation={rotation}
          selectedRecipeId={pickerOpenForItem ? plan?.items.find((i) => i.id === pickerOpenForItem)?.recipeId : null}
          excludeRecipeIds={plan?.items.map((i) => i.recipeId) ?? []}
          onSelect={(recipeId) => pickerOpenForItem && handleReplace(pickerOpenForItem, recipeId)}
        />
      )}
    </div>
  )
}

