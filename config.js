module.exports = {
  botToken: process.env.BOT_TOKEN,
  
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
  
  voice: {
    createChannelId: "1437800522991009792",
    controlPanelChannelId: "1437799663326593105", 
    categoryId: "1368516666241060884",
    jailRoleId: "1357289247664640043", // Jail role that can NEVER join
    maxTrustedUsers: 50,
    autoCleanup: true,
    cleanupInterval: 5 * 60 * 1000,
    
    regions: [
      'brazil', 'hongkong', 'india', 'japan', 'rotterdam', 
      'russia', 'singapore', 'southafrica', 'sydney', 
      'us-central', 'us-east', 'us-south', 'us-west'
    ],
    
    privacyOptions: {
      'locked': '🔒 مقفل - لا أحد يستطيع الدخول',
      'unlocked-unseen': '👻 مفتوح غير مرئي - يمكن الدخول لكن لا يمكن الرؤية',
      'unlocked-seen': '👀 مفتوح مرئي - يمكن الرؤية والدخول'
    },
    
    defaultSettings: {
      name: "غرفة {username}",
      limit: 0,
      privacy: 'unlocked-seen', // Changed to seen by default
      region: 'automatic'
    }
  }
};
