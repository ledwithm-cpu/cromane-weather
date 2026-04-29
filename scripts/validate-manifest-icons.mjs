// Validates that every icon listed in public/manifest.webmanifest:
//   - exists on disk under public/
//   - is a real PNG (magic bytes)
//   - matches its declared `sizes` (e.g. "192x192")
//
// Throws on any mismatch so the build fails fast.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Reads PNG width/height from the IHDR chunk.
 * PNG layout: 8-byte signature, then IHDR chunk starting at byte 8:
 *   bytes 8-11   = chunk length
 *   bytes 12-15  = "IHDR"
 *   bytes 16-19  = width  (uint32 BE)
 *   bytes 20-23  = height (uint32 BE)
 */
function readPngDimensions(buf) {
  if (buf.length < 24) throw new Error("file too small to be a PNG");
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("not a PNG (bad signature)");
  }
  if (buf.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("not a PNG (missing IHDR)");
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

export async function validateManifestIcons({
  manifestPath = "public/manifest.webmanifest",
  publicDir = "public",
} = {}) {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];

  if (icons.length === 0) {
    throw new Error(`Manifest ${manifestPath} declares no icons`);
  }

  const errors = [];

  for (const icon of icons) {
    const { src, sizes, type, purpose } = icon;
    const label = `${src} (${sizes}${purpose ? `, ${purpose}` : ""})`;

    if (!src || typeof src !== "string") {
      errors.push(`Icon entry missing "src": ${JSON.stringify(icon)}`);
      continue;
    }

    // Resolve manifest src ("/icon-192.png") to public/icon-192.png
    const relPath = src.startsWith("/") ? src.slice(1) : src;
    const filePath = path.join(publicDir, relPath);

    if (!existsSync(filePath)) {
      errors.push(`${label}: file not found at ${filePath}`);
      continue;
    }

    if (path.extname(filePath).toLowerCase() !== ".png") {
      errors.push(`${label}: extension must be .png (got ${path.extname(filePath)})`);
      continue;
    }

    if (type && type !== "image/png") {
      errors.push(`${label}: manifest type must be "image/png" (got "${type}")`);
    }

    let dims;
    try {
      const buf = await readFile(filePath);
      dims = readPngDimensions(buf);
    } catch (err) {
      errors.push(`${label}: ${err.message}`);
      continue;
    }

    if (!sizes || typeof sizes !== "string") {
      errors.push(`${label}: missing "sizes" declaration`);
      continue;
    }

    // sizes can be "192x192" or "192x192 512x512" — verify the file matches at
    // least one declared size and is square.
    const declared = sizes
      .split(/\s+/)
      .map((s) => s.match(/^(\d+)x(\d+)$/))
      .filter(Boolean)
      .map((m) => ({ w: Number(m[1]), h: Number(m[2]) }));

    if (declared.length === 0) {
      errors.push(`${label}: invalid "sizes" value "${sizes}"`);
      continue;
    }

    const matches = declared.some((d) => d.w === dims.width && d.h === dims.height);
    if (!matches) {
      errors.push(
        `${label}: actual ${dims.width}x${dims.height} does not match declared "${sizes}"`,
      );
    }

    if (dims.width !== dims.height) {
      errors.push(`${label}: icon must be square (got ${dims.width}x${dims.height})`);
    }
  }

  if (errors.length > 0) {
    const msg = `Manifest icon validation failed:\n  - ${errors.join("\n  - ")}`;
    throw new Error(msg);
  }

  return { ok: true, count: icons.length };
}

// Allow running directly: `node scripts/validate-manifest-icons.mjs`
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  validateManifestIcons()
    .then(({ count }) => {
      console.log(`✓ Manifest icons valid (${count} checked)`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
