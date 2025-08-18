import { state } from '../../services/state.service.js';
import { stats } from '../../services/stats.service.js';
import { config } from '../../config/index.js';

/**
 * @param {import('discord.js').Message} message
 */
export async function handleMessageCreate(message) {
  try {
    if (!message || message.author?.bot) return;

    // Count messages depending on config/state
    if (config.COUNT_WHEN_DISABLED || state.isEnabled()) {
      stats.incrementMessage({
        userId: message.author.id,
        channelId: message.channelId,
        guildId: message.guildId,
        timestamp: Date.now()
      });
    }

    // Ignore command handling when disabled
    if (!state.isEnabled()) return;

    const content = message.content || '';
    if (content.startsWith('!')) {
      const [raw] = content.slice(1).trim().split(/\s+/);
      const cmd = (raw || '').toLowerCase();
      if (!cmd) return;
      stats.incrementCommand({ name: cmd, userId: message.author.id, timestamp: Date.now() });

      // Optional: when the bot posts a joke via a !joke command, increment joke stats
      if (cmd === 'joke' || cmd === 'witz') {
        stats.incrementJoke({ id: 'generic', userId: message.author.id, timestamp: Date.now() });
      }
    }
  } catch (e) {
    console.error('[handler:messageCreate] error', e);
  }
}
