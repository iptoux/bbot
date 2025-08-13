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
   ASSISTANT_ROLE=You are a helpful assistant.
   SYSTEM_PROMPT=Provide direct responses without showing your thinking process.
   ```
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

The bot will:
1. Process your request
2. Send the prompt to either OpenAI API or LM Studio with the assistant role and system instructions defined in your environment variables
3. Stream the response back to the Discord chat, updating the message as new content arrives

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

3. **Facts Definition**: Facts are simple statements about the user stored as strings in an array. Facts can be defined in two ways:
   - **Automatic Extraction**: The bot automatically extracts facts from user messages using pattern matching
     - "My name is John" → Stores "User's name is John"
     - "I live in Berlin" → Stores "User lives in Berlin"
     - "I like pizza" → Stores "User likes pizza"
   - **Manual Addition**: Users can manually add facts using the `!fact add` command
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

## Dependencies

- discord.js - Discord API client
- express - Web server for API endpoints
- openai - OpenAI API client
- dotenv - Environment variable management
- cors - Cross-origin resource sharing support