import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  digestDosBytes,
  MAX_BYTES_DE_TEXTURA_CENARIO,
} from '@sistemazero/molda-cenarios-core/v2'
import { type Buscar, criarHostHttp } from '../src/oficina/host-http'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

test('host local protege imagem no histórico, isola espaços e libera só ao apagar a última cópia', async () => {
  const host = criarHostEmMemoria({ equipe: true })
  const b = await host.criarBiblioteca('conta', { nome: 'Materiais', licenca: 'propria' })
  const outra = await host.criarBiblioteca('equipe', { nome: 'Outra', licenca: 'restrita' })
  const bytes = new Uint8Array(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl0wL8AAAAASUVORK5CYII=',
      'base64',
    ),
  )
  const digest = await digestDosBytes(bytes)
  const [t] = await host.importarTexturas(b.id, [
    {
      nome: 'Terra',
      pasta: '',
      etiquetas: [],
      digest,
      largura: 1,
      altura: 1,
      repeticaoMetros: 2,
      conteudo: new Blob([bytes], { type: 'image/png' }),
    },
  ])
  const mundo = await host.criarMundo('conta', 'Mundo'),
    c = await host.criarCenario(mundo.id, 'Solo')
  const ref = { id: 'terra', textura: t!.id, biblioteca: b.id, digest }
  await host.editarCenario(c.id, 0, [{ tipo: 'textura.definir', textura: ref }], 'fixar-textura-01')
  expect(new Uint8Array(await host.conteudoDaTextura({ biblioteca: b.id, digest }))).toEqual(bytes)
  await expect(host.conteudoDaTextura({ biblioteca: outra.id, digest })).rejects.toThrow(
    'não existe',
  )
  await expect(
    host.editarCenario(
      c.id,
      1,
      [{ tipo: 'textura.definir', textura: { ...ref, id: 'outra', biblioteca: outra.id } }],
      'negar-espaco-01',
    ),
  ).rejects.toThrow('espaço')
  await host.editarCenario(c.id, 1, [{ tipo: 'textura.remover', id: ref.id }], 'tirar-textura-01')
  await host.apagarBiblioteca(b.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(bytes.length)
  expect(new Uint8Array(await host.conteudoDaTextura({ biblioteca: b.id, digest }))).toEqual(bytes)
  await host.moverHistorico(c.id, 2, 'desfazer', 'desfazer-textura-1')
  expect((await host.abrirCenario(c.id)).documento.texturas).toEqual([ref])
  const copia = await host.duplicarCenario(c.id)
  await host.apagarCenario(c.id)
  expect((await host.abrirCenario(copia.id)).documento.texturas).toEqual([ref])
  expect((await host.espacos())[0]!.usadoBytes).toBe(bytes.length)
  await host.apagarMundo(mundo.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(0)
})

function hostComTextura(enviar: Buscar) {
  const caminhos: string[] = [],
    doc = criarDocumentoVazio('c', 'Materiais')
  doc.texturas = [{ id: 't', textura: 't', biblioteca: 'b-apagada', digest: 'a'.repeat(64) }]
  const host = criarHostHttp({
    buscar: async (url) => {
      caminhos.push(url)
      return Response.json(
        url.endsWith('/cenarios/c')
          ? {
              id: 'c',
              mundoId: 'm',
              espacoId: 's',
              nome: doc.nome,
              documento: doc,
              revisao: 1,
              historico: { revisao: 1, desfazer: 1, refazer: 0 },
              atualizadoEm: '2026-11-17T00:00:00Z',
              capa: null,
            }
          : { url: 'https://r2.example/textura' },
      )
    },
    enviar,
  })
  return { host, caminhos, ref: { biblioteca: 'b-apagada', digest: 'a'.repeat(64) } }
}

test('host HTTP reabre a textura de biblioteca apagada e baixa sem credenciais da sessão', async () => {
  const { host, caminhos, ref } = hostComTextura(async (url, init = {}) => {
    expect(url).toBe('https://r2.example/textura')
    expect(init.credentials).toBe('omit')
    expect(init.headers).toBeUndefined()
    return new Response(new Uint8Array([1, 2, 3]))
  })
  await host.abrirCenario('c')
  expect(new Uint8Array(await host.conteudoDaTextura(ref))).toEqual(new Uint8Array([1, 2, 3]))
  expect(caminhos).toEqual([
    '/api/cenarios/cenarios/c',
    `/api/cenarios/espacos/s/arquivos/${ref.digest}?tipo=textura&como=endereco`,
  ])
})

test('leitura HTTP limita o corpo e cancela o stream; abortar antes não inicia pedido', async () => {
  let cancelado = false
  const { host, caminhos, ref } = hostComTextura(
    async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(MAX_BYTES_DE_TEXTURA_CENARIO + 1))
          },
          cancel() {
            cancelado = true
          },
        }),
      ),
  )
  await host.abrirCenario('c')
  await expect(host.conteudoDaTextura(ref)).rejects.toThrow('4 MB')
  expect(cancelado).toBe(true)
  const controle = new AbortController(),
    antes = caminhos.length
  controle.abort(new Error('cancelado pelo usuário'))
  await expect(host.conteudoDaTextura(ref, controle.signal)).rejects.toThrow(
    'cancelado pelo usuário',
  )
  expect(caminhos).toHaveLength(antes)
})
