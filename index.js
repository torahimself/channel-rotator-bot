const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const config = {
  serverId: "1357219315820269578",
  templateChannelId: "1357388121704239134",
  categoryId: "1357382666378280970",
  targetChannelName: "👠．ᴄʜᴀᴛ・الفساد",
  positionChannels: [
    "1418663574493991144",
    "1426480048319369327",
    "1357384022388379891",
  ],
  rotationInterval: 24 * 60 * 60 * 1000,
  status: "Enabled ✅",
};

let nextRotationTime = null;
let lastRotationTime = null;

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

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check channel rotation status"),
];

client.once("ready", async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}!`);

  // Register slash commands
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, config.serverId),
      { body: commands },
    );
    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.log(
      "ℹ️  Slash commands not registered (bot may not have permission)",
    );
    console.log(
      "ℹ️  You can still use the bot - it will auto-rotate channels daily",
    );
  }

  console.log(
    "🔄 Channel rotation system activated! Daily at 6 AM Riyadh time (3 AM UTC)",
  );

  scheduleNextRotation();
  startRotationCycle();
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "status") {
    const guild = client.guilds.cache.get(config.serverId);
    const currentChannel = guild.channels.cache.find(
      (ch) => ch.name === config.targetChannelName,
    );

    const statusEmbed = {
      title: "🤖 Automated Channel Management Status",
      fields: [
        { name: "Status", value: config.status, inline: true },
        { name: "Channel Name", value: config.targetChannelName, inline: true },
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
        { name: "Category", value: `<#${config.categoryId}>`, inline: true },
        {
          name: "Template",
          value: `<#${config.templateChannelId}>`,
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
  }
});

function scheduleNextRotation() {
  nextRotationTime = getNextRotationTime();
  console.log(
    `⏰ Next rotation scheduled at: ${nextRotationTime.toUTCString()} (6 AM Riyadh)`,
  );
}

function startRotationCycle() {
  const now = new Date();
  const timeUntilRotation = nextRotationTime.getTime() - now.getTime();

  console.log(
    `⏰ First rotation in: ${Math.round(timeUntilRotation / (1000 * 60 * 60))} hours`,
  );

  setTimeout(() => {
    rotateChannel();
    setInterval(rotateChannel, config.rotationInterval);
  }, timeUntilRotation);
}

async function rotateChannel() {
  try {
    console.log("🔄 Starting daily channel rotation...");

    const guild = client.guilds.cache.get(config.serverId);
    if (!guild) {
      console.log("❌ Server not found");
      return;
    }

    const templateChannel = guild.channels.cache.get(config.templateChannelId);
    if (!templateChannel) {
      console.log("❌ Template channel not found");
      return;
    }

    const category = guild.channels.cache.get(config.categoryId);
    if (!category) {
      console.log("❌ Category not found");
      return;
    }

    const oldChannel = guild.channels.cache.find(
      (ch) => ch.name === config.targetChannelName,
    );

    // Get the actual channel objects and find the highest position
    let highestPosition = 0;
    let targetPosition = 0;

    console.log("📊 Calculating channel positions...");

    // Get all channels in the category
    const categoryChannels = guild.channels.cache.filter(
      (ch) => ch.parentId === config.categoryId,
    );

    // Find the highest position among the 3 specified channels
    for (const channelId of config.positionChannels) {
      const channel = categoryChannels.get(channelId);
      if (channel) {
        console.log(`📍 Channel ${channel.name}: Position ${channel.position}`);
        if (channel.position > highestPosition) {
          highestPosition = channel.position;
        }
      } else {
        console.log(`❌ Position channel not found: ${channelId}`);
      }
    }

    // Set position to be right after the highest of the 3 channels
    targetPosition = highestPosition + 1;

    console.log(
      `🎯 Target position: ${targetPosition} (after position ${highestPosition})`,
    );

    console.log(`📋 Creating new channel: ${config.targetChannelName}`);

    // Create channel first without position
    const newChannel = await guild.channels.create({
      name: config.targetChannelName,
      type: templateChannel.type,
      parent: config.categoryId,
      topic: templateChannel.topic,
      nsfw: templateChannel.nsfw,
      permissionOverwrites: templateChannel.permissionOverwrites.cache,
      rateLimitPerUser: templateChannel.rateLimitPerUser,
    });

    console.log(
      `✅ New channel created: ${newChannel.id} at initial position ${newChannel.position}`,
    );

    // Set the position explicitly after creation
    console.log(`📐 Setting channel position to: ${targetPosition}`);
    await newChannel.setPosition(targetPosition);
    console.log(`✅ Channel position updated to: ${newChannel.position}`);

    if (oldChannel) {
      await oldChannel.delete();
      console.log(`🗑️ Old channel deleted: ${oldChannel.id}`);
    }

    await newChannel.send(
      `🔄 **Channel Auto-Rotated**\n• Created: <t:${Math.floor(Date.now() / 1000)}:F>\n• Next rotation: <t:${Math.floor((Date.now() + config.rotationInterval) / 1000)}:F>\n• Position: Below specified channels`,
    );

    lastRotationTime = new Date();
    scheduleNextRotation();
    console.log(
      `🎯 Daily rotation completed successfully! Final channel position: ${newChannel.position}`,
    );
  } catch (error) {
    console.error("❌ Error during rotation:", error);
  }
}

client.login(process.env.BOT_TOKEN);
