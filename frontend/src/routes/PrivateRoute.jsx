import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const isAuthenticated = !!localStorage.getItem('token'); // Check if token exists

  return isAuthenticated ? <Outlet /> : <Navigate to="/profile" />;
};

export default PrivateRoute;
