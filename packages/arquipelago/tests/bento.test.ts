import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  criarSalvamentoInicial,
  MORADOR_NOVO,
  type Morador,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { malhasDosOlhos } from '../src/mundo/animado'
import {
  ANIVERSARIO_DO_BENTO,
  BENTO_NA_VILA,
  type ContextoDaFalaDoBento,
  falasDoBento,
  GOSTOS_DO_BENTO,
  PEDIDOS_DO_BENTO,
  pedidoDoBentoPeloId,
  pedidoDoDiaDoBento,
} from '../src/sistemas/bento'
import { FALA_DA_LANTERNA, ID_DA_LANTERNA } from '../src/sistemas/borroes'
import {
  comecarConversaComOBento,
  entregarAoBento,
  FALA_DA_ENTREGA_AO_BENTO,
  FALA_DO_PRESENTE_DO_BENTO,
  oQueFaltaAoBento,
  pedidoDoBentoDeHoje,
  podeEntregarAoBento,
  presentearOBento,
} from '../src/sistemas/conversa-do-bento'
import { ITENS } from '../src/sistemas/itens'
import { AMIZADE, ehAniversario, pedidoDoDia } from '../src/sistemas/moradores'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

function bufferDe(arquivo: string): ArrayBuffer {
  const buf = readFileSync(arquivo)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

const HOJE = '2026-10-29'
const AMANHA = '2026-10-30'
const SAO_JOAO = '2027-06-24'
const PERFIL = 'perfil-1'

const bentoNovo = (): Morador => ({ ...MORADOR_NOVO })
const inicial = (): Salvamento => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))

/** O pedido de hoje com os itens dele na mochila. */
function comOPedidoNaMochila(s: Salvamento): Salvamento {
  const id = s.moradores.bento.pedido?.id ?? ''
  return { ...s, inventario: { ...s.inventario, ...pedidoDoBentoPeloId(id)?.itens } }
}

/** As regras do texto da casa: sem travessão, sem exclamação, a primeira frase não é pergunta. */
function conferirTexto(fala: string) {
  expect(fala.length).toBeGreaterThan(0)
  expect(fala).not.toMatch(/[—!]/)
  const primeira = fala.split(/(?<=[.?])\s/)[0] ?? ''
  expect(primeira.endsWith('?')).toBe(false)
}

describe('o Bento: as falas', () => {
  const contextos: ContextoDaFalaDoBento[] = []
  for (const primeiroEncontro of [true, false])
    for (const primeiraDoDia of [true, false])
      for (const aniversario of [true, false])
        for (const pedido of [null, ...PEDIDOS_DO_BENTO.map((p) => p.texto)])
          for (let coracoes = 0; coracoes <= 5; coracoes++)
            contextos.push({ coracoes, primeiroEncontro, primeiraDoDia, aniversario, pedido })

  test('todas seguem a voz da casa', () => {
    for (const c of contextos)
      for (const escolha of [0, 1, 2, 7]) for (const f of falasDoBento(c, escolha)) conferirTexto(f)
    for (const f of Object.values(FALA_DO_PRESENTE_DO_BENTO)) conferirTexto(f)
    conferirTexto(FALA_DA_ENTREGA_AO_BENTO)
    for (const p of PEDIDOS_DO_BENTO) conferirTexto(p.texto)
  })

  test('o primeiro encontro apresenta e já conta o pedido', () => {
    const c = { coracoes: 0, primeiroEncontro: true, primeiraDoDia: true, aniversario: false }
    const com = falasDoBento({ ...c, pedido: 'Um milho para provar uma receita' }, 0)
    expect(com[0]).toContain('Bento')
    expect(com.at(-1)).toBe('Hoje eu queria uma coisa: um milho para provar uma receita.')
    expect(falasDoBento({ ...c, pedido: null }, 0)).toHaveLength(com.length - 1)
  })

  test('depois da primeira conversa do dia, só a despedida', () => {
    const f = falasDoBento(
      {
        coracoes: 3,
        primeiroEncontro: false,
        primeiraDoDia: false,
        aniversario: true,
        pedido: 'x',
      },
      0,
    )
    expect(f).toHaveLength(1)
  })

  test('cada nível de amizade tem as falas dele, e o aniversário vem primeiro', () => {
    const base = { primeiroEncontro: false, primeiraDoDia: true, aniversario: false, pedido: null }
    const porNivel = [0, 1, 2, 3, 4, 5].map((n) => falasDoBento({ ...base, coracoes: n }, 0)[0])
    expect(new Set(porNivel).size).toBe(6)
    const festa = falasDoBento({ ...base, coracoes: 2, aniversario: true }, 0)
    expect(festa[0]).toContain('São João')
    expect(festa[1]).toBe(porNivel[2])
  })
})

