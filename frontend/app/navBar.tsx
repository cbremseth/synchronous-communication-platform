import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { updateUserStatusAction } from "@/app/actions/auth";
import { Settings } from "lucide-react"; // Import gear icon
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocketContext } from "@/context/SocketContext";

const StatusIndicator = ({ status }: { status: string }) => {
  const colors = {
    online: "bg-green-500",
    offline: "bg-gray-500",
    busy: "bg-red-500",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full mr-2 ${
        colors[status as keyof typeof colors]
      }`}
    />
  );
};

const NavBar = () => {
  const { data: session, status: sessionStatus } = useSession();
  const [currentStatus, setCurrentStatus] = useState("online");
  const [updating, setUpdating] = useState(false);
  const socket = useSocketContext();

  useEffect(() => {
    console.log("Session Data:", session);
    console.log("User ID:", session?.user?.id);
    console.log("Session Status:", sessionStatus);
  }, [session, sessionStatus]);

  const handleStatusChange = async (
    newStatus: "online" | "offline" | "busy",
  ) => {
    if (!session?.user?.id || updating) return;

    setUpdating(true);
    try {
      const result = await updateUserStatusAction({
        session: { user: { id: session.user.id } },
        newStatus,
      });

      if (result.success) {
        setCurrentStatus(newStatus);
        socket?.emit("update_status", {
          userId: session.user.id,
          status: newStatus,
        });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
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
              <StatusIndicator status={currentStatus} />
              Set Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                disabled={updating}
                onClick={() => handleStatusChange("online")}
                className="flex items-center"
              >
                <StatusIndicator status="online" />
                Online
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={updating}
                onClick={() => handleStatusChange("busy")}
                className="flex items-center"
              >
                <StatusIndicator status="busy" />
                Busy
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={updating}
                onClick={() => handleStatusChange("offline")}
                className="flex items-center"
              >
                <StatusIndicator status="offline" />
                Offline
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <Link href="/profileSettings" legacyBehavior passHref>
            <DropdownMenuItem className="cursor-pointer">
              Account Settings
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            className="text-red-500 hover:text-red-700 cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/signin" })}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};

export default NavBar;
