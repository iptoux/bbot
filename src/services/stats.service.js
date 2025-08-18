import { createJsonStore } from '../store/jsonStore.js';

const store = createJsonStore('stats');
const MAX_EVENTS = 10000;

// Initialize store structure if empty
function init() {
  const data = store.read();
  if (!data.totals) {
    store.write({
      totals: { messages: 0, commands: 0, jokes: 0, quizPlayed: 0, uniqueUsers: 0 },
      messagesPerUser: {},
      messagesPerChannel: {},
      commandsUsed: {},
      jokes: {},
      users: {},
      events: []
    });
  }
}
init();

let flushTimer = null;
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    try {
      // read to trigger cache, then write to persist same cache (no-op), kept for pattern symmetry
      const d = store.read();
      store.write(d);
    } finally {
      flushTimer = null;
    }
  }, 5000);
}

function pushEvent(evt) {
  const data = store.read();
  data.events.push(evt);
  if (data.events.length > MAX_EVENTS) {
    data.events.splice(0, data.events.length - MAX_EVENTS);
  }
}

export const stats = {
  incrementMessage({ userId, channelId, guildId, timestamp = Date.now() }) {
    const data = store.read();
    // users
    if (!data.users[userId]) {
      data.users[userId] = { firstSeenAt: timestamp, lastSeenAt: timestamp, count: 0 };
      data.totals.uniqueUsers = Object.keys(data.users).length;
    } else {
      data.users[userId].lastSeenAt = timestamp;
    }
    data.users[userId].count += 1;

    // totals and breakdowns
    data.totals.messages += 1;
    data.messagesPerUser[userId] = (data.messagesPerUser[userId] || 0) + 1;
    if (channelId) data.messagesPerChannel[channelId] = (data.messagesPerChannel[channelId] || 0) + 1;

    pushEvent({ type: 'message', ts: timestamp, userId, channelId, guildId });
    scheduleFlush();
  },

  incrementCommand({ name, userId, timestamp = Date.now() }) {
    const data = store.read();
    data.totals.commands += 1;
    data.commandsUsed[name] = (data.commandsUsed[name] || 0) + 1;
    pushEvent({ type: 'command', ts: timestamp, userId, commandName: name });
    scheduleFlush();
  },

  incrementJoke({ id, userId, timestamp = Date.now() }) {
    const data = store.read();
    data.totals.jokes += 1;
    const key = String(id ?? 'unknown');
    data.jokes[key] = (data.jokes[key] || 0) + 1;
    pushEvent({ type: 'joke', ts: timestamp, userId, jokeId: key });
    scheduleFlush();
  },

  getOverview() {
    const data = store.read();
    const topUsers = Object.entries(data.messagesPerUser)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topCommands = Object.entries(data.commandsUsed)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topJokes = Object.entries(data.jokes)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return {
      totals: data.totals,
      top: { usersByMessages: topUsers, commands: topCommands, jokes: topJokes }
    };
  },

  getMessages({ from, to, channelId, userId } = {}) {
    const data = store.read();
    const fromTs = from ? new Date(from).getTime() : 0;
    const toTs = to ? new Date(to).getTime() : Number.MAX_SAFE_INTEGER;
    const events = data.events.filter((e) => e.type === 'message');
    const filtered = events.filter((e) => e.ts >= fromTs && e.ts <= toTs && (!channelId || e.channelId === channelId) && (!userId || e.userId === userId));

    const byUser = {};
    const byDay = {};
    for (const e of filtered) {
      byUser[e.userId] = (byUser[e.userId] || 0) + 1;
      const day = new Date(e.ts).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }
    return { count: filtered.length, byUser: Object.entries(byUser).map(([u, c]) => ({ userId: u, count: c })), byDay: Object.entries(byDay).map(([d, c]) => ({ day: d, count: c })) };
  },

  getUsers({ top = 10 } = {}) {
    const data = store.read();
    const list = Object.entries(data.users).map(([userId, u]) => ({ userId, firstSeenAt: u.firstSeenAt, lastSeenAt: u.lastSeenAt, messages: u.count }));
    list.sort((a, b) => b.messages - a.messages);
    return { total: list.length, top: list.slice(0, top) };
  },

  getJokes({ top = 10 } = {}) {
    const data = store.read();
    const list = Object.entries(data.jokes).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
    return list.slice(0, top);
  },

  getCommands({ top = 20 } = {}) {
    const data = store.read();
    const list = Object.entries(data.commandsUsed).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return list.slice(0, top);
  },

  // Guild-aware toplists computed from the events log
  getTopUsersByGuild({ guildId, top = 10, excludeChannelIds } = {}) {
    const data = store.read();
    if (!guildId) return [];
    const excludeSet = new Set(Array.isArray(excludeChannelIds) ? excludeChannelIds : []);
    const events = data.events.filter((e) => e.type === 'message' && e.guildId === guildId && (!excludeSet.size || !excludeSet.has(e.channelId)));
    const byUser = {};
    for (const e of events) {
      if (!e.userId) continue;
      byUser[e.userId] = (byUser[e.userId] || 0) + 1;
    }
    return Object.entries(byUser)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, top);
  },

  getTopChannelsByGuild({ guildId, top = 10, excludeChannelIds } = {}) {
    const data = store.read();
    if (!guildId) return [];
    const excludeSet = new Set(Array.isArray(excludeChannelIds) ? excludeChannelIds : []);
    const events = data.events.filter((e) => e.type === 'message' && e.guildId === guildId && (!excludeSet.size || !excludeSet.has(e.channelId)));
    const byChannel = {};
    for (const e of events) {
      if (!e.channelId) continue;
      byChannel[e.channelId] = (byChannel[e.channelId] || 0) + 1;
    }
    return Object.entries(byChannel)
      .map(([channelId, count]) => ({ channelId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, top);
  },

  getToplistsByGuild({ guildId, topUsers = 10, topChannels = 10, excludeChannelIds } = {}) {
    return {
      users: this.getTopUsersByGuild({ guildId, top: topUsers, excludeChannelIds }),
      channels: this.getTopChannelsByGuild({ guildId, top: topChannels, excludeChannelIds })
    };
  },

  // Remove all message events for a guild and rebuild message-based aggregates
  resetGuildMessages(guildId) {
    if (!guildId) return { ok: false, error: 'guildId required' };
    const data = store.read();
    const before = data.events.length;
    // Keep non-message events and message events not belonging to the guild
    data.events = data.events.filter((e) => !(e?.type === 'message' && e?.guildId === guildId));
    const removed = before - data.events.length;

    // Rebuild message-derived aggregates from remaining events
    data.totals.messages = 0;
    data.messagesPerUser = {};
    data.messagesPerChannel = {};
    data.users = {};

    for (const e of data.events) {
      if (e.type !== 'message') continue;
      const ts = Number.isFinite(e.ts) ? e.ts : Date.now();
      const uid = e.userId;
      const cid = e.channelId;
      if (uid) {
        if (!data.users[uid]) {
          data.users[uid] = { firstSeenAt: ts, lastSeenAt: ts, count: 1 };
        } else {
          const u = data.users[uid];
          u.lastSeenAt = Math.max(u.lastSeenAt, ts);
          u.count += 1;
        }
        data.messagesPerUser[uid] = (data.messagesPerUser[uid] || 0) + 1;
      }
      if (cid) data.messagesPerChannel[cid] = (data.messagesPerChannel[cid] || 0) + 1;
      data.totals.messages += 1;
    }
    data.totals.uniqueUsers = Object.keys(data.users).length;

    store.write(data);
    return { ok: true, removedEvents: removed, totals: data.totals };
  }
};

// Flush on process exit
process.on('beforeExit', () => {
  try {
    const d = store.read();
    store.write(d);
  } catch {}
});
