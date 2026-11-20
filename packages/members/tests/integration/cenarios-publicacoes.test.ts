import { expect, test } from 'bun:test'
import {
  criarSnapshotDePublicacao,
  resumirPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { buildApp } from '../helpers'

const EQUIPE = '11111111-1111-4111-8111-111111111111'
const ator = { usuarioId: EQUIPE, contaId: EQUIPE, equipe: true, suporte: false }
const admin = {
  'x-auth-user-id': EQUIPE,
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
  'content-type': 'application/json',
}
const bff = { 'x-consumer-id': 'member-shell', 'content-type': 'application/json' }
type Ctx = ReturnType<typeof buildApp>
function pedir(
  ctx: Ctx,
  metodo: string,
  caminho: string,
  corpo?: unknown,
  headers: Record<string, string> = admin,
) {
  return ctx.app.handle(
    new Request(`http://localhost${caminho}`, {
      method: metodo,
      headers,
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    }),
  )
}
async function fonte() {
  const ctx = buildApp()
  const espacos = (await (await pedir(ctx, 'GET', '/members/cenarios/espacos')).json()) as {
    id: string
    tipo: string
  }[]
  const espaco = espacos.find((e) => e.tipo === 'equipe')!
  const mundo = (await (
    await pedir(ctx, 'POST', `/members/cenarios/espacos/${espaco.id}/mundos`, { nome: 'Faísca' })
  ).json()) as { id: string }
  const c = (await (
    await pedir(ctx, 'POST', `/members/cenarios/mundos/${mundo.id}/cenarios`, { nome: 'Praça' })
  ).json()) as { id: string }
  const preparo = (await (
    await pedir(ctx, 'POST', `/members/cenarios/cenarios/${c.id}/exportacao`, {
      revisaoEsperada: 0,
    })
  ).json()) as { fonte: { cenario: string; revisao: number }; digest: string }
  const cena = {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Praça',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { ...preparo.fonte, digest: preparo.digest },
    arquivos: [],
    entidades: [],
    nos: [],
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }
  const manifesto = JSON.stringify(cena),
    bytes = new TextEncoder().encode(manifesto)
  const pedido = {
    operacaoId: crypto.randomUUID(),
    perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
    versaoEsperada: 0,
    fonte: cena.fonte,
    manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
  }
  return {
    ctx,
    espaco,
    pedido,
    manifesto,
    confirmacao: {
      ator,
      pedido,
      resumo: resumirPublicacao(await criarSnapshotDePublicacao(pedido, bytes)),
      conferidos: [
        { ...pedido.manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' },
      ],
    },
  }
}

test('HTTP exige equipe para preparar/reservar e HMAC do BFF para confirmar publicação', async () => {
  const b = await fonte(),
    caminho = '/members/cenarios/publicacoes'
  expect((await pedir(b.ctx, 'POST', `${caminho}/preparar`, b.pedido)).status).toBe(200)
  expect((await pedir(b.ctx, 'POST', `${caminho}/manifesto/reservar`, b.pedido)).status).toBe(200)
  expect(
    (
      await pedir(b.ctx, 'POST', `${caminho}/preparar`, b.pedido, {
        ...admin,
        'x-auth-user-role': 'customer',
      })
    ).status,
  ).toBe(403)
  expect((await pedir(b.ctx, 'POST', `${caminho}/confirmar`, b.confirmacao)).status).toBe(404)
  expect(
    (await pedir(b.ctx, 'POST', '/members/internal/cenarios/publicacoes/confirmar', b.confirmacao))
      .status,
  ).toBe(401)
  const r = await pedir(
    b.ctx,
    'POST',
    '/members/internal/cenarios/publicacoes/confirmar',
    b.confirmacao,
    bff,
  )
  expect(r.status).toBe(200)
  const resultado = (await r.json()) as {
    publicacao: { id: string; versao: number }
    repetido: boolean
  }
  expect(resultado.publicacao.versao).toBe(1)
  expect(resultado.repetido).toBe(false)
  expect(
    (
      await pedir(
        b.ctx,
        'POST',
        '/members/internal/cenarios/publicacoes/confirmar',
        b.confirmacao,
        bff,
      )
    ).status,
  ).toBe(200)
  expect(
    (
      await pedir(
        b.ctx,
        'POST',
        '/members/internal/cenarios/publicacoes/confirmar',
        {
          ...b.confirmacao,
          ator: { ...ator, suporte: true },
        },
        bff,
      )
    ).status,
  ).toBe(403)
})

test('leitura HMAC do jogo serve apenas publicação e digest vinculado, sem abrir a autoria', async () => {
  const b = await fonte(),
    interno = '/members/internal/cenarios/publicacoes/jogo'
  expect(
    (await pedir(b.ctx, 'POST', `${interno}/perfil`, { ator, perfil: b.pedido.perfil })).status,
  ).toBe(401)
  expect(
    await (
      await pedir(b.ctx, 'POST', `${interno}/perfil`, { ator, perfil: b.pedido.perfil }, bff)
    ).json(),
  ).toBeNull()
  await pedir(b.ctx, 'POST', '/members/cenarios/publicacoes/manifesto/reservar', b.pedido)
  await pedir(b.ctx, 'POST', '/members/internal/cenarios/publicacoes/confirmar', b.confirmacao, bff)
  const r = await pedir(b.ctx, 'POST', `${interno}/perfil`, { ator, perfil: b.pedido.perfil }, bff)
  expect(r.status).toBe(200)
  const atual = (await r.json()) as { id: string }
  expect(atual).not.toHaveProperty('espacoId')
  expect(atual).not.toHaveProperty('autorId')
  const arquivo = await pedir(
    b.ctx,
    'POST',
    `${interno}/arquivo`,
    { ator, publicacaoId: atual.id, digest: b.pedido.manifesto.digest },
    bff,
  )
  expect(arquivo.status).toBe(200)
  expect(((await arquivo.json()) as { chave: string }).chave).toBe(
    `cenarios/${b.espaco.id}/blobs/${b.pedido.manifesto.digest}`,
  )
  expect(
    (
      await pedir(
        b.ctx,
        'POST',
        `${interno}/arquivo`,
        { ator, publicacaoId: atual.id, digest: 'f'.repeat(64) },
        bff,
      )
    ).status,
  ).toBe(404)
  expect(
    (
      await pedir(
        b.ctx,
        'POST',
        `${interno}/perfil`,
        { ator, perfil: { tipo: 'arquipelago-v2', ilha: 'inexistente' } },
        bff,
      )
    ).status,
  ).toBe(400)
})

test('o manifesto nunca entra no corpo interno: só o resumo, e os pedidos públicos seguem pequenos', async () => {
  const b = await fonte()
  expect(
    (await pedir(b.ctx, 'POST', '/members/cenarios/publicacoes/manifesto/reservar', b.pedido))
      .status,
  ).toBe(200)
  // Com o manifesto inteiro no lugar do resumo, o contrato recusa.
  const { resumo: _resumo, ...semResumo } = b.confirmacao
  expect(
    (
      await pedir(
        b.ctx,
        'POST',
        '/members/internal/cenarios/publicacoes/confirmar',
        { ...semResumo, manifesto: b.manifesto },
        bff,
      )
    ).status,
  ).toBe(400)
  const r = await pedir(
    b.ctx,
    'POST',
    '/members/internal/cenarios/publicacoes/confirmar',
    b.confirmacao,
    bff,
  )
  expect(r.status).toBe(200)
  expect(((await r.json()) as { publicacao: { versao: number } }).publicacao.versao).toBe(1)
  expect(
    (
      await pedir(b.ctx, 'POST', '/members/cenarios/publicacoes/preparar', {
        ...b.pedido,
        extra: 'x'.repeat(128 * 1024),
      })
    ).status,
  ).toBe(413)
})
