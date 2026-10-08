# Radici d'Amore · site e cardápio digital

Bistrô de massas frescas em Fazenda Rio Grande (PR). Site em HTML, CSS e JavaScript puros, sem framework e sem build. Funciona direto no GitHub Pages.

**Site no ar:** `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/` (depois de ativar o GitHub Pages, ver abaixo)

## Ver no computador

- Dê dois cliques em `index.html`, ou
- rode `node tools/servidor-local.js` (ou dois cliques em `ABRIR-SITE.bat`) e abra http://localhost:5173

Para testar o prato de cada dia, acrescente `?dia=quinta` (ou `segunda`, `terca`, `quarta`, `sexta`, `sabado`, `domingo`) ao endereço.

## Publicar no GitHub Pages

1. Crie um repositório **público** e envie estes arquivos para a raiz dele.
2. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
3. Em 1 a 2 minutos o endereço aparece no topo da página de Pages.

## Como atualizar

| O que mudar | Onde |
|---|---|
| Prato de cada dia da semana | `radici-cardapio.json` → categoria "Prato do dia" |
| Preços, nomes e descrições | `radici-cardapio.json` |
| Endereço, iFood, horários, WhatsApp | `js/cardapio-data.js` → bloco `CONFIG` |
| Fotos | soltar o arquivo em `fotos/` com o nome combinado (ver `fotos/LEIA-ME.txt`) |

Depois de editar o `radici-cardapio.json`, rode `node tools/gerar-cardapio-data.js` (o bloco `CONFIG` nunca é sobrescrito) e confira com `node tools/check-precos.js --tela`.

O **prato do dia** troca sozinho todo dia (segunda a sexta, no horário de São Paulo).

## Pedido pelo WhatsApp

Todo item do cardápio tem "+ adicionar". O cliente monta o pedido, abre a sacola ("Ver pedido"), informa o nome e envia pelo WhatsApp (`CONFIG.whatsappNumero`). Não há servidor: a mensagem é montada no próprio navegador (`js/pedido.js`) e o pedido fica salvo no aparelho (localStorage).

- Os preços do pedido saem do mesmo campo que o cardápio mostra (`preco`, em número). Nunca escreva um preço em dois lugares.
- Itens com escolha (recheio, tamanho, sabor...) usam o campo `opcoes` (ver o cabeçalho de `js/cardapio-data.js`).
- O prato do dia só pode ser pedido no próprio dia; sábado e domingo não têm botão.
- Itens com preço "consultar" entram como "valor a confirmar" e não somam no total.

## Horários

Os horários oficiais ficam em `js/cardapio-data.js` → `CONFIG.horarios` (formato `"H:MM"`, fuso de São Paulo). O rodapé, o selo "aberto agora", os avisos de almoço e o botão de enviar o pedido leem esse mesmo bloco. Se mudar um horário, mude também o `openingHoursSpecification` no `index.html` (dados para o Google) e o texto de reserva do bloco de horários do rodapé (aparece só sem JavaScript).

- **Fora do expediente** (dias úteis antes das 8h ou depois das 15h, domingo, sábado fora das 8h30 às 14h): a sacola monta normalmente, mas "Enviar pedido pelo WhatsApp" fica desativado e avisa quando abrimos. O pedido continua salvo no aparelho.
- **Sábado** (alternados): o selo e a sacola avisam e linkam o Instagram; o envio fica liberado das 8h30 às 14h.
- **Pratos de almoço** (categoria "Massas e pratos"): podem ser pedidos a qualquer hora; fora das 11h às 14h aparece "servido no almoço, das 11h às 14h". Se o pedido for enviado antes das 11h, a mensagem ganha a linha "preparar a partir das 11h".
- **Para testar** sem esperar o relógio: `?dia=terca&hora=12:00` no endereço do site (o `?dia=` é o mesmo que já troca o prato do dia).

## Identidade visual (não mudar)

- Cores: `#F4E6CD` (creme), `#3D4C23` (verde), `#931A1A` (vinho). Nenhuma outra.
- Fontes: **Fonde** (textos e títulos) e **Astina** (cursiva, sempre em vinho). Coloque `Fonde.woff2` e `Astina.woff2` em `fonts/` (ver `fonts/LEIA-ME.txt`). Sem elas o site usa fontes genéricas provisórias.
- Só o "Bem-vindo!" do hero é animado (escrita à mão). As demais cursivas ficam estáticas.

## Pendências da primeira versão

- Fontes Fonde e Astina em `fonts/`
- Fotos que são capturas de tela (empanada, pratos do dia e panquecas, ~500 a 680 px): trocar pelos originais em `fotos-originais/` e rodar `node tools/otimizar-fotos.js`
- URL final do site (imagem de compartilhamento e dados do Google, em `index.html`)

## Estrutura

```
index.html              página única
css/style.css           estilos (só as 3 cores da marca)
js/main.js              lógica da página (prato do dia, montador, cardápio)
js/horarios.js          aberto/fechado agora (fuso de São Paulo), selo de status e bloco de horários
js/pedido.js            pedido: botões, sacola, mensagem do WhatsApp
js/cardapio-data.js     dados do cardápio + CONFIG (gerado do JSON)
radici-cardapio.json    fonte dos preços e pratos
assets/                 logotipo e coração (SVG), padrão, ícones, "Bem-vindo!", imagem de compartilhamento
fotos-originais/        fotos como a cliente enviou (não vão para o site publicado)
fonts/  fotos/          fontes e fotos (entram depois)
tools/                  servidor local, gerador de dados, checagem de preços e otimizador de fotos
```
