const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');

let nextRotationTime = new Date(Date.now() + config.rotation.rotationInterval);
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
        {
          name: "Next Rotation",
          value: `<t:${Math.floor(nextRotationTime.getTime() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "Last Rotation",
          value: lastRotationTime ? `<t:${Math.floor(lastRotationTime.getTime() / 1000)}:R>` : "Never",
          inline: true,
        },
      ],
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [statusEmbed] });
  },
};
