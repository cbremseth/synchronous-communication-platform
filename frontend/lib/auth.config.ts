import NextAuth, { DefaultSession, NextAuthConfig, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInSchema } from "@/lib/zod";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    username: string;
    userID: string;
    _id: string;
  }

  interface Session {
    user: {
      username: string;
      userID: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    userID?: string;
  }
}

const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("No credentials provided");
          return null;
        }

        try {
          const { email, password } =
            await signInSchema.parseAsync(credentials);
          console.log("Attempting to sign in with email:", email);

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/signin`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ email, password }),
            },
          );

          const data = await response.json();
          console.log("Sign-in response:", { status: response.status, data });

          if (!response.ok) {
            throw new Error(data.message || "Authentication failed");
          }

          if (!data.user) {
            console.error("No user data in response");
            return null;
          }

          return {
            id: data.user._id,
            email: data.user.email,
            username: data.user.username,
            userID: data.user._id,
            _id: data.user._id,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.userID = user.userID;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.username = token.username || "";
        session.user.userID = token.userID || "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
