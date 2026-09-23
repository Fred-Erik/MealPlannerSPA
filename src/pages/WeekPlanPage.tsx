import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  const [loadedSettings, setLoadedSettings] = useState(settings)

  // Sync pending count once settings arrive, without a post-render effect.
  if (settings && settings !== loadedSettings) {
    setLoadedSettings(settings)
    setPendingCount(settings.defaultRecipesPerWeek)
  }

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
    await updateItem.mutateAsync({ itemId, cookedAt: checked ? weekStart : null })
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {editable && (
            <div className="flex flex-1 items-center justify-between gap-3 rounded-lg bg-sky-50 px-3" style={{ paddingBottom: '6.5px', paddingTop: '6.5px' }}>
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

          {plan && (
            <Button onClick={handleCopyList} variant="secondary" className="w-full sm:w-fit bg-sky-200 py-5 px-3">
              Boodschappenlijst kopiëren
            </Button>
          )}
        </div>

        {planLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !plan ? (
          !editable && <p className="text-muted-foreground">Geen maaltijdplan voor deze week.</p>
        ) : (
          <div className="space-y-3">
            {plan.items.map((item) => (
              <Card key={item.id} className="my-5 overflow-hidden py-0">
                <div
                  className="relative aspect-video w-full overflow-hidden cursor-pointer bg-muted"
                  onClick={() => navigate(`/recepten/${item.recipeId}`)}
                >
                  {item.recipe.photoPath && (
                    <img
                      src={getPhotoUrl(item.recipe.photoPath)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  <Badge variant="secondary" className="absolute right-2 top-2">
                    {item.recipe.category.name}
                  </Badge>
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-3 pb-3 pt-15">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('font-medium text-white', item.cookedAt && 'line-through text-white/70')}>
                        {item.recipe.name}
                      </span>
                      {!editable && (
                        <Button
                          type="button"
                          variant="outline"
                          size={item.cookedAt ? "sm" : "icon"}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCookedToggle(item.id, !item.cookedAt)
                          }}
                          className={cn(
                            'shrink-0 py-4 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white',
                            item.cookedAt &&
                              'border-solid border-green-500 bg-green-600/30 text-green-100 hover:bg-green-600/40',
                          )}
                        >
                          <Check className="size-3.5" />
                          {item.cookedAt && "Gekookt" }
                        </Button>
                      )}
                    </div>
                    {editable && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-2 text-sm text-white/90"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Personen:</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-white hover:bg-white/20 hover:text-white"
                            onClick={() => handleServingsChange(item.id, item.servings - 1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span>{item.servings}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-white hover:bg-white/20 hover:text-white"
                            onClick={() => handleServingsChange(item.id, item.servings + 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                            onClick={() => setPickerOpenForItem(item.id)}
                            title="Vervangen"
                          >
                            <Repeat className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size={item.cookedAt ? "sm" : "icon"}
                            onClick={() => handleCookedToggle(item.id, !item.cookedAt)}
                            className={cn(
                              'py-4 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white',
                              item.cookedAt &&
                                'border-solid border-green-500 bg-green-600/30 text-green-100 hover:bg-green-600/40',
                            )}
                          >
                            <Check className="size-3.5" />
                            {item.cookedAt && "Gekookt" }
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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

