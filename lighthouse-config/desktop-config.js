const {
  screenEmulationMetrics,
  throttling,
  userAgents,
} = require("./constants");

const desktopConfig = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "desktop",
    throttling: throttling.desktopDense4G,
    screenEmulation: screenEmulationMetrics.desktop,
    emulatedUserAgent: userAgents.desktop,
  },
};

module.exports = desktopConfig;
