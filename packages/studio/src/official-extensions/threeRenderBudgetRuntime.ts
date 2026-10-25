/**
 * Orçamento de desenho ÚNICO dos três runtimes oficiais baseados em Three (Jogo 3D, Mundo 3D
 * e Jogo 3D Avançado), no molde de `threePostProcessingRuntime.ts` e `three3dModelsRuntime.ts`.
 *
 * Decide, por NÍVEL (`alta` ou `leve`):
 * - a resolução do desenho pelo tamanho REAL do canvas na tela (ResizeObserver; sem ele, o
 *   `resize` da janela), com pixel ratio `min(devicePixelRatio, 2)` e teto de pixels
 *   (~2,1 MP no alta, ~1 MP no leve, que ainda multiplica o ratio por 0,75);
 * - o mapa de sombra (2048 / 1024) e o filtro (PCFSoft / PCF);
 * - se o pós-processamento roda (só no alta) e o MSAA do alvo da cena (4 amostras em WebGL2).
 *
 * A "régua" do jogo não muda: o host passa o tamanho LÓGICO (`logical()`, ex.: `config.w/h`
 * do Mundo 3D e do Avançado, ou o tamanho CSS do canvas no Jogo 3D). O renderer recebe
 * `setSize(lógico, false)` e o pixel ratio que leva o lógico ao tamanho real, então o aspecto,
 * as contas do aluno e os tamanhos em pixel (pontos, partículas) continuam proporcionais ao
 * que eram; só a nitidez muda.
 *
 * O nível começa `alta` e a sondagem (generalizada do Mundo 3D) mede o FPS entre 1,5 s e 4 s
 * de jogo: abaixo de 45 passa a `leve` uma vez, sem ida e volta.
 *
 * Contrato do host: `THREE`; `createSzRenderBudget({ renderer | getRenderer, canvas | getCanvas,
 * logical, onResize, onTier, getScene, maxSide })`. Os getters deixam o orçamento nascer antes do
 * renderer (o nível escolhido no começo já vale no primeiro quadro). `onResize(w, h)` recebe o
 * tamanho LÓGICO depois de cada reajuste; `onTier(tier)` avisa a troca de nível. `observe(fn)`
 * liga o ResizeObserver do canvas (ou, sem ele, o resize da janela) e chama `fn` (o reajuste do
 * host, que acerta a câmera) ou o próprio `resize`.
 *
 * ⚠️ Sem crase e sem cifrão-chave dentro do literal; comentários só de linha inteira.
 */
export const THREE_RENDER_BUDGET_MARKER = '/*__SZ_THREE_RENDER_BUDGET_RUNTIME__*/'

