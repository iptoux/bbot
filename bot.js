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
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "API Key is set (not showing for security)" : "API Key is not set");
console.log("OPENAI_MODEL:", process.env.OPENAI_MODEL || "Not set, will use default model");
console.log("LM_STUDIO_API_URL:", process.env.LM_STUDIO_API_URL || "Not set, will use OpenAI API");
console.log("ASSISTANT_ROLE:", process.env.ASSISTANT_ROLE || "Not set, will use default assistant role");
console.log("SYSTEM_PROMPT:", process.env.SYSTEM_PROMPT || "Not set, will use default system prompt");

import express from "express";
import cors from "cors";
import { Client, GatewayIntentBits } from "discord.js";
import OpenAI from "openai";
import { 
    initUserMemory, 
    generateUserContext, 
    addUserInteraction, 
    extractUserFacts,
    formatUserDataForDisplay,
    deleteUserData,
    addUserFact,
    setUserPreference
} from "./userMemory.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const PORT = process.env.BOT_PORT || 4000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "openai/gpt-oss-20b";
const LM_STUDIO_API_URL = process.env.LM_STUDIO_API_URL;
const ASSISTANT_ROLE = process.env.ASSISTANT_ROLE || "You are a helpful assistant.";
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "Provide direct responses without showing your thinking process. Do not include any deliberation, multiple options, or reasoning in your response. Just provide the final answer.";

const wordpressJokes = [
    "Das Ikea-Regal unter den CMS – passt immer irgendwie, wackelt aber manchmal.",
    "Plug-in Roulette: Welches bricht heute alles?",
    "WordPress – wo Updates wie Überraschungseier sind: Spannung, Spiel und… kaputte Website.",
    "WordPress – weil 80% der Webseiten sich nicht selbst kaputt machen.",
    "Das CMS, das aus 'nur mal kurz bloggen' eine lebenslange Wartung macht.",
    "WordPress-Update: 1 Minute runterladen, 3 Stunden Fehler beheben."
];

const phpJokes = [
    "Pretty Hopeless Programming?",
    "PHP – der Code, den du 2005 geschrieben hast, läuft immer noch. Und das ist das Problem.",
    "PHP ist wie Pizza mit Ananas: polarisiert, aber läuft trotzdem.",
    "PHP – wie ein altes Sofa: nicht schön, aber bequem und steht schon ewig da.",
    "In PHP gibt’s 100 Wege, etwas zu tun – und mindestens 90 davon sind falsch.",
    "PHP – du weißt nie, ob es Magie oder nur ein Bug ist."
];

const angularJokes = [
    "Angular – wie React, nur mit mehr Ritualen.",
    "Angular ist das Ikea-Regal mit 3000 Schrauben – aber die Anleitung ist ein PDF auf Englisch.",
    "Mit Angular brauchst du keinen Escape Room – der Code ist der Escape Room.",
    "Angular: Weil wir alle heimlich DI (Dependency Injection) lieben.",
    "Mit Angular fängst du klein an – und landest in einer Ordnerstruktur mit eigener Postleitzahl.",
    "Angular – das Framework, das dich mehr über Interfaces als über deine App nachdenken lässt."
];

const filemakerJokes = [
    "FileMaker – das Schweizer Taschenmesser der Datenbanken, nur mit eigenem Korkenzieher.",
    "Mit FileMaker kannst du alles bauen – außer vielleicht ein Flugzeug. Oder doch?",
    "FileMaker: Wo Tabellen nicht nur Tabellen sind, sondern auch deine besten Freunde.",
    "FileMaker – der Baukasten für Datenbankfans mit leichtem Kontrollzwang.",
    "FileMaker: Weil Excel irgendwann einfach zu klein wird.",
    "In FileMaker gibt’s keinen Bug – nur ein kreatives Feature mit Persönlichkeit."
];

const concrete5Jokes = [
    "Concrete5 – das CMS, das härter ist als dein Kopf bei der Fehlersuche.",
    "Mit Concrete5 baust du Webseiten so solide, dass sie auch einen Erdbeben-Test bestehen.",
    "Concrete5: Wenn WordPress zu weich und Joomla zu seltsam ist.",
    "Concrete5 – das einzige CMS, bei dem du beim Installieren einen Bauhelm brauchst.",
    "Concrete5: Weil Content-Management auch Beton vertragen kann.",
    "So stabil wie Beton – und manchmal genauso flexibel."
];

