import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

export default function ProtectedRoute() {
  const { isAuthenticated, loading, currentUser } = useApp();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}
