/**
 * A aba Investigar e a aba Desempenho nos três motores 3D (proposta aprovada em 20/11/2026,
 * `docs/estudio-evolucao/paineis-proposta.md`): Pausar, Avançar 1 quadro, o quadro do jogo e,
 * na medida, quantos objetos a cena tem e quantas vezes a placa de vídeo desenhou no quadro.
 *
 * Os tetos dos 3D não têm folga para isso (o Jogo 3D sem cenário mediu 207.640 de 207.700), e
 * nenhum teto sobe. Então o código entra só numa VARIANTE do motor, `investigar`, que a prévia
 * pede com uma das abas ligada (`preview/devtoolsBridge.ts`, baixado sob demanda). No motor de
 * sempre os dois marcadores viram nada: o texto é byte a byte o de antes
 * (`__tests__/three3dInvestigation.test.ts` confere as impressões digitais).
 *
 * A pausa é a que cada motor já tem. O Jogo 3D e o Mundo 3D têm a `_paused`, que as regras de
 * jogo também usam (tela de início, fim de jogo); a aba só continua o que ELA pausou
 * (`_szPausei`), senão Continuar tiraria a tela de fim de jogo. O 3D Avançado tem o estado
 * "pausado" (a tecla de pausa do próprio jogo), e lá a aba usa o estado, como no 2D Avançado.
 *
 * O registro dos inspetores (`window.__SZSTUDIO_RUNTIME_INSPECTORS`) só existe com
 * `runtimeInspection`; sem ele a variante não registra nada.
 */

/** A parte da variante que liga a investigação (junta às outras por `+`). */
export const THREE_INVESTIGATION_VARIANT = 'investigar'

/**
 * As declarações e o registro do inspetor (onde a pausa do motor está ao alcance). Cada marcador
 * ocupa uma linha só, com o recuo do código em volta; a troca leva a linha inteira.
 */
export const THREE_INVESTIGATION_DECLARE_MARKER = '/*__SZ_3D_INVESTIGAR__*/'
/** O começo de cada quadro do laço (antes de o jogo andar). */
export const THREE_INVESTIGATION_FRAME_MARKER = '/*__SZ_3D_INVESTIGAR_QUADRO__*/'

/** A linha inteira do marcador: o recuo, o marcador e a quebra de linha. */
function markerLine(marker: string, flags = ''): RegExp {
  const escaped = marker.replace(/[/*]/g, (char) => `\\${char}`)
  return new RegExp(`^[ \\t]*${escaped}\\n`, `m${flags}`)
}

/** Como cada motor se encaixa: trechos de JavaScript do próprio runtime. */
export interface ThreeInvestigationEngine {
  /** O nome no registro dos inspetores (a ponte procura por ele). */
  inspector: string
  /** Expressão: o jogo está pausado de um jeito que a aba sabe continuar. */
  paused: string
  /** Expressão: a partida está rolando (dá para pausar agora). */
  playing: string
  /** Comandos que pausam e continuam pela pausa do motor. */
  pause: string
  resume: string
  /** Comando no começo do quadro, antes da conta (opcional). */
  frameStart?: string
  /** Expressão: este laço é o da partida (o Jogo 3D tem um laço por cena). */
  frameGuard: string
  /** Expressão: neste quadro o jogo anda (é o quadro que a criança vê contado). */
  plays: string
  /** Expressão do renderer DENTRO do quadro. */
  frameRenderer: string
  /** Expressões do renderer e da cena FORA do quadro (na leitura). */
  renderer: string
  scene: string
}

function declarations(engine: ThreeInvestigationEngine): string {
  return `  var _szJogados = 0, _szAlvo = 0, _szPausei = false;
  function _szParado() { return ${engine.paused}; }
  function _szJogando() { return ${engine.playing}; }
  function _szPausar() { ${engine.pause} }
  function _szSeguir() { ${engine.resume} }
  (function () {
    var registro = window.__SZSTUDIO_RUNTIME_INSPECTORS;
    if (!registro || typeof registro !== 'object') return;
    var acoes = {
      pause: function () { _szAlvo = 0; if (_szJogando()) _szPausar(); },
      resume: function () { _szAlvo = 0; if (_szParado()) _szSeguir(); },
      step: function () {
        if (!_szParado()) return;
        _szAlvo = _szJogados + 1;
        _szSeguir();
      }
    };
    registro['${engine.inspector}'] = function () {
      var objetos = null, desenhos = null;
      try {
        var cena = ${engine.scene}, placa = ${engine.renderer};
        if (cena && typeof cena.traverseVisible === 'function') {
          objetos = 0;
          cena.traverseVisible(function (o) { if (o.isMesh || o.isSprite || o.isPoints || o.isLine) objetos++; });
        }
        if (placa && placa.info && placa.info.render) desenhos = placa.info.render.calls;
      } catch (e) {}
      return { frame: _szJogados, paused: _szParado(), canPause: _szJogando() || _szParado(), drawn: null,
        objects: objetos, draws: desenhos, pause: acoes.pause, resume: acoes.resume, step: acoes.step };
    };
  })();
`
}

function frame(engine: ThreeInvestigationEngine): string {
  return `  if (${engine.frameGuard}) {
    ${engine.frameStart ?? ''}
    if (_szAlvo && _szJogados >= _szAlvo) { _szAlvo = 0; if (_szJogando()) _szPausar(); }
    if (${engine.plays}) _szJogados++;
    var _szPlaca = ${engine.frameRenderer};
    if (_szPlaca && _szPlaca.info) { _szPlaca.info.autoReset = false; _szPlaca.info.reset(); }
  }
`
}

/**
 * Troca os dois marcadores do runtime: pelo código da investigação, com o motor, ou por nada
 * (o motor de sempre). Funções como substituto: um `$&` no trecho seria lido como padrão.
 */
export function withThreeInvestigation(
  source: string,
  engine: ThreeInvestigationEngine | null,
): string {
  for (const marker of [THREE_INVESTIGATION_DECLARE_MARKER, THREE_INVESTIGATION_FRAME_MARKER]) {
    if ((source.match(markerLine(marker, 'g')) ?? []).length !== 1)
      throw new Error(`o runtime 3D precisa de UM marcador da investigação: ${marker}`)
  }
  return source
    .replace(markerLine(THREE_INVESTIGATION_DECLARE_MARKER), () =>
      engine ? declarations(engine) : '',
    )
    .replace(markerLine(THREE_INVESTIGATION_FRAME_MARKER), () => (engine ? frame(engine) : ''))
}

/** Os motores com `_paused` (o Jogo 3D e o Mundo 3D): a aba só continua o que ela pausou. */
export const PAUSED_FLAG_ENGINE = {
  paused: '_szPausei && _paused',
  playing: '!_paused',
  pause: '_paused = true; _szPausei = true;',
  resume: '_szPausei = false; _paused = false;',
  // As regras continuaram o jogo (Recomeçar): o que a aba pausou não vale mais.
  frameStart: 'if (!_paused) _szPausei = false;',
} as const
