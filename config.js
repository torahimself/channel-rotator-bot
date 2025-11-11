module.exports = {
  // Bot Configuration
  botToken: process.env.BOT_TOKEN,
  
  // Channel Rotation Config
  rotation: {
    serverId: "1357219315820269578",
    templateChannelId: "1357388121704239134",
    categoryId: "1357382666378280970",
    targetChannelName: "👠．ᴄʜᴀᴛ・الفساد",
    positionChannels: [
      "1418663574493991144",
      "1357384022388379891",
      "1437107048348123136"
    ],
    rotationInterval: 24 * 60 * 60 * 1000,
  },
  
  // Voice System Config
  voice: {
    createChannelId: "YOUR_VOICE_CREATE_CHANNEL_ID", // Replace with actual channel ID
    categoryId: "YOUR_VOICE_CATEGORY_ID" // Replace with actual category ID
  }
};
