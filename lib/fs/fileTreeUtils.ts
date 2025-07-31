import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";

export const PDF2MD_INDEX_FILE_NAME = ".pdf2md_index.json";

/**
 * Utility function to get the WebDAV base path from settings
 * This replaces hardcoded references to specific directory names
 */
export async function getWebDAVBasePath(): Promise<string | null> {
  try {
    const settingsResponse = await fetch("/api/settings?key=fileSystem");
    if (settingsResponse.ok) {
      const fsSettings = await settingsResponse.json();
      return fsSettings.path || null;
    }
  } catch (error) {
    console.error("Error fetching WebDAV base path:", error);
  }
  return null;
}

/**
 * Client-side utility to remove the WebDAV base path prefix from a path
 * This replaces hardcoded path replacements like .replace(/^\/klark0\//, "")
 */
export function removeWebDAVBasePath(path: string, basePath: string | null): string {
  if (!basePath || !path) return path;
  
  const basePathWithSlash = `/${basePath}/`;
  if (path.startsWith(basePathWithSlash)) {
    return path.substring(basePathWithSlash.length);
  }
  
  // Also handle case where path starts with just the base path
  const basePathOnly = `/${basePath}`;
  if (path === basePathOnly) {
    return "";
  }
  
  return path;
}

/**
 * Extract project name from a path by removing the WebDAV base path prefix
 */
export function extractProjectName(projectPath: string, basePath: string | null): string {
  const cleanPath = removeWebDAVBasePath(projectPath, basePath);
  return cleanPath.split("/")[0] || "";
}

export type FileSystemSettings = {
  type: "webdav" | "local";
  host?: string;
  username?: string;
  password?: string;
  basePath?: string;
  path?: string;
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

// Type guard to check if an object is FileSystemSettings
function isFileSystemSettings(obj: any): obj is FileSystemSettings {
  return obj && typeof obj === 'object' && ('host' in obj || 'type' in obj);
}

/**
 * Simplified file tree fetcher that uses database-driven configuration
 * No more need to pass WebDAV credentials in parameters
 * 
 * Supports both new signature (path, options) and legacy signature (path, settings, options)
 * for backward compatibility
 */
export const fileTreeFetcher = async (
  pathOrArgs: string | [string, FileTreeFetcherOptions?] | [string, FileSystemSettings, FileTreeFetcherOptions?]
): Promise<FileTreeEntry[]> => {
  let path: string;
  let options: FileTreeFetcherOptions | undefined;
  let legacySettings: FileSystemSettings | undefined;

  // Handle different call signatures for backward compatibility
  if (typeof pathOrArgs === "string") {
    // Direct string path (legacy usage)
    path = pathOrArgs;
    options = undefined;
  } else if (Array.isArray(pathOrArgs)) {
    if (pathOrArgs.length === 2 && typeof pathOrArgs[1] === "object" && !isFileSystemSettings(pathOrArgs[1])) {
      // New signature: [path, options]
      [path, options] = pathOrArgs;
    } else {
      // Legacy signature: [path, settings, options]
      path = pathOrArgs[0];
      if (isFileSystemSettings(pathOrArgs[1])) {
        legacySettings = pathOrArgs[1];
      }
      options = pathOrArgs[2];
    }
  } else {
    throw new Error("Invalid arguments for fileTreeFetcher");
  }

  const noshowList = options?.noshowList || ["archive", ".archive"];

  console.log("fileTreeFetcher called with:", { path, options, legacySettings });

  // Fetch filesystem settings to get the base path if no path is provided
  let finalPath = path;
  if (!path || path === "/") {
    try {
      const settingsResponse = await fetch("/api/settings?key=fileSystem");
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        if (settings.basePath) {
          finalPath = settings.basePath;
          console.log("Overriding path with basePath from settings:", finalPath);
        } else {
          console.log("No basePath in settings, using root as default");
          finalPath = "/";
        }
      }
    } catch (error) {
      console.error("Failed to fetch filesystem settings:", error);
      finalPath = "/"; // Fallback to root if settings fetch fails
    }
  }
  // For paths starting with /klark0, let the API route handle the path transformation
  // Don't override here to preserve the full path structure

  let queryParams: URLSearchParams;
  
  if (legacySettings) {
    // Legacy mode: use provided settings
    const fsType = options?.fileSystemType || "webdav";
    queryParams = new URLSearchParams({
      type: fsType,
      path: finalPath,
      host: legacySettings.host || "",
      username: legacySettings.username || "",
      password: legacySettings.password || "",
    });
  } else {
    // New mode: simplified API call - no WebDAV credentials needed
    queryParams = new URLSearchParams({
      path: finalPath,
    });
  }

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

  const indexFilePath = normalizePath(finalPath) + PDF2MD_INDEX_FILE_NAME;

  try {
    let indexParams: URLSearchParams;
    
    if (legacySettings) {
      // Legacy mode: use provided settings
      const fsType = options?.fileSystemType || "webdav";
      indexParams = new URLSearchParams({
        type: fsType,
        path: indexFilePath,
        host: legacySettings.host || "",
        username: legacySettings.username || "",
        password: legacySettings.password || "",
      });
    } else {
      // New mode: simplified index file fetch
      indexParams = new URLSearchParams({
        path: indexFilePath,
      });
    }

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
      } else if (legacySettings) {
        console.warn(`Index file ${indexFilePath} content is not in expected format:`, indexJson);
      }
    } else if (indexResponse.status !== 404 && legacySettings) { 
      // Don't warn for 404, as index file might not exist
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
          parserDefault: pInfo?.default || "",
        };
      })
      .filter((entry) => {
        // Normalize paths for comparison
        const normalizedEntryPath = normalizePath(entry.path);
        const normalizedFinalPath = normalizePath(finalPath);
        
        // Direct path comparison
        if (normalizedEntryPath === normalizedFinalPath) {
          return false;
        }
        
        // Handle WebDAV paths that include the full server path structure
        // e.g., entry.path = "/disk/klark0/" and finalPath = "klark0"
        if (normalizedEntryPath.endsWith(normalizedFinalPath)) {
          // Check if this is exactly the root directory by comparing the name
          const pathSegments = normalizedEntryPath.split('/').filter(Boolean);
          const finalPathSegments = normalizedFinalPath.split('/').filter(Boolean);
          
          // If the entry path ends with the final path and has the same number of segments
          // or just one more segment (the server prefix), it's likely the root directory
          if (pathSegments.length <= finalPathSegments.length + 1) {
            const entryName = pathSegments[pathSegments.length - 1];
            const finalName = finalPathSegments[finalPathSegments.length - 1];
            if (entryName === finalName) {
              return false; // This is the root directory, exclude it
            }
          }
        }
        
        return true; // Include this entry
      });
    return entriesWithData;
  }
  throw new Error("Unexpected API response for directory listing");
};
