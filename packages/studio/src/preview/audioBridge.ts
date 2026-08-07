/**
 * Runtime de SOM compartilhado pelo preview e pelo site exportado. Dá ao programa
 * do aluno uma forma simples de tocar os arquivos de áudio que ele enviou, sem
 * montar `new Audio()` na mão, usada pelos blocos da categoria 🔊 Som do NÚCLEO
 * (projetos web/Canvas, sem extensão de jogo instalada):
 *
 *   - `window.__szAudio.carregar("moeda", "moeda.mp3")` → prepara e dá um apelido.
 *   - `window.__szAudio.tocar("moeda")` → toca uma vez.
 *   - `window.__szAudio.tocarSemParar("musica")` → em loop (UMA trilha por vez).
 *   - `window.__szAudio.parar("moeda")` / `.pararMusica()` / `.volume(0..10)`.
 *
 * ⚠️ Existe porque o núcleo não tinha ÁUDIO NENHUM: nem bipe, nem arquivo. A
 * criança podia enviar um mp3 no painel "Imagens e sons" e não havia bloco para
 * usá-lo fora das extensões de jogo. O manifesto `window.__SZGAME_SOUNDS` já era
 * semeado em TODO projeto que tenha um asset de áudio (ver `preview/bootstrap`),
 * então só faltava este lado do fio.
 *
 * Auto-contido (entra como STRING num `<script>`): sem imports nem refs externas.
 * Irmão do `preview/inputBridge` — mesma mecânica, mesma paridade preview↔export.
 */
export function buildAudioRuntime(): string {
  return `(function () {
  // O bridge de assets semeia isto quando o projeto tem algum arquivo de áudio.
  // Sem áudio nenhum o mapa não existe, daí o fallback.
  function manifesto() {
    var m = window.__SZGAME_SOUNDS;
    return (m && typeof m === 'object') ? m : {};
  }
  var carregados = Object.create(null);
  var fontes = Object.create(null);
  var volume = 0.8;
  var trilha = '';
  // ⚠️ O navegador RECUSA play() antes de um gesto do usuário, e a recusa é
  // SILENCIOSA (promise rejeitada). Sem esta fila, tocar um som no começo do
  // programa simplesmente não acontecia e nada aparecia no console. Aqui o
  // pedido espera o primeiro clique/tecla e então toca.
  var gesto = false;
  var esperando = Object.create(null);
  function soltar() {
    if (gesto) return;
    gesto = true;
    for (var nome in esperando) {
      if (Object.prototype.hasOwnProperty.call(esperando, nome)) {
        var comecar = esperando[nome];
        delete esperando[nome];
        try { comecar(); } catch (e) {}
      }
    }
  }
  window.addEventListener('pointerdown', soltar);
  window.addEventListener('keydown', soltar);
  window.addEventListener('touchstart', soltar);

  function chave(nome) { return typeof nome === 'string' ? nome.trim() : ''; }
  // ⚠️ Dedupado por CHAVE, como o warnOnce das extensões: um nome errado dentro
  // do laço de animação chamaria isto 60×/s e afogaria o console — e o aviso
  // vira ruído justamente quando a criança mais precisa lê-lo.
  var jaAvisado = Object.create(null);
  function avisar(chaveDoAviso, msg) {
    if (jaAvisado[chaveDoAviso]) return;
    jaAvisado[chaveDoAviso] = true;
    if (window.console && console.warn) console.warn('[som] ' + msg);
  }
  function carregar(nome, arquivo) {
    var apelido = chave(nome) || chave(arquivo);
    if (!apelido) { avisar('sem-apelido', 'carregar precisa de um apelido.'); return; }
    var quer = chave(arquivo) || apelido;
    var sons = manifesto();
    var src = sons[quer] || (quer.indexOf('data:audio/') === 0 ? quer : null);
    if (!src) {
      avisar('ausente:' + quer, 'o som "' + quer + '" não está no projeto. Envie o arquivo em "Imagens e sons".');
      return;
    }
    if (carregados[apelido] && fontes[apelido] === src) return;
    if (carregados[apelido]) { try { carregados[apelido].pause(); } catch (e) {} }
    try {
      var el = new Audio();
      el.preload = 'auto';
      el.volume = volume;
      el.onerror = function () { avisar('falhou:' + apelido, 'o som "' + apelido + '" não pôde ser carregado.'); };
      el.src = src;
      carregados[apelido] = el;
      fontes[apelido] = src;
    } catch (e) {}
  }
  function comecar(apelido, loop) {
    var el = carregados[apelido];
    if (!el) return;
    try {
      el.loop = !!loop;
      el.volume = volume;
      el.currentTime = 0;
      var tocando = el.play();
      if (tocando && tocando.catch) {
        tocando.catch(function () {
          if (!gesto) esperando[apelido] = function () { comecar(apelido, loop); };
        });
      }
    } catch (e) {}
  }
  function pedir(apelido, loop) {
    if (!apelido) return;
    if (!carregados[apelido]) {
      // Atalho gentil: quem não carregou antes provavelmente quis usar o nome do
      // arquivo direto. Tenta resolver, e só reclama se nem assim existir.
      carregar(apelido, apelido);
      if (!carregados[apelido]) return;
    }
    if (!gesto) { esperando[apelido] = function () { comecar(apelido, loop); }; return; }
    comecar(apelido, loop);
  }
  function parar(nome) {
    var apelido = chave(nome);
    if (apelido === trilha) trilha = '';
    delete esperando[apelido];
    var el = carregados[apelido];
    if (!el) return;
    try { el.pause(); el.currentTime = 0; el.loop = false; } catch (e) {}
  }
  window.__szAudio = {
    carregar: carregar,
    tocar: function (nome) { pedir(chave(nome), false); },
    tocarSemParar: function (nome) {
      var apelido = chave(nome);
      if (!apelido) return;
      // UMA trilha por vez: começar outra troca a que estava tocando.
      if (trilha && trilha !== apelido) parar(trilha);
      var atual = carregados[apelido];
      if (trilha === apelido && atual && !atual.paused) return;
      trilha = apelido;
      pedir(apelido, true);
    },
    parar: parar,
    pararMusica: function () { if (trilha) parar(trilha); },
    volume: function (nivel) {
      var n = Number(nivel);
      if (!isFinite(n)) n = 8;
      // A criança pensa de 0 a 10; o navegador quer 0 a 1.
      volume = Math.max(0, Math.min(10, n)) / 10;
      for (var apelido in carregados) {
        if (Object.prototype.hasOwnProperty.call(carregados, apelido)) {
          try { carregados[apelido].volume = volume; } catch (e) {}
        }
      }
    }
  };
})();`
}
