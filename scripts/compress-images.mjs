#!/usr/bin/env node
/**
 * Auto-compress images in public/loc_pic/
 *
 * Strategy:
 *  - Skip files smaller than SKIP_BELOW_KB (already optimal)
 *  - For larger files: resize to MAX_WIDTH px wide + recompress with target QUALITY
 *  - Keep original extension (.jpg → .jpg, .png → .png, .webp → .webp)
 *  - Only overwrite if the new version is meaningfully smaller (>10% reduction)
 *
 * Usage:
 *   node scripts/compress-images.mjs              # compress all eligible files
 *   node scripts/compress-images.mjs --dry-run    # preview without writing
 *   node scripts/compress-images.mjs --webp       # ALSO convert .jpg/.png → .webp (smaller)
 *
 * Requirements:
 *   bun add -d sharp
 *   # or: npm install --save-dev sharp
 */

import { readdir, stat, readFile, writeFile, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const DIR = "public/loc_pic";
const SKIP_BELOW_KB = 250; // don't touch files already this small
const MAX_WIDTH = 1600; // resize wider images down
const QUALITY = 82; // JPEG/WebP quality
const PNG_COMPRESSION = 9; // 0-9 (max)

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const TO_WEBP = args.has("--webp");

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
};

function fmtKB(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function pct(orig, neu) {
  return `${((1 - neu / orig) * 100).toFixed(0)}%`;
}

async function compressOne(filepath) {
  const ext = extname(filepath).toLowerCase();
  const original = await readFile(filepath);
  const origSize = original.length;

  if (origSize < SKIP_BELOW_KB * 1024) {
    return { skipped: true, reason: "already small", origSize };
  }

  let pipeline = sharp(original).rotate(); // honor EXIF orientation
  const meta = await sharp(original).metadata();
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  let outBuffer;
  let outExt = ext;

  if (TO_WEBP) {
    outBuffer = await pipeline.webp({ quality: QUALITY, effort: 4 }).toBuffer();
    outExt = ".webp";
  } else if (ext === ".jpg" || ext === ".jpeg") {
    outBuffer = await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
  } else if (ext === ".png") {
    outBuffer = await pipeline
      .png({ compressionLevel: PNG_COMPRESSION, palette: true })
      .toBuffer();
  } else if (ext === ".webp") {
    outBuffer = await pipeline.webp({ quality: QUALITY, effort: 4 }).toBuffer();
  } else {
    return { skipped: true, reason: `unsupported ext ${ext}`, origSize };
  }

  const newSize = outBuffer.length;
  const reduction = (1 - newSize / origSize) * 100;

  if (reduction < 10 && outExt === ext) {
    return { skipped: true, reason: "already optimal", origSize };
  }

  if (!DRY_RUN) {
    const outPath = outExt === ext ? filepath : filepath.replace(ext, outExt);
    await writeFile(outPath, outBuffer);
    if (outPath !== filepath) {
      // remove the original file when extension changed
      await unlink(filepath);
    }
  }

  return { compressed: true, origSize, newSize, outExt, ext };
}

async function main() {
  console.log(`${COLORS.cyan}🖼️  Image compressor${COLORS.reset}`);
  console.log(`   dir: ${DIR}`);
  console.log(`   max width: ${MAX_WIDTH}px, quality: ${QUALITY}`);
  console.log(`   skip below: ${SKIP_BELOW_KB} KB`);
  if (TO_WEBP) console.log(`   ${COLORS.yellow}MODE: convert to .webp${COLORS.reset}`);
  if (DRY_RUN) console.log(`   ${COLORS.yellow}DRY RUN (no files written)${COLORS.reset}`);
  console.log();

  let files;
  try {
    files = (await readdir(DIR))
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort();
  } catch (err) {
    console.error(`${COLORS.red}Error reading ${DIR}: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No images found.");
    return;
  }

  let totalOrig = 0;
  let totalNew = 0;
  const renamed = [];

  for (const f of files) {
    const filepath = join(DIR, f);
    try {
      const result = await compressOne(filepath);
      totalOrig += result.origSize;

      if (result.skipped) {
        console.log(
          `${COLORS.gray}⊘ ${f.padEnd(45)} ${fmtKB(result.origSize).padStart(8)}  (${result.reason})${COLORS.reset}`,
        );
        totalNew += result.origSize;
      } else {
        const oldExt = result.ext;
        const newExt = result.outExt;
        const renameMark = oldExt !== newExt ? `${COLORS.yellow}→${newExt}${COLORS.reset}` : "";
        console.log(
          `${COLORS.green}✓ ${f.padEnd(45)} ${fmtKB(result.origSize).padStart(8)} → ${fmtKB(result.newSize).padStart(8)}  -${pct(result.origSize, result.newSize).padStart(3)} ${renameMark}${COLORS.reset}`,
        );
        totalNew += result.newSize;
        if (oldExt !== newExt) {
          const oldName = basename(filepath);
          const newName = oldName.replace(oldExt, newExt);
          renamed.push({ slug: newName.replace(newExt, ""), old: oldName, new: newName });
        }
      }
    } catch (err) {
      console.log(`${COLORS.red}✗ ${f}: ${err.message}${COLORS.reset}`);
    }
  }

  console.log();
  console.log(
    `${COLORS.cyan}Summary:${COLORS.reset}  ${fmtKB(totalOrig)} → ${fmtKB(totalNew)}  ` +
      `(saved ${COLORS.green}${pct(totalOrig, totalNew)}${COLORS.reset}, ${fmtKB(totalOrig - totalNew)})`,
  );

  if (renamed.length > 0) {
    console.log();
    console.log(`${COLORS.yellow}⚠ Files were renamed (extension changed).${COLORS.reset}`);
    console.log(`Run this SQL to update the database:\n`);
    for (const r of renamed) {
      console.log(
        `UPDATE places SET image_url = '/loc_pic/${r.new}' WHERE slug = '${r.slug}';`,
      );
    }
  }

  if (DRY_RUN) {
    console.log();
    console.log(`${COLORS.yellow}(dry run — no files were modified)${COLORS.reset}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
