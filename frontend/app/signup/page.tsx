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
import { signUpAction, type SignUpFormData } from "../actions/auth";

// Validation schema
const formSchema = z
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
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignUpFormData) {
    try {
      const result = await signUpAction(values);
      if (!result.success) {
        throw new Error(result.error);
      }
      console.log("User signed up:", result.data);
    } catch (error) {
      console.error("Error during signup:", error);
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

            <Button type="submit" className="w-full">
              Sign Up
            </Button>
          </form>
        </Form>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ProfileForm;
