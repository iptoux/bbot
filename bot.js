import { config } from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

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
    setUserPreference,
    getLastInteractionIfRecent,
    addQuizPoints,
    getQuizToplist
} from "./userMemory.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const PORT = process.env.BOT_PORT || 4000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "openai/gpt-oss-20b";
const LM_STUDIO_API_URL = process.env.LM_STUDIO_API_URL;
const ASSISTANT_ROLE = process.env.ASSISTANT_ROLE || "You are a helpful assistant.";
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "Provide direct responses without showing your thinking process. Do not include any deliberation, multiple options, or reasoning in your response. Just provide the final answer.";

// Quiz configuration: answer time limit (seconds)
const QUIZ_ANSWER_SECONDS = Math.max(5, parseInt(process.env.QUIZ_ANSWER_SECONDS, 10) || 20);
const QUIZ_ANSWER_TIME_MS = QUIZ_ANSWER_SECONDS * 1000;

// Quiz configuration: per-user start cooldown (minutes)
const QUIZ_COOLDOWN_MINUTES = Math.max(1, parseInt(process.env.QUIZ_COOLDOWN_MINUTES, 10) || 60);
const QUIZ_COOLDOWN_MS = QUIZ_COOLDOWN_MINUTES * 60 * 1000;

const jokes = {
    wordpress: [
        "Das Ikea-Regal unter den CMS – passt immer irgendwie, wackelt aber manchmal.",
        "Plug-in Roulette: Welches bricht heute alles?",
        "WordPress – wo Updates wie Überraschungseier sind: Spannung, Spiel und… kaputte Website.",
        "WordPress – weil 80% der Webseiten sich nicht selbst kaputt machen.",
        "Das CMS, das aus 'nur mal kurz bloggen' eine lebenslange Wartung macht.",
        "WordPress-Update: 1 Minute runterladen, 3 Stunden Fehler beheben."
    ],
    php: [
        "Pretty Hopeless Programming?",
        "PHP – der Code, den du 2005 geschrieben hast, läuft immer noch. Und das ist das Problem.",
        "PHP ist wie Pizza mit Ananas: polarisiert, aber läuft trotzdem.",
        "PHP – wie ein altes Sofa: nicht schön, aber bequem und steht schon ewig da.",
        "In PHP gibt’s 100 Wege, etwas zu tun – und mindestens 90 davon sind falsch.",
        "PHP – du weißt nie, ob es Magie oder nur ein Bug ist."
    ],
    angular: [
        "Angular – wie React, nur mit mehr Ritualen.",
        "Angular ist das Ikea-Regal mit 3000 Schrauben – aber die Anleitung ist ein PDF auf Englisch.",
        "Mit Angular brauchst du keinen Escape Room – der Code ist der Escape Room.",
        "Angular: Weil wir alle heimlich DI (Dependency Injection) lieben.",
        "Mit Angular fängst du klein an – und landest in einer Ordnerstruktur mit eigener Postleitzahl.",
        "Angular – das Framework, das dich mehr über Interfaces als über deine App nachdenken lässt."
    ],
    filemaker: [
        "FileMaker – das Schweizer Taschenmesser der Datenbanken, nur mit eigenem Korkenzieher.",
        "Mit FileMaker kannst du alles bauen – außer vielleicht ein Flugzeug. Oder doch?",
        "FileMaker: Wo Tabellen nicht nur Tabellen sind, sondern auch deine besten Freunde.",
        "FileMaker – der Baukasten für Datenbankfans mit leichtem Kontrollzwang.",
        "FileMaker: Weil Excel irgendwann einfach zu klein wird.",
        "In FileMaker gibt’s keinen Bug – nur ein kreatives Feature mit Persönlichkeit."
    ],
    concrete5: [
        "Concrete5 – das CMS, das härter ist als dein Kopf bei der Fehlersuche.",
        "Mit Concrete5 baust du Webseiten so solide, dass sie auch einen Erdbeben-Test bestehen.",
        "Concrete5: Wenn WordPress zu weich und Joomla zu seltsam ist.",
        "Concrete5 – das einzige CMS, bei dem du beim Installieren einen Bauhelm brauchst.",
        "Concrete5: Weil Content-Management auch Beton vertragen kann.",
        "So stabil wie Beton – und manchmal genauso flexibel."
    ],
    django: [
        "Django – wie Zauberei, nur mit mehr Migrationen.",
        "Mit Django kannst du in einer Stunde eine App bauen – und drei Tage das Admin-Panel anpassen.",
        "Django: Weil wir alle heimlich Class-Based Views lieben. Oder hassen. Oder beides.",
        "Django – das Framework, das dich 'makemigrations' im Schlaf tippen lässt.",
        "Mit Django ist alles schnell gebaut – bis du anfängst, das ORM zu optimieren.",
        "Django: Für Leute, die 'batteries included' sehr wörtlich nehmen."
    ],
    typescript: [
        "TypeScript – weil wir alle irgendwann Tippfehler satt hatten.",
        "TypeScript: JavaScript mit einem Sicherheitsgurt.",
        "TypeScript – die einzige Sprache, die dir sagt, dass du falsch liegst, bevor du es merkst.",
        "Mit TypeScript ist dein Code sicher… bis du überall `any` benutzt.",
        "TypeScript: Die To-Do-Liste für deinen Compiler.",
        "TypeScript – wie ein strenger Lehrer, der dich aber mag."
    ],
    javascript: [
        "JavaScript – wo `==` und `===` zwei völlig verschiedene Welten sind.",
        "JavaScript: Weil wir nicht genug Chaos im Leben hatten.",
        "Mit JavaScript kannst du alles bauen – auch Kopfschmerzen.",
        "JavaScript – das Schweizer Taschenmesser, das sich manchmal selbst schneidet.",
        "JavaScript: undefined is not a function… und doch irgendwie schon.",
        "JavaScript – wo Datum und Zeit ein eigenes Abenteuer sind."
    ],
    html: [
        "HTML – das Gerüst, das ohne CSS aussieht wie eine Baustelle.",
        "HTML: Wenn du `<blink>` vermisst, bist du offiziell alt.",
        "HTML – einfach, bis du anfängst, alles zu verschachteln.",
        "Mit HTML allein ist eine Website wie ein Buch ohne Bilder.",
        "HTML – die Sprache, die jeder kennt, aber keiner zugeben will.",
        "HTML: Die Mutter aller Webseiten – manchmal streng, manchmal nachsichtig."
    ],
    css: [
        "CSS – wo ein fehlendes Semikolon ganze Welten zerstört.",
        "CSS: Weil Pixel nie da landen, wo du sie willst.",
        "CSS – der Ort, an dem du `!important` als letzte Rettung benutzt.",
        "Mit CSS bist du entweder Gott… oder der Teufel spielt mit deinen Abständen.",
        "CSS: Flexbox – für alle, die gern Puzzles lösen.",
        "CSS – die einzige Sprache, die es schafft, dich wegen 1px in den Wahnsinn zu treiben."
    ]
};

