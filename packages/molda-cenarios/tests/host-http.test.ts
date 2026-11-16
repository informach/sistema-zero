import { describe, expect, test } from 'bun:test'
import { criarDocumentoVazio, digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { criarHostHttp, ErroDaOficina } from '../src/oficina/host-http'
import { CenarioDesatualizado, type ModeloParaImportar } from '../src/oficina/portas'

const ESPACO = '11111111-1111-4111-8111-111111111111'
const BIBLIOTECA = '33333333-3333-4333-8333-333333333333'
const MUNDO = '77777777-7777-4777-8777-777777777777'
const CENARIO = '44444444-4444-4444-8444-444444444444'
const PERFIL = '66666666-6666-4666-8666-666666666666'
const digest = (letra: string) => letra.repeat(64)

interface Pedido {
  metodo: string
  caminho: string
  corpo: unknown
  headers: Record<string, string>
}

function cabecalhos(init: RequestInit['headers']): Record<string, string> {
  const lidos: Record<string, string> = {}
  new Headers(init).forEach((valor, nome) => {
    lidos[nome] = valor
  })
  return lidos
}

/** Um app de mentira: responde pelo caminho e guarda o que foi pedido e o que subiu. */
function montar(
  responder: (p: Pedido) => { status?: number; corpo: unknown } | Response | undefined = () =>
    undefined,
) {
  const pedidos: Pedido[] = []
  const enviados: Array<{ url: string; tipo: string | null; bytes: number }> = []
  const baixados: string[] = []
  const host = criarHostHttp({
    pessoaId: PERFIL,
    buscar: async (entrada: string, init: RequestInit = {}) => {
      const url = String(entrada)
      const pedido: Pedido = {
        metodo: init.method ?? 'GET',
        caminho: url.replace('/api/cenarios/', ''),
        corpo: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
        headers: cabecalhos(init.headers),
      }
      pedidos.push(pedido)
      const resposta = responder(pedido)
      if (resposta instanceof Response) return resposta
      return Response.json(resposta?.corpo ?? { ok: true }, { status: resposta?.status ?? 200 })
    },
    enviar: async (entrada: string, init: RequestInit = {}) => {
      if (init.method !== 'PUT') {
        // Baixar um arquivo: sem cabeçalho nenhum além do que o navegador põe.
        expect(init.headers).toBeUndefined()
        baixados.push(String(entrada))
        return new Response(new Uint8Array([1, 2, 3]))
      }
      const corpo = init.body as Uint8Array | Blob
      enviados.push({
        url: String(entrada),
        tipo: new Headers(init.headers).get('content-type'),
        bytes: corpo instanceof Blob ? corpo.size : corpo.byteLength,
      })
      return new Response(null, { status: 200 })
    },
  })
  return { host, pedidos, enviados, baixados }
}

const bibliotecaDoServidor = {
  id: BIBLIOTECA,
  espacoId: ESPACO,
  nome: 'Aventura',
  licenca: 'propria',
  modelos: 1,
  capa: digest('m'),
  atualizadaEm: '2026-11-16T12:00:00.000Z',
}

async function modeloParaImportar(nome: string, bytes: number[]): Promise<ModeloParaImportar> {
  const conteudo = new Uint8Array(bytes)
  return {
    nome,
    pasta: 'natureza',
    etiquetas: ['verde'],
    conteudo,
    digest: await digestDosBytes(conteudo),
    miniatura: new Blob([new Uint8Array([9, 9, 9])], { type: 'image/webp' }),
    min: [-1, 0, -1],
    max: [1, 3, 1],
    triangulos: 12,
  }
}

describe('a oficina falando com o app', () => {
  test('reabrir preserva o espaço dos modelos de uma biblioteca apagada', async () => {
    const documento = criarDocumentoVazio(CENARIO, 'Ilha')
    documento.modelos = [
      { id: 'antigo', modelo: 'antigo', biblioteca: BIBLIOTECA, digest: digest('a') },
    ]
    const { host, pedidos } = montar((p) => {
      if (p.caminho === `cenarios/${CENARIO}`)
        return {
          corpo: {
            id: CENARIO,
            mundoId: MUNDO,
            espacoId: ESPACO,
            documento,
            revisao: 1,
            nome: 'Ilha',
            atualizadoEm: '2026-11-16T12:00:00Z',
            capa: null,
          },
        }
      return { corpo: { url: 'https://r2/modelo-antigo' } }
    })
    await host.abrirCenario(CENARIO)
    expect(
      new Uint8Array(await host.conteudoDoModelo({ biblioteca: BIBLIOTECA, digest: digest('a') })),
    ).toEqual(new Uint8Array([1, 2, 3]))
    expect(pedidos.map((p) => p.caminho)).toEqual([
      `cenarios/${CENARIO}`,
      `espacos/${ESPACO}/arquivos/${digest('a')}?tipo=modelo&como=endereco`,
    ])
  })
  test('cancelamento durante upload não registra modelos nem inicia o próximo lote', async () => {
    const controle = new AbortController()
    const caminhos: string[] = []
    const m = await modeloParaImportar('Árvore', [1, 2, 3])
    const host = criarHostHttp({
      buscar: async (url) => {
        caminhos.push(url)
        if (url.endsWith('/espacos'))
          return Response.json([{ id: ESPACO, tipo: 'conta', usadoBytes: 0, limiteBytes: 100 }])
        if (url.endsWith('/bibliotecas')) return Response.json([bibliotecaDoServidor])
        return Response.json({
          espacoId: ESPACO,
          enviar: [
            { digest: m.digest, tipoDoConteudo: 'model/gltf-binary', url: 'https://r2/modelo' },
          ],
        })
      },
      enviar: async (_url, init) => {
        expect(init?.signal).toBe(controle.signal)
        controle.abort()
        throw controle.signal.reason
      },
    })
    await expect(
      host.importarModelos(BIBLIOTECA, [m], undefined, controle.signal),
    ).rejects.toHaveProperty('name', 'AbortError')
    expect(caminhos.some((p) => p.endsWith('/modelos'))).toBe(false)
    const n = caminhos.length
    await expect(
      host.importarModelos(BIBLIOTECA, [m], undefined, controle.signal),
    ).rejects.toHaveProperty('name', 'AbortError')
    expect(caminhos).toHaveLength(n)
  })

  test('organização consulta o índice da biblioteca inteira', async () => {
    const { host, pedidos } = montar(() => ({
      corpo: { pastas: ['Natureza/Árvores'], etiquetas: ['verde'] },
    }))
    expect(await host.organizacaoDaBiblioteca(BIBLIOTECA)).toEqual({
      pastas: ['Natureza/Árvores'],
      etiquetas: ['verde'],
    })
    expect(pedidos[0]?.caminho).toBe(`bibliotecas/${BIBLIOTECA}/organizacao`)
  })
  test('espaços ganham nome e as capas viram endereços do próprio app', async () => {
    const { host, pedidos } = montar((p) => {
      if (p.caminho === 'espacos')
        return { corpo: [{ id: ESPACO, tipo: 'equipe', usadoBytes: 10, limiteBytes: 100 }] }
      if (p.caminho === `espacos/${ESPACO}/bibliotecas`) return { corpo: [bibliotecaDoServidor] }
      if (p.caminho === `espacos/${ESPACO}/mundos`)
        return {
          corpo: [
            {
              id: MUNDO,
              espacoId: ESPACO,
              nome: 'Ilha',
              cenarios: 1,
              bibliotecas: [BIBLIOTECA],
              capa: digest('c'),
              atualizadoEm: '2026-11-16T12:00:00.000Z',
            },
          ],
        }
      if (p.caminho === `mundos/${MUNDO}/cenarios`)
        return {
          corpo: [
            {
              id: CENARIO,
              mundoId: MUNDO,
              nome: 'Praia',
              revisao: 3,
              capa: digest('c'),
              atualizadoEm: '2026-11-16T12:00:00.000Z',
            },
          ],
        }
      return undefined
    })
    expect(await host.espacos()).toEqual([
      { id: ESPACO, tipo: 'equipe', nome: 'Equipe Sistema Zero', usadoBytes: 10, limiteBytes: 100 },
    ])
    const [biblioteca] = await host.listarBibliotecas(ESPACO)
    expect(biblioteca?.capa).toBe(`/api/cenarios/espacos/${ESPACO}/arquivos/${digest('m')}`)
    const [mundo] = await host.listarMundos(ESPACO)
    expect(mundo?.capa).toBe(`/api/cenarios/espacos/${ESPACO}/arquivos/${digest('c')}`)
    const [cenario] = await host.listarCenarios(MUNDO)
    expect(cenario?.capa).toBe(`/api/cenarios/espacos/${ESPACO}/arquivos/${digest('c')}`)
    // Toda chamada diz quem é a pessoa da página.
    expect(pedidos.every((p) => p.headers['x-sz-viewer'] === PERFIL)).toBe(true)
  })

  test('trazer modelos: reserva, sobe só o que falta, direto ao armazenamento, e registra', async () => {
    const arvore = await modeloParaImportar('Árvore', [1, 2, 3, 4])
    const pedra = await modeloParaImportar('Pedra', [5, 6])
    const retrato = await digestDosBytes(new Uint8Array([9, 9, 9]))
    const { host, pedidos, enviados } = montar((p) => {
      if (p.caminho === `espacos/${ESPACO}/bibliotecas`) return { corpo: [bibliotecaDoServidor] }
      if (p.caminho.endsWith('/modelos/reservar'))
        return {
          corpo: {
            espacoId: ESPACO,
            // A pedra já estava guardada (o mesmo conteúdo, trazido antes): não sobe de novo.
            enviar: [
              {
                digest: arvore.digest,
                tipoDoConteudo: 'model/gltf-binary',
                url: 'https://r2/arvore',
              },
              { digest: retrato, tipoDoConteudo: 'image/webp', url: 'https://r2/retrato' },
            ],
          },
        }
      if (p.caminho === `bibliotecas/${BIBLIOTECA}/modelos`)
        return {
          corpo: [
            {
              id: 'm1',
              bibliotecaId: BIBLIOTECA,
              nome: 'Árvore',
              pasta: 'natureza',
              etiquetas: ['verde'],
              digest: arvore.digest,
              bytes: 4,
              triangulos: 12,
              min: [-1, 0, -1],
              max: [1, 3, 1],
              miniatura: retrato,
            },
          ],
        }
      return undefined
    })
    await host.listarBibliotecas(ESPACO)
    const andamento: Array<[number, number]> = []
    const criados = await host.importarModelos(BIBLIOTECA, [arvore, pedra], (f, t) =>
      andamento.push([f, t]),
    )

    const reserva = pedidos.find((p) => p.caminho.endsWith('/modelos/reservar'))
    expect(reserva?.corpo).toEqual({
      modelos: [
        { digest: arvore.digest, bytes: 4, miniatura: { digest: retrato, bytes: 3 } },
        { digest: pedra.digest, bytes: 2, miniatura: { digest: retrato, bytes: 3 } },
      ],
    })
    expect(enviados.sort((a, b) => a.url.localeCompare(b.url))).toEqual([
      { url: 'https://r2/arvore', tipo: 'model/gltf-binary', bytes: 4 },
      { url: 'https://r2/retrato', tipo: 'image/webp', bytes: 3 },
    ])
    const registro = pedidos.find((p) => p.caminho === `bibliotecas/${BIBLIOTECA}/modelos`)
    expect(registro?.metodo).toBe('POST')
    expect(registro?.corpo).toMatchObject({
      espacoId: ESPACO,
      modelos: [
        { nome: 'Árvore', digest: arvore.digest, miniatura: retrato, triangulos: 12 },
        { nome: 'Pedra', digest: pedra.digest, miniatura: retrato },
      ],
    })
    // O arquivo em si nunca vai no corpo de uma chamada ao app.
    expect(JSON.stringify(registro?.corpo)).not.toContain('conteudo')
    expect(criados[0]?.miniatura).toBe(`/api/cenarios/espacos/${ESPACO}/arquivos/${retrato}`)
    expect(andamento).toEqual([
      [0, 2],
      [2, 2],
    ])
  })

  test('mais de 50 modelos vão em lotes, e o envio que falha interrompe com uma frase', async () => {
    const muitos = await Promise.all(
      Array.from({ length: 51 }, (_, i) => modeloParaImportar(`Peça ${i}`, [i, i + 1, 200])),
    )
    const ok = montar((p) => {
      if (p.caminho === `espacos/${ESPACO}/bibliotecas`) return { corpo: [bibliotecaDoServidor] }
      if (p.caminho.endsWith('/modelos/reservar'))
        return { corpo: { espacoId: ESPACO, enviar: [] } }
      if (p.caminho === `bibliotecas/${BIBLIOTECA}/modelos`) return { corpo: [] }
      return undefined
    })
    await ok.host.listarBibliotecas(ESPACO)
    await ok.host.importarModelos(BIBLIOTECA, muitos)
    const reservas = ok.pedidos.filter((p) => p.caminho.endsWith('/modelos/reservar'))
    expect(reservas.map((r) => (r.corpo as { modelos: unknown[] }).modelos.length)).toEqual([50, 1])

    const falha = criarHostHttp({
      buscar: async (entrada: string) => {
        const url = String(entrada)
        if (url.endsWith('/bibliotecas')) return Response.json([bibliotecaDoServidor])
        return Response.json({
          espacoId: ESPACO,
          enviar: [
            { digest: muitos[0]!.digest, tipoDoConteudo: 'model/gltf-binary', url: 'https://r2/x' },
          ],
        })
      },
      enviar: async () => new Response(null, { status: 403 }),
    })
    await falha.listarBibliotecas(ESPACO)
    await expect(falha.importarModelos(BIBLIOTECA, [muitos[0]!])).rejects.toThrow(
      'O envio parou no meio. Tente de novo.',
    )
  })

  test('editar: revisão vencida vira CenarioDesatualizado; outra recusa leva a frase do servidor', async () => {
    const desatualizado = montar(() => ({
      status: 409,
      corpo: {
        error: { code: 'CENARIO_DESATUALIZADO', message: 'mudou' },
        details: { revisaoAtual: 9 },
      },
    }))
    const erro = await desatualizado.host
      .editarCenario(CENARIO, 3, [{ tipo: 'cenario.renomear', nome: 'Praia' }], 'operacao-1')
      .catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(CenarioDesatualizado)
    expect((erro as CenarioDesatualizado).revisaoAtual).toBe(9)
    expect(desatualizado.pedidos[0]).toMatchObject({
      metodo: 'POST',
      caminho: `cenarios/${CENARIO}/lotes`,
      corpo: { revisaoEsperada: 3, operacaoId: 'operacao-1' },
    })

    const cheio = montar(() => ({
      status: 409,
      corpo: {
        error: { code: 'CENARIOS_SEM_ESPACO', message: 'Não cabe mais nada no seu espaço' },
      },
    }))
    const recusa = await cheio.host.criarMundo(ESPACO, 'Ilha').catch((e: unknown) => e)
    expect(recusa).toBeInstanceOf(ErroDaOficina)
    expect(recusa).toMatchObject({
      message: 'Não cabe mais nada no seu espaço',
      status: 409,
      codigo: 'CENARIOS_SEM_ESPACO',
    })

    const semRede = criarHostHttp({
      buscar: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    // Erro do navegador nunca chega cru (em inglês) à tela.
    await expect(semRede.espacos()).rejects.toThrow('Sem conexão agora. Tente de novo.')
  })

  test('abrir o cenário, guardar a capa e apagar modelos pela biblioteca', async () => {
    const documento = criarDocumentoVazio(CENARIO, 'Praia')
    const { host, pedidos, enviados } = montar((p) => {
      if (p.caminho === `cenarios/${CENARIO}`)
        return {
          corpo: {
            id: CENARIO,
            mundoId: MUNDO,
            espacoId: ESPACO,
            nome: 'Praia',
            revisao: 4,
            capa: null,
            atualizadoEm: '2026-11-16T12:00:00.000Z',
            documento,
          },
        }
      if (p.caminho.endsWith('/capa/reservar'))
        return {
          corpo: {
            espacoId: ESPACO,
            enviar: [
              {
                digest: (p.corpo as { digest: string }).digest,
                tipoDoConteudo: 'image/webp',
                url: 'https://r2/capa',
              },
            ],
          },
        }
      return undefined
    })
    const aberto = await host.abrirCenario(CENARIO)
    expect(aberto).toMatchObject({ revisao: 4, resumo: { id: CENARIO, capa: null }, documento })

    const imagem = new Blob([new Uint8Array([7, 7, 7, 7])], { type: 'image/webp' })
    await host.guardarCapa(CENARIO, imagem)
    const capa = await digestDosBytes(new Uint8Array([7, 7, 7, 7]))
    expect(pedidos.find((p) => p.caminho.endsWith('/capa/reservar'))?.corpo).toEqual({
      digest: capa,
      bytes: 4,
    })
    expect(enviados).toEqual([{ url: 'https://r2/capa', tipo: 'image/webp', bytes: 4 }])
    expect(pedidos.at(-1)).toMatchObject({
      metodo: 'POST',
      caminho: `cenarios/${CENARIO}/capa`,
      corpo: { espacoId: ESPACO, digest: capa },
    })

    await host.apagarModelos(BIBLIOTECA, ['m1', 'm2'])
    expect(pedidos.at(-1)).toMatchObject({
      metodo: 'POST',
      caminho: `bibliotecas/${BIBLIOTECA}/modelos/apagar`,
      corpo: { ids: ['m1', 'm2'] },
    })
  })

  test('o arquivo do modelo: o app diz onde está e a busca vai direto ao armazenamento', async () => {
    const { host, pedidos, baixados } = montar((p) => {
      if (p.caminho === 'espacos')
        return { corpo: [{ id: ESPACO, tipo: 'conta', usadoBytes: 0, limiteBytes: 1 }] }
      if (p.caminho === `espacos/${ESPACO}/bibliotecas`) return { corpo: [bibliotecaDoServidor] }
      if (p.caminho.includes('/arquivos/')) return { corpo: { url: 'https://r2/modelo-a' } }
      return undefined
    })
    // A página abriu direto no editor: a biblioteca ainda não tinha sido listada.
    const bytes = await host.conteudoDoModelo({ biblioteca: BIBLIOTECA, digest: digest('a') })
    expect(new Uint8Array(bytes)).toEqual(new Uint8Array([1, 2, 3]))
    expect(pedidos.at(-1)).toMatchObject({
      caminho: `espacos/${ESPACO}/arquivos/${digest('a')}?tipo=modelo&como=endereco`,
      headers: { 'x-sz-viewer': PERFIL },
    })
    // A busca do arquivo vai direto ao armazenamento, sem nenhum cabeçalho da sessão.
    expect(baixados).toEqual(['https://r2/modelo-a'])
  })
})
