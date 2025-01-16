import { AuthContextType } from "@/types/AuthContext";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useNavigate } from "react-router";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error("Failed to validate user session:", err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const existingUser = await db.users
        .findOne({
          selector: {
            email,
          },
        })
        .exec();

      if (!existingUser) {
        throw new Error("User not found.");
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        existingUser.password
      );
      if (!isPasswordValid) {
        throw new Error("Invalid email or password.");
      }

      // Save user to localStorage for session persistence
      const { password: _, ...userWithoutPassword } = existingUser._data;

      localStorage.setItem("authUser", JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      setIsAuthenticated(true);
      navigate("/search");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const existingUser = await db.users
        .findOne({
          selector: {
            email,
          },
        })
        .exec();

      if (existingUser) {
        throw new Error("User already exists.");
      }

      await db.users.insert({
        email,
        password: hashedPassword,
        name,
      });

      // Auto-login after registration
      await login(email, password);
    } catch (error) {
      console.error("Registration failed:", error);
      throw new Error("Registration failed. Please try again.");
    }
  };

  const logout = () => {
    localStorage.removeItem("authUser");
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login");
  };

  const resetPassword = async (email: string) => {
    try {
      const user = await db.users
        .findOne({
          selector: {
            email,
          },
        })
        .exec();
      if (!user) {
        throw new Error("User not found.");
      }

      // Implement email service to send a reset link or code here
      console.log(`Reset link for ${email} has been sent.`);
    } catch (error) {
      console.error("Password reset failed:", error);
      throw new Error("Password reset request failed.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        isLoading,
        register,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
