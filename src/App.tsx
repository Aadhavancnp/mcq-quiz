import "./App.css";
import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "./auth/AuthContext";
import Login from "./pages/login/Login";
import SearchPage from "./pages/search/search";
import MCQTest from "./pages/mcq/MCQTest";
import Register from "./pages/register/register";
import ForgotPassword from "./pages/forgot-password/ForgotPassword";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" /> : <ForgotPassword />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <MCQTest /> : <Navigate to="/login" />}
      />
      <Route
        path="/search"
        element={isAuthenticated ? <SearchPage /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

export default App;
