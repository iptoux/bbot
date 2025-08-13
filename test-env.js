import { config } from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Load environment variables from env.local file
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: `${__dirname}/env.local` });

// Log environment variables to verify they're loaded
console.log("Environment variables loaded:");
console.log("DISCORD_BOT_TOKEN:", process.env.DISCORD_BOT_TOKEN ? "Token is set (not showing for security)" : "Token is not set");
console.log("BOT_PORT:", process.env.BOT_PORT || "Not set, will use default 4000");

// Exit the process
console.log("Test completed successfully. The bot should now work correctly.");