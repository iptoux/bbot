import fs from 'fs/promises';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load environment variables (env.local) similarly to bot.js for standalone/test runs
try {
  loadEnv({ path: path.join(__dirname, 'env.local') });
} catch {}
const USER_MEMORY_FILE = path.join(__dirname, 'user-memory.json');

// User memory schema:
// {
//   "userId": {
//     "username": "string",
//     "lastInteraction": "ISO date string",
//     "interactions": [
//       {
//         "timestamp": "ISO date string",
//         "message": "string",
//         "response": "string"
//       }
//     ],
//     "facts": [
//       "string facts about the user"
//     ],
//     "preferences": {
//       "key": "value"
//     }
//   }
// }

// In-memory cache of user data
let userMemoryCache = {};
let isInitialized = false;

// OpenAI / LM Studio configuration for fact extraction
let openAiClient = null;
function getOpenAIClient() {
  if (openAiClient) return openAiClient;
  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseURL = process.env.LM_STUDIO_API_URL || undefined; // use LM Studio if provided
  if (!apiKey && !baseURL) {
    return null; // no credentials nor local endpoint configured
  }
  openAiClient = new OpenAI({ apiKey: apiKey || 'sk-no-key', baseURL });
  return openAiClient;
}

function shouldUseLLMForFacts() {
  // Enable when FACTS_VIA_LLM=true and either OPENAI_API_KEY or LM_STUDIO_API_URL is set
  const flag = (process.env.FACTS_VIA_LLM || 'false').toLowerCase() === 'true';
  const client = getOpenAIClient();
  return flag && !!client;
}

function resolveModelNameForFacts() {
  // Use OPENAI_MODEL if provided, otherwise a sensible default
  let model = process.env.OPENAI_MODEL || 'openai/gpt-oss-20b';
  // LM Studio typically expects model names without the "openai/" prefix
  if ((process.env.LM_STUDIO_API_URL || '').length && model.startsWith('openai/')) {
    model = model.substring(7);
  }
  return model;
}

/**
 * Initialize the user memory system
 */
async function initUserMemory() {
  try {
    // Check if the user memory file exists
    try {
      await fs.access(USER_MEMORY_FILE);
      // File exists, load it
      const data = await fs.readFile(USER_MEMORY_FILE, 'utf8');
      userMemoryCache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, create it
      userMemoryCache = {};
      await saveUserMemory();
    }
    
    isInitialized = true;
    console.log('User memory system initialized');
  } catch (error) {
    console.error('Error initializing user memory:', error);
    // Initialize with empty cache if there's an error
    userMemoryCache = {};
    isInitialized = true;
  }
}

/**
 * Save the user memory to disk
 */
