import "./App.css";
import {Routes, Route, Navigate} from "react-router";
import Login from "./pages/login/Login";
import MCQTest from "./pages/mcq/MCQTest";
import Register from "./pages/register/register";
import ForgotPassword from "./pages/forgot-password/ForgotPassword";
import {useAuth} from "@/auth/AuthContext.tsx";
import Startup from "@/pages/start/startup.tsx";
import AdminDashboard from "@/pages/admin-dashboard/AdminDashboard.tsx";
import CameraCheck from "@/pages/camera-check/cameraCheck.tsx";
import ViewQuiz from "@/pages/view/viewQuiz.tsx";

function App() {
    const {isAuthenticated, isLoading, user} = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }
    return (
        <Routes>
            <Route
                path="/"
                element={
                    isAuthenticated ? (
                        user?.role === "admin" ? (
                            <Navigate to="/admin" replace/>
                        ) : (
                            <Navigate to="/startup" replace/>
                        )
                    ) : (
                        <Navigate to="/login" replace/>
                    )
                }
            />
            <Route
                path="/startup"
                element={isAuthenticated ? <Startup/> : <Navigate to="/login" replace/>}
            />
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace/> : <Login/>}
            />
            <Route
                path="/register"
                element={isAuthenticated ? <Navigate to="/" replace/> : <Register/>}
            />
            <Route
                path="/forgot-password"
                element={isAuthenticated ? <Navigate to="/" replace/> : <ForgotPassword/>}
            />
            <Route
                path="/camera-check"
                element={isAuthenticated ? <CameraCheck/> : <Navigate to="/login" replace/>}
            />
            <Route
                path="/quiz/:quizCode"
                element={isAuthenticated ? <MCQTest/> : <Navigate to="/login" replace/>}
            />
            {isAuthenticated && user?.role === "admin" ? (
                <>
                    <Route path="/admin" element={<AdminDashboard/>}/>
                    <Route path="/view/:quizCode" element={<ViewQuiz/>}/>
                </>
            ) : (
                <Route path="/admin" element={<Navigate to="/login" replace/>}/>
            )}
        </Routes>
    );
}

export default App;
