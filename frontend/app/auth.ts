import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import mongoose from "mongoose";
import { compare } from "bcryptjs";
import { signInSchema } from "@/lib/zod";
import User from "../../backend/models/Users";

async function connectDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        // Validate credentials with Zod
        const { email, password } = await signInSchema.parseAsync(credentials);

        await connectDB();
        const user = await User.findOne({ email: email });
        if (!user) {
          throw new Error("User not found.");
        }

        const isMatch = await compare(password, user.password);
        if (!isMatch) {
          throw new Error("Invalid credentials.");
        }

        return {
          email: user.email,
          username: user.username,
          userID: user.userId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.username = user.username;
        token.userID = user.userID;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.email = token.email;
      session.user.username = token.username;
      session.user.userID = token.userID;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