async function saveUserMemory() {
  try {
    await fs.writeFile(USER_MEMORY_FILE, JSON.stringify(userMemoryCache, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving user memory:', error);
  }
}

/**
 * Get a user's memory data
 * @param {string} userId - The Discord user ID
 * @returns {Object} The user's memory data
 */
async function getUserMemory(userId) {
  if (!isInitialized) {
    await initUserMemory();
  }
  
  // Return existing user data or create a new entry
  if (!userMemoryCache[userId]) {
    userMemoryCache[userId] = {
      username: null,
      lastInteraction: new Date().toISOString(),
      interactions: [],
      facts: [],
      preferences: {}
    };
  }
  
  return userMemoryCache[userId];
}

/**
 * Update a user's memory with a new interaction
 * @param {string} userId - The Discord user ID
 * @param {string} username - The Discord username
 * @param {string} message - The user's message
 * @param {string} response - The bot's response
 */
async function addUserInteraction(userId, username, message, response) {
  if (!isInitialized) {
    await initUserMemory();
  }
  
  const userData = await getUserMemory(userId);
  
  // Update username if provided
  if (username) {
    userData.username = username;
  }
  
  // Add the new interaction
  userData.interactions.push({
    timestamp: new Date().toISOString(),
    message,
    response
  });
  
  // Limit the number of stored interactions to prevent excessive growth
  if (userData.interactions.length > 10) {
    userData.interactions = userData.interactions.slice(-10);
  }
  
  // Update last interaction time
  userData.lastInteraction = new Date().toISOString();
  
  // Save changes to disk
  await saveUserMemory();
}

/**
 * Add a fact about a user
 * @param {string} userId - The Discord user ID
 * @param {string} fact - The fact to add
 */
async function addUserFact(userId, fact) {
  if (!isInitialized) {
    await initUserMemory();
  }
  
  const userData = await getUserMemory(userId);
  
  // Add the fact if it doesn't already exist
  if (!userData.facts.includes(fact)) {
    userData.facts.push(fact);
    await saveUserMemory();
  }
}

/**
 * Update a user preference
 * @param {string} userId - The Discord user ID
 * @param {string} key - The preference key
 * @param {string} value - The preference value
 */
async function setUserPreference(userId, key, value) {
  if (!isInitialized) {
    await initUserMemory();
  }
  
  const userData = await getUserMemory(userId);
  userData.preferences[key] = value;
  await saveUserMemory();
}

/**
 * Generate a context string for the LLM based on user memory
 * @param {string} userId - The Discord user ID
 * @returns {string} Context string for the LLM
 */
async function generateUserContext(userId) {
  if (!isInitialized) {
    await initUserMemory();
  }
  
  const userData = await getUserMemory(userId);
  let context = '';
  
  // Add username if available
  if (userData.username) {
    context += `User's name: ${userData.username}\n`;
  }
  
  // Add facts about the user
  if (userData.facts.length > 0) {
    context += 'Facts about the user:\n';
    userData.facts.forEach(fact => {
      context += `- ${fact}\n`;
    });
  }
  
  // Add user preferences
  const preferences = Object.entries(userData.preferences);
  if (preferences.length > 0) {
    context += 'User preferences:\n';
    preferences.forEach(([key, value]) => {
      context += `- ${key}: ${value}\n`;
    });
  }
  
  // Add recent interactions (last 3)
  const recentInteractions = userData.interactions.slice(-3);
  if (recentInteractions.length > 0) {
    context += 'Recent interactions:\n';
    recentInteractions.forEach(interaction => {
      const date = new Date(interaction.timestamp).toLocaleString();
      context += `- [${date}] User: ${interaction.message}\n`;
      context += `  Bot: ${interaction.response}\n`;
    });
  }
  
  return context.trim();
}

/**
 * Extract potential facts about a user from a message
 * @param {string} userId - The Discord user ID
 * @param {string} message - The user's message
 * @param {string} response - The bot's response
 */
async function extractUserFacts(userId, message, response) {
  // If configured, try to use an LLM to extract concise, stable user facts (RAG-friendly)
  if (shouldUseLLMForFacts()) {
    try {
      const client = getOpenAIClient();
      const model = resolveModelNameForFacts();

      const userData = await getUserMemory(userId);
      // Build a compact context with recent interactions to help the model infer consistent facts
      const recent = userData.interactions.slice(-5).map(it => ({
        timestamp: it.timestamp,
        message: it.message,
        response: it.response
      }));

      const systemPrompt = [
        'You extract persistent, RAG-friendly user facts from chats.',
        'Rules:',
        '- Output ONLY a JSON array of strings (no prose, no markdown).',
        '- Keep each fact short, verifiable from the given conversation, and likely to remain true over time.',
        '- Avoid temporary states, emotions, or context-specific details.',
        '- Avoid duplicating facts already present in the provided list.',
        '- Limit to at most 5 facts. Use sentence case; no trailing punctuation.',
      ].join('\n');

      const inputPayload = {
        knownFacts: userData.facts || [],
        recentInteractions: recent,
        current: { message, response }
      };

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `From the following JSON, extract new persistent user facts.\n\n${JSON.stringify(inputPayload)}` }
      ];

      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 300
      });

      let content = completion.choices?.[0]?.message?.content || '';
      // Try to parse JSON array; if wrapped in code fences or prose, extract JSON
      const jsonMatch = content.match(/\[([\s\S]*)\]/);
      if (jsonMatch) {
        content = `[${jsonMatch[1]}]`;
      }

      let facts = [];
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          facts = parsed
            .filter(x => typeof x === 'string')
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 5);
        }
      } catch (e) {
        // Fall through to regex fallback if JSON parse fails
        facts = [];
      }

      if (facts.length) {
        // Deduplicate against existing
        for (const f of facts) {
          await addUserFact(userId, f);
        }
        return; // done via LLM
      }
      // If LLM produced nothing useful, continue to regex fallback below
    } catch (err) {
      console.error('LLM fact extraction failed, falling back to regex:', err?.message || err);
    }
  }

  // Fallback: regex-based extraction for offline/testing environments
  const patterns = [
    { regex: /my name is (\w+)/i, extract: (match) => `User's name is ${match[1]}` },
    { regex: /i am (\d+) years old/i, extract: (match) => `User is ${match[1]} years old` },
    { regex: /i live in ([^.,]+)/i, extract: (match) => `User lives in ${match[1]}` },
    { regex: /i work as a ([^.,]+)/i, extract: (match) => `User works as a ${match[1]}` },
    { regex: /i like ([^.,]+)/i, extract: (match) => `User likes ${match[1]}` },
    { regex: /i love ([^.,]+)/i, extract: (match) => `User loves ${match[1]}` },
    { regex: /i hate ([^.,]+)/i, extract: (match) => `User dislikes ${match[1]}` },
    { regex: /i prefer ([^.,]+)/i, extract: (match) => `User prefers ${match[1]}` }
  ];

  for (const pattern of patterns) {
    const match = (message || '').match(pattern.regex);
    if (match) {
      await addUserFact(userId, pattern.extract(match));
    }
  }
}

