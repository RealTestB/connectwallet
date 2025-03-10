module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-private-methods', { 'loose': true }],
      ['@babel/plugin-transform-private-property-in-object', { 'loose': true }],
      ['@babel/plugin-transform-class-properties', { 'loose': true }],
      '@babel/plugin-transform-flow-strip-types',
      '@babel/plugin-transform-export-namespace-from',
      '@babel/plugin-transform-object-rest-spread',
      '@babel/plugin-transform-optional-catch-binding',
      '@babel/plugin-transform-nullish-coalescing-operator',
      '@babel/plugin-transform-optional-chaining',
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blacklist": null,
        "whitelist": null,
        "safe": false,
        "allowUndefined": true
      }],
      ["module-resolver", {
        "alias": {
          "crypto": "crypto-browserify",
          "stream": "stream-browserify",
          "buffer": "buffer"
        }
      }],
      'react-native-reanimated/plugin',
    ],
  };
};