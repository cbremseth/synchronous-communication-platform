import { Card } from "@/components/ui/card";

export default function ChatInfo() {
  return (
    <div className="w-full bg-gray-200 p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Room Details</h2>
      <Card className="p-3 mb-4">
        <h3 className="font-semibold">Participants</h3>
        <ul className="text-sm">
          <li>User123</li>
          <li>User456</li>
          <li>You</li>
        </ul>
      </Card>
      <Card className="p-3">
        <h3 className="font-semibold">Files</h3>
        <p className="text-sm">No files shared yet.</p>
      </Card>
    </div>
  );
}
