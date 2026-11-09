// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The app reuses dependency-free modules from the web app (copy, occasions,
// currency and progress rules) so both stay in step. Only src/lib is watched,
// and those files must not import anything outside it.
const sharedLib = path.resolve(__dirname, "../src/lib");
config.watchFolders = [...(config.watchFolders ?? []), sharedLib];

module.exports = config;
