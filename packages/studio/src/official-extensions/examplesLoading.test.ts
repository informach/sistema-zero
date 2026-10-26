import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { loadExtensionExamples } from '#extensions'
import { OFFICIAL_CATALOG } from './index'

// 02/10: the two snow examples use animated sprites and the new automatic scene blocks.
const goldenCatalogs = {
  'game-2d': {
    // ⚠️ 33 até 13/09/2026: a fatia de SPRITES DE TEXTO somou "Chuva de números" e "Quiz de
    // números", os dois no TOPO da lista — então mudam a contagem E a ordem, e o hash muda por
    // causa das duas coisas. Conferido recalculando os cinco catálogos: os outros quatro
    // bateram com o golden que já estava aqui, o que prova que o cálculo é o mesmo do teste.
    // 01/10: Descida da Neve entra no topo; o hash dos exemplos anteriores é idêntico.
    count: 45,
    // ⚠️ Mudou em 09/08: os exemplos de plataforma passaram a usar os contratos
    // explícitos de terreno, Mundo e Fase em vez dos encaixes de tela legados; Reino Zero
    // agora documenta a seleção de jogadores e preserva o sobrevivente após uma morte.
    // ⚠️ Mudou em 12/08: o Reino Zero teve a geometria das 32 fases refeita (cano de duas
    // colunas assentado sobre o chão, poço limitado ao alcance do pulo) e passou a usar o
    // fluxo de Fase do motor, que devolve posição, câmera e blocos `?` ao morrer.
    // ⚠️ Mudou de novo em 12/08: HUD do Reino Zero em duas linhas (cabia só assim nos
    // 256px), sem o escurecimento de tela cheia, e a pisada passou a vir antes do
    // "Atualizar os inimigos" no laço.
    // ⚠️ Mudou uma 4ª vez em 12/08 (full review contra o jogo de referência): o inimigo
    // VOADOR ganhou modo de pisada e bloco de pisada — ele estava em "todos os
    // inimigos", machucava ao encostar e não havia como derrotá-lo, então toda etapa 3
    // tinha um perigo imortal. E os textos voltaram ao português correto (RECOMEÇA com
    // cedilha, "32 FASES / 2 JORNADAS"), agora que a fonte de pixel tem barra e acentos.
    // ⚠️ Mudou uma 5ª vez em 12/08 — a maior delas: as 32 fases deixaram de ser
    // SORTEADAS e viraram plantas escritas à mão, e o TEMA passou a sair do tipo da
    // fase (superfície / subterrâneo / água / castelo) em vez do mundo, que era o que
    // fazia 1-1, 1-2, 1-3 e 1-4 dividirem o mesmo céu azul. Entraram a peça de moeda e
    // a lava do castelo, as duas usando o papel novo "atravessa e avisa".
    // ⚠️ E o power-up deixou de ser um NO-OP: o herói começa pequeno (1 de vida, teto
    // 2), o broto o deixa grande e levar dano ENCOLHE em vez de matar. A figura segue
    // a vida, então quem está forte aparece diferente na tela.
    // ⚠️ 6ª vez em 12/08: o HUD passou para UMA tipografia só (a de pixel, via o bloco
    // novo "Escrever placar pixel"), MUNDO e ETAPA viraram um campo só no formato
    // "1-1" como no original, e VIDAS finalmente aparece na tela — ela existia só na
    // variável, então não dava para saber quantas restavam nem de quem era a vez.
    // ⚠️ 7ª vez em 12/08: as mecânicas que faltavam. O portal virou MASTRO de 9 tiles
    // e a altura do toque paga; entrou a ESTRELA de invencibilidade (o encostão passa
    // a derrotar) e a PLANTA que sai do cano e não aceita pisada. O voador deixou de
    // ser a única posição de inimigo escrita na mão.
    // ⚠️ 8ª vez em 13/08: descritor único de fase, larguras autorais, água/atalhos
    // coerentes, power-ups móveis, 100 moedas, tijolos, fogo, barras de fogo, chefes
    // progressivos e uma segunda jornada com composição própria.
    // ⚠️ 9ª vez em 13/08 (full review do lote acima): morrer sem zerar a vida devolvia
    // o herói GRANDE; a estrela passou a TIRAR DO GRUPO em vez de mudar a vida (o
    // espinho é imortal e sobrevivia, pagando 200 pontos por quadro) e agora também
    // cobre a barra de fogo e o tiro do chefe; o bloco `?` dá moeda OU prêmio, nunca
    // os dois; e as partículas de derrota finalmente são desenhadas.
    // ⚠️ 10ª vez em 13/08: campanha compacta/lazy, elencos próprios por fase e
    // jornada, animação do herói, dois jogadores independentes e novos inimigos.
    // ⚠️ 11ª vez em 14/08: Duelo de Heróis passou a acertar durante toda a
    // janela visível do golpe e a tratar duplo nocaute como empate.
    // ⚠️ 12ª vez em 14/08: o Pong foi reescrito sobre os facilitadores novos —
    // o rebote nas raquetes (eram ~110 linhas de IR), o quique no teto e no chão
    // e as setas viraram um bloco cada, e o tamanho do campo saiu das contas
    // (440/300 cravados → "a largura/altura da tela"). A IR do exemplo encolheu
    // de 1036 para 733 linhas.
    // 13/09: sons consolidados e temporizadores com contexto de quadro explícito.
    // 22/09: no Reino Zero, "jornada" virou "volta" — a palavra passou a ser
    // do conceito de produto (Jornada do Criador), e duas coisas com o mesmo
    // nome na mesma tela do Estúdio confundem a criança.
    // 01/10, full review das camadas: na Descida da Neve cada tecla virou uma
    // pergunta só (os motores já ignoram maiúsculas; a fonte perguntava "p" e "P"
    // e a criança via dois blocos idênticos lado a lado), e o brilho da batida
    // passou a apagar também nas telas de pausa e de fim.
    // 20/10: o conceito "inteligência artificial" do Gorilas vs Robô virou "robô
    // adversário" (a tela nomeia o recurso, sem "IA"; pedido da dona).
    // Review 25/10: fontes sem página, progressão editorial e nove receitas.
    // Full review: I keeps the fixed Pinta image until Space or restart.
    sha256: 'dd303c288819aea53b1b13ff9dfed28e74a288de1b88e69913473f1a46fe79c6',
  },
  'game-2d-advanced': {
    // 01/10: Descida da Neve entra no FIM da vitrine ("Meu primeiro jogo" continua
    // abrindo); os demais exemplos permanecem idênticos.
    count: 48,
    // Reino Zero Pro passou a carregar a campanha validada de 32 fases.
    // 14/08: as 32 grades deixaram de ser geradas por resto de divisão e viraram
    // plantas escritas à mão (`examples/reinoZeroProLevels.ts`), com o tema
    // saindo do TIPO da fase, e a aventura subiu para a versão 2 (save v1 guarda
    // checkpoint em PIXELS e cairia dentro da rocha nova). Muda a geometria
    // inteira, logo muda o hash.
    // ⚠️ 15/08, full review do lote acima: a altura das plataformas caiu de 3
    // para 2 células. O pé do herói sobe 40 px (2,5 células), então NADA a 3 era
    // alcançável — a camada vertical inteira era decoração e as três fases de
    // poço largo eram intransponíveis. Mexe em toda fase, logo mexe no hash.
    // ⚠️ Ainda em 15/08: as fases aquáticas ganharam piscinas de quatro células,
    // alinhadas ao piso das margens, em vez de uma película no fundo do palco.
    // 02/10 revisão: neve intermediária com movimento, controles, vida, HUD e telas nativas separados.
    // Review 25/10: desenho nativo, progressão editorial e dez receitas.
    sha256: 'f8404302aa7b22d4b8121d3a2e75d9a0000caac50a95d68d3647dc4787998c30',
  },
  'game-3d': {
    count: 21,
    // 24/10 (review 3D, lotes 3-4): enxame virou grupo, a câmera virou um modo e a API
    // passou a falar em graus e "por segundo"; os 19 exemplos foram regerados.
    // 24/10 (lote 5): o "Desvie" troca o stop pelo "Fim de jogo" e o "Quando na fase …
    // acontecer" do Reino Cogumelo passou a morar em ⚡ Quando acontecer.
    // 24/10 (lote 7): ordem de progressão (demos → jogos simples → maiores → kits), dois
    // novos ("Pega-Estrelas" e "Meu herói do Molda", com o GLB do Molda embutido), o
    // "Desvie" com corações/pontos/fim, a "Corrida Infinita 3D" sem HTML de placar e os
    // giros de 1375-5500 graus/s corrigidos para 45-180.
    // 24/10 (correção do review): o Pega-Estrelas conta os 30 s com a contagem que APARECE
    // ("Começar a contagem" + "Quando a contagem acabar") em vez do "Depois de 30 s".
    // 25/10: os 19 exemplos de página foram convertidos para cenas/HUD/controles
    // nativos. Os 21 preservam ordem e passam no contrato sem HTML/CSS e nos
    // round-trips. Os outros quatro catálogos mantêm seus hashes anteriores.
    sha256: '6c88448e40c568ee1c291db4d7d5926078ded206dba240536f29be0d638bdd57',
  },
  'game-3d-advanced': {
    count: 20,
    // 24/10 (review 3D, lote 11): placar, telas, fim, contagem, sorteio e tremor passaram a ser
    // as regras de jogo compartilhadas (g3k:cornerText, g3k:screenText "inicio",
    // g3k:gameOver "perdeu", g3k:random inteiro, g3k:timer, g3k:shakeCamera), e as teclas são
    // as do dropdown comum (KeyW, Space, ArrowUp, Enter; o Mundo de Blocos troca o bloco com
    // E/Q/F e recicla com Enter, o Tiro ao Alvo abre a dica com E).
    // 24/10 (lote 12): ordem nova (Tiro ao Alvo primeiro, do mais simples ao mais conceitual;
    // a Defesa da Torre abre os Profissional) e dois exemplos novos depois do Chefão: "Arena dos
    // Cristais" (patrulha, mochila, fases e recorde) e "Herói do Molda" (o .glb com ossos do
    // Molda como asset model3d, animação por estado).
    // 24/10 (cobertura total dos blocos): entra a "Noite das Fogueiras" depois do Herói do Molda
    // (céu .hdr e dois .wav montados por código), e seis exemplos ganham os blocos que faltavam
    // (Salto: cair/velocidade/voltar ao menu; Guardião: parar de nascer/tirar todos; Chefão: o
    // tamanho do mundo; Herói do Molda: tocar/parar a animação e o floco de gelo; Rebanho: clique
    // mostra o estado; Lenda: o golpe empurra e o monstro freia).
    // 24/10 (review dos exemplos do Avançado): Lenda com o golpe no APERTO e recarga (segurar
    // o espaço parado não vence); Arena com o guarda da fase 2 longe do herói, o "Fase N!" e a
    // tela "fim" que serve aos dois jeitos de perder; Salto (nuvens 3 m acima do chão) e
    // Parkour (chão de lava) perdem ao pisar no chão lá embaixo; Noite e Tiro pausam na dica
    // (o Tiro ganha o "Prepare a mira!" que se fecha sozinho); Guardião sem "semente".
    sha256: '2b3f2a8858b2511160af0e4e72aa6082ad36dee8002452941b2d51fb60c820f0',
  },
  'world-3d': {
    count: 14,
    // 24/10 (review 3D, lote 8): nomes com acento, ordem nova da vitrine, os três mundos de
    // referência com nomes próprios (sem marca de outro estúdio), cantos da lista única
    // (top-left…) e textos do mundo acentuados.
    // 24/10 (lote 10): o "Escrever no canto" e o "Tremer a câmera" passaram a ser os das
    // regras de jogo compartilhadas (w3d:cornerText / w3d:shakeCamera) em sete exemplos, e
    // entrou o "Caça às Estrelas" (coletáveis, pontos, vida, cronômetro e telas) depois do
    // Parque dos Brinquedos.
    sha256: '5dc441d78502fc7ce2234d49e0c0ddc602dbd3de2f0d2b72887baed4e5043540',
  },
} as const

