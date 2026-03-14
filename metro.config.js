const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Web build'ta minify sınıf isimlerini siliyor; Expo registerWebModule "Module implementation must be a class" hatası veriyor.
config.transformer.minifierConfig = {
  compress: { keep_classnames: true },
  mangle: { keep_classnames: true },
};

module.exports = withNativeWind(config, { input: "./global.css" });
