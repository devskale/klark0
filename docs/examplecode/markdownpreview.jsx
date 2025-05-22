import React, { useState, useEffect, useMemo } from "react"; // Import useMemo
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Import remark-gfm
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Box, Typography, CircularProgress, Paper, Chip } from "@mui/material";
import { BASE_URL } from "../config/config"; // Import BASE_URL

/**
 * Component for rendering markdown content from processed documents
 * @param {Object} props - Component props
 * @param {Object} props.file - File object containing name and other metadata
 */
const MarkdownPreview = ({ file, onVariantChange }) => {
  const [markdown, setMarkdown] = useState("");
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(() => {
    if (!file || !file.name) return null;
    const storedVariant = localStorage.getItem(`markdownVariant:${file.name}`);
    return storedVariant || null;
  });
  const [selectedFilePath, setSelectedFilePath] = useState(null);

  // Effect 1: Fetch variant list when the file changes
  useEffect(() => {
    const fetchVariantList = async () => {
      if (!file || !file.name || !file.path) {
        setAvailableVariants([]);
        setSelectedVariant(null);
        setSelectedFilePath(null);
        setMarkdown("");
        setError("File information is incomplete for fetching variants.");
        return;
      }

      setLoadingVariants(true);
      setError(null);
      setAvailableVariants([]);
      setSelectedFilePath(null);
      setMarkdown("");

      try {
        const originalFileName = file.name;
        const baseName =
          originalFileName.substring(0, originalFileName.lastIndexOf(".")) ||
          originalFileName;

        const filePath = file.path;
        const lastSeparatorIndex = filePath.lastIndexOf("/");
        const fileDir =
          lastSeparatorIndex > -1
            ? filePath.substring(0, lastSeparatorIndex)
            : "";
        // Ensure mdDirPath doesn't start with '/' if fileDir is empty
        const mdDirPath = fileDir ? `${fileDir}/md` : "md";

        console.log(`(Effect 1) Fetching markdown listing from: ${mdDirPath}`);

        const mdResponse = await fetch(`${BASE_URL}/dir/${mdDirPath}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!mdResponse.ok) {
          if (mdResponse.status === 404) {
            console.log(
              `(Effect 1) Markdown directory not found: ${mdDirPath}`
            );
            setError(
              `No markdown variants found for ${originalFileName}. Process the file first.`
            );
          } else {
            throw new Error(
              `Failed to list markdown files in ${mdDirPath}: ${mdResponse.statusText}`
            );
          }
          setAvailableVariants([]);
        } else {
          const mdDirContents = await mdResponse.json();
          //          console.log(
          //            "(Effect 1) Fetched mdDirContents:",
          //            JSON.stringify(mdDirContents, null, 2)
          //          );

          const mdFiles = mdDirContents.filter(
            (item) => item.type !== "folder"
          );
          const mdDirs = mdDirContents.filter((item) => item.type === "folder");

          // Look for a directory named after the baseName
          const baseNameDir = mdDirs.find((dir) => dir.name === baseName);
          let sourceFileVariant = null;

          if (baseNameDir) {
            console.log(
              `(Effect 1) Found directory matching base name '${baseName}':`,
              baseNameDir.path
            );
            try {
              const baseNameDirContentsResponse = await fetch(
                `${BASE_URL}/dir/${baseNameDir.path}`,
                {
                  method: "GET",
                  headers: { "Content-Type": "application/json" },
                }
              );
              if (baseNameDirContentsResponse.ok) {
                const baseNameDirContents =
                  await baseNameDirContentsResponse.json();
                // Look for the marker file inside this directory (using UNDERSCORE, DOT, or DASH)
                const markerFile = baseNameDirContents.find(
                  (item) =>
                    item.type !== "folder" &&
                    (item.name === `${baseName}_marker.md` || // Check underscore
                      item.name === `${baseName}.marker.md` || // Check dot
                      item.name === `${baseName}-marker.md`) // Check dash
                );
                if (markerFile) {
                  console.log("(Effect 1) Found marker file:", markerFile.path);
                  sourceFileVariant = {
                    key: `${baseName}-sourcefile`, // Make key more specific
                    label: "Marker", // Changed label to "Marker"
                    path: markerFile.path,
                  };
                } else {
                  console.log(
                    // Updated log message to reflect the searched names
                    `(Effect 1) Marker file ${baseName}_marker.md, ${baseName}.marker.md, or ${baseName}-marker.md not found in ${baseNameDir.path}`
                  );
                }
              } else {
                console.warn(
                  `(Effect 1) Failed to list contents of ${baseNameDir.path}: ${baseNameDirContentsResponse.statusText}`
                );
              }
            } catch (sourceErr) {
              console.error(
                "(Effect 1) Error fetching base name directory contents:",
                sourceErr
              );
            }
          } else {
            console.log(
              `(Effect 1) Directory matching base name '${baseName}' not found in ${mdDirPath}`
            );
          }

          const matchingMdFiles = mdFiles.filter((mdFile) => {
            if (mdFile.type === "folder" || !mdFile.name.endsWith(".md")) {
              return false;
            }
            const nameWithoutExt = mdFile.name.substring(
              0,
              mdFile.name.lastIndexOf(".md")
            );
            const delimiterIndex = Math.max(
              nameWithoutExt.lastIndexOf("_"),
              nameWithoutExt.lastIndexOf("."),
              nameWithoutExt.lastIndexOf("-")
            );
            // If the file is the marker file itself in the md/ dir (less likely but possible), ignore it here
            if (nameWithoutExt === `${baseName}.marker`) return false;
            if (delimiterIndex === -1) {
              // Allow files like baseName.md if needed, or return false if only suffixed files are variants
              // For now, assume variants must have a suffix
              return false;
            }
            const mdBaseName = nameWithoutExt.substring(0, delimiterIndex);
            return mdBaseName === baseName;
          });
          //          console.log(
          //            "(Effect 1) Filtered matchingMdFiles:",
          //            JSON.stringify(matchingMdFiles, null, 2)
          //          );

          let variantsData = [];
          if (matchingMdFiles.length > 0) {
            const labelCounts = {};
            variantsData = matchingMdFiles.map((mdFile) => {
              const filename = mdFile.name;
              const nameWithoutExt = filename.substring(
                0,
                filename.lastIndexOf(".md")
              );
              const delimiterIndex = Math.max(
                nameWithoutExt.lastIndexOf("_"),
                nameWithoutExt.lastIndexOf("."),
                nameWithoutExt.lastIndexOf("-")
              );
              const baseProcessorName =
                delimiterIndex === -1
                  ? "default"
                  : nameWithoutExt.substring(delimiterIndex + 1);

              labelCounts[baseProcessorName] =
                (labelCounts[baseProcessorName] || 0) + 1;
              const finalLabel =
                labelCounts[baseProcessorName] > 1
                  ? `${baseProcessorName}_${labelCounts[baseProcessorName]}`
                  : baseProcessorName;
              return { key: filename, label: finalLabel, path: mdFile.path };
            });
          }

          if (sourceFileVariant) {
            variantsData.push(sourceFileVariant);
          }

          if (variantsData.length > 0) {
            //            console.log(
            //              "(Effect 1) Generated variantsData (incl. source):",
            //              JSON.stringify(variantsData, null, 2)
            //            );

            variantsData.sort((a, b) => a.label.localeCompare(b.label));
            setAvailableVariants(variantsData);

            const currentSelectedLabel =
              localStorage.getItem(`markdownVariant:${file.name}`) ||
              selectedVariant;
            const variantLabels = variantsData.map((v) => v.label);
            let initialVariantLabel = currentSelectedLabel;

            if (
              !initialVariantLabel ||
              !variantLabels.includes(initialVariantLabel)
            ) {
              // Check for "Marker" instead of "Source File"
              initialVariantLabel = variantLabels.includes("Marker")
                ? "Marker"
                : variantLabels[0];
            }

            if (initialVariantLabel !== selectedVariant) {
              setSelectedVariant(initialVariantLabel);
              localStorage.setItem(
                `markdownVariant:${file.name}`,
                initialVariantLabel
              );
              const selectedVariantData = variantsData.find(
                (v) => v.label === initialVariantLabel
              );
              if (
                selectedVariantData &&
                selectedVariantData.path !== selectedFilePath
              ) {
                setSelectedFilePath(selectedVariantData.path);
              }
            } else {
              const selectedVariantData = variantsData.find(
                (v) => v.label === initialVariantLabel
              );
              if (
                selectedVariantData &&
                selectedVariantData.path !== selectedFilePath
              ) {
                setSelectedFilePath(selectedVariantData.path);
              }
            }
          } else {
            console.log(
              `(Effect 1) No markdown files or source file found for base name: ${baseName}`
            );
            if (!error)
              setError(
                `No markdown variants or source file found for ${originalFileName}.`
              );
            setAvailableVariants([]);
            setSelectedVariant(null);
            setSelectedFilePath(null);
          }
        }
      } catch (err) {
        console.error("(Effect 1) Error fetching variant list:", err);
        setError(err.message);
        setAvailableVariants([]);
        setSelectedVariant(null);
        setSelectedFilePath(null);
      } finally {
        setLoadingVariants(false);
      }
    };

    fetchVariantList();
  }, [file]);

  // Effect 2: Find the selected file path when selectedVariant or availableVariants change
  useEffect(() => {
    if (!selectedVariant || availableVariants.length === 0) {
      if (selectedFilePath !== null) {
        setSelectedFilePath(null);
      }
      return;
    }

    const selectedVariantData = availableVariants.find(
      (v) => v.label === selectedVariant
    );
    if (selectedVariantData && selectedVariantData.path) {
      if (selectedVariantData.path !== selectedFilePath) {
        console.log(
          `(Effect 2) Setting selectedFilePath for ${selectedVariant}: ${selectedVariantData.path}`
        );
        setSelectedFilePath(selectedVariantData.path);
      }
    } else {
      console.warn(
        `(Effect 2) Could not find path for selected variant: ${selectedVariant}`
      );
      setSelectedFilePath(null);
    }
  }, [selectedVariant, availableVariants, selectedFilePath]);

  // Effect 3: Fetch content when selectedFilePath changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!selectedFilePath) {
        setMarkdown("");
        return;
      }

      setLoadingContent(true);
      setError(null);

      try {
        const fullUrl = `${BASE_URL}/file/${selectedFilePath}`;
        console.log(`(Effect 3) Fetching markdown content from: ${fullUrl}`);

        const response = await fetch(fullUrl, {
          method: "GET",
          headers: { Accept: "text/markdown, text/plain, */*" },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch markdown content (${response.status}): ${response.statusText}`
          );
        }

        const data = await response.text();
        setMarkdown(data);
        if (onVariantChange) {
          onVariantChange(selectedVariant, data);
        }
      } catch (err) {
        console.error("(Effect 3) Error fetching markdown content:", err);
        setError(err.message);
        setMarkdown("");
        if (onVariantChange) {
          onVariantChange(selectedVariant, "");
        }
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [selectedFilePath, selectedVariant, onVariantChange]);

  const isLoading = loadingVariants || loadingContent;

  // Memoize the components configuration to avoid unnecessary re-renders
  const components = useMemo(() => {
    const resolveImagePath = (src) => {
      if (
        !src ||
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("/") ||
        src.startsWith("data:") ||
        !selectedFilePath
      ) {
        return src; // Return original src if absolute, root-relative, data URI, or no file path
      }

      try {
        // Calculate base directory of the markdown file
        const lastSlashIndex = selectedFilePath.lastIndexOf("/");
        const baseDir =
          lastSlashIndex > -1
            ? selectedFilePath.substring(0, lastSlashIndex + 1)
            : ""; // Ensure trailing slash

        // URL-encode directory path segments and filename separately
        const encodedBaseDir = baseDir
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        const encodedSrc = src.split("/").map(encodeURIComponent).join("/");

        const imageUrl = `${BASE_URL}/file/${encodedBaseDir}${encodedSrc}`;
        console.log(
          `Resolving image: Original src='${src}', Resolved URL='${imageUrl}'`
        );
        return imageUrl;
      } catch (error) {
        console.error("Error resolving image path:", error);
        return src; // Fallback to original src on error
      }
    };

    return {
      code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        return !inline && match ? (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            {...props}>
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      // Custom image renderer
      img: ({ node, ...props }) => {
        const resolvedSrc = resolveImagePath(props.src);
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        return <img {...props} src={resolvedSrc} />;
      },
      // Custom table renderer to handle overflow
      table: ({ node, ...props }) => (
        <Box
          sx={{
            overflowX: "auto",
            my: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}>
          <table {...props} style={{ minWidth: "100%" }} />
        </Box>
      ),
    };
  }, [selectedFilePath]); // Dependency: Re-create components object when selectedFilePath changes

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" variant="body1">
          Error: {error}
        </Typography>
      </Box>
    );
  }

  if (!markdown) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="textSecondary" variant="body1">
          No markdown content available. Try processing the document first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
      }}>
      {availableVariants.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 1,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            flexShrink: 0,
          }}>
          {availableVariants.map((variant) => (
            <Chip
              key={variant.key}
              label={variant.label}
              color={selectedVariant === variant.label ? "primary" : "default"}
              onClick={() => {
                if (variant.label !== selectedVariant) {
                  console.log(
                    "Chip clicked, setting selectedVariant to:",
                    variant.label
                  );
                  setSelectedVariant(variant.label);
                  if (file && file.name) {
                    localStorage.setItem(
                      `markdownVariant:${file.name}`,
                      variant.label
                    );
                  }
                }
              }}
              sx={{ cursor: "pointer", m: 0.5 }}
            />
          ))}
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          flex: 1, // Allow it to fill available vertical space, constrained by maxHeight
          overflowY: "auto", // Primary scrollbar is vertical for the Paper
          overflowX: "hidden", // Prevent Paper itself from having horizontal scroll
          maxHeight:
            availableVariants.length > 0 ? "calc(100% - 70px)" : "100%",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          fontSize: "0.9rem",
          lineHeight: 1.6,
          // Keep internal element styles the same
          "& img": { maxWidth: "100%", borderRadius: 1, my: 1 },
          "& pre": {
            borderRadius: 1,
            overflow: "auto",
            fontSize: "0.8rem", // Slightly smaller code font
            lineHeight: 1.45,
            p: 1.5, // Reduced padding
            my: 1.5, // Reduced margin
            bgcolor: "background.default",
            border: 1,
            borderColor: "divider",
          },
          "& blockquote": {
            borderLeft: "4px solid",
            borderColor: "primary.main",
            pl: 1.5, // Reduced padding
            my: 1, // Reduced margin
            color: "text.secondary",
            fontSize: "0.9rem", // Smaller blockquote font
            bgcolor: "action.hover",
            p: 1, // Reduced padding
            borderRadius: 1,
          },
          "& p": {
            fontSize: "0.9rem", // Smaller paragraph font
            lineHeight: 1.6, // Adjusted line height
            mb: 1, // Reduced margin
          },
          "& h1": {
            fontSize: "1.6rem", // Smaller H1
            mt: 3,
            mb: 1.5,
            fontWeight: 700,
            borderBottom: 1,
            borderColor: "divider",
            pb: 0.4,
          },
          "& h2": {
            fontSize: "1.4rem", // Smaller H2
            mt: 2.5,
            mb: 1.25,
            fontWeight: 600,
            borderBottom: 1,
            borderColor: "divider",
            pb: 0.4,
          },
          "& h3": { fontSize: "1.25rem", mt: 2, mb: 1, fontWeight: 600 }, // Smaller H3
          "& h4": { fontSize: "1.1rem", mt: 1.75, mb: 0.75, fontWeight: 600 }, // Smaller H4
          "& h5": { fontSize: "1rem", mt: 1.5, mb: 0.5, fontWeight: 600 }, // Smaller H5
          "& h6": { fontSize: "0.9rem", mt: 1.25, mb: 0.5, fontWeight: 600 }, // Smaller H6
          "& ul, & ol": {
            pl: 2.5, // Adjusted padding
            mb: 1, // Reduced margin
            "& li": {
              mb: 0.5, // Reduced margin
              lineHeight: 1.5, // Adjusted line height
              fontSize: "0.9rem", // Ensure list items match paragraph size
            },
          },
          "& a": {
            color: "primary.main",
            textDecoration: "underline",
            fontWeight: 500,
            "&:hover": {
              color: "primary.dark",
              textDecorationThickness: "2px",
            },
          },
          "& hr": {
            my: 2, // Reduced margin
            border: 0,
            borderTop: "1px solid",
            borderColor: "divider",
          },
          "& code": {
            bgcolor: "action.selected",
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: "0.8em", // Make inline code slightly smaller relative to surrounding text
            fontFamily: "monospace",
          },
          "& pre > code": {
            bgcolor: "transparent",
            px: 0,
            py: 0,
            borderRadius: 0,
            fontSize: "inherit", // Inherit from pre
            fontFamily: "inherit",
          },
          // Styles for table *inside* the custom wrapper
          "& table": {
            borderCollapse: "collapse",
            width: "auto",
            minWidth: "100%",
            fontSize: "0.85rem", // Smaller table font
            // border is on the wrapper Box
          },
          "& th, & td": {
            border: "1px solid",
            borderColor: "divider",
            p: 1, // Reduced cell padding
            fontSize: "0.85rem", // Smaller cell font
            textAlign: "left",
            whiteSpace: "nowrap",
          },
          "& th": {
            fontWeight: 600,
            bgcolor: "action.hover",
          },
        }}>
        {/* Add a wrapper Box for horizontal scrolling of the content */}
        <Box
          sx={{
            maxWidth: "80ch", // Limit content width (adjust value as needed)
            mx: "auto", // Center the content box if Paper is wider
            overflowX: "auto", // Allow horizontal scroll *within* this Box
            minWidth: 0, // Ensure flexbox doesn't force it wider
          }}>
          <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </Box>
      </Paper>
    </Box>
  );
};

export default MarkdownPreview;
