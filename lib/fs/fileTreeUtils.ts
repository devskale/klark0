import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";

export const PDF2MD_INDEX_FILE_NAME = ".pdf2md_index.json";

export type FileSystemSettings = Record<string, string | undefined>;

export type FileTreeEntry = FileEntry & {
  hasParser?: boolean;
  parserStatus?: string;
  parserDet?: string[];
};

export interface FileTreeFetcherOptions {
  noshowList?: string[];
  fileSystemType?: string; // e.g., "webdav"
}

// Utility to normalize paths (ensure trailing slash)
export function normalizePath(path: string): string {
  return path.endsWith("/") ? path : path + "/";
}

// SWR hook for caching file tree:
export const fileTreeFetcher = async ([path, settings, options]: [
  string,
  FileSystemSettings,
  FileTreeFetcherOptions?
]): Promise<FileTreeEntry[]> => {
  const fsType = options?.fileSystemType || "webdav";
  const noshowList = options?.noshowList || ["archive", ".archive"];

  // Fetch directory listing
  const queryParams = new URLSearchParams({
    type: fsType,
    path: path,
    host: settings.host || "",
    username: settings.username || "",
    password: settings.password || "",
  });
  const response = await fetch(`/api/fs?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch directory ${path}: ${response.statusText}`);
  }
  const dirData = await response.json();

  let parserInfoMap: Record<
    string,
    { status: string; hasActualParser: boolean; det: string[] }
  > = {};
  const indexFilePath = normalizePath(path) + PDF2MD_INDEX_FILE_NAME;

  const indexFileQuery = new URLSearchParams({
    type: fsType,
    path: indexFilePath,
    host: settings.host || "",
    username: settings.username || "",
    password: settings.password || "",
  });

  try {
    const indexResponse = await fetch(`/api/fs?${indexFileQuery.toString()}`);
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
            };
          }
        }
      } else {
        console.warn(`Index file ${indexFilePath} content is not in expected format:`, indexJson);
      }
    } else if (indexResponse.status !== 404) { // Don't warn for 404, as index file might not exist
        console.warn(`Failed to fetch index file ${indexFilePath}: ${indexResponse.status} ${indexResponse.statusText}`);
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
        };
      })
      .filter(
        (entry) => normalizePath(entry.path) !== normalizePath(path) // Filter out the parent directory itself
      );
    return entriesWithData;
  }
  throw new Error("Unexpected API response for directory listing");
};
