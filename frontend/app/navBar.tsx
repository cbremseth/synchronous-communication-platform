import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { updateUserStatusAction } from "./actions/auth";
import { useSocketContext } from "@/context/SocketContext";

const NavBar = () => {
  const { user, isAuthenticated } = useAuth();
  const { data: session } = useSession();
  const socket = useSocketContext();
  const [userStatus, setUserStatus] = useState("online");

  useEffect(() => {
    // Log user data from useAuth
    // console.log("User Data:", user);
    // console.log("User ID:", user?.id);
    // console.log("Is Authenticated:", isAuthenticated);
  }, [user, isAuthenticated]);

  const handleStatusChange = async (status: string) => {
    try {
      // Prioritize userID from session because your session log shows user.userID
      const userId =
        session?.user?.userID || session?.user?._id || session?.user?.id;
      console.log("User id used for status update:", userId);
      if (!userId) {
        throw new Error("User not authenticated");
      }

      setUserStatus(status);

      const result = await updateUserStatusAction({
        session: { user: { id: userId } },
        newStatus: status,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update status");
      }

      // Emit status update to the server
      socket?.emit("update_status", { userId, status });

      console.log("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      setUserStatus((prevStatus) => prevStatus);
    }
  };

  const handleSignOut = async () => {
    try {
      await handleStatusChange("offline");
      signOut({ callbackUrl: "/signin" });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="fixed top-0 right-0 p-4">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Settings className="w-5 h-5" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center">
              Set Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={() => handleStatusChange("online")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Online</span>
                </div>
                {userStatus === "online" && <span>✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={() => handleStatusChange("busy")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Busy</span>
                </div>
                {userStatus === "busy" && <span>✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={() => handleStatusChange("offline")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span>Offline</span>
                </div>
                {userStatus === "offline" && <span>✓</span>}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <Link href="/profileSettings" legacyBehavior passHref>
            <DropdownMenuItem>Account Settings</DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            className="text-red-500 hover:text-red-700 cursor-pointer"
            onClick={handleSignOut}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};

export default NavBar;
