const fs = require("fs");
const path = require("path");

const baseDir = __dirname;
const htmlPath = path.join(baseDir, "index.html");

const sections = [
  { id: "introduccion", file: path.join(baseDir, "Introduccion", "introduccion.md"), autoPdf: true },
  { id: "vip", file: path.join(baseDir, "VIP & LPU", "vip.md") },
  { id: "horarios", file: path.join(baseDir, "Horarios", "horariosvenue.md") },
  { id: "artista", file: path.join(baseDir, "Artista", "horariosartista.md") },
  { id: "parking", file: path.join(baseDir, "Parking", "Explicacion.md") },
  { id: "hospitalidad", file: path.join(baseDir, "Hospitalidad", "hospitalidad.md") },
  { id: "logistica", file: path.join(baseDir, "Logistica", "Logistica.md") },
  { id: "contactos", file: path.join(baseDir, "Contactos", "contactos.md") }
];

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function markdownToHtml(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const html = [];
  let i = 0;

  const renderInline = (text) => {
    let out = escapeHtml(text);
    out = out.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
      const url = src.replace(/&amp;/g, "&");
      if (url.toLowerCase().endsWith('.pdf')) {
        return `<div style="margin-top: 14px; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: #000;">
                  <iframe src="${url}#view=FitH" width="100%" style="height: 100vh; min-height: 1000px; border:none; display:block;"></iframe>
                </div>`;
      }
      return `<img src="${url}" alt="${alt}" style="max-width:100%; border-radius: 10px; margin-top: 14px; border: 1px solid var(--line);">`;
    });
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\[(.*?)\]\((.*?)\)/g, (m, label, url) => {
      const cleanUrl = url.replace(/&amp;/g, "&");
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    return out;
  };

  const splitTableRow = (line) => line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => renderInline(cell.trim()));

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (/^#\s+/.test(line)) { html.push(`<h1>${renderInline(line.replace(/^#\s+/, ""))}</h1>`); i++; continue; }
    if (/^##\s+/.test(line)) { html.push(`<h2>${renderInline(line.replace(/^##\s+/, ""))}</h2>`); i++; continue; }
    if (/^###\s+/.test(line)) { html.push(`<h3>${renderInline(line.replace(/^###\s+/, ""))}</h3>`); i++; continue; }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^-\s+/, ""))}</li>`);
        i++;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
    const isTableHeader = line.startsWith("|") && /^\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?$/.test(nextLine);
    if (isTableHeader) {
      const headers = splitTableRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = splitTableRow(lines[i]);
        rows.push(`<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`);
        i++;
      }
      html.push(`<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`);
      continue;
    }

    if (line.startsWith("<")) {
      html.push(line);
      i++;
      continue;
    }

    html.push(`<p>${renderInline(line)}</p>`);
    i++;
  }

  return `<div class="card md">${html.join("\n")}</div>`;
}

function upsertPanel(html, sectionId, content) {
  let startTag = `<section id="tab-${sectionId}" class="panel">`;
  let start = html.indexOf(startTag);
  if (start === -1) {
    startTag = `<section id="tab-${sectionId}" class="panel active">`;
    start = html.indexOf(startTag);
  }
  
  if (start === -1) {
    if (sectionId === "produccion") {
       const introSectionEnd = html.indexOf("</section>", html.indexOf('id="tab-introduccion"'));
       if (introSectionEnd === -1) return html;
       const insertionPoint = introSectionEnd + 10;
       return `${html.slice(0, insertionPoint)}\n\n      <section id="tab-produccion" class="panel">\n      ${content}\n      </section>${html.slice(insertionPoint)}`;
    }
    return html;
  }
  const endTag = "</section>";
  const contentStart = start + startTag.length;
  const end = html.indexOf(endTag, contentStart);
  if (end === -1) return html;
  return `${html.slice(0, contentStart)}\n      ${content}\n    ${html.slice(end)}`;
}

