#!/usr/bin/env node
/*
  Monta a pasta "radici-damore-github" (ao lado da pasta do site) só com o que vai para o GitHub:
  o site, as ferramentas e o README. Deixa de fora os prompts, rascunhos e arquivos de teste.

  Uso:   node tools/preparar-github.js
  Depois: envie o CONTEÚDO da pasta radici-damore-github para a raiz do repositório.
  Pode rodar de novo sempre que o site mudar (a pasta é refeita do zero).
*/
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, '..', 'radici-damore-github');
if (path.basename(destino) !== 'radici-damore-github') throw new Error('destino inesperado: ' + destino);

const incluir = ['index.html', 'css', 'js', 'assets', 'fonts', 'fotos', 'tools', 'radici-cardapio.json', 'ABRIR-SITE.bat', 'README.md'];

// esvazia o conteúdo (sem apagar a pasta em si, que pode estar aberta em outro programa) e preserva um .git, se houver
fs.mkdirSync(destino, { recursive: true });
fs.readdirSync(destino).filter((nome) => nome !== '.git').forEach((nome) => fs.rmSync(path.join(destino, nome), { recursive: true, force: true }));
incluir.forEach((nome) => {
  const origem = path.join(raiz, nome);
  if (!fs.existsSync(origem)) { console.warn('  (não achei, pulei) ' + nome); return; }
  fs.cpSync(origem, path.join(destino, nome), { recursive: true });
});

// animação de referência do "Bem-vindo!" (fonte do trecho copiado no style.css), junto dos assets
const demo = path.join(raiz, 'demo-bem-vindo.html');
if (fs.existsSync(demo)) fs.copyFileSync(demo, path.join(destino, 'assets', 'demo-bem-vindo.html'));
const leia = path.join(destino, 'assets', 'LEIA-ME.txt');
if (fs.existsSync(leia)) {
  fs.writeFileSync(leia, fs.readFileSync(leia, 'utf8').replace('demo-bem-vindo.html (na raiz)', 'demo-bem-vindo.html (nesta pasta)'), 'utf8');
}

fs.writeFileSync(path.join(destino, '.nojekyll'), '');                    // o GitHub Pages serve os arquivos como estão
fs.writeFileSync(path.join(destino, '.gitignore'), 'node_modules/\n.DS_Store\nThumbs.db\n.claude/\n', 'utf8');

let total = 0;
(function contar(d) { fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { if (e.isDirectory()) contar(path.join(d, e.name)); else total++; }); })(destino);
console.log(`Pasta pronta: ${destino}\n${total} arquivos. Envie o CONTEÚDO dela para a raiz do repositório no GitHub.`);