describe('o Bento: o pedido do dia', () => {
  test('os pedidos pedem comida que existe, e só o que a horta e a bancada dão', () => {
    expect(new Set(PEDIDOS_DO_BENTO.map((p) => p.id)).size).toBe(PEDIDOS_DO_BENTO.length)
    for (const p of PEDIDOS_DO_BENTO)
      for (const [id, qtd] of Object.entries(p.itens ?? {})) {
        expect(ITENS[id]?.comida).toBeDefined()
        expect(qtd).toBeGreaterThan(0)
      }
    expect(pedidoDoBentoPeloId('achar-bicho-0')).toBeNull()
  })

  test('o mesmo o dia inteiro, guardado, e sorteado à parte da Capi', () => {
    const a = pedidoDoDiaDoBento(bentoNovo(), HOJE, PERFIL)
    expect(a.pedido).toMatchObject({ dia: HOJE, entregue: false })
    expect(pedidoDoDiaDoBento(a, HOJE, PERFIL)).toBe(a)
    expect(pedidoDoDiaDoBento(bentoNovo(), HOJE, PERFIL)).toEqual(a)
    expect(pedidoDoDiaDoBento(a, AMANHA, PERFIL).pedido?.dia).toBe(AMANHA)
    // Em 60 dias o sorteio dele não segue o da Capi (chaves diferentes).
    let iguais = 0
    for (let d = 1; d <= 60; d++) {
      const dia = `2026-11-${String((d % 30) + 1).padStart(2, '0')}-${d}`
      const dele = pedidoDoDiaDoBento(bentoNovo(), dia, PERFIL).pedido?.id
      const dela = pedidoDoDia(bentoNovo(), dia, PERFIL, 0, 0).pedido?.id
      if (dele === dela) iguais++
    }
    expect(iguais).toBeLessThan(30)
  })

  test('todos os pedidos saem no sorteio; os de prato só com a receita ensinada (A22)', () => {
    const vistos = (amizade: number) => {
      const ids = new Set<string>()
      for (let d = 0; d < 300; d++)
        ids.add(
          pedidoDoDiaDoBento({ ...bentoNovo(), amizade }, `dia-${d}`, PERFIL).pedido?.id ?? '',
        )
      return [...ids].sort()
    }
    const daHorta = PEDIDOS_DO_BENTO.filter((p) => !p.receita).map((p) => p.id)
    expect(vistos(0)).toEqual([...daHorta].sort())
    // Um coração: o bolo de fubá (o primeiro prato). Dois: também o pão de queijo.
    expect(vistos(100)).toEqual([...daHorta, 'bolo-de-fuba-1'].sort())
    expect(vistos(200)).toEqual(PEDIDOS_DO_BENTO.map((p) => p.id).sort())
  })
})

