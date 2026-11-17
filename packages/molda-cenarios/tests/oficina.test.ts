import { describe, expect, test } from 'bun:test'
import {
  apoioNaSuperficie,
  type ComandoDeCenario,
  posicaoNoMundo,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  comandosDoGesto,
  comandosParaApagar,
  comandosParaDuplicar,
  comandosParaForma,
  comandosParaPor,
  comandosParaTrocar,
  comMedidasConferidas,
} from '../src/oficina/acoes'
import { criarControlador } from '../src/oficina/controlador'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import {
  CenarioDesatualizado,
  type CenariosHost,
  type ModeloDeBiblioteca,
} from '../src/oficina/portas'

const arvore: ModeloDeBiblioteca = {
  id: 'mod-arvore',
  bibliotecaId: 'bib-1',
  nome: 'Árvore',
  pasta: 'natureza',
  etiquetas: [],
  digest: 'a'.repeat(64),
  bytes: 10,
  triangulos: 12,
  min: [-1, -0.5, -1],
  max: [1, 3, 1],
  miniatura: null,
}
function ids() {
  let n = 0
  return () => `o-${++n}`
}
async function abrir(host: CenariosHost = criarHostEmMemoria()) {
  const mundo = await host.criarMundo('conta', 'Meu mundo')
  const cenario = await host.criarCenario(mundo.id, 'Fase 1')
  const aberto = await host.abrirCenario(cenario.id)
  let operacao = 0
  const controlador = criarControlador(host, aberto, () => `op-${++operacao}`)
  return { host, mundo, cenario, controlador }
}
const por = (
  controlador: Awaited<ReturnType<typeof abrir>>['controlador'],
  novoId: () => string,
  x = 0,
  z = 0,
) => {
  const { comandos, id } = comandosParaPor(
    controlador.getState().documento,
    arvore,
    { x, z },
    novoId,
  )
  expect(controlador.executar(comandos)).toBe(true)
  return id
}

