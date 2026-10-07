/* ============================================================
   RADICI D'AMORE · horarios.js
   Estamos abertos agora? (sempre no fuso America/Sao_Paulo)

   Lê CONFIG.horarios (js/cardapio-data.js) e responde:
   - o selo de status ("aberto agora · até 15h"), no rodapé e no topo da sacola;
   - se o pedido pode ser enviado pelo WhatsApp neste momento;
   - se é horário de almoço (para o aviso "servido no almoço").
   Também desenha o bloco de horários do rodapé a partir do mesmo CONFIG.
   Usado por js/pedido.js. Sem este arquivo, o site funciona sem selo e sem bloqueio.

   Para testar sem esperar o relógio:  ?dia=terca&hora=12:00   (o mesmo ?dia= que já troca o prato do dia)
   ============================================================ */
(function () {
  'use strict';

  if (typeof CONFIG === 'undefined' || !CONFIG.horarios) return;
  const HR = CONFIG.horarios;

  /* ---------- 1. Horários do CONFIG, em minutos desde a meia-noite ---------- */
  const minutos = (txt) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(txt || '').trim());
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  const faixa = (f) => Object.assign({}, f, { de: minutos(f && f.abre), ate: minutos(f && f.fecha) });
  const F = { semana: faixa(HR.semana), sabado: faixa(HR.sabado), almoco: faixa(HR.almoco) };
  if (Object.values(F).some((f) => isNaN(f.de) || isNaN(f.ate))) {
    console.warn('CONFIG.horarios: use o formato "H:MM" (ex.: "8:30").');
    return;
  }

  // 8:00 -> "8h" · 8:30 -> "8h30" · 14:00 -> "14h"
  const hh = (min) => {
    const m = min % 60;
    return Math.floor(min / 60) + 'h' + (m ? String(m).padStart(2, '0') : '');
  };

  /* ---------- 2. Que dia e hora são em São Paulo ---------- */
  const NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const NUM_DIA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  const DIA_CURTO = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const relogioSP = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  });

  function agora() {
    const p = {};
    relogioSP.formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
    let dia = DIA_CURTO[p.weekday];
    let min = (Number(p.hour) % 24) * 60 + Number(p.minute);

    const busca = new URLSearchParams(location.search);   // só para testar: ?dia=terca&hora=12:00
    const d = NUM_DIA[slug(busca.get('dia') || '')];
    if (typeof d === 'number') dia = d;
    const h = /^(\d{1,2})(?:[:h](\d{2})?)$/.exec((busca.get('hora') || '').trim());
    if (h && Number(h[1]) < 24 && Number(h[2] || 0) < 60) min = Number(h[1]) * 60 + Number(h[2] || 0);
    return { dia, min };
  }

  /* ---------- 3. Estado de agora ---------- */
  // Próxima abertura. Sábado só conta quando é hoje (os sábados são alternados: não dá para prever o próximo).
  function proximaAbertura(dia, min) {
    if (dia >= 1 && dia <= 5 && min < F.semana.de) return 'hoje às ' + hh(F.semana.de);
    if (dia === 6 && min < F.sabado.de) return 'hoje às ' + hh(F.sabado.de);
    for (let i = 1; i <= 7; i++) {
      const d = (dia + i) % 7;
      if (d >= 1 && d <= 5) return NOME_DIA[d] + ' às ' + hh(F.semana.de);
    }
    return '';
  }

  function estado() {
    const { dia, min } = agora();
    const util = dia >= 1 && dia <= 5;
    const sabado = dia === 6;
    const f = util ? F.semana : (sabado ? F.sabado : null);
    const aberto = Boolean(f) && min >= f.de && min < f.ate;
    const almoco = min >= F.almoco.de && min < F.almoco.ate;
    const proxima = aberto ? '' : proximaAbertura(dia, min);

    let corpo;
    if (sabado && (aberto || min < F.sabado.de)) {
      corpo = [`hoje é sábado: abrimos em sábados alternados, das ${hh(F.sabado.de)} às ${hh(F.sabado.ate)}. Confira no `, { link: 'nosso Instagram' }, '.'];
    } else if (aberto) {
      corpo = [`aberto agora · ${almoco ? 'almoço até ' + hh(F.almoco.ate) : 'até ' + hh(F.semana.ate)}`];
    } else {
      corpo = [`fechado agora · abrimos ${proxima}`];
    }
    const tom = aberto ? 'aberto' : 'fechado';

    return {
      dia, min, aberto, almoco, sabado, tom, corpo, proxima,
      avisoFechado: aberto ? '' : `Estamos fechados agora. Abrimos ${proxima}. Seu pedido fica salvo aqui até lá.`,
      avisoAlmoco: `servido no almoço, das ${hh(F.almoco.de)} às ${hh(F.almoco.ate)}`,
      antesDoAlmoco: min < F.almoco.de,
      inicioDoAlmoco: hh(F.almoco.de),
      chave: [tom, corpo.map((x) => x.link || x).join(''), almoco].join('|'),
    };
  }

  /* ---------- 4. Selo de status ---------- */
  function h(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (v != null) e.setAttribute(k, v); });
    filhos.forEach((f) => { if (f != null) e.append(f.nodeType ? f : document.createTextNode(f)); });
    return e;
  }

  function pintar(selo, e) {
    selo.className = `selo-horario selo-horario--${e.tom}`;
    selo.replaceChildren(
      h('span', { class: 'selo-horario__ponto', 'aria-hidden': 'true' }),
      h('span', null, ...e.corpo.map((x) => (typeof x === 'string' ? x
        : h('a', { href: CONFIG.instagramUrl, target: '_blank', rel: 'noopener' }, x.link)))));
  }

  // Confere o relógio de tempos em tempos e avisa quem precisa redesenhar (abriu, fechou, começou o almoço...)
  const ouvintes = [];
  let ultima = estado().chave;
  function conferir() {
    const e = estado();
    if (e.chave === ultima) return;
    ultima = e.chave;
    ouvintes.forEach((f) => f(e));
  }
  setInterval(conferir, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') conferir(); });
  window.addEventListener('pageshow', conferir);

  function ligarSelo(selo) {
    pintar(selo, estado());
    ouvintes.push((e) => pintar(selo, e));
    return selo;
  }
  const criarSelo = () => ligarSelo(h('p', { class: 'selo-horario' }));

  /* ---------- 5. Bloco de horários do rodapé ---------- */
  function desenharBloco(bloco) {
    const lista = bloco.querySelector('.horarios__lista');
    const aviso = bloco.querySelector('.horarios__aviso');
    if (lista) {
      lista.replaceChildren(...[F.semana, F.sabado, F.almoco].map((f) => h('div', { class: 'horarios__bloco' },
        h('dt', { class: 'horarios__dia' }, f.rotulo),
        h('dd', { class: 'horarios__hora' }, `${f.abre} - ${f.fecha}`))));
    }
    if (aviso && HR.aviso) aviso.textContent = HR.aviso;
    bloco.querySelectorAll('[data-selo-horario]').forEach(ligarSelo);
  }
  document.querySelectorAll('[data-horarios]').forEach(desenharBloco);

  window.RadiciHorarios = {
    estado,                                   // { aberto, almoco, sabado, corpo, avisoFechado, ... } de AGORA
    selo: criarSelo,                          // <p> com o selo, que se atualiza sozinho
    aoMudar: (f) => { ouvintes.push(f); },    // chamado quando abre, fecha ou começa/termina o almoço
    atualizar: conferir,                      // confere o relógio já (ao abrir a sacola e ao enviar) e redesenha o que mudou
  };
})();
