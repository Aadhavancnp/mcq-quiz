import "./App.css";
import { Routes, Route, Navigate } from "react-router";
import Login from "./pages/login/Login";
import SearchPage from "./pages/search/search";
import MCQTest from "./pages/mcq/MCQTest";
import Register from "./pages/register/register";
import ForgotPassword from "./pages/forgot-password/ForgotPassword";
import CameraCheck from "./pages/camera-check/cameraCheck";

function App() {
  const isAuthenticated = localStorage.getItem("authUser") !== null;
  return (
    <Routes>
        <Route path="/" element={isAuthenticated ? <SearchPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/camera-check" element={<CameraCheck />} />
        <Route path="/quiz" element={isAuthenticated ? <MCQTest /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
