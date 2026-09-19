import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateCategory, useDeleteCategory, useRenameCategory, useRotation } from '@/hooks/useCategories'
import { sortCategoriesByRotation } from '@/lib/rotation'
import { toDutchErrorMessage } from '@/lib/errors'

export function CategoriesPage() {
  const { data: rotation, isLoading } = useRotation()
  const createCategory = useCreateCategory()
  const renameCategory = useRenameCategory()
  const deleteCategory = useDeleteCategory()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const categories = rotation ?? []
  const eligibleOrder = sortCategoriesByRotation(categories.filter((c) => c.recipeCount > 0))
  const positionById = new Map(eligibleOrder.map((c, i) => [c.id, i + 1]))
  const byName = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'nl'))
  const pendingDelete = categories.find((c) => c.id === pendingDeleteId)

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    try {
      await createCategory.mutateAsync(name)
      setNewName('')
    } catch (error) {
      toast.error(toDutchErrorMessage(error as { code?: string; message?: string }))
    }
  }

  async function handleRename(id: string) {
    const name = editingName.trim()
    if (!name) return
    try {
      await renameCategory.mutateAsync({ id, name })
      setEditingId(null)
    } catch (error) {
      toast.error(toDutchErrorMessage(error as { code?: string; message?: string }))
    }
  }

  async function handleDelete() {
    if (!pendingDeleteId) return
    try {
      await deleteCategory.mutateAsync(pendingDeleteId)
      setPendingDeleteId(null)
    } catch (error) {
      toast.error(toDutchErrorMessage(error as { code?: string; message?: string }))
      setPendingDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Categorieën</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nieuwe categorie</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Naam"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={createCategory.isPending}>
            <Plus className="mr-1 size-4" /> Toevoegen
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {byName.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                {editingId === category.id ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleRename(category.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(category.id)}
                    className="max-w-xs"
                  />
                ) : (
                  <button
                    type="button"
                    className="text-left font-medium hover:underline"
                    onClick={() => {
                      setEditingId(category.id)
                      setEditingName(category.name)
                    }}
                  >
                    {category.name}
                  </button>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {category.recipeCount > 0 ? (
                    <Link to={`/recepten?categorie=${category.id}`} className="hover:underline">
                      {category.recipeCount} {category.recipeCount === 1 ? 'recept' : 'recepten'}
                    </Link>
                  ) : (
                    <span>
                      {category.recipeCount} {category.recipeCount === 1 ? 'recept' : 'recepten'}
                    </span>
                  )}
                  {positionById.has(category.id) ? (
                    <span>Positie {positionById.get(category.id)} in rotatie</span>
                  ) : (
                    <span>Niet in rotatie</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDeleteId(category.id)}
                    title="Verwijderen"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Categorie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.recipeCount > 0
                ? `Deze categorie bevat nog ${pendingDelete.recipeCount} recept(en) en kan niet verwijderd worden. Verplaats of verwijder eerst de recepten.`
                : `Weet je zeker dat je "${pendingDelete?.name}" wilt verwijderen?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            {pendingDelete && pendingDelete.recipeCount === 0 && (
              <AlertDialogAction onClick={handleDelete}>Verwijderen</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