const THREE_RENDER_BUDGET_TEMPLATE = `
  // ---- 📐 Orçamento de desenho: resolução real, pixel ratio, sombra, efeitos e MSAA ----
  var SZ_RENDER_MAX_PIXELS_HIGH = 2100000;
  var SZ_RENDER_MAX_PIXELS_LIGHT = 1000000;
  var SZ_RENDER_LIGHT_SCALE = 0.75;
  var SZ_RENDER_PROBE_FROM = 1.5;
  var SZ_RENDER_PROBE_UNTIL = 4;
  var SZ_RENDER_PROBE_MIN_FPS = 45;

  function createSzRenderBudget(host) {
    // O renderer e o canvas podem nascer depois do orçamento (o nível já vale antes do start).
    function rr() { return host.getRenderer ? host.getRenderer() : host.renderer || null; }
    function cv() {
      var c = host.getCanvas ? host.getCanvas() : host.canvas;
      if (c) return c;
      var r = rr();
      return r && r.domElement ? r.domElement : null;
    }
    var observer = null;
    var onWindowResize = null;
    var dprQuery = null;
    var onDprChange = null;
    var disposed = false;
    var lastKey = '';
    var budget = {
      tier: 'alta',
      auto: true,
      decided: false,
      probeT: 0,
      fpsAcc: 0,
      fpsN: 0,
      pixelRatio: 1,
      width: 0,
      height: 0
    };

    function logicalSize() {
      var l = host.logical ? host.logical() : null;
      var w = l && l.w > 0 ? l.w : 0;
      var h = l && l.h > 0 ? l.h : 0;
      if (!w || !h) {
        w = cssSize('width') || 640;
        h = cssSize('height') || 360;
      }
      budget.width = w;
      budget.height = h;
      return budget;
    }

    function cssSize(axis) {
      var canvas = cv();
      if (!canvas) return 0;
      var v = axis === 'width' ? canvas.clientWidth : canvas.clientHeight;
      return v > 0 ? v : 0;
    }

    // Pixel ratio do three: leva o tamanho lógico ao tamanho real na tela vezes o DPR,
    // dentro do teto de pixels do nível e do lado máximo de textura da GPU.
    function ratioFor(lw, lh) {
      var cw = cssSize('width');
      var ch = cssSize('height');
      if (!cw || !ch) {
        cw = lw;
        ch = lh;
      }
      var dpr = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
      var pr = Math.min(dpr, 2);
      if (budget.tier === 'leve') pr *= SZ_RENDER_LIGHT_SCALE;
      var cap = budget.tier === 'leve' ? SZ_RENDER_MAX_PIXELS_LIGHT : SZ_RENDER_MAX_PIXELS_HIGH;
      if (cw * ch * pr * pr > cap) pr = Math.sqrt(cap / (cw * ch));
      var r = rr();
      var gpuSide = r && r.capabilities && r.capabilities.maxTextureSize > 0 ? r.capabilities.maxTextureSize : 4096;
      var side = host.maxSide > 0 ? Math.min(host.maxSide, gpuSide) : gpuSide;
      if (cw * pr > side) pr = side / cw;
      if (ch * pr > side) pr = side / ch;
      // Converte para a régua lógica (o three multiplica o lógico por este número).
      return Math.max(0.05, pr * cw / lw);
    }

    function resize() {
      var renderer = rr();
      if (disposed || !renderer) return;
      var l = logicalSize();
      var pr = ratioFor(l.width, l.height);
      var key = l.width + 'x' + l.height + '@' + pr;
      if (key === lastKey) return;
      lastKey = key;
      budget.pixelRatio = pr;
      var canvas = cv();
      var cw0 = cssSize('width');
      var ch0 = cssSize('height');
      if (renderer.setPixelRatio) renderer.setPixelRatio(pr);
      if (renderer.setSize) renderer.setSize(l.width, l.height, false);
      pinIntrinsicSize(canvas, cw0, ch0);
      if (host.onResize) host.onResize(l.width, l.height);
    }

    // Canvas SEM tamanho por CSS mostra o tamanho do buffer: o setSize(..., false) grava
    // lógico x pixel ratio, a caixa cresce junto e a próxima leitura cresceria de novo
    // (com DPR 2, 480 vira 960, 1920...). O sinal é a caixa MUDAR com a gravação do buffer e
    // passar a ser o buffer; aí a caixa fica presa no tamanho que tinha antes (o que o three
    // faria com setSize(..., true)). Canvas com CSS não muda de caixa e nunca é tocado.
    function pinIntrinsicSize(canvas, cw0, ch0) {
      if (!canvas || !canvas.style || !cw0 || !ch0) return;
      var cw1 = cssSize('width');
      var ch1 = cssSize('height');
      if (cw1 === cw0 && ch1 === ch0) return;
      if (cw1 !== canvas.width || ch1 !== canvas.height) return;
      canvas.style.width = cw0 + 'px';
      canvas.style.height = ch0 + 'px';
    }

    // UM caminho só de reajuste: o ResizeObserver do canvas (pega o letterbox por CSS, a
    // tela cheia e o painel do preview); sem ele, o resize da janela. O host pode passar o
    // próprio reajuste (que chama resize() e acerta a câmera).
    function observe(fn) {
      if (disposed || observer || onWindowResize) return;
      var canvas = cv();
      var cb = typeof fn === 'function' ? fn : resize;
      watchDpr(cb);
      if (typeof ResizeObserver !== 'undefined' && canvas) {
        observer = new ResizeObserver(function () { cb(); });
        if (observer.observe) observer.observe(canvas);
        return;
      }
      if (typeof window !== 'undefined' && window.addEventListener) {
        onWindowResize = function () { cb(); };
        window.addEventListener('resize', onWindowResize);
      }
    }

    // Trocar de monitor ou dar zoom muda o devicePixelRatio SEM mudar a caixa do canvas, e o
    // ResizeObserver não avisa: a consulta de resolução do DPR atual avisa uma vez e é refeita
    // com o DPR novo.
    function watchDpr(cb) {
      unwatchDpr();
      if (disposed || typeof window === 'undefined' || !window.matchMedia) return;
      var dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
      var query = window.matchMedia('(resolution: ' + dpr + 'dppx)');
      if (!query) return;
      onDprChange = function () { watchDpr(cb); cb(); };
      dprQuery = query;
      if (query.addEventListener) query.addEventListener('change', onDprChange);
      else if (query.addListener) query.addListener(onDprChange);
    }
    function unwatchDpr() {
      if (dprQuery && onDprChange) {
        if (dprQuery.removeEventListener) dprQuery.removeEventListener('change', onDprChange);
        else if (dprQuery.removeListener) dprQuery.removeListener(onDprChange);
      }
      dprQuery = null;
      onDprChange = null;
    }

    function isLight() { return budget.tier === 'leve'; }

    function shadowSize() { return isLight() ? 1024 : 2048; }

    function shadowType() {
      if (isLight()) return THREE.PCFShadowMap != null ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
      return THREE.PCFSoftShadowMap != null ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    }

    // Configura a sombra do renderer e de uma luz pelo nível (mapa refeito se mudou).
    function applyShadow(light) {
      var renderer = rr();
      if (renderer && renderer.shadowMap) {
        var type = shadowType();
        if (type != null && renderer.shadowMap.type !== type) {
          var hadType = renderer.shadowMap.type != null;
          renderer.shadowMap.type = type;
          // O tipo de filtro entra no programa do material: recompila quem já desenhou.
          var scene = hadType && host.getScene ? host.getScene() : null;
          if (scene && scene.traverse) {
            scene.traverse(function (o) {
              var m = o.material;
              if (!m) return;
              if (m.length) { for (var i = 0; i < m.length; i++) if (m[i]) m[i].needsUpdate = true; }
              else m.needsUpdate = true;
            });
          }
        }
      }
      if (!light || !light.shadow || !light.shadow.mapSize) return;
      var size = shadowSize();
      if (light.shadow.mapSize.x === size && light.shadow.mapSize.y === size) return;
      if (light.shadow.mapSize.set) light.shadow.mapSize.set(size, size);
      if (light.shadow.map) {
        try { light.shadow.map.dispose(); } catch (e) {}
        light.shadow.map = null;
      }
    }

    // Efeitos de cinema (bloom/vinheta) só no nível alta.
    function postFx() { return !isLight(); }

    // MSAA do alvo da cena do composer: 4 amostras em WebGL2 com cor em ponto flutuante.
    function msaa() {
      var renderer = rr();
      if (isLight() || !renderer || !renderer.capabilities || !renderer.capabilities.isWebGL2) return 0;
      var ext = renderer.extensions;
      if (ext && ext.has && !ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) return 0;
      return 4;
    }

    function setTier(tier) {
      var next = tier === 'leve' ? 'leve' : 'alta';
      if (next === budget.tier) return;
      budget.tier = next;
      lastKey = '';
      resize();
      if (host.onTier) host.onTier(next);
    }

    // 'automatica' (sonda o FPS), 'alta' ou 'leve' (fixos).
    function setMode(mode) {
      var auto = mode !== 'alta' && mode !== 'leve';
      budget.auto = auto;
      budget.decided = !auto;
      budget.probeT = 0;
      budget.fpsAcc = 0;
      budget.fpsN = 0;
      setTier(auto ? 'alta' : mode);
    }

    // Sonda de FPS: mede o quadro REAL entre 1,5 s e 4 s; abaixo de 45 passa a leve (uma vez).
    function sample(dt) {
      if (!budget.auto || budget.decided || !(dt >= 0)) return;
      budget.probeT += dt;
      if (budget.probeT > SZ_RENDER_PROBE_FROM) {
        budget.fpsAcc += dt;
        budget.fpsN++;
      }
      if (budget.probeT > SZ_RENDER_PROBE_UNTIL) {
        budget.decided = true;
        var fps = budget.fpsN / Math.max(0.001, budget.fpsAcc);
        if (fps < SZ_RENDER_PROBE_MIN_FPS) setTier('leve');
      }
    }

    function dispose() {
      disposed = true;
      if (observer && observer.disconnect) try { observer.disconnect(); } catch (e) {}
      observer = null;
      if (onWindowResize && typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('resize', onWindowResize);
      }
      onWindowResize = null;
      unwatchDpr();
    }

    budget.resize = resize;
    budget.observe = observe;
    budget.isLight = isLight;
    budget.shadowSize = shadowSize;
    budget.shadowType = shadowType;
    budget.applyShadow = applyShadow;
    budget.postFx = postFx;
    budget.msaa = msaa;
    budget.setTier = setTier;
    budget.setMode = setMode;
    budget.sample = sample;
    budget.dispose = dispose;
    return budget;
  }
`

// O fragmento entra em TRÊS runtimes: sem indentação nem comentários no payload (o literal não
// tem string de várias linhas, então nenhum texto muda).
const THREE_RENDER_BUDGET_SOURCE = THREE_RENDER_BUDGET_TEMPLATE.split('\n')
  .map((line) => line.trimStart())
  .filter((line) => line !== '' && !line.startsWith('//'))
  .join('\n')

/** Fragmento cru (para o teste do módulo, que o avalia isolado). */
export const threeRenderBudgetRuntimeSource = THREE_RENDER_BUDGET_SOURCE

export function withThreeRenderBudgetRuntime(source: string): string {
  const firstMarker = source.indexOf(THREE_RENDER_BUDGET_MARKER)
  if (firstMarker === -1) {
    throw new Error('Runtime 3D sem o marcador do orçamento de desenho compartilhado')
  }
  if (source.indexOf(THREE_RENDER_BUDGET_MARKER, firstMarker + 1) !== -1) {
    throw new Error('Runtime 3D com marcador do orçamento de desenho duplicado')
  }
  return source.replace(THREE_RENDER_BUDGET_MARKER, () => THREE_RENDER_BUDGET_SOURCE)
}
