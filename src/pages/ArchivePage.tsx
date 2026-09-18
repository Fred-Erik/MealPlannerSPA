import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useArchive, useMealPlan } from '@/hooks/useMealPlan'
import { getCurrentWeekStart, formatWeekLabel } from '@/lib/week'

function ArchivedWeek({ weekStart }: { weekStart: string }) {
  const { data: plan, isLoading } = useMealPlan(weekStart)

  if (isLoading) return <Skeleton className="h-24 w-full" />
  if (!plan || plan.items.length === 0) return null

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <h3 className="font-medium">{formatWeekLabel(weekStart)}</h3>
        <ul className="space-y-1 text-sm">
          {plan.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <Link to={`/recepten/${item.recipe.id}`} className="hover:underline">
                {item.recipe.name}
              </Link>
              <Badge variant="secondary">{item.recipe.category.name}</Badge>
              {item.cookedAt ? (
                <span className="text-xs text-muted-foreground">Gekookt op {item.cookedAt}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Niet gekookt</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function ArchivePage() {
  const [currentWeekStart] = useState(getCurrentWeekStart())
  const { data: weeks, isLoading } = useArchive(currentWeekStart)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Archief</h1>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : weeks && weeks.length > 0 ? (
        <div className="space-y-3">
          {weeks.map((week) => (
            <ArchivedWeek key={week.id} weekStart={week.weekStart} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Nog geen eerdere weken.</p>
      )}
    </div>
  )
}
