const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');
const rotationSystem = require('../../utils/rotationSystem');

// Calculate 6 AM Riyadh time (3 AM UTC)
function getNextRotationTime() {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(3, 0, 0, 0);
  if (now.getTime() > next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

let nextRotationTime = getNextRotationTime();
let lastRotationTime = null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check channel rotation status and bot information'),
  
  async execute(interaction) {
    const guild = interaction.client.guilds.cache.get(config.rotation.serverId);
    const currentChannel = guild.channels.cache.find(
      (ch) => ch.name === config.rotation.targetChannelName
    );

    const rotationCount = rotationSystem.getRotationCount();
    const uptime = process.uptime();
    
    const statusEmbed = {
      title: "🤖 Automated Channel Management Status",
      fields: [
        { name: "Bot Status", value: "Operational ✅", inline: true },
        { name: "Uptime", value: formatUptime(uptime), inline: true },
        { name: "Rotation Count", value: rotationCount.toString(), inline: true },
        { name: "Channel Name", value: config.rotation.targetChannelName, inline: true },
        { name: "Channel Type", value: "text", inline: true },
        { name: "Channel Status", value: currentChannel ? "Active ✅" : "Missing ❌", inline: true },
        {
          name: "Next Rotation",
          value: nextRotationTime
            ? `<t:${Math.floor(nextRotationTime.getTime() / 1000)}:F> (<t:${Math.floor(nextRotationTime.getTime() / 1000)}:R>)`
            : "Not scheduled",
          inline: false,
        },
        {
          name: "Last Rotation",
          value: lastRotationTime
            ? `<t:${Math.floor(lastRotationTime.getTime() / 1000)}:R>`
            : "Never",
          inline: true,
        },
        { name: "Category", value: `<#${config.rotation.categoryId}>`, inline: true },
        {
          name: "Template",
          value: `<#${config.rotation.templateChannelId}>`,
          inline: true,
        },
        {
          name: "Current Position",
          value: currentChannel ? `Position ${currentChannel.position}` : "N/A",
          inline: true,
        },
        {
          name: "Bot Health",
          value: `Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\nPing: ${interaction.client.ws.ping}ms`,
          inline: true,
        },
      ],
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
      footer: { text: `Bot ID: ${interaction.client.user.id}` }
    };

    await interaction.reply({ embeds: [statusEmbed] });
  },
};

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

// Export these for rotation system
module.exports.getNextRotationTime = getNextRotationTime;
module.exports.setNextRotationTime = (time) => { nextRotationTime = time; };
module.exports.setLastRotationTime = (time) => { lastRotationTime = time; };
module.exports.getLastRotationTime = () => lastRotationTime;
