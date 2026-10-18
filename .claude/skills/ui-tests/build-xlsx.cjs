// Usage: node build-xlsx.cjs <md> <xlsx> <ID prefix, e.g. TUI->. One sheet per "##" table; prints the case count.
const ExcelJS = require(require('path').resolve(__dirname, '../../../node_modules/exceljs'));
const fs = require('fs');
const [,, mdPath, xlsxPath, idPrefix] = process.argv;
const lines = fs.readFileSync(mdPath, 'utf8').split(/\r?\n/);
const wb = new ExcelJS.Workbook();
let group = '', header = null, rows = [], cases = 0;
const flush = () => {
  if (!header || !rows.length) { header = null; rows = []; return; }
  const isCase = header[0] === 'ID' && rows[0][0].startsWith(idPrefix);
  const name = (group || 'Sheet').replace(/[\/?*\[\]:]/g, '').slice(0, 31);
  const ws = wb.addWorksheet(name);
  ws.addRow(header).font = { bold: true };
  rows.forEach(r => ws.addRow(r));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.length } };
  header.forEach((h, i) => { ws.getColumn(i + 1).width = Math.min(60, Math.max(14, h.length + 4, ...rows.map(r => Math.min(60, (r[i] || '').length * 0.9)))); });
  ws.eachRow(r => r.alignment = { wrapText: true, vertical: 'top' });
  if (isCase) cases += rows.length;
  header = null; rows = [];
};
for (const l of lines) {
  if (/^## /.test(l)) { flush(); group = l.replace(/^## /, ''); continue; }
  if (/^\|/.test(l)) {
    const cells = l.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    if (cells.every(c => /^-+$/.test(c))) continue;
    if (!header) header = cells; else rows.push(cells);
  } else if (header) flush();
}
flush();
wb.xlsx.writeFile(xlsxPath).then(() => console.log('cases', cases, 'sheets', wb.worksheets.map(w => w.name + ':' + (w.rowCount - 1)).join(', ')));
