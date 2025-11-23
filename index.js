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

// Enhanced health check with more details
app.get('/', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({ 
    status: 'OK', 
    bot: client.readyAt ? 'Connected' : 'Connecting',
    botUser: client.user?.tag || 'Not logged in',
    guilds: client.guilds.cache.size,
    uptime: {
      seconds: Math.floor(uptime),
      human: formatUptime(uptime)
    },
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    timestamp: new Date().toISOString(),
    lastHealthCheck: global.lastHealthCheck || 'Never'
  });
});

// Simple ping endpoint for external monitoring
app.get('/ping', (req, res) => {
  global.lastHealthCheck = new Date().toISOString();
  res.json({ status: 'pong', timestamp: global.lastHealthCheck });
});

// Bot status endpoint
app.get('/status', (req, res) => {
  const rotationSystem = require('./utils/rotationSystem');
  
  res.json({
    bot: {
      status: client.readyAt ? 'ready' : 'starting',
      user: client.user?.tag,
      guilds: client.guilds.cache.size,
      readyAt: client.readyAt
    },
    rotation: {
      nextRotation: rotationSystem.getNextRotationTime(),
      lastRotation: rotationSystem.getLastRotationTime(),
      isActive: true
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    }
  });
});

// Start web server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
  console.log(`🌐 Endpoints available:`);
  console.log(`   http://0.0.0.0:${PORT}/ - Health check`);
  console.log(`   http://0.0.0.0:${PORT}/ping - Simple ping`);
  console.log(`   http://0.0.0.0:${PORT}/status - Detailed status`);
});

// Self-pinging system to keep Render instance warm
function startSelfPinging() {
  console.log('🔔 Starting self-ping system to prevent spin-down...');
  
  setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/ping`);
      if (response.ok) {
        console.log(`✅ Self-ping successful - ${new Date().toISOString()}`);
      }
    } catch (error) {
      console.log('⚠️  Self-ping failed (server might be starting):', error.message);
    }
  }, 4 * 60 * 1000); // Ping every 4 minutes (more frequent than Render's 5-minute threshold)
}

// Enhanced error handling for server
server.on('error', (error) => {
  console.error('❌ Server error:', error);
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
    // Start self-pinging after bot is ready
    setTimeout(startSelfPinging, 5000);
  })
  .catch(error => {
    console.error('❌ Discord login failed:', error);
    process.exit(1);
  });

// Enhanced error handling
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

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Modular export for easy extension
module.exports = {
  client,
  config,
  commandHandler,
  eventHandler,
  server
};
