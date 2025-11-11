const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');

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
    .setDescription('Check channel rotation status'),
  
  async execute(interaction) {
    const guild = interaction.client.guilds.cache.get(config.rotation.serverId);
    const currentChannel = guild.channels.cache.find(
      (ch) => ch.name === config.rotation.targetChannelName
    );

    const statusEmbed = {
      title: "🤖 Automated Channel Management Status",
      fields: [
        { name: "Status", value: "Enabled ✅", inline: true },
        { name: "Channel Name", value: config.rotation.targetChannelName, inline: true },
        { name: "Channel Type", value: "text", inline: true },
        {
          name: "Next Rotation",
          value: nextRotationTime
            ? `<t:${Math.floor(nextRotationTime.getTime() / 1000)}:F>`
            : "Not scheduled",
          inline: true,
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
          name: "Active Channels",
          value: currentChannel ? "1 ✅" : "0 ❌",
          inline: true,
        },
        {
          name: "Current Position",
          value: currentChannel ? `Position ${currentChannel.position}` : "N/A",
          inline: true,
        },
      ],
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [statusEmbed] });
  },
};

// Export these for rotation system
module.exports.getNextRotationTime = getNextRotationTime;
module.exports.setNextRotationTime = (time) => { nextRotationTime = time; };
module.exports.setLastRotationTime = (time) => { lastRotationTime = time; };
module.exports.getLastRotationTime = () => lastRotationTime;
