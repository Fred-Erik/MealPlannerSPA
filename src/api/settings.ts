import { supabase } from '@/supabaseClient'
import type { Settings } from '@/types/domain'

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .select('default_recipes_per_week, default_servings')
    .eq('id', 1)
    .single()
  if (error) throw error
  return { defaultRecipesPerWeek: data.default_recipes_per_week, defaultServings: data.default_servings }
}

export async function updateSettings(settings: Settings): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({
      default_recipes_per_week: settings.defaultRecipesPerWeek,
      default_servings: settings.defaultServings,
    })
    .eq('id', 1)
  if (error) throw error
}
