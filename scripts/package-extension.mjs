import { mkdir, rm, cp, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const output = "dist";
const staging = `${output}/reddit-slop-filter-${manifest.version}`;
await rm(output, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
for (const item of ["manifest.json", "popup.html", "popup.js", "options.html", "options.js", "ui.css", "src", "assets"]) await cp(item, `${staging}/${item}`, { recursive: true });
const zip = spawnSync("zip", ["-qr", `../reddit-slop-filter-${manifest.version}.zip`, "."], { cwd: staging, stdio: "inherit" });
if (zip.status !== 0) throw new Error("Could not create extension zip");
console.log(`${output}/reddit-slop-filter-${manifest.version}.zip`);
