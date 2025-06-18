export async function initdir(
  projectName: string,
  basePath: string
): Promise<void> {
  console.log(
    `initdir called for project: ${projectName} at base path: ${basePath}`
  );

  const subdirs = ["A", "B"];

  for (const subdir of subdirs) {
    const dirPath = `${basePath}/${projectName}/${subdir}`;
    const params = new URLSearchParams({
      path: dirPath,
    });

    try {
      const res = await fetch(`/api/fs/mkdir?${params.toString()}`, {
        method: "POST",
      });

      if (res.ok) {
        console.log(`Successfully created directory: ${dirPath}`);
      } else {
        const errorText = await res.text();
        console.error(
          `Failed to create directory: ${dirPath}. Status: ${res.status}, Message: ${errorText}`
        );
      }
    } catch (error) {
      console.error(
        `Error during fetch to create directory ${dirPath}:`,
        error
      );
    }
  }
}
