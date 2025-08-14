# Discord Bot with LLM Integration

This Discord bot can receive and send messages, and includes integration with OpenAI's API or a local LM Studio endpoint to process LLM (Large Language Model) requests.

## Features

- Discord message handling
- OpenAI API integration
- Local LM Studio integration
- Streaming LLM responses back to Discord
- Simple REST API for bot control
- RAG (Retrieval-Augmented Generation) for user memory
- Automatic extraction and storage of user information
- Context-aware responses based on user history

## Setup

1. Make sure you have Node.js installed (v14 or higher recommended)
2. Clone this repository
3. Install dependencies:
   ```
   npm install
   ```
4. Create an `env.local` file in the root directory with the following variables:
   ```
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   BOT_PORT=4000
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=openai/gpt-oss-20b
   LM_STUDIO_API_URL=http://localhost:1234/v1
   FACTS_VIA_LLM=true
   ASSISTANT_ROLE=You are a helpful assistant.
   SYSTEM_PROMPT=Provide direct responses without showing your thinking process.
   ```
   - `FACTS_VIA_LLM`: When set to `true`, the bot will use the configured LLM (OpenAI or LM Studio) to extract persistent user facts from conversations. When omitted or `false`, a lightweight regex-based fallback is used.
   - Replace `your_discord_bot_token_here` with your actual Discord bot token
   - For OpenAI API: Replace `your_openai_api_key_here` with your OpenAI API key
   - For LM Studio: Set `LM_STUDIO_API_URL` to the URL of your local LM Studio API server (typically http://localhost:1234/v1)
   - Set `ASSISTANT_ROLE` to define the assistant's personality (e.g., "You are a helpful assistant." or "You are a friendly German-speaking assistant.")
   - Set `SYSTEM_PROMPT` to provide system instructions (e.g., "Provide direct responses without showing your thinking process.")

### Using with OpenAI API

If you want to use the OpenAI API, make sure:
- `OPENAI_API_KEY` is set to your valid OpenAI API key
- `OPENAI_MODEL` is set to the model you want to use (e.g., "openai/gpt-oss-20b")
- `LM_STUDIO_API_URL` is either not set or commented out

### Using with LM Studio

If you want to use a local LM Studio instance:
1. Download and install [LM Studio](https://lmstudio.ai/)
2. Open LM Studio and download/import a model
3. Go to the "Local Server" tab in LM Studio
4. Click "Start Server" to start the local API server
5. In your `env.local` file:
   - Set `LM_STUDIO_API_URL` to the server URL shown in LM Studio (typically http://localhost:1234/v1)
   - Set `OPENAI_MODEL` to the name of your model (if your model name starts with "openai/", the prefix will be automatically removed when using LM Studio)
   - `OPENAI_API_KEY` can be set to any non-empty string as it's not used with LM Studio

## Running the Bot

### Standard Method

Start the bot with:

```
node bot.js
```

The bot will log in to Discord and start listening for commands.

### Docker Deployment

This application can also be run using Docker and Docker Compose.

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

#### Setup

1. Make sure you have created the `env.local` file as described in the Setup section above.

2. Build and start the container:

```
docker-compose up -d
```

This will build the Docker image and start the container in detached mode.

3. View logs:

```
docker-compose logs -f
```

4. Stop the container:

```
docker-compose down
```

#### Persistent Data

The Docker setup includes volume mappings for:
- `env.local` file for environment variables
- `user-memory.json` file for user data persistence
- `data` directory for any additional persistent data

These volumes ensure that your configuration and user data persist across container restarts.

## Commands

### !cmd

Displays a list of all available commands with their descriptions.

Example:
```
!cmd
```

The bot will respond with a formatted list of all commands and how to use them.

### !llm \<message\>

Sends a prompt to either the OpenAI API or your local LM Studio endpoint (depending on your configuration) and streams the response back to the Discord chat.

Example:
```
!llm Tell me a joke about programming
```

You can also attach image(s) to your !llm message to request visual analysis:
- Example: attach a photo and send `!llm What is shown in this image?`
- Up to 5 images are processed per request. Supported formats include PNG, JPG/JPEG, GIF, WEBP, BMP, and TIFF.

Behavior details:
1. Process your request (including downloading and preparing image attachments if present)
2. Send the prompt to either OpenAI API or LM Studio with the assistant role and system instructions defined in your environment variables
3. Stream the response back to the Discord chat, updating the message as new content arrives

Notes for images:
- For image analysis, the bot intentionally does not inject user memory or "carryover" context to avoid biasing visual descriptions.
- The system prompt instructs the model to analyze only the current images and to avoid including any image URLs or markdown in the reply. The bot additionally sanitizes the output to remove any leaked URLs.

You can customize the assistant's personality and behavior by modifying the `ASSISTANT_ROLE` and `SYSTEM_PROMPT` environment variables in your env.local file. The default configuration instructs the LLM to provide clean, concise responses without showing its thinking process or internal deliberation.

### !memory view

Displays all information that the bot has stored about you, including:
- Basic user details
- Stored facts extracted from conversations
- User preferences
- Recent interaction history

For privacy reasons, this information is sent to you as a private message (DM) rather than being displayed in the public channel.

Example:
```
!memory view
```

### !memory delete

Allows you to delete all information that the bot has stored about you. For security, this command requires confirmation.

Example:
```
!memory delete
```

After running this command, the bot will ask for confirmation. To confirm deletion, reply with:
```
!confirm-delete
```

You have 30 seconds to confirm before the deletion request is cancelled.

### !fact add \<fact\>

Adds a fact about yourself to your user profile. This fact will be included in future conversations with the bot, allowing it to provide more personalized responses.

Example:
```
!fact add I am a software developer
!fact add I prefer dark mode in applications
!fact add My favorite programming language is JavaScript
```

### !preference set \<key\> \<value\>

Sets a preference in your user profile. Preferences are stored as key-value pairs and can be used to customize the bot's behavior.

Example:
```
!preference set language German
!preference set theme dark
!preference set responseStyle concise
```

## User Memory System (RAG)

The bot includes a Retrieval-Augmented Generation (RAG) system that allows it to remember information about users and use this context to provide more personalized responses.

### How It Works

1. **Information Storage**: The bot automatically stores information about users, including:
   - Basic user details (username)
   - Interaction history (recent messages and responses)
   - Facts about the user (extracted from conversations or added manually)
   - User preferences (key-value pairs set by the user)

2. **Information Retrieval**: When a user sends a message with the `!llm` command, the bot:
   - Retrieves the user's stored information
   - Augments the LLM prompt with this context
   - Generates a response that takes into account the user's history and preferences

3. **Facts Definition**: Facts are simple, persistent statements about the user stored as strings in an array. Facts can be created in two ways:
   - **Automatic Extraction (LLM-first, with fallback)**: When `FACTS_VIA_LLM=true`, the bot asks the LLM to extract new persistent facts from recent conversation context. The LLM is instructed to output ONLY a JSON array of short, stable, verifiable facts (max 5) and to avoid temporary states or duplicates. If LLM extraction is disabled or fails, the bot falls back to simple pattern matching.
     - Examples (fallback patterns):
       - "My name is John" → Stores "User's name is John"
       - "I live in Berlin" → Stores "User lives in Berlin"
       - "I like pizza" → Stores "User likes pizza"
   - **Manual Addition**: Users can add facts using the `!fact add` command
     - `!fact add I speak German` → Stores "I speak German"
     - `!fact add I prefer dark mode` → Stores "I prefer dark mode"

4. **Preferences Definition**: Preferences are key-value pairs stored in an object that can customize the bot's behavior. Preferences are defined using the `!preference set` command:
   - `!preference set language German` → Sets the "language" preference to "German"
   - `!preference set theme dark` → Sets the "theme" preference to "dark"
   - `!preference set responseStyle concise` → Sets the "responseStyle" preference to "concise"

The difference between facts and preferences:
- **Facts** are simple statements about the user (stored as strings)
- **Preferences** are configurable settings that can affect how the bot interacts with you (stored as key-value pairs)

### User Memory File

User information is stored in a JSON file called `user-memory.json` that is automatically created in the bot's directory. This file persists between bot restarts, allowing the bot to maintain long-term memory of users.

### Privacy Considerations

Since the bot stores user information:
- The `user-memory.json` file should be properly secured
- Users should be informed that the bot remembers information from conversations
- Consider implementing a command to allow users to view or delete their stored information

### LLM-based User Facts Extraction (Configuration)

To enable LLM-based extraction of user facts, set `FACTS_VIA_LLM=true` in `env.local` and configure one of the following:
- OpenAI API: set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `openai/gpt-oss-20b`).
- LM Studio: set `LM_STUDIO_API_URL` (e.g., `http://localhost:1234/v1`) and set `OPENAI_MODEL` to your local model's name. When using LM Studio, if the model name begins with `openai/`, the prefix is removed automatically.

Behavior details:
- The bot passes a compact context (up to the last 5 interactions and the current exchange) to the LLM and requests ONLY a JSON array of up to 5 short, stable facts.
- Facts should be persistent (avoid temporary moods, fleeting context) and verifiable from the conversation.
- New facts are deduplicated against existing ones before being saved to `user-memory.json`.
- If LLM extraction errors or returns invalid JSON, the bot falls back to regex-based extraction.

Notes:
- Manual fact management is always available via `!fact add <fact>` and `!memory view/delete`.
- Interactions in memory are bounded (last 10 are kept) to prevent unbounded growth.

## Image Processing and Vision

The bot supports multimodal prompts with image attachments when using `!llm`.

How it works under the hood (bot.js):
- Attachment detection: Only image files are included. The bot checks either the attachment content type or the filename extension (png, jpg/jpeg, gif, webp, bmp, tiff). Duplicate URLs are removed and a maximum of 5 images is processed per request.
- Logging: The bot logs the list of image URLs it is about to process to aid troubleshooting.
- Prompt behavior: For image analysis, the bot crafts a special system instruction to:
  - Analyze only the images attached to the current message
  - Avoid relying on or referencing older images or previous results
  - Avoid including image URLs or image markdown in the reply
  The output is additionally sanitized to remove any leaked image URLs or markdown link forms.
- Context policy: For image requests, user memory and recent carryover context are not injected to reduce bias in visual descriptions.
- Model backends:
  - OpenAI API: Image URLs are sent directly as `image_url` content parts in the Chat Completions request.
  - LM Studio: Image URLs are fetched by the bot and converted to base64 data URLs (data:<mime>;base64,...) before being sent, because some LM Studio models expect base64 in the `url` field.
    - Guardrail: Each image has a ~10 MB size limit; oversized or failed downloads are skipped. If all conversions fail, the bot falls back to a text-only prompt and tells the model that images could not be loaded.
- Streaming: Responses are streamed and edited in place, with long outputs split into Discord-safe chunks (<=2000 characters).

Tips:
- If your model cannot handle images, simply don’t attach any. The bot will behave as a text-only assistant.
- If you see errors when using LM Studio with images, check that the LM Studio server is running and try smaller images. Review the console logs for details.

## API Endpoints

The bot also exposes a simple REST API:

- `POST /notify/add` - Add a user to the notification list
- `POST /notify/remove` - Remove a user from the notification list
- `POST /send` - Send a message to a specific channel

## Troubleshooting

If you encounter issues:

### General Troubleshooting
1. Make sure your environment variables are set correctly
2. Verify that the bot has the necessary permissions in your Discord server
3. Check the console logs for any error messages

### OpenAI API Troubleshooting
1. Check that your OpenAI API key is valid
2. Verify that the model you're trying to use exists and is available to your account
3. Check if you have sufficient API credits

### LM Studio Troubleshooting
1. Make sure LM Studio is running and the API server is started
2. Verify that the LM_STUDIO_API_URL in your env.local file matches the URL shown in LM Studio
3. Check that a model is properly loaded in LM Studio
4. If you get timeout errors, your model might be too large for your hardware - try a smaller model
5. Ensure the model name in your env.local file matches the name in LM Studio
6. Check LM Studio logs for any errors
7. Try restarting the LM Studio server if it becomes unresponsive

### User Facts Extraction Troubleshooting
1. LLM not used: Ensure `FACTS_VIA_LLM=true` and either `OPENAI_API_KEY` is set or `LM_STUDIO_API_URL` is reachable.
2. Model name with LM Studio: If your `OPENAI_MODEL` starts with `openai/`, the bot will automatically strip the prefix for LM Studio.
3. No new facts: The LLM may have determined there are no persistent facts to add, or it produced invalid JSON; the bot then falls back to regex.
4. Duplicates: The bot deduplicates facts against stored ones; identical facts won’t be re-added.
5. Storage file: Verify that `user-memory.json` is writable by the process.

## Dependencies

- discord.js - Discord API client
- express - Web server for API endpoints
- openai - OpenAI API client
- dotenv - Environment variable management
- cors - Cross-origin resource sharing support
# bbot-server

## Quiz-Konfiguration

Die Antwortzeit pro Frage und die Start-Sperrzeit (Cooldown) für das Quiz sind konfigurierbar.

- Antwortzeit pro Frage setzen (Sekunden):
  
  QUIZ_ANSWER_SECONDS=20
  
  Ersetze `20` durch die gewünschte Anzahl an Sekunden. Mindestwert: 5 Sekunden. Standard: 20 Sekunden.

- Cooldown für Quiz-Start setzen (Minuten):
  
  QUIZ_COOLDOWN_MINUTES=60
  
  Ersetze `60` durch die gewünschte Anzahl an Minuten. Mindestwert: 1 Minute. Standard: 60 Minuten.

- Wirkung im Bot:
  - Der Bot akzeptiert Antworten nur innerhalb des gesetzten Zeitfensters pro Frage.
  - Die Quiz-Frage zeigt die eingestellte Antwortzeit in Sekunden an.
  - Ein Nutzer kann nur alle `QUIZ_COOLDOWN_MINUTES` Minute(n) ein neues Quiz starten. Bei Verstoß zeigt der Bot die verbleibende Wartezeit und die Uhrzeit, ab wann es wieder möglich ist.

Beispiel `env.local` Auszug:

DISCORD_BOT_TOKEN=...
BOT_PORT=4000
QUIZ_ANSWER_SECONDS=30
QUIZ_COOLDOWN_MINUTES=60

## Befehle

- `!quiz [Anzahl]` — Startet ein Quiz im Kanal (bis zu 5 Fragen, Standard 5). Alle können antworten. Bonus +2 Punkte, wenn alle Antworten korrekt sind.
- `!toplist` — Zeigt die Top‑Nutzer nach Quiz‑Punkten.
- Hinweis: Ein Nutzer kann nur alle `QUIZ_COOLDOWN_MINUTES` Minute(n) ein Quiz starten.

## Quiz – Nutzung und Details

Dieser Abschnitt beschreibt alle wichtigen Informationen zum Quiz-Feature des Bots.

- Starten: `!quiz [Anzahl]`
  - Anzahl = 1 bis 5 Fragen (Standard: 5, wenn nicht angegeben)
  - In einem Kanal kann immer nur ein Quiz gleichzeitig laufen. Versuchst du ein weiteres zu starten, erhältst du einen Hinweis.
- Antworten:
  - Tippe einfach den Buchstaben deiner Antwort (A, B, C, …) direkt in den Kanal.
  - Bitte nicht auf die Frage „antworten/quoten“ (kein Reply). Nur das reine A/B/C/… im Kanal senden.
  - Es zählt nur deine erste gültige Antwort pro Frage.
  - Wenn der Bot deine Antwort registriert hat, reagiert er mit einem ✅ auf deine Nachricht.
- Kategorie-Anzeige:
  - Enthält eine Frage im JSON eine `category`, wird sie in der Fragestellung mit angezeigt (z. B. „[Kategorie: Programmierung]“).
- Zeitlimit pro Frage:
  - Das Zeitlimit wird pro Frage in Sekunden angezeigt und über `QUIZ_ANSWER_SECONDS` gesteuert.
  - Innerhalb dieses Fensters kannst du antworten; danach wird die richtige Lösung angezeigt und die Runde beendet.
- Punkte & Bonus:
  - Für jede richtige Antwort erhältst du 1 Punkt.
  - Wenn du in einem Quiz-Durchlauf (Session) alle Fragen richtig beantwortest, bekommst du zusätzlich +2 Bonuspunkte.
  - Punkte werden dauerhaft pro Nutzer gespeichert und fließen in die Topliste ein.
- Topliste:
  - `!toplist` zeigt die besten Nutzer nach gesamten Quiz‑Punkten (serverweit).
- Cooldown (Spam-Schutz):
  - Du kannst nur alle `QUIZ_COOLDOWN_MINUTES` Minute(n) ein neues Quiz starten.
  - Versuchst du es früher, sagt dir der Bot, wie lange du noch warten musst und ab welcher Uhrzeit es wieder möglich ist.
- Verhalten bei Erwähnungen:
  - Während ein Quiz in einem Kanal läuft, ignoriert der Bot @Erwähnungen dort, um die Quiz-Antworten nicht zu stören.

### Fragenkatalog (quiz-questions.json)

- Ort der Datei: `quiz-questions.json` im Projektstamm.
- Format: Eine Liste von Fragen, jede Frage hat folgende Struktur:

```
{
  "category": "Programmierung",          // optional, wird in der Anzeige gezeigt
  "question": "Deine Frage als Text …",   // erforderlich
  "choices": ["A1", "A2", "A3", "A4"],  // erforderlich, 2–6 Antwortmöglichkeiten
  "answerIndex": 1                         // erforderlich, 0-basierter Index der richtigen Antwort
}
```

- Beispiel:

```
{
  "category": "Programmierung",
  "question": "Welche Array-Methode filtert Elemente?",
  "choices": ["map", "forEach", "filter", "reduce"],
  "answerIndex": 2
}
```

- Hinweise:
  - Es werden pro Quiz-Durchlauf zufällige Fragen aus dieser Datei gewählt.
  - Maximal werden 5 Fragen pro Quiz gestellt (oder weniger, wenn du `!quiz 3` angibst).
  - Achte darauf, dass `answerIndex` innerhalb der `choices` liegt.
  - Unterstützt werden Antwortoptionen A–F (max. 6).

### Umgebungsvariablen (Quiz)

- `QUIZ_ANSWER_SECONDS` (Standard 20, Minimum 5)
  - Steuert das Zeitfenster pro Frage in Sekunden.
- `QUIZ_COOLDOWN_MINUTES` (Standard 60, Minimum 1)
  - Steuert den Cooldown, wie oft ein Nutzer ein neues Quiz starten darf.

Beispiel `env.local` (Ausschnitt):

```
DISCORD_BOT_TOKEN=…
BOT_PORT=4000
QUIZ_ANSWER_SECONDS=30
QUIZ_COOLDOWN_MINUTES=60
```

### Troubleshooting (Quiz)

- „Meine Antwort wurde nicht gezählt“:
  - Stelle sicher, dass du NUR den Buchstaben (A–F) geschickt hast (ohne zusätzlichen Text) und innerhalb der Zeit.
  - Prüfe, ob der Bot mit ✅ reagiert hat. Wenn nicht, war die Antwort evtl. zu spät oder keine gültige Option.
- „Es läuft schon ein Quiz“:
  - In einem Kanal kann nur eine Quiz-Session gleichzeitig aktiv sein. Warte, bis sie endet.
- „Ich kann kein Quiz starten“:
  - Der Cooldown verhindert zu häufige Starts. Warte bis zur angegebenen Uhrzeit im Hinweis des Bots.
- „Frage zeigt keine Kategorie“:
  - Prüfe, ob die Frage im JSON ein Feld `category` enthält. Ist es nicht vorhanden, wird keine Kategorie angezeigt.
