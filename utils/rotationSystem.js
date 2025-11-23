const config = require('../config.js');
const statusCommand = require('../commands/rotation/status');

let rotationInterval;
let rotationCount = 0;

function scheduleNextRotation() {
  const nextRotation = statusCommand.getNextRotationTime();
  statusCommand.setNextRotationTime(nextRotation);
  
  const now = new Date();
  const timeUntilRotation = nextRotation.getTime() - now.getTime();
  const hoursUntil = Math.round(timeUntilRotation / (1000 * 60 * 60));
  
  console.log(`⏰ Next rotation in ${hoursUntil}h at: ${nextRotation.toUTCString()} (6 AM Riyadh)`);
}

function startRotationCycle(client) {
  const now = new Date();
  const nextRotation = statusCommand.getNextRotationTime();
  const timeUntilRotation = nextRotation.getTime() - now.getTime();

  console.log(`⏰ First rotation in: ${Math.round(timeUntilRotation / (1000 * 60 * 60))} hours`);

  // Clear any existing interval
  if (rotationInterval) {
    clearInterval(rotationInterval);
  }

  setTimeout(() => {
    rotateChannel(client);
    // Set daily interval
    rotationInterval = setInterval(() => rotateChannel(client), config.rotation.rotationInterval);
  }, timeUntilRotation);
}

async function rotateChannel(client) {
  try {
    rotationCount++;
    console.log(`🔄 Starting daily channel rotation #${rotationCount}...`);

    const guild = client.guilds.cache.get(config.rotation.serverId);
    if (!guild) {
      console.log("❌ Server not found");
      return;
    }

    const templateChannel = guild.channels.cache.get(config.rotation.templateChannelId);
    if (!templateChannel) {
      console.log("❌ Template channel not found");
      return;
    }

    const category = guild.channels.cache.get(config.rotation.categoryId);
    if (!category) {
      console.log("❌ Category not found");
      return;
    }

    const oldChannel = guild.channels.cache.find(
      (ch) => ch.name === config.rotation.targetChannelName
    );

    // Get the actual channel objects and find the highest position
    let highestPosition = 0;
    let targetPosition = 0;

    console.log("📊 Calculating channel positions...");

    // Get all channels in the category
    const categoryChannels = guild.channels.cache.filter(
      (ch) => ch.parentId === config.rotation.categoryId
    );

    // Find the highest position among the specified channels
    for (const channelId of config.rotation.positionChannels) {
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

    // Set position to be right after the highest of the specified channels
    targetPosition = highestPosition + 1;

    console.log(`🎯 Target position: ${targetPosition} (after position ${highestPosition})`);
    console.log(`📋 Creating new channel: ${config.rotation.targetChannelName}`);

    // Create channel with the custom topic
    const newChannel = await guild.channels.create({
      name: config.rotation.targetChannelName,
      type: templateChannel.type,
      parent: config.rotation.categoryId,
      topic: "شات مخصص للرول بلاي - يرجى مراجعة القوانين",
      nsfw: templateChannel.nsfw,
      permissionOverwrites: templateChannel.permissionOverwrites.cache,
      rateLimitPerUser: templateChannel.rateLimitPerUser,
    });

    console.log(`✅ New channel created: ${newChannel.id} at initial position ${newChannel.position}`);

    // Set the position explicitly after creation
    console.log(`📐 Setting channel position to: ${targetPosition}`);
    await newChannel.setPosition(targetPosition);
    console.log(`✅ Channel position updated to: ${newChannel.position}`);

    if (oldChannel) {
      await oldChannel.delete();
      console.log(`🗑️ Old channel deleted: ${oldChannel.id}`);
    }

    await newChannel.send(
      `🔄 **Channel Auto-Rotated**\n• Rotation #${rotationCount}\n• Created: <t:${Math.floor(Date.now() / 1000)}:F>\n• Next rotation: <t:${Math.floor((Date.now() + config.rotation.rotationInterval) / 1000)}:F>\n• Position: Below specified channels`
    );

    // Update rotation times
    statusCommand.setLastRotationTime(new Date());
    scheduleNextRotation();
    
    console.log(`🎯 Daily rotation #${rotationCount} completed successfully! Final channel position: ${newChannel.position}`);
  } catch (error) {
    console.error("❌ Error during rotation:", error);
  }
}

// Public API for status endpoint
function getNextRotationTime() {
  return statusCommand.getNextRotationTime();
}

function getLastRotationTime() {
  return statusCommand.getLastRotationTime();
}

function getRotationCount() {
  return rotationCount;
}

module.exports = {
  scheduleNextRotation,
  startRotationCycle,
  rotateChannel,
  getNextRotationTime,
  getLastRotationTime,
  getRotationCount
};
