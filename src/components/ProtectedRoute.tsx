import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = () => {
  // Pastikan nama kunci ini SAMA PERSIS dengan yang Anda simpan saat login
  const token = localStorage.getItem('friday_access_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decodedToken: { exp: number } = jwtDecode(token);
    const isTokenExpired = decodedToken.exp * 1000 < Date.now();

    if (isTokenExpired) {
      localStorage.removeItem('friday_access_token');
      return <Navigate to="/login" replace />;
    }
  } catch (error) {
    localStorage.removeItem('friday_access_token');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
