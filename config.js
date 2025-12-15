module.exports = {
  // Bot Configuration
  botToken: process.env.BOT_TOKEN,
  
  // Channel Rotation Config
  rotation: {
    serverId: "1357219315820269578",
    templateChannelId: "1357388121704239134",
    categoryId: "1357382666378280970",
    targetChannelName: "👠．شات・الفساد",
    positionChannels: [
      "1418663574493991144",
      "1357384022388379891"
    ],
    rotationInterval: 24 * 60 * 60 * 1000,
  }
};

// Easy configuration extension
module.exports.extendConfig = (newConfig) => {
  return Object.assign({}, module.exports, newConfig);
};
