import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Minus, Plus, Repeat, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { RecipePickerDialog } from '@/components/week/RecipePickerDialog'
import { useMealPlan, useGenerateWeek, useUpdatePlanItem, useDeletePlanItem, useAddPlanItem } from '@/hooks/useMealPlan'
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

  const { data: plan, isLoading: planLoading } = useMealPlan(weekStart)
  const { data: rotation } = useRotation()
  const { data: recipes } = useRecipes()
  const { data: settings } = useSettings()

  const generateWeek = useGenerateWeek()
  const addItem = useAddPlanItem(weekStart)
  const updateItem = useUpdatePlanItem(weekStart)
  const deleteItem = useDeletePlanItem(weekStart)

  const [slotCount, setSlotCount] = useState(3)
  const [pickerOpenForItem, setPickerOpenForItem] = useState<string | null>(null)
  const [addPickerOpen, setAddPickerOpen] = useState(false)
  const [showList, setShowList] = useState(false)

  useEffect(() => {
    if (settings) setSlotCount(settings.defaultRecipesPerWeek)
  }, [settings])

  async function handleGenerate() {
    if (!rotation || !recipes || !settings) return
    try {
      await generateWeek.mutateAsync({
        weekStart,
        categories: rotation,
        recipes,
        slotCount,
        defaultServings: settings.defaultServings,
      })
    } catch {
      toast.error('Genereren mislukt.')
    }
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

  async function handleAdd(recipeId: string) {
    if (!plan || !settings) return
    await addItem.mutateAsync({
      mealPlanId: plan.id,
      recipeId,
      servings: settings.defaultServings,
      position: plan.items.length,
    })
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
    setShowList(true)
  }

  const upcomingCategories = rotation ? sortCategoriesByRotation(rotation.filter((c) => c.recipeCount > 0)) : []

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
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

        {planLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !plan ? (
          editable ? (
            <Card>
              <CardContent className="flex flex-col gap-4 py-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Aantal recepten deze week</span>
                  <Button variant="outline" size="icon" onClick={() => setSlotCount((n) => Math.max(0, n - 1))}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-6 text-center">{slotCount}</span>
                  <Button variant="outline" size="icon" onClick={() => setSlotCount((n) => n + 1)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <Button onClick={handleGenerate} disabled={generateWeek.isPending} className="w-fit">
                  Genereer suggesties
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground">Geen maaltijdplan voor deze week.</p>
          )
        ) : (
          <div className="space-y-3">
            {plan.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center gap-4">
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
                        <label className="flex items-center gap-1.5 text-sm">
                          <Checkbox
                            checked={!!item.cookedAt}
                            onCheckedChange={(checked) => handleCookedToggle(item.id, !!checked)}
                          />
                          Gekookt
                        </label>
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

            {editable && (
              <Button variant="outline" onClick={() => setAddPickerOpen(true)}>
                <Plus className="mr-1 size-4" /> Recept toevoegen
              </Button>
            )}

            <Button onClick={handleCopyList} variant="secondary">
              Boodschappenlijst kopiëren
            </Button>

            {showList && (
              <pre className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">
                {buildShoppingList(plan.items)}
              </pre>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Komende categorieën</h2>
        <ol className="space-y-1 text-sm">
          {upcomingCategories.map((category, index) => (
            <li key={category.id}>
              {index + 1}. {category.name}
            </li>
          ))}
        </ol>
      </div>

      {recipes && (
        <>
          <RecipePickerDialog
            open={!!pickerOpenForItem}
            onOpenChange={(open) => !open && setPickerOpenForItem(null)}
            recipes={recipes}
            excludeRecipeIds={plan?.items.map((i) => i.recipeId) ?? []}
            onSelect={(recipeId) => pickerOpenForItem && handleReplace(pickerOpenForItem, recipeId)}
          />
          <RecipePickerDialog
            open={addPickerOpen}
            onOpenChange={setAddPickerOpen}
            recipes={recipes}
            excludeRecipeIds={plan?.items.map((i) => i.recipeId) ?? []}
            onSelect={handleAdd}
          />
        </>
      )}
    </div>
  )
}
