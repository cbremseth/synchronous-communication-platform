"use client";
import Link from "next/link";

import { useState } from "react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage("Email is required.");
      return;
    }

    // Simulate sending a password reset link
    setMessage(
      "We’ll send a reset link to your registered email. If you don’t see it, check your spam folder",
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#AAD4FF] via-[#278DEE] to-[#955CD7] text-white">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-4">
          Forgot Password
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your email address below, and we’ll send you instructions to
          reset your password.
        </p>

        {message && (
          <div
            className={`${
              message.includes("required") ? "bg-red-500" : "bg-green-500"
            } text-white p-3 mb-4 rounded-lg text-center`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-gray-500 mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg shadow-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-[#6A74CF] focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#6A74CF] hover:bg-[#5A64B8] text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Send Reset Link
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="text-[#6A74CF] hover:underline font-semibold"
            >
              Log in
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[#6A74CF] hover:underline font-semibold"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
