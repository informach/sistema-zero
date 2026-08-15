import { describe, expect, it } from 'bun:test'
import { CAMPAIGN_PHYSICS } from '../campaignPhysics'
import type { GameKitCampaignStage } from '../campaignSchema'
import {
  ALTURA_DA_PLATAFORMA,
  buildProStage,
  MOEDA_NO_CHAO,
  PRO_STAGE_PLANS,
  proStageTheme,
  reinoZeroProStages,
  type StagePlan,
} from '../examples/reinoZeroProLevels'
import {
  alcanceDoPulo,
  i1FormaDoPalco,
  i2NascimentoDoHeroi,
  i3Saida,
  i4Pocos,
  i5Alcance,
  i6NadaFoiApagado,
  i7EntidadesLivres,
  i8InimigosApoiados,
  i9TemasDoMundo,
  i10TemasComCor,
  i11ItensAlcancaveis,
  i12PlataformasAlcancaveis,
  relatar,
} from './proStageGeometry'

/** Os oito nomes que `proThemeColors` conhece (runtime/campaign.ts). */
const TEMAS_COM_COR = new Set([
  'campo',
  'caverna',
  'agua',
  'neve',
  'deserto',
  'castelo',
  'ceu',
  'vulcao',
])

const planos = PRO_STAGE_PLANS.flat()

function pedidasDe(plan: StagePlan): { premios: number; moedas: number; inimigos: number } {
  return {
    premios: (plan.premios ?? []).length,
    moedas: (plan.moedas ?? []).reduce((soma, [, quantas]) => soma + quantas, 0),
    inimigos: (plan.inimigos ?? []).length,
  }
}

/** Uma fase de mentira, escrita a partir de linhas de texto, para os anti-vácuos. */
function faseCrua(
  tiles: string[],
  entities: GameKitCampaignStage['entities'],
): GameKitCampaignStage {
  return {
    schemaVersion: 1,
    id: 'x-1',
    world: 1,
    order: 1,
    theme: 'campo',
    width: (tiles[0] ?? '').length,
    height: tiles.length,
    tiles,
    entities,
    triggers: [],
    timeLimit: 0,
  }
}

