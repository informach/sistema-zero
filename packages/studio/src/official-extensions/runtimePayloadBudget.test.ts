import { describe, expect, it } from 'bun:test'
import type { ExtensionBootstrapContext, ExtensionDefinition } from '#extensions'
import { gameThreeDExtension } from './game-3d'
import { gameKit3DExtension } from './game-3d-advanced'
import { worldThreeDExtension } from './world-3d'

/**
 * CATRACA do payload dos runtimes 3D: o texto que o `loadBootstrapScript` injeta no
 * documento do jogo, medido cru (caracteres) e em gzip (bytes). Os tetos são a medida de
 * 24/10/2026, depois de `compactOfficialRuntimeSource` valer para as três extensões,
 * arredondada para cima em ~1%.
 *
 * Lotes futuros só podem BAIXAR estes números (ao encolher, desça o teto junto). Subir exige
 * justificativa escrita aqui, ao lado do número: o runtime entra inteiro em cada preview e em
 * cada projeto publicado.
 */
const BUDGETS: readonly {
  extension: ExtensionDefinition
  /** Nome da variante no título do teste; sem ela, o runtime padrão (sem contexto). */
  variant?: string
  /** O contexto que escolhe a variante (o código do projeto), como os chamadores passam. */
  context?: ExtensionBootstrapContext
  maxChars: number
  maxGzipBytes: number
  /** Bun usa compressores diferentes no Windows e no Linux. */
  maxGzipBytesWindows?: number
}[] = [
  // ⚠️ SUBIU no lote 2 do review 3D (carregador de modelos compartilhado,
  // `three3dModelsRuntime.ts`: 24_907 caracteres, 7_746 bytes gzip, já sem indentação nem
  // comentários). Os três runtimes passaram a ter o mesmo pacote completo do Molda: ossos
  // próprios por cópia (SkeletonUtils), orçamento com ossos, animador (uma vez, crossfade,
  // velocidade, fim), pintura animada, encaixe longest/contain/height, cores do céu 360° e
  // textura de cor sRGB. O Jogo 3D e o Mundo 3D não tinham nada disso; o código duplicado que
  // saiu (loaders, HDR, decoder) não paga a diferença. Antes: 181_430 / 46_392,
  // 324_916 / 87_768 e 209_778 / 60_308.
  // Medido: 194_128 caracteres, 50_875 bytes gzip.
  // ⬇️ DESCEU nos lotes 3-4 do review 3D: saíram as seis câmeras (viraram um modo), o
  // enxame (virou grupo) e o "a cada N quadros", e os comentários em bloco do runtime
  // viraram comentários de linha, que o `compactOfficialRuntimeSource` tira do payload.
  // Medido: 191_180 caracteres, 49_469 bytes gzip.
  // ⚠️ SUBIU no lote 5 (regras de jogo): o fragmento COMPARTILHADO `game3dRules/runtime.ts`
  // (15_843 caracteres, 5_281 bytes gzip: cantos da tela, pontos, vida, contagem, telas, fim,
  // recomeçar, tremer, piscar e os "Quando…"; o Mundo 3D e o Avançado vão consumir o MESMO
  // texto) e o contexto da partida (`buildProjectRunContextRuntime`, 6_698 / 1_754), que o
  // "Recomeçar" exige para matar listeners e timers do código gerado. O Jogo 3D não fechava
  // um jogo básico sem isto. Medido: 216_617 caracteres, 57_012 bytes gzip.
  // ⚠️ SUBIU no lote 6 (Molda no Jogo 3D): animador por objeto no laço da cena, "tocar/parar/
  // terminou?" com o pedido contínuo que não rebobina, cópia de grupo com animador próprio,
  // descarte de mixer/ossos ao remover e recomeçar, pintura animada no laço e aquecer o shader
  // (+4_640 caracteres, +1_194 bytes gzip). O carregador já trazia o animador e a pintura; o
  // Jogo 3D só passou a ligá-los. Medido: 221_257 caracteres, 58_206 bytes gzip.
  // LOTE 14 (desempenho), o que vale para os três: `compactOfficialRuntimeSource(…, { trimIndent:
  // true })` tira a indentação de cada linha (seguro: o runtime composto não tem crase), e entra
  // o fragmento COMPARTILHADO `threeRenderBudgetRuntime.ts` (resolução pelo canvas real, pixel
  // ratio com teto de pixels, níveis alta/leve com a sonda de FPS, sombra 2048/1024, efeitos e
  // MSAA por nível; ~4_400 caracteres, ~1_400 bytes gzip). O cru cai (a indentação era ~10%);
  // o gzip, que já comprimia bem os espaços, sobe um pouco com o código novo.
  // ⚠️ Jogo 3D, gzip SUBIU (+1_775): além do orçamento, a luz pontual sem sombra por padrão (no
  // máximo uma com sombra) e o sol único com sombra, a geometria das primitivas compartilhada
  // por (forma, medidas) com contagem de usuários, o material das cópias de grupo emprestado
  // até a cópia ser pintada (copy-on-write), o cache de geometria e material das peças do Kit
  // Plataforma, a lista de quem pode ser mirado mantida no registro e o zero-alocação por quadro
  // (temporários, buffers reaproveitados, matrizes sincronizadas uma vez por quadro). Esta é a
  // variante COM o kit (quem usa o kit, ou chama sem contexto).
  // Medido: 214_754 caracteres, 59_981 bytes gzip (o contexto da partida entra depois da
  // compactação, sem tirar a indentação: no build minificado ele tem crase).
  // ⚠️ SUBIU na correção do review 3D de 24/10/2026 (+4_868 caracteres / +1_286 bytes gzip).
  // Dos fragmentos COMPARTILHADOS (+2_392 / ~+594, os mesmos nos três runtimes): o canvas sem
  // CSS com DPR > 1 crescia em laço (a caixa agora fica presa no tamanho de antes da gravação
  // do buffer) e a troca de DPR (outro monitor, zoom) passou a refazer a resolução pela
  // consulta de resolução, solta no dispose; a camada do HUD mede o canvas só no reajuste
  // (ResizeObserver + resize) em vez de ler offset* todo quadro; piscar não desfaz o esconder
  // da criança e o fim de jogo devolve quem piscava; o SkeletonUtils que falhou é pedido de
  // novo. Do Jogo 3D: "Criar cópia" não serializa mais o userData do molde por JSON (ciclo
  // lançava, malha virava geometria serializada), remover uma luz devolve a vaga do teto, as
  // batidas do stepBody vêm de um pool (zero objeto por batida), o erro do "para cada objeto
  // do grupo" vai ao console (com teto de um por segundo), o shift da direita vale o do
  // dropdown e o Kit Plataforma parou de criar 2 funções por tiro/inimigo por quadro.
  // Medido: 219_622 caracteres, 61_267 bytes gzip.
  // 25/10: +5_254 caracteres / +1_515 gzip sobre a medida anterior: cenas dos
  // kits sem canvas de página, controles de toque do motor (mesma entrada física,
  // cancelamento/descarte), clique na cena, HUD central e limpeza ao falhar WebGL.
  // É código compartilhado necessário para retirar HTML/CSS dos 19 exemplos;
  // nenhum novo laço de renderização foi criado. Medido: 224_876 / 62_782.
  // ⚠️ 27/10 (Ilha do Farol com os modelos do Blender), +2_370 caracteres; o gzip caiu para
  // 61_639. Compartilhado com os três (~+1_190): as texturas de dentro do .glb lidas pela img
  // quando a CSP do documento recusa fetch(blob:) (o connect-src 'none' do preview), porque o
  // GLTFLoader do Chrome as lê assim e o modelo saía sem textura. Do Jogo 3D: peça de efeito (szSemCaixa) fora da área de toque, modelo até 200
  // (um cenário inteiro) sem o cubo cinza acima de 64, e o normalBias da sombra (acne).
  // 27/10 (luz do motor igual à oficina do Molda): as constantes LIGHT_AMBIENT e
  // LIGHT_SUN no lugar dos números soltos. Medido: 227_324.
  // 27/10 (cenário da ilha com acabamento de jogo): +257 no carregador comum dos três, a peça
  // translúcida e o material szSemSombra não fazem sombra. Medido: 227_581.
  // 27/10: percurso iniciante da Ilha: áreas caminháveis, andar e animações,
  // contato entre objetos e enquadramento responsivo. +2_755 caracteres no runtime.
  // Medido: 230_336 caracteres; gzip Bun 1.3.11 Linux 62_225 / Windows 64_626.
  // Os tetos gzip mantêm a catraca própria para cada compressor.
  {
    extension: gameThreeDExtension,
    maxChars: 230_500,
    maxGzipBytes: 62_800,
    maxGzipBytesWindows: 64_700,
  },
  // ⬇️ Lote 14 do review 3D (P2): o Kit Plataforma (`runtimePlatform.ts`) só entra quando o
  // código do projeto usa um método dele (`game-3d/platformKitVariant.ts`); os outros 20
  // exemplos do catálogo recebem esta variante. O completo, acima, segue sendo o de quem usa o
  // kit e o de quem chama sem contexto. Medido: 181_212 caracteres, 50_501 bytes gzip (o kit
  // custa ~33_500 caracteres e ~9_500 bytes gzip).
  {
    extension: gameThreeDExtension,
    variant: 'sem Kit Plataforma',
    context: { code: 'const cena = SZGame3D.createScene("tela");' },
    // ⚠️ SUBIU com a correção do review de 24/10/2026 (+4_470 / +1_067; o mesmo conjunto da
    // variante completa, acima, menos o do Kit). Medido: 185_682 caracteres, 51_568 bytes gzip.
    // Mesmos recursos nativos, sem o Kit Plataforma: 190_794 / 53_051.
    // 27/10: +2_370, o mesmo da variante completa (acima). Medido: 193_164 / 52_171.
    // 27/10, luz do motor: as duas constantes de luz. Medido: 193_242.
    // 27/10, +257 do carregador comum (o que não faz sombra). Medido: 193_499.
    // Mesmo percurso iniciante: 196_254 caracteres; gzip Bun 1.3.11 Linux 52_811 /
    // Windows 54_908. O teto cobre ambos, sem incluir o Kit Plataforma.
    maxChars: 196_400,
    maxGzipBytes: 53_100,
    maxGzipBytesWindows: 55_000,
  },
  // Medido: 341_986 caracteres, 93_312 bytes gzip.
  // ⚠️ SUBIU nos lotes 8-9 do review 3D: o Mundo 3D passou a injetar o fragmento COMPARTILHADO
  // das regras de jogo (`game3dRules/runtime.ts`, ~15_900 caracteres / ~5_300 bytes gzip) para
  // usar o gerenciador de CANTOS: o texto da criança deixou de ficar por baixo dos painéis de
  // moedas, missão, conquista, corrida e minimapa. O mesmo texto já está no Jogo 3D e vai
  // servir às regras do Mundo 3D no lote 10 (pontos, vida, cronômetro, telas). Entraram também
  // o jogador ativo nos encostões, o `listen()` com remoção no descarte, o chão refeito uma vez
  // por quadro com teto e os tetos do que nasce durante o jogo (~3_000). Para pagar parte, os
  // 68 comentários em bloco do runtime viraram comentários de linha, que o
  // `compactOfficialRuntimeSource` tira (−6_400). Medido: 353_206 caracteres, 95_564 bytes gzip.
  // ⚠️ SUBIU no lote 10 (regras de jogo, coletáveis e Molda no Mundo 3D, +21_100 caracteres /
  // +6_000 bytes gzip): o fragmento de regras já estava injetado (lotes 8-9), então o que
  // entrou é só a LIGAÇÃO dele (pausa, vida do jogador, as 19 regras na API e o recomeçar LEVE
  // que refaz o "Ao iniciar" das regras sem rodar o projeto de novo), os coletáveis
  // procedurais (5 formas sem arquivo), "Tirar … do mundo", "Esvaziar a mochila" e o Molda no
  // personagem, nos amigos, no carro e no "Pôr" (corpo encaixado no chão, clipe por estado com
  // crossfade, teto de animados, pintura animada no laço, luz do céu 360° e o descarte de
  // mixer/ossos). Saíram o `hud` e o tremor próprio da API (viraram as regras).
  // Medido: 374_334 caracteres, 101_528 bytes gzip.
  // ⬇️ DESCEU no lote 14 (−38_349 caracteres, −1_628 bytes gzip): a indentação saiu do payload,
  // o ramo morto de rebuild do buildCity saiu e três ajudantes (`toon`, `tryDispose`, `later`)
  // juntaram 100 repetições. Entraram o orçamento compartilhado (que substitui a qualidade
  // própria do turbo), o espalhado em pedaços com esfera própria (frustum culling), o
  // `playerXZ` reaproveitado, postes reordenados por distância/tempo, DOM do HUD escrito só
  // quando muda e moedas girando só perto da câmera. Medido: 335_985 caracteres, 99_900 bytes gzip.
  // ⚠️ SUBIU no lote 15 (+1_297 caracteres, +486 bytes gzip), as duas pendências de desempenho do
  // review: a cidade passou pelo ajudante de pedaços do espalhado (grade genérica `chunkGrid`/
  // `chunkIndex`/`chunkItems`, chave numérica) com as casas e as cercas juntas por FORMA e cor por
  // instância (52 → 33 objetos; a vista do anel caiu de 26 para 8 draw calls na média), a esfera
  // fixa do trânsito e a dos rebanhos (as calculadas sozinhas ficavam com as posições do 1º quadro),
  // os varais dentro do culling, e o laço sem objeto novo: alvo do passeio reaproveitado por bicho
  // e por amigo, as cores do semáforo guardadas nele, as opções do `play` e o mapa vazio constantes
  // e os explosivos compactados no lugar. Medido: 337_282 caracteres, 100_386 bytes gzip.
  // ⚠️ SUBIU nos achados do revisor de 24/10/2026 (+2_352 caracteres / +869 bytes gzip do runtime do
  // Mundo 3D, medidos com os MESMOS fragmentos compartilhados): o recomeçar leve passou a devolver
  // tudo da partida (moedas nascidas no jogo saem com a malha compactada, corrida volta à largada,
  // missões por fazer, pinos em pé, caixas explosivas do começo refeitas e as nascidas no jogo fora,
  // coletável tirado só se esconde, "Pôr" do meio do jogo sai com o colisor, que ganhou remoção),
  // o E que troca de veículo é consumido (dava para subir no barco e nunca mais descer), o veículo
  // deixado durante o piscar volta à vista, o "passear" virou mapa nome → raio (amigo nascido no
  // jogo passeia), a pergunta do amigo fecha de verdade (com os listeners dos botões e do mapa
  // grande), o teleporte leva o jogador ativo, lua e nuvens seguem o jogador, a tecla M é lida a
  // todo quadro e o erro cru do JavaScript foi para o console.debug. O restante da diferença para
  // a medida anterior (+1_153 / +276) veio dos fragmentos compartilhados editados no mesmo dia por
  // outro lote. Medido: 342_026 caracteres, 101_860 bytes gzip.
  // ⚠️ SUBIU de novo no mesmo dia (+2_349 / +851): o recomeçar leve ficou UNIFORME — o que nasceu
  // no jogo sai (amigos, ícones, empurráveis, com a malha de cada tipo compactada) e o do Ao
  // iniciar volta (amigos e empurráveis em casa; amigo, ponto, área e ícone tirados com "Tirar …
  // do mundo" refeitos a partir de uma anotação), o "E: falar" sai por identidade e o "Levar o
  // carrinho para…" do Ao iniciar deixou de ser ignorado. Medido: 344_375 caracteres, 102_711 bytes
  // gzip.
  // 25/10: HUD central compartilhado, sem controles dos kits: 344_930 / 102_843.
  // 27/10: +1_228, as texturas do .glb pela img (ver o Jogo 3D). Medido: 346_158 / 100_414.
  // 27/10: +257, o que não faz sombra no carregador comum (ver o Jogo 3D). Medido: 346_415.
  // Windows, mesmo conteúdo: 103_642 bytes gzip.
  {
    extension: worldThreeDExtension,
    maxChars: 346_500,
    maxGzipBytes: 102_900,
    maxGzipBytesWindows: 103_700,
  },
  // Medido: 213_707 caracteres, 62_113 bytes gzip.
  // ⬇️ DESCEU no lote 11 (o Avançado consome as regras comuns): entrou o fragmento
  // COMPARTILHADO `game3dRules/runtime.ts` (~15_900 caracteres / ~5_300 bytes gzip; placar,
  // cantos, contagem, sorteio e tremor, os MESMOS do Jogo 3D e do Mundo 3D) e a animação do
  // modelo (encaixe na caixa da peça, "uma vez", velocidade e o aviso de fim), e saíram o HUD,
  // o cronômetro, o sorteio e o tremor próprios (viraram as regras). Para pagar, os 110
  // comentários em bloco do runtime viraram comentários de linha, que o
  // `compactOfficialRuntimeSource` tira (−16_000). Medido: 212_701 caracteres, 58_160 bytes gzip.
  // ⚠️ SUBIU no lote 12 (+4_693 caracteres / +1_489 bytes gzip): os blocos de jogo que o
  // Avançado não tinha (`runtimeGameplay.ts`): patrulhar (vai e volta virado, com pausa nas
  // pontas), a mochila com o painel no canto, guardar o progresso no storage com as guardas de
  // quota/ausência/valor que não vira texto, e as fases (troca adiada para fora dos laços,
  // limpeza da arena, ganchos refeitos pela fábrica). É a ligação mínima: o painel usa o
  // gerenciador de cantos do fragmento comum e a limpeza reusa a do recomeçar.
  // Medido: 217_394 caracteres, 59_649 bytes gzip.
  // ⚠️ Avançado, gzip SUBIU no lote 14 (+940): o orçamento compartilhado (a resolução fixa
  // 1280×720 com pixel ratio 1 saiu; bloom/vinheta só no nível alta), a lista `pickables` do
  // mouse mantida no spawn/recycle, as matrizes sincronizadas uma vez por quadro, a grade
  // espacial com chave numérica, balde de fora do mundo e `forEachNear` sem alocar.
  // Medido: 205_159 caracteres, 60_589 bytes gzip.
  // ⚠️ SUBIU com a correção do review 3D de 24/10/2026 SÓ pelos fragmentos compartilhados
  // (+2_392 caracteres / ~+600 bytes gzip; o que entrou está descrito na entrada do Jogo 3D:
  // DPR, canvas sem CSS, camada do HUD, piscar, SkeletonUtils). Este teto soma só isso ao de
  // antes; o que outro lote mudar no runtime do Avançado tem a justificativa dele.
  // ⚠️ SUBIU nos achados do revisor do Avançado de 24/10/2026 (+1_079 caracteres / +324 bytes
  // gzip, medidos desfazendo SÓ estas mudanças no runtime montado): a troca de fase apaga as
  // luzes e os jorros acesos DURANTE a fase (cada um guarda a fase em que nasceu; antes as luzes
  // se somavam até o teto de 8 e os jorros do "entrar em jogando" sumiam na fase 2), o guardar
  // apara o nome, não regrava o mesmo valor e tem a frase própria do "grande demais", o passo
  // do objeto para quando o "terminar a animação" o tira do jogo (e a grade não reinsere
  // morto), a ronda declarada no objeto e os avisos com os nomes reais dos blocos e sem
  // "entidade/emissor/atrator/recolha/gancho". Para pagar parte, a remoção de luz virou uma
  // função só (o recomeçar e a troca de fase).
  // Soma das duas partes sobre o lote 14 (205_159 / 60_589): fragmentos compartilhados do Jogo 3D
  // +2_366 / +515 (o runtime montado SEM as mudanças do Avançado mede 207_525 / 61_104) e as
  // correções do Avançado +1_079 / +324. Medido FINAL: 208_604 caracteres, 61_428 bytes gzip.
  // 25/10: HUD central compartilhado, sem controles dos kits: 209_159 / 61_537.
  // 27/10: +1_187, as texturas do .glb pela img (ver o Jogo 3D). Medido: 210_387 / 60_177.
  // 27/10: +257, o que não faz sombra no carregador comum (ver o Jogo 3D). Medido: 210_644.
  // Windows, mesmo conteúdo: 62_048 bytes gzip.
  {
    extension: gameKit3DExtension,
    maxChars: 210_700,
    maxGzipBytes: 61_600,
    maxGzipBytesWindows: 62_100,
  },
]

