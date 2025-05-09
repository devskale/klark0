import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FileEntry as BaseFileEntry } from "@/lib/fs/abstractFilesystem"; // Reuse the FileEntry type

interface FileEntry extends BaseFileEntry {
  children?: FileEntry[]; // Add children property for directories
}

export function FileList({ files }: { files: FileEntry[] }) {
  return (
    <ul>
      {files.map(file => (
        // ...existing rendering logic...
        <FileListItem key={file.path} file={file} />
      ))}
    </ul>
  );
}

function FileListItem({ file }: { file: FileEntry }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasChildren = file.type === "directory" && file.children && file.children.length > 0;

  const toggle = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <li>
      <div style={{ display: "flex", alignItems: "center" }} onClick={file.type === "directory" ? toggle : undefined}>
        {file.type === "directory" && (
          <span style={{ marginRight: "4px" }}>
            {isOpen ? <ChevronDown /> : <ChevronRight />}
          </span>
        )}
        <span>{file.name}</span>
        {file.type === "file" && file.size && (
          <span style={{ marginLeft: "8px", fontSize: "0.8em", color: "#888" }}>
            ({file.size} bytes)
          </span>
        )}
      </div>
      {isOpen && hasChildren && <FileList files={file.children!} />}
    </li>
  );
}
