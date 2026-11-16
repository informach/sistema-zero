/**
 * Molda Cenários pelas rotas HTTP: quem entra, o caminho de trazer um modelo (reservar,
 * registrar pelo BFF, listar), mundos e cenários, e o contrato de cada erro.
 */
import { describe, expect, test } from 'bun:test'
import { buildApp } from '../helpers'

const EQUIPE = '11111111-1111-4111-8111-111111111111'
const CLIENTE = '22222222-2222-4222-8222-222222222222'
type Ctx = ReturnType<typeof buildApp>

const daEquipe = {
  'x-auth-user-id': EQUIPE,
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
  'content-type': 'application/json',
}
const doCliente = {
  'x-auth-user-id': CLIENTE,
  'x-auth-user-role': 'customer',
  'x-auth-user-status': 'active',
  'content-type': 'application/json',
}
const doBff = { 'x-consumer-id': 'member-shell', 'content-type': 'application/json' }
const digest = (letra: string) => letra.repeat(64)

const pedir = (
  app: Ctx['app'],
  metodo: string,
  caminho: string,
  corpo?: unknown,
  cabecalhos: Record<string, string> = daEquipe,
) =>
  app.handle(
    new Request(`http://localhost${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    }),
  )
const json = (resposta: Response): Promise<any> => resposta.json()

async function comBiblioteca(ctx: Ctx = buildApp()) {
  const espacos = await json(await pedir(ctx.app, 'GET', '/members/cenarios/espacos'))
  const espaco = espacos.find((e: { tipo: string }) => e.tipo === 'conta')
  const biblioteca = await json(
    await pedir(ctx.app, 'POST', `/members/cenarios/espacos/${espaco.id}/bibliotecas`, {
      nome: 'Aventura',
      licenca: 'restrita',
    }),
  )
  return { ctx, espaco, biblioteca }
}
const atorDaEquipe = { usuarioId: EQUIPE, contaId: EQUIPE, equipe: true, suporte: false }

describe('Molda Cenários: quem entra', () => {
  test('biblioteca do Molda usa o perfil autenticado, com idempotência e proteção da conta', async () => {
    const { ctx, espaco } = await comBiblioteca(buildApp({ cenariosModo: 'aberto' }))
    const caminho = `/members/cenarios/espacos/${espaco.id}/biblioteca-molda`
    const a = await pedir(ctx.app, 'POST', caminho)
    expect(a.status).toBe(200)
    const biblioteca = await json(a)
    expect(biblioteca.fonte).toBe(`molda:${EQUIPE}`)
    expect((await json(await pedir(ctx.app, 'POST', caminho))).id).toBe(biblioteca.id)
    expect((await pedir(ctx.app, 'POST', caminho, undefined, doCliente)).status).toBe(404)
    expect(
      (
        await pedir(
          ctx.app,
          'GET',
          `/members/cenarios/bibliotecas/${biblioteca.id}/modelos?digest=invalido`,
        )
      ).status,
    ).toBe(400)
  })
  test('a equipe vê o espaço dela e o da equipe; o cliente fica de fora', async () => {
    const { app } = buildApp()
    expect(await json(await pedir(app, 'GET', '/members/cenarios/acesso'))).toEqual({
      aberto: true,
    })
    const espacos = await json(await pedir(app, 'GET', '/members/cenarios/espacos'))
    expect(espacos.map((e: { tipo: string }) => e.tipo)).toEqual(['conta', 'equipe'])

    expect(
      await json(await pedir(app, 'GET', '/members/cenarios/acesso', undefined, doCliente)),
    ).toEqual({ aberto: false })
    const recusa = await pedir(app, 'GET', '/members/cenarios/espacos', undefined, doCliente)
    expect(recusa.status).toBe(403)
    expect((await json(recusa)).error.code).toBe('CENARIOS_FECHADOS')
  })
  test('aberto para todos: o cliente tem o espaço dele e não enxerga o de outra conta', async () => {
    const ctx = buildApp({ cenariosModo: 'aberto' })
    const { biblioteca } = await comBiblioteca(ctx)
    const dele = await json(
      await pedir(ctx.app, 'GET', '/members/cenarios/espacos', undefined, doCliente),
    )
    expect(dele).toHaveLength(1)
    const alheia = await pedir(
      ctx.app,
      'PATCH',
      `/members/cenarios/bibliotecas/${biblioteca.id}`,
      { nome: 'Minha' },
      doCliente,
    )
    expect(alheia.status).toBe(404)
    expect((await json(alheia)).error.code).toBe('CENARIO_NAO_ENCONTRADO')
    expect(
      (
        await pedir(
          ctx.app,
          'GET',
          `/members/cenarios/bibliotecas/${biblioteca.id}/organizacao`,
          undefined,
          doCliente,
        )
      ).status,
    ).toBe(404)
  })
  test('sem identidade não entra, e id que não é uuid é recusado na borda', async () => {
    const { app } = buildApp()
    expect(
      (await pedir(app, 'GET', '/members/cenarios/espacos', undefined, { accept: '*/*' })).status,
    ).toBe(401)
    expect((await pedir(app, 'GET', '/members/cenarios/espacos/nao-e-uuid/mundos')).status).toBe(
      400,
    )
  })
})

describe('Molda Cenários: trazer modelos', () => {
  test('reservar, registrar pelo BFF e achar na biblioteca', async () => {
    const { ctx, espaco, biblioteca } = await comBiblioteca()
    const reserva = await json(
      await pedir(
        ctx.app,
        'POST',
        `/members/cenarios/bibliotecas/${biblioteca.id}/modelos/reservar`,
        {
          modelos: [
            { digest: digest('a'), bytes: 4096, miniatura: { digest: digest('b'), bytes: 200 } },
          ],
        },
      ),
    )
    expect(reserva.espacoId).toBe(espaco.id)
    expect(reserva.enviar.map((e: { chave: string }) => e.chave)).toEqual([
      `cenarios/${espaco.id}/blobs/${digest('a')}`,
      `cenarios/${espaco.id}/blobs/${digest('b')}`,
    ])

    const modelo = {
      nome: 'Árvore grande',
      pasta: 'natureza',
      etiquetas: ['verde'],
      digest: digest('a'),
      triangulos: 320,
      min: [-1, 0, -1],
      max: [1, 4, 1],
      miniatura: digest('b'),
    }
    // Só o BFF afirma que o arquivo chegou ao bucket.
    const semBff = await pedir(ctx.app, 'POST', '/members/internal/cenarios/modelos', {
      ator: atorDaEquipe,
      bibliotecaId: biblioteca.id,
      espacoId: espaco.id,
      modelos: [modelo],
      conferidos: [digest('a')],
    })
    expect(semBff.status).toBe(401)

    const faltou = await pedir(
      ctx.app,
      'POST',
      '/members/internal/cenarios/modelos',
      {
        ator: atorDaEquipe,
        bibliotecaId: biblioteca.id,
        espacoId: espaco.id,
        modelos: [modelo],
        conferidos: [],
      },
      doBff,
    )
    expect(faltou.status).toBe(409)
    expect(await json(faltou)).toMatchObject({
      error: { code: 'CENARIO_ARQUIVO_AUSENTE' },
      details: { digests: [digest('a')] },
    })
    // Conferência feita em outro espaço não vale: o arquivo continua faltando.
    const outroEspaco = await pedir(
      ctx.app,
      'POST',
      '/members/internal/cenarios/modelos',
      {
        ator: atorDaEquipe,
        bibliotecaId: biblioteca.id,
        espacoId: crypto.randomUUID(),
        modelos: [modelo],
        conferidos: [digest('a'), digest('b')],
      },
      doBff,
    )
    expect(outroEspaco.status).toBe(409)

    const criados = await json(
      await pedir(
        ctx.app,
        'POST',
        '/members/internal/cenarios/modelos',
        {
          ator: atorDaEquipe,
          bibliotecaId: biblioteca.id,
          espacoId: espaco.id,
          modelos: [modelo],
          conferidos: [digest('a'), digest('b')],
        },
        doBff,
      ),
    )
    expect(criados[0]).toMatchObject({ nome: 'Árvore grande', bytes: 4096, miniatura: digest('b') })

    const achados = await json(
      await pedir(
        ctx.app,
        'GET',
        `/members/cenarios/bibliotecas/${biblioteca.id}/modelos?busca=arvore&limite=10`,
      ),
    )
    expect(achados).toMatchObject({ total: 1, proximo: null })
    const arquivo = await json(
      await pedir(ctx.app, 'GET', `/members/cenarios/espacos/${espaco.id}/arquivos/${digest('a')}`),
    )
    expect(arquivo).toEqual({
      chave: `cenarios/${espaco.id}/blobs/${digest('a')}`,
      tipoDoConteudo: 'model/gltf-binary',
      bytes: 4096,
    })
  })
  test('digest fora do formato e lista vazia são recusados na borda', async () => {
    const { ctx, biblioteca } = await comBiblioteca()
    const base = `/members/cenarios/bibliotecas/${biblioteca.id}/modelos/reservar`
    expect((await pedir(ctx.app, 'POST', base, { modelos: [] })).status).toBe(400)
    expect(
      (await pedir(ctx.app, 'POST', base, { modelos: [{ digest: 'ABC', bytes: 10 }] })).status,
    ).toBe(400)
  })
})

describe('Molda Cenários: mundos e cenários', () => {
  async function comCenario() {
    const base = await comBiblioteca()
    const mundo = await json(
      await pedir(base.ctx.app, 'POST', `/members/cenarios/espacos/${base.espaco.id}/mundos`, {
        nome: 'Ilha do Farol',
      }),
    )
    const cenario = await json(
      await pedir(base.ctx.app, 'POST', `/members/cenarios/mundos/${mundo.id}/cenarios`, {
        nome: 'Vila da praia',
      }),
    )
    return { ...base, mundo, cenario }
  }
  const lote = (revisaoEsperada: number, operacaoId: string, comandos: unknown[]) => ({
    revisaoEsperada,
    operacaoId,
    comandos,
  })

  test('criar, editar por lote, abrir e listar', async () => {
    const { ctx, mundo, cenario, espaco } = await comCenario()
    expect(cenario).toMatchObject({ nome: 'Vila da praia', revisao: 0, capa: null })
    const caminho = `/members/cenarios/cenarios/${cenario.id}`
    const editado = await pedir(
      ctx.app,
      'POST',
      `${caminho}/lotes`,
      lote(0, 'operacao-0001', [
        { tipo: 'cenario.renomear', nome: 'Praia do farol' },
        { tipo: 'iluminacao.definir', iluminacao: { hora: 17.5 } },
      ]),
    )
    expect(editado.status).toBe(200)
    expect(await json(editado)).toEqual({ revisao: 1 })

    const aberto = await json(await pedir(ctx.app, 'GET', caminho))
    expect(aberto).toMatchObject({ nome: 'Praia do farol', revisao: 1, espacoId: espaco.id })
    expect(aberto.documento.iluminacao).toEqual({ hora: 17.5 })
    expect(aberto.documento.versao).toBe(2)

    const lista = await json(
      await pedir(ctx.app, 'GET', `/members/cenarios/mundos/${mundo.id}/cenarios`),
    )
    expect(lista).toHaveLength(1)
    expect(lista[0].documento).toBeUndefined()
  })
  test('revisão atrasada responde 409 com a revisão atual; a mesma operação repetida passa', async () => {
    const { ctx, cenario } = await comCenario()
    const caminho = `/members/cenarios/cenarios/${cenario.id}/lotes`
    const primeiro = lote(0, 'operacao-0001', [{ tipo: 'cenario.renomear', nome: 'Um' }])
    expect((await pedir(ctx.app, 'POST', caminho, primeiro)).status).toBe(200)
    expect(await json(await pedir(ctx.app, 'POST', caminho, primeiro))).toEqual({ revisao: 1 })
    const atrasado = await pedir(
      ctx.app,
      'POST',
      caminho,
      lote(0, 'operacao-0002', [{ tipo: 'cenario.renomear', nome: 'Dois' }]),
    )
    expect(atrasado.status).toBe(409)
    expect(await json(atrasado)).toMatchObject({
      error: { code: 'CENARIO_DESATUALIZADO' },
      details: { revisaoAtual: 1 },
    })
  })
  test('lote que não vale responde 422 com os problemas e não grava nada', async () => {
    const { ctx, cenario } = await comCenario()
    const caminho = `/members/cenarios/cenarios/${cenario.id}`
    const recusado = await pedir(
      ctx.app,
      'POST',
      `${caminho}/lotes`,
      lote(0, 'operacao-0001', [{ tipo: 'instancia.remover', id: 'fantasma' }]),
    )
    expect(recusado.status).toBe(422)
    expect(await json(recusado)).toMatchObject({
      error: { code: 'CENARIO_INVALIDO' },
      details: { problemas: ['Elemento ausente: fantasma'] },
    })
    const foraDoFormato = await pedir(
      ctx.app,
      'POST',
      `${caminho}/lotes`,
      lote(0, 'operacao-0002', [{ tipo: 'comando.que.nao.existe' }]),
    )
    expect(foraDoFormato.status).toBe(422)
    expect((await json(await pedir(ctx.app, 'GET', caminho))).revisao).toBe(0)
  })
  test('copiar e apagar cenário, e apagar o mundo', async () => {
    const { ctx, mundo, cenario } = await comCenario()
    const copia = await json(
      await pedir(ctx.app, 'POST', `/members/cenarios/cenarios/${cenario.id}/duplicar`),
    )
    expect(copia.nome).toBe('Vila da praia (cópia)')
    expect((await pedir(ctx.app, 'DELETE', `/members/cenarios/cenarios/${copia.id}`)).status).toBe(
      200,
    )
    expect((await pedir(ctx.app, 'DELETE', `/members/cenarios/mundos/${mundo.id}`)).status).toBe(
      200,
    )
    expect((await pedir(ctx.app, 'GET', `/members/cenarios/cenarios/${cenario.id}`)).status).toBe(
      404,
    )
  })
})
