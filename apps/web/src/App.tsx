import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppLayout } from './components/layout/AppLayout';
import { RoleGuard } from './components/layout/RoleGuard';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { IssueItemsPage } from './pages/IssueItemsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { RenewalsPage } from './pages/RenewalsPage';
import { StudentsPage } from './pages/StudentsPage';
import { AssetsPage } from './pages/AssetsPage';
import { StockHistoryPage } from './pages/StockHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { StudentCatalogPage } from './pages/StudentCatalogPage';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isStudent, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isStudent) return <Navigate to="/student/portal" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Root */}
            <Route path="/" element={<RootRedirect />} />

            {/* Coordinator & Admin Operations */}
            <Route element={<RoleGuard allowedRoles={['coordinator', 'admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/issue-items" element={<IssueItemsPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
                <Route path="/renewals" element={<RenewalsPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/stock-history" element={<StockHistoryPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
              </Route>
            </Route>

            {/* Student Portal & Catalog */}
            <Route element={<RoleGuard allowedRoles={['student']} />}>
              <Route element={<AppLayout />}>
                <Route path="/student/portal" element={<StudentPortalPage />} />
                <Route path="/student/catalog" element={<StudentCatalogPage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
