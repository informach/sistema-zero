import { expect, test } from 'bun:test'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  codificarPecaDePintura,
  codificarRecursoDeBuracos,
  criarPinturaDeChao,
  digestDosBytes,
} from '@sistemazero/molda-cenarios-core/v2'
import { criarHostHttp } from '../src/oficina/host-http'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

const peca = async (valor = 0) => {
  const conteudo = codificarPecaDeAlturas(new Float64Array(AMOSTRAS_DA_PECA).fill(valor), 0, 255)
  return { digest: await digestDosBytes(conteudo), conteudo }
}
const base = (digests: string[]): BaseDeTerreno => ({
  tipo: 'terreno',
  origem: { x: -64, z: -64 },
  passo: 1,
  colunas: 64 * digests.length,
  linhas: 64,
  min: 0,
  max: 255,
  fundo: 0,
  pecas: digests.map((digest, coluna) => ({ coluna, linha: 0, digest })),
})

test('pintura e buracos compartilham upload, isolamento, histórico e coleta existentes', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    mundo = await host.criarMundo('conta', 'Mundo')
  const c = await host.criarCenario(mundo.id, 'Solo')
  const arquivos = await Promise.all(
    [
      codificarPecaDePintura(criarPinturaDeChao({ colunas: 64, linhas: 64 }, 8), 0, 0),
      codificarRecursoDeBuracos(new Uint8Array(512).fill(255)),
    ].map(async (conteudo) => ({ conteudo, digest: await digestDosBytes(conteudo) })),
  )
  const recursos = await host.guardarRecursos(c.id, arquivos)
  const terreno: BaseDeTerreno = {
    ...base(['a'.repeat(64)]),
    pecas: [],
    solo: {
      camadas: Array.from({ length: 8 }, (_, i) => ({
        id: `solo-${i}`,
        nome: `Solo ${i}`,
        cor: '#80b050',
      })),
      pecas: [{ coluna: 0, linha: 0, digest: arquivos[0]!.digest }],
    },
    buracos: [{ coluna: 0, linha: 0, digest: arquivos[1]!.digest }],
  }
  const errado = {
    ...terreno,
    solo: { ...terreno.solo!, camadas: terreno.solo!.camadas.slice(0, 7) },
  }
  await expect(
    host.editarCenario(
      c.id,
      0,
      [{ tipo: 'base.definir', base: errado }],
      'solo-invalido-01',
      recursos,
    ),
  ).rejects.toThrow('corresponde')
  expect((await host.abrirCenario(c.id)).revisao).toBe(0)
  await host.editarCenario(
    c.id,
    0,
    [{ tipo: 'base.definir', base: terreno }],
    'solo-valido-01',
    recursos,
  )
  await expect(
    host.editarCenario(
      c.id,
      1,
      [{ tipo: 'base.definir', base: { tipo: 'plano', largura: 64, comprimento: 64 } }],
      'solo-sem-referencia',
      recursos,
    ),
  ).rejects.toThrow('não usa')
  await host.moverHistorico(c.id, 1, 'desfazer', 'solo-undo-01')
  await host.moverHistorico(c.id, 2, 'refazer', 'solo-redo-01')
  expect((await host.abrirCenario(c.id)).documento.base).toEqual(terreno)
  const copia = await host.duplicarCenario(c.id)
  await host.apagarCenario(c.id)
  for (const arquivo of arquivos)
    expect(new Uint8Array(await host.conteudoDoTerreno(copia.id, arquivo.digest))).toEqual(
      arquivo.conteudo,
    )
  expect((await host.espacos())[0]!.usadoBytes).toBe(33808 + 520)
  await host.apagarCenario(copia.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(0)
})

