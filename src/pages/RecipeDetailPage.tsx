import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ExternalLink, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { getPhotoUrl } from '@/api/recipes'

function formatScaledQuantity(quantity: number): string {
  const rounded = Math.round(quantity * 100) / 100
  return rounded.toString()
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id)
  const deleteRecipe = useDeleteRecipe()
  const [servings, setServings] = useState<number | null>(null)

  if (isLoading || !recipe) {
    return <Skeleton className="h-96 w-full" />
  }

  const currentServings = servings ?? recipe.baseServings
  const scale = currentServings / recipe.baseServings

  async function handleDelete() {
    if (!id) return
    try {
      await deleteRecipe.mutateAsync(id)
      toast.success('Recept verwijderd.')
      navigate('/recepten')
    } catch {
      toast.error('Verwijderen mislukt.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{recipe.name}</h1>
          <Badge variant="secondary" className="mt-1">
            {recipe.category.name}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={
              <Link to={`/recepten/${id}/bewerken`}>
                <Pencil className="mr-1 size-4" /> Bewerken
              </Link>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline"><Trash2 className="size-4" /></Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Recept verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dit kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Verwijderen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {recipe.photoPath && (
        <img
          src={getPhotoUrl(recipe.photoPath)}
          alt=""
          className="max-h-80 w-full rounded-lg object-cover"
        />
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="size-4" /> Origineel recept
          </a>
        )}
        <span>
          {recipe.lastCookedAt ? `Laatst gekookt: ${recipe.lastCookedAt}` : 'Nog niet gekookt'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Personen</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setServings(Math.max(1, currentServings - 1))}
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-6 text-center">{currentServings}</span>
          <Button variant="outline" size="icon" onClick={() => setServings(currentServings + 1)}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Ingrediënten</h2>
        <ul className="space-y-1">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              {ingredient.quantity !== null &&
                `${formatScaledQuantity(ingredient.quantity * scale)} `}
              {ingredient.unit && `${ingredient.unit} `}
              {ingredient.name}
            </li>
          ))}
        </ul>
      </div>

      {recipe.instructions && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Bereiding</h2>
          <ol className="list-decimal space-y-2 pl-5">
            {recipe.instructions.split('\n').map((paragraph, index) => (
              <li key={index}>{paragraph}</li>
            ))}
          </ol>
        </div>
      )}

      {recipe.notes && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Notities</h2>
          <p className="whitespace-pre-wrap">{recipe.notes}</p>
        </div>
      )}
    </div>
  )
}
