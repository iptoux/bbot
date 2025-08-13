# Discord Bot with LLM Integration

This Discord bot can receive and send messages, and includes integration with OpenAI's API or a local LM Studio endpoint to process LLM (Large Language Model) requests.

## Features

- Discord message handling
- OpenAI API integration
- Local LM Studio integration
- Streaming LLM responses back to Discord
- Simple REST API for bot control

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

Start the bot with:

```
node bot.js
```

The bot will log in to Discord and start listening for commands.

## Commands

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