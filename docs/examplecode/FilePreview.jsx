import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import { Document, Page, pdfjs } from "react-pdf";
import {
  Box,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Chip, // Import Chip if not already (it was missing in the provided snippet but used later)
} from "@mui/material";
import AIFeatures from "./AIFeatures";
import AI2 from "./AI2"; // Import the new AI2 component
import MarkdownPreview from "./MarkdownPreview";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { BASE_URL } from "../config/config";

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Helper component for Tab Panels
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`file-preview-tabpanel-${index}`}
      aria-labelledby={`file-preview-tab-${index}`}
      {...other}
      style={{ height: "100%" }} // Ensure panel takes height if needed
    >
      {value === index && (
        <Box sx={{ height: "100%", p: value >= 3 ? 0 : 2 }}>{children}</Box>
      )}
    </div>
  );
}

function FilePreview({ file, metadata = null }) {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [currentDir, setCurrentDir] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [markdownContent, setMarkdownContent] = useState("");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Reset to preview tab and update directory when file changes
  useEffect(() => {
    setActiveTab(0);
    if (file?.path) {
      const pathParts = file.path.split(/[\\\/]/);
      console.log("filepath", file.path);
      console.log("pathparts", pathParts);
      pathParts.pop(); // Remove filename
      setCurrentDir(pathParts.join("/") || "Root directory");
      console.log("dirpath", pathParts.join("/"));
    } else if (file?.name) {
      const pathParts = file.name.split(/[\\\/]/);
      pathParts.pop(); // Remove filename
      console.log("Path parts:", pathParts);
      setCurrentDir(
        pathParts.length > 0 ? pathParts.join("/") : "Root directory"
      );
    }
  }, [file]);

  // Memoize the onVariantChange handler
  const handleVariantChange = useCallback((variant, content) => {
    console.log("Selected variant in FilePreview:", variant);
    setSelectedVariant(variant);
    setMarkdownContent(content);
  }, []); // Empty dependency array means this function's identity is stable

  if (!file) return null;

  const isPDF = file.name.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file.name);

  const renderPreview = () => {
    // Ensure file.path is used for the endpoint
    const filePath = file.path || file.name; // Fallback to name if path isn't available, though path is preferred

    if (isPDF) {
      return (
        <Document
          file={`${BASE_URL}/file/${filePath}`} // Use /file/ endpoint with full path
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(error) => setError(error.message)}
          loading={<CircularProgress />}>
          <Page pageNumber={1} width={300} />
        </Document>
      );
    } else if (isImage) {
      return (
        <img
          src={`${BASE_URL}/file/${filePath}`} // Use /file/ endpoint with full path
          alt={file.name}
          style={{
            maxWidth: "300px",
            maxHeight: "45vh",
          }}
        />
      );
    } else {
      return (
        <Typography variant="body1" color="textSecondary">
          Preview not available for this file type
        </Typography>
      );
    }
  };

  const renderMetadataPanel = () => {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          overflow: "auto",
        }}>
        <Typography variant="subtitle1" gutterBottom>
          File Information
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Filename
          </Typography>
          <Typography variant="body1">{file.name}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Directory
          </Typography>
          <Typography variant="body1">
            {currentDir || "Root directory"}
          </Typography>
        </Box>

        {file.size !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Size
            </Typography>
            <Typography variant="body1">
              {file.size < 1024
                ? `${file.size} bytes`
                : file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(2)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
            </Typography>
          </Box>
        )}

        {file.modified && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Last Modified
            </Typography>
            <Typography variant="body1">
              {new Date(file.modified * 1000).toLocaleString()}
            </Typography>
          </Box>
        )}

        {/* File type information */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Type
          </Typography>
          <Typography variant="body1">
            {isPDF
              ? "PDF Document"
              : isImage
              ? "Image"
              : file.name.split(".").pop().toUpperCase()}
          </Typography>
        </Box>

        {/* Display extracted metadata if available */}
        {metadata && metadata.metadata && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Extracted Metadata
            </Typography>

            {metadata.metadata.word_count !== undefined && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Word Count
                </Typography>
                <Typography variant="body1">
                  {metadata.metadata.word_count.toLocaleString()}
                </Typography>
              </Box>
            )}

            {metadata.metadata.character_count !== undefined && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Character Count
                </Typography>
                <Typography variant="body1">
                  {metadata.metadata.character_count.toLocaleString()}
                </Typography>
              </Box>
            )}

            {metadata.metadata.line_count !== undefined && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Line Count
                </Typography>
                <Typography variant="body1">
                  {metadata.metadata.line_count.toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        pt: 2,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)", // Example height, adjust as needed
      }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="File preview tabs">
          <Tab
            label="Preview"
            id="file-preview-tab-0"
            aria-controls="file-preview-tabpanel-0"
          />
          <Tab
            label="Info"
            id="file-preview-tab-1"
            aria-controls="file-preview-tabpanel-1"
          />
          <Tab
            label="Markdown"
            id="file-preview-tab-2"
            aria-controls="file-preview-tabpanel-2"
          />
          <Tab
            label="AI Analysis"
            id="file-preview-tab-3"
            aria-controls="file-preview-tabpanel-3"
          />
          <Tab
            label="AI Chat"
            id="file-preview-tab-4"
            aria-controls="file-preview-tabpanel-4"
          />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        <TabPanel value={activeTab} index={0}>
          <Paper
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minHeight: "300px",
            }}>
            <Typography variant="subtitle1" gutterBottom align="center">
              Document Preview
            </Typography>
            {error ? (
              <Typography color="error">{error}</Typography>
            ) : (
              renderPreview()
            )}
            {isPDF && metadata && metadata.has_markdown && (
              <Chip
                label="Markdown Available"
                color="primary"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => setActiveTab(2)}
              />
            )}
          </Paper>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              overflow: "auto", // Add height/overflow if needed
            }}>
            {renderMetadataPanel()}
          </Paper>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <MarkdownPreview file={file} onVariantChange={handleVariantChange} />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {selectedVariant && markdownContent ? (
            <AIFeatures
              selectedVariant={selectedVariant}
              file={file}
              markdownContent={markdownContent}
            />
          ) : (
            <Typography sx={{ p: 2 }}>
              Select a Markdown variant first.
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          {selectedVariant && markdownContent ? (
            <AI2
              selectedVariant={selectedVariant}
              file={file}
              markdownContent={markdownContent}
            />
          ) : (
            <Typography sx={{ p: 2 }}>
              Select a Markdown variant first.
            </Typography>
          )}
        </TabPanel>
      </Box>
    </Box>
  );
}

export default FilePreview;
