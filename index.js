const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.js');

// Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    bot: client.readyAt ? 'Connected' : 'Connecting',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start web server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
});

// Load command handler
const commandHandler = require('./handlers/commandHandler');
commandHandler.loadCommands();

// Load event handler
const eventHandler = require('./handlers/eventHandler');
eventHandler.loadEvents(client);

// Start Discord bot
client.login(config.botToken);

// Handle errors
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});
