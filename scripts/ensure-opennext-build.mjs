import fs from "node:fs";
import path from "node:path";

const deployJsPath = path.join(
  process.cwd(),
  "node_modules/@opennextjs/cloudflare/dist/cli/commands/deploy.js",
);

if (fs.existsSync(deployJsPath)) {
  let src = fs.readFileSync(deployJsPath, "utf8");
  if (!src.includes("auto-build-if-missing")) {
    src =
      `import { existsSync } from "node:fs";\nimport { buildCommand } from "./build.js";\n` +
      src.replace(
        "export async function deployCommand(args) {",
        `export async function deployCommand(args) {
    // auto-build-if-missing: ensures Cloudflare CI deploy succeeds even if Build command only ran "next build" or was empty
    if (!existsSync(".open-next/.build/open-next.config.edge.mjs")) {
        await buildCommand({ ...args, skipNextBuild: false, noMinify: false, skipWranglerConfigCheck: true });
    }`,
      );
    fs.writeFileSync(deployJsPath, src, "utf8");
    console.log("[postinstall] Patched @opennextjs/cloudflare deployCommand with auto-build fallback.");
  }
}