// Zufälligen Witz zu einem Begriff ausgeben
function randomJoke(term, channel) {
    if (channel === "┏〢programmierer-chat") {
        console.log(`Skipping joke for channel "${channel}".`);
        return;
    }
    if (!jokes[term]) {
        console.log(`Keine Witze für "${term}" gefunden.`);
    }
    const list = jokes[term];
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

// Quiz state
const quizSessions = new Map(); // channelId -> session
let quizQuestionsCache = null;
// Rate limit: track when each user last started a quiz (per user, across channels)
const lastQuizStartByUser = new Map();

async function loadQuizQuestions() {
    if (quizQuestionsCache) return quizQuestionsCache;
    try {
        const raw = await fs.readFile(`${__dirname}/quiz-questions.json`, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('quiz-questions.json must be an array');
        quizQuestionsCache = parsed.filter(q => q && q.question && Array.isArray(q.choices) && typeof q.answerIndex === 'number');
    } catch (e) {
        console.error('Failed to load quiz questions:', e.message || e);
        quizQuestionsCache = [];
    }
    return quizQuestionsCache;
}

function formatQuestion(q, index, total) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const lines = [];
    const categorySuffix = q.category ? ` [Kategorie: ${q.category}]` : '';
    lines.push(`Frage ${index + 1}/${total}${categorySuffix}: ${q.question}`);
    lines.push(q.choices.map((opt, i) => `${letters[i]}. ${opt}`).join('\n'));
    lines.push(`Du hast ${QUIZ_ANSWER_SECONDS} Sekunde(n) Zeit zu antworten.`);
    lines.push('Sende den Buchstaben deiner Antwort (A, B, C, ...) einfach hier in den Kanal. Nicht auf die Frage antworten/quoten. Nur deine erste Antwort zählt. Wenn deine Antwort gezählt wurde, reagiert der Bot mit ✅.');
    return lines.join('\n');
}

// Bot events
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Initialize user memory system
    await initUserMemory();
    console.log("User memory system ready");
});

