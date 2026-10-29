// One classic-script bundle (not an ES module), so dist/index.html also works when opened from disk.
import { build } from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";

mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/main.jsx"], bundle: true, minify: true, format: "iife", target: "es2019",
  outfile: "dist/app.js", define: { "process.env.NODE_ENV": '"production"' }, jsx: "automatic", loader: { ".jsx": "jsx" },
});
copyFileSync("src/index.html", "dist/index.html");
copyFileSync("src/styles.css", "dist/styles.css");
if (!existsSync("dist/config.js")) copyFileSync("src/config.example.js", "dist/config.js");
console.log("built dist/");
