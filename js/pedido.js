/* ============================================================
   RADICI D'AMORE · pedido.js
   Pedido completo pelo WhatsApp (site estático, sem servidor).

   Lê CARDAPIO e CONFIG (js/cardapio-data.js): os preços do pedido saem do MESMO
   campo que o cardápio mostra, nunca são escritos duas vezes.

   Índice
   1. Utilitários              6. Persistência (localStorage)
   2. Dia da semana            7. Mensagem do WhatsApp
   3. Catálogo e preços        8. Botões de pedir (+ adicionar / − 1 +)
   4. Linhas do pedido         9. Janela de opções
   5. Descrição das linhas    10. Barra, aviso e sacola
   ============================================================ */
(function () {
  'use strict';

  if (typeof CARDAPIO === 'undefined' || typeof CONFIG === 'undefined') return;

  /* ---------- 1. Utilitários ---------- */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const celularMQ = window.matchMedia('(max-width: 47.99rem)');

  // Cria elementos sem innerHTML (nomes com '&' ou aspas nunca quebram o HTML).
  function el(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const f of filhos.flat(Infinity)) {
      if (f == null || f === false) continue;
      e.append(f.nodeType ? f : document.createTextNode(f));
    }
    return e;
  }

  const NS = 'http://www.w3.org/2000/svg';
  function icone(d) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'icone');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    s.append(p);
    return s;
  }
  function marcaCheck() { // usa o <symbol id="i-check"> do index.html
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#i-check');
    s.append(u);
    return s;
  }
  const ICO_MENOS = 'M5 12h14';
  const ICO_MAIS = 'M5 12h14M12 5v14';
  const ICO_FECHAR = 'M6 6l12 12M18 6L6 18';

  const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const minuscula = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  // Dinheiro em centavos (inteiros) para nunca somar 0,1 + 0,2 em ponto flutuante.
  const cent = (n) => Math.round(n * 100);
  const moeda = (c) => 'R$ ' + (c / 100).toFixed(2).replace('.', ','); // sempre duas casas: R$ 6,00

  /* ---------- 2. Dia da semana ----------
     Mesma regra do main.js (fuso America/Sao_Paulo; ?dia=quinta serve para testar). */
  const NUM_DIA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  const DIA_SLUG = { 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta' };
  function diaDaSemana() {
    const forcado = new URLSearchParams(location.search).get('dia');
    if (forcado && slug(forcado) in NUM_DIA) return NUM_DIA[slug(forcado)];
    const abrev = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(new Date());
    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[abrev];
  }

  // Prato do dia: só o de HOJE pode ser pedido. Sábado e domingo: nenhum botão.
  function disponibilidade(item) {
    if (!item.dia) return { ok: true };
    const hoje = DIA_SLUG[diaDaSemana()];
    if (!hoje) return { ok: false, fimDeSemana: true };
    if (slug(item.dia) === hoje) return { ok: true };
    return { ok: false, quando: minuscula(item.dia) };
  }

  /* ---------- 3. Catálogo e preços ---------- */
  // Ordem das categorias na sacola e na mensagem
  const CATEGORIAS = [
    { id: 'massas', rotulo: 'Massas e pratos', titulo: 'MASSAS E PRATOS', emoji: '\u{1F35D}' },
    { id: 'entradas', rotulo: 'Entradas', titulo: 'ENTRADAS', emoji: '\u{1F95F}' },
    { id: 'empanadas', rotulo: 'Empanadas', titulo: 'EMPANADAS', emoji: '\u{1FAD3}' },
    { id: 'adicionais', rotulo: 'Adicionais', titulo: 'ADICIONAIS', emoji: '➕' },
    { id: 'sobremesas', rotulo: 'Sobremesas', titulo: 'SOBREMESAS', emoji: '\u{1F370}' },
    { id: 'bebidas', rotulo: 'Bebidas', titulo: 'BEBIDAS', emoji: '\u{1F964}' },
  ];

  // Grupos de opções: "itensDe" busca a lista na própria categoria (ex.: os recheios das panquecas).
  const resolverGrupos = (grupos, cat) => (grupos || []).map((g) => Object.assign({}, g, {
    itens: g.itensDe ? (cat[g.itensDe] || []).map((nome) => ({ nome })) : (g.itens || []),
  }));

  const ITENS = new Map();
  let MONTE = null;
  let ordemCardapio = 0; // posição no cardápio: define a ordem das linhas dentro de cada categoria
  CARDAPIO.cardapio.forEach((c) => {
    (c.itens || []).forEach((it) => {
      if (!it.id || it.pedivel === false) return;
      ITENS.set(it.id, Object.assign({}, it, {
        cat: c,
        // sem preço próprio, herda o preço único da categoria (empanadas, prato do dia, panquecas); null = consultar
        preco: it.preco !== undefined ? it.preco : (c.preco_unico !== undefined ? c.preco_unico : null),
        opcoes: resolverGrupos(it.opcoes || c.opcoes, c),
        ordem: ordemCardapio++,
      }));
    });
    if (c.id === 'monte-sua-massa') {
      const mapa = (lista) => new Map((lista || []).map((x) => [x.id, x]));
      MONTE = { nome: c.categoria, ordem: ordemCardapio++, massas: mapa(c.passo_1_massas), molhos: mapa(c.passo_2_molhos), adicionais: mapa(c.passo_3_adicionais) };
    }
  });

  // "Molho alfredo" -> "ao molho alfredo" · "À caprese" -> "à caprese"
  const fraseMolho = (nome) => (/^molho /i.test(nome) ? 'ao ' : '') + minuscula(nome);

  // Preço unitário do item com as opções escolhidas, em centavos (null = valor a confirmar)
  function unidadeCent(item, sel) {
    let p = item.preco == null ? null : cent(item.preco);
    if (item.nomeConfig && !String(CONFIG[item.nomeConfig] || '').trim()) p = null; // prato do mês sem nome
    for (const g of item.opcoes) {
      if (g.tipo !== 'unica') continue;
      const o = g.itens.find((x) => x.nome === sel[g.id]);
      if (!o || typeof o.preco !== 'number') continue;
      if (g.preco === 'substitui') p = cent(o.preco);   // tamanho: o preço da opção é o preço do item
      else if (p !== null) p += cent(o.preco);          // acréscimo (ex.: ravioli + R$ 5)
    }
    return p;
  }

  /* ---------- 4. Linhas do pedido ----------
     linha de item : { tipo:'item',  id, sel:{grupo:valor}, obs, qtd }
     linha do monte: { tipo:'monte', id:'monte-sua-massa', massa, molho, adicionais:[ids], qtd }  */
  const CHAVE_LS = 'radici-pedido-v1';
  const novoEstado = () => ({ linhas: [], nome: '', modo: 'local', mesa: '', obsGeral: '', enviado: false, seq: 0 });
  let estado = novoEstado();
  let retiradasPorDia = false; // linhas do prato do dia de outro dia foram retiradas

  function chaveDe(l) {
    if (l.tipo === 'monte') return `monte|${l.massa}|${l.molho}|${[...l.adicionais].sort().join(',')}`;
    const sel = Object.keys(l.sel).sort().map((k) => `${k}=${l.sel[k]}`).join(';');
    return `${l.id}|${sel}|${(l.obs || '').trim().toLowerCase()}`;
  }

  // Confere uma linha vinda do localStorage: descarta o que não existe mais / não está disponível hoje.
  function normalizarLinha(b) {
    if (!b || typeof b !== 'object') return null;
    const qtd = Math.min(99, Math.max(1, parseInt(b.qtd, 10) || 1));
    if (b.tipo === 'monte') {
      if (!MONTE || !MONTE.massas.has(b.massa) || !MONTE.molhos.has(b.molho)) return null;
      const adicionais = [...new Set((b.adicionais || []).filter((id) => MONTE.adicionais.has(id)))];
      const l = { tipo: 'monte', id: 'monte-sua-massa', massa: b.massa, molho: b.molho, adicionais, qtd, t: b.t || 0 };
      l.chave = chaveDe(l);
      return l;
    }
    const item = ITENS.get(b.id);
    if (!item) return null;
    if (!disponibilidade(item).ok) { retiradasPorDia = true; return null; }
    const sel = {};
    for (const g of item.opcoes) {
      const v = b.sel && b.sel[g.id];
      if (g.tipo === 'texto') {
        const t = String(v || '').trim().slice(0, 60);
        if (t) sel[g.id] = t; else if (g.obrigatorio) return null;
      } else {
        if (g.itens.some((o) => o.nome === v)) sel[g.id] = v; else if (g.obrigatorio) return null;
      }
    }
    const l = { tipo: 'item', id: item.id, sel, obs: String(b.obs || '').trim().slice(0, 140), qtd, t: b.t || 0 };
    l.chave = chaveDe(l);
    return l;
  }

  /* ---------- 6. Persistência (localStorage, sempre com try/catch) ---------- */
  function carregar() {
    const e = novoEstado();
    try {
      const b = JSON.parse(localStorage.getItem(CHAVE_LS) || 'null');
      if (b && typeof b === 'object') {
        e.nome = String(b.nome || '').slice(0, 60);
        e.modo = b.modo === 'balcao' ? 'balcao' : 'local';
        e.mesa = String(b.mesa || '').replace(/\D/g, '').slice(0, 3);
        e.obsGeral = String(b.obsGeral || '').slice(0, 300);
        e.enviado = Boolean(b.enviado);
        e.seq = parseInt(b.seq, 10) || 0;
        e.linhas = (Array.isArray(b.linhas) ? b.linhas : []).map(normalizarLinha).filter(Boolean);
        if (!e.linhas.length) e.enviado = false;
      }
    } catch (erro) { /* sem localStorage: o pedido vale só nesta visita */ }
    return e;
  }
  function salvar() {
    try {
      localStorage.setItem(CHAVE_LS, JSON.stringify({
        linhas: estado.linhas.map(({ chave, ...resto }) => resto),
        nome: estado.nome, modo: estado.modo, mesa: estado.mesa, obsGeral: estado.obsGeral,
        enviado: estado.enviado, seq: estado.seq,
      }));
    } catch (erro) { /* ignora */ }
  }
  estado = carregar();

  function acharLinha(chave) { return estado.linhas.find((l) => l.chave === chave); }
  function qtdDoItem(id) { return estado.linhas.filter((l) => l.id === id).reduce((s, l) => s + l.qtd, 0); }
  function ultimaLinhaDoItem(id) {
    return estado.linhas.filter((l) => l.id === id).sort((a, b) => b.t - a.t)[0] || null;
  }

  // Itens iguais com as mesmas opções somam quantidade; opções diferentes viram linhas separadas.
  function juntarLinha(nova) {
    nova.chave = chaveDe(nova);
    nova.t = ++estado.seq;
    const existente = acharLinha(nova.chave);
    if (existente) { existente.qtd = Math.min(99, existente.qtd + nova.qtd); existente.t = nova.t; return existente; }
    estado.linhas.push(nova);
    return nova;
  }

  /* ---------- 5. Descrição das linhas ---------- */
  function descrever(l) {
    if (l.tipo === 'monte') {
      const massa = MONTE.massas.get(l.massa);
      const molho = MONTE.molhos.get(l.molho);
      const extras = l.adicionais.map((id) => MONTE.adicionais.get(id)).map((a) => ({ nome: minuscula(a.nome), cent: cent(a.preco) }));
      const base = cent(molho.preco);
      return {
        cat: 'massas', ordem: MONTE.ordem, nome: MONTE.nome,
        detalhe: `${massa.nome} ${fraseMolho(molho.nome)}`,
        baseCent: base, extras, unit: base + extras.reduce((s, e) => s + e.cent, 0), notas: [],
      };
    }
    const item = ITENS.get(l.id);
    let nome = item.nomePedido || item.nome;
    const partes = [];
    if (item.nomeConfig) { // prato do mês: o nome vem do campo editável
      const v = String(CONFIG[item.nomeConfig] || '').trim();
      if (v) partes.push(v); else nome += ' (consultar)';
    }
    for (const g of item.opcoes) {
      const v = l.sel[g.id];
      if (v == null || v === '') continue;
      if (g.viraNome) nome = v; else partes.push(v);
    }
    const unit = unidadeCent(item, l.sel);
    return {
      cat: item.categoriaPedido, ordem: item.ordem, nome, detalhe: partes.join(' · '),
      baseCent: unit, extras: [], unit, notas: item.nota ? [item.nota] : [],
    };
  }

  function linhasDescritas() {
    return estado.linhas.map((l) => ({ l, d: descrever(l) }))
      .sort((a, b) => (a.d.ordem - b.d.ordem) || (a.l.t - b.l.t));
  }
  function resumo() {
    let qtd = 0, total = 0, aConfirmar = false;
    estado.linhas.forEach((l) => {
      const d = descrever(l);
      qtd += l.qtd;
      if (d.unit === null) aConfirmar = true; else total += l.qtd * d.unit;
    });
    return { qtd, total, aConfirmar };
  }

  /* ---------- 7. Mensagem do WhatsApp ---------- */
  const DIVISOR = '━'.repeat(14);
  const SETA = '↳';

  function textoLinha(l, d) {
    const out = [];
    const valor = d.unit === null ? 'valor a confirmar' : moeda(l.qtd * d.baseCent);
    out.push(`- ${l.qtd}x ${d.nome}${d.detalhe ? ': ' + d.detalhe : ''} · ${valor}`);
    d.extras.forEach((e) => out.push(`   ${SETA} adicional: ${e.nome} (+ ${moeda(l.qtd * e.cent)})`));
    if (d.extras.length) out.push(`   ${SETA} subtotal: ${moeda(l.qtd * d.unit)}`);
    const obs = [...d.notas, l.obs].filter(Boolean);
    if (obs.length) out.push(`   ${SETA} obs.: ${obs.join(' · ')}`);
    return out;
  }

  function montarMensagem() {
    const limpa = (t) => String(t || '').replace(/\s+/g, ' ').trim();
    const onde = estado.modo === 'balcao' ? 'Retirada no balcão' : (estado.mesa ? `Mesa ${estado.mesa}` : 'Comer no local');
    const ds = linhasDescritas();
    const blocos = CATEGORIAS.map((cat) => {
      const dentro = ds.filter((x) => x.d.cat === cat.id);
      if (!dentro.length) return null; // categoria vazia não aparece
      return [`${cat.emoji} *${cat.titulo}*`, ...dentro.flatMap(({ l, d }) => textoLinha(l, d))];
    }).filter(Boolean);
    const r = resumo();

    const m = [
      `*Pedido · Radici d'Amore* ${CATEGORIAS[0].emoji}`, '',
      `*Nome:* ${limpa(estado.nome)}`,
      `*Onde:* ${onde}`, '',
      DIVISOR,
    ];
    blocos.forEach((b, i) => { if (i) m.push(''); m.push(...b); });
    m.push(DIVISOR, '', `*Total: ${moeda(r.total)}*`);
    if (limpa(estado.obsGeral)) m.push('', `\u{1F4DD} _Obs.: ${limpa(estado.obsGeral)}_`);
    m.push('', '_Pagamento no balcão._');
    if (r.aConfirmar) m.push('_Alguns valores serão confirmados pelo Radici._');
    return m.join('\n');
  }

  /* ---------- Operações sobre o pedido ---------- */
  function nomeCurto(id) { const i = ITENS.get(id); return i ? (i.nomePedido || i.nome) : ''; }

  function adicionarItem(id, sel, obs, qtd) {
    const item = ITENS.get(id);
    if (!item || !disponibilidade(item).ok) return null;
    const l = normalizarLinha({ tipo: 'item', id, sel: sel || {}, obs, qtd: qtd || 1 });
    if (!l) return null;
    const linha = juntarLinha(l);
    depoisDeAdicionar(nomeCurto(id));
    return linha;
  }
  function adicionarMonte({ massa, molho, adicionais }) {
    const l = normalizarLinha({ tipo: 'monte', massa, molho, adicionais: adicionais || [], qtd: 1 });
    if (!l) return null;
    const linha = juntarLinha(l);
    depoisDeAdicionar(MONTE.nome);
    return linha;
  }
  function depoisDeAdicionar(nome) {
    estado.enviado = false;
    aplicar();
    pulsar();
    avisar(`${nome} adicionado`);
  }
  function alterarQtd(chave, delta) {
    const l = acharLinha(chave);
    if (!l) return;
    l.qtd += delta;
    if (l.qtd <= 0) estado.linhas = estado.linhas.filter((x) => x !== l);
    else { l.qtd = Math.min(99, l.qtd); l.t = ++estado.seq; }
    if (delta > 0) { estado.enviado = false; pulsar(); }
    aplicar();
  }
  function removerLinha(chave) { estado.linhas = estado.linhas.filter((l) => l.chave !== chave); aplicar(); }
  function limparPedido() {
    estado.linhas = []; estado.enviado = false; estado.obsGeral = ''; retiradasPorDia = false;
    aplicar();
  }

  // Tira do pedido o prato do dia de outro dia (ex.: a página ficou aberta de um dia para o outro)
  function descartarIndisponiveis() {
    const antes = estado.linhas.length;
    estado.linhas = estado.linhas.filter((l) => l.tipo === 'monte' || disponibilidade(ITENS.get(l.id)).ok);
    if (estado.linhas.length !== antes) retiradasPorDia = true;
  }
  let avisouRetiradas = false;

  /* ---------- 10. Barra, aviso ---------- */
  const aviso = el('div', { class: 'aviso-pedido', role: 'status', 'aria-live': 'polite' });
  const barraTexto = el('p', { class: 'barra-pedido__texto' });
  const barraBtn = el('button', { class: 'btn btn--cheio btn--pequeno', type: 'button' }, 'Ver pedido');
  const barra = el('section', { class: 'barra-pedido', 'aria-label': 'Resumo do pedido', hidden: true },
    el('div', { class: 'contido barra-pedido__in' }, barraTexto, barraBtn));
  document.body.append(barra, aviso);

  function textoDaBarra() {
    const r = resumo();
    const itens = `${r.qtd} ${r.qtd === 1 ? 'item' : 'itens'}`;
    let valor = moeda(r.total);
    if (r.aConfirmar) valor = r.total ? `${valor} + a confirmar` : 'valor a confirmar';
    return ['Seu pedido · ' + itens + ' · ', el('span', { class: 'barra-pedido__valor' }, valor)];
  }
  function renderBarra() {
    const tem = estado.linhas.length > 0;
    barra.hidden = !tem;
    document.body.classList.toggle('tem-pedido', tem); // espaço no fim da página para a barra não cobrir conteúdo
    if (tem) barraTexto.replaceChildren(...textoDaBarra());
  }
  function pulsar() { // pulinho suave: scale 1 -> 1.04 -> 1 em 250ms (some com prefers-reduced-motion)
    barra.classList.remove('pulinho');
    void barra.offsetWidth;
    barra.classList.add('pulinho');
  }
  barra.addEventListener('animationend', () => barra.classList.remove('pulinho'));

  let tAviso;
  function avisar(texto) {
    aviso.textContent = texto;
    aviso.classList.add('is-visivel');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => aviso.classList.remove('is-visivel'), 2000);
  }

  /* ---------- 8. Botões de pedir ---------- */
  const botaoStepper = (acao, rotulo, ico) => el('button', { class: 'stepper__btn', type: 'button', 'data-acao': acao, 'aria-label': rotulo }, icone(ico));

  function renderControle(wrap) {
    const item = ITENS.get(wrap.dataset.pedir);
    if (!item) { wrap.replaceChildren(); return; }
    const disp = disponibilidade(item);
    if (!disp.ok) {
      if (disp.fimDeSemana) wrap.replaceChildren(); // sábado e domingo: sem botão
      else wrap.replaceChildren(el('button', { class: 'btn btn--contorno btn--pequeno', type: 'button', 'aria-disabled': 'true' }, `disponível na ${disp.quando}`));
      return;
    }
    const nome = item.nomePedido || item.nome;
    const q = qtdDoItem(item.id);
    if (!q) {
      wrap.replaceChildren(el('button', { class: 'btn btn--contorno btn--pequeno', type: 'button', 'data-acao': 'adicionar', 'aria-label': `Adicionar ${nome} ao pedido` }, '+ adicionar'));
    } else {
      wrap.replaceChildren(el('div', { class: 'stepper', role: 'group', 'aria-label': `Quantidade de ${nome} no pedido` },
        botaoStepper('menos', `Diminuir ${nome}`, ICO_MENOS),
        el('span', { class: 'stepper__qtd' }, q),
        botaoStepper('mais', `Aumentar ${nome}`, ICO_MAIS)));
    }
  }

  function renderControles() {
    // guarda o foco (quem usa teclado não pode perdê-lo quando o botão é redesenhado)
    const ativo = document.activeElement;
    const wrapAtivo = ativo && ativo.closest ? ativo.closest('[data-pedir]') : null;
    let foco = null;
    if (wrapAtivo) {
      const id = wrapAtivo.dataset.pedir;
      foco = { id, idx: $$(`[data-pedir="${id}"]`).indexOf(wrapAtivo), acao: ativo.dataset.acao };
    }
    $$('[data-pedir]').forEach(renderControle);
    if (foco) focarControle(foco.id, foco.idx, foco.acao);
  }

  function focarControle(id, idx, preferida) {
    const wrap = $$(`[data-pedir="${id}"]`)[idx] || $(`[data-pedir="${id}"]`);
    if (!wrap) return;
    const ordem = preferida === 'adicionar' ? ['mais', 'adicionar'] : preferida === 'menos' ? ['menos', 'adicionar'] : [preferida, 'mais', 'adicionar'];
    for (const a of ordem) {
      const b = a && $(`[data-acao="${a}"]`, wrap);
      if (b) { b.focus({ preventScroll: true }); return; }
    }
  }

  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-pedir] button[data-acao]');
    if (!btn) return;
    const wrap = btn.closest('[data-pedir]');
    const id = wrap.dataset.pedir;
    const idx = $$(`[data-pedir="${id}"]`).indexOf(wrap);
    const item = ITENS.get(id);
    if (!item) return;
    const acao = btn.dataset.acao;

    if (acao === 'menos') {
      const l = ultimaLinhaDoItem(id);
      if (l) alterarQtd(l.chave, -1);
      focarControle(id, idx, 'menos');
      return;
    }
    // adicionar / mais
    if (item.opcoes.length) { abrirOpcoes(id, idx); return; }
    adicionarItem(id, {}, '', 1);
    focarControle(id, idx, 'mais');
  });

  /* ---------- 9. Janela de opções ---------- */
  const dlgOpcoes = el('dialog', { class: 'painel painel--opcoes', 'aria-labelledby': 'opcoes-titulo' });
  document.body.append(dlgOpcoes);

  function travar(on) { document.body.classList.toggle('painel-aberto', on); }
  function abrir(dlg) { if (!dlg.open) dlg.showModal(); travar(true); }
  // destrava a rolagem NA HORA de fechar (o evento "close" do navegador pode chegar atrasado)
  function fecharPainel(dlg) { if (dlg.open) dlg.close(); travar(false); }
  [dlgOpcoes].forEach((dlg) => {
    dlg.addEventListener('close', () => travar(false));
    dlg.addEventListener('cancel', () => travar(false));
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) fecharPainel(dlg); }); // clique fora fecha
  });

  let contadorCampos = 0;
  function abrirOpcoes(id, idx) {
    const item = ITENS.get(id);
    const n = ++contadorCampos;
    const sel = {};
    const erros = new Map();
    const titulo = el('h2', { class: 'painel__titulo', id: 'opcoes-titulo', tabindex: '-1' }, item.nomePedido || item.nome);
    const fechar = el('button', { class: 'painel__fechar', type: 'button', 'aria-label': 'Fechar' }, icone(ICO_FECHAR));
    fechar.addEventListener('click', () => fecharPainel(dlgOpcoes));
    const corpo = el('div', { class: 'painel__corpo' });
    const botao = el('button', { class: 'btn btn--cheio btn--bloco', type: 'submit' });

    function rotuloDoBotao() {
      const falta = item.opcoes.some((g) => g.preco === 'substitui' && g.obrigatorio && !sel[g.id]); // o preço depende da escolha
      if (falta) return 'Adicionar';
      const u = unidadeCent(item, sel);
      return u === null ? 'Adicionar · valor a confirmar' : `Adicionar · ${moeda(u)}`;
    }
    const atualizarBotao = () => { botao.textContent = rotuloDoBotao(); };
    const esconderErro = (gid) => { const e = erros.get(gid); if (e) e.hidden = true; };

    item.opcoes.forEach((g) => {
      const erro = el('p', { class: 'erro', role: 'alert', id: `op-erro-${n}-${g.id}`, hidden: true });
      erros.set(g.id, erro);
      let conteudo;
      if (g.tipo === 'texto') {
        const input = el('input', {
          class: 'campo', type: 'text', id: `op-${n}-${g.id}`, name: g.id, maxlength: '60', autocomplete: 'off',
          'aria-describedby': `op-dica-${n}-${g.id} op-erro-${n}-${g.id}`,
        });
        input.addEventListener('input', () => { sel[g.id] = input.value; input.removeAttribute('aria-invalid'); esconderErro(g.id); });
        conteudo = [input, g.dica ? el('p', { class: 'grupo__dica', id: `op-dica-${n}-${g.id}` }, g.dica) : null];
      } else {
        conteudo = el('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': g.titulo }, g.itens.map((o, i) => {
          const ident = `op-${n}-${g.id}-${i}`;
          const input = el('input', { class: 'opcao__input', type: 'radio', name: `op-${n}-${g.id}`, id: ident, value: o.nome });
          input.addEventListener('change', () => { sel[g.id] = o.nome; esconderErro(g.id); atualizarBotao(); });
          const preco = typeof o.preco === 'number' ? (g.preco === 'substitui' ? moeda(cent(o.preco)) : '+ ' + moeda(cent(o.preco))) : null;
          return el('label', { class: 'opcao opcao--radio', for: ident },
            input,
            el('span', { class: 'opcao__caixa' },
              el('span', { class: 'opcao__marca' }, marcaCheck()),
              el('span', { class: 'opcao__texto' },
                el('span', { class: 'opcao__nome' }, o.nome),
                o.obs ? el('span', { class: 'opcao__obs' }, o.obs) : null),
              preco ? el('span', { class: 'opcao__preco' }, preco) : null));
        }));
      }
      corpo.append(el('fieldset', { class: 'grupo' }, el('legend', { class: 'grupo__legenda' }, minuscula(g.titulo)), conteudo, erro));
    });

    const obs = el('input', { class: 'campo', type: 'text', id: `op-${n}-obs`, maxlength: '140', autocomplete: 'off' });
    corpo.append(el('div', { class: 'grupo' },
      el('label', { class: 'grupo__legenda', for: `op-${n}-obs` }, 'alguma observação?', el('span', { class: 'grupo__nota' }, 'opcional')),
      obs));

    const form = el('form', { class: 'painel__caixa', novalidate: true },
      el('header', { class: 'painel__cab' }, titulo, fechar),
      corpo,
      el('div', { class: 'painel__rodape' }, botao));

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      let primeiro = null;
      item.opcoes.forEach((g) => {
        const v = sel[g.id];
        const falta = g.obrigatorio && (g.tipo === 'texto' ? !String(v || '').trim() : !v);
        if (!falta) return;
        const e = erros.get(g.id);
        e.textContent = g.tipo === 'texto' ? (g.id === 'sabor' ? 'Informe o sabor.' : 'Preencha este campo.') : 'Escolha uma opção.';
        e.hidden = false;
        if (g.tipo === 'texto') $(`#op-${n}-${g.id}`, form).setAttribute('aria-invalid', 'true');
        if (!primeiro) primeiro = g;
      });
      if (primeiro) {
        const alvo = primeiro.tipo === 'texto' ? $(`#op-${n}-${primeiro.id}`, form) : $('.opcao__input', erros.get(primeiro.id).closest('fieldset'));
        if (alvo) alvo.focus();
        return;
      }
      const limpo = {};
      item.opcoes.forEach((g) => { if (sel[g.id] != null && String(sel[g.id]).trim() !== '') limpo[g.id] = g.tipo === 'texto' ? sel[g.id].trim() : sel[g.id]; });
      adicionarItem(id, limpo, obs.value, 1);
      fecharPainel(dlgOpcoes);
      focarControle(id, idx, 'mais');
    });

    atualizarBotao();
    dlgOpcoes.replaceChildren(form);
    abrir(dlgOpcoes);
    titulo.focus({ preventScroll: true });
  }

  /* ---------- 10. Sacola ---------- */
  const dlgSacola = el('dialog', { class: 'painel painel--sacola', 'aria-labelledby': 'sacola-titulo' });
  const alca = el('button', { class: 'painel__alca', type: 'button', 'aria-label': 'Fechar pedido' }, el('span', { 'aria-hidden': 'true' }));
  const btnFecharSacola = el('button', { class: 'painel__fechar', type: 'button', 'aria-label': 'Fechar pedido', autofocus: true }, icone(ICO_FECHAR));
  const listaEl = el('div', { class: 'sacola__lista' });
  const vazioEl = el('div', { class: 'sacola__vazio', hidden: true },
    el('p', null, 'Seu pedido está vazio.'),
    el('button', { class: 'btn btn--contorno', type: 'button', 'data-acao': 'voltar' }, 'Voltar ao cardápio'));
  const retiradasEl = el('p', { class: 'sacola__retiradas', hidden: true }, 'O prato do dia de outro dia saiu do pedido.');

  // campos
  const campoNome = el('input', { class: 'campo', type: 'text', id: 'sacola-nome', maxlength: '60', autocomplete: 'name', 'aria-describedby': 'sacola-erro-nome' });
  const erroNome = el('p', { class: 'erro', role: 'alert', id: 'sacola-erro-nome', hidden: true });
  const radioLocal = el('input', { class: 'opcao__input', type: 'radio', name: 'sacola-modo', id: 'sacola-modo-local', value: 'local' });
  const radioBalcao = el('input', { class: 'opcao__input', type: 'radio', name: 'sacola-modo', id: 'sacola-modo-balcao', value: 'balcao' });
  const campoMesa = el('input', { class: 'campo campo--mesa', type: 'text', inputmode: 'numeric', maxlength: '3', autocomplete: 'off', 'aria-label': 'Número da mesa (opcional)', id: 'sacola-mesa' });
  const campoObs = el('textarea', { class: 'campo', id: 'sacola-obs', rows: '2', maxlength: '300' });
  const opcaoModo = (radio, ...texto) => el('label', { class: 'opcao opcao--radio', for: radio.id },
    radio, el('span', { class: 'opcao__caixa' }, el('span', { class: 'opcao__marca' }, marcaCheck()), el('span', { class: 'opcao__texto' }, ...texto)));
  const camposEl = el('div', { class: 'sacola__campos' },
    el('div', { class: 'grupo' },
      el('label', { class: 'grupo__legenda', for: 'sacola-nome' }, 'seu nome', el('span', { class: 'grupo__nota' }, 'obrigatório')),
      campoNome, erroNome),
    el('fieldset', { class: 'grupo' },
      el('legend', { class: 'grupo__legenda' }, 'como vai ser?'),
      el('div', { class: 'opcoes opcoes--uma' },
        opcaoModo(radioLocal, el('span', { class: 'opcao__nome' }, 'Vou comer aí, mesa nº'), campoMesa),
        opcaoModo(radioBalcao, el('span', { class: 'opcao__nome' }, 'Vou retirar no balcão')))),
    el('div', { class: 'grupo' },
      el('label', { class: 'grupo__legenda', for: 'sacola-obs' }, 'observações gerais', el('span', { class: 'grupo__nota' }, 'opcional')),
      campoObs));

  // rodapé
  const enviadoEl = el('div', { class: 'sacola__enviado', hidden: true },
    el('p', null, 'Pedido enviado?'),
    el('button', { class: 'btn btn--contorno btn--pequeno', type: 'button', 'data-acao': 'limpar-sacola' }, 'Limpar sacola'));
  const totalEl = el('strong', { class: 'sacola__total-valor' });
  const btnEnviar = el('button', { class: 'btn btn--cheio btn--bloco', type: 'button', 'data-acao': 'enviar' }, 'Enviar pedido pelo WhatsApp');
  const limparEl = el('div', { class: 'sacola__limpar' });
  const rodapeEl = el('div', { class: 'painel__rodape' },
    enviadoEl,
    el('p', { class: 'sacola__total' }, 'Total', totalEl),
    el('p', { class: 'sacola__aviso' }, 'Pagamento feito diretamente no balcão. Itens sujeitos à disponibilidade.'),
    btnEnviar, limparEl);

  const corpoSacola = el('div', { class: 'painel__corpo' }, retiradasEl, vazioEl, listaEl, camposEl);
  dlgSacola.append(el('div', { class: 'painel__caixa' },
    alca,
    el('header', { class: 'painel__cab' },
      el('h2', { class: 'titulo-assinatura painel__titulo-assinatura', id: 'sacola-titulo' },
        el('span', { class: 'ta-fonde' }, 'Seu'), ' ', el('span', { class: 'ta-astina' }, 'pedido')),
      btnFecharSacola),
    corpoSacola, rodapeEl));
  document.body.append(dlgSacola);

  dlgSacola.addEventListener('close', () => { travar(false); confirmandoLimpar = false; });
  dlgSacola.addEventListener('cancel', () => travar(false));
  dlgSacola.addEventListener('click', (ev) => { if (ev.target === dlgSacola) fecharPainel(dlgSacola); });
  btnFecharSacola.addEventListener('click', () => fecharPainel(dlgSacola));
  barraBtn.addEventListener('click', abrirSacola);

  // alça: arrastar para baixo fecha (celular); um toque simples também fecha
  (function ligarAlca() {
    const caixa = $('.painel__caixa', dlgSacola);
    let y0 = null, dy = 0, t0 = 0, moveu = false;
    alca.addEventListener('pointerdown', (e) => {
      if (!celularMQ.matches) return;
      y0 = e.clientY; dy = 0; t0 = e.timeStamp; moveu = false;
      try { alca.setPointerCapture(e.pointerId); } catch (erro) { /* sem captura: o arraste funciona do mesmo jeito */ }
      caixa.style.animation = 'none';
    });
    alca.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      dy = Math.max(0, e.clientY - y0);
      if (dy > 6) moveu = true;
      caixa.style.transform = `translateY(${dy}px)`;
    });
    const soltar = (e) => {
      if (y0 == null) return;
      const rapido = dy / Math.max(1, e.timeStamp - t0) > 0.6;
      const fecha = dy > 110 || (dy > 40 && rapido);
      y0 = null;
      setTimeout(() => { moveu = false; }, 60); // o clique que o navegador dispara depois do arraste já foi ignorado
      caixa.style.transform = '';
      caixa.style.animation = '';
      if (fecha) fecharPainel(dlgSacola);
    };
    alca.addEventListener('pointerup', soltar);
    alca.addEventListener('pointercancel', soltar);
    alca.addEventListener('click', () => { if (moveu) { moveu = false; return; } fecharPainel(dlgSacola); });
  })();

  let confirmandoLimpar = false;

  function linhaDom(l, d) {
    const info = [];
    if (d.detalhe) info.push(d.detalhe);
    d.extras.forEach((e) => info.push(`adicional: ${e.nome} (+ ${moeda(e.cent)})`));
    const obs = [...d.notas, l.obs].filter(Boolean);
    if (obs.length) info.push('obs.: ' + obs.join(' · '));
    const nome = d.nome;
    return el('li', { class: 'linha', 'data-chave': l.chave },
      el('div', { class: 'linha__topo' },
        el('span', { class: 'linha__nome' }, nome),
        el('span', { class: 'linha__valor' }, d.unit === null ? 'valor a confirmar' : moeda(l.qtd * d.unit))),
      info.map((t) => el('p', { class: 'linha__info' }, t)),
      el('div', { class: 'linha__acoes' },
        el('div', { class: 'stepper', role: 'group', 'aria-label': `Quantidade de ${nome}` },
          botaoStepper('menos', `Diminuir ${nome}`, ICO_MENOS),
          el('span', { class: 'stepper__qtd' }, l.qtd),
          botaoStepper('mais', `Aumentar ${nome}`, ICO_MAIS)),
        el('button', { class: 'link-btn', type: 'button', 'data-acao': 'remover', 'aria-label': `Remover ${nome} do pedido` }, 'remover')));
  }

  function renderLimpar() {
    if (!confirmandoLimpar) {
      limparEl.replaceChildren(el('button', { class: 'link-btn', type: 'button', 'data-acao': 'limpar-pedido' }, 'limpar pedido'));
    } else {
      limparEl.replaceChildren(el('div', { class: 'sacola__confirma', role: 'group', 'aria-label': 'Confirmar limpeza do pedido' },
        el('p', null, 'Limpar todo o pedido?'),
        el('button', { class: 'btn btn--cheio btn--pequeno', type: 'button', 'data-acao': 'limpar-sim' }, 'Sim, limpar'),
        el('button', { class: 'btn btn--contorno btn--pequeno', type: 'button', 'data-acao': 'limpar-nao' }, 'Cancelar')));
    }
  }

  function renderSacola() {
    const tem = estado.linhas.length > 0;
    vazioEl.hidden = tem;
    camposEl.hidden = !tem;
    rodapeEl.hidden = !tem;
    retiradasEl.hidden = !retiradasPorDia;
    enviadoEl.hidden = !(tem && estado.enviado);
    if (!tem) { listaEl.replaceChildren(); return; }

    const ds = linhasDescritas();
    listaEl.replaceChildren(...CATEGORIAS.map((cat) => {
      const dentro = ds.filter((x) => x.d.cat === cat.id);
      if (!dentro.length) return null;
      return el('section', { class: 'sacola__grupo' },
        el('h3', { class: 'sacola__grupo-titulo' }, cat.rotulo),
        el('ul', { class: 'sacola__itens' }, dentro.map(({ l, d }) => linhaDom(l, d))));
    }).filter(Boolean));

    const r = resumo();
    totalEl.replaceChildren(
      r.aConfirmar && !r.total ? 'valor a confirmar' : moeda(r.total),
      r.aConfirmar && r.total ? el('span', { class: 'sacola__total-conf' }, '+ valores a confirmar') : null);
    renderLimpar();
  }

  function preencherCampos() {
    campoNome.value = estado.nome;
    radioLocal.checked = estado.modo === 'local';
    radioBalcao.checked = estado.modo === 'balcao';
    campoMesa.value = estado.mesa;
    campoObs.value = estado.obsGeral;
    erroNome.hidden = true;
    campoNome.removeAttribute('aria-invalid');
  }

  function abrirSacola() {
    if (!estado.linhas.length) return;
    preencherCampos();
    confirmandoLimpar = false;
    renderSacola();
    abrir(dlgSacola);
    btnFecharSacola.focus({ preventScroll: true });
  }

  // campos: guardam a cada digitação
  campoNome.addEventListener('input', () => { estado.nome = campoNome.value; erroNome.hidden = true; campoNome.removeAttribute('aria-invalid'); salvar(); });
  [radioLocal, radioBalcao].forEach((r) => r.addEventListener('change', () => { estado.modo = r.value; salvar(); }));
  campoMesa.addEventListener('input', () => {
    campoMesa.value = campoMesa.value.replace(/\D/g, '');
    estado.mesa = campoMesa.value;
    if (estado.modo !== 'local') { estado.modo = 'local'; radioLocal.checked = true; }
    salvar();
  });
  campoObs.addEventListener('input', () => { estado.obsGeral = campoObs.value; salvar(); });

  function enviar() {
    if (!estado.linhas.length) return;
    if (!estado.nome.trim()) {
      erroNome.textContent = 'Informe seu nome para enviar o pedido.';
      erroNome.hidden = false;
      campoNome.setAttribute('aria-invalid', 'true');
      campoNome.focus();
      return;
    }
    const url = `https://wa.me/${CONFIG.whatsappNumero}?text=` + encodeURIComponent(montarMensagem());
    window.open(url, '_blank', 'noopener');
    estado.enviado = true;
    salvar();
    renderSacola();
    $('[data-acao="limpar-sacola"]', enviadoEl).focus({ preventScroll: true });
  }

  function focarLinha(chave, acao) {
    const li = $$('[data-chave]', listaEl).find((x) => x.dataset.chave === chave);
    const b = li && $(`[data-acao="${acao}"]`, li);
    if (b) { b.focus({ preventScroll: true }); return; }
    const primeiro = $('button[data-acao]', listaEl) || $('[data-acao="voltar"]', vazioEl);
    (primeiro || btnFecharSacola).focus({ preventScroll: true });
  }

  dlgSacola.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    const li = b.closest('[data-chave]');
    const chave = li && li.dataset.chave;
    switch (acao) {
      case 'mais': alterarQtd(chave, +1); focarLinha(chave, 'mais'); break;
      case 'menos': alterarQtd(chave, -1); focarLinha(chave, 'menos'); break;
      case 'remover': removerLinha(chave); focarLinha(chave, 'remover'); break;
      case 'voltar': fecharPainel(dlgSacola); break;
      case 'enviar': enviar(); break;
      case 'limpar-pedido': confirmandoLimpar = true; renderLimpar(); $('[data-acao="limpar-nao"]', limparEl).focus(); break;
      case 'limpar-nao': confirmandoLimpar = false; renderLimpar(); $('[data-acao="limpar-pedido"]', limparEl).focus(); break;
      case 'limpar-sim': case 'limpar-sacola': confirmandoLimpar = false; limparPedido(); fecharPainel(dlgSacola); break;
      default: break;
    }
  });

  /* ---------- Aplicar mudanças ---------- */
  function aplicar() {
    salvar();
    renderBarra();
    renderControles();
    if (dlgSacola.open) {
      renderSacola();
      if (!estado.linhas.length) { /* ficou vazia: mostra o aviso de sacola vazia */ }
    }
  }

  // main.js avisa sempre que (re)desenha os itens do cardápio
  document.addEventListener('radici:render', () => {
    descartarIndisponiveis();
    aplicar();
    if (retiradasPorDia && !avisouRetiradas) { avisouRetiradas = true; avisar('O prato do dia de outro dia saiu do seu pedido'); }
  });

  // Sobe a barra se já havia pedido salvo (a página foi reaberta)
  renderBarra();

  /* ---------- API (também usada nos testes) ---------- */
  window.RadiciPedido = {
    adicionarItem,
    adicionarMonte,
    abrirSacola,
    limpar: limparPedido,
    mensagem: montarMensagem,
    resumo,
    moeda,
    itens: ITENS,
    monte: MONTE,
    estado: () => JSON.parse(JSON.stringify(estado)),
    definirCampos(c) { Object.assign(estado, c); salvar(); },
  };
})();
