// Utility to trim trailing slashes and return only the last segment, decoded
export function trimName(name?: string): string {
  if (!name) return "";
  const withoutTrailing = name.replace(/\/+$/, "");
  const segment = withoutTrailing.split("/").pop() || withoutTrailing;
  return decodeURIComponent(segment);
}