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

// Action to update the profile of the user
export async function updateProfileAction({
  session,
  updateData,
}: {
  session: { user: { id: string } };
  updateData: { username?: string; password?: string };
}) {
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      },
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to update profile on the server",
      );
    }
    const updatedUser = await response.json();
    return { success: true, data: updatedUser };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

//Action to delete users account
export async function deleteAccountAction({
  session,
}: {
  session: { user: { id: string } };
}): Promise<{ success: boolean; error?: string }> {
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to delete account on the server",
      );
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
// server side action to update user status
export async function updateUserStatusAction({
  session,
  newStatus,
}: {
  session: { user: { id: string } };
  newStatus: "online" | "offline" | "busy";
}) {
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not authenticated");
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update status");
    }

    return { success: true };
  } catch (error) {
    console.error("Status update failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
