import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
for (const file of ["App.tsx", "style.css"]) {
  const destination = path.join(sourceDir, file);
  let current = "";
  try { current = await readFile(destination, "utf8"); } catch {}
  const isPlaceholder = current.startsWith("// RESTORE_FROM_GZIP") || current.startsWith("/* RESTORE_FROM_GZIP */");
  if (!isPlaceholder) continue;
  const compressed = await readFile(`${destination}.gz`);
  await writeFile(destination, gunzipSync(compressed));
}
