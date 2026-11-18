/**
 * Molda Cenários pelas rotas HTTP: quem entra, o caminho de trazer um modelo (reservar,
 * registrar pelo BFF, listar), mundos e cenários, e o contrato de cada erro.
 */
import { describe, expect, test } from 'bun:test'
import {
  AguaSchema,
  capturarFragmento,
  conteudoDoCenarioDeConjunto,
  criarDocumentoVazio,
} from '@sistemazero/molda-cenarios-core/v2'
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

test('fonte do conjunto abre seu mundo por ID autorizado, sem aparecer na lista de jogos', async () => {
  const base = await comConjunto()
  const fonte = await json(
    await pedir(base.ctx.app, 'POST', `/members/cenarios/conjuntos/${base.conjunto.id}/editar`),
  )
  const r = await pedir(base.ctx.app, 'GET', `/members/cenarios/mundos/${fonte.mundo.id}`)
  expect(r.status).toBe(200)
  expect((await json(r)).bibliotecaConjuntosId).toBe(base.biblioteca.id)
  const jogos = await json(
    await pedir(base.ctx.app, 'GET', `/members/cenarios/espacos/${base.espaco.id}/mundos`),
  )
  expect(jogos.some((m: { id: string }) => m.id === fonte.mundo.id)).toBe(false)
  expect(
    (
      await pedir(base.ctx.app, 'GET', `/members/cenarios/mundos/${fonte.mundo.id}`, undefined, {
        ...daEquipe,
        'x-auth-user-id': CLIENTE,
      })
    ).status,
  ).toBe(404)
})

