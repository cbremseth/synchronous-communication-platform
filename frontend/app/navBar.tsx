import React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";

import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";

const NavBar = () => {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
            Menu
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex flex-col p-4 space-y-2">
              <li>
                <NavigationMenuLink asChild>
                  <button onClick={() => signOut({ callbackUrl: "/signin" })}>
                    Sign out
                  </button>
                </NavigationMenuLink>
              </li>
              <li>
                <Link href="/profile" legacyBehavior passHref>
                  <NavigationMenuLink>Profile</NavigationMenuLink>
                </Link>
              </li>
              <li>
                <Link href="/settings" legacyBehavior passHref>
                  <NavigationMenuLink>Settings</NavigationMenuLink>
                </Link>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuViewport />
      <NavigationMenuIndicator />
    </NavigationMenu>
  );
};

export default NavBar;
