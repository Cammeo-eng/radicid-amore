#!/usr/bin/env node
/*
  Confere se os preços (e nomes/descrições) que aparecem no site batem com o radici-cardapio.json.

  Uso:   node tools/check-precos.js          confere JSON x js/cardapio-data.js
         node tools/check-precos.js --tela   confere também o que aparece na PÁGINA renderizada
                                             (abre o index.html no Edge/Chrome em modo invisível)

  Sai com código 1 se achar qualquer diferença.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const json = JSON.parse(fs.readFileSync(path.join(raiz, 'radici-cardapio.json'), 'utf8'));
let erros = 0;
const falha = (msg) => { erros++; console.error('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

/* 1) js/cardapio-data.js x JSON */
console.log('1) js/cardapio-data.js x radici-cardapio.json');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'js', 'cardapio-data.js'), 'utf8') + '\nthis.__C = CARDAPIO;', ctx);
const igual = (x, y) => JSON.stringify(x) === JSON.stringify(y);
if (igual(ctx.__C.cardapio, json.cardapio) && igual(ctx.__C.restaurante, json.restaurante)) ok('cardápio e dados do restaurante idênticos (nomes, descrições e preços)');
else {
  const a = ctx.__C.cardapio, b = json.cardapio;
  b.forEach((cat, i) => { if (!igual(cat, a[i])) falha(`categoria "${cat.categoria}" difere; rode: node tools/gerar-cardapio-data.js`); });
  if (!erros) falha('os dados do restaurante diferem; rode: node tools/gerar-cardapio-data.js');
}
if (!igual(ctx.__C.identidade_visual, json.identidade_visual)) console.log('  (aviso) o bloco identidade_visual difere, mas o site não usa esse bloco.');

/* 2) todos os preços do JSON */
const precos = [];
const guarda = (v, onde) => { if (typeof v === 'string' && /R\$/.test(v)) precos.push({ v: v.replace(/^\+\s*/, ''), onde }); };
json.cardapio.forEach((c) => {
  guarda(c.preco_unico, c.categoria);
  (c.itens || []).forEach((i) => { guarda(i.preco, `${c.categoria} › ${i.nome}`); Object.values(i.precos || {}).forEach((p) => guarda(p, `${c.categoria} › ${i.nome}`)); });
  (c.passo_2_molhos || []).forEach((i) => guarda(i.preco, `Monte sua massa › ${i.nome}`));
  (c.passo_3_adicionais || []).forEach((i) => guarda(i.preco, `Monte sua massa › ${i.nome}`));
});
console.log(`\n2) ${precos.length} preços no JSON, ${new Set(precos.map((p) => p.v)).size} valores distintos`);

/* 3) o que aparece na página */
if (process.argv.includes('--tela')) {
  console.log('\n3) preços na página renderizada');
  const candidatos = [
    process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.ProgramFiles + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.ProgramFiles + '\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter((p) => p && fs.existsSync(p));
  if (!candidatos.length) falha('não encontrei Edge/Chrome para abrir a página.');
  else {
    const url = require('url').pathToFileURL(path.join(raiz, 'index.html')).href; // codifica espaços e acentos do caminho
    const flags = ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom'];
    let dom = '';
    if (process.platform === 'win32') {
      // no Windows o Edge/Chrome é um app "gráfico": o Node não recebe a saída dele direto.
      // O PowerShell espera o navegador terminar e grava a página (DOM) num arquivo.
      const saida = path.join(os.tmpdir(), 'radici-dom-' + process.pid + '.html');
      const ps = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '${candidatos[0]}' ${flags.join(' ')} '${url}' | Out-File -FilePath '${saida}' -Encoding utf8`;
      spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')], { timeout: 120000 });
      dom = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
      try { fs.unlinkSync(saida); } catch (e) { /* ignora */ }
    } else {
      dom = spawnSync(candidatos[0], [...flags, url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout || '';
    }
    if (!dom) falha('o navegador não devolveu a página.');
    const texto = dom.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
    const naTela = (texto.match(/R\$\s?\d[\d.,]*/g) || []).map((s) => s.replace(/\s+/g, ' ').replace('R$', 'R$ ').replace(/\s+/g, ' ').trim());
    const set = new Set(precos.map((p) => p.v.replace(/\s+/g, ' ')));
    console.log(`  ${naTela.length} preços encontrados na tela`);
    set.forEach((v) => { if (!naTela.includes(v)) falha(`preço do JSON que NÃO aparece na tela: ${v}`); });
    [...new Set(naTela)].forEach((v) => { if (!set.has(v)) falha(`preço na tela que NÃO está no JSON: ${v}`); });
    // cada item do cardápio precisa aparecer com seu preço: confere os nomes
    let nomes = 0;
    json.cardapio.forEach((c) => (c.itens || []).forEach((i) => {
      const nome = (i.nome || '').replace(/^Cerveja lata - /, '');
      nomes++;
      if (nome && !texto.includes(nome)) falha(`nome que NÃO aparece na tela: "${i.nome}"`);
    }));
    if (!erros) ok(`todos os ${set.size} valores de preço e os ${nomes} nomes do cardápio aparecem na tela, sem nenhum preço a mais`);
  }
}

console.log(erros ? `\n${erros} problema(s) encontrado(s).` : '\nTudo certo: os preços do site batem com o radici-cardapio.json.');
process.exit(erros ? 1 : 0);
