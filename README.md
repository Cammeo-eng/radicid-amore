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
| Prato do mês | `js/cardapio-data.js` → `CONFIG.pratoDoMes` |
| Prato de cada dia da semana | `radici-cardapio.json` → categoria "Prato do dia" |
| Preços, nomes e descrições | `radici-cardapio.json` |
| Endereço, iFood, horários, WhatsApp | `js/cardapio-data.js` → bloco `CONFIG` |
| Fotos | soltar o arquivo em `fotos/` com o nome combinado (ver `fotos/LEIA-ME.txt`) |

Depois de editar o `radici-cardapio.json`, rode `node tools/gerar-cardapio-data.js` (o bloco `CONFIG` nunca é sobrescrito) e confira com `node tools/check-precos.js --tela`.

O **prato do dia** troca sozinho todo dia (segunda a sexta, no horário de São Paulo). O **prato destaque** (prato do mês) é manual.

## Pedido pelo WhatsApp

Todo item do cardápio tem "+ adicionar". O cliente monta o pedido, abre a sacola ("Ver pedido"), informa o nome e envia pelo WhatsApp (`CONFIG.whatsappNumero`). Não há servidor: a mensagem é montada no próprio navegador (`js/pedido.js`) e o pedido fica salvo no aparelho (localStorage).

- Os preços do pedido saem do mesmo campo que o cardápio mostra (`preco`, em número). Nunca escreva um preço em dois lugares.
- Itens com escolha (recheio, tamanho, sabor...) usam o campo `opcoes` (ver o cabeçalho de `js/cardapio-data.js`).
- O prato do dia só pode ser pedido no próprio dia; sábado e domingo não têm botão.
- Itens com preço "consultar" entram como "valor a confirmar" e não somam no total.

## Identidade visual (não mudar)

- Cores: `#F4E6CD` (creme), `#344817` (verde), `#9E1C19` (vinho). Nenhuma outra.
- Fontes: **Fonde** (textos e títulos) e **Astina** (cursiva, sempre em vinho). Coloque `Fonde.woff2` e `Astina.woff2` em `fonts/` (ver `fonts/LEIA-ME.txt`). Sem elas o site usa fontes genéricas provisórias.
- Só o "Bem-vindo!" do hero é animado (escrita à mão). As demais cursivas ficam estáticas.

## Pendências da primeira versão

- Fontes Fonde e Astina em `fonts/`
- Fotos dos pratos e da casa em `fotos/`
- `[[PREENCHER]]` visíveis no site: link do iFood e horários de funcionamento
- URL final do site (imagem de compartilhamento e dados do Google, em `index.html`)

## Estrutura

```
index.html              página única
css/style.css           estilos (só as 3 cores da marca)
js/main.js              lógica da página (prato do dia, montador, cardápio)
js/pedido.js            pedido: botões, sacola, mensagem do WhatsApp
js/cardapio-data.js     dados do cardápio + CONFIG (gerado do JSON)
radici-cardapio.json    fonte dos preços e pratos
assets/                 logo, padrão, ícones, coração, "Bem-vindo!"
fonts/  fotos/          fontes e fotos (entram depois)
tools/                  servidor local, gerador de dados e checagem de preços
```
