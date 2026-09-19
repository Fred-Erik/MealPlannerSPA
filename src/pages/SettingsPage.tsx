import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const [recipesPerWeek, setRecipesPerWeek] = useState(3)
  const [servings, setServings] = useState(6)
  const [loadedSettings, setLoadedSettings] = useState(settings)

  // Sync local editable state once settings arrive, without a post-render effect.
  if (settings && settings !== loadedSettings) {
    setLoadedSettings(settings)
    setRecipesPerWeek(settings.defaultRecipesPerWeek)
    setServings(settings.defaultServings)
  }

  async function handleSave() {
    try {
      await updateSettings.mutateAsync({ defaultRecipesPerWeek: recipesPerWeek, defaultServings: servings })
      toast.success('Instellingen opgeslagen.')
    } catch {
      toast.error('Opslaan mislukt.')
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Instellingen</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Standaardwaarden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipesPerWeek">Recepten per week</Label>
            <Input
              id="recipesPerWeek"
              type="number"
              min={0}
              value={recipesPerWeek}
              onChange={(e) => setRecipesPerWeek(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Personen per recept</Label>
            <Input
              id="servings"
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
            />
          </div>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            Opslaan
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