async function bootstrapSource(
  extension: ExtensionDefinition,
  context?: ExtensionBootstrapContext,
): Promise<string> {
  const runtime = extension.runtime
  if (!runtime || !('loadBootstrapScript' in runtime) || !runtime.loadBootstrapScript) {
    throw new Error(`${extension.manifest.id} não carrega runtime por loadBootstrapScript`)
  }
  return runtime.loadBootstrapScript(context)
}

describe('runtimes 3D: catraca de payload', () => {
  for (const {
    extension,
    variant,
    context,
    maxChars,
    maxGzipBytes,
    maxGzipBytesWindows,
  } of BUDGETS) {
    const name = variant ? `${extension.manifest.id} (${variant})` : extension.manifest.id
    const gzipLimit =
      process.platform === 'win32' ? (maxGzipBytesWindows ?? maxGzipBytes) : maxGzipBytes
    it(`${name} cabe em ${maxChars} caracteres e ${gzipLimit} bytes gzip`, async () => {
      const source = await bootstrapSource(extension, context)
      expect(source.length).toBeLessThanOrEqual(maxChars)
      expect(Bun.gzipSync(source).byteLength).toBeLessThanOrEqual(gzipLimit)
      // Anti-vácuo: um runtime vazio ou só com o import passaria em qualquer teto.
      expect(source.length).toBeGreaterThan(maxChars * 0.5)
    })
  }
})
