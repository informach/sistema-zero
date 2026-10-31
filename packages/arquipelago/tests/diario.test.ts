import { describe, expect, test } from 'bun:test'
import { BICHOS_DO_BOSQUE, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { adotar } from '../src/sistemas/bichos'
import { comecarConversa, FALA_DO_PRESENTE, presentear } from '../src/sistemas/conversa-da-capi'
import { comecarConversaComOBento } from '../src/sistemas/conversa-do-bento'
import {
  CORACOES_DA_PAGINA,
  CORACOES_DA_PAGINA_DA_VILA,
  colecaoDeReceitas,
  colecaoDoBosque,
  FALA_DA_PAGINA,
  FALA_DA_PAGINA_DO_BENTO,
  ganhouAPagina,
  ganhouAPaginaDaVila,
  ILHAS_DO_DIARIO,
  paginasDoDiario,
  TEXTO_DA_PAGINA,
} from '../src/sistemas/diario'
import { AMIZADE } from '../src/sistemas/moradores'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z'))
const comAmizade = (amizade: number) => {
  const s = inicial()
  return { ...s, moradores: { ...s.moradores, capi: { ...s.moradores.capi, amizade } } }
}
const pontosDaPagina = CORACOES_DA_PAGINA * AMIZADE.porCoracao

describe('as páginas do diário da Íris', () => {
  test('a carta da sua ilha, uma por ilha do anel e a última no Farol; só a carta aberta no começo', () => {
    const paginas = paginasDoDiario(inicial())
    expect(paginas.map((p) => p.ilha)).toEqual([...ILHAS_DO_DIARIO])
    expect(paginas[0]).toEqual({
      ilha: 'sua-ilha',
      nome: 'A carta de boas-vindas',
      aberta: true,
      texto: 'A casa é sua. Acenda as cores.',
    })
    expect(paginas.slice(1).every((p) => !p.aberta)).toBe(true)
    expect(paginas[1]).toMatchObject({ nome: 'Bosque dos Bichos' })
    expect(paginas.at(-1)).toMatchObject({ dica: 'A última página fica no alto do Farol.' })
  })

  test('a do Bosque abre com os corações de amizade da Capi e diz quantos faltam antes', () => {
    const quase = paginasDoDiario(comAmizade(pontosDaPagina - 1))[1]
    expect(quase?.aberta).toBe(false)
    expect(quase && !quase.aberta && quase.dica).toContain('(falta 1)')
    expect(paginasDoDiario(inicial())[1]).toMatchObject({ aberta: false })
    const aberta = paginasDoDiario(comAmizade(pontosDaPagina))[1]
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
      moradores: { ...s.moradores, capi: { ...s.moradores.capi, conversaEm: '2026-10-27' } },
    }
    const { falas } = comecarConversa(conversou, '2026-10-28', 'perfil-1')
    expect(falas.slice(-FALA_DA_PAGINA.length)).toEqual([...FALA_DA_PAGINA])
  })
})

describe('a página da Vila Doce e a coleção de receitas (fase2-12)', () => {
  const comBento = (amizade: number) => {
    const s = inicial()
    return { ...s, moradores: { ...s.moradores, bento: { ...s.moradores.bento, amizade } } }
  }
  const pontosDaVila = CORACOES_DA_PAGINA_DA_VILA * AMIZADE.porCoracao

  test('a da Vila abre com os corações de amizade do Bento e diz quantos faltam antes', () => {
    const vila = (amizade: number) =>
      paginasDoDiario(comBento(amizade)).find((p) => p.ilha === 'vila-doce')
    const antes = vila(pontosDaVila - 1)
    expect(antes?.aberta).toBe(false)
    expect(antes && !antes.aberta && antes.dica).toContain('Bento')
    expect(antes && !antes.aberta && antes.dica).toContain('(falta 1)')
    expect(vila(pontosDaVila)).toMatchObject({ aberta: true, texto: TEXTO_DA_PAGINA['vila-doce'] })
    expect(ganhouAPaginaDaVila(pontosDaVila - 10, pontosDaVila)).toBe(true)
    expect(ganhouAPaginaDaVila(pontosDaVila, pontosDaVila + 10)).toBe(false)
  })

  test('o Bento entrega a página na conversa em que a amizade chega a ela', () => {
    const r = comecarConversaComOBento(
      comBento(pontosDaVila - AMIZADE.conversa),
      '2026-10-29',
      'p1',
    )
    expect(r.falas.slice(-FALA_DA_PAGINA_DO_BENTO.length)).toEqual([...FALA_DA_PAGINA_DO_BENTO])
    const outro = comecarConversaComOBento(r.salvamento, '2026-10-30', 'p1')
    expect(outro.falas).not.toContain(FALA_DA_PAGINA_DO_BENTO[0])
  })

  test('a coleção mostra as receitas sabidas com o que precisam e as outras com os corações', () => {
    const zero = colecaoDeReceitas(inicial())
    expect(zero.filter((r) => r.sabe).map((r) => r.id)).toEqual([
      'salada-do-carnaval',
      'milho-da-fogueira',
      'pipoca-de-festa',
      'manjar-de-coco',
      'cocada',
      'salada',
      'pipoca',
    ])
    expect(zero.find((r) => r.id === 'pipoca-de-festa')).toMatchObject({
      sabe: true,
      onde: 'Na fogueira da Festa Junina, em junho',
    })
    const bolo = zero.find((r) => r.id === 'bolo-de-fuba')
    expect(bolo && !bolo.sabe && bolo.dica).toContain('com 1 coração de amizade (falta 1)')
    const tudo = colecaoDeReceitas(comBento(500))
    expect(tudo.filter((r) => r.sabe)).toHaveLength(11)
    expect(tudo.find((r) => r.id === 'acai-na-tigela')).toMatchObject({ sabe: false })
    expect(tudo.find((r) => r.id === 'bolo-de-fuba')).toMatchObject({
      precisa: '1 fubá, 1 leite, 1 ovo',
      onde: 'No forno da casa',
    })
    for (const r of [...zero, ...tudo]) {
      const textos = r.sabe ? [r.nome, r.precisa, r.onde] : [r.nome, r.dica]
      for (const t of textos) expect(t).not.toMatch(/[—!]/)
    }
    for (const t of [...FALA_DA_PAGINA_DO_BENTO, TEXTO_DA_PAGINA['vila-doce'] ?? ''])
      expect(t).not.toMatch(/[—!]/)
  })
})