describe('ações da aba Objetos', () => {
  test('criar uma forma gera definição e instância no mesmo histórico, sem modelo de biblioteca', async () => {
    const { controlador, host, cenario } = await abrir()
    const forma = {
      id: 'forma/escada',
      nome: 'Escada',
      tipo: 'escada',
      largura: 2,
      altura: 3,
      comprimento: 4,
      degraus: 6,
    } as const
    const antes = structuredClone(controlador.getState().documento)
    const r = comandosParaForma(
      antes,
      forma,
      { x: 2, y: 6, z: 3, apoio: { tipo: 'absoluto' } },
      () => 'bloco',
    )
    expect(controlador.executar(r.comandos)).toBe(true)
    await controlador.terminar()
    const d = (await host.abrirCenario(cenario.id)).documento
    expect(d.modelos).toHaveLength(0)
    expect(d.formas).toEqual([forma])
    expect(d.instancias[0]!.transformacao.posicao.y).toBe(6)
    expect(d.instancias[0]!.colisao).toBe('malha')
    await controlador.desfazer()
    expect(controlador.getState().documento).toEqual(antes)
    await controlador.refazer()
    expect(controlador.getState().documento).toEqual(d)
  })
  test('encaixe em suporte legado confere as medidas no mesmo lote, inclusive quando espelhado', async () => {
    const { controlador } = await abrir(),
      novoId = ids()
    const pai = por(controlador, novoId),
      filho = por(controlador, novoId)
    const m = structuredClone(controlador.getState().documento.modelos[0]!),
      volume = m.volume!
    delete m.volume
    expect(
      controlador.executar([
        { tipo: 'modelo.definir', modelo: m },
        {
          tipo: 'instancia.atualizar',
          id: pai,
          alteracoes: { espelho: { x: true, y: false, z: false } },
        },
      ]),
    ).toBe(true)
    const antes = structuredClone(controlador.getState().documento)
    const comandos = comMedidasConferidas(
      antes,
      [pai, filho],
      () => volume,
      (d) => [
        {
          tipo: 'instancia.atualizar',
          id: filho,
          alteracoes: { apoio: apoioNaSuperficie(d, pai, { x: 0.2, y: 3.5, z: 0.3 }) },
        },
      ],
    )
    expect(controlador.executar(comandos)).toBe(true)
    const d = controlador.getState().documento
    expect(d.modelos[0]!.volume).toEqual(volume)
    expect(posicaoNoMundo(d, d.instancias[1]!)).toEqual({ x: 0.2, y: 4, z: 0.3 })
    expect(antes.modelos[0]!.volume).toBeUndefined()
    await controlador.terminar()
    await controlador.desfazer()
    expect(controlador.getState().documento).toEqual(antes)
  })
  test('mover a pilha inteira não aplica a translação duas vezes; duplicar o dependente mantém o deslocamento', async () => {
    const { controlador } = await abrir(),
      novoId = ids()
    const pai = por(controlador, novoId),
      filho = por(controlador, novoId)
    let d = controlador.getState().documento
    controlador.executar([
      {
        tipo: 'instancia.atualizar',
        id: filho,
        alteracoes: { apoio: apoioNaSuperficie(d, pai, { x: 0, y: 3.5, z: 0 }) },
      },
    ])
    d = controlador.getState().documento
    const mudancas = [filho, pai].map((id) => {
      const o = d.instancias.find((o) => o.id === id)!,
        p = posicaoNoMundo(d, o)
      return { id, transformacao: { ...o.transformacao, posicao: { ...p, x: p.x + 10 } } }
    })
    expect(controlador.executar(comandosDoGesto(d, mudancas))).toBe(true)
    const depois = controlador.getState().documento
    expect(posicaoNoMundo(depois, depois.instancias[0]!).x).toBeCloseTo(10)
    expect(posicaoNoMundo(depois, depois.instancias[1]!).x).toBeCloseTo(10)
    const copia = comandosParaDuplicar(depois, [filho], novoId)
    expect(controlador.executar(copia.comandos)).toBe(true)
    const final = controlador.getState().documento
    const p = posicaoNoMundo(final, final.instancias.at(-1)!)
    expect(p.x).toBeCloseTo(11)
    expect(p.z).toBeCloseTo(1)
    expect(p.y).toBeCloseTo(posicaoNoMundo(depois, depois.instancias[1]!).y)
  })
  test('trocar usa o histórico durável e pôr uma revisão nova não altera modelos anteriores', async () => {
    const { controlador } = await abrir()
    const novoId = ids(),
      primeiro = por(controlador, novoId)
    const novo = {
      ...arvore,
      digest: 'b'.repeat(64),
      min: [-1, -2, -1] as [number, number, number],
    }
    const outra = comandosParaPor(controlador.getState().documento, novo, { x: 4, z: 0 }, novoId)
    expect(controlador.executar(outra.comandos)).toBe(true)
    const antes = structuredClone(controlador.getState().documento)
    expect(antes.modelos).toHaveLength(2)
    expect(antes.instancias[0]!.modelo).not.toBe(antes.instancias[1]!.modelo)
    expect(controlador.executar(comandosParaTrocar(antes, [primeiro], novo))).toBe(true)
    await controlador.terminar()
    const depois = controlador.getState().documento
    expect(depois.instancias[0]!.modelo).toBe(depois.instancias[1]!.modelo)
    expect(depois.instancias[1]).toEqual(antes.instancias[1])
    await controlador.desfazer()
    expect(controlador.getState().documento).toEqual(antes)
    await controlador.refazer()
    expect(controlador.getState().documento).toEqual(depois)
  })
  test('pôr um modelo registra o modelo uma vez e põe o objeto de pé no chão', async () => {
    const { controlador } = await abrir()
    const novoId = ids()
    por(controlador, novoId, 2, 3)
    por(controlador, novoId, 5, 5)
    const doc = controlador.getState().documento
    expect(doc.modelos).toHaveLength(1)
    expect(doc.modelos[0]).toMatchObject({ id: 'mod-arvore', biblioteca: 'bib-1' })
    expect(doc.instancias.map((o) => o.nome)).toEqual(['Árvore', 'Árvore 2'])
    // O pivô deste modelo fica meio metro acima da base: ele sobe meio metro para pisar no chão.
    expect(doc.instancias[0]!.apoio).toEqual({
      tipo: 'terreno',
      deslocamento: 0,
      inclinar: false,
      referencia: 'volume',
    })
  })
  test('duplicar copia ao lado, com nome novo e destrancado', async () => {
    const { controlador } = await abrir()
    const novoId = ids()
    const a = por(controlador, novoId, 1, 1)
    controlador.executar([{ tipo: 'instancia.atualizar', id: a, alteracoes: { bloqueado: true } }])
    const { comandos, ids: novos } = comandosParaDuplicar(
      controlador.getState().documento,
      [a],
      novoId,
    )
    controlador.executar(comandos)
    const copia = controlador.getState().documento.instancias.find((o) => o.id === novos[0])!
    expect(copia.nome).toBe('Árvore 2')
    expect(copia.bloqueado).toBe(false)
    expect(copia.transformacao.posicao).toMatchObject({ x: 2, z: 2 })
  })
  test('o gesto do palco vira a distância até o chão para quem pisa nele', async () => {
    const { controlador } = await abrir()
    const a = por(controlador, ids())
    const comandos = comandosDoGesto(controlador.getState().documento, [
      {
        id: a,
        transformacao: {
          posicao: { x: 4, y: 2, z: -1 },
          rotacao: { x: 0, y: 1, z: 0 },
          escala: { x: 1, y: 2, z: 1 },
        },
      },
    ])
    controlador.executar(comandos)
    const o = controlador.getState().documento.instancias[0]!
    expect(o.apoio).toMatchObject({ tipo: 'terreno', deslocamento: 1, referencia: 'volume' })
    expect(o.transformacao.escala).toEqual({ x: 1, y: 2, z: 1 })
  })
  test('apagar ignora o que não existe mais', async () => {
    const { controlador } = await abrir()
    const a = por(controlador, ids())
    expect(comandosParaApagar(controlador.getState().documento, [a, 'fantasma'])).toEqual([
      { tipo: 'instancia.remover', id: a },
    ])
  })
})

