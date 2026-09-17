import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Blocks access to app pages when the user is not logged in.
export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
