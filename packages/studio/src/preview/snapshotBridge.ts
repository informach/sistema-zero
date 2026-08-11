/**
 * Bridge de FOTO do preview: deixa o editor pegar uma miniatura do jogo que já
 * está rodando na tela, em vez de abrir um iframe novo e rodar tudo de novo.
 *
 * Por que existe: até 08/2026 a capa do card era tirada AO SAIR do editor, num
 * iframe próprio. Isso depende de o navegador continuar entregando quadros
 * justamente no momento em que a criança está saindo — e ele não entrega. O
 * relato foi "não é toda vez que tira o print, e quando saiu foi só a cor de
 * fundo, sem o texto do placar". Aqui o jogo já está desenhando na tela, na aba
 * ativa, então a foto sai do que a criança realmente vê.
 *
 * ⚠️ O iframe do preview é sandbox SEM `allow-same-origin`: o editor NÃO
 * consegue ler o canvas de lá. Por isso a foto é tirada DENTRO do iframe e volta
 * por `postMessage` (com `targetOrigin`, nunca `'*'`).
 *
 * Custo: o bridge fica inerte até o editor PEDIR, e devolve a imagem já reduzida
 * ao tamanho do card (~5 KB, contra ~1 MB de um print em tamanho cheio).
 *
 * ⭐⭐ **A foto sai em DUAS fases, e é isso que a torna barata.** Medido em Chrome
 * real (palco 800×480 com 40 sprites e texto, 150 amostras): a foto inteira custa
 * 1,7 ms na mediana, mas o `toDataURL` sozinho chegou a **17,5 ms** no pior caso —
 * mais que um quadro inteiro (16,6 ms). Só que a parte que PRECISA acontecer
 * dentro do quadro é a cópia do canvas (`drawImage`), e ela custa **0,02 ms**, o
 * mesmo que o jogo gasta desenhando um quadro. Então:
 *   1. no `requestAnimationFrame`: copia o palco para um canvas próprio (0,02 ms);
 *   2. FORA do quadro (`requestIdleCallback`): codifica em JPEG.
 * Assim o pior caso da codificação cai no tempo ocioso e nunca engasga o jogo.
 *
 * É STRING PURA (entra num `<script>`): sem imports, sem referências externas —
 * mesma regra do `storageBridge` e do `inputBridge`.
 */

import { buildDomRasterizerRuntime } from './domRasterizerRuntime'

/** Canal do pedido (editor → preview). */
export const PREVIEW_SNAPSHOT_REQUEST = 'sz:snapshot-request' as const
/** Canal da resposta (preview → editor); `kind` de `PreviewMessage`. */
export const PREVIEW_SNAPSHOT_KIND = 'snapshot' as const

/** Tamanho da miniatura do card — o bridge já entrega neste tamanho. */
export const SNAPSHOT_WIDTH = 320
export const SNAPSHOT_HEIGHT = 192

/** Teto do data URL aceito na resposta (~400 KB): defesa contra payload absurdo. */
export const SNAPSHOT_MAX_CHARS = 400_000

export interface PreviewSnapshotMessage {
  source: 'sz-preview'
  kind: typeof PREVIEW_SNAPSHOT_KIND
  /** JPEG já no tamanho do card, ou `null` quando não havia o que fotografar. */
  dataUrl: string | null
  /** Projeto para o qual o doc foi construído — o editor descarta o que não casar. */
  projectId?: string
  timestamp: number
}

export function isPreviewSnapshotMessage(value: unknown): value is PreviewSnapshotMessage {
  if (typeof value !== 'object' || value === null) return false
  const msg = value as Partial<PreviewSnapshotMessage>
  if (msg.source !== 'sz-preview' || msg.kind !== PREVIEW_SNAPSHOT_KIND) return false
  return msg.dataUrl === null || typeof msg.dataUrl === 'string'
}

