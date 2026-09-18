import { addDays, format, startOfISOWeek } from 'date-fns'
import { nl } from 'date-fns/locale'

/** Returns the ISO date string (yyyy-MM-dd) for the Monday of the week containing `date`. */
export function getISOWeekStart(date: Date): string {
  return format(startOfISOWeek(date), 'yyyy-MM-dd')
}

export function getCurrentWeekStart(): string {
  return getISOWeekStart(new Date())
}

export function getNextWeekStart(weekStart: string): string {
  return format(addDays(new Date(`${weekStart}T00:00:00`), 7), 'yyyy-MM-dd')
}

export function getPreviousWeekStart(weekStart: string): string {
  return format(addDays(new Date(`${weekStart}T00:00:00`), -7), 'yyyy-MM-dd')
}

export function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = addDays(start, 6)
  const weekNumber = format(start, 'I', { locale: nl })
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = format(start, sameMonth ? 'd' : 'd MMM', { locale: nl })
  const endLabel = format(end, 'd MMM', { locale: nl })
  return `Week ${weekNumber} · ${startLabel}–${endLabel}`
}

/** Only the current and next ISO week are editable; earlier/later weeks are read-only. */
export function isEditableWeek(weekStart: string): boolean {
  const currentWeekStart = getCurrentWeekStart()
  const nextWeekStart = getNextWeekStart(currentWeekStart)
  return weekStart === currentWeekStart || weekStart === nextWeekStart
}
