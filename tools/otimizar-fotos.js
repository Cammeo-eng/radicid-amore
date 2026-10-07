#!/usr/bin/env node
/*
  Gera as fotos do site a partir dos originais em fotos-originais/.
  Só RECORTA e OTIMIZA: sem filtros, sem ajuste de cor. Saída em WebP, em vários tamanhos (srcset).

  Uso:   npm i --no-save sharp      (uma vez; o site em si não precisa de Node)
         node tools/otimizar-fotos.js
  Troque uma foto: salve o novo original em fotos-originais/ com o mesmo nome e rode de novo.

  Os recortes abaixo são em pixels do ORIGINAL (left, top, width, height) e já saem na proporção
  4:3 dos quadros do site (a família sai em 3:2). Largura final = cada valor de "larguras"
  (nunca maior que o original: não inventamos pixels).
*/
const fs = require('fs');
const path = require('path');
let sharp;
try { sharp = require('sharp'); } catch (e) { console.error('Falta o sharp: rode  npm i --no-save sharp'); process.exit(1); }

const raiz = path.join(__dirname, '..');
const ORIG = path.join(raiz, 'fotos-originais');
const SAIDA = path.join(raiz, 'fotos');

const FOTOS = [
  // capa: mão salpicando tempero + prato inteiros (centrado em mão e prato)
  { origem: 'capa-prato-massa.jpg', nome: 'hero', recorte: { left: 154, top: 0, width: 1423, height: 1067 }, larguras: [480, 800, 1200] },
  // "Feito com amor": mãos e massa; o rosto da moça (borda esquerda, no alto) fica de fora
  { origem: 'feito-com-amor-massa.jpg', nome: 'nossa-casa', recorte: { left: 0, top: 500, width: 1067, height: 800 }, larguras: [480, 800, 1067] },
  // mensagem da família: os três inteiros e o letreiro (quadro inteiro, 3:2)
  { origem: 'familia.jpg', nome: 'familia', recorte: { left: 0, top: 0, width: 1360, height: 908 }, larguras: [480, 800, 1200] },
  // empanada: captura de tela, sem as bordas escuras (5 px à esquerda, 2 à direita, 2 no alto) e centrada no recheio
  { origem: 'empanada-captura.jpg', nome: 'empanadas', recorte: { left: 6, top: 290, width: 511, height: 383 }, larguras: [400, 511] },
];

// Pratos do dia, panquecas e o cachorro: arquivo único .jpg com o nome que o site já espera (fotos/dia-segunda.jpg ...).
// São capturas de tela (~480 a 680 px de largura): saem sem as bordas escuras, em 4:3 e sem ampliar.
// Quando chegarem os originais maiores, é só trocar o arquivo em fotos-originais/ e rodar de novo.
const PRATOS = [
  { origem: 'prato-segunda.jpg', nome: 'dia-segunda', recorte: { left: 4, top: 185, width: 678, height: 509 } },   // spaghetti ao molho bechamel e frango
  { origem: 'prato-terca.jpg', nome: 'dia-terca', recorte: { left: 4, top: 150, width: 672, height: 504 } },        // macarrão ao pomodoro e tiras de carne
  { origem: 'prato-quarta.jpg', nome: 'dia-quarta', recorte: { left: 4, top: 195, width: 678, height: 509 } },      // ravioli ao molho de frango
  { origem: 'prato-quinta.jpg', nome: 'dia-quinta', recorte: { left: 4, top: 270, width: 680, height: 510 } },      // à carbonara
  { origem: 'prato-sexta.jpg', nome: 'dia-sexta', recorte: { left: 4, top: 265, width: 676, height: 507 } },        // lasanha
  { origem: 'panquecas.jpg', nome: 'panquecas', recorte: { left: 4, top: 406, width: 682, height: 512 } },         // panqueca Radici (ragu de carne)
  // cachorro: captura de story; o recorte deixa de fora as faixas de texto (no alto e embaixo) e centra o cachorro
  { origem: 'pet-friendly.jpg', nome: 'pet-friendly', recorte: { left: 0, top: 225, width: 480, height: 360 } },
];

async function pratos() {
  for (const f of PRATOS) {
    const arq = path.join(ORIG, f.origem);
    if (!fs.existsSync(arq)) { console.warn('  (não achei, pulei) ' + f.origem); continue; }
    const destino = path.join(SAIDA, `${f.nome}.jpg`);
    await sharp(arq).extract(f.recorte).jpeg({ quality: 84, mozjpeg: true }).toFile(destino);
    console.log(`  ${path.relative(raiz, destino)}  ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
  }
}

async function fotos() {
  for (const f of FOTOS) {
    const arq = path.join(ORIG, f.origem);
    if (!fs.existsSync(arq)) { console.warn('  (não achei, pulei) ' + f.origem); continue; }
    for (const w of f.larguras) {
      const destino = path.join(SAIDA, `${f.nome}-${w}.webp`);
      await sharp(arq).extract(f.recorte).resize({ width: Math.min(w, f.recorte.width), kernel: 'lanczos3' })
        .webp({ quality: 80, effort: 6 }).toFile(destino);
      console.log(`  ${path.relative(raiz, destino)}  ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
    }
  }
}

// Imagem de compartilhamento (Open Graph, 1200x630): foto da capa à direita (mão e prato inteiros) + logotipo no creme
async function og() {
  const foto = path.join(ORIG, 'capa-prato-massa.jpg');
  const logo = path.join(raiz, 'assets', 'logo-radici-damore.svg');
  if (!fs.existsSync(foto) || !fs.existsSync(logo)) { console.warn('  (og-image: faltam a foto da capa ou o logotipo, pulei)'); return; }
  const painelFoto = await sharp(foto).extract({ left: 280, top: 0, width: 1134, height: 960 }).resize({ width: 744, height: 630 }).toBuffer();
  const logoPng = await sharp(logo, { density: 300 }).resize({ width: 380 }).png().toBuffer();
  const alt = (await sharp(logoPng).metadata()).height;
  const destino = path.join(raiz, 'assets', 'og-image.jpg');
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#F4E6CD' } })
    .composite([{ input: painelFoto, left: 456, top: 0 }, { input: logoPng, left: 38, top: Math.round((630 - alt) / 2) }])
    .jpeg({ quality: 86, mozjpeg: true }).toFile(destino);
  console.log(`  assets/og-image.jpg  ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
}

(async () => {
  console.log('Fotos otimizadas:');
  await fotos();
  await pratos();
  await og();
})().catch((e) => { console.error(e); process.exit(1); });
