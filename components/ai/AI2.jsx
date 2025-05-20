import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { streamGeminiResponseWithPrompt } from "../utils/geminiApi"; // Use the new function

/**
 * Component for interactive AI chat based on the selected variant
 * @param {Object} props - Component props
 * @param {string} props.selectedVariant - The currently selected variant name
 * @param {Object} props.file - File object containing name and other metadata
 * @param {string} props.markdownContent - The raw markdown content from the selected variant
 */
const AI2 = ({ selectedVariant, file, markdownContent }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [analysisStarted, setAnalysisStarted] = useState(false);

  // Maximum number of characters to send to the API
  const MAX_CONTEXT_LENGTH = 4000; // Keep context limit

  useEffect(() => {
    // Reset state when variant changes
    if (selectedVariant) {
      setStreamingResponse("");
      setAnalysisStarted(false);
      setError(null);
      setQuery(""); // Clear query field too
    }
  }, [selectedVariant]);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSubmitQuery = async () => {
    if (!markdownContent || !query.trim()) return;

    setLoading(true);
    setError(null);
    setStreamingResponse(""); // Clear previous response
    setAnalysisStarted(true);

    const limitedContext = markdownContent.substring(0, MAX_CONTEXT_LENGTH);

    try {
      await streamGeminiResponseWithPrompt(
        // Use the new API function
        query, // Pass the custom query from the input field
        limitedContext,
        (chunk) => {
          setStreamingResponse((prev) => prev + chunk);
        },
        () => {
          setLoading(false);
        },
        (errorMsg) => {
          setLoading(false);
          setError(errorMsg);
        }
      );
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to analyze content");
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent default Enter behavior (new line)
      handleSubmitQuery();
    }
  };

  return (
    <Box
      sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <AutoAwesomeIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">AI Chat</Typography>
        {selectedVariant && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            (Context: {selectedVariant})
          </Typography>
        )}
      </Box>

      {/* Response Area */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2, // Margin bottom to separate from input
          border: 1,
          borderColor: "grey.300",
          borderRadius: 1,
          bgcolor: "background.paper",
          flexGrow: 1, // Make response area fill available space
          overflowY: "auto", // Allow scrolling for long responses
          minHeight: "150px",
        }}>
        {loading &&
          !streamingResponse && ( // Show loading indicator only initially
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Generating response...
              </Typography>
            </Box>
          )}

        {error && !loading && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && !analysisStarted && (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", mt: 4 }}>
            Enter a query below to ask the AI about the content of '
            {selectedVariant || "the selected variant"}'.
          </Typography>
        )}

        {/* Display streaming response */}
        {(streamingResponse || (loading && analysisStarted)) && !error && (
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-line",
              fontFamily: "monospace", // Optional: keep monospace for AI output
              fontSize: "0.875rem",
            }}>
            {streamingResponse}
            {loading && <span className="blinking-cursor">|</span>}{" "}
            {/* Optional: Blinking cursor */}
          </Typography>
        )}
      </Paper>

      {/* Input Area */}
      <Box sx={{ display: "flex", alignItems: "center", mt: "auto" }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder={`Ask something about "${
            selectedVariant || "document"
          }"...`}
          value={query}
          onChange={handleQueryChange}
          onKeyPress={handleKeyPress} // Add Enter key listener
          disabled={loading || !markdownContent}
          multiline
          maxRows={4} // Allow some vertical expansion
          sx={{ mr: 1 }}
        />
        <Tooltip title="Send Query (Enter)">
          <span>
            {" "}
            {/* Span needed for tooltip when button is disabled */}
            <IconButton
              color="primary"
              onClick={handleSubmitQuery}
              disabled={loading || !markdownContent || !query.trim()}>
              <SendIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, textAlign: "right" }}>
        Context limited to first {MAX_CONTEXT_LENGTH} characters.
      </Typography>

      {/* Add CSS for blinking cursor if desired */}
      <style>{`
        .blinking-cursor {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </Box>
  );
};

export default AI2;
