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
    createChannelId: "1437800522991009792",
    controlPanelChannelId: "1437799663326593105", 
    categoryId: "1368516666241060884",
    jailRoleId: "1357289247664640043",
    maxTrustedUsers: 50,
    
    regions: [
      'brazil', 'hongkong', 'india', 'japan', 'rotterdam', 
      'russia', 'singapore', 'southafrica', 'sydney', 
      'us-central', 'us-east', 'us-south', 'us-west'
    ],
    
    defaultSettings: {
      name: "{username}'s Room", // CHANGED: Removed Arabic
      limit: 0,
      privacy: 'unlocked-seen',
      region: 'automatic'
    }
  }
};
