import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Friends from "./pages/Friends";
import SearchUsers from "./pages/SearchUsers";
import Profile from "./pages/Profile";

import { useAuthStore } from "./store/authStore";

function App() {
  const { user } = useAuthStore();

  // Component bảo vệ route
  const PrivateRoute = ({ children }) => {
    return user ? children : <Navigate to="/login" />;
  };

  // Component chặn khi đã login
  const PublicRoute = ({ children }) => {
    return !user ? children : <Navigate to="/chat" />;
  };

  return (
    <BrowserRouter>
      <Toaster position="top-center" />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Private Routes */}
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />

        <Route
          path="/friends"
          element={
            <PrivateRoute>
              <Friends />
            </PrivateRoute>
          }
        />

        <Route
          path="/search"
          element={
            <PrivateRoute>
              <SearchUsers />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to={user ? "/chat" : "/login"} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;