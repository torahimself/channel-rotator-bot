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
    rotationInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },
  
  // Voice System Config
  voice: {
    // REPLACE THESE WITH YOUR ACTUAL CHANNEL IDs:
    createChannelId: "YOUR_CREATE_VOICE_CHANNEL_ID", // Users join this to create temp voice
    controlPanelChannelId: "YOUR_CONTROL_PANEL_CHANNEL_ID", // Where control panels appear
    categoryId: "YOUR_VOICE_CATEGORY_ID", // Where temp voice channels are created
    
    // System Settings
    maxTrustedUsers: 50,
    autoCleanup: true, // Auto-delete empty temp channels
    cleanupInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
    
    // Available Voice Regions
    regions: [
      'brazil',
      'hongkong', 
      'india',
      'japan',
      'rotterdam',
      'russia',
      'singapore',
      'southafrica',
      'sydney',
      'us-central', 
      'us-east',
      'us-south',
      'us-west'
    ],
    
    // Privacy Options
    privacyOptions: {
      'locked': '🔒 Locked - No one can join',
      'unlocked-unseen': '👻 Unlocked Unseen - Can join but cannot see',
      'unlocked-seen': '👀 Unlocked Seen - Can see and join'
    },
    
    // Default Channel Settings
    defaultSettings: {
      name: "{username}'s Room",
      limit: 0, // 0 = no limit
      privacy: 'unlocked-seen',
      region: 'automatic'
    }
  }
};
