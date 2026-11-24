import { expect, test } from 'bun:test'
import { criarHostEmMemoria } from '@sistemazero/molda-cenarios/oficina/host-memoria'
import { type ComandoDeCenario, digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { criarContexto, executarFerramenta } from '../src/oficina/ferramentas'
import { criarIntencoes } from '../src/oficina/intencoes'

/** Um cenário com relevo de verdade, uma casa assentada, uma no meio da trilha e outras no ar. */
async function cenarioComCasas() {
  const host = criarHostEmMemoria({ equipe: true })
  const biblioteca = await host.criarBiblioteca('conta', { nome: 'Vila', licenca: 'propria' })
  const conteudo = new TextEncoder().encode('glb de ensaio: casa')
  const [m] = await host.importarModelos(biblioteca.id, [
    {
      nome: 'Casa',
      pasta: '',
      etiquetas: [],
      conteudo,
      digest: await digestDosBytes(conteudo),
      miniatura: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
      min: [-1, 0, -1],
      max: [1, 2, 1],
      triangulos: 12,
    },
  ])
  const casa = { bibliotecaId: biblioteca.id, modeloId: m!.id, digest: m!.digest }
  const mundo = await host.criarMundo('conta', 'Vila do agente')
  await host.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
  const cenario = await host.criarCenario(mundo.id, 'Vila')
  const a = criarIntencoes(host)
  await a.gerarTerreno(cenario.id, { tipo: 'plano', altura: 2 })
  const assentada = (await a.colocarModelo(cenario.id, { ...casa, x: 0, z: -10 })).criados[0]!
  await a.tracarCaminho(cenario.id, {
    caminho: {
      tipo: 'trilha',
      nome: 'Trilha da vila',
      pontos: [
        { x: -15, z: 5 },
        { x: 15, z: 5 },
      ],
      largura: 2,
      acabamento: null,
    },
  })
  const noCaminho = (await a.colocarModelo(cenario.id, { ...casa, x: 0, z: 5 })).criados[0]!
  return { host, cenario, assentada, noCaminho }
}

test('conferir_implantacao lê o relevo guardado, conta por tipo e não grava nada', async () => {
  const { host, cenario, assentada, noCaminho } = await cenarioComCasas()
  const aberto = await host.abrirCenario(cenario.id)
  const molde = aberto.documento.instancias.find((o) => o.id === assentada)!
  // Sessenta casas meio metro acima do chão, longe da trilha.
  const comandos: ComandoDeCenario[] = Array.from({ length: 60 }, (_, i) => ({
    tipo: 'instancia.criar',
    instancia: {
      ...molde,
      id: `no-ar-${i}`,
      nome: `No ar ${i}`,
      apoio: { tipo: 'terreno', deslocamento: 0.5, inclinar: false, referencia: 'volume' },
      transformacao: {
        ...molde.transformacao,
        posicao: { x: -40 + (i % 10) * 6, y: 0, z: -40 - Math.floor(i / 10) * 6 },
      },
    },
  }))
  await host.editarCenario(cenario.id, aberto.revisao, comandos, 'op-implantacao-1')
  const antes = await host.abrirCenario(cenario.id)

  // A ferramenta só aceita UUID; o host em memória numera os ids. A tradução fica no host.
  const uuid = '6f1c2b9e-3d4a-4f5b-8c6d-7e8f9a0b1c2d',
    traduzir = (id: string) => (id === uuid ? cenario.id : id)
  const contexto = criarContexto({
    ...host,
    abrirCenario: (id: string) => host.abrirCenario(traduzir(id)),
    conteudoDoTerreno: (id: string, digest: string, sinal?: AbortSignal) =>
      host.conteudoDoTerreno(traduzir(id), digest, sinal),
  })
  const r = await executarFerramenta(contexto, 'conferir_implantacao', { cenarioId: uuid })
  if (!r.ok) throw Error(JSON.stringify(r.erro))
  const valor = r.valor as {
    revisao: number
    total: number
    mostrados: number
    grupos: { tipo: string; quantidade: number; itens: { id: string; mensagem: string }[] }[]
  }
  expect(valor.revisao).toBe(antes.revisao)
  expect(valor.total).toBe(61)
  expect(valor.grupos.map((g) => [g.tipo, g.quantidade])).toEqual([
    ['solido-no-caminho', 1],
    ['flutuando', 60],
  ])
  // Até 50 exemplos, repartidos: o grupo pequeno aparece inteiro.
  expect(valor.mostrados).toBe(50)
  expect(valor.grupos[0]!.itens.map((i) => i.id)).toEqual([noCaminho])
  expect(valor.grupos[1]!.itens).toHaveLength(49)
  expect(valor.grupos.flatMap((g) => g.itens.map((i) => i.id))).not.toContain(assentada)
  expect((await host.abrirCenario(cenario.id)).revisao).toBe(antes.revisao)

  const ruim = await executarFerramenta(contexto, 'conferir_implantacao', { cenarioId: 'x' })
  expect(ruim.ok).toBe(false)
})
