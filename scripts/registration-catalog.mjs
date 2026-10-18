import fs from 'fs'; import path from 'path';
const root = process.cwd();
const walk = d => fs.readdirSync(d,{withFileTypes:true}).flatMap(e => e.isDirectory()? (e.name==='drafts'||e.name.endsWith('-snapshots')?[]:walk(path.join(d,e.name))) : e.name.endsWith('.spec.ts')?[path.join(d,e.name)]:[]);
const files = walk(root).sort();
const stepName = {'01-entry':'1 Entry (Mobile + OTP)','02-business-info':'2 Business Info','03-financial':'3 Financial','04-verification':'4 Verification & Uploads','05-identity':'5 Identity (Nafath)','06-products':'6 Products & PoS','07-contract':'7 Contract','08-confirmation':'8 Confirmation',journeys:'Journeys (cross-step)',shared:'Wizard chrome (shared)'};
function category(rel){
  const p=rel.split('/');
  if(p[0]==='non-functional'){ const n=p[1]; return n.includes('Accessibility')?'Non-functional / Accessibility':n.includes('Performance')?'Non-functional / Performance':'Non-functional / Visual regression'; }
  return {functional:'Functional (business behaviour)',ui:'UI / UX (elements, layout, screen states)',api:'API (gateway endpoints)',security:'Security',integration:'Integration (admin portal / DB)'}[p[0]]||p[0];
}
const order=['Functional (business behaviour)','UI / UX (elements, layout, screen states)','API (gateway endpoints)','Security','Integration (admin portal / DB)','Non-functional / Accessibility','Non-functional / Performance','Non-functional / Visual regression'];
const data={};
for(const f of files){
  const rel=path.relative(root,f).split(path.sep).join('/'); const src=fs.readFileSync(f,'utf8');
  const cat=category(rel); const parts=rel.split('/');
  const step=stepName[parts.find(x=>stepName[x])]||'—';
  const cases=[]; const re=/^\s*test(\.skip)?\(\s*(['"`])((?:\.|(?!\2).)*)\2([\s\S]{0,400}?)(?=async|\(\s*\)\s*=>|\(\{)/gm; let m;
  while((m=re.exec(src))){ const id=(m[4].match(/description:\s*["'`]([A-Z]+(?:-[A-Z]+)*-\d+[A-Za-z0-9]*)/)||[])[1]||''; cases.push({t:m[3],id,skip:!!m[1]}); }
  ((data[cat]??={})[step]??=[]).push({file:path.basename(f),rel,cases});
}
let total=0,skips=0; const rows=[];
let body='';
for(const cat of order){ const steps=data[cat]; if(!steps) continue;
  const n=Object.values(steps).flat().reduce((a,f)=>a+f.cases.length,0), s=Object.values(steps).flat().reduce((a,f)=>a+f.cases.filter(c=>c.skip).length,0);
  total+=n; skips+=s; rows.push(`| ${cat} | ${Object.values(steps).flat().length} | ${n} | ${s} |`);
  body+=`\n## ${cat}\n`;
  for(const st of Object.keys(steps).sort()){
    body+=`\n### ${st}\n`;
    for(const f of steps[st]){ body+=`\n**${f.file}** (${f.cases.length}) — \`${f.rel}\`\n\n`; for(const c of f.cases) body+=`- ${c.id?`\`${c.id}\` `:''}${c.t}${c.skip?' _(skipped)_':''}\n`; }
  }
}
const head=`# Registration test-case catalog

Generated from the specs (\`node ../../scripts/registration-catalog.mjs TEST-CATALOG.md\` from the Registration folder). Grouped by test type, then wizard step, then file. Tests under \`drafts/\` are unverified ideas and are not counted.

| Test type | Spec files | Test cases | Skipped |
|---|---|---|---|
${rows.join('\n')}
| **Total** | ${files.length} | **${total}** | ${skips} |
`;
fs.writeFileSync(process.argv[2],head+body);
console.log(rows.join('\n'),total,skips);
