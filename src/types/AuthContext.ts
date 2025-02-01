import {User} from "@/types/User.ts";

export interface AuthContextType {
    user: User | null
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string, name: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    checkAuthStatus: () => Promise<void>;
    logout: () => void;
}
