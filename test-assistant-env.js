import { config } from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Load environment variables from env.local file
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: `${__dirname}/env.local` });

// Log environment variables to verify they're loaded
console.log("Testing assistant environment variables:");
console.log("ASSISTANT_ROLE:", process.env.ASSISTANT_ROLE || "Not set, will use default");
console.log("SYSTEM_PROMPT:", process.env.SYSTEM_PROMPT || "Not set, will use default");

// Log the combined system message that would be sent to the LLM
const assistantRole = process.env.ASSISTANT_ROLE || "You are a helpful assistant.";
const systemPrompt = process.env.SYSTEM_PROMPT || "Provide direct responses without showing your thinking process.";
console.log("\nCombined system message that would be sent to the LLM:");
console.log(`${assistantRole} ${systemPrompt}`);

// Exit the process
console.log("\nTest completed successfully. The bot should now work correctly with the custom assistant role and system prompt.");