client.on("messageCreate", async (message) => {
    console.log(message.channel.name);

    // Ignore messages from the bot itself
    if (message.author.bot) return;

    if (message.content.startsWith("!llm") && message.author.tag.toLowerCase() === "volkan") {
        return message.reply("Sorry, du hast keine Credits mehr. Lade Freunde ein, um 20 weitere Credits zu erhalten!");
    }

    // Check if the bot is mentioned in the message
    if (message.mentions.has(client.user)) {
        // If a quiz is active in this channel, ignore mentions to avoid interrupting quiz replies
        if (quizSessions.has(message.channel.id)) {
            return; // do not send generic mention reply during quiz
        }
        console.log("Bot was mentioned in a message");
        return message.reply("😏 Oh, du hast mich getaggt… Mutig. Versuch mal !cmd.");
    }

    // QUIZ COMMANDS
    if (message.content.startsWith("!quiz")) {
        const channelId = message.channel.id;
        if (quizSessions.has(channelId)) {
            return message.reply("In diesem Kanal läuft bereits ein Quiz. Bitte warte, bis es beendet ist.");
        }
        // Rate limit: one quiz start per user per configured cooldown (minutes)
        const starterId = message.author.id;
        const now = Date.now();
        const last = lastQuizStartByUser.get(starterId) || 0;
        const elapsed = now - last;
        if (elapsed < QUIZ_COOLDOWN_MS) {
            const remainingMs = QUIZ_COOLDOWN_MS - elapsed;
            const remainingMin = Math.max(1, Math.ceil(remainingMs / 60000));
            const allowedAt = new Date(now + remainingMs);
            const hh = String(allowedAt.getHours()).padStart(2, '0');
            const mm = String(allowedAt.getMinutes()).padStart(2, '0');
            return message.reply(`Du kannst nur alle ${QUIZ_COOLDOWN_MINUTES} Minute(n) ein Quiz starten. Bitte warte noch ca. ${remainingMin} Minute(n) (bis ${hh}:${mm}).`);
        }
        // Record this start time
        lastQuizStartByUser.set(starterId, now);
        const args = message.content.split(/\s+/).slice(1);
        const requested = Math.min(5, Math.max(1, parseInt(args[0], 10) || 5));
        const questions = await loadQuizQuestions();
        if (!questions.length) {
            return message.reply("No quiz questions available. Ask the admin to add quiz-questions.json.");
        }
        // Pick random distinct questions up to requested
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, requested);
        const session = {
            channelId,
            questions: selected,
            currentIndex: 0,
            answersPerQuestion: new Map(), // questionIndex -> Map(userId -> choiceIndex)
            correctCountByUser: new Map(), // userId -> count
            participants: new Set(),
            active: true
        };
        quizSessions.set(channelId, session);
        await message.channel.send(`Quiz startet mit ${selected.length} Frage(n)! Alle können mitmachen. Bonus +2 Punkte, wenn du alle richtig hast.`);
        // Start asking sequentially
        for (let i = 0; i < selected.length; i++) {
            session.currentIndex = i;
            const q = selected[i];
            const prompt = formatQuestion(q, i, selected.length);
            await message.channel.send(prompt);
            const letters = ['A','B','C','D','E','F'];
            const filter = m => !m.author.bot && letters.includes(m.content.trim().toUpperCase()) && m.channel.id === channelId;
            const collected = await message.channel.awaitMessages({ filter, time: QUIZ_ANSWER_TIME_MS }); // konfigurierbare Zeit pro Frage
            const map = new Map();
            collected.forEach(m => {
                const uid = m.author.id;
                if (map.has(uid)) return; // only first answer counts
                const letter = m.content.trim().toUpperCase();
                const idx = letters.indexOf(letter);
                if (idx >= 0) {
                    map.set(uid, idx);
                    session.participants.add(uid);
                    // Acknowledge recognized answer with a checkmark reaction
                    try { m.react('✅').catch(() => {}); } catch {}
                }
            });
            session.answersPerQuestion.set(i, map);
            // Reveal correct answer and who got it right
            const correctIdx = q.answerIndex;
            const winners = [];
            map.forEach((choiceIdx, uid) => {
                if (choiceIdx === correctIdx) {
                    winners.push(uid);
                    session.correctCountByUser.set(uid, (session.correctCountByUser.get(uid) || 0) + 1);
                }
            });
            const correctLetter = letters[correctIdx];
            if (winners.length) {
                const mentions = winners.map(id => `<@${id}>`).join(', ');
                await message.channel.send(`Zeit ist um! Richtige Antwort: ${correctLetter}. Glückwunsch: ${mentions}`);
            } else {
                await message.channel.send(`Zeit ist um! Richtige Antwort: ${correctLetter}. Dieses Mal gab es keine richtigen Antworten.`);
            }
        }
        // Finish quiz: compute points and bonus
        const totalQ = selected.length;
        const results = [];
        session.participants.forEach(uid => {
            const correct = session.correctCountByUser.get(uid) || 0;
            let points = correct;
            let bonus = 0;
            if (correct === totalQ && totalQ > 0) {
                bonus = 2; // bonus points for all correct
                points += bonus;
            }
            results.push({ uid, correct, points, bonus });
        });
        // Persist points and build scoreboard lines (ordered by points desc)
        // Sort results by total points (including bonus), then by correct answers, then by userId for stability
        results.sort((a, b) => (b.points - a.points) || (b.correct - a.correct) || String(a.uid).localeCompare(String(b.uid)));
        const lines = [];
        for (const r of results) {
            const member = await message.guild.members.fetch(r.uid).catch(() => null);
            const display = member?.displayName || null;
            await addQuizPoints(r.uid, display, r.points);
            const bonusTxt = r.bonus ? ` (+${r.bonus} Bonus)` : '';
            lines.push(`- ${display || 'User'}: ${r.correct}/${totalQ} richtig, +${r.points} Punkte${bonusTxt}`);
        }
        session.active = false;
        quizSessions.delete(channelId);
        if (lines.length) {
            await message.channel.send([`Quiz beendet! Ergebnisse:`, ...lines, '', 'Server-Topliste mit !toplist ansehen'].join('\n'));
        } else {
            await message.channel.send('Quiz beendet! Keine Teilnehmer.');
        }
        return; // done handling !quiz
    }

    if (message.content.startsWith("!toplist")) {
        const tops = await getQuizToplist(10);
        if (!tops.length) {
            return message.reply("Noch keine Quiz-Punkte. Starte mit !quiz");
        }
        const lines = [];
        for (let i = 0; i < tops.length; i++) {
            const t = tops[i];
            const member = await message.guild.members.fetch(t.userId).catch(() => null);
            const name = member?.displayName || `User ${t.userId}`;
            lines.push(`${i + 1}. ${name}: ${t.quizPoints} Punkte`);
        }
        return message.reply(["Top Quiz-Spieler:", ...lines].join('\n'));
    }

    if (message.content.startsWith("!llm")) {
        // Extract the prompt from the message
        const prompt = message.content.substring(5).trim();

        // Collect image attachments (only images)
        const imageUrls = [...message.attachments.values()]
            .filter(att => {
                const ct = (att.contentType || "").toLowerCase();
                const name = (att.name || "").toLowerCase();
                return ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(name);
            })
            .map(att => att.url)
            // Deduplicate and keep a reasonable limit
            .filter((url, idx, arr) => arr.indexOf(url) === idx)
            .slice(0, 5);
        
        // Log the images we are about to send for analysis (helps debug stale image issues)
        if (imageUrls.length > 0) {
            console.log("Images attached for this request:", imageUrls);
        }
        
        // If no prompt and no images, ask for input
        if (!prompt && imageUrls.length === 0) {
            return message.reply("Bitte gib nach !llm eine Nachricht ein oder füge Bild(er) an. Beispiel: !llm Erzähl mir einen Witz");
        }
        
        try {
            console.log(`Processing LLM request: "${prompt}"`);
            
            // Send initial response to indicate processing
            const responseMessage = await message.reply("Verarbeite deine Anfrage...");
            
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
            
            // Create system message with user context or image-specific instruction
            let systemMessage = `${ASSISTANT_ROLE} ${SYSTEM_PROMPT}`;
            if (imageUrls.length > 0) {
                // For image analysis, avoid bias from prior stored context
                systemMessage += "\n\nImportant: Only analyze the images attached to THIS message (the URLs listed in the user content). Do not rely on or mention any previous images or earlier results. If the images are inaccessible, say so explicitly.";
                // Also, never include the image(s) themselves or their URLs in your response
                systemMessage += "\nDo not include or repeat any image URLs or image markdown in your reply. Describe what you see in words only.";
            } else {
                if (userContext) {
                    systemMessage += `\n\nUser Information:\n${userContext}`;
                    console.log(`Retrieved context for user ${username} (${userId})`);
                }
                // If the last interaction is recent (< 2 minutes), explicitly include it as carryover context
                try {
                    const lastRecent = await getLastInteractionIfRecent(userId, 120000);
                    if (lastRecent) {
                        systemMessage += `\n\nCarryover context (last exchange within 2 minutes):\n- Previous user message: ${lastRecent.message}\n- Bot's previous reply: ${lastRecent.response}\nInstruction: Continue the conversation based on this carryover; avoid re-greeting unless the user explicitly starts a new topic.`;
                    }
                } catch (e) {
                    console.warn('Failed to compute carryover context:', e?.message || e);
                }
            }
            
            // Prepare user message content, including images if present
            // For LM Studio, convert image URLs to base64 data URIs because LM Studio expects base64 in the `url` field
            async function fetchAsDataUrl(url) {
                try {
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error(`Failed to fetch image (${res.status})`);
                    }
                    const contentType = res.headers.get("content-type") || "application/octet-stream";
                    const arrayBuffer = await res.arrayBuffer();
                    // Guardrail: limit to ~10 MB to avoid huge payloads
                    const MAX_BYTES = 10 * 1024 * 1024;
                    if (arrayBuffer.byteLength > MAX_BYTES) {
                        throw new Error(`Image too large (${arrayBuffer.byteLength} bytes)`);
                    }
                    const base64 = Buffer.from(arrayBuffer).toString("base64");
                    return `data:${contentType};base64,${base64}`;
                } catch (e) {
                    console.error("Failed to convert image to data URL for LM Studio:", e);
                    return null;
                }
            }

            let userMessage;
            if (imageUrls.length > 0) {
                if (isUsingLMStudio) {
                    // Convert all images to data URIs
                    const dataUrls = (await Promise.all(imageUrls.map(fetchAsDataUrl))).filter(Boolean);
                    if (dataUrls.length === 0) {
                        // If conversion failed, fall back to text-only prompt
                        userMessage = { role: "user", content: prompt || "Bitte analysiere das/die Bild(er). (Hinweis: Bilder konnten nicht geladen werden)" };
                    } else {
                        userMessage = {
                            role: "user",
                            content: [
                                { type: "text", text: prompt || "Bitte analysiere das/die Bild(er)." },
                                ...dataUrls.map(url => ({ type: "image_url", image_url: { url } }))
                            ]
                        };
                    }
                } else {
                    // OpenAI Chat Completions with multimodal content using remote URLs
                    const parts = [
                        { type: "text", text: prompt || "Bitte analysiere das/die Bild(er)." },
                        ...imageUrls.map(url => ({ type: "image_url", image_url: { url } }))
                    ];
                    userMessage = { role: "user", content: parts };
                }
            } else {
                userMessage = { role: "user", content: prompt };
            }

            // Create a stream for the OpenAI response
            const stream = await openai.chat.completions.create({
                model: modelName,
                messages: [
                    { 
                        role: "system", 
                        content: systemMessage
                    },
                    userMessage
                ],
                stream: true,
            });
            
            console.log("Stream created successfully");
            
            // Utility to sanitize the model response so it does not include image URLs from attachments
            function sanitizeResponse(text) {
                if (!text) return "";
                let sanitized = text;
                if (imageUrls && imageUrls.length) {
                    for (const url of imageUrls) {
                        if (!url) continue;
                        // Remove direct occurrences of the URL
                        const esc = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                        const directUrlRegex = new RegExp(esc, "g");
                        sanitized = sanitized.replace(directUrlRegex, "");
                        // Remove markdown image syntax ![alt](url)
                        const mdImageRegex = new RegExp(`!\\[[^\n\]]*\\]\\(${esc}[^)]*\\)`, "g");
                        sanitized = sanitized.replace(mdImageRegex, "");
                        // Remove generic markdown link to the image [text](url)
                        const mdLinkRegex = new RegExp(`\\[[^\n\]]*\\]\\(${esc}[^)]*\\)`, "g");
                        sanitized = sanitized.replace(mdLinkRegex, "");
                        // Remove angle-bracketed links <url>
                        const angleRegex = new RegExp(`<${esc}>`, "g");
                        sanitized = sanitized.replace(angleRegex, "");
                    }
                    // Collapse multiple spaces/newlines caused by removals
                    sanitized = sanitized.replace(/[ \t]{2,}/g, " ").replace(/[\n]{3,}/g, "\n\n").trim();
                }
                return sanitized;
            }
            
            // Utility to split long text into Discord-safe chunks (<= 2000 chars)
            function splitDiscordMessage(text, limit = 2000) {
                const chunks = [];
                let remaining = text || "";
                while (remaining.length > 0) {
                    if (remaining.length <= limit) {
                        chunks.push(remaining);
                        break;
                    }
                    let sliceEnd = limit;
                    const newlinePos = remaining.lastIndexOf("\n", limit);
                    const spacePos = remaining.lastIndexOf(" ", limit);
                    if (newlinePos > limit * 0.6) {
                        sliceEnd = newlinePos + 1; // include newline, break after it
                    } else if (spacePos > limit * 0.6) {
                        sliceEnd = spacePos + 1; // break after space
                    }
                    chunks.push(remaining.slice(0, sliceEnd).trimEnd());
                    remaining = remaining.slice(sliceEnd).replace(/^\s+/, "");
                }
                return chunks;
            }

            let responseContent = "";
            let lastUpdateTime = Date.now();
            let sentChunkCount = 0; // how many chunks we've already sent (first via edit, rest via new messages)
            
            // Process the stream
            for await (const chunk of stream) {
                // Get the content from the chunk
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    responseContent += content;
                    
                    // Update the message every 1 second or upon newline
                    const currentTime = Date.now();
                    if (currentTime - lastUpdateTime > 1000 || content.includes("\n")) {
                        const sanitized = sanitizeResponse(responseContent);
                        const chunks = splitDiscordMessage(sanitized);
                        // Ensure first chunk updates the original message
                        if (chunks.length > 0) {
                            if (sentChunkCount === 0) {
                                await responseMessage.edit(chunks[0]);
                                sentChunkCount = 1;
                            } else {
                                // Update the first message only if it changed (optional optimization)
                                await responseMessage.edit(chunks[0]);
                            }
                        }
                        // Send any new chunks beyond what we've already sent
                        for (let i = sentChunkCount; i < chunks.length; i++) {
                            await message.channel.send(chunks[i]);
                        }
                        sentChunkCount = Math.max(sentChunkCount, chunks.length);
                        lastUpdateTime = currentTime;
                    }
                }
            }
            
            // Final update to ensure all content is displayed
            if (responseContent) {
                const sanitizedFinal = sanitizeResponse(responseContent);
                const chunks = splitDiscordMessage(sanitizedFinal);
                if (chunks.length > 0) {
                    // Ensure the first message is updated to the first chunk
                    await responseMessage.edit(chunks[0]);
                    // Send any remaining chunks not yet sent
                    for (let i = sentChunkCount; i < chunks.length; i++) {
                        await message.channel.send(chunks[i]);
                    }
                }
                
                // Record the interaction and extract facts (store sanitized content to avoid image links)
                await addUserInteraction(userId, username, prompt, sanitizedFinal);
                await extractUserFacts(userId, prompt, sanitizedFinal);
                console.log(`Recorded interaction for user ${username} (${userId})`);
            } else {
                await responseMessage.edit("Keine Antwort erzeugt. Bitte versuche es erneut.");
            }
        } catch (error) {
            const apiType = isUsingLMStudio ? "LM Studio API" : "OpenAI API";
            console.error(`Error with ${apiType}:`, error);
            
            let errorMessage = "Entschuldigung, bei der Verarbeitung deiner Anfrage ist ein Fehler aufgetreten. Ich habe meinen Besitzer informiert. Bitte versuche es später erneut.";
            
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

    else if (message.content.toLowerCase().includes("angular")) {
        const responseMessage = await message.reply(randomJoke("angular",message.channel.name));
    }
    else if (message.content.toLowerCase().includes("concrete5")) {
        const responseMessage = await message.reply(randomJoke("concrete5",message.channel.name));
    }

    else if (message.content.toLowerCase().includes("css")) {
        const responseMessage = await message.reply(randomJoke("css",message.channel.name));
    }

    else if (message.content.toLowerCase().includes("django")) {
        const responseMessage = await message.reply(randomJoke("django",message.channel.name));
    }


    else if (message.content.toLowerCase().includes("filemaker")) {
        const responseMessage = await message.reply(randomJoke("filemaker",message.channel.name));
    }

    else if (message.content.toLowerCase().includes("html")) {
        const responseMessage = await message.reply(randomJoke("html",message.channel.name));
    }

    else if (message.content.toLowerCase().includes("javascript")) {
        const responseMessage = await message.reply(randomJoke("javascript",message.channel.name));
    }

    else if (message.content.toLowerCase().includes("php")) {
        const responseMessage = await message.reply(randomJoke("php",message.channel.name));
    }

    else if (message.content.toLowerCase().includes("typescript")) {
        const responseMessage = await message.reply(randomJoke("typescript",message.channel.name));
    }

    else if (message.content.toLowerCase().includes("wordpress")) {
        const responseMessage = await message.reply(randomJoke("wordpress",message.channel.name));
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
                const channelResponse = await message.reply("Ich rufe deine gespeicherten Informationen ab... Ich sende sie dir per Privatnachricht.");
                
                // Get formatted user data
                const formattedData = await formatUserDataForDisplay(userId);
                
                // Send the data as a private message to the user
                await message.author.send(formattedData);
                
                // Update the channel message to confirm the DM was sent
                await channelResponse.edit("✅ Deine gespeicherten Informationen wurden dir per Privatnachricht gesendet.");
                console.log(`Displayed memory data for user ${username} (${userId}) via DM`);
            } catch (error) {
                console.error("Error displaying user memory:", error);
                message.reply("Entschuldigung, beim Abrufen deiner Informationen ist ein Fehler aufgetreten. Bitte versuche es später erneut.");
            }
        } else if (command === "delete") {
            try {
                // Ask for confirmation
                const confirmMessage = await message.reply(
                    "⚠️ **Bist du sicher, dass du alle deine gespeicherten Informationen löschen möchtest?** ⚠️\n" +
                    "Diese Aktion kann nicht rückgängig gemacht werden. Alle gespeicherten Fakten, Einstellungen und Interaktionsverläufe werden dauerhaft gelöscht.\n\n" +
                    "Antworte innerhalb von 30 Sekunden mit `!confirm-delete`, um die Löschung zu bestätigen."
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
                        await confirmMessage.edit("✅ Alle deine gespeicherten Informationen wurden erfolgreich gelöscht.");
                        console.log(`Deleted memory data for user ${username} (${userId})`);
                    } else {
                        await confirmMessage.edit("Keine gespeicherten Informationen für deinen Benutzer gefunden.");
                    }
                } catch (timeoutError) {
                    // User didn't confirm in time
                    await confirmMessage.edit("Löschung abgebrochen. Deine Informationen bleiben unverändert.");
                }
            } catch (error) {
                console.error("Error deleting user memory:", error);
                message.reply("Entschuldigung, beim Löschen deiner Informationen ist ein Fehler aufgetreten. Bitte versuche es später erneut.");
            }
        } else {
            // Unknown memory command
            message.reply(
                "Unbekannter memory-Befehl. Verfügbare Befehle:\n" +
                "- `!memory view` - Zeige deine gespeicherten Informationen\n" +
                "- `!memory delete` - Lösche alle deine gespeicherten Informationen"
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
                return message.reply("Bitte gib einen Fakt an, den du hinzufügen möchtest. Beispiel: `!fact add Ich mag Programmierung`");
            }
            
            try {
                await addUserFact(userId, fact);
                message.reply(`✅ Fakt hinzugefügt: "${fact}"`);
                console.log(`Added fact for user ${username} (${userId}): "${fact}"`);
            } catch (error) {
                console.error("Error adding user fact:", error);
                message.reply("Entschuldigung, beim Hinzufügen deines Fakts ist ein Fehler aufgetreten. Bitte versuche es später erneut.");
            }
        } else {
            // Unknown fact command
            message.reply(
                "Unbekannter fact-Befehl. Verfügbare Befehle:\n" +
                "- `!fact add <Fakt>` - Füge einen Fakt über dich hinzu"
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
                return message.reply("Bitte gib einen Schlüssel und einen Wert an. Beispiel: `!preference set sprache Deutsch`");
            }
            
            try {
                await setUserPreference(userId, key, value);
                message.reply(`✅ Einstellung gesetzt: "${key}" = "${value}"`);
                console.log(`Set preference for user ${username} (${userId}): "${key}" = "${value}"`);
            } catch (error) {
                console.error("Error setting user preference:", error);
                message.reply("Entschuldigung, beim Setzen deiner Einstellung ist ein Fehler aufgetreten. Bitte versuche es später erneut.");
            }
        } else {
            // Unknown preference command
            message.reply(
                "Unbekannter preference-Befehl. Verfügbare Befehle:\n" +
                "- `!preference set <Schlüssel> <Wert>` - Setze eine Einstellung"
            );
        }
    }
    
    // Handle cmd command to list all available commands
    if (message.content.startsWith("!cmd")) {
        console.log("Processing !cmd command");
        
        const commandsList = [
            "**Verfügbare Befehle:**",
            "",
            "**`!cmd`** - Diese Befehlsübersicht anzeigen",
            "",
            "**`!llm <prompt>`** - Sende eine Anfrage an die KI und erhalte eine Antwort",
            "Beispiel: `!llm Erzähl mir einen Programmier-Witz`",
            "",
            "**`!memory view`** - Zeige deine gespeicherten Informationen (per Privatnachricht)",
            "**`!memory delete`** - Lösche alle deine gespeicherten Informationen",
            "",
            "**`!fact add <Fakt>`** - Füge einen Fakt über dich hinzu",
            "Beispiel: `!fact add Ich mag Programmierung`",
            "",
            "**`!preference set <Schlüssel> <Wert>`** - Setze eine Einstellung",
            "Beispiel: `!preference set sprache Deutsch`",
            "",
            "**`!quiz [Anzahl]`** - Starte ein Quiz im Kanal (bis zu 5 Fragen, Standard 5). Alle können antworten.",
            "**`!toplist`** - Zeige die Top‑Nutzer nach Quiz‑Punkten",
            "",
            `Hinweis: Du kannst nur alle ${QUIZ_COOLDOWN_MINUTES} Minute(n) ein Quiz starten.`
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
// Log effective quiz settings
try {
    console.log("QUIZ_ANSWER_SECONDS:", QUIZ_ANSWER_SECONDS, "(min 5)");
    console.log("QUIZ_COOLDOWN_MINUTES:", QUIZ_COOLDOWN_MINUTES, "(min 1)");
} catch (e) {
    // no-op
}

app.listen(PORT, () => console.log(`Bot API listening on port ${PORT}`));
