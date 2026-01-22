import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LoadingSpinner } from "../components/PredictionDashboard";
import { useAuth } from "../auth/AuthContext";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      await signUp(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
      });

      setSuccess(
        "Account created successfully! Please check your email to verify your account."
      );
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 font-['Poppins']">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl shadow-black/40 border border-border">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="mt-2 text-sm text-text-muted">
            Join the Blue Banner Engine
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400 border border-green-500/20 text-center">
              {success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-muted ml-1">
                First Name
              </label>
              <input
                name="firstName"
                type="text"
                className="w-full rounded-lg bg-background px-4 py-3 text-white placeholder-text-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/80 border border-border hover:border-accent/50"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-muted ml-1">
                Last Name
              </label>
              <input
                name="lastName"
                type="text"
                className="w-full rounded-lg bg-background px-4 py-3 text-white placeholder-text-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/80 border border-border hover:border-accent/50"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted ml-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg bg-background px-4 py-3 text-white placeholder-text-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/80 border border-border hover:border-accent/50"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted ml-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg bg-background px-4 py-3 text-white placeholder-text-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/80 border border-border hover:border-accent/50"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted ml-1">
              Confirm Password
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg bg-background px-4 py-3 text-white placeholder-text-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/80 border border-border hover:border-accent/50"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center w-full rounded-lg bg-accent py-3 font-semibold text-background transition-all hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isLoading ? <LoadingSpinner /> : "Create Account"}
          </button>

          <div className="text-center mt-4">
            <p className="text-sm text-text-muted">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-accent hover:text-accent/80 font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
