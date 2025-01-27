"use server";

import { z } from "zod";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import { compare } from "bcryptjs";

const client = new MongoClient(process.env.MONGODB_URI);

export type SignUpFormData = z.infer<typeof signUpFormSchema>;

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

// Define the validation schema for sign-in
export type SignInFormData = z.infer<typeof signInFormSchema>;

// Backend sign-in action
export async function signInAction(values: SignInFormData) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/signin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Sign-in failed");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("There was a problem with the sign-in operation:", error);
    return { success: false, error: "Failed to sign in" };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        await client.connect();
        const db = client.db("test");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({
          email: credentials.email,
        });
        if (!user) {
          throw new Error("No user found with the given email");
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        return { id: user._id, email: user.email };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
