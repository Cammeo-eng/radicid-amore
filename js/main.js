/* ============================================================
   RADICI D'AMORE · main.js
   JavaScript puro, sem dependências. Lê CARDAPIO e CONFIG (js/cardapio-data.js).

   Índice
   1. Utilitários            6. Prato destaque
   2. Fotos e placeholders   7. Monte sua massa (montador)
   3. Configuração/contatos  8. Cardápio completo (em abas)
   4. Prato do dia      9. Header, menu mobile, animações
   5. Empanadas             10. Inicialização
   ============================================================ */
(function () {
  'use strict';

  if (typeof CARDAPIO === 'undefined' || typeof CONFIG === 'undefined') {
    console.error('Radici: js/cardapio-data.js não foi carregado.');
    return;
  }

  /* ---------- 1. Utilitários ---------- */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cria elementos sem innerHTML: '&' e aspas dos dados nunca quebram o HTML.
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

  function svgUso(id, classe) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('aria-hidden', 'true');
    if (classe) s.setAttribute('class', classe);
    const u = document.createElementNS(ns, 'use');
    u.setAttribute('href', '#' + id);
    s.append(u);
    return s;
  }

  const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const minuscula = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  // Mesmo padrão do cardápio: inteiro sem centavos, com centavos sempre duas casas.
  const formatarReais = (n) => 'R$ ' + (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));

  // Gancho do pedido: js/pedido.js preenche estes <div> com "+ adicionar" / [ − 1 + ] (um por item do cardápio).
  const criarPedir = (id) => el('div', { class: 'pedir', 'data-pedir': id });
  // Acréscimo (ex.: ravioli/tortéi + R$ 5) vem das opções: o valor é escrito uma vez só, nos dados.
  const acrescimoDe = (grupos) => {
    for (const g of grupos || []) {
      if (g.preco === 'substitui') continue;
      const o = (g.itens || []).find((x) => typeof x.preco === 'number');
      if (o) return o.preco;
    }
    return null;
  };

  const cat = (nome) => CARDAPIO.cardapio.find((c) => c.categoria === nome);
  const CAT_EMPANADAS = 'Da Itália à Argentina: Empanadas Argentinas';
  const CAT_PRATO_DO_DIA = 'Prato do dia';
  const CAT_MONTE = 'Monte sua massa';
  const CAT_DESTAQUE = 'Prato destaque';
  const CAT_PER_DUE = 'Piatto per due';

  /* ---------- 2. Fotos e placeholders ----------
     Se fotos/xxx.jpg existir, a foto aparece; se não, fica o placeholder do padrão. */
  function iniciarFoto(fig) {
    const img = $('img', fig);
    if (!img) return;
    const ok = () => fig.classList.add('tem-foto');
    const falhou = () => img.remove();
    img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', falhou, { once: true });
    if (img.complete) (img.naturalWidth ? ok : falhou)();
  }

  function criarFoto({ src, alt, nome, lado = 'esq', ar = '4/3', classe = '', imediata = false }) {
    const fig = el('figure', { class: `foto foto--${lado} ${classe}`.trim(), style: `--ar:${ar}` },
      el('div', { class: 'foto__vazio', 'aria-hidden': 'true' },
        el('div', { class: 'foto__vazio-in' }, el('span', { class: 'foto__nome' }, nome))),
      el('img', { class: 'foto__img', src, alt, width: 1200, height: 900, loading: imediata ? null : 'lazy', decoding: 'async' }));
    iniciarFoto(fig);
    return fig;
  }

  // Coraçãozinho vinho, assinatura da casa (usar com moderação: no máximo 5 no site todo)
  const criarCoracao = (largura) => el('img', {
    class: 'coracao', src: 'assets/coracao.svg', width: largura, height: Math.round(largura * 46 / 58), alt: '',
  });

  /* ---------- 3. Configuração e contatos ---------- */
  function aplicarConfig() {
    const wa = `https://wa.me/${CONFIG.whatsappNumero}`;
    $$('[data-whatsapp]').forEach((a) => { a.href = wa; });
    $$('[data-instagram]').forEach((a) => { a.href = CONFIG.instagramUrl; });

    const temIfood = /^https?:\/\//.test(CONFIG.ifoodUrl || '');
    $$('[data-ifood]').forEach((a) => {
      if (temIfood) {
        a.href = CONFIG.ifoodUrl;
        a.target = '_blank';
        a.rel = 'noopener';
      } else if (a.closest('.contatos')) {
        a.hidden = true; // sem link, o rodapé mostra só o marcador [[PREENCHER]]
      }
    });
    const vazioIfood = $('[data-vazio-ifood]');
    if (vazioIfood) vazioIfood.hidden = temIfood;

    if (CONFIG.endereco) {
      $('[data-config="endereco"]').replaceChildren(el('a', {
        href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.endereco),
        target: '_blank',
        rel: 'noopener',
      }, CONFIG.endereco));
      const mapa = $('#mapa');
      mapa.replaceChildren(el('iframe', {
        title: 'Mapa do Radici d\'Amore',
        src: 'https://www.google.com/maps?q=' + encodeURIComponent(CONFIG.endereco) + '&output=embed',
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade',
        allowfullscreen: true,
      }));
    }

    $$('[data-preco-cat]').forEach((e) => {
      const c = cat(e.dataset.precoCat);
      if (c) e.textContent = formatarReais(c.preco_unico);
    });
  }

  /* ---------- 4. Prato do dia ---------- */
  // 0 = domingo … 6 = sábado. Dias que têm prato do dia (o site mostra a semana toda nos outros).
  const DIAS_COM_PRATO_DO_DIA = [1, 2, 3, 4, 5];
  const DIA_SLUG = { 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta' };
  const DIA_ABREV = { segunda: 'seg', terca: 'ter', quarta: 'qua', quinta: 'qui', sexta: 'sex' };
  const NUM_DIA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  const mobileMQ = window.matchMedia('(max-width: 47.99rem)');

  // Dia da semana no fuso de São Paulo. Para testar: ?dia=quinta  ou  ?dia=sabado
  function diaDaSemana() {
    const forcado = new URLSearchParams(location.search).get('dia');
    if (forcado && slug(forcado) in NUM_DIA) return NUM_DIA[slug(forcado)];
    const abrev = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(new Date());
    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[abrev];
  }

  // Sexta: "…camadas intercaladas ao molho X | ao molho Y | … . Somente na sexta-feira."
  function lerSexta(desc) {
    if (!/ \| /.test(desc)) return null;
    const somente = /\.?\s*Somente na sexta-feira\.?\s*$/i;
    const temSomente = somente.test(desc);
    const partes = desc.replace(somente, '').replace(/\.\s*$/, '').split(' | ');
    const m = partes[0].match(/^(.*?)\s+(ao molho .*)$/);
    return {
      intro: m ? m[1] : '',
      opcoes: [m ? m[2] : partes[0], ...partes.slice(1)],
      somente: temSomente ? 'Somente na sexta-feira' : '',
    };
  }

  function nosDescricao(item, classeP) {
    const sexta = lerSexta(item.descricao);
    if (!sexta) return [el('p', { class: classeP }, item.descricao)];
    return [
      sexta.intro ? el('p', { class: classeP }, sexta.intro) : null,
      el('ul', { class: 'sexta__lista' }, sexta.opcoes.map((o) => el('li', null, o))),
      sexta.somente ? el('p', { class: 'sexta__somente' }, sexta.somente) : null,
    ];
  }

  function fotoDoDia(item, lado, ar, imediata) {
    return criarFoto({
      src: `fotos/dia-${slug(item.dia)}.jpg`,
      alt: `${item.nome}, prato do dia de ${minuscula(item.dia)}`,
      nome: minuscula(item.dia),
      lado, ar, imediata,
    });
  }

  function blocoHoje(item, preco, serve) {
    return el('article', { class: 'pdg-hoje reveal', 'aria-label': 'Prato de hoje' },
      fotoDoDia(item, 'esq', '5/4', false),
      el('div', { class: 'pdg-hoje__texto' },
        el('div', { class: 'pdg-hoje__topo' },
          el('span', { class: 'selo-hoje' }, 'hoje'),
          criarCoracao(14),
          el('p', { class: 'pdg-dia__dia' }, minuscula(item.dia))),
        el('h3', { class: 'pdg-dia__nome' }, item.nome),
        el('p', { class: 'pdg-dia__serve' }, `(${serve})`),
        nosDescricao(item, 'pdg-dia__desc'),
        el('p', { class: 'pdg-hoje__preco' }, preco),
        criarPedir(item.id)));
  }

  function blocoFimDeSemana() {
    return el('div', { class: 'pdg-fimsemana reveal' },
      el('p', null, 'Hoje a cozinha descansa do prato do dia. Segunda tem mais, e a gente te espera.'),
      el('a', { class: 'btn btn--cheio', href: '#monte-sua-massa' }, 'Monte sua massa'));
  }

  function artigoDia(item, indice, hojeSlug, serve) {
    const s = slug(item.dia);
    const ehHoje = s === hojeSlug;
    return el('article', {
      class: `pdg-dia reveal${indice % 2 ? ' pdg-dia--inv' : ''}${ehHoje ? ' is-hoje' : ''}`,
      id: `dia-${s}`,
      'aria-current': ehHoje ? 'date' : null,
    },
      fotoDoDia(item, indice % 2 ? 'dir' : 'esq', '4/3', false),
      el('div', { class: 'pdg-dia__texto' },
        el('p', { class: 'pdg-dia__dia' }, minuscula(item.dia),
          ehHoje ? el('span', { class: 'marca-hoje' }, 'hoje') : null),
        el('h3', { class: 'pdg-dia__nome' }, item.nome),
        el('p', { class: 'pdg-dia__serve' }, `(${serve})`),
        nosDescricao(item, 'pdg-dia__desc'),
        criarPedir(item.id)));
  }

  function renderPratoDoDia() {
    const c = cat(CAT_PRATO_DO_DIA);
    const raiz = $('#prato-dia-conteudo');
    if (!c || !raiz) return;

    const serve = (c.descricao.match(/Serve \d+ pessoas?/i) || ['Serve 1 pessoa'])[0];
    const n = diaDaSemana();
    const hojeSlug = DIAS_COM_PRATO_DO_DIA.includes(n) ? DIA_SLUG[n] : null;
    raiz.dataset.hoje = hojeSlug || 'fim-de-semana';

    const artigos = c.itens.map((it, i) => artigoDia(it, i, hojeSlug, serve));
    const tabs = c.itens.map((it) => {
      const s = slug(it.dia);
      return el('button', {
        type: 'button', class: 'pdg-tab', id: `tab-${s}`, 'data-dia': s,
        'aria-label': s === hojeSlug ? `${it.dia} (hoje)` : it.dia,
      }, el('span', null, DIA_ABREV[s] || s.slice(0, 3)),
        s === hojeSlug ? el('span', { class: 'pdg-tab__hoje', 'aria-hidden': 'true' }, 'hoje') : null);
    });
    const barra = el('div', { class: 'pdg-tabs' }, tabs);
    const semana = el('div', { class: 'pdg-semana' }, artigos);

    const hojeItem = c.itens.find((it) => slug(it.dia) === hojeSlug);
    const kicker = hojeItem
      ? el('p', { class: 'pdg-kicker reveal' }, el('span', { class: 'pdg-kicker__cursiva' }, 'hoje,'), ' na cozinha da família:')
      : null;
    raiz.replaceChildren(...[
      kicker,
      hojeItem ? blocoHoje(hojeItem, formatarReais(c.preco_unico), serve) : blocoFimDeSemana(),
      el('h3', { class: 'sr-only' }, 'Prato do dia de segunda a sexta'),
      barra, semana,
    ].filter(Boolean));

    ligarAbasDoPratoDoDia(barra, tabs, artigos, hojeSlug);
  }

  // Mobile: os cinco dias viram abas (seg · ter · qua · qui · sex), abrindo no dia atual.
  // Desktop: todos os dias aparecem em sequência e os papéis ARIA de abas são removidos.
  function ligarAbasDoPratoDoDia(barra, tabs, paineis, hojeSlug) {
    let atual = Math.max(0, paineis.findIndex((p) => p.id === `dia-${hojeSlug}`));

    function selecionar(i, focar) {
      atual = i;
      paineis.forEach((p, k) => p.classList.toggle('is-ativo', k === i));
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      if (focar) tabs[i].focus();
      if (typeof ajustarCursivas === 'function') ajustarCursivas();
    }

    function aplicarModo() {
      if (mobileMQ.matches) {
        barra.setAttribute('role', 'tablist');
        barra.setAttribute('aria-label', 'Dia da semana');
        tabs.forEach((t, k) => {
          t.setAttribute('role', 'tab');
          t.setAttribute('aria-controls', paineis[k].id);
          paineis[k].setAttribute('role', 'tabpanel');
          paineis[k].setAttribute('aria-labelledby', t.id);
        });
        selecionar(atual, false);
      } else {
        barra.removeAttribute('role');
        barra.removeAttribute('aria-label');
        tabs.forEach((t, k) => {
          ['role', 'aria-controls', 'aria-selected'].forEach((a) => t.removeAttribute(a));
          t.tabIndex = -1;
          ['role', 'aria-labelledby'].forEach((a) => paineis[k].removeAttribute(a));
        });
      }
    }

    tabs.forEach((t, k) => t.addEventListener('click', () => selecionar(k, false)));
    barra.addEventListener('keydown', (ev) => {
      const passo = { ArrowRight: 1, ArrowLeft: -1 }[ev.key];
      let alvo = null;
      if (passo) alvo = (atual + passo + tabs.length) % tabs.length;
      else if (ev.key === 'Home') alvo = 0;
      else if (ev.key === 'End') alvo = tabs.length - 1;
      if (alvo != null) { ev.preventDefault(); selecionar(alvo, true); }
    });

    // Deslizar para o lado troca de dia
    let x0 = null, y0 = null;
    const area = paineis[0].parentElement;
    area.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
    area.addEventListener('touchend', (ev) => {
      if (x0 == null || !mobileMQ.matches) return;
      const dx = ev.changedTouches[0].clientX - x0;
      const dy = ev.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        const prox = atual + (dx < 0 ? 1 : -1);
        if (prox >= 0 && prox < tabs.length) selecionar(prox, false);
      }
    }, { passive: true });

    mobileMQ.addEventListener('change', aplicarModo);
    selecionar(atual, false);
    aplicarModo();
  }

  /* ---------- 5. Empanadas ---------- */
  function renderEmpanadas() {
    const c = cat(CAT_EMPANADAS);
    const ul = $('#empanadas-lista');
    if (!c || !ul) return;
    ul.style.setProperty('--linhas', Math.ceil(c.itens.length / 2));
    ul.replaceChildren(...c.itens.map((it) => el('li', { class: 'empanada reveal' },
      el('h3', { class: 'empanada__nome' }, it.nome),
      el('p', { class: 'empanada__desc' }, it.descricao),
      criarPedir(it.id))));
  }

  /* ---------- 6. Prato destaque ---------- */
  const textoPratoDoMes = () => (CONFIG.pratoDoMes || '').trim() || 'consulte o prato deste mês';

  function renderDestaque() {
    const c = cat(CAT_DESTAQUE);
    if (!c) return;
    const mes = c.itens[0];

    $('#prato-mes').replaceChildren(
      el('div', { class: 'prato-mes__texto' },
        el('p', { class: 'prato-mes__rot' }, minuscula(mes.nome)),
        el('h3', { class: 'prato-mes__nome' }, textoPratoDoMes()),
        el('p', { class: 'prato-mes__desc' }, mes.descricao),
        criarPedir(mes.id)),
      el('p', { class: 'preco-destaque' }, formatarReais(mes.preco)));
  }

  /* ---------- 7. Monte sua massa ---------- */
  const ICONES_MASSA = {
    spaghetti: ['massa-spaghetti.png', 92, 35],
    macarrao: ['massa-macarrao.png', 53, 36],
    talharim: ['massa-talharim.png', 50, 48],
    ravioli: ['massa-ravioli.png', 56, 49],
    tortei: ['massa-ravioli.png', 56, 49], // no impresso o tortéi usa o mesmo desenho do ravioli
  };

  function opcao({ tipo, grupo, id, valor, nome, obs, preco, icone }) {
    const marca = el('span', { class: 'opcao__marca' }, svgUso('i-check'));
    return el('label', { class: `opcao opcao--${tipo}`, for: id },
      el('input', { class: 'opcao__input', type: tipo, name: grupo, id, value: valor }),
      el('span', { class: 'opcao__caixa' },
        marca,
        icone ? el('span', { class: 'opcao__icone' }, el('img', { src: `assets/${icone[0]}`, width: icone[1], height: icone[2], alt: '', loading: 'lazy' })) : null,
        el('span', { class: 'opcao__texto' },
          el('span', { class: 'opcao__nome' }, nome),
          obs ? el('span', { class: 'opcao__obs' }, obs) : null),
        preco ? el('span', { class: 'opcao__preco' }, preco) : null));
  }

  function montador() {
    const c = cat(CAT_MONTE);
    if (!c) return;
    const massas = c.passo_1_massas;
    const molhos = c.passo_2_molhos;
    const adicionais = c.passo_3_adicionais;
    const estado = { massa: null, molho: null, adds: new Set() };

    $('#opcoes-massa').replaceChildren(...massas.map((m, i) => opcao({
      tipo: 'radio', grupo: 'massa', id: `massa-${i}`, valor: i, nome: m.nome, obs: m.obs,
      icone: ICONES_MASSA[slug(m.nome)],
    })));

    // Molhos em grupos por preço (R$ 35 · R$ 37), na ordem em que aparecem
    const grupos = [];
    molhos.forEach((m, i) => {
      let g = grupos.find((x) => x.preco === m.preco);
      if (!g) { g = { preco: m.preco, itens: [] }; grupos.push(g); }
      g.itens.push(opcao({ tipo: 'radio', grupo: 'molho', id: `molho-${i}`, valor: i, nome: m.nome }));
    });
    $('#opcoes-molho').replaceChildren(...grupos.map((g) => el('div', { class: 'opcoes-grupo' },
      el('p', { class: 'opcoes-grupo__preco' }, formatarReais(g.preco)),
      el('div', { class: 'opcoes' }, g.itens))));

    $('#opcoes-adicional').replaceChildren(...adicionais.map((a, i) => opcao({
      tipo: 'checkbox', grupo: 'adicional', id: `add-${i}`, valor: i, nome: a.nome, preco: '+ ' + formatarReais(a.preco),
    })));

    const $combo = $('#resumo-combo');
    const $total = $('#resumo-total');
    const $linhas = $('#resumo-linhas');
    const $aviso = $('#resumo-aviso');
    const $enviar = $('#btn-enviar');

    // "Molho alfredo" -> "ao molho alfredo" · "À caprese" -> "à caprese"
    const fraseMolho = (nome) => (/^molho /i.test(nome) ? 'ao ' : '') + minuscula(nome);

    function calcular() {
      const massa = estado.massa != null ? massas[estado.massa] : null;
      const molho = estado.molho != null ? molhos[estado.molho] : null;
      const adds = [...estado.adds].sort((a, b) => a - b).map((i) => adicionais[i]);
      const total = (molho ? molho.preco : 0) + adds.reduce((s, a) => s + a.preco, 0);
      return { massa, molho, adds, total, pronto: Boolean(massa && molho) };
    }

    function frase({ massa, molho, adds }) {
      const extras = adds.map((a) => ` + ${minuscula(a.nome)}`).join('');
      if (massa && molho) return `${massa.nome} ${fraseMolho(molho.nome)}${extras}`;
      if (massa) return `${massa.nome}${extras} · falta escolher o molho`;
      if (molho) return `${molho.nome}${extras} · falta escolher a massa`;
      return 'Escolha sua massa e seu molho para começar.';
    }

    function atualizar() {
      const r = calcular();
      $combo.textContent = frase(r);
      $total.textContent = r.molho ? formatarReais(r.total) : '—';
      $enviar.setAttribute('aria-disabled', String(!r.pronto));
      $aviso.hidden = true;

      const linhas = [];
      if (r.massa) linhas.push(['Massa', r.massa.nome, '']);
      if (r.molho) linhas.push(['Molho', r.molho.nome, formatarReais(r.molho.preco)]);
      r.adds.forEach((a) => linhas.push(['Adicional', a.nome, '+ ' + formatarReais(a.preco)]));
      $linhas.replaceChildren(...linhas.map(([, nome, preco]) => el('li', null,
        el('span', null, nome), el('span', { class: 'resumo__linha-preco' }, preco))));
    }

    function primeiroFaltante() {
      if (estado.massa == null) return $('#opcoes-massa input');
      if (estado.molho == null) return $('#opcoes-molho input');
      return null;
    }

    $('#monte-passos').addEventListener('change', (ev) => {
      const i = ev.target;
      if (!(i instanceof HTMLInputElement)) return;
      const v = Number(i.value);
      if (i.name === 'massa') estado.massa = v;
      else if (i.name === 'molho') estado.molho = v;
      else if (i.checked) estado.adds.add(v);
      else estado.adds.delete(v);
      atualizar();
    });

    function limparSelecao() {
      estado.massa = null; estado.molho = null; estado.adds.clear();
      $$('#monte-passos input').forEach((i) => { i.checked = false; });
      atualizar();
    }
    $('#btn-limpar').addEventListener('click', limparSelecao);

    // "Adicionar ao pedido": a massa montada entra no pedido geral (js/pedido.js) e o montador zera para o próximo prato
    $enviar.addEventListener('click', () => {
      const r = calcular();
      if (!r.pronto) {
        $aviso.textContent = 'Escolha a massa e o molho para continuar.';
        $aviso.hidden = false;
        const alvo = primeiroFaltante();
        if (alvo) { alvo.closest('.passo').scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'center' }); alvo.focus({ preventScroll: true }); }
        return;
      }
      if (window.RadiciPedido) {
        window.RadiciPedido.adicionarMonte({ massa: r.massa.id, molho: r.molho.id, adicionais: r.adds.map((a) => a.id) });
        limparSelecao();
      }
    });

    atualizar();
  }

  /* ---------- 8. Cardápio completo ---------- */
  const MENU = {
    'Antipasto': { id: 'antipasto', chip: 'Antipasto', titulo: ['Antipasto'] },
    [CAT_EMPANADAS]: { id: 'empanadas', chip: 'Empanadas', titulo: ['Da', 'Itália', 'à', 'Argentina'], duplo: true },
    [CAT_PRATO_DO_DIA]: { id: 'prato-dia', chip: 'Prato do dia', titulo: ['Prato do', 'dia'] },
    [CAT_MONTE]: { id: 'monte', chip: 'Monte sua massa', titulo: ['Monte sua', 'massa'] },
    [CAT_DESTAQUE]: { id: 'destaque', chip: 'Prato destaque', titulo: ['Prato', 'destaque'] },
    'Panquecas Radici': { id: 'panquecas', chip: 'Panquecas', titulo: ['Panquecas', 'radici'] },
    'Risotto speciale': { id: 'risotto', chip: 'Risotto', titulo: ['Risotto', 'speciale'] },
    [CAT_PER_DUE]: { id: 'piatto-due', chip: 'Piatto per due', titulo: ['Piatto per', 'due'] },
    'PF aconchego': { id: 'pf', chip: 'PF aconchego', titulo: ['PF', 'aconchego'] },
    'Prato kids': { id: 'kids', chip: 'Prato kids', titulo: ['Prato', 'kids'] },
    'Adicionais': { id: 'adicionais', chip: 'Adicionais', titulo: ['adicionais', 'se desejar'] },
    'Dolce': { id: 'dolce', chip: 'Dolce', titulo: ['Dolce'] },
    'Bevande': { id: 'bevande', chip: 'Bevande', titulo: ['Bevande'] },
  };
  const PREFIXO_CERVEJA = 'Cerveja lata - ';

  // Frase de abertura de cada categoria. Empanadas, Prato do dia, Monte sua massa e Prato destaque
  // já têm a sua na seção de destaque da página (index.html), então não se repetem aqui.
  const ABERTURAS = {
    'Antipasto': 'Para começar sem pressa.',
    'Panquecas Radici': 'Macias, generosas e com o recheio que você preferir.',
    'Risotto speciale': 'Cremoso, mexido com paciência, como deve ser.',
    [CAT_PER_DUE]: 'Para dividir, conversar e ficar mais um pouquinho.',
    'PF aconchego': 'Aquele prato de casa, que abraça.',
    'Prato kids': 'Para os pequenos da família.',
    'Dolce': 'Para terminar como em casa: com um doce feito à mão.',
    'Bevande': 'Para acompanhar cada momento.',
  };

  const abreviarPorcao = (r) => r.replace('Porção pequena', 'Porção peq.').replace('Porção grande', 'Porção grand.');

  function precoDoItem(it) {
    // dois tamanhos (polenta, batata): os preços saem das opções "substitui", a mesma fonte do pedido
    const tamanhos = (it.opcoes || []).find((g) => g.preco === 'substitui');
    if (tamanhos) {
      return el('span', { class: 'item__preco item__preco--duplo' },
        tamanhos.itens.map((o) => el('span', { class: 'preco-linha' },
          el('span', { class: 'item__unid', 'aria-label': o.nome }, abreviarPorcao(o.nome)), ' ', formatarReais(o.preco))));
    }
    if (it.preco === null || typeof it.preco === 'number') {
      return el('span', { class: 'item__preco' }, it.preco === null ? 'Consultar' : formatarReais(it.preco),
        it.unidade ? el('span', { class: 'item__unid' }, ` ${it.unidade}`) : null);
    }
    return null;
  }

  function itemDoMenu(it, o = {}) {
    let desc = it.descricao;
    let serve = null;
    if (o.extrairServe && desc) {
      const m = desc.match(/\s*(Serve \d+ pessoas?)\.?\s*$/i);
      if (m) { serve = m[1]; desc = desc.slice(0, m.index).trim(); }
    }
    const rotulo = o.rotulo || it.rotulo || it.dia;
    return el('li', { class: 'item' },
      rotulo ? el('span', { class: 'item__rotulo' }, minuscula(rotulo)) : null,
      el('div', { class: 'item__linha' },
        el('span', { class: 'item__nome' }, o.nome || it.nome),
        el('span', { class: 'item__leader', 'aria-hidden': 'true' }),
        precoDoItem(it)),
      serve ? el('p', { class: 'item__serve' }, serve) : null,
      desc ? el('p', { class: 'item__desc' }, desc) : null,
      it.obs ? el('p', { class: 'item__obs' }, o.acrescimo != null ? it.obs.replace('{acrescimo}', formatarReais(o.acrescimo)) : it.obs) : null,
      o.extra || null,
      o.pedir || (it.pedivel && it.id) ? criarPedir(o.pedir || it.id) : null);
  }

  function tituloDaCategoria(meta) {
    if (meta.duplo) {
      const [a, b, c, d] = meta.titulo;
      return el('h3', { class: 'titulo-assinatura titulo-assinatura--duplo' },
        el('span', { class: 'ta-linha' }, el('span', { class: 'ta-fonde' }, a), ' ', el('span', { class: 'ta-astina' }, b)),
        el('span', { class: 'ta-linha' }, el('span', { class: 'ta-fonde' }, c), ' ', el('span', { class: 'ta-astina' }, d), el('span', { class: 'ta-fonde ta-reticencias' }, '...')));
    }
    if (meta.titulo.length === 1) return el('h3', { class: 'titulo-simples' }, meta.titulo[0]);
    return el('h3', { class: 'titulo-assinatura' },
      el('span', { class: 'ta-fonde' }, meta.titulo[0]), ' ', el('span', { class: 'ta-astina' }, meta.titulo[1]));
  }

  function corpoDaCategoria(c, meta) {
    const itens = c.itens || [];
    switch (c.categoria) {
      case CAT_PRATO_DO_DIA: {
        const dias = el('ul', { class: 'itens' }, itens.map((it) => itemDoMenu({ nome: it.nome }, { rotulo: it.dia, pedir: it.id })));
        return [dias, el('a', { class: 'link-seta', href: '#prato-do-dia' }, 'Ver o que vai em cada prato', svgUso('i-seta', 'icone icone--seta'))];
      }
      case CAT_MONTE: {
        const grupos = [];
        c.passo_2_molhos.forEach((m) => {
          let g = grupos.find((x) => x.preco === m.preco);
          if (!g) { g = { preco: m.preco, nomes: [] }; grupos.push(g); }
          g.nomes.push(m.nome);
        });
        const lista = el('ul', { class: 'itens' }, grupos.map((g) => itemDoMenu({ nome: g.nomes.join(' · '), preco: g.preco }, {})));
        return [
          el('p', { class: 'cat__texto' }, 'Escolha sua massa fresca, escolha seu molho e, se desejar, escolha adicional.'),
          lista,
          el('a', { class: 'link-seta', href: '#monte-sua-massa' }, 'Montar minha massa', svgUso('i-seta', 'icone icone--seta'))];
      }
      case CAT_DESTAQUE:
        return el('ul', { class: 'itens' }, itens.map((it, i) => itemDoMenu(it, {
          extra: i === 0 ? el('p', { class: 'item__obs item__obs--mes' }, textoPratoDoMes()) : null,
        })));
      case 'Panquecas Radici': {
        const [pedido, serve] = c.descricao.split(/\.\s+/);
        return [
          el('p', { class: 'cat__astina' }, minuscula(pedido)),
          serve ? el('p', { class: 'item__serve' }, serve.replace(/\.$/, '')) : null,
          el('ul', { class: 'recheios' }, c.recheios.map((r, i) => [i ? ' ' : null, el('li', null, r)])),
          criarPedir(c.itens[0].id),
        ];
      }
      case CAT_PER_DUE:
        return el('ul', { class: 'itens' }, itens.map((it) => itemDoMenu(it, { extrairServe: true, acrescimo: acrescimoDe(c.opcoes) })));
      case 'Bevande': {
        const soltos = itens.filter((it) => !it.nome.startsWith(PREFIXO_CERVEJA));
        const cervejas = itens.filter((it) => it.nome.startsWith(PREFIXO_CERVEJA));
        return [
          el('ul', { class: 'itens' }, soltos.map((it) => itemDoMenu(it))),
          cervejas.length ? el('div', { class: 'subgrupo' },
            el('h4', { class: 'subgrupo__titulo' }, PREFIXO_CERVEJA.replace(' - ', '')),
            el('ul', { class: 'itens' }, cervejas.map((it) => itemDoMenu(it, { nome: it.nome.slice(PREFIXO_CERVEJA.length) })))) : null,
        ];
      }
      default:
        return el('ul', { class: 'itens' }, itens.map((it) => itemDoMenu(it)));
    }
  }

  // Seta de "voltar ao começo" (↺), no mesmo traço do resto dos ícones
  function iconeReiniciar() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'icone icone--seta');
    ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'].forEach((d) => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      s.append(p);
    });
    return s;
  }

  /* O cardápio vira abas: só UMA categoria visível por vez. O conteúdo todo continua no HTML
     (as abas inativas ficam com o atributo hidden). */
  function renderCardapio() {
    const lista = $('#cardapio-lista');
    const chips = $('#chips-lista');
    if (!lista || !chips) return;
    const metas = CARDAPIO.cardapio.map((c) => ({
      c, meta: MENU[c.categoria] || { id: slug(c.categoria), chip: c.categoria, titulo: [c.categoria] },
    }));
    const abas = [];
    chips.setAttribute('role', 'tablist');

    metas.forEach(({ c, meta }, i) => {
      const painelId = `cardapio-${meta.id}`;

      const cab = el('div', { class: 'cat__cab' }, tituloDaCategoria(meta));
      if (ABERTURAS[c.categoria]) cab.append(el('p', { class: 'abertura' }, ABERTURAS[c.categoria]));
      if (c.preco_unico) {
        cab.append(el('p', { class: 'cat__preco' }, formatarReais(c.preco_unico),
          c.categoria === CAT_EMPANADAS ? el('span', { class: 'cat__preco-rot' }, ' preço único') : null));
      }
      if (c.descricao && c.categoria !== 'Panquecas Radici') cab.append(el('p', { class: 'cat__desc' }, c.descricao));
      if (c.categoria === 'Panquecas Radici') {
        cab.append(criarFoto({ src: 'fotos/panquecas.jpg', alt: 'Panquecas Radici recheadas', nome: 'panquecas', lado: 'esq', ar: '4/3', classe: 'cat__foto' }));
      }

      const corpo = el('div', { class: 'cat__corpo' }, corpoDaCategoria(c, meta));
      if (c.obs) corpo.append(el('p', { class: 'cat__nota' }, c.obs));

      // no fim de cada categoria: link para a próxima (na última, volta para a primeira)
      const prox = metas[(i + 1) % metas.length].meta;
      const ultima = i === metas.length - 1;
      corpo.append(el('p', { class: 'cat__proxima' },
        el('a', { class: 'link-seta', href: `#cardapio-${prox.id}` },
          ultima ? `voltar para ${prox.chip}` : `próxima: ${prox.chip}`,
          ultima ? iconeReiniciar() : svgUso('i-seta', 'icone icone--seta'))));

      const painel = el('section', { class: 'cat', id: painelId, role: 'tabpanel', 'aria-labelledby': `aba-${meta.id}`, hidden: true },
        el('div', { class: 'cat__grade' }, cab, corpo));
      const aba = el('a', {
        href: `#${painelId}`, id: `aba-${meta.id}`, role: 'tab',
        'aria-controls': painelId, 'aria-selected': 'false', tabindex: '-1',
      }, meta.chip);
      chips.append(el('li', { role: 'presentation' }, aba));
      abas.push({ id: meta.id, aba, painel });
    });

    lista.replaceChildren(...abas.map((a) => a.painel));
    ligarAbasDoCardapio(abas);
  }

  function ligarAbasDoCardapio(abas) {
    const barra = $('#chips');
    const trilho = $('#chips-lista');
    const lista = $('#cardapio-lista');
    const n = abas.length;
    let atual = -1;
    let interagiu = false;

    // "#cardapio-dolce" (ou o antigo "#cat-dolce") -> índice da aba; qualquer outra coisa -> null
    function indiceDoHash(h) {
      const m = /^#(?:cardapio|cat)-(.+)$/.exec(h || '');
      if (!m) return null;
      let id = m[1];
      try { id = decodeURIComponent(id); } catch (e) { /* hash malformado: usa como veio */ }
      const i = abas.findIndex((a) => a.id === id);
      return i < 0 ? null : i;
    }

    // rolagem em que o conteúdo da aba fica logo abaixo da barra fixa de categorias
    function topoDoConteudo() {
      const header = $('.site-header__inner').offsetHeight;
      return Math.max(0, Math.round(lista.getBoundingClientRect().top + window.scrollY - header - barra.offsetHeight));
    }
    // volta ao topo do cardápio só se o cliente estiver rolado lá embaixo (ou se vier de um link de fora)
    function rolarParaOTopo(forcar, instantaneo) {
      const alvo = topoDoConteudo();
      if (forcar || window.scrollY > alvo + 8) {
        window.scrollTo({ top: alvo, behavior: (reduzMovimento || instantaneo) ? 'instant' : 'smooth' });
      }
    }
    // a aba escolhida desliza para o centro da barra (rolagem horizontal do celular)
    function centralizar(a) {
      const alvo = a.offsetLeft - (trilho.clientWidth - a.offsetWidth) / 2;
      trilho.scrollTo({ left: Math.max(0, alvo), behavior: reduzMovimento ? 'instant' : 'smooth' });
    }

    function selecionar(i, o = {}) {
      const { rolar = true, forcar = false, url = true, foco = false, animar = true, instantaneo = false } = o;
      const mudou = i !== atual;
      abas.forEach((a, k) => {
        const on = k === i;
        a.painel.hidden = !on;
        a.aba.setAttribute('aria-selected', String(on));
        a.aba.tabIndex = on ? 0 : -1;
      });
      atual = i;
      const { aba, painel } = abas[i];
      if (mudou) {
        centralizar(aba);
        if (animar) { // fade de 200ms (CSS; some com prefers-reduced-motion)
          painel.classList.remove('is-entrando');
          void painel.offsetWidth;
          painel.classList.add('is-entrando');
        }
        // cada aba tem o seu endereço: dá para mandar o link de uma categoria
        if (url) { try { history.replaceState(null, '', `#${painel.id}`); } catch (e) { /* sem histórico */ } }
        ajustarCursivas(); // os títulos em cursiva da aba recém-aberta ainda não tinham sido medidos
      }
      if (foco) aba.focus({ preventScroll: true });
      if (rolar) rolarParaOTopo(forcar, instantaneo);
    }

    lista.addEventListener('animationend', (ev) => ev.target.classList.remove('is-entrando'));

    // toque nas abas
    abas.forEach((a, i) => a.aba.addEventListener('click', (ev) => { ev.preventDefault(); selecionar(i); }));

    // teclado: setas, Home e End navegam entre as abas
    trilho.addEventListener('keydown', (ev) => {
      let alvo = null;
      if (ev.key === 'ArrowRight') alvo = (atual + 1) % n;
      else if (ev.key === 'ArrowLeft') alvo = (atual - 1 + n) % n;
      else if (ev.key === 'Home') alvo = 0;
      else if (ev.key === 'End') alvo = n - 1;
      if (alvo != null) { ev.preventDefault(); selecionar(alvo, { foco: true }); }
    });

    // links para uma aba: "próxima: Dolce", e qualquer #cardapio-<categoria> da página
    document.addEventListener('click', (ev) => {
      const link = ev.target.closest('a[href^="#"]');
      if (!link || link.getAttribute('role') === 'tab') return;
      const i = indiceDoHash(link.getAttribute('href'));
      if (i == null) return;
      ev.preventDefault();
      selecionar(i, { forcar: !link.closest('#cardapio') }); // de fora do cardápio: sempre leva até lá
    });
    window.addEventListener('hashchange', () => {
      const i = indiceDoHash(location.hash);
      if (i != null) selecionar(i, { url: false, forcar: true });
    });

    // celular: deslizar para os lados troca de categoria (só gesto claramente horizontal)
    let x0 = null, y0 = null;
    lista.addEventListener('touchstart', (ev) => {
      if (ev.touches.length !== 1) { x0 = null; return; }
      x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY;
    }, { passive: true });
    lista.addEventListener('touchcancel', () => { x0 = null; }, { passive: true });
    lista.addEventListener('touchend', (ev) => {
      if (x0 == null) return;
      const dx = ev.changedTouches[0].clientX - x0;
      const dy = ev.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) {
        const prox = atual + (dx < 0 ? 1 : -1);
        if (prox >= 0 && prox < n) selecionar(prox);
      }
    }, { passive: true });

    // abertura: Antipasto, ou a categoria do endereço (#cardapio-dolce)
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => window.addEventListener(t, () => { interagiu = true; }, { passive: true, once: true }));
    const inicial = indiceDoHash(location.hash);
    selecionar(inicial == null ? 0 : inicial, { rolar: false, url: false, animar: false });
    if (inicial != null) {
      // veio de um link direto para uma categoria: leva até ela e refaz o ajuste enquanto a página termina de
      // assentar (fontes, imagens, rolagem automática do navegador), parando assim que o cliente mexer
      const ajustar = () => { if (!interagiu) rolarParaOTopo(true, true); };
      requestAnimationFrame(ajustar);
      window.addEventListener('load', () => { ajustar(); setTimeout(ajustar, 300); setTimeout(ajustar, 1000); }, { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
    }
  }

  /* ---------- 9. Header, menu mobile, animações ---------- */
  function iniciarHeader() {
    const header = $('.site-header');
    const alternar = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', alternar, { passive: true });
    alternar();

    const botao = $('.menu-toggle');
    const nav = $('#site-nav');
    const desktopMQ = window.matchMedia('(min-width: 72rem)');

    function abrir(aberto, devolverFoco) {
      nav.classList.toggle('is-open', aberto);
      document.body.classList.toggle('menu-aberto', aberto);
      botao.setAttribute('aria-expanded', String(aberto));
      botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
      if (aberto) $('a', nav).focus();
      else if (devolverFoco) botao.focus();
    }

    botao.addEventListener('click', () => abrir(botao.getAttribute('aria-expanded') !== 'true', false));
    nav.addEventListener('click', (ev) => { if (ev.target.closest('a')) abrir(false, false); });
    desktopMQ.addEventListener('change', () => { if (desktopMQ.matches) abrir(false, false); });

    document.addEventListener('keydown', (ev) => {
      if (botao.getAttribute('aria-expanded') !== 'true') return;
      if (ev.key === 'Escape') { abrir(false, true); return; }
      if (ev.key !== 'Tab') return;
      // mantém o foco dentro do painel enquanto ele estiver aberto
      const foco = [$('.marca'), ...$$('a, button', nav), botao].filter((e) => e.offsetParent !== null || e === botao);
      const primeiro = foco[0];
      const ultimo = foco[foco.length - 1];
      if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
    });
  }

  function iniciarReveal() {
    const itens = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduzMovimento) {
      itens.forEach((e) => e.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    itens.forEach((e) => io.observe(e));
  }

  /* Cursivas nunca vazam da coluna: se uma palavra em Astina não couber (celular estreito,
     fonte ainda carregando, palavra longa), o tamanho encolhe só o necessário. */
  const CURSIVAS = '.ta-astina, .nome-significado__trad, .pdg-dia__dia, .sexta__somente, ' +
    '.prato-mes__rot, .passo__sub, .item__rotulo, .subgrupo__titulo, .bilhete__titulo, .cat__astina, .resumo__titulo, ' +
    '.carta__cursiva, .assinatura__texto, .rodape__obrigado';

  /* ---------- 9b. Alma: padrão vivo e título da aba ----------
     REGRA: só o "Bem-vindo!" do hero é animado (escrita à mão, em CSS). As demais cursivas ficam estáticas. */

  // As faixas do padrão rolam a 90% da velocidade da página (parallax lento)
  function iniciarParallax() {
    if (reduzMovimento) return;
    const faixas = $$('.faixa-padrao');
    let agendado = false;
    function atualizar() {
      agendado = false;
      const vh = window.innerHeight;
      faixas.forEach((f) => {
        const r = f.getBoundingClientRect();
        if (r.bottom < -60 || r.top > vh + 60) return;
        f.style.setProperty('--par', (-(r.top + r.height / 2 - vh / 2) * 0.1).toFixed(1) + 'px');
      });
    }
    const pedir = () => { if (!agendado) { agendado = true; requestAnimationFrame(atualizar); } };
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    atualizar();
  }

  // A aba chama a pessoa de volta
  function iniciarTituloDaAba() {
    const original = document.title;
    document.addEventListener('visibilitychange', () => {
      document.title = document.hidden ? 'Volte logo · Radici d\'Amore' : original;
    });
  }

  function ajustarCursivas() {
    const alvos = $$(CURSIVAS);
    const duplos = $$('.titulo-assinatura--duplo');
    alvos.forEach((a) => { a.style.fontSize = ''; });
    duplos.forEach((t) => t.style.removeProperty('--ta-tam'));

    for (let passo = 0; passo < 2; passo++) {
      alvos.forEach((a) => {
        if (!a.clientWidth) return; // escondido (aba de outro dia, menu fechado...)
        if (a.scrollWidth > a.clientWidth + 1) {
          const atual = parseFloat(getComputedStyle(a).fontSize);
          a.style.fontSize = (atual * (a.clientWidth / a.scrollWidth) * 0.97).toFixed(2) + 'px';
        }
      });
      duplos.forEach((t) => {
        let fator = 1;
        $$('.ta-linha', t).forEach((l) => {
          if (l.clientWidth && l.scrollWidth > l.clientWidth + 1) fator = Math.min(fator, l.clientWidth / l.scrollWidth);
        });
        if (fator < 1) {
          const base = parseFloat(getComputedStyle(t).fontSize);
          t.style.setProperty('--ta-tam', (base * fator * 0.97).toFixed(2) + 'px');
        }
      });
    }
  }

  /* ---------- 10. Inicialização ---------- */
  function iniciar() {
    aplicarConfig();
    renderPratoDoDia();
    renderEmpanadas();
    renderDestaque();
    montador();
    renderCardapio();
    $$('figure[data-foto]').forEach(iniciarFoto);
    iniciarHeader();
    iniciarReveal();
    iniciarParallax();
    iniciarTituloDaAba();

    ajustarCursivas();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarCursivas);
    let tRedim;
    window.addEventListener('resize', () => { clearTimeout(tRedim); tRedim = setTimeout(ajustarCursivas, 120); });

    // js/pedido.js preenche os ganchos [data-pedir] com os botões de pedir
    document.dispatchEvent(new CustomEvent('radici:render'));

    // Se a aba ficou aberta de um dia para o outro, o destaque do dia acompanha
    let ultimoDia = diaDaSemana();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const agora = diaDaSemana();
      if (agora !== ultimoDia) { ultimoDia = agora; renderPratoDoDia(); iniciarReveal(); document.dispatchEvent(new CustomEvent('radici:render')); }
    });
  }

  iniciar();
})();