describe('Reino Zero Pro — as invariantes de geometria', () => {
  it('o alcance do pulo é DERIVADO da física, não copiado', () => {
    // Se alguém retunar o pulo ou a gravidade, este número anda sozinho — e é
    // isso que impede a rede de continuar aprovando fases que ficaram grandes
    // demais para o herói novo.
    const alcance = alcanceDoPulo()
    expect(alcance.bruto).toBeCloseTo(
      (CAMPAIGN_PHYSICS.correr * ((2 * CAMPAIGN_PHYSICS.pulo) / CAMPAIGN_PHYSICS.gravidade)) / 16,
      6,
    )
    expect(alcance.cobrado).toBe(4)
    expect(alcance.altura).toBe(2)
    // Anti-vácuo: uma física com o dobro do pulo tem que cobrar mais.
    const forte = alcanceDoPulo({
      pulo: CAMPAIGN_PHYSICS.pulo * 2,
      gravidade: CAMPAIGN_PHYSICS.gravidade,
      correr: CAMPAIGN_PHYSICS.correr,
    })
    expect(forte.cobrado).toBeGreaterThan(alcance.cobrado)
  })

  it('I1 — as 32 fases têm a forma que declaram e só usam peças conhecidas', () => {
    expect(relatar(reinoZeroProStages.flatMap(i1FormaDoPalco))).toBe('')
  })

  it('I2 — em todas as 32 o herói nasce apoiado no chão', () => {
    expect(relatar(reinoZeroProStages.flatMap(i2NascimentoDoHeroi))).toBe('')
  })

  it('I3 — todas têm UMA saída, dentro do palco e com chão embaixo', () => {
    expect(relatar(reinoZeroProStages.flatMap(i3Saida))).toBe('')
  })

  it('I4 — nenhum poço maior do que o pulo sem plataforma móvel', () => {
    expect(relatar(reinoZeroProStages.flatMap((f) => i4Pocos(f)))).toBe('')
  })

  it('⭐⭐ I5 — dá para CHEGAR na saída em todas as 32', () => {
    expect(relatar(reinoZeroProStages.flatMap((f) => i5Alcance(f)))).toBe('')
  })

  it('⭐ I6 — nada que a planta pediu foi apagado por uma peça posterior', () => {
    // No irmão clássico a plataforma da etapa 3 APAGAVA prêmios: medido, 6 dos 9
    // sumiam e a fase inteira ficava com UM. Esta é a rede daquela classe.
    const achados = reinoZeroProStages.flatMap((fase, i) => {
      const plan = planos[i]
      return plan ? i6NadaFoiApagado(fase, pedidasDe(plan)) : []
    })
    expect(relatar(achados)).toBe('')
  })

  it('I7 — nenhuma entidade dentro de sólido nem em cima do espeto', () => {
    expect(relatar(reinoZeroProStages.flatMap(i7EntidadesLivres))).toBe('')
  })

  it('I8 — todo inimigo de chão nasce apoiado, nunca sobre poço', () => {
    expect(relatar(reinoZeroProStages.flatMap(i8InimigosApoiados))).toBe('')
  })

  it('⭐ I11 — toda moeda e todo prêmio estão ao alcance do pulo', () => {
    // A coisa boa que a criança VÊ e nunca pega é o defeito mais frustrante que
    // um jogo de plataforma pode ter, e a primeira leva destas plantas o tinha
    // em todas as 32: plataformas a 4 e 6 células, com o pulo subindo 2,5.
    expect(relatar(reinoZeroProStages.flatMap((f) => i11ItensAlcancaveis(f)))).toBe('')
  })

  it('⭐⭐ I12 — toda plataforma, fixa e móvel, está ao alcance do PÉ', () => {
    // ⚠⚠ A rede que faltava. A I11 media o alcance do CORPO (que serve a moeda,
    // colhida de passagem) e nunca o do PÉ (que serve a plataforma, em que se
    // POUSA). Com uma constante só, em 3, a camada vertical inteira das 32 fases
    // virou decoração e as três fases de poço largo ficaram INTRANSPONÍVEIS — o
    // piloto automático morria com 0 vidas dentro do buraco, com a I4 e a I5
    // aprovando, porque bastava uma móvel ter sido DECLARADA perto do poço.
    expect(relatar(reinoZeroProStages.flatMap((f) => i12PlataformasAlcancaveis(f)))).toBe('')
    // A altura das plataformas é a MEDIDA no motor, não um gosto: 2 células.
    expect(ALTURA_DA_PLATAFORMA).toBe(alcanceDoPulo().altura)
  })

  it('⭐⭐ I9 — as quatro etapas de um mundo NÃO dividem o mesmo céu', () => {
    // O tema saía do MUNDO: 1-1, 1-2, 1-3 e 1-4 tinham o mesmo azul, e o teste
    // que existia (`new Set(themes).size === 8`) passava nos dois esquemas.
    expect(relatar(i9TemasDoMundo(reinoZeroProStages))).toBe('')
  })

  it('I10 — todo tema usado tem cor em proThemeColors', () => {
    expect(relatar(i10TemasComCor(reinoZeroProStages, TEMAS_COM_COR))).toBe('')
    // Anti-vácuo do cruzamento: as duas listas são cópias literais do mesmo
    // contrato e nunca tinham sido cruzadas. A divergência é MUDA (cai no campo).
    expect(
      i10TemasComCor(
        [{ ...reinoZeroProStages[0], theme: 'roxo' } as GameKitCampaignStage],
        TEMAS_COM_COR,
      ),
    ).toHaveLength(1)
  })

  it('⭐⭐ a água forma piscinas, não uma película de uma célula no fundo', () => {
    const fasesDeAgua = reinoZeroProStages.filter((_, index) => planos[index]?.kind === 'agua')
    expect(fasesDeAgua).toHaveLength(8)

    for (const fase of fasesDeAgua) {
      const profundidades = Array.from({ length: fase.width }, (_, col) =>
        fase.tiles.reduce((total, linha) => total + (linha.charAt(col) === '~' ? 1 : 0), 0),
      ).filter((profundidade) => profundidade > 0)

      expect({ fase: fase.id, temAgua: profundidades.length > 0 }).toEqual({
        fase: fase.id,
        temAgua: true,
      })
      expect({ fase: fase.id, todasNavegaveis: profundidades.every((p) => p >= 3) }).toEqual({
        fase: fase.id,
        todasNavegaveis: true,
      })
    }
  })

  it('o tema sai do TIPO e da metade da jornada, e cobre os oito nomes', () => {
    expect(proStageTheme('superficie', 1)).toBe('campo')
    expect(proStageTheme('superficie', 5)).toBe('deserto')
    expect(proStageTheme('castelo', 4)).toBe('castelo')
    expect(proStageTheme('castelo', 8)).toBe('ceu')
    expect(new Set(reinoZeroProStages.map((f) => f.theme))).toEqual(new Set(TEMAS_COM_COR))
  })
})