describe('o Bento: a conversa sobre o salvamento', () => {
  test('a primeira conversa guarda o pedido e conta a amizade só uma vez por dia', () => {
    const a = comecarConversaComOBento(inicial(), HOJE, PERFIL)
    const bento = a.salvamento.moradores.bento
    expect(bento.amizade).toBe(AMIZADE.conversa)
    expect(bento.conversaEm).toBe(HOJE)
    expect(bento.pedido?.dia).toBe(HOJE)
    expect(a.falas.at(-1)).toContain(pedidoDoBentoDeHoje(a.salvamento, HOJE)?.toLowerCase() ?? '-')
    // A Capi não muda.
    expect(a.salvamento.moradores.capi).toEqual(inicial().moradores.capi)
    const b = comecarConversaComOBento(a.salvamento, HOJE, PERFIL)
    expect(b.salvamento.moradores.bento.amizade).toBe(AMIZADE.conversa)
    // A segunda conversa traz a lanterna (fase2-06), uma vez só.
    expect(b.falas).toEqual([expect.any(String), FALA_DA_LANTERNA])
    expect(b.salvamento.inventario[ID_DA_LANTERNA]).toBe(1)
    expect(comecarConversaComOBento(b.salvamento, HOJE, PERFIL).falas).toHaveLength(1)
  })

  test('entregar: tira os itens, dá a amizade e não entrega duas vezes', () => {
    const conversa = comecarConversaComOBento(inicial(), HOJE, PERFIL).salvamento
    expect(podeEntregarAoBento(conversa, HOJE)).toBe(false)
    expect(oQueFaltaAoBento(conversa, HOJE)).toContain('você tem 0')
    expect(entregarAoBento(conversa, HOJE)).toEqual({
      salvamento: conversa,
      entregou: false,
      falas: [],
    })

    const pronto = comOPedidoNaMochila(conversa)
    expect(podeEntregarAoBento(pronto, HOJE)).toBe(true)
    expect(oQueFaltaAoBento(pronto, HOJE)).toBeNull()
    const r = entregarAoBento(pronto, HOJE)
    expect(r.entregou).toBe(true)
    expect(r.falas).toEqual([FALA_DA_ENTREGA_AO_BENTO])
    expect(r.salvamento.moradores.bento.amizade).toBe(AMIZADE.conversa + AMIZADE.pedido)
    expect(r.salvamento.moradores.bento.pedido?.entregue).toBe(true)
    for (const [id, qtd] of Object.entries(
      pedidoDoBentoPeloId(conversa.moradores.bento.pedido?.id ?? '')?.itens ?? {},
    ))
      expect(r.salvamento.inventario[id] ?? 0).toBe((pronto.inventario[id] ?? 0) - qtd)
    expect(pedidoDoBentoDeHoje(r.salvamento, HOJE)).toBeNull()
    expect(podeEntregarAoBento(r.salvamento, HOJE)).toBe(false)
    expect(entregarAoBento(comOPedidoNaMochila(r.salvamento), HOJE).entregou).toBe(false)
  })

  test('o pedido de ontem não se entrega hoje pelo painel', () => {
    const ontem = comOPedidoNaMochila(comecarConversaComOBento(inicial(), HOJE, PERFIL).salvamento)
    expect(podeEntregarAoBento(ontem, AMANHA)).toBe(false)
    expect(oQueFaltaAoBento(ontem, AMANHA)).toBeNull()
    expect(pedidoDoBentoDeHoje(ontem, AMANHA)).toBeNull()
    expect(entregarAoBento(ontem, AMANHA).entregou).toBe(false)
    expect(entregarAoBento(ontem, HOJE).entregou).toBe(true)
  })
})

