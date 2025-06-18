// Test Google GenAI import
import { GoogleGenerativeAI } from "@google/genai";

console.log("GoogleGenerativeAI:", typeof GoogleGenerativeAI);

// Test creating an instance with a dummy key
try {
  const testAI = new GoogleGenerativeAI("test-key");
  console.log("Instance created:", typeof testAI);
  console.log("Has getGenerativeModel:", typeof testAI.getGenerativeModel);
  console.log(
    "Methods:",
    Object.getOwnPropertyNames(Object.getPrototypeOf(testAI))
  );
} catch (error) {
  console.error("Error creating instance:", error);
}

export default function testGemini() {
  return "Test completed";
}