describe('controlador da oficina', () => {
  test('falha ao reabrir mantém o erro e tentar de novo busca a cabeça real', async () => {
    const real = criarHostEmMemoria()
    let falhar = false,
      leituras = 0
    const host: CenariosHost = {
      ...real,
      async abrirCenario(id) {
        leituras++
        if (falhar) throw Error('Sem conexão')
        return real.abrirCenario(id)
      },
    }
    const { controlador, cenario } = await abrir(host)
    await real.editarCenario(
      cenario.id,
      0,
      [{ tipo: 'cenario.renomear', nome: 'Mudou fora' }],
      'edicao-fora',
    )
    falhar = true
    await controlador.recarregar()
    expect(controlador.getState().salvamento).toBe('erro')
    expect(controlador.executar([{ tipo: 'cenario.renomear', nome: 'Ainda não pode' }])).toBe(false)
    falhar = false
    controlador.tentarDeNovo()
    await controlador.terminar()
    expect(leituras).toBe(3)
    expect(controlador.getState().documento.nome).toBe('Mudou fora')
    expect(controlador.getState().salvamento).toBe('guardado')
  })
  test('desfazer e refazer continuam disponíveis depois de criar outro controlador', async () => {
    const { host, cenario, controlador } = await abrir()
    por(controlador, ids())
    await controlador.terminar()
    const reaberto = criarControlador(host, await host.abrirCenario(cenario.id))
    expect(reaberto.getState().podeDesfazer).toBe(true)
    await reaberto.desfazer()
    expect(reaberto.getState().documento.instancias).toHaveLength(0)
    const maisUmaVez = criarControlador(host, await host.abrirCenario(cenario.id))
    expect(maisUmaVez.getState().podeRefazer).toBe(true)
    await maisUmaVez.refazer()
    expect(maisUmaVez.getState().documento.instancias).toHaveLength(1)
    expect(maisUmaVez.getState().revisao).toBe(3)
  })
  test('resposta perdida de desfazer repete a mesma operação, sem desfazer duas vezes', async () => {
    const real = criarHostEmMemoria()
    let perder = true
    const operacoes: string[] = []
    const host: CenariosHost = {
      ...real,
      async moverHistorico(...args) {
        operacoes.push(args[3])
        const resposta = await real.moverHistorico(...args)
        if (perder) {
          perder = false
          throw Error('A resposta se perdeu')
        }
        return resposta
      },
    }
    const { cenario, controlador } = await abrir(host)
    por(controlador, ids())
    await controlador.desfazer()
    expect(controlador.getState().salvamento).toBe('erro')
    expect(
      controlador.executar([
        { tipo: 'cenario.renomear', nome: 'Não pode enquanto o resultado está incerto' },
      ]),
    ).toBe(false)
    controlador.tentarDeNovo()
    await controlador.terminar()
    expect(operacoes).toHaveLength(2)
    expect(operacoes[1]).toBe(operacoes[0])
    expect(controlador.getState().documento.instancias).toHaveLength(0)
    expect((await host.abrirCenario(cenario.id)).revisao).toBe(2)
  })
  test('restaurar uma versão também vira um passo que pode ser desfeito', async () => {
    const { controlador, host, cenario } = await abrir()
    controlador.executar([{ tipo: 'cenario.renomear', nome: 'Primeira' }])
    controlador.executar([{ tipo: 'cenario.renomear', nome: 'Segunda' }])
    await controlador.restaurar(1)
    expect(controlador.getState().documento.nome).toBe('Primeira')
    expect(controlador.getState().revisao).toBe(3)
    await controlador.desfazer()
    expect(controlador.getState().documento.nome).toBe('Segunda')
    expect((await host.listarRevisoes(cenario.id)).itens.map((r) => r.revisao)).toEqual([
      4, 3, 2, 1,
    ])
  })
  test('a edição aparece na hora e é guardada no host, na ordem', async () => {
    const { host, cenario, controlador } = await abrir()
    const novoId = ids()
    por(controlador, novoId)
    por(controlador, novoId, 3)
    expect(controlador.getState().salvamento).toBe('guardando')
    await controlador.terminar()
    expect(controlador.getState().salvamento).toBe('guardado')
    const guardado = await host.abrirCenario(cenario.id)
    expect(guardado.revisao).toBe(2)
    expect(guardado.documento.instancias).toHaveLength(2)
  })
  test('desfazer e refazer andam pelos passos e também são guardados', async () => {
    const { host, cenario, controlador } = await abrir()
    const novoId = ids()
    const a = por(controlador, novoId)
    por(controlador, novoId, 3)
    await controlador.desfazer()
    expect(controlador.getState().documento.instancias.map((o) => o.id)).toEqual([a])
    expect(controlador.getState()).toMatchObject({ podeDesfazer: true, podeRefazer: true })
    await controlador.desfazer()
    expect(controlador.getState().documento.instancias).toHaveLength(0)
    expect(controlador.getState().documento.modelos).toHaveLength(0)
    await controlador.refazer()
    await controlador.refazer()
    expect(controlador.getState().documento.instancias).toHaveLength(2)
    expect(controlador.getState().podeRefazer).toBe(false)
    await controlador.terminar()
    expect((await host.abrirCenario(cenario.id)).documento.instancias).toHaveLength(2)
  })
  test('uma edição nova apaga o refazer', async () => {
    const { controlador } = await abrir()
    const novoId = ids()
    por(controlador, novoId)
    await controlador.desfazer()
    por(controlador, novoId, 9)
    expect(controlador.getState().podeRefazer).toBe(false)
  })
  test('ação recusada não muda nada e diz o motivo', async () => {
    const { controlador } = await abrir()
    const recusado: ComandoDeCenario[] = [{ tipo: 'instancia.remover', id: 'fantasma' }]
    expect(controlador.executar(recusado)).toBe(false)
    expect(controlador.getState().recusa).toContain('Elemento ausente')
    expect(controlador.getState().revisao).toBe(0)
    expect(controlador.getState().podeDesfazer).toBe(false)
    controlador.limparRecusa()
    expect(controlador.getState().recusa).toBeNull()
  })
  test('a escolha segue os toques e esquece o que foi apagado', async () => {
    const { controlador } = await abrir()
    const novoId = ids()
    const a = por(controlador, novoId)
    const b = por(controlador, novoId, 3)
    controlador.tocar(a, false)
    controlador.tocar(b, true)
    expect(controlador.getState().selecao).toEqual([a, b])
    controlador.tocar(a, true)
    expect(controlador.getState().selecao).toEqual([b])
    controlador.executar(comandosParaApagar(controlador.getState().documento, [b]))
    expect(controlador.getState().selecao).toEqual([])
    controlador.tocar(null, false)
    expect(controlador.getState().selecao).toEqual([])
  })
  test('falha de rede segura a fila; tentar de novo guarda tudo na ordem', async () => {
    const real = criarHostEmMemoria()
    let cair = true
    const host: CenariosHost = {
      ...real,
      editarCenario: (...args) =>
        cair ? Promise.reject(new Error('sem rede')) : real.editarCenario(...args),
    }
    const { cenario, controlador } = await abrir(host)
    const novoId = ids()
    por(controlador, novoId)
    await controlador.terminar()
    expect(controlador.getState().salvamento).toBe('erro')
    por(controlador, novoId, 3)
    expect(controlador.getState().documento.instancias).toHaveLength(2)
    cair = false
    controlador.tentarDeNovo()
    await controlador.terminar()
    expect(controlador.getState().salvamento).toBe('guardado')
    expect((await real.abrirCenario(cenario.id)).documento.instancias).toHaveLength(2)
  })
  test('cenário que mudou em outro lugar para a edição até recarregar', async () => {
    const { host, cenario, controlador } = await abrir()
    await host.editarCenario(
      cenario.id,
      0,
      [{ tipo: 'cenario.renomear', nome: 'De outro lugar' }],
      'fora',
    )
    por(controlador, ids())
    await controlador.terminar()
    expect(controlador.getState().salvamento).toBe('desatualizado')
    expect(controlador.executar([{ tipo: 'cenario.renomear', nome: 'Aqui' }])).toBe(false)
    await controlador.recarregar()
    expect(controlador.getState()).toMatchObject({ salvamento: 'guardado', revisao: 1 })
    expect(controlador.getState().documento.nome).toBe('De outro lugar')
    expect(controlador.getState().podeDesfazer).toBe(true)
  })
})

