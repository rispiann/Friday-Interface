import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Cek apakah ada tanda 'isLoggedIn' di localStorage
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  // Jika sudah login, tampilkan halaman yang diminta (menggunakan <Outlet />)
  // Jika belum, alihkan ke halaman /login (menggunakan <Navigate />)
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
