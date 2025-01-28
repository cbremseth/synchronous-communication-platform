import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBar({
  placeholder = "Search...",
  onSearch,
}: SearchBarProps) {
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = formData.get("search") as string;

    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <form
      className="flex items-center p-2 border-b bg-gray-100 dark:bg-gray-800"
      onSubmit={handleSearch}
    >
      <Input
        name="search"
        type="text"
        className="flex-1 bg-white dark:bg-gray-900 rounded-lg p-2"
        placeholder={placeholder}
      />
      <Button type="submit" className="ml-2">
        Search
      </Button>
    </form>
  );
}
