#!/usr/bin/env node
/*
  Servidor estático mínimo, sem dependências, para ver o site localmente.

  Uso:   node tools/servidor-local.js [porta] [--abrir]
         (padrão: porta 5173; --abrir abre o navegador sozinho)
  Mais simples: dê dois cliques em ABRIR-SITE.bat

  Se a porta estiver ocupada, tenta a seguinte. Mostra também o endereço da rede local
  (para abrir no celular, com o celular no mesmo Wi-Fi do computador).
  O site também funciona abrindo index.html direto no navegador.
*/
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const raiz = path.join(__dirname, '..');
const abrir = process.argv.includes('--abrir');
const portaInicial = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a))) || 5173;
const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.otf': 'font/otf', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
};

const servidor = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400).end('Requisição inválida'); return; }
  if (rel.endsWith('/')) rel += 'index.html';
  const arquivo = path.normalize(path.join(raiz, rel));
  if (!arquivo.startsWith(raiz)) { res.writeHead(403).end('Proibido'); return; }
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado'); return; }
    res.writeHead(200, {
      'Content-Type': tipos[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(dados);
  });
});

function enderecosDaRede() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

function ouvir(porta, tentativas) {
  servidor.once('error', (erro) => {
    if (erro.code === 'EADDRINUSE' && tentativas > 0) ouvir(porta + 1, tentativas - 1);
    else { console.error('Não foi possível iniciar o servidor:', erro.message); process.exit(1); }
  });
  servidor.listen(porta, () => {
    const url = `http://localhost:${porta}`;
    console.log('');
    console.log("  Radici d'Amore está no ar.");
    console.log(`  No computador:  ${url}`);
    enderecosDaRede().forEach((ip) => console.log(`  No celular (mesmo Wi-Fi):  http://${ip}:${porta}`));
    console.log('');
    console.log('  Deixe esta janela aberta. Para encerrar, feche-a (ou Ctrl+C).');
    if (abrir) {
      const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      exec(cmd);
    }
  });
}

ouvir(portaInicial, 10);
