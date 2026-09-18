import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { WeekPlanPage } from '@/pages/WeekPlanPage'
import { ArchivePage } from '@/pages/ArchivePage'
import { RecipesPage } from '@/pages/RecipesPage'
import { RecipeDetailPage } from '@/pages/RecipeDetailPage'
import { RecipeEditPage } from '@/pages/RecipeEditPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  return (
    <HashRouter>
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
    </HashRouter>
  )
}

export default App

