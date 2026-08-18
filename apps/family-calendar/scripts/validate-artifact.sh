#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"
client="${SITES_PROJECT_ROOT}/dist/client"

[[ -f "${worker}" ]] || {
  echo "Missing Sites Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -f "${hosting}" ]] || {
  echo "Missing packaged Sites manifest: dist/.openai/hosting.json" >&2
  exit 66
}

artwork_assets=(church dance house park school scouts soccer street-corner work)

for asset in manifest.webmanifest sw.js icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png \
  "${artwork_assets[@]/#/event-art/}"; do
  [[ "${asset}" == event-art/* ]] && asset="${asset}.png"
  [[ -f "${client}/${asset}" ]] || {
    echo "Missing installable app asset: dist/client/${asset}" >&2
    exit 66
  }
done

node --input-type=module - "${worker}" "${hosting}" "${client}/manifest.webmanifest" "${client}" <<'NODE'
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [workerPath, hostingPath, manifestPath, clientPath] = process.argv.slice(2);
JSON.parse(await readFile(hostingPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.display !== "standalone" || manifest.start_url !== "/" || manifest.scope !== "/") {
  throw new Error("The packaged web app manifest is not installable.");
}
if (!manifest.icons?.some((icon) => icon.sizes === "192x192") || !manifest.icons?.some((icon) => icon.sizes === "512x512")) {
  throw new Error("The packaged web app manifest is missing required icons.");
}

const artworkFiles = ["church", "dance", "house", "park", "school", "scouts", "soccer", "street-corner", "work"];
const serviceWorker = await readFile(join(clientPath, "sw.js"), "utf8");
for (const name of artworkFiles) {
  const png = await readFile(join(clientPath, "event-art", `${name}.png`));
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || !png.readUInt32BE(16) || !png.readUInt32BE(20)) {
    throw new Error(`The packaged ${name} event artwork is not a valid PNG.`);
  }
  if (!serviceWorker.includes(`/event-art/${name}.png`)) {
    throw new Error(`The service worker does not precache ${name} event artwork.`);
  }
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("sites-validation", `${process.pid}-${Date.now()}`);
const worker = await import(workerUrl.href);
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("dist/server/index.js must have an ESM default export with fetch(request, env, ctx)");
}
NODE

echo "Validated Sites artifact: Worker, hosting manifest, and installable app assets are present."
