import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Sidebar() {
  return (
    <div className="h-full ring-2 ring-white text-white p-4 mx-4 my-4 flex flex-col rounded-lg">
      <h2 className="text-lg font-bold">Conversations</h2>
      <div className="h-1/2 overflow-y-auto mt-4 space-y-2">
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          Project Alpha (2 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          user123 (10 unread)
        </Card>
        <Card className="p-2 cursor-pointer bg-gray-700">
          user456 (10 unread)
        </Card>
      </div>
      <h2 className="text-lg font-bold mt-6">Notifications</h2>
      <ScrollArea className="h-1/2 opacity-50 bg-gray-700 px-2 py-4 hover:bg-violet-900 rounded-md flex-1 overflow-y-auto mt-2 h-32 overflow-auto">
        <p className="text-sm">
          user456 reacted to your message in Project Alpha
        </p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user456 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
        <p className="text-sm">user123 sent a message in Project Alpha</p>
      </ScrollArea>
    </div>
  );
}
