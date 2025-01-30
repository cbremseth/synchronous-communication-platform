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
import { signUpAction, type SignUpFormData } from "../actions/auth";
import { useState } from "react";

// Validation schema
const signUpFormSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    username: z
      .string()
      .min(2, { message: "Username must be at least 2 characters" })
      .max(20, { message: "Username must not exceed 20 characters" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

export function ProfileForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignUpFormData) {
    try {
      setIsLoading(true);
      setError(null);
      const result = await signUpAction(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Successful signup and auto-login
      router.push("/chat"); // Redirect to chat or dashboard
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during signup",
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Reusable Input Field Component
  const renderInputField = (
    name: keyof SignUpFormData,
    label: string,
    type: string = "text",
    placeholder: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({
        field,
      }: {
        field: ControllerRenderProps<SignUpFormData, keyof SignUpFormData>;
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
          Create Your Account
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
            {renderInputField(
              "confirmPassword",
              "Confirm Password",
              "password",
              "Re-enter your password",
            )}

            <Button
              type="submit"
              variant="blue"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/signin" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ProfileForm;
