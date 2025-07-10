import { AI_QUERIES } from "@/app/api/ai/config";
import { getTeamForUser } from "@/lib/db/queries";
import { getKiSettings } from "@/lib/ai/settings";

// Define interface for KI settings
interface KiSettings {
  kiFramework: string;
  bearer: string;
  workModel: string;
  elaborateModel: string;
  classifierModel: string;
  baseUrl: string;
  encryptionKey: string;
}

/**
 * Read KI-Einstellungen from DB for Uniinfer
 */
async function loadKiEinstellungen(): Promise<KiSettings> {
  try {
    const team = await getTeamForUser();
    if (!team) throw new Error("User not authenticated");

    const settings = await getKiSettings(team.id);
    if (!settings) {
      console.warn("KI-Einstellungen not found, using defaults");
      return {
        kiFramework: "uniinfer",
        bearer: process.env.UNIINFER_API_KEY || "",
        workModel: "gpt-3.5-turbo",
        elaborateModel: "gpt-4",
        classifierModel: "gpt-3.5-turbo",
        baseUrl: process.env.UNIINFER_BASE_URL || "https://api.uniinfer.com/v1",
        encryptionKey: "",
      };
    }
    console.log("Loaded KI settings:", { ...settings, bearer: "[REDACTED]" });
    return settings as KiSettings;
  } catch (error) {
    console.error("Error loading KI settings:", error);
    // Return default settings if loading fails
    return {
      kiFramework: "uniinfer",
      bearer: process.env.UNIINFER_API_KEY || "",
      workModel: "gpt-3.5-turbo",
      elaborateModel: "gpt-4",
      classifierModel: "gpt-3.5-turbo",
      baseUrl: process.env.UNIINFER_BASE_URL || "https://api.uniinfer.com/v1",
      encryptionKey: "",
    };
  }
}

/**
 * Initialize the Uniinfer client using dynamic settings
 */
const initializeUniinferClient = async () => {
  const settings = await loadKiEinstellungen();
  if (!settings.bearer) {
    throw new Error("Bearer token not configured in KI-Einstellungen");
  }
  console.log(
    "Initializing Uniinfer client with bearer token length:",
    settings.bearer.length
  );

  // Dynamic import to avoid issues with server-side rendering
  const { OpenAI } = await import("openai");
  
  // Initialize OpenAI client with Uniinfer settings
  const client = new OpenAI({
    apiKey: settings.bearer,
    baseURL: settings.baseUrl,
  });
  console.log("Uniinfer client instance created:", typeof client, !!client.chat);
  return client;
};

/**
 * Stream response from Uniinfer API with the given query and context
 * @param {string} queryType - The type of query to use from AI_QUERIES
 * @param {string} context - The text content to analyze
 * @param {function} onChunk - Callback function to handle each chunk of the stream
 * @param {function} onComplete - Callback function called when streaming completes, receives the full raw response string
 * @param {function} onError - Callback function for error handling
 */
export const streamUniinferResponse = async (
  queryType: string,
  context: string,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string) => void,
  onError: (error: string) => void
) => {
  try {
    console.log("Starting Uniinfer stream with queryType:", queryType);
    const client = await initializeUniinferClient();
    console.log("AI client initialized:", typeof client, !!client.chat);
    const settings = await loadKiEinstellungen();

    const query = AI_QUERIES[queryType] || AI_QUERIES.ASSISTANT;
    const prompt = `${query}\n\nContext:\n${context}`;

    console.log("Using model:", settings.workModel || "gpt-3.5-turbo");
    let fullResponse = "";

    // Generate content stream using OpenAI API
    const stream = await client.chat.completions.create({
      model: settings.workModel || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    // Process the stream
    for await (const chunk of stream) {
      const chunkText = chunk.choices[0]?.delta?.content || "";
      fullResponse += chunkText;
      onChunk(chunkText);
    }

    onComplete(fullResponse);
    return fullResponse;
  } catch (err: unknown) {
    console.error("Uniinfer stream error:", err);
    const errorMessage = err instanceof Error ? err.message : "Uniinfer stream error";
    onError(errorMessage);
    return null;
  }
};
