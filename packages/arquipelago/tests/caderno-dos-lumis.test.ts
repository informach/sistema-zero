import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { CARTAS_LUMI, type Plataforma } from '@sistemazero/arquipelago-contracts'
import { criarLojaDasCartas } from '../src/estado/cartas'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import {
  type CartaDoCaderno,
  lerCartas,
  motivoDoCadernoFechado,
  ondeAprender,
  quandoChega,
  secoesDoCaderno,
} from '../src/sistemas/caderno-dos-lumis'

const CURSO = {
  courseId: '00000000-0000-4000-8000-000000000001',
  titulo: 'Repetições',
  slug: 'repeticoes',
  posto: 'coder',
}
const carta = (over: Partial<CartaDoCaderno>): CartaDoCaderno => ({
  id: 'regar',
  nome: 'Regar',
  tipo: 'acao',
  efeito: 'Rega o canteiro.',
  conquistada: true,
  aprendaEm: [],
  ...over,
})

describe('o caderno arrumado', () => {
  test('revogar acesso retira a coleção antiga, sem apresentá-la como disponível', async () => {
    const falsa = criarPlataformaFalsa({ persistir: false })
    let revogado = false
    const loja = criarLojaDasCartas({
      ...falsa,
      servico: {
        buscar: (caminho, opcoes) =>
          revogado
            ? Promise.resolve({ status: 403, corpo: {} })
            : falsa.servico.buscar(caminho, opcoes),
      },
    })
    await loja.getState().carregar()
    expect(loja.getState().dados).not.toBeNull()
    revogado = true
    await loja.getState().carregar()
    expect(loja.getState()).toMatchObject({ dados: null, fechado: 'sem-acesso' })
  })

  test('nova leitura cancela a requisição antiga e resposta tardia não substitui a nova', async () => {
    const falsa = criarPlataformaFalsa({ persistir: false })
    const sinais: Array<AbortSignal | undefined> = []
    const entregar: Array<() => void> = []
    const loja = criarLojaDasCartas({
      ...falsa,
      servico: {
        buscar: async (_caminho, opcoes) => {
          sinais.push(opcoes?.sinal)
          await new Promise<void>((resolve) => entregar.push(resolve))
          return { status: 403, corpo: {} }
        },
      },
    })
    const a = loja.getState().carregar()
    const b = loja.getState().carregar()
    const cancelou = sinais[0]?.aborted
    entregar[1]?.()
    await b
    entregar[0]?.()
    await a
    expect(cancelou).toBe(true)
    expect(loja.getState().carregando).toBe(false)
  })

  test('seções na ordem quando, ação e controle, com quantas estão prontas; seção vazia sai', () => {
    const s = secoesDoCaderno([
      carta({ id: 'repetir', tipo: 'controle', conquistada: false, aprendaEm: [CURSO] }),
      carta({ id: 'se', tipo: 'controle' }),
      carta({ id: 'regar' }),
    ])
    expect(s.map((x) => x.tipo)).toEqual(['acao', 'controle'])
    expect(s[1]?.cartas.map((c) => c.id)).toEqual(['repetir', 'se'])
    expect(s[1]?.prontas).toBe(1)
  })

  test('onde aprender: o primeiro curso do serviço; nada para quem já tem ou sem curso', () => {
    const outro = { ...CURSO, courseId: '00000000-0000-4000-8000-000000000002', titulo: 'Outro' }
    expect(ondeAprender(carta({ conquistada: false, aprendaEm: [CURSO, outro] }))).toBe(
      'Repetições',
    )
    expect(ondeAprender(carta({ conquistada: true, aprendaEm: [CURSO] }))).toBeNull()
    expect(ondeAprender(carta({ conquistada: false, aprendaEm: [] }))).toBeNull()
  })

  test('resposta estranha não passa; 403 é sem acesso, o resto fora do ar', () => {
    expect(lerCartas({ cartas: [{ id: 'x' }] })).toBeNull()
    expect(lerCartas({ cartas: [carta({})] })?.cartas).toHaveLength(1)
    expect(motivoDoCadernoFechado(403)).toBe('sem-acesso')
    expect(motivoDoCadernoFechado(424)).toBe('fora-do-ar')
    expect(motivoDoCadernoFechado(500)).toBe('fora-do-ar')
  })

  test('textos do caderno: sem ponto de exclamação, travessão nem reticências', () => {
    const fontes = [
      readFileSync(new URL('../src/interface/caderno-dos-lumis.tsx', import.meta.url), 'utf8'),
      readFileSync(new URL('../src/sistemas/caderno-dos-lumis.ts', import.meta.url), 'utf8'),
    ].join('\n')
    expect(fontes).not.toMatch(/[—…]/)
    const textos = secoesDoCaderno(CARTAS_LUMI.map((c) => carta({ ...c, conquistada: true })))
    for (const s of textos) expect(`${s.titulo} ${s.explica}`).not.toMatch(/[!?]/)
    for (const c of CARTAS_LUMI) expect(`${c.nome} ${c.efeito}`).not.toMatch(/[!?—…]/)
  })
})

