import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";

export const PDF2MD_INDEX_FILE_NAME = ".pdf2md_index.json";

export type FileSystemSettings = {
  type: "webdav" | "local";
  host?: string;
  username?: string;
  password?: string;
  basePath?: string;
};

export type FileTreeEntry = FileEntry & {
  hasParser?: boolean;
  parserStatus?: string;
  parserDet?: string[];
  parserDefault?: string;
};

export interface FileTreeFetcherOptions {
  noshowList?: string[];
  fileSystemType?: string; // e.g., "webdav"
}

// Utility to normalize paths (ensure trailing slash)
export function normalizePath(path: string): string {
  return path.endsWith("/") ? path : path + "/";
}

/**
 * Simplified file tree fetcher that uses database-driven configuration
 * No more need to pass WebDAV credentials in parameters
 */
export const fileTreeFetcher = async ([path, options]: [
  string,
  FileTreeFetcherOptions?
]): Promise<FileTreeEntry[]> => {
  const noshowList = options?.noshowList || ["archive", ".archive"];

  console.log("fileTreeFetcher called with:", { path, options });

  // Simplified API call - no WebDAV credentials needed
  const queryParams = new URLSearchParams({
    path: path,
  });

  console.log("Making fetch request to:", `/api/fs?${queryParams.toString()}`);

  const response = await fetch(`/api/fs?${queryParams.toString()}`);
  console.log("Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fetch failed:", errorText);
    throw new Error(
      `Failed to fetch directory ${path}: ${response.statusText}`
    );
  }
  const dirData = await response.json();
  console.log("Received dirData:", dirData);

  // Handle parser info from index file
  let parserInfoMap: Record<
    string,
    { status: string; hasActualParser: boolean; det: string[]; default: string }
  > = {};

  const indexFilePath = normalizePath(path) + PDF2MD_INDEX_FILE_NAME;

  try {
    // Simplified index file fetch
    const indexParams = new URLSearchParams({
      path: indexFilePath,
    });

    const indexResponse = await fetch(`/api/fs?${indexParams.toString()}`);
    if (indexResponse.ok) {
      const indexJson = await indexResponse.json();
      if (indexJson && Array.isArray(indexJson.files)) {
        for (const fileInfo of indexJson.files) {
          if (fileInfo.name && fileInfo.parsers) {
            const detList = Array.isArray(fileInfo.parsers.det)
              ? fileInfo.parsers.det
              : [];
            const hasActualParser =
              detList.length > 0 ||
              (typeof fileInfo.parsers.default === "string" &&
                fileInfo.parsers.default !== "");
            parserInfoMap[fileInfo.name] = {
              hasActualParser,
              status: fileInfo.parsers.status || "",
              det: detList,
              default: fileInfo.parsers.default || "",
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Could not fetch or parse index file ${indexFilePath}:`, e);
  }

  if (Array.isArray(dirData)) {
    const rawEntries = abstractFileSystemView(dirData, {
      showHidden: false,
      noshowList: noshowList,
    });

    const entriesWithData = rawEntries
      .map((entry): FileTreeEntry => {
        const pInfo =
          entry.type === "file" ? parserInfoMap[entry.name] : undefined;
        return {
          ...entry,
          hasParser: pInfo?.hasActualParser || false,
          parserStatus: pInfo?.status || "",
          parserDet: pInfo?.det || [],
          parserDefault: pInfo?.default || "",
        };
      })
      .filter((entry) => normalizePath(entry.path) !== normalizePath(path));
    return entriesWithData;
  }
  throw new Error("Unexpected API response for directory listing");
};
