import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    const success = await register(registerData);
    if (success) {
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
      navigate('/login');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center"
      style={{
        backgroundImage: `url(${bg})`,
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

          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-white/80 mt-1">Join Chat App today 🚀</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
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

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
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

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
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

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
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
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        {/* Login */}
        <p className="mt-6 text-center text-white/80">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-white font-semibold hover:underline"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}