/**
 * Format user memory data for display to the user
 * @param {string} userId - The Discord user ID
 * @returns {string} Formatted user data as a string
 */
async function formatUserDataForDisplay(userId) {
  if (!isInitialized) {
    await initUserMemory();
  }
  
  // Check if user exists
  if (!userMemoryCache[userId]) {
    return "No stored information found for your user.";
  }
  
  const userData = userMemoryCache[userId];
  let formattedData = "**Your Stored Information**\n\n";
  
  // Basic info
  formattedData += `**Basic Info**\n`;
  formattedData += `Username: ${userData.username || 'Not stored'}\n`;
  formattedData += `Last interaction: ${new Date(userData.lastInteraction).toLocaleString()}\n\n`;
  
  // Facts
  formattedData += `**Stored Facts**\n`;
  if (userData.facts.length > 0) {
    userData.facts.forEach((fact, index) => {
      formattedData += `${index + 1}. ${fact}\n`;
    });
  } else {
    formattedData += "No facts stored.\n";
  }
  formattedData += '\n';
  
  // Preferences
  formattedData += `**Preferences**\n`;
  const preferences = Object.entries(userData.preferences);
  if (preferences.length > 0) {
    preferences.forEach(([key, value], index) => {
      formattedData += `${index + 1}. ${key}: ${value}\n`;
    });
  } else {
    formattedData += "No preferences stored.\n";
  }
  formattedData += '\n';
  
  // Recent interactions (limited to last 3 for brevity)
  formattedData += `**Recent Interactions (last 3)**\n`;
  const recentInteractions = userData.interactions.slice(-3);
  if (recentInteractions.length > 0) {
    recentInteractions.forEach((interaction, index) => {
      const date = new Date(interaction.timestamp).toLocaleString();
      formattedData += `**Interaction ${index + 1} (${date})**\n`;
      formattedData += `You: ${interaction.message}\n`;
      // Truncate bot response if too long
      const truncatedResponse = interaction.response.length > 100 
        ? interaction.response.substring(0, 100) + '...' 
        : interaction.response;
      formattedData += `Bot: ${truncatedResponse}\n\n`;
    });
  } else {
    formattedData += "No interactions stored.\n";
  }
  
  formattedData += "To delete your stored information, use the command: `!memory delete`";
  
  return formattedData;
}

/**
 * Delete all stored information for a user
 * @param {string} userId - The Discord user ID
 * @returns {boolean} True if data was deleted, false if no data existed
 */
async function deleteUserData(userId) {
  if (!isInitialized) {
    await initUserMemory();
  }
  
  // Check if user exists
  if (!userMemoryCache[userId]) {
    return false;
  }
  
  // Delete user data
  delete userMemoryCache[userId];
  
  // Save changes to disk
  await saveUserMemory();
  
  return true;
}

function msSince(dateIso) {
  const t = new Date(dateIso).getTime();
  const now = Date.now();
  if (isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - t);
}

/**
 * Return the last interaction if the user's previous exchange is recent.
 * "Recent" defaults to <= 2 minutes (120_000 ms).
 * @param {string} userId
 * @param {number} thresholdMs
 * @returns {Promise<null|{timestamp:string,message:string,response:string,ageMs:number}>}
 */
async function getLastInteractionIfRecent(userId, thresholdMs = 120000) {
  if (!isInitialized) {
    await initUserMemory();
  }
  const userData = await getUserMemory(userId);
  const interactions = userData.interactions || [];
  if (interactions.length === 0) return null;
  const last = interactions[interactions.length - 1];
  const ageMs = msSince(last.timestamp || userData.lastInteraction);
  if (ageMs <= thresholdMs) {
    return { ...last, ageMs };
  }
  return null;
}

export {
  initUserMemory,
  getUserMemory,
  addUserInteraction,
  addUserFact,
  setUserPreference,
  generateUserContext,
  extractUserFacts,
  formatUserDataForDisplay,
  deleteUserData,
  getLastInteractionIfRecent
};