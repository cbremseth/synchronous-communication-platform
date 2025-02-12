import { Card } from "@/components/ui/card";

export default function ChatInfo() {
  return (
    <div className="w-full h-full bg-gray-200 p-4 flex flex-col justify-between">
      <h2 className="text-lg font-semibold mb-4">Room Details</h2>
      <div className="flex flex-col flex-1 justify-between">
        <Card className="p-3 h-1/2">
          <h3 className="font-semibold">Participants</h3>
          <ul className="text-sm">
            <li>User123</li>
            <li>User456</li>
            <li>You</li>
          </ul>
        </Card>
        <Card className="p-3 h-1/2 mt-8">
          <h3 className="font-semibold">Files</h3>
          <p className="text-sm">No files shared yet.</p>
        </Card>
      </div>
    </div>
  );
}
