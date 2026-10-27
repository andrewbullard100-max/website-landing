#!/usr/bin/env node
// Regenerates sitemap.xml from the HTML pages in the site root.
// Usage: node scripts/generate-sitemap.js
// Requires Node.js 16+. Run from the repo root.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://foodsafeiq.com";
const ROOT = path.resolve(__dirname, "..");

// Priority and changefreq rules — first match wins
const RULES = [
  { test: (f) => f === "index.html",                priority: "1.0", changefreq: "weekly" },
  { test: (f) => f === "pricing.html",              priority: "0.8", changefreq: "monthly" },
  { test: (f) => f === "blog.html",                 priority: "0.7", changefreq: "weekly" },
  { test: (f) => f.startsWith("vs-"),               priority: "0.7", changefreq: "monthly" },
  { test: (f) => f.startsWith("solutions-"),        priority: "0.7", changefreq: "monthly" },
  { test: (f) => f.startsWith("blog-"),             priority: "0.6", changefreq: "monthly" },
  { test: (f) => f.startsWith("states-"),           priority: "0.6", changefreq: "monthly" },
  { test: (f) => f === "privacy.html",              priority: "0.3", changefreq: "yearly" },
  { test: (f) => f === "terms.html",                priority: "0.3", changefreq: "yearly" },
];

function getLastmod(filepath) {
  try {
    const iso = execSync(
      `git log -1 --format=%cI -- "${filepath}"`,
      { cwd: ROOT, encoding: "utf8" }
    ).trim();
    if (!iso) return null;
    return iso.slice(0, 10); // YYYY-MM-DD
  } catch {
    return null;
  }
}

function getRule(filename) {
  for (const rule of RULES) {
    if (rule.test(filename)) return rule;
  }
  return { priority: "0.5", changefreq: "monthly" };
}

const htmlFiles = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith(".html"))
  .sort();

// Canonical order: home first, then by priority desc, then alpha
const ORDER = [
  "index.html",
  "pricing.html",
  "vs-jolt.html", "vs-crunchtime.html", "vs-fooddocs.html",
  "solutions-higher-education.html", "solutions-healthcare-dining.html",
];
const ordered = [
  ...ORDER.filter((f) => htmlFiles.includes(f)),
  ...htmlFiles.filter((f) => !ORDER.includes(f) && !["privacy.html","terms.html"].includes(f)),
  "privacy.html",
  "terms.html",
].filter((f) => htmlFiles.includes(f));

const entries = ordered.map((file) => {
  const loc = file === "index.html"
    ? `${BASE_URL}/`
    : `${BASE_URL}/${file}`;
  const lastmod = getLastmod(path.join(ROOT, file)) || new Date().toISOString().slice(0, 10);
  const { priority, changefreq } = getRule(file);
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

const outPath = path.join(ROOT, "sitemap.xml");
fs.writeFileSync(outPath, xml, "utf8");
console.log(`Wrote ${entries.length} URLs to sitemap.xml`);