describe('host em memória', () => {
  test('a mesma operação mandada duas vezes vale uma só', async () => {
    const host = criarHostEmMemoria()
    const mundo = await host.criarMundo('conta', 'Jogo')
    const cenario = await host.criarCenario(mundo.id, 'Fase')
    const comandos: ComandoDeCenario[] = [{ tipo: 'cenario.renomear', nome: 'Outro nome' }]
    expect(await host.editarCenario(cenario.id, 0, comandos, 'op')).toEqual({ revisao: 1 })
    expect(await host.editarCenario(cenario.id, 0, comandos, 'op')).toEqual({ revisao: 1 })
    await expect(host.editarCenario(cenario.id, 0, comandos, 'outra')).rejects.toBeInstanceOf(
      CenarioDesatualizado,
    )
    expect((await host.listarCenarios(mundo.id))[0]!.nome).toBe('Outro nome')
  })
  test('espaço da equipe só existe quando pedido, e bibliotecas ficam em cada espaço', async () => {
    expect((await criarHostEmMemoria().espacos()).map((e) => e.tipo)).toEqual(['conta'])
    const host = criarHostEmMemoria({ equipe: true })
    expect((await host.espacos()).map((e) => e.tipo)).toEqual(['conta', 'equipe'])
    await host.criarBiblioteca('equipe', { nome: 'Aventura', licenca: 'restrita' })
    expect(await host.listarBibliotecas('conta')).toEqual([])
    expect((await host.listarBibliotecas('equipe'))[0]).toMatchObject({
      nome: 'Aventura',
      licenca: 'restrita',
      modelos: 0,
    })
  })
  test('apagar uma biblioteca a tira dos mundos que a usavam', async () => {
    const host = criarHostEmMemoria()
    const biblioteca = await host.criarBiblioteca('conta', { nome: 'Cidade', licenca: 'livre' })
    const mundo = await host.criarMundo('conta', 'Jogo')
    await host.editarMundo(mundo.id, { bibliotecas: [biblioteca.id, 'inexistente'] })
    expect((await host.listarMundos('conta'))[0]!.bibliotecas).toEqual([biblioteca.id])
    await host.apagarBiblioteca(biblioteca.id)
    expect((await host.listarMundos('conta'))[0]!.bibliotecas).toEqual([])
  })
})