describe('⚠️ as invariantes MORDEM', () => {
  const CHAO = '################'

  it('I2 pega o herói nascendo dentro da rocha e o que nasce no ar', () => {
    const dentro = faseCrua(['................', CHAO], [{ kind: 'hero', id: 'h', x: 2, y: 1 }])
    expect(i2NascimentoDoHeroi(dentro)).not.toHaveLength(0)
    const noAr = faseCrua(['................', CHAO], [{ kind: 'hero', id: 'h', x: 2, y: -1 }])
    expect(i2NascimentoDoHeroi(noAr)).not.toHaveLength(0)
    const certo = faseCrua(['................', CHAO], [{ kind: 'hero', id: 'h', x: 2, y: 0 }])
    expect(i2NascimentoDoHeroi(certo)).toEqual([])
  })

  it('⭐⭐ I5 RECUSA um poço de 9 células e ACEITA o mesmo poço com plataforma móvel', () => {
    // O par obrigatório: sem ele, um alcance que devolvesse sempre "chegou"
    // passaria nas 32 e daria a impressão de estar protegendo.
    const tiles = ['....................', '####.........#######']
    const entidades: GameKitCampaignStage['entities'] = [
      { kind: 'hero', id: 'h', x: 1, y: 0 },
      { kind: 'exit', id: 's', x: 17, y: 0 },
    ]
    const poco = faseCrua([...tiles], entidades)
    expect(i5Alcance(poco)).not.toHaveLength(0)
    expect(i4Pocos(poco)).not.toHaveLength(0)

    const comMovel = faseCrua(
      [...tiles],
      [...entidades, { kind: 'movingPlatform', id: 'p', x: 8, y: 0, props: { range: 64 } }],
    )
    expect(i5Alcance(comMovel)).toEqual([])
    expect(i4Pocos(comMovel)).toEqual([])
  })

  it('I5 recusa um degrau alto demais e aceita a mesma subida em dois lances', () => {
    const alto = faseCrua(
      ['.........#######', '.........#######', '.........#######', '####.....#######'],
      [
        { kind: 'hero', id: 'h', x: 1, y: 2 },
        { kind: 'exit', id: 's', x: 12, y: -1 },
      ],
    )
    expect(i5Alcance(alto)).not.toHaveLength(0)

    const emDois = faseCrua(
      ['.........#######', '.....##########', '.....##########', '####.##########'],
      [
        { kind: 'hero', id: 'h', x: 1, y: 2 },
        { kind: 'exit', id: 's', x: 12, y: -1 },
      ],
    )
    expect(i5Alcance(emDois)).toEqual([])
  })

  it('⭐ I6 pega a peça que APAGOU o prêmio', () => {
    const plan: StagePlan = {
      kind: 'superficie',
      largura: 20,
      ideia: 'x',
      premios: [[10, '?']],
      moedas: [[6, 3, MOEDA_NO_CHAO]],
      inimigos: [[8, 'walker']],
      checkpoint: 12,
    }
    const fase = buildProStage(1, 1, plan)
    expect(i6NadaFoiApagado(fase, pedidasDe(plan))).toEqual([])

    // ⭐ Prêmio e plataforma na MESMA coluna deixaram de brigar: depois do
    // review as duas alturas são diferentes de propósito (o pé alcança 2, a
    // cabeça alcança 3), então a colisão some POR CONSTRUÇÃO — garantia mais
    // forte que a invariante.
    const comPlataforma = buildProStage(1, 1, { ...plan, plataformas: [[10, 1]] })
    expect(i6NadaFoiApagado(comPlataforma, pedidasDe(plan))).toEqual([])
    expect(comPlataforma.tiles.join('')).toContain('?')

    // A metade que TEM que falhar: sem ela, um contador que devolvesse sempre o
    // esperado passaria nas trinta e duas e pareceria estar protegendo.
    expect(i6NadaFoiApagado(fase, { ...pedidasDe(plan), premios: 5 })).not.toHaveLength(0)
    expect(i6NadaFoiApagado(fase, { ...pedidasDe(plan), moedas: 99 })).not.toHaveLength(0)
  })

  it('⭐ I11 recusa o prêmio pendurado longe demais e aceita o mesmo com plataforma', () => {
    const vazio = '................'
    const longe = faseCrua(['....?...........', vazio, vazio, vazio, vazio, CHAO], [])
    expect(i11ItensAlcancaveis(longe)).not.toHaveLength(0)

    // A MESMA fase com uma plataforma logo abaixo do prêmio: agora dá.
    const comPlataforma = faseCrua(
      ['....?...........', vazio, '....=...........', vazio, vazio, CHAO],
      [],
    )
    expect(i11ItensAlcancaveis(comPlataforma)).toEqual([])

    // Moeda sobre POÇO não é defeito: ela se pega em pleno voo.
    const sobrePoco = faseCrua([vazio, '#####......#####'], [{ kind: 'coin', id: 'm', x: 7, y: 0 }])
    expect(i11ItensAlcancaveis(sobrePoco)).toEqual([])
  })

  it('I7 e I8 pegam a entidade dentro da rocha e o bicho sobre o poço', () => {
    const dentro = faseCrua(['................', CHAO], [{ kind: 'coin', id: 'm', x: 3, y: 1 }])
    expect(i7EntidadesLivres(dentro)).not.toHaveLength(0)
    const sobrePoco = faseCrua(
      ['................', '#####......#####'],
      [{ kind: 'walker', id: 'b', x: 7, y: 0 }],
    )
    expect(i8InimigosApoiados(sobrePoco)).not.toHaveLength(0)
    const apoiado = faseCrua(
      ['................', '#####......#####'],
      [{ kind: 'walker', id: 'b', x: 3, y: 0 }],
    )
    expect(i8InimigosApoiados(apoiado)).toEqual([])
  })

  it('⭐⭐ I12 pega a plataforma alta demais — fixa e móvel', () => {
    const vazio = '................'
    // 2 células acima do chão: o pé chega. 3: não chega (medido no motor).
    const naMedida = faseCrua([vazio, vazio, '....====........', vazio, CHAO], [])
    expect(i12PlataformasAlcancaveis(naMedida)).toEqual([])
    const altaDemais = faseCrua([vazio, '....====........', vazio, vazio, CHAO], [])
    expect(i12PlataformasAlcancaveis(altaDemais)).not.toHaveLength(0)

    // A móvel de 3-2 na linha em que ela nascia antes do conserto: o poço de
    // oito células virava parede, e nada acusava.
    const movelAlta = faseCrua(
      [vazio, vazio, vazio, '####......######'],
      [{ kind: 'movingPlatform', id: 'p', x: 8, y: 0, props: { range: 48 } }],
    )
    expect(i12PlataformasAlcancaveis(movelAlta)).not.toHaveLength(0)
    const movelNaMedida = faseCrua(
      [vazio, '................', vazio, '####......######'],
      [{ kind: 'movingPlatform', id: 'p', x: 8, y: 1, props: { range: 48 } }],
    )
    expect(i12PlataformasAlcancaveis(movelNaMedida)).toEqual([])
  })

  it('I9 pega o esquema antigo, em que o tema saía do MUNDO', () => {
    const iguais = [1, 2, 3, 4].map(
      (order) => ({ ...reinoZeroProStages[0], order, theme: 'campo' }) as GameKitCampaignStage,
    )
    expect(i9TemasDoMundo(iguais)).not.toHaveLength(0)
  })
})
