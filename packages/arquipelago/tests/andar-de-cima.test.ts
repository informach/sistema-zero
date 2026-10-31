import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  type AndarDeCima,
  criarSalvamentoInicial,
  type Obra,
} from '@sistemazero/arquipelago-contracts'
import { criarLojaDaConstrucao, type FonteDoAndar } from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import {
  ALTURA_DO_ANDAR,
  andarDaObra,
  caixaDeAntesDoAndar,
  caixasDoPiso,
  celulaDeChegada,
  celulaDeEntrada,
  celulasDaEscada,
  conferirAndar,
  FALA_DO_ANDAR,
  guardaCorpos,
  loteDeCima,
  lugarDaEscada,
  noDoAndar,
  obraDeCima,
  POSICAO_DO_ANDAR,
  pecasDoAndar,
  pecasVisiveisDoAndar,
  pisoDeCima,
  plantaDeCima,
  podeTerAndar,
  porEscada,
  rumoDaEscada,
  tirarEscada,
  vaoNaParede,
} from '../src/sistemas/construcao/andar'
import { planta } from '../src/sistemas/construcao/comodos'
import { LOTE_DA_CASA } from '../src/sistemas/construcao/lote'
import { esticarParede, porAbertura } from '../src/sistemas/construcao/obra'
import { NADA_CORTADO, TUDO_CORTADO } from '../src/sistemas/construcao/pecas'
import { carregarGlb } from './ajuda-colisores'

const LOTE = LOTE_DA_CASA

/** A obra inicial com um cômodo à esquerda do quarto (x -12 a -6, z -8 a 0). */
function obraComSala(): Obra {
  let obra = structuredClone(LOTE.obraInicial) as Obra
  for (const [a, b] of [
    [
      { x: -12, z: -8 },
      { x: -12, z: 0 },
    ],
    [
      { x: -12, z: -8 },
      { x: -6, z: -8 },
    ],
    [
      { x: -12, z: 0 },
      { x: -6, z: 0 },
    ],
  ] as const) {
    const r = esticarParede(obra, LOTE, a, b)
    if (!r.ok) throw new Error(r.motivo)
    obra = r.obra
  }
  return obra
}

const PE = { x: -10, z: -2 }

function comEscada(obra: Obra): AndarDeCima {
  const r = porEscada(null, obra, LOTE, PE, 0)
  if (!r.ok) throw new Error(r.motivo)
  return r.andar
}