export function buildSnapshotBridgeRuntime(input: {
  parentOrigin: string
  projectId?: string
}): string {
  const origin = JSON.stringify(input.parentOrigin)
  const projectId = JSON.stringify(input.projectId ?? '')
  const domRasterizer = buildDomRasterizerRuntime()
  return `;(function(){
  var PARENT_ORIGIN = ${origin};
  var PROJECT_ID = ${projectId};
  var W = ${SNAPSHOT_WIDTH};
  var H = ${SNAPSHOT_HEIGHT};
  var MAX = ${SNAPSHOT_MAX_CHARS};
  ${domRasterizer}
  // Um pedido em voo por vez: se o editor insistir, o segundo é ignorado em vez
  // de empilhar trabalho no quadro de animação do jogo.
  var emVoo = false;
  function post(dataUrl){
    try {
      parent.postMessage({
        source: 'sz-preview', kind: '${PREVIEW_SNAPSHOT_KIND}',
        dataUrl: dataUrl, projectId: PROJECT_ID, timestamp: Date.now()
      }, PARENT_ORIGIN);
    } catch (e) {}
  }
  function maiorCanvas(){
    var list = document.querySelectorAll('canvas');
    var best = null, bestArea = -1;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var area = (c.width || 0) * (c.height || 0);
      if (area > bestArea) { bestArea = area; best = c; }
    }
    return bestArea > 0 ? best : null;
  }
  function corDe(el){
    try {
      var cor = window.getComputedStyle(el).backgroundColor;
      if (!cor || cor === 'transparent' || cor === 'rgba(0, 0, 0, 0)') return '';
      return cor;
    } catch (e) { return ''; }
  }
  // O canvas já copiado e o palco de origem, esperando a fase 2.
  var copia = null;
  var alvo = null;
  // FASE 2 fora do quadro: quem custa caro é o toDataURL (pior caso medido de
  // 17,5 ms). O timeout garante que ele rode mesmo numa página que nunca fica
  // ociosa, em vez de a foto ficar pendurada para sempre.
  function foraDoQuadro(fn){
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 1000 });
    else setTimeout(fn, 0);
  }
  function desistir(){ copia = null; alvo = null; emVoo = false; post(null); }
  // FASE 1, dentro do quadro: só a cópia do palco (0,02 ms medidos).
  function copiar(){
    try {
      var c = maiorCanvas();
      if (!c) { copiarDOM(); return; }
      var tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      var ctx = tmp.getContext('2d');
      if (!ctx) { desistir(); return; }
      // ⚠️ NADA de fundo aqui. O teste de "quadro em branco" da fase 2 lê o ALFA
      // deste buffer, e pintar o fundo antes deixaria tudo opaco — a checagem
      // nunca acusaria nada e a foto lisa passaria como boa.
      // cover-fit: preenche a miniatura preservando a proporção do palco.
      var escala = Math.max(W / c.width, H / c.height);
      var w = c.width * escala, h = c.height * escala;
      ctx.drawImage(c, (W - w) / 2, (H - h) / 2, w, h);
      copia = tmp;
      alvo = c;
      foraDoQuadro(codificar);
    } catch (e) { desistir(); }
  }
  function copiarDOM(){
    foraDoQuadro(function(){
      szRasterizarDOM(document.body, {
        hideCanvases: true,
        includeBackground: true,
        fullDocument: true,
        fallbackWidth: W,
        fallbackHeight: H,
        maxWidth: 1600,
        maxHeight: 1200
      }, function(resultado){
        if (!resultado || !resultado.image) { desistir(); return; }
        try {
          var tmp = document.createElement('canvas');
          tmp.width = W; tmp.height = H;
          var ctx = tmp.getContext('2d');
          if (!ctx) { desistir(); return; }
          var escala = Math.max(W / resultado.width, H / resultado.height);
          var dw = resultado.width * escala, dh = resultado.height * escala;
          ctx.drawImage(resultado.image, (W - dw) / 2, (H - dh) / 2, dw, dh);
          exportar(tmp);
        } catch (e) { desistir(); }
      });
    });
  }
  // ⭐⭐ Tem algo do DOM COBRINDO o palco? (tela de início, menu, "fim de jogo")
  // O Jogo 2D Avançado desenha essas telas como <div> por cima do canvas, não no
  // canvas — então fotografar só o canvas devolvia "a cor de fundo e mais nada",
  // que foi o relato. Pergunta O(1): quem está no CENTRO do palco?
  function temCoisaPorCima(c){
    try {
      if (!c || !document.elementFromPoint) return false;
      var r = c.getBoundingClientRect();
      if (!r || !r.width || !r.height) return false;
      var topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!topo && topo !== c;
    } catch (e) { return false; }
  }
  function exportar(tmp){
    emVoo = false;
    try {
      var url = tmp.toDataURL('image/jpeg', 0.75);
      if (typeof url !== 'string' || url.indexOf('data:image/jpeg') !== 0 || url.length > MAX) {
        post(null); return;
      }
      post(url);
    } catch (e) { post(null); }
  }
  // FASE 2: tudo que custa caro, já longe do quadro do jogo — a varredura de
  // alfa (medida em até 6,4 ms) e o toDataURL (até 17,5 ms).
  function codificar(){
    var tmp = copia, c = alvo;
    copia = null; alvo = null;
    if (!tmp) { emVoo = false; post(null); return; }
    try {
      var ctx = tmp.getContext('2d');
      if (!ctx) { emVoo = false; post(null); return; }
      // ⭐ Quadro EM BRANCO não vira capa. Sem isto, o jogo que ainda não
      // desenhou — ou que quebrou no meio de uma edição — sobrescreveria uma capa
      // BOA por um retângulo liso, que é exatamente o sintoma que originou esta
      // peça ("foi só a cor de fundo, sem o texto do placar"). Canvas contaminado
      // não dá para inspecionar; ali NÃO se descarta, porque o toDataURL abaixo
      // lança no mesmo caso e o catch já resolve.
      var pintado = false;
      try {
        var d = ctx.getImageData(0, 0, W, H).data;
        for (var i = 3; i < d.length; i += 4) { if (d[i] !== 0) { pintado = true; break; } }
      } catch (e) { pintado = true; }
      // O fundo do palco é CSS, não pixel: sem compô-lo, a área transparente
      // viraria PRETO no JPEG (que não tem alfa). Mesma lição da capa do jogo
      // laranja que saía preta. O destination-over põe por BAIXO do que já existe.
      // (⚠️ nada de crase neste comentário: ele vive DENTRO de um template
      // literal, e uma crase crua fecha a string e quebra o arquivo inteiro.)
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = (c ? corDe(c) : '') || corDe(document.body) || '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      if (temCoisaPorCima(c)) {
        szRasterizarDOM((c && c.parentElement) || document.body, {
          hideCanvases: true,
          includeBackground: false,
          fallbackWidth: W,
          fallbackHeight: H
        }, function(resultado){
          var img = resultado && resultado.image;
          if (img) {
            try {
              // O canvas foi desenhado com ESTE cover-fit; a sobreposição tem
              // que cair exatamente em cima dele.
              var esc = Math.max(W / c.width, H / c.height);
              var dw = c.width * esc, dh = c.height * esc;
              var dx = (W - dw) / 2, dy = (H - dh) / 2;
              var r = c.getBoundingClientRect ? c.getBoundingClientRect() : null;
              var raiz = (c && c.parentElement) || null;
              var hr = r && raiz && raiz.getBoundingClientRect ? raiz.getBoundingClientRect() : null;
              if (r && r.width > 0 && r.height > 0 && hr) {
                // ⭐⭐ RECORTA do DOM rasterizado só a área do PALCO, em
                // coordenadas RELATIVAS ao contêiner — que é a origem do SVG.
                // Encaixar pela proporção da página fazia a foto sair com zoom
                // ("só as palavras"); recortar pelas coordenadas da página fazia
                // cair no vazio ("só a cor de fundo"). Relativo resolve os dois.
                ctx.drawImage(img, r.left - hr.left, r.top - hr.top, r.width, r.height, dx, dy, dw, dh);
              } else {
                // Sem como medir: encaixa a rasterização inteira no palco.
                ctx.drawImage(img, dx, dy, dw, dh);
              }
            } catch (e) {}
          } else if (!pintado) {
            // Sem a sobreposição E com o palco em branco não sobrou foto nenhuma.
            emVoo = false; post(null); return;
          }
          exportar(tmp);
        });
        return;
      }
      // ⭐ Quadro em branco só é descartado quando NÃO havia nada por cima: uma
      // tela de início cobrindo o palco é uma foto legítima mesmo com o canvas
      // ainda vazio (é justamente o caso do Jogo 2D Avançado).
      if (!pintado) { emVoo = false; post(null); return; }
      exportar(tmp);
    } catch (e) { emVoo = false; post(null); }
  }
  window.addEventListener('message', function(e){
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || d.type !== '${PREVIEW_SNAPSHOT_REQUEST}') return;
    if (emVoo) return;
    emVoo = true;
    // Copia DEPOIS de um quadro: o jogo acabou de pintar e o buffer está cheio.
    // ⚠️ Um canvas WebGL sem preserveDrawingBuffer volta VAZIO se lido fora da
    // janela do quadro, então esperar aqui não é preciosismo — e é por isso que
    // a fase 1 não pode ser adiada junto com a fase 2.
    if (window.requestAnimationFrame) window.requestAnimationFrame(copiar);
    else copiar();
  });
})();`
}
