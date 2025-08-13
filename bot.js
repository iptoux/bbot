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
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    if (message.author.tag.toLowerCase() == "volkan" && message.content.startsWith() == "!llm") {
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
            
            // Create a stream for the OpenAI response
            const stream = await openai.chat.completions.create({
                model: modelName,
                messages: [
                    { 
                        role: "system", 
                        content: `${ASSISTANT_ROLE} ${SYSTEM_PROMPT}`
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
            } else {
                await responseMessage.edit("No response generated. Please try again.");
            }
        } catch (error) {
            const apiType = isUsingLMStudio ? "LM Studio API" : "OpenAI API";
            console.error(`Error with ${apiType}:`, error);
            
            let errorMessage = "Sorry, there was an error processing your request. Please try again later.";
            
            // Add more specific error message for LM Studio
            if (isUsingLMStudio) {
                errorMessage += " Make sure LM Studio is running and the API server is enabled.";
            }
            
            message.reply(errorMessage);
        }
    }



    if (message.content.toLowerCase().includes("angular")) {
        const responseMessage = await message.reply(randomJoke(angularJokes));
    }

    if (message.content.toLowerCase().includes("concrete5")) {
        const responseMessage = await message.reply(randomJoke(concrete5Jokes));
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
