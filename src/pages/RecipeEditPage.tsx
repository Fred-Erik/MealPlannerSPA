import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories } from '@/hooks/useCategories'
import { useRecipe, useSaveRecipe } from '@/hooks/useRecipes'
import { getPhotoUrl, uploadPhoto } from '@/api/recipes'
import { toDutchErrorMessage } from '@/lib/errors'

const ingredientSchema = z.object({
  quantity: z.string(),
  unit: z.string(),
  name: z.string().min(1, 'Naam is verplicht'),
})

const recipeSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht'),
  categoryId: z.string().min(1, 'Kies een categorie'),
  baseServings: z.coerce.number().int().positive(),
  instructions: z.string(),
  sourceUrl: z.string(),
  notes: z.string(),
  lastCookedAt: z.string(),
  ingredients: z.array(ingredientSchema),
})

type RecipeFormInput = z.input<typeof recipeSchema>
type RecipeFormOutput = z.output<typeof recipeSchema>

const emptyIngredient = { quantity: '', unit: '', name: '' }

type ExistingRecipe = NonNullable<ReturnType<typeof useRecipe>['data']>
type Categories = ReturnType<typeof useCategories>['data']

export function RecipeEditPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const { data: categories } = useCategories()
  const { data: existingRecipe, isLoading } = useRecipe(id)

  if (isEditing && isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  // Remount per recipe so the form only ever needs to initialize once, from already-loaded data.
  return <RecipeForm key={id ?? 'new'} id={id} categories={categories} existingRecipe={existingRecipe} />
}

function RecipeForm({
  id,
  categories,
  existingRecipe,
}: {
  id: string | undefined
  categories: Categories
  existingRecipe: ExistingRecipe | undefined
}) {
  const isEditing = !!id
  const navigate = useNavigate()
  const saveRecipe = useSaveRecipe()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    existingRecipe?.photoPath ? getPhotoUrl(existingRecipe.photoPath) : null
  )
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeFormInput, unknown, RecipeFormOutput>({
    resolver: zodResolver(recipeSchema),
    defaultValues: existingRecipe
      ? {
          name: existingRecipe.name,
          categoryId: existingRecipe.category.id,
          baseServings: existingRecipe.baseServings,
          instructions: existingRecipe.instructions ?? '',
          sourceUrl: existingRecipe.sourceUrl ?? '',
          notes: existingRecipe.notes ?? '',
          lastCookedAt: existingRecipe.lastCookedAt ?? '',
          ingredients: existingRecipe.ingredients.length
            ? existingRecipe.ingredients.map((i) => ({
                quantity: i.quantity !== null ? String(i.quantity) : '',
                unit: i.unit ?? '',
                name: i.name,
              }))
            : [emptyIngredient],
        }
      : {
          name: '',
          categoryId: '',
          baseServings: 6,
          instructions: '',
          sourceUrl: '',
          notes: '',
          lastCookedAt: '',
          ingredients: [emptyIngredient],
        },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function onSubmit(values: RecipeFormOutput) {
    setSubmitting(true)
    try {
      let photoPath = existingRecipe?.photoPath ?? null
      const recipeId = id ?? crypto.randomUUID()
      if (photoFile) {
        photoPath = await uploadPhoto(recipeId, photoFile)
      }

      await saveRecipe.mutateAsync({
        id,
        categoryId: values.categoryId,
        name: values.name,
        baseServings: values.baseServings,
        instructions: values.instructions || null,
        sourceUrl: values.sourceUrl || null,
        notes: values.notes || null,
        photoPath,
        lastCookedAt: values.lastCookedAt || null,
        ingredients: values.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            quantity: i.quantity.trim() ? Number(i.quantity) : null,
            unit: i.unit.trim() || null,
            name: i.name.trim(),
          })),
      })
      toast.success('Recept opgeslagen.')
      navigate(id ? `/recepten/${id}` : '/recepten')
    } catch (error) {
      toast.error(toDutchErrorMessage(error as { code?: string; message?: string }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{isEditing ? 'Recept bewerken' : 'Nieuw recept'}</h1>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="name">Naam</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categorie</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies categorie">
                      {(value: string | null) => categories?.find((category) => category.id === value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseServings">Aantal personen (basis)</Label>
            <Input id="baseServings" type="number" min={1} {...register('baseServings')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="photo">Foto</Label>
          {photoPreview && (
            <img src={photoPreview} alt="" className="mb-2 max-h-48 rounded-lg object-cover" />
          )}
          <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ingrediënten</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(emptyIngredient)}
            >
              <Plus className="mr-1 size-4" /> Regel toevoegen
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  placeholder="Hoeveelheid"
                  className="w-28"
                  {...register(`ingredients.${index}.quantity`)}
                />
                <Input placeholder="Eenheid" className="w-28" {...register(`ingredients.${index}.unit`)} />
                <Input placeholder="Naam" className="flex-1" {...register(`ingredients.${index}.name`)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Bereidingswijze</Label>
          <Textarea id="instructions" rows={6} {...register('instructions')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Link naar origineel recept</Label>
            <Input id="sourceUrl" type="url" {...register('sourceUrl')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastCookedAt">Laatst gekookt</Label>
            <Input id="lastCookedAt" type="date" {...register('lastCookedAt')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notities</Label>
          <Textarea id="notes" rows={3} {...register('notes')} />
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Bezig…' : 'Opslaan'}
        </Button>
      </form>
    </div>
  )
}
