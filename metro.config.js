// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "mjs", "cjs"],
  extraNodeModules: {
    // Crypto-related polyfills
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer"),
    process: require.resolve("process/browser"),
    // Additional polyfills needed for web3
    util: require.resolve("util"),
    url: require.resolve("url"),
    assert: require.resolve("assert"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify/browser"),
    path: require.resolve("path-browserify")
  }
};

module.exports = config;
