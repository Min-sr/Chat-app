
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email đã xác thực! Bạn có thể đăng nhập.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) navigate("/chat");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center"
      style={{
        backgroundImage:
          `url(${bg})`,
      }}
    >
      {/* Glass container */}
      <div
        className="
        w-full max-w-md
        bg-white/5
        backdrop-blur-xl
        border border-white/20
        shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]
        hover:shadow-[0_10px_40px_0_rgba(31,38,135,0.6)]
        hover:border-white/60
        rounded-2xl
        p-10
        text-white
        transition-all duration-300
      "
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <img
              src={logo}
              alt="logo"
              className="w-32 h-32 object-contain"
            />
          </div>

          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-white/80 mt-1">Login to connect with your friends</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Email"
              className="
              w-full px-4 py-3 rounded-xl
              bg-transparent
              border border-white/30
              text-white
              placeholder-white/60
              transition-all duration-300
              focus:outline-none
              focus:border-white
              focus:bg-white/20
              hover:border-white/60
              "
            />
          </div>

          {/* Password */}
          <div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Password"
              className="
              w-full px-4 py-3 rounded-xl
              bg-transparent
              border border-white/30
              text-white
              placeholder-white/60
              transition-all duration-300
              focus:outline-none
              focus:border-white
              focus:bg-white/20
              hover:border-white/60
              "
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold
            bg-gradient-to-r from-blue-500 to-indigo-600
            text-white
            shadow-lg
            hover:scale-105
            transition
            disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Register */}
        <p className="mt-6 text-center text-white/80">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-white font-semibold hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
