"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileAction, deleteAccountAction } from "../actions/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Validation schema
const profileFormSchema = z
  .object({
    username: z
      .string()
      .min(2, { message: "Username must be at least 2 characters" })
      .max(20, { message: "Username must not exceed 20 characters" })
      .optional(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

export function ProfileForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Update user profile handler
  const onSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Prioritize userID from session because your session log shows user.userID
      const userId =
        session?.user?.userID || session?.user?._id || session?.user?.id;
      console.log("User id used for update:", userId);
      if (!userId) {
        throw new Error("User not authenticated");
      }
      // Build updateData with only non-empty fields
      const updateData: { username?: string; password?: string } = {};
      if (data.username.trim() !== "") {
        updateData.username = data.username;
      }
      if (data.password.trim() !== "") {
        updateData.password = data.password;
      }
      if (Object.keys(updateData).length === 0) {
        throw new Error("Please provide at least one field to update.");
      }

      const result = await updateProfileAction({
        session: { user: { id: userId } },
        updateData,
      });
      console.log("Update result:", result);
      if (!result.success) {
        throw new Error(result.error);
      }
      // if update successful redirect back to chat
      router.push("/chat");
    } catch (err: unknown) {
      let errorMessage = "Something went wrong";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setError(errorMessage);
      console.error("Update error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete account handler
  const onDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action is irreversible.",
      )
    ) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const userId =
        session?.user?.userID || session?.user?._id || session?.user?.id;
      console.log("Deleting user with id:", userId);
      if (!userId) {
        throw new Error("User not authenticated");
      }
      const result = await deleteAccountAction({
        session: { user: { id: userId } },
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      router.push("/signin");
    } catch (err: unknown) {
      let errorMessage = "Something went wrong";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setError(errorMessage);
      console.error("Delete account error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your username"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Your password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Updating Profile..." : "Update Profile"}
            </Button>
            <Button
              type="button"
              onClick={onDelete}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Processing..." : "Delete Account"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default ProfileForm;
