import { GoogleGenAI } from "@google/genai";
import { AI_QUERIES } from "@/app/api/ai/config";
import { getTeamForUser, getAppSetting } from "@/lib/db/queries";

/** 
 * Read KI-Einstellungen from DB  
 */
async function loadKiEinstellungen() {
  const team = await getTeamForUser();
  if (!team) throw new Error("User not authenticated");
  const record = await getAppSetting(team.id, "kiEinstellungen");
  if (!record) throw new Error("KI-Einstellungen nicht gefunden");
  return record.value;
}

/**
 * Initialize the Google GenAI client using dynamic settings
 */
const initializeGeminiAI = async () => {
  const { bearer } = await loadKiEinstellungen();
  // Initialize new unified Google GenAI client
  return new GoogleGenAI({ apiKey: bearer });
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
    const ai = await initializeGeminiAI();
    const settings = await loadKiEinstellungen();

    const query = AI_QUERIES[queryType] || AI_QUERIES.COMPREHENSIVE;
    const prompt = `${query}\n\nContext:\n${context}`;

    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };

    let fullResponse = "";

    // Use the unified streaming API
    const result = await ai.models.generateContentStream({
      model: settings.workModel,
      contents: prompt,
      config: generationConfig,
    });

    // Process the stream
    for await (const responseChunk of result) {
      const txt = responseChunk.text || "";
      fullResponse += txt;
      onChunk(txt);
    }

    onComplete(fullResponse); // Pass raw full response
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

    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };

    let fullResponse = "";

    // Use the unified streaming API
    const result = await ai.models.generateContentStream({
      model: settings.elaborateModel,
      contents: fullPrompt,
      config: generationConfig,
    });

    // Process the stream
    for await (const responseChunk of result) {
      const txt = responseChunk.text || "";
      fullResponse += txt;
      onChunk(txt);
    }

    onComplete(fullResponse); // Pass raw full response
    return fullResponse;
  } catch (err) {
    console.error("Gemini custom-prompt error:", err);
    onError(err.message || "Gemini custom-prompt error");
    return null;
  }
};
