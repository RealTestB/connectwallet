// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('@react-native/metro-config');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
  extraNodeModules: {
    // Polyfills for Node.js modules in React Native
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    util: require.resolve('util'),
    url: require.resolve('url'),
    assert: require.resolve('assert'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    os: require.resolve('os-browserify/browser'),
    path: require.resolve('path-browserify'),
  },
};

module.exports = config;
