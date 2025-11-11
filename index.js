const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.js');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');

// Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;

// Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    bot: client.readyAt ? 'Connected' : 'Connecting',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    features: {
      rotation: 'active',
      voice: 'active'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
});

// Load commands and events
commandHandler.loadCommands();
eventHandler.loadEvents(client);

// Start Discord bot
client.login(config.botToken);

// Export for testing
module.exports = { client, app };