describe('loja das cartas com a plataforma de mentira', () => {
  test('Kids: os do jogo e os de controle conquistados prontos; os outros com o curso Kids', async () => {
    const loja = criarLojaDasCartas(criarPlataformaFalsa({ persistir: false }))
    await loja.getState().carregar()
    const { dados, fechado } = loja.getState()
    expect(fechado).toBeNull()
    const por = (id: string) => dados?.cartas.find((c) => c.id === id)
    expect(por('regar')?.conquistada).toBe(true)
    expect(por('quando-amanhecer')?.conquistada).toBe(true)
    expect(por('repetir')?.conquistada).toBe(true)
    // O exemplo está no quarto posto: Para cada e Se já chegaram; Escolha chega no quinto.
    expect(por('para-cada')?.conquistada).toBe(true)
    expect(por('se')?.conquistada).toBe(true)
    expect(por('escolha')).toMatchObject({ conquistada: false, posto: 5 })
    expect(ondeAprender(por('escolha') as CartaDoCaderno)).toBe('Decisões')
    expect(quandoChega(por('escolha') as CartaDoCaderno)).toBe('Chega quando Pico Gelado abrir.')
  })

  test('adulto: o caderno mostra os cursos do currículo adulto', async () => {
    const loja = criarLojaDasCartas(criarPlataformaFalsa({ persistir: false, publico: 'adulto' }))
    await loja.getState().carregar()
    const escolha = loja.getState().dados?.cartas.find((c) => c.id === 'escolha')
    expect(ondeAprender(escolha as CartaDoCaderno)).toBe('Decisões (adulto)')
  })

  test('equipe tem todos; desligado e fora do ar fecham com o motivo', async () => {
    const todas = criarLojaDasCartas(criarPlataformaFalsa({ persistir: false, cartas: 'todas' }))
    await todas.getState().carregar()
    expect(todas.getState().dados?.cartas.every((c) => c.conquistada)).toBe(true)

    const sem = criarLojaDasCartas(criarPlataformaFalsa({ persistir: false, cartas: 'desligadas' }))
    await sem.getState().carregar()
    expect(sem.getState()).toMatchObject({ dados: null, fechado: 'sem-acesso', carregando: false })

    const fora = criarLojaDasCartas(
      criarPlataformaFalsa({ persistir: false, cartas: 'fora-do-ar' }),
    )
    await fora.getState().carregar()
    expect(fora.getState().fechado).toBe('fora-do-ar')
  })

  test('uma leitura que falha não apaga a coleção já mostrada; erro de rede é relatado', async () => {
    const falsa = criarPlataformaFalsa({ persistir: false })
    let quebrar = false
    const erros: string[] = []
    const plataforma: Plataforma = {
      ...falsa,
      servico: {
        buscar: async (caminho, opcoes) => {
          if (quebrar) throw new Error('rede')
          return falsa.servico.buscar(caminho, opcoes)
        },
      },
      relatarErro: (_erro, contexto) => erros.push(contexto),
    }
    const loja = criarLojaDasCartas(plataforma)
    await loja.getState().carregar()
    quebrar = true
    await loja.getState().carregar()
    expect(loja.getState().dados?.cartas).toHaveLength(CARTAS_LUMI.length)
    expect(loja.getState().fechado).toBe('fora-do-ar')
    expect(erros).toEqual(['cartas'])
  })

  test('duas leituras ao mesmo tempo: vale a última', async () => {
    const falsa = criarPlataformaFalsa({ persistir: false })
    const respostas: Array<() => void> = []
    let chamada = 0
    const plataforma: Plataforma = {
      ...falsa,
      servico: {
        buscar: async (caminho, opcoes) => {
          const n = chamada++
          await new Promise<void>((r) => respostas.push(r))
          // A primeira (lenta) volta com erro; a segunda, com a coleção.
          return n === 0 ? { status: 424, corpo: {} } : falsa.servico.buscar(caminho, opcoes)
        },
      },
    }
    const loja = criarLojaDasCartas(plataforma)
    const primeira = loja.getState().carregar()
    const segunda = loja.getState().carregar()
    respostas[1]?.()
    await segunda
    respostas[0]?.()
    await primeira
    expect(loja.getState().fechado).toBeNull()
    expect(loja.getState().dados).not.toBeNull()
  })
})
