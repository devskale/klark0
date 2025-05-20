import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { streamGeminiResponse } from "../utils/geminiApi";
import { AI_QUERIES } from "../config/api";

/**
 * Component for displaying AI features and analysis based on the selected variant
 * @param {Object} props - Component props
 * @param {string} props.selectedVariant - The currently selected variant name
 * @param {Object} props.file - File object containing name and other metadata
 * @param {string} props.markdownContent - The raw markdown content from the selected variant
 */
const AIFeatures = ({ selectedVariant, file, markdownContent }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryType, setQueryType] = useState("COMPREHENSIVE");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [analysisStarted, setAnalysisStarted] = useState(false);

  // Maximum number of characters to send to the API
  const MAX_CONTEXT_LENGTH = 4000;

  useEffect(() => {
    console.log("AIFeatures component received variant:", selectedVariant);
    if (selectedVariant) {
      setStreamingResponse("");
      setAnalysisStarted(false);
      setError(null);
    }
  }, [selectedVariant]);

  const fetchAIAnalysis = async () => {
    if (!markdownContent) return;

    setLoading(true);
    setError(null);
    setStreamingResponse("");
    setAnalysisStarted(true);

    const limitedContext = markdownContent.substring(0, MAX_CONTEXT_LENGTH);

    try {
      await streamGeminiResponse(
        queryType,
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

  const handleQueryTypeChange = (event) => {
    setQueryType(event.target.value);
  };

  const handleStartAnalysis = () => {
    if (selectedVariant && markdownContent) {
      fetchAIAnalysis();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          justifyContent: "space-between",
        }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <AutoAwesomeIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">AI Analysis</Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
            <InputLabel id="query-type-label">Analysis Type</InputLabel>
            <Select
              labelId="query-type-label"
              id="query-type-select"
              value={queryType}
              label="Analysis Type"
              onChange={handleQueryTypeChange}
              disabled={loading}>
              {Object.keys(AI_QUERIES).map((key) => (
                <MenuItem key={key} value={key}>
                  {key.charAt(0) + key.slice(1).toLowerCase().replace("_", " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip
            label="Start Analysis"
            color="primary"
            onClick={handleStartAnalysis}
            disabled={loading || !markdownContent}
            sx={{ cursor: loading || !markdownContent ? "default" : "pointer" }}
          />
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: 1,
          borderColor: "grey.300",
          borderRadius: 1,
          bgcolor: "background.paper",
          minHeight: "150px",
        }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}>
          <Typography variant="subtitle1">Selected Variant</Typography>
          <Chip
            label={selectedVariant}
            color="primary"
            size="small"
            sx={{ fontWeight: "medium" }}
          />
        </Box>
        <Divider sx={{ my: 1.5 }} />

        {loading && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 2,
            }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Generating analysis...
            </Typography>
          </Box>
        )}

        {error && !loading && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && !analysisStarted && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Click "Start Analysis" to generate insights for the selected
            variant.
          </Typography>
        )}

        {analysisStarted && !error && (
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-line",
              mt: loading ? 0 : 1,
              fontFamily: "monospace",
              fontSize: "0.875rem",
            }}>
            {streamingResponse || (!loading ? "No response generated." : "")}
          </Typography>
        )}
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        AI analysis is based on the first {MAX_CONTEXT_LENGTH} characters of the
        selected variant's content. Select different variants or analysis types
        for alternative perspectives.
      </Typography>
    </Box>
  );
};

export default AIFeatures;
