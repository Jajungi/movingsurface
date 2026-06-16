/**
 * Merge report/main.tex + report/plot_data/*.dat into report/output/main.tex.
 * Run from project root: node scripts/build_standalone_tex.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportDir = path.join(root, "report");
const plotDir = path.join(reportDir, "plot_data");
const outDir = path.join(reportDir, "output");
const outPath = path.join(outDir, "main.tex");

const mainTex = fs.readFileSync(path.join(reportDir, "main.tex"), "utf8");
const datRefRe = /\{plot_data\/([^}]+\.dat)\}/g;
const files = [...new Set([...mainTex.matchAll(datRefRe)].map((m) => m[1]))].sort();

function macroName(file) {
  return "plottbl" + file.replace(/\.dat$/, "").replace(/[^a-zA-Z0-9]/g, "");
}

const tableBlocks = files
  .map((file) => {
    const src = path.join(plotDir, file);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing plot data: ${src}`);
    }
    const content = fs.readFileSync(src, "utf8").trimEnd();
    return `\\pgfplotstableread[col sep=tab]{\n${content}\n}\\${macroName(file)}`;
  })
  .join("\n\n");

let standalone = mainTex.replace(
  "\\begin{document}",
  [
    "% =====================================================================",
    "% Standalone build: embedded plot tables (build_standalone_tex.mjs)",
    "% =====================================================================",
    tableBlocks,
    "",
    "\\begin{document}",
  ].join("\n")
);

standalone = standalone.replace(datRefRe, (_, file) => `\\${macroName(file)}`);

const header = [
  "% Standalone LaTeX source — pdflatex main.tex (from report/output/).",
  "% Auto-generated from report/main.tex + report/plot_data/ — regenerate with:",
  "%   node scripts/build_standalone_tex.mjs",
  "",
].join("\n");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, header + standalone, "utf8");

console.log(`Wrote ${outPath}`);
console.log(`Embedded ${files.length} plot tables.`);
