import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginPage } from '@/pages/LoginPage'

const WeekPlanPage = lazy(() => import('@/pages/WeekPlanPage').then((m) => ({ default: m.WeekPlanPage })))
const ArchivePage = lazy(() => import('@/pages/ArchivePage').then((m) => ({ default: m.ArchivePage })))
const RecipesPage = lazy(() => import('@/pages/RecipesPage').then((m) => ({ default: m.RecipesPage })))
const RecipeDetailPage = lazy(() =>
  import('@/pages/RecipeDetailPage').then((m) => ({ default: m.RecipeDetailPage }))
)
const RecipeEditPage = lazy(() =>
  import('@/pages/RecipeEditPage').then((m) => ({ default: m.RecipeEditPage }))
)
const CategoriesPage = lazy(() =>
  import('@/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
)
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<Skeleton className="m-6 h-40 w-full" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/week" replace />} />
            <Route path="/week" element={<WeekPlanPage />} />
            <Route path="/week/:weekStart" element={<WeekPlanPage />} />
            <Route path="/archief" element={<ArchivePage />} />
            <Route path="/recepten" element={<RecipesPage />} />
            <Route path="/recepten/nieuw" element={<RecipeEditPage />} />
            <Route path="/recepten/:id" element={<RecipeDetailPage />} />
            <Route path="/recepten/:id/bewerken" element={<RecipeEditPage />} />
            <Route path="/categorieen" element={<CategoriesPage />} />
            <Route path="/instellingen" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/week" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App

