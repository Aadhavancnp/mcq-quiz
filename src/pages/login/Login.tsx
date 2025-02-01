import {useAuth} from "@/auth/AuthContext";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useState} from "react";
import {useNavigate} from "react-router";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const {login} = useAuth();
    const navigate = useNavigate();

    const handleAuthentication = async (e: React.FormEvent) => {
        e.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email");
            return;
        }
        // if (password.length < 6) {
        //   alert("Password must be at least 6 characters long");
        //   return;
        // }
        try {
            await login(email, password);
        } catch (error: any) {
            alert(error.message ?? "Login failed");
        }
    };

    return (
        <div className="flex items-center flex-col justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">MCQ Test</h1>
            <form
                onSubmit={handleAuthentication}
                className="p-8 bg-white rounded-lg shadow-md space-y-4 w-full max-w-md"
            >
                <h2 className="mb-2 text-2xl font-bold">Login</h2>
                <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your Authorized email"
                    required
                />
                <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                />
                <Button type="submit" className="w-full">
                    Login
                </Button>
                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        onClick={() => navigate("/register")}
                        className="w-full"
                    >
                        Register
                    </Button>
                    <span className="w-2"></span>
                    <Button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="w-full"
                    >
                        Forgot Password
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Login;
