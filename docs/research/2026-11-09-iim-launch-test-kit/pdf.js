// Renders the HTML CVs to PDF with headless Chrome, then extracts text with the same algorithm as VM.readPdf (public/shared.js).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function readPdf(file) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    let line = ''; let lastY = null; const lines = [];
    for (const item of content.items) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
      line += item.str;
      lastY = y;
    }
    lines.push(line);
    pages.push(lines.map((l) => l.trim()).filter(Boolean).join('\n'));
  }
  return pages.join('\n\n');
}

(async () => {
  for (const name of ['cv_ops', 'cv_fin']) {
    const html = path.join(__dirname, `${name}.html`);
    const pdf = path.join(__dirname, `${name}.pdf`);
    if (!fs.existsSync(pdf)) execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file://${html}`], { stdio: 'ignore' });
    const text = await readPdf(pdf);
    fs.writeFileSync(path.join(__dirname, `${name}.extracted.txt`), text);
    console.log(`===== ${name} (${text.length} chars)\n${text}\n`);
  }
})();
