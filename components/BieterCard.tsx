import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function BieterCard({ bieter }: { bieter: { name: string; /*...*/} }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{bieter.name}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* actions to come */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* ...existing card content... */}
    </div>
  );
}