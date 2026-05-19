import { useState } from "react";
import { Link } from "react-router-dom";
import { IoEye, IoEyeOff, IoPersonAdd } from "react-icons/io5";
import useAuthStore from "../../store/useAuthStore";

/**
 * Signup page with WhatsApp-inspired design.
 */
const SignupPage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return; // Toast handled by store or inline
    }
    await register({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
    });
  };

  const passwordsMatch = formData.password === formData.confirmPassword || formData.confirmPassword === "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-whatsapp-600 to-teal-700 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl mb-4 shadow-lg">
            <IoPersonAdd className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white text-shadow">Create Account</h1>
          <p className="text-white/80 mt-2">Join WhatsApp and start chatting</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 dark:bg-dark-2/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-4 bg-gray-50 dark:bg-dark-3 text-gray-900 dark:text-white placeholder:text-gray-400 input-focus"
                required
                minLength={2}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-4 bg-gray-50 dark:bg-dark-3 text-gray-900 dark:text-white placeholder:text-gray-400 input-focus"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-4 bg-gray-50 dark:bg-dark-3 text-gray-900 dark:text-white placeholder:text-gray-400 input-focus pr-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <IoEyeOff className="w-5 h-5" /> : <IoEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-dark-3 text-gray-900 dark:text-white placeholder:text-gray-400 input-focus ${
                  !passwordsMatch
                    ? "border-red-400 focus:ring-red-400/30"
                    : "border-gray-200 dark:border-dark-4"
                }`}
                required
              />
              {!passwordsMatch && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={isLoading || !passwordsMatch}
              className="w-full py-3 bg-gradient-to-r from-whatsapp-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-whatsapp-700 hover:to-emerald-600 focus:outline-none focus:ring-4 focus:ring-whatsapp-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-whatsapp-500/25 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-whatsapp-600 hover:text-whatsapp-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
