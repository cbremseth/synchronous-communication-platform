"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LoginForm() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">Login</h1>
        <form className="space-y-6">
          <Button type="button" className="w-full">
            Sign in with Google
          </Button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
