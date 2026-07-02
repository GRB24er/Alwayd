const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const fs = require("fs");
const path = require("path");

// ── NativeWind cache pre-seed ────────────────────────────────────────────────
// NativeWind (with forceWriteFileSystem) writes its compiled CSS to
// node_modules/react-native-css-interop/.cache/<platform>.css *during* the
// bundle. On a clean single-pass build (e.g. Vercel's `expo export`), Metro can
// resolve the import and try to hash the file before NativeWind has written it,
// failing with "Failed to get the SHA-1 for: .../.cache/web.css".
// Pre-creating the cache files here — metro.config.js is evaluated before any
// bundling begins — guarantees they exist, so Metro never hard-fails. NativeWind
// then overwrites them with the real compiled CSS during the build.
(() => {
  try {
    const cacheDir = path.join(
      __dirname,
      "node_modules",
      "react-native-css-interop",
      ".cache",
    );
    fs.mkdirSync(cacheDir, { recursive: true });
    for (const name of ["web.css", "ios.css", "android.css", "native.css"]) {
      const file = path.join(cacheDir, name);
      if (!fs.existsSync(file)) fs.writeFileSync(file, "");
    }
  } catch {
    // Non-fatal: if this fails, the build proceeds as before.
  }
})();

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
