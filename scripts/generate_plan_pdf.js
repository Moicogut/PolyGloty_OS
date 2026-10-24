import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const mdPath = path.join(rootDir, "PLAN_MAESTRO_PERSONALIZACION_CURRICULUM_SUFICIENCIA.md");
const htmlPath = path.join(rootDir, "temp_plan_preview.html");
const pdfPath = path.join(rootDir, "PLAN_MAESTRO_PERSONALIZACION_CURRICULUM_SUFICIENCIA.pdf");

const mdContent = fs.readFileSync(mdPath, "utf-8");

// Parser básico y limpio de Markdown a HTML elegante
function parseMarkdownToHtml(md) {
  const lines = md.split("\n");
  let html = "";
  let inCodeBlock = false;
  let codeLang = "";
  let codeBuffer = [];
  let inTable = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        html += `<pre><code class="language-${codeLang}">${escapeHtml(codeBuffer.join("\n"))}</code></pre>\n`;
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = "";
      } else {
        if (inList) { html += "</ul>\n"; inList = false; }
        if (inTable) { html += "</table>\n"; inTable = false; }
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith("|")) {
      if (inList) { html += "</ul>\n"; inList = false; }
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      // Check if divider line
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        continue;
      }
      if (!inTable) {
        html += `<table class="styled-table">\n<thead>\n<tr>${cells.map(c => `<th>${formatInline(c)}</th>`).join("")}</tr>\n</thead>\n<tbody>\n`;
        inTable = true;
      } else {
        html += `<tr>${cells.map(c => `<td>${formatInline(c)}</td>`).join("")}</tr>\n`;
      }
      continue;
    } else if (inTable) {
      html += "</tbody>\n</table>\n";
      inTable = false;
    }

    // Headings
    if (line.startsWith("# ")) {
      if (inList) { html += "</ul>\n"; inList = false; }
      html += `<h1>${formatInline(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { html += "</ul>\n"; inList = false; }
      html += `<h2>${formatInline(line.slice(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) { html += "</ul>\n"; inList = false; }
      html += `<h3>${formatInline(line.slice(4))}</h3>\n`;
      continue;
    }
    if (line.startsWith("#### ")) {
      if (inList) { html += "</ul>\n"; inList = false; }
      html += `<h4>${formatInline(line.slice(5))}</h4>\n`;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === "---") {
      if (inList) { html += "</ul>\n"; inList = false; }
      html += `<hr class="styled-hr">\n`;
      continue;
    }

    // Lists
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        html += `<ul>\n`;
        inList = true;
      }
      const itemText = line.replace(/^\s*[-*]\s+/, "");
      html += `  <li>${formatInline(itemText)}</li>\n`;
      continue;
    } else if (/^\s*\d+\.\s+/.test(line)) {
      if (inList) { html += "</ul>\n"; inList = false; }
      const itemText = line.replace(/^\s*\d+\.\s+/, "");
      html += `  <div class="num-item">${formatInline(itemText)}</div>\n`;
      continue;
    } else if (inList) {
      html += "</ul>\n";
      inList = false;
    }

    // Empty line
    if (!line.trim()) {
      continue;
    }

    // Normal paragraph
    html += `<p>${formatInline(line)}</p>\n`;
  }

  if (inTable) html += "</tbody>\n</table>\n";
  if (inList) html += "</ul>\n";
  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatInline(str) {
  let s = escapeHtml(str);
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  return s;
}

const parsedBody = parseMarkdownToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Plan Maestro de Arquitectura y Pedagogía Lingüística · Polyglot Voice</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');
  
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-right {
      content: counter(page);
    }
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }

  h1 {
    font-size: 22pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 3px solid #4f46e5;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #4338ca;
    margin-top: 24px;
    margin-bottom: 12px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #e2e8f0;
    page-break-after: avoid;
  }

  h3 {
    font-size: 12pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }

  h4 {
    font-size: 11pt;
    font-weight: 600;
    color: #334155;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }

  p {
    margin: 6px 0 10px 0;
    text-align: justify;
  }

  ul {
    margin: 6px 0 12px 20px;
    padding: 0;
  }

  li {
    margin-bottom: 4px;
  }

  .num-item {
    margin: 4px 0 6px 14px;
  }

  strong {
    font-weight: 700;
    color: #0f172a;
  }

  .inline-code {
    background-color: #f1f5f9;
    color: #0369a1;
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 9pt;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  pre {
    background: #0f172a;
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: 8px;
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 8.5pt;
    line-height: 1.45;
    overflow-x: auto;
    page-break-inside: avoid;
    margin: 12px 0;
    border: 1px solid #1e293b;
  }

  pre code {
    background: transparent;
    color: inherit;
    border: none;
    padding: 0;
  }

  .styled-table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }

  .styled-table th, .styled-table td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }

  .styled-table th {
    background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
    border-bottom: 2px solid #4f46e5;
  }

  .styled-table tr:nth-child(even) td {
    background: #f8fafc;
  }

  .styled-hr {
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 20px 0;
  }

  .banner-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 10px 14px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
  }
</style>
</head>
<body>
  ${parsedBody}
</body>
</html>
`;

fs.writeFileSync(htmlPath, fullHtml, "utf-8");

console.log("HTML intermedio generado:", htmlPath);

// Ejecutar Chrome Headless para imprimir a PDF
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chromeCmd = `"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;

console.log("Ejecutando comando Chrome Headless...");
try {
  execSync(chromeCmd, { stdio: "inherit" });
  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`PDF generado con éxito: ${pdfPath} (${stats.size} bytes)`);
    // Limpiar archivo HTML intermedio
    try { fs.unlinkSync(htmlPath); } catch {}
  } else {
    console.error("Error: El archivo PDF no se generó.");
    process.exit(1);
  }
} catch (err) {
  console.error("Error al ejecutar Chrome para PDF:", err.message);
  process.exit(1);
}
