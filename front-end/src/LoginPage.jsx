// src/LoginPage.jsx
import React, { useState } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaChartLine,
  FaBolt,
  FaUsers,
} from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from "./AuthContext";

const toolTitles = {
  "brand-monitoring": "Brand Monitoring",
  "threat-intelligence": "Threat Intelligence",
  "email-dlp": "Email DLP",
  "compliance-monitoring": "Compliance Monitoring",
  "cloud-configuration": "Cloud Configuration",
  grc: "Platform",
};

export default function LoginPage() {
  const { tool } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    email: "",
    first_name: "",
    last_name: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const toolLabel = toolTitles[tool] || tool;

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      email: "",
      first_name: "",
      last_name: "",
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.password) newErrors.password = "Password is required";

    if (isSignUp) {
      if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
      if (!formData.email) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email))
        newErrors.email = "Please enter a valid email";
      if (!formData.confirmPassword)
        newErrors.confirmPassword = "Please confirm your password";
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
      if (!formData.companyName.trim())
        newErrors.companyName = "Company Name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    const url = isSignUp ? "/api/accounts/signup/" : "/api/accounts/token/";

    const body = isSignUp
      ? JSON.stringify({
          username: formData.username,
          password: formData.password,
          password2: formData.confirmPassword,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          organization: formData.companyName,
        })
      : JSON.stringify({
          username: formData.username,
          password: formData.password,
        });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });

      const data = await response.json();
      if (!response.ok) {
        let errorMsg = "Something went wrong. Please try again.";
        if (data) {
          errorMsg = Object.entries(data)
            .map(
              ([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
            )
            .join("; ");
        }
        throw new Error(errorMsg);
      }

      if (isSignUp) {
        alert("Account created successfully! Please log in.");
        toggleMode();
      } else {
        login(data);
        navigate("/dashboard");
      }
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 inline-flex items-center px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        aria-label="Go Back"
      >
        <FaArrowLeft className="mr-2 text-gray-600" />
        <span className="text-gray-600 text-sm">Back</span>
      </button>

      {/* Left Column */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 lg:px-12">
        <div className="w-full max-w-md">
          {/* Logo & Heading */}
          <div className="text-center mb-10">
            <FaShieldAlt size={40} className="mx-auto text-teal-500 mb-4" />
            <h1 className="text-2xl font-semibold text-gray-800">
              Platform login&nbsp;:&nbsp;
              <span className="text-teal-600">{toolLabel}</span>
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-red-100 text-red-700 rounded">
                {errors.general}
              </div>
            )}

            {isSignUp && (
              <>
                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-teal-200"
                />
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-teal-200"
                />
                <input
                  type="text"
                  name="companyName"
                  placeholder="Company Name"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring ${
                    errors.companyName
                      ? "border-red-400 ring-red-100"
                      : "border-gray-300 ring-teal-200"
                  }`}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.companyName}
                  </p>
                )}
              </>
            )}

            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring ${
                errors.username
                  ? "border-red-400 ring-red-100"
                  : "border-gray-300 ring-teal-200"
              }`}
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}

            {isSignUp && (
              <>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring ${
                    errors.email
                      ? "border-red-400 ring-red-100"
                      : "border-gray-300 ring-teal-200"
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </>
            )}

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 pr-10 border rounded focus:outline-none focus:ring ${
                  errors.password
                    ? "border-red-400 ring-red-100"
                    : "border-gray-300 ring-teal-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {isSignUp && (
              <>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring ${
                    errors.confirmPassword
                      ? "border-red-400 ring-red-100"
                      : "border-gray-300 ring-teal-200"
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-2"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-teal-600 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded cursor-pointer text-white font-semibold transition ${
                isLoading
                  ? "bg-teal-300 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {isLoading ? "Please wait..." : isSignUp ? "Sign Up" : "Login"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={toggleMode}
                  className="text-teal-600 hover:underline cursor-pointer"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Don't have an account yet?{" "}
                <button
                  onClick={toggleMode}
                  className="text-teal-600 hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right Column */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center">
        <div className="space-y-8 px-12">
          <div className="text-center space-y-2">
            <FaShieldAlt size={48} className="text-teal-600 mx-auto" />
            <h2 className="text-3xl font-bold text-gray-800">
              Next-Gen&nbsp;
              <span className="text-teal-600">{toolLabel}</span>
            </h2>
            <p className="text-gray-600">Monitoring Platform</p>
            <p className="text-gray-500 max-w-xs mx-auto">
              Transform your regulatory compliance with AI-powered monitoring,
              real-time insights, and automated risk management.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 grid grid-cols-2 gap-4">
            <FeatureCard
              icon={<FaBolt />}
              title="Real-time"
              subtitle="Instant alerts & monitoring"
              color="text-teal-600"
            />
            <FeatureCard
              icon={<FaShieldAlt />}
              title="Certified"
              subtitle="Industry standards"
              color="text-green-600"
            />
            <FeatureCard
              icon={<FaChartLine />}
              title="Analytics"
              subtitle="Advanced reporting"
              color="text-purple-600"
            />
            <FeatureCard
              icon={<FaUsers />}
              title="Trusted"
              subtitle="500+ companies"
              color="text-orange-500"
            />
          </div>

          <div className="bg-white rounded-xl shadow p-6 flex justify-around text-center">
            <StatCard number="99.9%" label="Uptime" color="text-teal-600" />
            <StatCard number="500+" label="Companies" color="text-green-600" />
            <StatCard number="24/7" label="Support" color="text-purple-600" />
          </div>

          <p className="text-center text-sm text-green-600 flex items-center justify-center">
            <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
            Enterprise-grade security & compliance
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, subtitle, color }) {
  return (
    <div className="text-center space-y-2">
      <div
        className={`inline-flex items-center justify-center w-10 h-10 rounded bg-gray-100 ${color}`}
      >
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );
}

function StatCard({ number, label, color }) {
  return (
    <div className="space-y-1">
      <div className={`text-xl font-bold ${color}`}>{number}</div>
      <div className="text-gray-500 text-sm">{label}</div>
    </div>
  );
}
