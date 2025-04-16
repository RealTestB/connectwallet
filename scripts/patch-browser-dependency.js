// scripts/patch-browser-dependency.js
module.exports = function configureProject(config) {
  if (!config.modResults) return config;

  const resolution = `
allprojects {
  configurations.all {
    resolutionStrategy {
      force "androidx.browser:browser:1.8.0"
    }
  }
}
  `.trim();

  const buildGradlePath = "./android/build.gradle";
  const fs = require("fs");

  if (fs.existsSync(buildGradlePath)) {
    const buildGradle = fs.readFileSync(buildGradlePath, "utf8");
    if (!buildGradle.includes("androidx.browser:browser:1.8.0")) {
      fs.writeFileSync(buildGradlePath, buildGradle + "\n\n" + resolution);
    }
  }

  return config;
};
