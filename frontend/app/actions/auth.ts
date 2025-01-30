"use server";

import { signUpSchema } from "@/lib/zod";
import { z } from "zod";
import { signIn } from "@/lib/auth.config";

export interface SignInFormData {
  email: string;
  password: string;
}

export async function signInAction(values: SignInFormData) {
  try {
    console.log("Attempting to sign in with:", { email: values.email });

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    console.log("Sign in result:", result);

    if (result?.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "An error occurred during sign in",
    };
  }
}

export type SignUpFormData = z.infer<typeof signUpSchema>;

export async function signUpAction(values: SignUpFormData) {
  try {
    console.log("Attempting signup with:", {
      ...values,
      password: "[REDACTED]",
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Signup failed:", data);
      return {
        success: false,
        error: data.message || "Failed to sign up",
      };
    }

    // If signup was successful, try to sign in
    const signInResult = await signInAction({
      email: values.email,
      password: values.password,
    });

    if (!signInResult.success) {
      return {
        success: false,
        error: "Account created but failed to sign in automatically",
      };
    }

    return {
      success: true,
      data: {
        user: data.user,
        ...signInResult.data,
      },
    };
  } catch (error) {
    console.error("There was a problem with the signup operation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sign up",
    };
  }
}