function upsertEmbeddedMarkdown(html, sectionId, rawMd) {
  const startTag = `const embeddedMarkdown = {`;
  const endTag = `    };`;
  const start = html.indexOf(startTag);
  if (start === -1) return html;
  const end = html.indexOf(endTag, start);
  if (end === -1) return html;

  let block = html.slice(start, end + endTag.length);
  const escapedMd = rawMd.replace(/`/g, "\\`").replace(/\$/g, "\\$");
  const entryPattern = new RegExp(`${sectionId}: \`[\\s\\S]*?\`,?`, "m");
  const newEntry = `${sectionId}: \`${escapedMd}\`,`;

  if (entryPattern.test(block)) {
    block = block.replace(entryPattern, newEntry);
  } else {
    block = block.replace(`const embeddedMarkdown = {`, `const embeddedMarkdown = {\n      ${newEntry}`);
  }

  return html.slice(0, start) + block + html.slice(end + endTag.length);
}

function generateProduccionContent() {
  const productionRootDir = path.join(baseDir, "Production");
  if (!fs.existsSync(productionRootDir)) return "";
  const subfolders = fs.readdirSync(productionRootDir).filter(f => fs.lstatSync(path.join(productionRootDir, f)).isDirectory());
  let combinedHtml = "";
  for (const folder of subfolders) {
    const folderPath = path.join(productionRootDir, folder);
    const files = fs.readdirSync(folderPath);
    let folderContent = `<h3>${folder}</h3>`;
    let hasContent = false;
    let allMdContent = "";
    const mdFiles = files.filter(f => f.toLowerCase().endsWith(".md"));
    for (const mdFile of mdFiles) {
      const mdContent = fs.readFileSync(path.join(folderPath, mdFile), "utf8");
      allMdContent += mdContent;
      folderContent += `<div style="margin-bottom: 20px; border-left: 2px solid var(--accent); padding-left: 15px;">
                          ${markdownToHtml(mdContent)}
                        </div>`;
      hasContent = true;
    }
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith(".pdf") && !allMdContent.includes(encodeURIComponent(f)) && !allMdContent.includes("/" + f));
    for (const pdfFile of pdfFiles) {
      const pdfUrl = `./Production/${encodeURIComponent(folder)}/${encodeURIComponent(pdfFile)}`;
      folderContent += `<div style="margin-bottom: 20px;">
                          <div style="border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: #000;">
                            <iframe src="${pdfUrl}#view=FitH" width="100%" style="height: 100vh; min-height: 1000px; border:none; display:block;"></iframe>
                          </div>
                          <p style="margin-top: 8px;"><a href="${pdfUrl}" target="_blank" style="color: var(--accent); font-size: 13px;">Descargar PDF</a></p>
                        </div>`;
      hasContent = true;
    }
    if (!hasContent) folderContent += `<p class="note">Seccion sin contenido</p>`;
    combinedHtml += `<div class="card">${folderContent}</div>\n`;
  }
  return combinedHtml;
}

function run() {
  let html = fs.readFileSync(htmlPath, "utf8");
  const produccionContent = generateProduccionContent();
  html = upsertPanel(html, "produccion", produccionContent);

  for (const section of sections) {
    if (!fs.existsSync(section.file)) continue;
    const md = fs.readFileSync(section.file, "utf8");
    let htmlContent = markdownToHtml(md);

    if (section.autoPdf) {
      const sectionDir = path.dirname(section.file);
      const files = fs.readdirSync(sectionDir);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith(".pdf") && !md.includes(encodeURIComponent(f)) && !md.includes("/" + f));
      for (const pdfFile of pdfFiles) {
        const pdfUrl = `./${path.basename(sectionDir)}/${encodeURIComponent(pdfFile)}`;
        htmlContent += `\n<div class="card"><div style="margin-bottom: 20px;">
                          <h4 style="color: var(--muted); font-size: 14px; margin-bottom: 10px;">📎 ${pdfFile}</h4>
                          <div style="border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: #000;">
                            <iframe src="${pdfUrl}#view=FitH" width="100%" style="height: 100vh; min-height: 1000px; border:none; display:block;"></iframe>
                          </div>
                          <p style="margin-top: 8px;"><a href="${pdfUrl}" target="_blank" style="color: var(--accent); font-size: 13px;">Descargar PDF</a></p>
                        </div></div>`;
      }
    }

    html = upsertPanel(html, section.id, htmlContent);
    html = upsertEmbeddedMarkdown(html, section.id, md);
  }

  fs.writeFileSync(htmlPath, html, "utf8");
  console.log("Sincronizacion completa y robusta (HTML + Embedded MD).");
}

run();
