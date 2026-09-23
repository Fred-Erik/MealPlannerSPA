import { useState } from 'react'
import { Link } from 'react-router'
import { GripVertical, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import {
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
  useReorderCategories,
  useRotation,
} from '@/hooks/useCategories'
import { sortCategoriesByRotation } from '@/lib/rotation'
import { toDutchErrorMessage } from '@/lib/errors'
import type { CategoryRotation } from '@/types/domain'

export function CategoriesPage() {
  const { data: rotation, isLoading } = useRotation()
  const createCategory = useCreateCategory()
  const renameCategory = useRenameCategory()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const categories = rotation ?? []
  const ordered = sortCategoriesByRotation(categories)
  const positionById = new Map(
    sortCategoriesByRotation(categories.filter((c) => c.recipeCount > 0)).map((c, i) => [c.id, i + 1]),
  )
  const query = search.trim().toLowerCase()
  const filtered = query ? ordered.filter((c) => c.name.toLowerCase().includes(query)) : ordered
  const isFiltering = query.length > 0
  const pendingDelete = categories.find((c) => c.id === pendingDeleteId)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ordered.findIndex((c) => c.id === active.id)
    const newIndex = ordered.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(ordered, oldIndex, newIndex)
    reorderCategories.mutate(newOrder.map((c) => c.id))
  }


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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek categorie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

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
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen categorieën gevonden.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filtered.map((category) => (
                <SortableCategoryRow
                  key={category.id}
                  category={category}
                  disabled={isFiltering}
                  position={positionById.get(category.id) ?? null}
                  editing={editingId === category.id}
                  editingName={editingName}
                  onEditingNameChange={setEditingName}
                  onStartEdit={() => {
                    setEditingId(category.id)
                    setEditingName(category.name)
                  }}
                  onRename={() => handleRename(category.id)}
                  onDelete={() => setPendingDeleteId(category.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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

interface SortableCategoryRowProps {
  category: CategoryRotation
  disabled: boolean
  position: number | null
  editing: boolean
  editingName: string
  onEditingNameChange: (name: string) => void
  onStartEdit: () => void
  onRename: () => void
  onDelete: () => void
}

function SortableCategoryRow({
  category,
  disabled,
  position,
  editing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onRename,
  onDelete,
}: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : undefined}>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="touch-none text-muted-foreground disabled:cursor-not-allowed disabled:opacity-30"
            disabled={disabled}
            title="Sleep om volgorde aan te passen"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          {editing ? (
            <Input
              autoFocus
              value={editingName}
              onChange={(e) => onEditingNameChange(e.target.value)}
              onBlur={onRename}
              onKeyDown={(e) => e.key === 'Enter' && onRename()}
              className="max-w-xs"
            />
          ) : (
            <button type="button" className="text-left font-medium hover:underline" onClick={onStartEdit}>
              {category.name}
            </button>
          )}
        </div>
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
          {position !== null ? <span>Positie {position} in rotatie</span> : <span>Niet in rotatie</span>}
          <Button variant="ghost" size="icon" onClick={onDelete} title="Verwijderen">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
