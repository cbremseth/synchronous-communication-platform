import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  userID: string;
}

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const user = session?.user as AuthUser | undefined;

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const requireAuth = (callback: () => void) => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/signin");
      return;
    }
    callback();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    status,
    signOut,
    requireAuth,
    updateSession: update,
  };
}