describe('o andar de cima da casa (E04, Pico)', () => {
  test('só do Pico em diante', () => {
    expect(podeTerAndar(POSICAO_DO_ANDAR - 1)).toBe(false)
    expect(podeTerAndar(POSICAO_DO_ANDAR)).toBe(true)
  })

  test('a escada sobe para -z no giro 0 e gira como o kit', () => {
    expect(rumoDaEscada(0)).toEqual({ dx: 0, dz: -1 })
    expect(rumoDaEscada(1)).toEqual({ dx: -1, dz: 0 })
    expect(rumoDaEscada(2)).toEqual({ dx: 0, dz: 1 })
    expect(rumoDaEscada(3)).toEqual({ dx: 1, dz: 0 })
    const e = { ...PE, giro: 0 }
    expect(celulasDaEscada(e)).toEqual([
      { x: -10, z: -2 },
      { x: -10, z: -3 },
      { x: -10, z: -4 },
      { x: -10, z: -5 },
    ])
    expect(celulaDeEntrada(e)).toEqual({ x: -10, z: -1 })
    expect(celulaDeChegada(e)).toEqual({ x: -10, z: -6 })
    // A origem da peça é o meio do pé, na linha da grade.
    expect(lugarDaEscada(e)).toEqual({ x: -9.5, z: -1, giro: 0 })
  })

  test('a escada vai num cômodo, fora do quarto, com entrada e chegada', () => {
    const obra = obraComSala()
    expect(porEscada(null, obra, LOTE, PE, 0).ok).toBe(true)
    // No quarto não.
    expect(porEscada(null, obra, LOTE, { x: 0, z: -2 }, 0)).toEqual({
      ok: false,
      motivo: 'no-quarto',
    })
    // Fora de casa não.
    expect(porEscada(null, obra, LOTE, { x: -10, z: 5 }, 0)).toEqual({
      ok: false,
      motivo: 'fora-de-casa',
    })
    // O pé encostado na parede da frente: a entrada cairia fora de casa.
    expect(porEscada(null, obra, LOTE, { x: -10, z: -1 }, 0)).toEqual({
      ok: false,
      motivo: 'sem-entrada',
    })
    // Subindo até a parede do fundo: a chegada cairia fora de casa.
    expect(porEscada(null, obra, LOTE, { x: -10, z: -5 }, 0)).toEqual({
      ok: false,
      motivo: 'sem-saida',
    })
    // Só uma escada.
    expect(porEscada(comEscada(obra), obra, LOTE, PE, 0)).toEqual({
      ok: false,
      motivo: 'ja-tem-escada',
    })
  })

  test('o piso de cima cobre a casa inteira menos o vão, com guarda-corpo na beira', () => {
    const obra = obraComSala()
    const andar = comEscada(obra)
    const p = planta(obra, LOTE)
    const piso = pisoDeCima(andar, p)
    expect(piso.size).toBe(p.dentro.size - 4)
    for (const c of celulasDaEscada(andar.escada as never))
      expect(piso.has(`${c.x},${c.z}`)).toBe(false)
    const pc = plantaDeCima(andar, LOTE)
    const guardas = guardaCorpos(andar, p, pc)
    // O contorno da casa: (6 + 12) × 2 de largura e 8 × 2 de fundo, sem nenhuma parede de cima.
    expect(guardas).toHaveLength(2 * 18 + 2 * 8)
    expect(guardas.every((g) => g.no === 'guarda-corpo-andar' && g.arquivo === 'andar')).toBe(true)
    // As caixas do piso cobrem cada célula uma vez, de 4,00 a 4,10.
    const caixas = caixasDoPiso(andar, p)
    const area = caixas.reduce((t, c) => t + c.meio[0] * 2 * c.meio[2] * 2, 0)
    expect(area).toBe(piso.size)
    expect(caixas.every((c) => c.posicao[1] + c.meio[1] === ALTURA_DO_ANDAR)).toBe(true)
  })

  test('lá em cima, as ferramentas de sempre; a parede na beira do piso, a porta entre cômodos', () => {
    const obra = obraComSala()
    const andar = comEscada(obra)
    const lote = loteDeCima(LOTE)
    // Um cômodo de cima em cima do quarto.
    let cima = obraDeCima(andar)
    for (const [a, b] of [
      [
        { x: -6, z: -8 },
        { x: 6, z: -8 },
      ],
      [
        { x: -6, z: 0 },
        { x: 6, z: 0 },
      ],
      [
        { x: -6, z: -8 },
        { x: -6, z: 0 },
      ],
      [
        { x: 6, z: -8 },
        { x: 6, z: 0 },
      ],
      [
        { x: 0, z: -8 },
        { x: 0, z: 0 },
      ],
    ] as const) {
      const r = esticarParede(cima, lote, a, b)
      if (!r.ok) throw new Error(r.motivo)
      cima = r.obra
    }
    const comParedes = andarDaObra(cima, andar.escada)
    expect(conferirAndar(comParedes, obra, LOTE)).toBeNull()
    // Porta entre os dois cômodos de cima: vale.
    const dentro = porAbertura(cima, lote, 'porta', { eixo: 'z', x: 0, z: -4 })
    if (!dentro.ok) throw new Error(dentro.motivo)
    expect(conferirAndar(andarDaObra(dentro.obra, andar.escada), obra, LOTE)).toBeNull()
    // Porta para o ar (a varanda de baixo não tem piso em cima): não.
    const fora = porAbertura(cima, lote, 'porta', { eixo: 'x', x: 2, z: 0 })
    if (!fora.ok) throw new Error(fora.motivo)
    expect(conferirAndar(andarDaObra(fora.obra, andar.escada), obra, LOTE)).toBe('porta-de-fora')
    // Parede no ar, longe do piso.
    const noAr = esticarParede(cima, lote, { x: 10, z: 4 }, { x: 12, z: 4 })
    if (!noAr.ok) throw new Error(noAr.motivo)
    expect(conferirAndar(andarDaObra(noAr.obra, andar.escada), obra, LOTE)).toBe('fora-do-piso')
    // Os textos da criança.
    for (const f of Object.values(FALA_DO_ANDAR)) expect(f).not.toMatch(/[—–!]|^\s*[¿?]/)
  })

  test('o vão encosta na parede só com o lado direito inteiro', () => {
    const obra = obraComSala()
    const andar = comEscada(obra)
    const lote = loteDeCima(LOTE)
    // O lado direito de quem sobe (giro 0) é o +x: a linha x = -9, de z -5 a -1.
    const inteira = esticarParede(obraDeCima(andar), lote, { x: -9, z: -5 }, { x: -9, z: -1 })
    if (!inteira.ok) throw new Error(inteira.motivo)
    const comParede = andarDaObra(inteira.obra, andar.escada)
    expect(conferirAndar(comParede, obra, LOTE)).toBeNull()
    expect(vaoNaParede(comParede, plantaDeCima(comParede, LOTE))).toBe(true)
    const meia = esticarParede(obraDeCima(andar), lote, { x: -9, z: -5 }, { x: -9, z: -3 })
    if (!meia.ok) throw new Error(meia.motivo)
    expect(conferirAndar(andarDaObra(meia.obra, andar.escada), obra, LOTE)).toBe('na-escada')
    const esquerda = esticarParede(obraDeCima(andar), lote, { x: -10, z: -5 }, { x: -10, z: -1 })
    if (!esquerda.ok) throw new Error(esquerda.motivo)
    expect(conferirAndar(andarDaObra(esquerda.obra, andar.escada), obra, LOTE)).toBe('na-escada')
  })

  test('o térreo que quebra o andar é recusado; a escada sai só sem obra em cima', () => {
    const obra = obraComSala()
    const andar = comEscada(obra)
    // Uma parede no meio da escada.
    const r = esticarParede(obra, LOTE, { x: -11, z: -4 }, { x: -9, z: -4 })
    if (!r.ok) throw new Error(r.motivo)
    expect(conferirAndar(andar, r.obra, LOTE)).toBe('parede-no-meio')
    expect(tirarEscada(andar)).toEqual({
      ok: true,
      andar: { escada: null, paredes: [], aberturas: [], pisos: [] },
    })
    const comParede = { ...andar, paredes: [{ x: -6, z: -8, eixo: 'z' as const, n: 8 }] }
    expect(tirarEscada(comParede)).toEqual({ ok: false, motivo: 'escada-com-obra' })
  })

  test('as peças do andar existem nos arquivos e a janela cortada vira a parede baixa', async () => {
    const pasta = join(import.meta.dir, '..', 'src', 'assets', 'casa')
    const andarGlb = await carregarGlb(join(pasta, 'casa-andar.glb'))
    const paredesGlb = await carregarGlb(join(pasta, 'casa-paredes-andar.glb'))
    const obra = obraComSala()
    const andar = comEscada(obra)
    const lote = loteDeCima(LOTE)
    let cima = obraDeCima(andar)
    for (const [a, b] of [
      [
        { x: -6, z: -8 },
        { x: 6, z: -8 },
      ],
      [
        { x: -6, z: 0 },
        { x: 6, z: 0 },
      ],
      [
        { x: -6, z: -8 },
        { x: -6, z: 0 },
      ],
      [
        { x: 6, z: -8 },
        { x: 6, z: 0 },
      ],
      [
        { x: 0, z: -8 },
        { x: 0, z: 0 },
      ],
    ] as const) {
      const r = esticarParede(cima, lote, a, b)
      if (!r.ok) throw new Error(r.motivo)
      cima = r.obra
    }
    for (const [tipo, a] of [
      ['porta', { eixo: 'z', x: 0, z: -4 }],
      // Do cômodo de cima para o piso aberto (em cima da sala): a porta de lambri do andar (B7c).
      ['porta', { eixo: 'z', x: -6, z: -4 }],
      ['janela-grande', { eixo: 'x', x: -4, z: 0 }],
      ['janela-arco', { eixo: 'x', x: 2, z: 0 }],
      ['janela-redonda', { eixo: 'z', x: 6, z: -4 }],
    ] as const) {
      const r = porAbertura(cima, lote, tipo, a)
      if (!r.ok) throw new Error(r.motivo)
      cima = r.obra
    }
    const final = andarDaObra(cima, andar.escada)
    expect(conferirAndar(final, obra, LOTE)).toBeNull()
    const p = planta(obra, LOTE)
    const pc = plantaDeCima(final, LOTE)
    for (const corte of [NADA_CORTADO, TUDO_CORTADO]) {
      const tudo = pecasDoAndar(final, p, pc, corte)
      for (const x of tudo.pecas) {
        const raiz = x.arquivo === 'andar' ? andarGlb : paredesGlb
        expect([x.arquivo, raiz.getObjectByName(x.no)?.name]).toEqual([x.arquivo, x.no])
      }
      expect(tudo.telhados.length).toBeGreaterThan(0)
      expect(tudo.telhados.every((t) => (t.y ?? 0) > ALTURA_DO_ANDAR)).toBe(true)
    }
    const emPe = pecasDoAndar(final, p, pc, NADA_CORTADO)
    expect(emPe.folhas).toHaveLength(2)
    // Entre os dois cômodos de cima, a porta lisa do andar com a folha de dentro; do cômodo para o
    // piso aberto, a de lambri do andar com a folha `porta`, como o térreo faz com a família.
    const portas = (pecas: readonly { no: string; x: number; z: number }[]) =>
      pecas
        .filter((x) => x.no.startsWith('parede-porta-'))
        .map((x) => [x.no, x.x, x.z])
        .sort()
    expect(portas(emPe.pecas)).toEqual([
      ['parede-porta-lambri-andar', -6, -3.5],
      ['parede-porta-lisa-andar', 0, -3.5],
    ])
    expect(emPe.folhas.map((f) => [f.no, f.x, f.z, f.y]).sort()).toEqual([
      ['porta', -6, -3.5, ALTURA_DO_ANDAR],
      ['porta-interna', 0, -3.5, ALTURA_DO_ANDAR],
    ])
    expect(portas(pecasDoAndar(final, p, pc, TUDO_CORTADO).pecas)).toEqual([
      ['parede-porta-lambri-baixa-andar', -6, -3.5],
      ['parede-porta-lisa-baixa-andar', 0, -3.5],
    ])
    // O lambri (o -Y local, que gira para -z no giro 0) fica do lado do piso aberto (x < -6): a
    // parede de eixo z com o dentro em +x gira -90°, como no térreo (`giroDaParede`).
    const lambri = emPe.pecas.find((x) => x.no === 'parede-porta-lambri-andar')
    expect(lambri?.giro).toBeCloseTo(-Math.PI / 2, 6)
    expect(noDoAndar('parede-janela-arco-lambri-baixa')).toBe('parede-lambri-baixa-andar')
    expect(noDoAndar('quina-lisa')).toBe('quina-lisa-andar')
    expect(noDoAndar('parede-porta-lambri-baixa')).toBe('parede-porta-lambri-baixa-andar')
    expect(noDoAndar('parede-porta-lisa')).toBe('parede-porta-lisa-andar')
    // Com o andar escondido (dentro de casa no térreo, Construir do térreo), só a escada aparece:
    // ela fica de pé no térreo e é subida pelos colisores do arquivo.
    expect(pecasVisiveisDoAndar(emPe, true)).toBe(emPe.pecas)
    expect(pecasVisiveisDoAndar(emPe, false).map((x) => x.no)).toEqual(['escada-interna'])
    // A reserva enquanto o kit do andar não chega: o piso de cima é uma laje fina na altura dele,
    // as paredes de cima ficam em cima dele (as cortadas com 1,0), e o resto espera o arquivo.
    for (const x of [...emPe.pecas, ...pecasDoAndar(final, p, pc, TUDO_CORTADO).pecas]) {
      const c = caixaDeAntesDoAndar(x)
      if (
        x.no.startsWith('piso-andar-vao') ||
        x.no === 'escada-interna' ||
        x.no === 'guarda-corpo-andar'
      )
        expect({ no: x.no, c }).toEqual({ no: x.no, c: null })
      else if (x.no.startsWith('piso-andar-'))
        expect({ no: x.no, y: c?.y, altura: c?.altura }).toEqual({
          no: x.no,
          y: ALTURA_DO_ANDAR - 0.05,
          altura: 0.1,
        })
      else {
        // Paredes e quinas de cima: o pé no piso de cima.
        expect({ no: x.no, pe: c ? c.y - c.altura / 2 : null }).toEqual({
          no: x.no,
          pe: ALTURA_DO_ANDAR,
        })
        expect(c?.altura).toBe(x.no.endsWith('-baixa-andar') ? 1 : 4)
      }
    }
  })

  test('a loja do Construir põe a escada, constrói lá em cima, desfaz e segura o térreo', () => {
    const obra = obraComSala()
    const falas: string[] = []
    const loja = criarLoja({
      salvamento: {
        ...criarSalvamentoInicial(new Date('2026-10-31T12:00:00Z')),
        casa: { portaNova: true },
        construcao: {
          ...criarSalvamentoInicial(new Date('2026-10-31T12:00:00Z')).construcao,
          casa: obra,
        },
      },
      jornada: POSICAO_DO_ANDAR,
      quarto: QUARTO_DE_EXEMPLO,
      avatar: {} as never,
      acesso: {
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
        contabilizaTempo: false,
      },
      aoMudar: () => {},
    })
    const dizer = loja.getState().dizer
    loja.setState({
      dizer: (f: string) => {
        falas.push(f)
        dizer(f)
      },
    } as never)
    const caixa: { andar: AndarDeCima | null } = { andar: null }
    const fonte: FonteDoAndar = {
      ler: () => caixa.andar,
      gravar: (a) => {
        caixa.andar = a
      },
    }
    const construcao = criarLojaDaConstrucao(loja)
    const s = () => construcao.getState()
    s().registrarAndar(fonte)
    s().abrir()
    s().escolher('escada')
    // No quarto não; na sala sim.
    expect(s().porAEscada({ x: 0, z: -2 })).toBe(false)
    expect(falas).toContain(FALA_DO_ANDAR['no-quarto'])
    expect(s().porAEscada(PE)).toBe(true)
    expect(caixa.andar?.escada).toEqual({ ...PE, giro: 0 })
    // Lá em cima, uma parede em cima do quarto.
    s().escolherCamada('cima')
    expect(s().ferramenta).toBe('parede')
    const r = esticarParede(
      obraDeCima(caixa.andar),
      loteDeCima(LOTE),
      { x: -6, z: -8 },
      { x: -6, z: 0 },
    )
    expect(s().aplicar(r)).toBe(true)
    expect(caixa.andar?.paredes).toHaveLength(1)
    // A obra do térreo não mudou.
    expect(loja.getState().salvamento.construcao.casa).toBe(obra)
    // No ar, longe do piso: recusa.
    const noAr = esticarParede(
      obraDeCima(caixa.andar),
      loteDeCima(LOTE),
      { x: 10, z: 4 },
      { x: 12, z: 4 },
    )
    expect(s().aplicar(noAr)).toBe(false)
    expect(falas).toContain(FALA_DO_ANDAR['fora-do-piso'])
    // O Desfazer lá em cima volta o andar.
    s().desfazer()
    expect(caixa.andar?.paredes).toHaveLength(0)
    // No térreo, uma parede no meio da escada é recusada; uma longe dela passa.
    s().escolherCamada('chao')
    s().escolher('parede')
    const noMeio = esticarParede(obra, LOTE, { x: -11, z: -4 }, { x: -9, z: -4 })
    expect(s().aplicar(noMeio)).toBe(false)
    expect(falas).toContain(FALA_DO_ANDAR['parede-no-meio'])
    const longe = esticarParede(obra, LOTE, { x: 8, z: -4 }, { x: 10, z: -4 })
    expect(s().aplicar(longe)).toBe(true)
    // A escada sai com o andar vazio.
    expect(s().tirarAEscada()).toBe(true)
    expect(caixa.andar).toEqual({ escada: null, paredes: [], aberturas: [], pisos: [] })
  })

  test('Desfazer no térreo não tira o chão do andar de cima (N2)', () => {
    const falas: string[] = []
    const inicial = criarSalvamentoInicial(new Date('2026-10-31T12:00:00Z'))
    const loja = criarLoja({
      salvamento: {
        ...inicial,
        casa: { portaNova: true },
        construcao: { ...inicial.construcao, casa: structuredClone(LOTE.obraInicial) as Obra },
      },
      jornada: POSICAO_DO_ANDAR,
      quarto: QUARTO_DE_EXEMPLO,
      avatar: {} as never,
      acesso: {
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
        contabilizaTempo: false,
      },
      aoMudar: () => {},
    })
    const dizer = loja.getState().dizer
    loja.setState({
      dizer: (f: string) => {
        falas.push(f)
        dizer(f)
      },
    } as never)
    const caixa: { andar: AndarDeCima | null } = { andar: null }
    const construcao = criarLojaDaConstrucao(loja)
    const s = () => construcao.getState()
    s().registrarAndar({
      ler: () => caixa.andar,
      gravar: (a) => {
        caixa.andar = a
      },
    })
    s().abrir()
    // A sala à esquerda do quarto, parede por parede, pelo Construir (o Desfazer lembra cada uma).
    for (const [a, b] of [
      [
        { x: -12, z: -8 },
        { x: -12, z: 0 },
      ],
      [
        { x: -12, z: -8 },
        { x: -6, z: -8 },
      ],
      [
        { x: -12, z: 0 },
        { x: -6, z: 0 },
      ],
    ] as const) {
      const obra = loja.getState().salvamento.construcao.casa as Obra
      expect(s().aplicar(esticarParede(obra, LOTE, a, b))).toBe(true)
    }
    s().escolher('escada')
    expect(s().porAEscada(PE)).toBe(true)
    const casa = () => loja.getState().salvamento.construcao.casa as Obra
    expect(conferirAndar(caixa.andar, casa(), LOTE)).toBeNull()
    // De volta à Parede, no térreo: desfazer a última parede abriria a sala da escada.
    s().escolher('parede')
    const antes = casa()
    s().desfazer()
    expect(casa()).toBe(antes)
    expect(conferirAndar(caixa.andar, casa(), LOTE)).toBeNull()
    expect(falas).toContain(FALA_DO_ANDAR['quebra-o-andar'])
  })
})
