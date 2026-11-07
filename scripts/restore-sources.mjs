import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sourceDir = fileURLToPath(new URL("../src/", import.meta.url));
for (const file of ["App.tsx", "style.css"]) {
  const compressed = await readFile(path.join(sourceDir, `${file}${".gz"}`));
  await writeFile(path.join(sourceDir, file), gunzipSync(compressed));
}
