// import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <h1 className="text-5xl font-extrabold text-center mb-6 tracking-wide leading-tight">
        Synchronous Communication App
      </h1>
      <p className="text-xl mb-8 text-center max-w-xl">
        Welcome to Synchronous Communication App.
      </p>
      <Link
        href="/signin"
        className="text-lg px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out"
      >
        Go to Login Page
      </Link>
      <Link
        href="/chat"
        className="text-lg px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out"
      >
        Go to Chat Page
      </Link>
    </div>
  );
}