const djangoJokes = [
    "Django – wie Zauberei, nur mit mehr Migrationen.",
    "Mit Django kannst du in einer Stunde eine App bauen – und drei Tage das Admin-Panel anpassen.",
    "Django: Weil wir alle heimlich Class-Based Views lieben. Oder hassen. Oder beides.",
    "Django – das Framework, das dich 'makemigrations' im Schlaf tippen lässt.",
    "Mit Django ist alles schnell gebaut – bis du anfängst, das ORM zu optimieren.",
    "Django: Für Leute, die 'batteries included' sehr wörtlich nehmen."
];


function randomJoke(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: LM_STUDIO_API_URL // Use local LM Studio endpoint if provided
});

// Determine if we're using LM Studio or OpenAI
const isUsingLMStudio = !!LM_STUDIO_API_URL;
console.log(`Using ${isUsingLMStudio ? "local LM Studio endpoint" : "OpenAI API"} for LLM requests`);

const app = express();
app.use(cors());
app.use(express.json());

// Persistent bot client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Example: simple notify list
let notifyList = [];

// Bot events
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Initialize user memory system
    await initUserMemory();
    console.log("User memory system ready");
});

client.on("messageCreate", async (message) => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    if (message.content.startsWith("!llm") && message.author.tag.toLowerCase() === "volkan") {
        return message.reply("Sorry, but you have no more credits left, try inviting friends to get 20 credits more!");
    }

    // Check if the bot is mentioned in the message
    if (message.mentions.has(client.user)) {
        console.log("Bot was mentioned in a message");
        return message.reply("Hello! I'm your bot assistant. You can use the !llm command followed by your query to get a response.");
    }
    
    // Check if the message starts with !llm
    if (message.content.startsWith("!llm")) {
        // Extract the prompt from the message
        const prompt = message.content.substring(5).trim();
        
        // If no prompt is provided, ask for one
        if (!prompt) {
            return message.reply("Please provide a message after !llm. Example: !llm Tell me a joke");
        }
        
        try {
            console.log(`Processing LLM request: "${prompt}"`);
            
            // Send initial response to indicate processing
            const responseMessage = await message.reply("Processing your request...");
            
            // For LM Studio, we may need to adjust the model name format
            // LM Studio typically uses the model name without the "openai/" prefix
            let modelName = OPENAI_MODEL;
            if (isUsingLMStudio && modelName.startsWith("openai/")) {
                modelName = modelName.substring(7); // Remove "openai/" prefix
            }
            
            console.log(`Using model: ${modelName}`);
            
            // Retrieve user context from memory
            const userId = message.author.id;
            const username = message.author.username;
            const userContext = await generateUserContext(userId);
            
            // Create system message with user context
            let systemMessage = `${ASSISTANT_ROLE} ${SYSTEM_PROMPT}`;
            if (userContext) {
                systemMessage += `\n\nUser Information:\n${userContext}`;
                console.log(`Retrieved context for user ${username} (${userId})`);
            }
            
            // Create a stream for the OpenAI response
            const stream = await openai.chat.completions.create({
                model: modelName,
                messages: [
                    { 
                        role: "system", 
                        content: systemMessage
                    },
                    { role: "user", content: prompt }
                ],
                stream: true,
            });
            
            console.log("Stream created successfully");
            
            let responseContent = "";
            let lastUpdateTime = Date.now();
            
            // Process the stream
            for await (const chunk of stream) {
                // Get the content from the chunk
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    responseContent += content;
                    
                    // Update the message every 1 second or when we have a substantial amount of new content
                    const currentTime = Date.now();
                    if (currentTime - lastUpdateTime > 1000 || content.includes("\n")) {
                        await responseMessage.edit(responseContent);
                        lastUpdateTime = currentTime;
                    }
                }
            }
            
            // Final update to ensure all content is displayed
            if (responseContent) {
                await responseMessage.edit(responseContent);
                
                // Record the interaction and extract facts
                await addUserInteraction(userId, username, prompt, responseContent);
                await extractUserFacts(userId, prompt, responseContent);
                console.log(`Recorded interaction for user ${username} (${userId})`);
            } else {
                await responseMessage.edit("No response generated. Please try again.");
            }
        } catch (error) {
            const apiType = isUsingLMStudio ? "LM Studio API" : "OpenAI API";
            console.error(`Error with ${apiType}:`, error);
            
            let errorMessage = "Sorry, there was an error processing your request, i informed my Master. Please try again later.";
            
            // Add more specific error message for LM Studio
            if (isUsingLMStudio) {

                const botOwner = await client.users.fetch("248930835250675712")
                const botOwnerMention = await botOwner.send("Error connecting LM Studio, request of User: " + message.author.tag + " with prompt: \"" + prompt + "\" could not be completed.")
                botOwnerMention.react("🐞")
                console.log("Error connecting LM Studio, inform bot owner");

            }
            
            (await (await message.reply(errorMessage)).react("🐞")).react("😒")
        }
    }



    if (message.content.toLowerCase().includes("angular")) {
        const responseMessage = await message.reply(randomJoke(angularJokes));
    }

    if (message.content.toLowerCase().includes("concrete5")) {
        const responseMessage = await message.reply(randomJoke(concrete5Jokes));
    }

    if (message.content.toLowerCase().includes("django")) {
        const responseMessage = await message.reply(randomJoke(djangoJokes));
    }


    if (message.content.toLowerCase().includes("filemaker")) {
        const responseMessage = await message.reply(randomJoke(filemakerJokes));
    }

    if (message.content.toLowerCase().includes("php")) {
        const responseMessage = await message.reply(randomJoke(phpJokes));
    }

    if (message.content.toLowerCase().includes("wordpress")) {
        const responseMessage = await message.reply(randomJoke(wordpressJokes));
    }

    // Handle memory commands
    if (message.content.startsWith("!memory")) {
        const userId = message.author.id;
        const username = message.author.username;
        const command = message.content.substring(8).trim().toLowerCase();
        
        console.log(`Processing memory command: "${command}" for user ${username} (${userId})`);
        
        if (command === "view") {
            try {
                // Send initial response in the channel
                const channelResponse = await message.reply("Retrieving your stored information... I'll send it to you as a private message.");
                
                // Get formatted user data
                const formattedData = await formatUserDataForDisplay(userId);
                
                // Send the data as a private message to the user
                await message.author.send(formattedData);
                
                // Update the channel message to confirm the DM was sent
                await channelResponse.edit("✅ Your stored information has been sent to you as a private message.");
                console.log(`Displayed memory data for user ${username} (${userId}) via DM`);
            } catch (error) {
                console.error("Error displaying user memory:", error);
                message.reply("Sorry, there was an error retrieving your information. Please try again later.");
            }
        } else if (command === "delete") {
            try {
                // Ask for confirmation
                const confirmMessage = await message.reply(
                    "⚠️ **Are you sure you want to delete all your stored information?** ⚠️\n" +
                    "This action cannot be undone. All your stored facts, preferences, and interaction history will be permanently deleted.\n\n" +
                    "Reply with `!confirm-delete` within 30 seconds to confirm deletion."
                );
                
                // Create a filter for the confirmation message
                const filter = m => m.author.id === userId && m.content.trim().toLowerCase() === "!confirm-delete";
                
                // Wait for confirmation
                try {
                    // Wait for the confirmation message for 30 seconds
                    await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
                    
                    // User confirmed, delete the data
                    const deleted = await deleteUserData(userId);
                    
                    if (deleted) {
                        await confirmMessage.edit("✅ All your stored information has been deleted successfully.");
                        console.log(`Deleted memory data for user ${username} (${userId})`);
                    } else {
                        await confirmMessage.edit("No stored information found for your user.");
                    }
                } catch (timeoutError) {
                    // User didn't confirm in time
                    await confirmMessage.edit("Deletion cancelled. Your information remains unchanged.");
                }
            } catch (error) {
                console.error("Error deleting user memory:", error);
                message.reply("Sorry, there was an error deleting your information. Please try again later.");
            }
        } else {
            // Unknown memory command
            message.reply(
                "Unknown memory command. Available commands:\n" +
                "- `!memory view` - View your stored information\n" +
                "- `!memory delete` - Delete all your stored information"
            );
        }
    }
    
    // Handle fact commands
    if (message.content.startsWith("!fact")) {
        const userId = message.author.id;
        const username = message.author.username;
        const commandParts = message.content.substring(6).trim().split(' ');
        const subCommand = commandParts[0].toLowerCase();
        
        console.log(`Processing fact command: "${subCommand}" for user ${username} (${userId})`);
        
        if (subCommand === "add") {
            // Extract the fact from the message (everything after "!fact add ")
            const fact = message.content.substring(10).trim();
            
            if (!fact) {
                return message.reply("Please provide a fact to add. Example: `!fact add I like programming`");
            }
            
            try {
                await addUserFact(userId, fact);
                message.reply(`✅ Fact added: "${fact}"`);
                console.log(`Added fact for user ${username} (${userId}): "${fact}"`);
            } catch (error) {
                console.error("Error adding user fact:", error);
                message.reply("Sorry, there was an error adding your fact. Please try again later.");
            }
        } else {
            // Unknown fact command
            message.reply(
                "Unknown fact command. Available commands:\n" +
                "- `!fact add <fact>` - Add a fact about yourself"
            );
        }
    }
    
    // Handle preference commands
    if (message.content.startsWith("!preference")) {
        const userId = message.author.id;
        const username = message.author.username;
        const commandParts = message.content.substring(12).trim().split(' ');
        const subCommand = commandParts[0].toLowerCase();
        
        console.log(`Processing preference command: "${subCommand}" for user ${username} (${userId})`);
        
        if (subCommand === "set") {
            // Extract the key and value from the message
            const key = commandParts[1];
            const value = commandParts.slice(2).join(' ');
            
            if (!key || !value) {
                return message.reply("Please provide a key and value. Example: `!preference set language German`");
            }
            
            try {
                await setUserPreference(userId, key, value);
                message.reply(`✅ Preference set: "${key}" = "${value}"`);
                console.log(`Set preference for user ${username} (${userId}): "${key}" = "${value}"`);
            } catch (error) {
                console.error("Error setting user preference:", error);
                message.reply("Sorry, there was an error setting your preference. Please try again later.");
            }
        } else {
            // Unknown preference command
            message.reply(
                "Unknown preference command. Available commands:\n" +
                "- `!preference set <key> <value>` - Set a preference"
            );
        }
    }
    
    // Handle cmd command to list all available commands
    if (message.content.startsWith("!cmd")) {
        console.log("Processing !cmd command");
        
        const commandsList = [
            "**Available Commands:**",
            "",
            "**`!cmd`** - Display this list of commands",
            "",
            "**`!llm <prompt>`** - Send a prompt to the AI and get a response",
            "Example: `!llm Tell me a joke about programming`",
            "",
            "**`!memory view`** - View your stored information (sent as a private message)",
            "**`!memory delete`** - Delete all your stored information",
            "",
            "**`!fact add <fact>`** - Add a fact about yourself",
            "Example: `!fact add I like programming`",
            "",
            "**`!preference set <key> <value>`** - Set a preference",
            "Example: `!preference set language German`"
        ].join("\n");
        
        message.reply(commandsList);
    }
});

// API endpoints to control bot
app.post("/notify/add", (req, res) => {
    const { userId } = req.body;
    if (!notifyList.includes(userId)) notifyList.push(userId);
    res.json({ notifyList });
});

app.post("/notify/remove", (req, res) => {
    const { userId } = req.body;
    notifyList = notifyList.filter(id => id !== userId);
    res.json({ notifyList });
});

app.post("/send", async (req, res) => {
    const { channelId, message } = req.body;
    try {
        const channel = await client.channels.fetch(channelId);
        await channel.send(message);
        res.json({ status: "sent" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start bot + API
client.login(TOKEN);
app.listen(PORT, () => console.log(`Bot API listening on port ${PORT}`));
