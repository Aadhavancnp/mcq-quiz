import "./App.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/login/Login";
import MCQTest from "./pages/mcq/MCQTest";

function AppContent() {
  const { isAuthenticated } = useAuth();
  return <>{!isAuthenticated ? <Login /> : <MCQTest />}</>;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