describe('catálogos lazy das extensões oficiais', () => {
  it('preserva quantidade e ordem da saída validada e sanitizada', async () => {
    for (const extension of OFFICIAL_CATALOG) {
      const golden = goldenCatalogs[extension.manifest.id as keyof typeof goldenCatalogs]
      expect(extension.examples.count).toBe(golden.count)
      expect('examples' in extension.manifest).toBe(false)

      const examples = await loadExtensionExamples(extension)
      const sha256 = createHash('sha256').update(JSON.stringify(examples)).digest('hex')
      expect(examples).toHaveLength(golden.count)
      expect(sha256).toBe(golden.sha256)
    }
  })

  it('mantém os IRs pesados fora do chunk inicial do catálogo', async () => {
    const build = await Bun.build({
      entrypoints: [resolve(import.meta.dir, 'index.ts')],
      target: 'browser',
      minify: true,
      splitting: true,
      write: false,
    } as Parameters<typeof Bun.build>[0])
    expect(build.success).toBe(true)

    const entry = build.outputs.find((output) => output.kind === 'entry-point')
    expect(entry).toBeDefined()
    if (!entry) throw new Error('build sem entry-point')

    expect(entry.size).toBeLessThan(800_000)
    expect(Bun.gzipSync(new Uint8Array(await entry.arrayBuffer())).byteLength).toBeLessThan(230_000)
    const entrySource = await entry.text()
    // The short pedagogical summary names the entry examples. Their content
    // and IR must still stay in the on-demand chunks.
    expect(entrySource).not.toContain(
      'Encoste na moeda para fazer pontos. Use as setas para andar.',
    )
    expect(entrySource).not.toContain('Jogo 2D interativo')
    expect(build.outputs.filter((output) => output.kind === 'chunk').length).toBeGreaterThanOrEqual(
      15,
    )
  })
})
