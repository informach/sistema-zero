import { describe, expect, test } from 'bun:test'
import { BICHOS_DO_BOSQUE, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { adotar } from '../src/sistemas/bichos'
import { comecarConversa, FALA_DO_PRESENTE, presentear } from '../src/sistemas/conversa-da-capi'
import {
  CORACOES_DA_PAGINA,
  colecaoDoBosque,
  FALA_DA_PAGINA,
  ganhouAPagina,
  ILHAS_DO_DIARIO,
  paginasDoDiario,
  TEXTO_DA_PAGINA,
} from '../src/sistemas/diario'
import { AMIZADE } from '../src/sistemas/moradores'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z'))
const comAmizade = (amizade: number) => {
  const s = inicial()
  return { ...s, moradores: { capi: { ...s.moradores.capi, amizade } } }
}
const pontosDaPagina = CORACOES_DA_PAGINA * AMIZADE.porCoracao

describe('as páginas do diário da Íris', () => {
  test('uma por ilha do anel e a última no Farol, todas guardadas no começo', () => {
    const paginas = paginasDoDiario(inicial())
    expect(paginas.map((p) => p.ilha)).toEqual([...ILHAS_DO_DIARIO])
    expect(paginas.every((p) => !p.aberta)).toBe(true)
    expect(paginas[0]).toMatchObject({ nome: 'Bosque dos Bichos' })
    expect(paginas.at(-1)).toMatchObject({ dica: 'A última página fica no alto do Farol.' })
  })

  test('a do Bosque abre com os corações de amizade da Capi e diz quantos faltam antes', () => {
    const quase = paginasDoDiario(comAmizade(pontosDaPagina - 1))[0]
    expect(quase?.aberta).toBe(false)
    expect(quase && !quase.aberta && quase.dica).toContain('(falta 1)')
    expect(paginasDoDiario(inicial())[0]).toMatchObject({ aberta: false })
    const aberta = paginasDoDiario(comAmizade(pontosDaPagina))[0]
    expect(aberta).toEqual({
      ilha: 'bosque',
      nome: 'Bosque dos Bichos',
      aberta: true,
      texto: TEXTO_DA_PAGINA.bosque as string,
    })
  })

  test('a Capi entrega só na vez em que a amizade passa dos corações da página', () => {
    const capi = (amizade: number) => comAmizade(amizade).moradores.capi
    expect(ganhouAPagina(capi(pontosDaPagina - 10), capi(pontosDaPagina))).toBe(true)
    expect(ganhouAPagina(capi(pontosDaPagina), capi(pontosDaPagina + 10))).toBe(false)
    expect(ganhouAPagina(capi(0), capi(pontosDaPagina - 1))).toBe(false)
  })

  test('os textos não usam travessão nem exclamação', () => {
    const textos = [
      ...Object.values(TEXTO_DA_PAGINA),
      ...FALA_DA_PAGINA,
      ...paginasDoDiario(inicial()).flatMap((p) => (p.aberta ? [] : [p.dica])),
    ]
    for (const t of textos) expect(t).not.toMatch(/[—!]/)
  })
})

describe('a coleção de bichos e pegadas do Bosque', () => {
  test('no começo os quatro estão escondidos', () => {
    const c = colecaoDoBosque(inicial())
    expect(c.map((b) => b.bicho)).toEqual([...BICHOS_DO_BOSQUE])
    expect(c.every((b) => b.estado === 'escondido')).toBe(true)
  })

  test('achado mostra o bicho e a pegada; adotado mostra também o nome que a criança deu', () => {
    const s = inicial()
    const comNome = adotar({ achados: ['gato', 'coelho'], adotado: null }, 'coelho', 'Pipoca')
    if (!comNome) throw new Error('não adotou')
    const c = colecaoDoBosque({ ...s, bichos: comNome })
    expect(c.find((b) => b.bicho === 'gato')).toMatchObject({
      estado: 'achado',
      nome: 'gato frajola',
    })
    expect(c.find((b) => b.bicho === 'coelho')).toMatchObject({
      estado: 'adotado',
      apelido: 'Pipoca',
    })
    expect(c.find((b) => b.bicho === 'cachorro')).toEqual({
      bicho: 'cachorro',
      estado: 'escondido',
    })
    for (const b of c) if (b.estado !== 'escondido') expect(b.pegada).not.toMatch(/[—!]/)
  })
})

describe('a Capi entrega a página na conversa', () => {
  test('o presente que faz a amizade chegar aos corações da página traz a entrega depois do obrigado', () => {
    const s = { ...comAmizade(pontosDaPagina - 10), inventario: { milho: 1 } }
    const r = presentear(s, 'milho', '2026-10-28')
    expect(r.reacao).toBe('adorou')
    expect(r.falas).toEqual([FALA_DO_PRESENTE.adorou, ...FALA_DA_PAGINA])
    // No dia seguinte, já com a página, o presente só agradece.
    const depois = presentear({ ...r.salvamento, inventario: { milho: 1 } }, 'milho', '2026-10-29')
    expect(depois.falas).toEqual([FALA_DO_PRESENTE.adorou])
  })

  test('a primeira conversa do dia que passa dos corações também entrega, no fim das falas', () => {
    const s = comAmizade(pontosDaPagina - AMIZADE.conversa)
    const conversou = {
      ...s,
      moradores: { capi: { ...s.moradores.capi, conversaEm: '2026-10-27' } },
    }
    const { falas } = comecarConversa(conversou, '2026-10-28', 'perfil-1')
    expect(falas.slice(-FALA_DA_PAGINA.length)).toEqual([...FALA_DA_PAGINA])
  })
})
