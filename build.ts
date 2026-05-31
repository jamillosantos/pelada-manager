#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { cp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import plugin from "bun-plugin-tailwind";

const outdir = path.join(process.cwd(), "dist");

if (existsSync(outdir)) {
	await rm(outdir, { recursive: true, force: true });
}

const entrypoints = [...new Bun.Glob("**.html").scanSync("src")]
	.map((a) => path.resolve("src", a))
	.filter((dir) => !dir.includes("node_modules"));

const result = await Bun.build({
	entrypoints,
	outdir,
	// relative paths so the app works under a GitHub Pages subpath (/<repo>/)
	publicPath: "./",
	plugins: [plugin],
	minify: true,
	target: "browser",
	sourcemap: "linked",
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
});

// GitHub Pages runs Jekyll, which ignores files/dirs starting with "_".
// This disables it so bundled assets are served as-is.
await writeFile(path.join(outdir, ".nojekyll"), "");

// GitHub Pages serves 404.html for any unknown path. Copying index.html there
// makes a bare path (e.g. /jogos) or a refresh load the app instead of a 404.
await cp(path.join(outdir, "index.html"), path.join(outdir, "404.html"));

console.log(`Build completed: ${result.outputs.length} files`);
