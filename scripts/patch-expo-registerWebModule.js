/**
 * Web build'ta minify sonrası "Module implementation must be a class" hatasını
 * gidermek için expo-modules-core registerWebModule'a fallback isim ekler.
 * postinstall ile çalıştırılır.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-modules-core",
  "src",
  "registerWebModule.ts"
);

if (!fs.existsSync(file)) {
  process.exit(0);
}

let content = fs.readFileSync(file, "utf8");

if (content.includes("_fallbackId")) {
  process.exit(0);
}

content = content.replace(
  "import type { NativeModule } from './ts-declarations/NativeModule';\n\n/**",
  "import type { NativeModule } from './ts-declarations/NativeModule';\n\nlet _fallbackId = 0;\n\n/**"
);

const oldBlock =
  "const moduleName = moduleImplementation.name;\n  if (!moduleName) {\n    throw new Error('Module implementation must be a class');\n  }";
const newBlock =
  "let moduleName = moduleImplementation.name;\n  if (!moduleName) {\n    moduleName = `ExpoWebModule_${++_fallbackId}`;\n  }";

content = content.replace(oldBlock, newBlock);

fs.writeFileSync(file, content);
console.log("Applied registerWebModule patch for web (minified class name fix).");
