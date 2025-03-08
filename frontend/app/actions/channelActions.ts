"use server";

interface User {
  _id: string;
  username: string;
  email: string;
}

interface Channel {
  _id: string;
  name: string;
  users: User[];
  createdBy: User;
}

export async function getOrCreateGeneralChannel(
  userId: string,
): Promise<Channel> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/channels/general?userId=${userId}`,
      {
        cache: "no-store",
      },
    );
    console.log("Response:", response);
    if (!response.ok) {
      throw new Error("Failed to fetch general channel");
    }

    const channel = await response.json();
    return channel;
  } catch (error) {
    console.error("Error in getOrCreateGeneralChannel:", error);
    throw error;
  }
}
