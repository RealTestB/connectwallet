module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      ['@babel/plugin-transform-private-methods', { loose: false }],
      ['@babel/plugin-transform-private-property-in-object', { loose: false }],
      ['@babel/plugin-transform-class-properties', { loose: false }],
      '@babel/plugin-transform-export-namespace-from',
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "safe": true,
        "allowUndefined": false
      }],
      ["module-resolver", {
        "alias": {
          "crypto": "crypto-browserify",
          "stream": "stream-browserify",
          "buffer": "buffer"
        }
      }],
      'react-native-reanimated/plugin'
    ],
  };
};
