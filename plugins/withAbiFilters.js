const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

const withAbiFilters = (config, { abiFilters = ['arm64-v8a'] } = {}) => {
  // Set reactNativeArchitectures in gradle.properties
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !item.key || item.key !== 'reactNativeArchitectures'
    );
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: abiFilters.join(','),
    });
    return config;
  });

  // Add ndk.abiFilters to build.gradle defaultConfig
  config = withAppBuildGradle(config, (config) => {
    const abiStr = abiFilters.map((a) => `"${a}"`).join(', ');
    const ndkBlock = `\n        ndk {\n            abiFilters ${abiStr}\n        }`;
    if (!config.modResults.contents.includes('abiFilters')) {
      config.modResults.contents = config.modResults.contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {${ndkBlock}`
      );
    }
    return config;
  });

  return config;
};

module.exports = withAbiFilters;
