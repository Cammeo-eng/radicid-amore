#!/usr/bin/env node
/*
  Converte radici-cardapio.json em js/cardapio-data.js  (const CARDAPIO = {...}).

  Uso:   node tools/gerar-cardapio-data.js

  O bloco de CONFIGURAÇÃO no topo de js/cardapio-data.js (prato do mês, links,
  endereço...) é PRESERVADO: só a parte do cardápio, depois da linha marcadora,
  é reescrita.
*/
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const jsonPath = path.join(raiz, 'radici-cardapio.json');
const jsPath = path.join(raiz, 'js', 'cardapio-data.js');

const MARCADOR = '/* ===== CARDÁPIO · gerado de radici-cardapio.json (não edite abaixo desta linha) ===== */';

const dados = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const corpo = `${MARCADOR}\nconst CARDAPIO = ${JSON.stringify(dados, null, 2)};\n`;

if (!fs.existsSync(jsPath)) {
  console.error('js/cardapio-data.js não existe: crie-o com o bloco CONFIG antes de gerar.');
  process.exit(1);
}
const atual = fs.readFileSync(jsPath, 'utf8');
const i = atual.indexOf(MARCADOR);
const cabecalho = i >= 0 ? atual.slice(0, i) : atual.replace(/\s*$/, '\n\n');
fs.writeFileSync(jsPath, cabecalho + corpo, 'utf8');
console.log('js/cardapio-data.js atualizado a partir de radici-cardapio.json');
