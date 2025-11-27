const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.js');

// Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;

// Discord client with minimal intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// SIMPLE health check endpoint (copy from working bot)
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    bot: client.readyAt ? 'Connected' : 'Connecting',
    timestamp: new Date().toISOString()
  });
});

// SIMPLE ping endpoint
app.get('/ping', (req, res) => {
  res.json({ status: 'pong', timestamp: new Date().toISOString() });
});

// Start web server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
});

// Load handlers
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');

commandHandler.loadCommands();
eventHandler.loadEvents(client);

// Start Discord bot
client.login(config.botToken)
  .then(() => {
    console.log('🔑 Discord login successful');
  })
  .catch(error => {
    console.error('❌ Discord login failed:', error);
    process.exit(1);
  });

// Error handling
client.on('error', (error) => {
  console.error('🔴 Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('🔴 Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔻 Received SIGTERM, shutting down gracefully...');
  client.destroy();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔻 Received SIGINT, shutting down gracefully...');
  client.destroy();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { client, server };
