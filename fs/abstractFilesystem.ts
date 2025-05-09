export type FileEntry = {
  name: string;
  type: "file" | "directory";
  path: string;
  size?: string;
  lastModified?: string;
  creationDate?: string;
  // ...other metadata as needed
};

type AbstractionOptions = {
  showHidden?: boolean; // Defaults to false
  noshowList?: string[]; // Additional names that should be hidden
};

// Example abstraction function
export function abstractFileSystemView(
  rawEntries: FileEntry[],
  options: AbstractionOptions = { showHidden: false, noshowList: [] }
): FileEntry[] {
  const { showHidden, noshowList } = options;
  return rawEntries.filter(entry => {
    // Hide by default if name starts with '.' and showHidden is false
    if (!showHidden && entry.name.startsWith(".")) return false;
    // Hide items explicitly in noshowList
    if (noshowList.includes(entry.name)) return false;
        return true;
  });
}
