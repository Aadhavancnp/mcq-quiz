import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const { resetPassword } = useAuth();

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email");
      return;
    }
    try {
      await resetPassword(email);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex items-center flex-col justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">MCQ Test</h1>
      <form
        onSubmit={handleAuthentication}
        className="p-8 bg-white rounded-lg shadow-md space-y-4 w-full max-w-md"
      >
        <h2 className="mb-2 text-2xl font-bold">Reset Password</h2>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          placeholder="Enter your Authorized email"
          required
        />
        <Button type="submit" className="w-full">
          Reset Password
        </Button>
        <Button
          type="button"
          onClick={() => navigate("/login")}
          className="w-full"
        >
          Login
        </Button>
      </form>
    </div>
  );
};

export default ForgotPassword;
