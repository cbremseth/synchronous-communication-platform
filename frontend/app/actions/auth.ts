"use server";

import { z } from "zod";

export type SignUpFormData = z.infer<typeof formSchema>;

export async function signUpAction(values: SignUpFormData) {
  try {
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

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("There was a problem with the signup operation:", error);
    return { success: false, error: "Failed to sign up" };
  }
}
