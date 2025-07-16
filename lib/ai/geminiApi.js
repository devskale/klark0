import { GoogleGenAI } from "@google/genai";
import { AI_QUERIES } from "@/app/api/ai/config";
import { getTeamForUser } from "@/lib/db/queries";
import { getKiSettings } from "@/lib/ai/settings";

/**
 * Read KI-Einstellungen from DB
 */
async function loadKiEinstellungen() {
  try {
    const team = await getTeamForUser();
    if (!team) throw new Error("User not authenticated");

    const settings = await getKiSettings(team.id);
    if (!settings) {
      console.warn("KI-Einstellungen not found, using defaults");
      return {
        kiFramework: "gemini",
        bearer: process.env.GEMINI_API_KEY || "",
        workModel: "gemini-pro",
        elaborateModel: "gemini-pro",
        classifierModel: "gemini-pro",
        baseUrl: "",
        encryptionKey: "",
      };
    }
    console.log("Loaded KI settings:", { ...settings, bearer: "[REDACTED]" });
    return settings;
  } catch (error) {
    console.error("Error loading KI settings:", error);
    // Return default settings if loading fails
    return {
      kiFramework: "gemini",
      bearer: process.env.GEMINI_API_KEY || "",
      workModel: "gemini-pro",
      elaborateModel: "gemini-pro",
      classifierModel: "gemini-pro",
      baseUrl: "",
      encryptionKey: "",
    };
  }
}

/**
 * Initialize the Google GenAI client using dynamic settings
 */
const initializeGeminiAI = async () => {
  const settings = await loadKiEinstellungen();
  if (!settings.bearer) {
    throw new Error("Bearer token not configured in KI-Einstellungen");
  }
  console.log(
    "Initializing GoogleGenAI with bearer token length:",
    settings.bearer.length
  );
  // Initialize Google GenAI client with correct API key
  const ai = new GoogleGenAI({ apiKey: settings.bearer });
  console.log("GoogleGenAI instance created:", typeof ai, !!ai.models);
  return ai;
};

/**
 * Stream response from Gemini API with the given query and context
 * @param {string} queryType - The type of query to use from AI_QUERIES
 * @param {string} context - The text content to analyze
 * @param {function} onChunk - Callback function to handle each chunk of the stream
 * @param {function} onComplete - Callback function called when streaming completes, receives the full raw response string
 * @param {function} onError - Callback function for error handling
 */
export const streamGeminiResponse = async (
  queryType,
  context,
  onChunk,
  onComplete,
  onError
) => {
  try {
    console.log("Starting Gemini stream with queryType:", queryType);
    const ai = await initializeGeminiAI();
    console.log("AI client initialized:", typeof ai, !!ai.models);
    const settings = await loadKiEinstellungen();

    const query = AI_QUERIES[queryType] || AI_QUERIES.ASSISTANT;
    const prompt = `${query}\n\nContext:\n${context}`;

    console.log("Using model:", settings.workModel || "gemini-2.0-flash-001");
    let fullResponse = "";

    // Generate content stream using the new API
    const response = await ai.models.generateContentStream({
      model: settings.workModel || "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 32768,
      },
    });

    // Process the stream
    for await (const chunk of response) {
      const chunkText = chunk.text || "";
      fullResponse += chunkText;
      onChunk(chunkText);
    }

    onComplete(fullResponse);
    return fullResponse;
  } catch (err) {
    console.error("Gemini stream error:", err);
    onError(err.message || "Gemini stream error");
    return null;
  }
};

/**
 * Stream response from Gemini API with a custom prompt and context
 * @param {string} customPrompt - The user-defined prompt string
 * @param {string} context - The text content to analyze or use as context
 * @param {function} onChunk - Callback function to handle each chunk of the stream
 * @param {function} onComplete - Callback function called when streaming completes, receives the full raw response string
 * @param {function} onError - Callback function for error handling
 */
export const streamGeminiResponseWithPrompt = async (
  customPrompt,
  context,
  onChunk,
  onComplete,
  onError
) => {
  try {
    const ai = await initializeGeminiAI();
    const settings = await loadKiEinstellungen();

    // Combine the custom prompt with the provided context
    const fullPrompt = `${customPrompt}\n\nContext:\n${context}`;
    let fullResponse = "";

    // Generate content stream using the new API
    const response = await ai.models.generateContentStream({
      model: settings.elaborateModel || "gemini-2.0-flash-001",
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 32768,
      },
    });

    // Process the stream
    for await (const chunk of response) {
      const chunkText = chunk.text || "";
      fullResponse += chunkText;
      onChunk(chunkText);
    }

    onComplete(fullResponse);
    return fullResponse;
  } catch (err) {
    console.error("Gemini custom-prompt error:", err);
    onError(err.message || "Gemini custom-prompt error");
    return null;
  }
};
