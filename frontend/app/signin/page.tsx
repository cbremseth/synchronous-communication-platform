"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  signInAction,
  type SignInFormData,
  updateUserStatusAction,
} from "@/app/actions/auth";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSocketContext } from "@/context/SocketContext";

// Validation schema for login
const signInFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

export function LoginForm() {
  const router = useRouter();
  const { status, data: session, update: updateSession } = useSession();
  const socket = useSocketContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (status: string) => {
    try {
      const userId =
        session?.user?.userID || session?.user?._id || session?.user?.id;
      console.log("User id used for status update:", userId);
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const result = await updateUserStatusAction({
        session: { user: { id: userId } },
        newStatus: status,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update status");
      }

      // Emit status update to the server
      socket?.emit("update_status", { userId, status });

      console.log("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Add effect to handle redirect after session is established
  useEffect(() => {
    console.log("Session status changed:", status);
    console.log("Current session:", session);

    if (status === "authenticated" && session?.user) {
      console.log("Redirecting to chat page...");
      handleStatusChange("online");
      router.replace("/chat");
    }
  }, [status, session, router]);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInFormData) {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signInAction(values);
      console.log("Sign in action result:", result);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Force a session update after successful sign in
      await updateSession();
    } catch (error) {
      console.error("Sign in error:", error);
      setError(error instanceof Error ? error.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  // Reusable Input Field Component
  const renderInputField = (
    name: keyof SignInFormData,
    label: string,
    type: string,
    placeholder: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({
        field,
      }: {
        field: ControllerRenderProps<SignInFormData, keyof SignInFormData>;
      }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              value={field.value || ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isLoading}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Sign In
        </h1>

        {error && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderInputField("email", "Email", "email", "Enter your email")}
            {renderInputField(
              "password",
              "Password",
              "password",
              "Enter your password",
            )}

            <Button
              type="submit"
              variant="blue"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>

	{/*

        <Button
          type="button"
          variant="blue"
          className="w-full"
          onClick={() =>
            (window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`)
          }
        >
          Sign in with Google
        </Button>
	
	*/}

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up here
          </Link>
        </p>
        <p className="text-center text-sm text-gray-600">
          <Link
            href="/forgot-password"
            className="text-blue-600 hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
