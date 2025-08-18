import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../config/index.js';
import { handleMessageCreate } from './handlers/messageCreate.js';

let client = null;

export function getClient() {
  return client;
}

export async function startBot() {
  if (!client) {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
      partials: [Partials.Channel, Partials.Message]
    });
    client.on('messageCreate', handleMessageCreate);
    client.on('ready', () => {
      console.log(`[bot] Logged in as ${client.user?.tag ?? 'unknown'}`);
    });
  }
  if (!config.DISCORD_TOKEN) {
    console.warn('[bot] DISCORD_TOKEN missing; bot will not log in.');
    return;
  }
  if (!client.isReady?.()) {
    await client.login(config.DISCORD_TOKEN);
  }
}

export async function stopBot() {
  if (client) {
    try {
      await client.destroy();
    } catch {}
  }
}