describe('o Bento: presentes e o aniversário', () => {
  test('milho e pipoca são os preferidos dele', () => {
    expect(GOSTOS_DO_BENTO.milho).toBe('gosta')
    expect(GOSTOS_DO_BENTO.pipoca).toBe('gosta')
    expect(GOSTOS_DO_BENTO.salada).toBe('comum')
    for (const id of Object.keys(GOSTOS_DO_BENTO)) expect(ITENS[id]?.comida).toBeDefined()
  })

  test('presente que ele gosta, comum, devolvido e um por dia', () => {
    const s = { ...inicial(), inventario: { pipoca: 2, tomate: 1, 'semente-milho': 1 } }
    const gosta = presentearOBento(s, 'pipoca', HOJE)
    expect(gosta.reacao).toBe('adorou')
    expect(gosta.salvamento.moradores.bento.amizade).toBe(AMIZADE.presenteQueGosta)
    expect(gosta.salvamento.inventario.pipoca).toBe(1)
    expect(gosta.falas).toEqual([FALA_DO_PRESENTE_DO_BENTO.adorou])

    const outra = presentearOBento(gosta.salvamento, 'pipoca', HOJE)
    expect(outra.reacao).toBe('ja-ganhou-hoje')
    expect(outra.salvamento).toBe(gosta.salvamento)

    const comum = presentearOBento(s, 'tomate', HOJE)
    expect(comum.reacao).toBe('agradeceu')
    expect(comum.salvamento.moradores.bento.amizade).toBe(AMIZADE.presenteComum)

    const volta = presentearOBento(s, 'semente-milho', HOJE)
    expect(volta.reacao).toBe('devolveu')
    expect(volta.salvamento).toBe(s)
    expect(presentearOBento(s, 'milho', HOJE).reacao).toBe('sem-item')
  })

  test('no São João o presente vale o dobro e ele comenta', () => {
    expect(ehAniversario(SAO_JOAO, ANIVERSARIO_DO_BENTO)).toBe(true)
    expect(ehAniversario('2027-03-12', ANIVERSARIO_DO_BENTO)).toBe(false)
    const s = { ...inicial(), inventario: { milho: 1 } }
    const r = presentearOBento(s, 'milho', SAO_JOAO)
    expect(r.salvamento.moradores.bento.amizade).toBe(AMIZADE.presenteQueGosta * 2)
    expect(r.falas[0]).toContain('São João')
    conferirTexto(r.falas[0] ?? '')
    const conversa = comecarConversaComOBento(
      {
        ...inicial(),
        moradores: { ...inicial().moradores, bento: { ...bentoNovo(), conversaEm: HOJE } },
      },
      SAO_JOAO,
      PERFIL,
    )
    expect(conversa.falas[0]).toContain('aniversário')
  })

  test('a amizade da Capi e a do Bento não se misturam', () => {
    const s = { ...inicial(), inventario: { milho: 2 } }
    const r = presentearOBento(s, 'milho', HOJE)
    expect(r.salvamento.moradores.capi).toEqual(s.moradores.capi)
  })
})

describe('o Bento na Vila Doce', () => {
  test('o modelo tem os clipes do morador e os olhos com piscar e feliz', async () => {
    const gltf = await new GLTFLoader().parseAsync(
      bufferDe(`${import.meta.dir}/../src/assets/personagens/bento.glb`),
      '',
    )
    const clipes = gltf.animations.map((a) => a.name)
    for (const c of ['parado', 'falar', 'acenar', 'feliz']) expect(clipes).toContain(c)
    const olhos = malhasDosOlhos(gltf.scene)
    expect(olhos.length).toBeGreaterThan(0)
    for (const o of olhos)
      expect(Object.keys(o.morphTargetDictionary ?? {})).toEqual(
        expect.arrayContaining(['piscar', 'feliz']),
      )
    // O cilindro do corpo cabe no desenho (o chapéu passa um pouco) e a cabeça fica na altura dele.
    const tamanho = new Box3().setFromObject(gltf.scene).getSize(new Vector3())
    expect(BENTO_NA_VILA.altura).toBeLessThan(tamanho.y)
    expect(BENTO_NA_VILA.alturaDaCabeca).toBeLessThan(tamanho.y)
    expect(BENTO_NA_VILA.alturaDaCabeca).toBeGreaterThan(tamanho.y * 0.6)
  })

  test('na frente da padaria, de costas para a porta, olhando para a praça', async () => {
    const vila = await carregarGlb(arquivoDaIlha('vila-doce.glb'))
    const morador = vila.getObjectByName('morador')?.position
    const porta = vila.getObjectByName('padaria')?.position
    const fonte = vila.getObjectByName('fonte')?.position
    if (!morador || !porta || !fonte) throw new Error('faltam âncoras na vila-doce.glb')
    const descanso = Math.atan2(morador.x - porta.x, morador.z - porta.z)
    const paraAFonte = Math.atan2(fonte.x - morador.x, fonte.z - morador.z)
    const diferenca = Math.abs(
      Math.atan2(Math.sin(descanso - paraAFonte), Math.cos(descanso - paraAFonte)),
    )
    expect(diferenca).toBeLessThan(Math.PI / 4)
    // Quem chega para conversar alcança antes de bater no cilindro dele.
    expect(BENTO_NA_VILA.alcance).toBeGreaterThan(BENTO_NA_VILA.raio + 0.35 + 0.3)
  })
})
