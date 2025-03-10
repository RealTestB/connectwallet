// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "mjs", "cjs"],
  extraNodeModules: {
    crypto: "crypto-browserify",
    stream: "stream-browserify",
    buffer: "buffer",
    process: "process/browser",
    util: "util",
    url: "url",
    assert: "assert",
    http: "stream-http",
    https: "https-browserify",
    os: "os-browserify/browser",
    path: "path-browserify"
  }
};

module.exports = config;
