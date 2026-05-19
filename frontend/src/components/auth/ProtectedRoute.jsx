import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

/**
 * Protected route wrapper — redirects to login if not authenticated.
 */
const ProtectedRoute = ({ children }) => {
  const { user, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-1">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
