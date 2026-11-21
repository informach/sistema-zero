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
  // 28/10: a vista do jogador no frameScene (rodinha/dois dedos dão zoom, arrastar gira, duplo
  // clique volta, a vista acompanha quem anda e as setas andam em relação à câmera): +3_865
  // caracteres e +1_226 bytes gzip. Medido: 234_201; gzip 63_849 no Bun 1.4.4 Linux e, somado
  // às medidas acima do Bun 1.3.11, ~63_450 no Linux e ~65_850 no Windows.
  // 28/10: o Jogo 3D publica quantos modelos ainda estão chegando (`__szModelosPendentes`), e o
  // executor dos objetivos só aperta a primeira tecla com zero. Medido: 234_374 (+173).
  // 29/10: os botões da vista no canto do "Mostrar a cena inteira" (aproximar, afastar, girar
  // para os dois lados e voltar ao começo), pedido dela: sem eles ninguém sabia que a rodinha e o
  // arrastar existiam. +2_105 / +714. Medido: 236_479; gzip 64_563 no Bun 1.4.4 Linux.
  // 29/10: o "Fazer andar com as setas" respeita o "marcar … como sólido" (a pedra e os coqueiros
  // da Ilha), deslizando junto do obstáculo, com uma caixa por pedaço do modelo (sem as peças
  // szSemCaixa) e a pegada do personagem. +1_537 / +529. Medido: 238_016; gzip 65_092 no Bun
  // 1.4.4 Linux.
  // 29/10: a correção 7b8cb510f retira o cubo de reserva das colisões, do toque e do raycast
  // depois de carregar o modelo, inclusive nas cópias. Acrescenta 481 caracteres nas duas
  // variantes. Medição isolada: 238_497; gzip Bun 1.3.11 Linux 64_810 / Windows 67_291;
  // Bun 1.4.4 Linux 65_235. O teto cobre os compressores medidos, sem mudar o runtime.
  // 19/11: integração remota 97028f4f3 dos cenários Molda no Jogo 3D (runtimeScene),
  // mais o ciclo de vida compartilhado: +10_179 caracteres. Medido no Bun 1.3.11,
  // fonte 386eb685b: 248_676 caracteres; gzip Linux 67_504 / Windows 70_105.
  // Antes (e193c8f8f): 238_497; gzip Linux 64_810 / Windows 67_291.
  // Evidência: execução 44586083565 e docs/pinta-cenarios/qa/ci-medidas-2026-11-19.
  // Ajuste restrito à guarda de QA; não modifica os motores 3D.
  // 20/11, decisão da dona (revisão completa da missão, achado T1): o cenário do Molda só
  // entra no jogo que usa cenário (`sceneVariant.ts`), e a catraca passa a ter as duas
  // variantes. Com cenário: teto próprio, na medida mais uma folga pequena. Sem cenário:
  // teto no valor medido, cerca de 1% acima do de antes de 19/11 por causa do que a
  // integração pôs no motor base, fora do fragmento. A liberação do mapa de sombra no
  // Recomeçar (88c6dfb50, tirada em 72e091418) volta nas duas.
  // Gzip Linux de cada entrada: medido no CI (job contracts da homologação 44729611073; o
  // teste registra o medido no log), com folga de ~0,2%.
  // Completo (kit e cenário), o de quem chama sem contexto. Medido 20/11 (Bun 1.3.11, com a
  // sombra): 248_765 caracteres; gzip Windows 70_123. Linux medido no CI em 386eb685b (89
  // caracteres a menos): 67_504.
  {
    extension: gameThreeDExtension,
    maxChars: 248_900,
    maxGzipBytes: 67_650, // Linux medido: 67_520
    maxGzipBytesWindows: 70_250,
  },
  // Sem cenário, com o kit. Medido: 241_722 caracteres; gzip Windows 68_289. Antes de 19/11
  // (e193c8f8f): 238_497 / Linux 64_810 / Windows 67_291 (teto 238_550). A diferença,
  // estimada pelo diff do motor: renderer mantido no Recomeçar ~700, ganchos do cenário na
  // física/câmera/laço ~1_000, substituto do fragmento ~490, `pageHide`/BFCache compartilhado
  // ~130, liberação da sombra ~25, outros ajustes da integração ~400.
  {
    extension: gameThreeDExtension,
    variant: 'sem cenário',
    context: { code: 'SZGame3D.loadStage(cena, mapa)' },
    maxChars: 241_800,
    maxGzipBytes: 65_900, // Linux medido: 65_783
    maxGzipBytesWindows: 68_400,
  },
  // ⬇️ Lote 14 do review 3D (P2): o Kit Plataforma (`runtimePlatform.ts`) só entra quando o
  // código do projeto usa um método dele (`game-3d/platformKitVariant.ts`); os outros 20
  // exemplos do catálogo recebem esta variante. O completo, acima, segue sendo o de quem usa o
  // kit e o de quem chama sem contexto. Medido: 181_212 caracteres, 50_501 bytes gzip (o kit
  // custa ~33_500 caracteres e ~9_500 bytes gzip).
  {
    extension: gameThreeDExtension,
    variant: 'sem Kit Plataforma e sem cenário',
    context: { code: 'const cena = SZGame3D.createScene("tela");' },
    // ⚠️ SUBIU com a correção do review de 24/10/2026 (+4_470 / +1_067; o mesmo conjunto da
    // variante completa, acima, menos o do Kit). Medido: 185_682 caracteres, 51_568 bytes gzip.
    // Mesmos recursos nativos, sem o Kit Plataforma: 190_794 / 53_051.
    // 27/10: +2_370, o mesmo da variante completa (acima). Medido: 193_164 / 52_171.
    // 27/10, luz do motor: as duas constantes de luz. Medido: 193_242.
    // 27/10, +257 do carregador comum (o que não faz sombra). Medido: 193_499.
    // Mesmo percurso iniciante: 196_254 caracteres; gzip Bun 1.3.11 Linux 52_811 /
    // Windows 54_908. O teto cobre ambos, sem incluir o Kit Plataforma.
    // 28/10, a vista do jogador no frameScene (ver acima): +3_865 / +1_215. Medido: 200_119;
    // gzip 54_371 no Bun 1.4.4 Linux; ~54_030 no Linux e ~56_120 no Windows do Bun 1.3.11.
    // 28/10, os modelos pendentes (ver acima): +173. Medido: 200_292.
    // 29/10, os botões da vista (ver acima): +2_105 / +684. Medido: 202_397; gzip 55_055.
    // 29/10, o andar com as setas respeita os sólidos (ver acima): +1_175 / +408. Medido: 203_572;
    // gzip 55_463.
    // 29/10: o andar com as setas respeita o sólido (ver acima). Medido: 203_934; gzip 55_608.
    // Mesma correção do cubo de reserva: 204_415; gzip Bun 1.3.11 Linux 55_387 /
    // Windows 57_577; Bun 1.4.4 Linux 55_749. Crescimento funcional, sem Kit adicional.
    // 19/11: mesma integração de cenas, +10_179 caracteres, sem incluir o Kit.
    // Bun 1.3.11: 214_594; gzip Linux 58_082 / Windows 60_393.
    // Antes: 204_415; gzip Linux 55_387 / Windows 57_577. Evidência acima.
    // 20/11 (decisão acima): este contexto não usa cenário. Medido: 207_640 caracteres; gzip
    // Windows 58_573. A mesma composição da variante "sem cenário" do Jogo 3D.
    maxChars: 207_700,
    maxGzipBytes: 56_450, // Linux medido: 56_343
    maxGzipBytesWindows: 58_700,
  },
  // Com cenário, sem o kit. Medido 20/11: 214_683 caracteres; gzip Windows 60_412. Linux
  // medido no CI em 386eb685b (89 caracteres a menos): 58_082.
  {
    extension: gameThreeDExtension,
    variant: 'sem Kit Plataforma, com cenário',
    context: {
      code: 'const cena = SZGame3D.createScene("tela"); SZGame3D.loadScene(cena, "ilha")',
    },
    maxChars: 214_800,
    maxGzipBytes: 58_250, // Linux medido: 58_099
    maxGzipBytesWindows: 60_550,
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
  // 19/11: cef2ebd8a integra cenários compilados ao Mundo 3D: terreno, apoio,
  // colisões e descarte. O fragmento novo mede 9_585 caracteres; o runtime completo
  // mede 357_521 caracteres / 106_864 bytes gzip no Windows (Bun 1.3.11).
  // Tetos próximos da medida, com gzip limitado a 107_000 nas duas plataformas.
  // A execução Linux do CI continua conferindo seu compressor real.
  // 20/11 (decisão acima): este é o completo, com cenário. Medido: 357_367 caracteres; gzip
  // Windows 106_823; Linux 102_838 (achado T3 fechado: o Linux tem medição própria).
  {
    extension: worldThreeDExtension,
    maxChars: 357_450,
    maxGzipBytes: 102_950,
    maxGzipBytesWindows: 106_950,
  },
  // Sem cenário. Medido: 349_931 caracteres; gzip Windows 104_710. Antes de 19/11: 346_415 /
  // Windows 103_642 (teto 346_500). A diferença é da mesma natureza da do Jogo 3D: ganchos do
  // cenário no motor (terreno, água, chegada, colisão, câmera), o substituto do fragmento e o
  // `pageHide`/BFCache compartilhado.
  {
    extension: worldThreeDExtension,
    variant: 'sem cenário',
    context: { code: 'SZWorld3D.setup({ style: "floresta" })' },
    maxChars: 350_000,
    maxGzipBytes: 100_900, // Linux medido: 100_755
    maxGzipBytesWindows: 104_850,
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
  // 19/11: integração de cenários no Avançado em 2932075e4: +10_079 caracteres
  // e +2_830 bytes gzip Linux em relação a 81dfb3d8d. Medição independente no CI
  // 44600643248: 220_689 caracteres / 62_564 gzip; Windows: 64_974 gzip.
  // SHA-256 do texto idêntico nos dois sistemas: 0e4887f24178b829c7c90aa064322e53d41d483185123767084b7433061807b7.
  // 20/11 (decisão acima): este é o completo, com cenário; o texto não mudou (220_689).
  // 21/11 (lote 4 da missão, seção 8.4): os tetos de faíscas e enfeites passaram a avisar, e os
  // comentários no fim das linhas de `var` foram para uma linha própria (o compactar só tira a
  // linha inteira; no fim da linha eles iam para o jogo). Medido no Windows: 218_501 caracteres,
  // 63_889 gzip (antes 220_689 / 64_974). O gzip do Linux sai do log do CI; até lá, o teto dele
  // desceu pela mesma proporção (o Linux mediu 96,3% do Windows em 19/11), com folga pequena.
  {
    extension: gameKit3DExtension,
    maxChars: 218_600,
    maxGzipBytes: 61_750,
    maxGzipBytesWindows: 64_000,
  },
  // Sem cenário. Medido: 213_058 caracteres; gzip Windows 62_755. Antes de 19/11 (81dfb3d8d):
  // 210_644 / Windows 62_048 (teto 210_700). Mesma natureza: ganchos do cenário na física, na
  // câmera e na fábrica do projeto, o substituto do fragmento e o `pageHide`/BFCache.
  {
    extension: gameKit3DExtension,
    variant: 'sem cenário',
    context: { code: 'SZGameKit3D.setup({ width: 640, height: 360 })' },
    // 21/11 (lote 4): 210_870 caracteres, 61_667 gzip no Windows (antes 213_058 / 62_755).
    maxChars: 210_950,
    maxGzipBytes: 59_600, // Linux medido em 20/11: 60_422; estimado em 21/11: ~59_380
    maxGzipBytesWindows: 61_800,
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
      const gzipBytes = Bun.gzipSync(source).byteLength
      // O medido vai ao log: é assim que o CI fornece o gzip de cada plataforma.
      console.log(
        `[catraca 3D] ${name}: ${source.length} caracteres, ${gzipBytes} bytes gzip (${process.platform})`,
      )
      expect(source.length).toBeLessThanOrEqual(maxChars)
      expect(gzipBytes).toBeLessThanOrEqual(gzipLimit)
      // Anti-vácuo: um runtime vazio ou só com o import passaria em qualquer teto.
      expect(source.length).toBeGreaterThan(maxChars * 0.5)
    })
  }
})
