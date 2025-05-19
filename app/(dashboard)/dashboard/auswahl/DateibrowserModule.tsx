import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FileEntry } from "@/lib/fs/abstractFilesystem";

type FileTreeNode = FileEntry & {
  children?: FileTreeNode[];
};

// Renders nested file tree; applyFilter=false to show all entries
function renderFileTree(
  nodes: FileTreeNode[],
  currentPath: string,
  applyFilter: boolean
) {
  return (
    <ul className="pl-4 bg-sidebar rounded-lg p-2 text-sidebar-foreground">
      {nodes.map((node) => (
        <li key={node.path} className="mb-2">
          {node.type === "directory" ? (
            <FolderNode node={node} parentPath={currentPath} />
          ) : (
            <div className="px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors">
              {node.name}
              {node.size && <span className="ml-1 text-xs">({node.size} bytes)</span>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const FolderNode = ({
  node,
  parentPath,
}: {
  node: FileTreeNode;
  parentPath: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // (If you need to fetch children here, reintroduce SWR/mutate logic.)

  return (
    <div>
      <div
        className="flex items-center cursor-pointer px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mr-1">{isOpen ? <ChevronDown /> : <ChevronRight />}</span>
        <span>{node.name}</span>
      </div>
      {isOpen && renderFileTree(node.children || [], node.path, false)}
    </div>
  );
};

export default function DateibrowserModule({
  fileTree,
  basePath,
}: {
  fileTree: FileTreeNode[];
  basePath: string;
}) {
  return (
    <Card className="rounded-lg shadow-lg">
      <CardHeader>
        <h2 className="text-md font-medium">Dateibrowser</h2>
      </CardHeader>
      <CardContent>
        {renderFileTree(fileTree, basePath, false)}
      </CardContent>
    </Card>
  );
}
