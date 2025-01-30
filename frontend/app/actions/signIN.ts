"use server";

import { signIn } from "../auth";

export interface SignInFormData {
  email?: string;
  password?: string;
  username?: string;
}

export async function signInAction(values: SignInFormData) {
  try {
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email || "",
      password: values.password || "",
    });

    if (!result || !result.ok) {
      return {
        success: false,
        error: result?.error || "Failed to sign in",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error.message || "An error occurred",
    };
  }
}
