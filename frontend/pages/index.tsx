// app/pages/index.tsx
import Link from "next/link";

export function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-[#AAD4FF] via-[#278DEE] to-[#955CD7] text-white">
      <h1 className="text-5xl font-extrabold text-center mb-6 tracking-wide leading-tight">
        Synchronous Communication App
      </h1>
      <p className="text-xl mb-8 text-center max-w-xl">
        Welcome to Synchronous Communication App. Enhance your productivity with
        seamless messaging and collaboration.
      </p>
      <Link
        href="/login"
        className="text-lg px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out"
      >
        Go to Login Page
      </Link>
    </div>
  );
}

export default Home;