async function comConjunto() {
  const base = await comBiblioteca()
  const d = criarDocumentoVazio('origem', 'Jardim')
  d.formas = [{ id: 'f', nome: 'Flor', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.instancias = [
    {
      id: 'flor',
      nome: 'Flor',
      modelo: 'f',
      grupo: null,
      oculto: false,
      bloqueado: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 10, y: 0, z: 20 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  const corpo = {
    nome: 'Jardim',
    pasta: 'Campos',
    etiquetas: ['flores'],
    operacaoId: 'criar-conjunto-01',
    conteudo: capturarFragmento(d, ['flor'], base.espaco.id),
  }
  const resposta = await pedir(
    base.ctx.app,
    'POST',
    `/members/cenarios/bibliotecas/${base.biblioteca.id}/conjuntos`,
    corpo,
  )
  expect(resposta.status).toBe(200)
  return { ...base, corpo, conjunto: await json(resposta) }
}

test('catálogo HTTP autoriza o espaço, mantém a fonte e publica a revisão salva sem alterar o conteúdo histórico', async () => {
  const { ctx, espaco, biblioteca, corpo, conjunto } = await comConjunto()
  const app = ctx.app,
    prefixo = `/members/cenarios/conjuntos/${conjunto.id}`
  const criar = `/members/cenarios/bibliotecas/${biblioteca.id}/conjuntos`
  expect((await json(await pedir(app, 'POST', criar, corpo))).id).toBe(conjunto.id)
  expect((await pedir(app, 'POST', criar, { ...corpo, nome: 'Outro' })).status).toBe(422)
  expect(
    (
      await pedir(app, 'POST', criar, {
        ...corpo,
        operacaoId: 'outro-espaco-01',
        conteudo: {
          ...corpo.conteudo,
          origem: { ...corpo.conteudo.origem, espaco: CLIENTE },
        },
      })
    ).status,
  ).toBe(422)
  expect(
    (
      await pedir(app, 'POST', criar, {
        ...corpo,
        operacaoId: 'conjunto-vazio-01',
        conteudo: {
          ...corpo.conteudo,
          raizes: [],
          instancias: [],
        },
      })
    ).status,
  ).toBe(422)
  expect((await json(await pedir(app, 'GET', `${criar}?busca=FLORES&limite=1`))).total).toBe(1)
  expect((await pedir(app, 'GET', `${criar}?cursor=-1`)).status).toBe(400)
  expect((await pedir(app, 'GET', prefixo, undefined, doCliente)).status).toBe(403)
  expect(
    (await pedir(app, 'GET', prefixo, undefined, { ...daEquipe, 'x-auth-user-id': CLIENTE }))
      .status,
  ).toBe(404)
  const versao1 = await json(await pedir(app, 'GET', `${prefixo}/versoes/1`))
  expect(versao1.conteudo).toEqual(corpo.conteudo)
  expect(typeof versao1.criadoEm).toBe('string')
  expect(versao1.autorId).toBeUndefined()
  const aberto = await json(await pedir(app, 'POST', `${prefixo}/editar`))
  expect(aberto.cenario.revisao).toBe(0)
  expect((await json(await pedir(app, 'POST', `${prefixo}/editar`))).cenario.id).toBe(
    aberto.cenario.id,
  )
  expect(
    await json(await pedir(app, 'GET', `/members/cenarios/espacos/${espaco.id}/mundos`)),
  ).toEqual([])
  const documento = structuredClone(aberto.cenario.documento)
  documento.instancias[0].transformacao.posicao.x += 2
  expect(
    (
      await pedir(app, 'POST', `/members/cenarios/cenarios/${aberto.cenario.id}/lotes`, {
        revisaoEsperada: 0,
        operacaoId: 'editar-fonte-01',
        comandos: [{ tipo: 'cenario.restaurar', documento }],
      })
    ).status,
  ).toBe(200)
  const publicacao = {
    revisaoEsperada: 1,
    operacaoId: 'publicar-conjunto-01',
    conteudo: conteudoDoCenarioDeConjunto(documento, espaco.id),
    rascunho: { cenarioId: aberto.cenario.id, revisao: 1 },
  }
  expect(
    (
      await pedir(app, 'POST', `${prefixo}/publicar`, {
        ...publicacao,
        rascunho: { ...publicacao.rascunho, revisao: 0 },
      })
    ).status,
  ).toBe(409)
  const publicada = await pedir(app, 'POST', `${prefixo}/publicar`, publicacao)
  expect(publicada.status).toBe(200)
  expect((await json(publicada)).conjunto).toMatchObject({
    revisao: 2,
    revisaoPublicadaDoCenario: 1,
  })
  expect((await pedir(app, 'POST', `${prefixo}/publicar`, publicacao)).status).toBe(200)
  expect((await json(await pedir(app, 'GET', `${prefixo}/versoes/1`))).conteudo).toEqual(
    corpo.conteudo,
  )
  expect(
    (await pedir(app, 'DELETE', `/members/cenarios/cenarios/${aberto.cenario.id}`)).status,
  ).toBe(422)
  expect(
    (
      await pedir(app, 'PATCH', prefixo, {
        nome: 'Flores da Íris',
        pasta: 'Jardins',
        etiquetas: ['íris'],
      })
    ).status,
  ).toBe(200)
  expect((await json(await pedir(app, 'GET', `${criar}?busca=IRIS`))).itens[0].nome).toBe(
    'Flores da Íris',
  )
  expect((await pedir(app, 'DELETE', prefixo)).status).toBe(200)
  expect((await pedir(app, 'GET', `/members/cenarios/cenarios/${aberto.cenario.id}`)).status).toBe(
    404,
  )
})

test('miniatura do conjunto só é confirmada pelo BFF e fica associada à revisão fotografada', async () => {
  const { ctx, espaco, conjunto, corpo } = await comConjunto()
  const app = ctx.app,
    prefixo = `/members/cenarios/conjuntos/${conjunto.id}`
  const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' }
  const reserva = await pedir(app, 'POST', `${prefixo}/versoes/1/miniatura/reservar`, imagem)
  expect(reserva.status).toBe(200)
  expect((await json(reserva)).enviar[0]).toMatchObject({ ...imagem, tipo: 'miniatura' })
  expect(
    (
      await pedir(app, 'POST', `${prefixo}/publicar`, {
        revisaoEsperada: 1,
        operacaoId: 'publicar-versao-02',
        conteudo: corpo.conteudo,
      })
    ).status,
  ).toBe(200)
  const interna = '/members/internal/cenarios/conjuntos/miniatura'
  const body = {
    ator: atorDaEquipe,
    conjuntoId: conjunto.id,
    revisao: 1,
    digest: imagem.digest,
    espacoId: espaco.id,
    conferido: imagem,
  }
  expect((await pedir(app, 'POST', interna, body, daEquipe)).status).toBe(401)
  expect((await pedir(app, 'POST', interna, { ...body, espacoId: CLIENTE }, doBff)).status).toBe(
    404,
  )
  expect((await pedir(app, 'POST', interna, body, doBff)).status).toBe(200)
  expect((await json(await pedir(app, 'GET', `${prefixo}/versoes/1`))).miniatura).toBe(
    imagem.digest,
  )
  expect((await json(await pedir(app, 'GET', prefixo))).conjunto.miniatura).toBeNull()
  expect((await pedir(app, 'POST', `${prefixo}/versoes/3/miniatura/reservar`, imagem)).status).toBe(
    404,
  )
})

test('transporte aceita fragmentos acima de 1 MiB e recusa o envelope além do orçamento antes de processar conteúdo', async () => {
  const { ctx, biblioteca, conjunto } = await comConjunto()
  const base = criarDocumentoVazio('fonte-grande', 'Jardim detalhado')
  base.formas = [{ id: 'f', nome: 'Flor', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  const primeiro = conjunto.id // Identificador apenas para compor dados determinísticos do ensaio.
  base.instancias = Array.from({ length: 1800 }, (_, i) => ({
    id: `flor-${i}`,
    nome: 'Flor',
    modelo: 'f',
    grupo: null,
    bloqueado: false,
    oculto: false,
    colisao: 'caixa' as const,
    apoio: { tipo: 'absoluto' as const },
    propriedades: { origem: primeiro, anotacao: 'a'.repeat(400) },
    transformacao: {
      posicao: { x: (i % 40) * 2, y: 0, z: Math.floor(i / 40) * 2 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
  }))
  const espacoId = (await ctx.cenariosRepo.biblioteca(biblioteca.id))!.espacoId
  const conteudo = capturarFragmento(
    base,
    base.instancias.map((o) => o.id),
    espacoId,
  )
  expect(new TextEncoder().encode(JSON.stringify(conteudo)).length).toBeGreaterThan(1024 * 1024)
  const caminho = `/members/cenarios/bibliotecas/${biblioteca.id}/conjuntos`
  expect(
    (
      await pedir(ctx.app, 'POST', caminho, {
        nome: 'Jardim grande',
        operacaoId: 'grande-conjunto-01',
        conteudo,
      })
    ).status,
  ).toBe(200)
  expect(
    (
      await pedir(ctx.app, 'POST', caminho, {
        nome: 'Grande demais',
        operacaoId: 'grande-conjunto-02',
        conteudo: { texto: 'a'.repeat(8 * 1024 * 1024 + 64 * 1024) },
      })
    ).status,
  ).toBe(413)
})

test('recursos do relevo são reservados pelo cenário autorizado e a prova só entra pela rota do BFF', async () => {
  const { ctx, espaco } = await comBiblioteca()
  const mundo = await json(
    await pedir(ctx.app, 'POST', `/members/cenarios/espacos/${espaco.id}/mundos`, {
      nome: 'Mundo',
    }),
  )
  const c = await json(
    await pedir(ctx.app, 'POST', `/members/cenarios/mundos/${mundo.id}/cenarios`, {
      nome: 'Relevo',
    }),
  )
  const caminho = `/members/cenarios/cenarios/${c.id}/recursos/reservar`
  const recursos = [
    { digest: digest('e'), bytes: 8474 },
    { digest: digest('f'), bytes: 33808 },
    { digest: digest('a'), bytes: 520 },
  ]
  const reserva = await pedir(ctx.app, 'POST', caminho, { recursos })
  expect(reserva.status).toBe(200)
  expect((await json(reserva)).enviar[0]).toMatchObject({
    ...recursos[0],
    tipo: 'terreno',
    tipoDoConteudo: 'application/octet-stream',
  })
  expect(
    (await pedir(ctx.app, 'POST', caminho, { recursos: [{ ...recursos[0], bytes: 1 }] })).status,
  ).toBe(400)
  expect((await pedir(ctx.app, 'POST', caminho, { recursos }, doCliente)).status).toBe(403)
  const corpo = {
    ator: atorDaEquipe,
    cenarioId: c.id,
    espacoId: espaco.id,
    lote: {
      revisaoEsperada: 0,
      operacaoId: 'editar-por-hmac-01',
      comandos: [{ tipo: 'cenario.renomear', nome: 'Relevo conferido' }],
    },
    conferidos: [],
  }
  const interna = '/members/internal/cenarios/lotes'
  expect((await pedir(ctx.app, 'POST', interna, corpo, daEquipe)).status).toBe(401)
  expect((await pedir(ctx.app, 'POST', interna, corpo, doBff)).status).toBe(200)
  expect((await json(await pedir(ctx.app, 'GET', `/members/cenarios/cenarios/${c.id}`))).nome).toBe(
    'Relevo conferido',
  )
})

test('chãos percorrem reserva, confirmação do BFF, busca e edição, com autorização da mesma conta', async () => {
  const { ctx, espaco, biblioteca } = await comBiblioteca()
  const prefixo = `/members/cenarios/bibliotecas/${biblioteca.id}/texturas`
  const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' }
  const reserva = await pedir(ctx.app, 'POST', `${prefixo}/reservar`, { texturas: [imagem] })
  expect(reserva.status).toBe(200)
  const lida = await json(reserva)
  expect(lida.enviar[0]).toMatchObject({ ...imagem, tipo: 'textura' })
  const corpo = {
    ator: atorDaEquipe,
    bibliotecaId: biblioteca.id,
    espacoId: espaco.id,
    texturas: [
      {
        nome: 'Grama',
        digest: imagem.digest,
        pasta: 'solo',
        etiquetas: ['verde'],
        largura: 2,
        altura: 2,
        repeticaoMetros: 2,
      },
    ],
    conferidos: [{ ...imagem, largura: 2, altura: 2 }],
  }
  const rotaInterna = '/members/internal/cenarios/texturas'
  expect((await pedir(ctx.app, 'POST', rotaInterna, corpo, daEquipe)).status).toBe(401)
  const registrada = await pedir(ctx.app, 'POST', rotaInterna, corpo, doBff)
  expect(registrada.status).toBe(200)
  const [textura] = await json(registrada)
  expect(textura).toMatchObject({ nome: 'Grama', largura: 2, altura: 2, repeticaoMetros: 2 })
  expect((await pedir(ctx.app, 'GET', prefixo, undefined, doCliente)).status).toBe(403)
  expect((await json(await pedir(ctx.app, 'GET', `${prefixo}?busca=VERDE`))).itens).toHaveLength(1)
  const editada = await pedir(ctx.app, 'PATCH', `/members/cenarios/texturas/${textura.id}`, {
    nome: 'Terra',
    repeticaoMetros: 3,
  })
  expect(editada.status).toBe(200)
  expect(await json(editada)).toMatchObject({ nome: 'Terra', repeticaoMetros: 3 })
  expect(
    (
      await pedir(ctx.app, 'PATCH', `/members/cenarios/texturas/${textura.id}`, {
        repeticaoMetros: 0,
      })
    ).status,
  ).toBe(400)
  expect((await pedir(ctx.app, 'POST', `${prefixo}/apagar`, { ids: [textura.id] })).status).toBe(
    200,
  )
  expect((await json(await pedir(ctx.app, 'GET', prefixo))).total).toBe(0)
})

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
      conferidos: [{ digest: digest('a'), bytes: 4096, tipoDoConteudo: 'model/gltf-binary' }],
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
        conferidos: [
          { digest: digest('a'), bytes: 4096, tipoDoConteudo: 'model/gltf-binary' },
          { digest: digest('b'), bytes: 200, tipoDoConteudo: 'image/webp' },
        ],
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
          conferidos: [
            { digest: digest('a'), bytes: 4096, tipoDoConteudo: 'model/gltf-binary' },
            { digest: digest('b'), bytes: 200, tipoDoConteudo: 'image/webp' },
          ],
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
  test('retratos HTTP fixam a revisão capturada e conservam a capa da cabeça nova', async () => {
    const { ctx, cenario, espaco } = await comCenario()
    const caminho = `/members/cenarios/cenarios/${cenario.id}`
    const reservar = (revisao: number, letra: string) =>
      pedir(ctx.app, 'POST', `${caminho}/capa/reservar`, {
        revisao,
        digest: digest(letra),
        bytes: 200,
        tipoDoConteudo: 'image/png',
      })
    const confirmar = (
      revisao: number,
      letra: string,
      cabecalhos: Record<string, string> = doBff,
    ) =>
      pedir(
        ctx.app,
        'POST',
        '/members/internal/cenarios/capa',
        {
          ator: atorDaEquipe,
          cenarioId: cenario.id,
          espacoId: espaco.id,
          revisao,
          digest: digest(letra),
          conferido: { digest: digest(letra), bytes: 200, tipoDoConteudo: 'image/png' },
        },
        cabecalhos,
      )
    expect((await reservar(0, 'a')).status).toBe(200)
    expect((await confirmar(0, 'a', daEquipe)).status).toBe(401)
    expect(
      (
        await pedir(
          ctx.app,
          'POST',
          `${caminho}/lotes`,
          lote(0, 'retrato-edicao-01', [{ tipo: 'cenario.renomear', nome: 'Praça nova' }]),
        )
      ).status,
    ).toBe(200)
    expect((await reservar(1, 'b')).status).toBe(200)
    expect(await json(await confirmar(1, 'b'))).toMatchObject({
      revisao: 1,
      digest: digest('b'),
      atual: true,
    })
    expect(await json(await confirmar(0, 'a'))).toMatchObject({
      revisao: 0,
      digest: digest('a'),
      atual: false,
    })
    expect((await json(await pedir(ctx.app, 'GET', caminho))).capa).toBe(digest('b'))
    const retratos = await json(await pedir(ctx.app, 'GET', `${caminho}/revisoes`))
    expect(retratos.retratoInicial).toBe(digest('a'))
    expect(retratos.itens[0]).toMatchObject({ revisao: 1, miniatura: digest('b') })
    expect(await json(await reservar(0, 'c'))).toMatchObject({ enviar: [], retrato: digest('a') })
    expect((await reservar(2, 'c')).status).toBe(422)
    expect(
      (
        await pedir(ctx.app, 'GET', `${caminho}/revisoes`, undefined, {
          ...daEquipe,
          'x-auth-user-id': CLIENTE,
        })
      ).status,
    ).toBe(404)
    const copia = await json(await pedir(ctx.app, 'POST', `${caminho}/duplicar`))
    expect(
      await json(await pedir(ctx.app, 'GET', `/members/cenarios/cenarios/${copia.id}/revisoes`)),
    ).toMatchObject({ retratoInicial: null, itens: [] })
  })
  test('histórico por HTTP permite desfazer, refazer e restaurar sem expor a outra conta', async () => {
    const { ctx, cenario } = await comCenario()
    const caminho = `/members/cenarios/cenarios/${cenario.id}`
    await pedir(
      ctx.app,
      'POST',
      `${caminho}/lotes`,
      lote(0, 'operacao-0001', [{ tipo: 'cenario.renomear', nome: 'Outra vila' }]),
    )
    expect(await json(await pedir(ctx.app, 'GET', `${caminho}/historico`))).toEqual({
      revisao: 1,
      desfazer: 1,
      refazer: 0,
    })
    const volta = await pedir(ctx.app, 'POST', `${caminho}/historico`, {
      revisaoEsperada: 1,
      operacaoId: 'desfazer-0001',
      acao: 'desfazer',
    })
    expect(volta.status).toBe(200)
    expect((await json(volta)).nome).toBe('Vila da praia')
    expect(
      (
        await pedir(ctx.app, 'POST', `${caminho}/historico`, {
          revisaoEsperada: 1,
          operacaoId: 'refazer-0001',
          acao: 'refazer',
        })
      ).status,
    ).toBe(409)
    expect((await pedir(ctx.app, 'GET', `${caminho}/historico`, undefined, doCliente)).status).toBe(
      403,
    )
    expect(
      (
        await pedir(ctx.app, 'POST', `${caminho}/restaurar`, {
          revisao: 1,
          revisaoEsperada: 2,
          operacaoId: 'restaurar-0001',
        })
      ).status,
    ).toBe(200)
    const revisoes = await json(await pedir(ctx.app, 'GET', `${caminho}/revisoes?antes=3`))
    expect(revisoes.itens.map((r: { revisao: number }) => r.revisao)).toEqual([2, 1])
    expect(revisoes.itens[0].autorId).toBeUndefined()
  })
  test('água por HTTP conserva aparência e perfil no histórico e recusa rio ascendente sem trocar a cabeça', async () => {
    const { ctx, cenario } = await comCenario(),
      caminho = `/members/cenarios/cenarios/${cenario.id}`,
      agua = AguaSchema.parse({
        id: 'rio',
        nome: 'Rio',
        tipo: 'rio',
        grupo: null,
        bloqueado: false,
        oculto: false,
        largura: 3,
        profundidade: 1.4,
        profundidadeDoLeito: 2,
        correnteza: 1.5,
        suave: true,
        controle: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
        ],
        pontos: [
          { x: 0, y: 4, z: 0 },
          { x: 10, y: 2, z: 0 },
        ],
        nado: false,
        aparencia: { corRasa: '#aabbcc' },
      })
    const salvo = await pedir(
      ctx.app,
      'POST',
      `${caminho}/lotes`,
      lote(0, 'agua-op-0001', [{ tipo: 'agua.definir', agua }]),
    )
    expect(salvo.status).toBe(200)
    expect((await json(await pedir(ctx.app, 'GET', caminho))).documento.aguas).toEqual([agua])
    const recusado = await pedir(
      ctx.app,
      'POST',
      `${caminho}/lotes`,
      lote(1, 'agua-op-0002', [
        {
          tipo: 'agua.definir',
          agua: {
            ...agua,
            pontos: [
              { x: 0, y: 2, z: 0 },
              { x: 10, y: 4, z: 0 },
            ],
          },
        },
      ]),
    )
    expect(recusado.status).toBe(422)
    expect((await json(await pedir(ctx.app, 'GET', caminho))).revisao).toBe(1)
    expect(
      (
        await pedir(ctx.app, 'POST', `${caminho}/historico`, {
          revisaoEsperada: 1,
          operacaoId: 'agua-undo-0001',
          acao: 'desfazer',
        })
      ).status,
    ).toBe(200)
    expect((await json(await pedir(ctx.app, 'GET', caminho))).documento.aguas).toEqual([])
    expect(
      (
        await pedir(ctx.app, 'POST', `${caminho}/historico`, {
          revisaoEsperada: 2,
          operacaoId: 'agua-redo-0001',
          acao: 'refazer',
        })
      ).status,
    ).toBe(200)
    expect((await json(await pedir(ctx.app, 'GET', caminho))).documento.aguas).toEqual([agua])
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