test('host HTTP reserva em lotes, sobe condicionalmente e pede confirmação junto com a edição', async () => {
  const pecas = await Promise.all(Array.from({ length: 51 }, (_, i) => peca(i)))
  const pedidos: { caminho: string; corpo: Record<string, unknown> }[] = []
  const envios: RequestInit[] = []
  const host = criarHostHttp({
    buscar: async (caminho, opcoes) => {
      const corpo = JSON.parse((opcoes?.body as string) ?? '{}')
      pedidos.push({ caminho, corpo })
      if (caminho.endsWith('/recursos/reservar'))
        return Response.json({
          espacoId: 'conta',
          enviar: corpo.recursos.map((p: { digest: string }) => ({
            digest: p.digest,
            criarUmaVez: true,
            tipoDoConteudo: 'application/octet-stream',
            url: `https://ugc.exemplo/${p.digest}`,
          })),
        })
      if (caminho.includes('/arquivos/')) return Response.json({ url: 'https://ugc.exemplo/ler' })
      return Response.json({ revisao: 1 })
    },
    enviar: async (_url, opcoes) => {
      if (opcoes?.method === 'PUT') {
        envios.push(opcoes)
        return new Response(null, { status: 200 })
      }
      return new Response(pecas[0]!.conteudo)
    },
  })
  const recursos = await host.guardarRecursos('cenario', pecas)
  expect(pedidos.filter((p) => p.caminho.endsWith('/recursos/reservar')).length).toBe(2)
  expect(envios.length).toBe(51)
  for (const e of envios) expect(new Headers(e.headers).get('if-none-match')).toBe('*')
  expect(new Headers(envios[0]!.headers).get('content-type')).toBe('application/octet-stream')
  const b = base(pecas.map((p) => p.digest))
  await host.editarCenario(
    'cenario',
    0,
    [{ tipo: 'base.definir', base: b }],
    'importar-alturas-01',
    recursos,
  )
  expect(pedidos.at(-1)!.corpo).toMatchObject({
    recursos,
    revisaoEsperada: 0,
    operacaoId: 'importar-alturas-01',
  })
  expect('conferidos' in pedidos.at(-1)!.corpo).toBe(false)
  expect(new Uint8Array(await host.conteudoDoTerreno('cenario', pecas[0]!.digest))).toEqual(
    pecas[0]!.conteudo,
  )
  const antes = pedidos.length
  await expect(
    host.guardarRecursos('cenario', [{ ...pecas[0]!, digest: 'a'.repeat(64) }]),
  ).rejects.toThrow('hash')
  expect(pedidos.length).toBe(antes)
})

test('host local reabre as alturas e as conserva no histórico; outro espaço não reaproveita os bytes', async () => {
  const host = criarHostEmMemoria({ equipe: true })
  const mundo = await host.criarMundo('conta', 'Mundo')
  const c = await host.criarCenario(mundo.id, 'Relevo')
  const arquivo = await peca(3)
  const recursos = await host.guardarRecursos(c.id, [arquivo, arquivo])
  expect(recursos.digests).toHaveLength(1)
  await host.editarCenario(
    c.id,
    0,
    [{ tipo: 'base.definir', base: base(recursos.digests) }],
    'importar-relevo-01',
    recursos,
  )
  expect((await host.abrirCenario(c.id)).documento.base.tipo).toBe('terreno')
  expect(new Uint8Array(await host.conteudoDoTerreno(c.id, arquivo.digest))).toEqual(
    arquivo.conteudo,
  )
  await host.moverHistorico(c.id, 1, 'desfazer', 'desfazer-relevo-01')
  expect((await host.abrirCenario(c.id)).documento.base.tipo).toBe('plano')
  await host.moverHistorico(c.id, 2, 'refazer', 'refazer-relevo-01')
  expect((await host.abrirCenario(c.id)).documento.base.tipo).toBe('terreno')
  expect((await host.espacos())[0]!.usadoBytes).toBe(8474)
  const equipe = await host.criarMundo('equipe', 'Equipe')
  const outro = await host.criarCenario(equipe.id, 'Outro')
  await expect(
    host.editarCenario(
      outro.id,
      0,
      [{ tipo: 'base.definir', base: base(recursos.digests) }],
      'copiar-outro-espaco',
    ),
  ).rejects.toThrow('peça')
  expect((await host.abrirCenario(outro.id)).revisao).toBe(0)
  await host.guardarRecursos(outro.id, [arquivo])
  const recursosDaEquipe = { espacoId: 'equipe', digests: recursos.digests }
  await host.editarCenario(
    outro.id,
    0,
    [{ tipo: 'base.definir', base: base(recursos.digests) }],
    'importar-equipe-01',
    recursosDaEquipe,
  )
  const copia = await host.duplicarCenario(c.id)
  await host.apagarCenario(c.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(8474)
  expect(new Uint8Array(await host.conteudoDoTerreno(copia.id, arquivo.digest))).toEqual(
    arquivo.conteudo,
  )
  await host.apagarMundo(mundo.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(0)
  expect((await host.espacos())[1]!.usadoBytes).toBe(8474)
})
