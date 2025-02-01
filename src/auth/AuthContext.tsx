import {AuthContextType} from "@/types/AuthContext";
import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
} from "react";
import {User} from "@/types/User.ts";
import {jwtDecode} from "jwt-decode";
import axios from "axios";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
                                                                    children,
                                                                }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const userData = jwtDecode<User>(token);

            setUser(userData);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, [])

    const login = async (email: string, password: string) => {
        try {
            const response = await axios.post("http://127.0.0.1:5000/api/login", {email, password})
            const {token} = response.data
            localStorage.setItem("token", token)
            const decodedToken = jwtDecode<User>(token)
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
            setUser(decodedToken)
            setIsAuthenticated(true)
        } catch (error: any) {
            console.error("Login failed:", error)
            throw error.response.data
        }
    }

    const register = async (email: string, password: string, name: string) => {
        try {
            await axios.post("http://127.0.0.1:5000/api/register", {email, password, name})
            await login(email, password)
        } catch (error: any) {
            console.error("Registration failed:", error)
            throw error.response.data
        }
    };

    const logout = () => {
        localStorage.removeItem("token")
        delete axios.defaults.headers.common["Authorization"]
        setUser(null)
        setIsAuthenticated(false)
    };

    const resetPassword = async (email: string) => {
        try {
            // await axios.post("http://127.0.0.1:5000/api/reset-password", {email});
            console.log("Password reset request sent.", email);
        } catch (error) {
            console.error("Password reset failed:", error);
            throw new Error("Password reset request failed.");
        }
    };

    return <AuthContext.Provider
        value={{
            user,
            isAuthenticated,
            login,
            register,
            resetPassword,
            logout,
            checkAuthStatus,
            isLoading
        }}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
