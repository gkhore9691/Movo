import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

export default function AdminRoute() {
  const { currentUser, isAuthenticated, loading } = useApp();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser?.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
