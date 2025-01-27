"use client";

import Link from "next/link";
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
import { signInAction, type SignInFormData } from "../actions/auth";

// Validation schema for login
const signInFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters" })
    .max(20, { message: "Username must not exceed 20 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

export function LoginForm() {
  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInFormData) {
    try {
      const result = await signInAction(values);
      if (!result.success) {
        throw new Error(result.error);
      }
      console.log("User signed in:", result.data);
    } catch (error) {
      console.error("Error during sign-in:", error);
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderInputField(
              "username",
              "Username",
              "text",
              "Enter your username",
            )}
            {renderInputField(
              "password",
              "Password",
              "password",
              "Enter your password",
            )}

            <Button type="submit" variant="blue" className="w-full">
              Sign In
            </Button>
          </form>
        </Form>

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

        <p className="text-center text-sm text-gray-600">
          Don’t have an account?{" "}
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
