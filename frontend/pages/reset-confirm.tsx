"use client";

export default function RecoveryConfirmation() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#AAD4FF] via-[#278DEE] to-[#955CD7] text-white">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full">
        <h1 className="text-2xl font-extrabold text-center text-gray-800 mb-4">
          Recovery Confirmation
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          We’ll send a reset link to your registered email. If you don’t see it,
          check your spam folder.
        </p>
        <button
          onClick={() => (window.location.href = "/login")}
          className="w-full py-3 bg-[#6A74CF] hover:bg-[#5A64B8] text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
