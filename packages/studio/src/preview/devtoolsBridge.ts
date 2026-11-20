/**
 * A ponte das abas Investigar e Desempenho (proposta aprovada em 20/11/2026,
 * `docs/estudio-evolucao/paineis-proposta.md`). Só entra no documento da prévia quando a
 * criança liga a medida: a prévia a põe como mais um script confiável, depois dos motores, com
 * `runtimeInspection` ligado. O documento de sempre não ganha um byte (o do Reino Zero está a
 * ~57 bytes do teto de 790 000).
 *
 * Desempenho: um relógio de `requestAnimationFrame` dentro do jogo conta os quadros que o
 * navegador conseguiu desenhar e o maior intervalo entre dois deles, em fatias de meio segundo.
 * Quando o jogo segura o processo (um quadro caro, um laço comprido), os quadros rareiam e o
 * intervalo cresce: é o "o jogo ficou lento" que a criança vê. Os motores que contam o que
 * desenharam (o Jogo 2D, pelo inspetor `game-2d:observation`) mandam junto quantos sprites
 * entraram no último quadro; os outros mandam `null` (a aba diz "indisponível").
 *
 * String pura (vai dentro de um `<script>`): sem imports, sem crase crua. O `postMessage` leva
 * SEMPRE a origem do pai (nunca `'*'`); o editor ainda confere `ev.source`.
 */

import { perfWindowFor } from '../state/devtools'
import {
  DEVTOOLS_PERF_MESSAGE,
  DEVTOOLS_PERF_SLICE_MS,
  isDevtoolsPerfMessage,
} from './devtoolsMessage'

export {
  DEVTOOLS_PERF_MESSAGE,
  DEVTOOLS_PERF_SLICE_MS,
  type DevtoolsPerfMessage,
  isDevtoolsPerfMessage,
} from './devtoolsMessage'

/** Cada documento montado ganha um número maior que o anterior (ver `doc` na mensagem). */
let lastDocument = 0

export function buildDevtoolsBridgeRuntime(parentOrigin?: string): string {
  const origin = JSON.stringify(parentOrigin ?? '*')
  const doc = ++lastDocument
  return `(function () {
  var host = window.parent;
  if (!host || host === window || typeof window.requestAnimationFrame !== 'function') return;
  var origin = ${origin};
  var raf = window.requestAnimationFrame.bind(window);
  var send = host.postMessage.bind(host);
  var inspectors = window.__SZSTUDIO_RUNTIME_INSPECTORS;
  var observe = inspectors && typeof inspectors['game-2d:observation'] === 'function'
    ? inspectors['game-2d:observation'] : null;
  function sprites() {
    if (!observe) {
      observe = inspectors && typeof inspectors['game-2d:observation'] === 'function'
        ? inspectors['game-2d:observation'] : null;
      if (!observe) return null;
    }
    try {
      var drawn = observe().lifecycle().drawn;
      return typeof drawn === 'number' && drawn >= 0 && drawn % 1 === 0 ? drawn : null;
    } catch (error) { return null; }
  }
  var started = false, start = 0, last = 0, frames = 0, sum = 0, slowest = 0;
  function frame(now) {
    if (started) {
      var gap = now - last;
      frames++;
      sum += gap;
      if (gap > slowest) slowest = gap;
    } else {
      started = true;
      start = now;
    }
    last = now;
    if (now - start >= ${DEVTOOLS_PERF_SLICE_MS} && frames > 0) {
      try {
        send({ type: '${DEVTOOLS_PERF_MESSAGE}', ms: now - start, frames: frames,
          frameMsAvg: sum / frames, frameMsMax: slowest, sprites: sprites(),
          canvas: !!document.querySelector('canvas'), doc: ${doc} }, origin);
      } catch (error) {}
      start = now; frames = 0; sum = 0; slowest = 0;
    }
    raf(frame);
  }
  raf(frame);
})();`
}

/**
 * Escuta as fatias da medida, só do iframe da prévia (a referência da janela, que um jogo em
 * sandbox sem `allow-same-origin` não consegue forjar), e guarda na janela da instância.
 * Devolve quem desliga.
 */
export function listenToDevtoolsPerf(
  source: () => Window | null | undefined,
  instance: object,
): () => void {
  let current = 0
  const onMessage = (event: MessageEvent) => {
    const frame = source()
    if (!frame || event.source !== frame || !isDevtoolsPerfMessage(event.data)) return
    if (event.data.doc < current) return
    const perf = perfWindowFor(instance).getState()
    if (event.data.doc > current) {
      current = event.data.doc
      perf.clear()
    }
    perf.push({
      fps: (event.data.frames * 1000) / event.data.ms,
      frameMsAvg: event.data.frameMsAvg,
      frameMsMax: event.data.frameMsMax,
      sprites: event.data.sprites,
      canvas: event.data.canvas,
    })
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}

export { forgetPerfWindow, perfWindowFor } from '../state/devtools'
