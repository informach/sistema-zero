import { expect, test } from 'bun:test'
import {
  criarSnapshotDePublicacao,
  type PedidoDePublicacao,
  resumirPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { CenariosService } from '../../src/application/cenarios/cenarios.service'
import { PublicacoesDeCenariosService } from '../../src/application/cenarios/publicacoes.service'
import type { Ator } from '../../src/domain/cenarios/cenarios'
import { CenariosEmMemoria } from '../fakes/cenarios-in-memory'
import { PublicacoesEmMemoria } from '../fakes/cenarios-publicacoes-in-memory'

const equipe: Ator = {
  usuarioId: '11111111-1111-4111-8111-111111111111',
  contaId: '11111111-1111-4111-8111-111111111111',
  equipe: true,
  suporte: false,
}
const agora = new Date('2026-11-19T18:00:00Z')
/** O que o BFF manda depois de ler e conferir o manifesto no armazenamento. */
const resumoDe = async (pedido: PedidoDePublicacao, bytes: Uint8Array) =>
  resumirPublicacao(await criarSnapshotDePublicacao(pedido, bytes))
async function montar(privado = false) {
  const repo = new CenariosEmMemoria()
  const cenarios = new CenariosService(repo, () => agora, { modo: 'equipe', lista: new Set() })
  const espacos = await cenarios.espacos(equipe)
  const espaco = espacos.find((e) => e.tipo === (privado ? 'conta' : 'equipe'))!
  const mundo = await cenarios.criarMundo(equipe, espaco.id, 'Arquipélago')
  const cenario = await cenarios.criarCenario(equipe, mundo.id, 'Praça')
  const preparo = await cenarios.exportacao.preparar(equipe, cenario.id, 0)
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
  const bytes = new TextEncoder().encode(JSON.stringify(cena))
  const pedido = {
    operacaoId: crypto.randomUUID(),
    perfil: { tipo: 'arquipelago-v2' as const, ilha: 'sua-ilha' as const },
    versaoEsperada: 0,
    fonte: cena.fonte,
    manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
  }
  const publicacoes = new PublicacoesEmMemoria(repo)
  const servico = new PublicacoesDeCenariosService(publicacoes, repo, cenarios, () => agora)
  const conferidos = [
    {
      ...pedido.manifesto,
      tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' as const,
    },
  ]
  const resumo = await resumoDe(pedido, bytes)
  return {
    repo,
    cenarios,
    espaco,
    cenario,
    cena,
    bytes,
    resumo,
    pedido,
    publicacoes,
    servico,
    conferidos,
  }
}

test('somente equipe sem suporte publica; fonte privada não pode virar mundo compartilhado', async () => {
  const b = await montar()
  for (const ator of [
    { ...equipe, equipe: false },
    { ...equipe, suporte: true },
  ])
    await expect(
      b.servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos),
    ).rejects.toThrow()
  expect(b.publicacoes.versoes.size).toBe(0)
  const privada = await montar(true)
  await expect(
    privada.servico.publicarConferido(equipe, privada.pedido, privada.resumo, privada.conferidos),
  ).rejects.toThrow(/equipe/i)
  expect(privada.publicacoes.versoes.size).toBe(0)
})

test('publica versão imutável e repete a mesma operação sem trocar apontador novamente', async () => {
  const b = await montar()
  const primeira = await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  expect(primeira.publicacao.versao).toBe(1)
  expect(primeira.publicacao.autorId).toBe(equipe.usuarioId)
  expect(primeira.publicacao.espacoId).toBe(b.espaco.id)
  expect(primeira.repetido).toBe(false)
  const segunda = await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  expect(segunda).toEqual({ ...primeira, repetido: true })
  expect(b.publicacoes.versoes.size).toBe(1)
  const alterado = { ...b.pedido, versaoEsperada: 1 }
  await expect(
    b.servico.publicarConferido(equipe, alterado, b.resumo, b.conferidos),
  ).rejects.toThrow(/operação/i)
})

test('duas publicações simultâneas da mesma versão admitem uma única troca', async () => {
  const b = await montar()
  const resultados = await Promise.allSettled([
    b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos),
    b.servico.publicarConferido(
      equipe,
      { ...b.pedido, operacaoId: crypto.randomUUID() },
      b.resumo,
      b.conferidos,
    ),
  ])
  expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1)
  expect(b.publicacoes.versoes.size).toBe(1)
  const proxima = await b.servico.publicarConferido(
    equipe,
    { ...b.pedido, operacaoId: crypto.randomUUID(), versaoEsperada: 1 },
    b.resumo,
    b.conferidos,
  )
  expect(proxima.publicacao.versao).toBe(2)
  expect(b.publicacoes.versoes.size).toBe(2)
})

test('conteúdo não conferido ou divergente não cria publicação; pacote e fonte precisam corresponder', async () => {
  const b = await montar()
  for (const provas of [
    [],
    [{ ...b.conferidos[0]!, bytes: 1 }],
    [...b.conferidos, { ...b.conferidos[0]!, digest: 'f'.repeat(64) }],
  ])
    await expect(b.servico.publicarConferido(equipe, b.pedido, b.resumo, provas)).rejects.toThrow(
      /arquivos|confer/i,
    )
  await expect(
    b.servico.publicarConferido(
      equipe,
      { ...b.pedido, fonte: { ...b.pedido.fonte, revisao: 8 } },
      b.resumo,
      b.conferidos,
    ),
  ).rejects.toThrow()
  expect(b.publicacoes.versoes.size).toBe(0)
})

test('revisão salva alterada durante a publicação impede commit e preserva a versão anterior', async () => {
  const b = await montar()
  await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  b.publicacoes.antesDeGravar = async () => {
    await b.cenarios.editarCenario(equipe, b.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'editar-antes-de-publicar',
      comandos: [{ tipo: 'cenario.renomear', nome: 'Praça nova' }],
    })
  }
  await expect(
    b.servico.publicarConferido(
      equipe,
      { ...b.pedido, operacaoId: crypto.randomUUID(), versaoEsperada: 1 },
      b.resumo,
      b.conferidos,
    ),
  ).rejects.toThrow()
  expect(b.publicacoes.versoes.size).toBe(1)
  expect((await b.publicacoes.atual(b.pedido.perfil))?.versao).toBe(1)
})

test('manifesto não pode afirmar acervo ou licenças ausentes da revisão autorizada', async () => {
  const b = await montar()
  for (const patch of [
    { licencas: [{ id: 'inventada', nome: 'Biblioteca alheia', licenca: 'livre' }] },
    {
      fontes: {
        modelos: [{ id: 'x', biblioteca: 'alheia', modelo: 'x', digest: 'c'.repeat(64) }],
        texturas: [],
        conjuntos: [],
      },
    },
    {
      fontes: {
        modelos: [],
        texturas: [],
        conjuntos: [{ id: 'x', biblioteca: 'alheia', conjunto: 'x', revisao: 1 }],
      },
    },
  ]) {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        ...b.cena,
        ...('fontes' in patch
          ? { licencas: [{ id: 'alheia', nome: 'Outra', licenca: 'livre' }] }
          : {}),
        ...patch,
      }),
    )
    const manifesto = { digest: await digestDosBytes(bytes), bytes: bytes.length }
    await expect(
      b.servico.publicarConferido(
        equipe,
        { ...b.pedido, manifesto },
        await resumoDe({ ...b.pedido, manifesto }, bytes),
        [{ ...manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' }],
      ),
    ).rejects.toThrow(/procedência|licenças|fontes/i)
  }
  expect(b.publicacoes.versoes.size).toBe(0)
})

test('repetição continua ligada ao autor e não reabre fonte apagada nem altera a versão atual', async () => {
  const b = await montar()
  const primeira = await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  await b.servico.publicarConferido(
    equipe,
    { ...b.pedido, operacaoId: crypto.randomUUID(), versaoEsperada: 1 },
    b.resumo,
    b.conferidos,
  )
  const fonte = await b.repo.cenario(b.cenario.id)
  await b.cenarios.apagarMundo(equipe, fonte!.mundoId)
  const repetida = await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  expect(repetida.publicacao).toEqual(primeira.publicacao)
  expect((await b.publicacoes.atual(b.pedido.perfil))?.versao).toBe(2)
  expect(await b.publicacoes.recursos(primeira.publicacao.id)).toHaveLength(1)
  await expect(
    b.servico.publicarConferido(
      // Outra pessoa da equipe, na própria conta, repetindo a operação de quem publicou.
      (() => {
        const outra = crypto.randomUUID()
        return { ...equipe, usuarioId: outra, contaId: outra }
      })(),
      b.pedido,
      b.resumo,
      b.conferidos,
    ),
  ).rejects.toThrow(/operação/i)
})

test('ferramenta desligada bloqueia publicação mesmo para equipe e operações repetidas', async () => {
  const b = await montar()
  await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  const fechado = new PublicacoesDeCenariosService(
    b.publicacoes,
    b.repo,
    {
      modoAdmite: () => false,
      exportacao: b.cenarios.exportacao,
    },
    () => agora,
  )
  await expect(fechado.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)).rejects.toThrow(
    /equipe/i,
  )
  expect(b.publicacoes.versoes.size).toBe(1)
})

test('identidade e provas são capturadas antes do trabalho assíncrono', async () => {
  const b = await montar(),
    ator = { ...equipe },
    conferidos = structuredClone(b.conferidos)
  const pendente = b.servico.publicarConferido(ator, b.pedido, b.resumo, conferidos)
  ator.usuarioId = crypto.randomUUID()
  ator.equipe = false
  ator.suporte = true
  conferidos[0]!.bytes = 1
  b.pedido.fonte.revisao = 99
  b.resumo.recursos[0]!.bytes = 1
  const r = await pendente
  expect(r.publicacao.autorId).toBe(equipe.usuarioId)
  expect(r.publicacao.fonte.revisao).toBe(0)
})

test('reserva manifesto na cota existente e somente recursos declarados pelo pacote', async () => {
  const b = await montar()
  const reserva = await b.servico.reservarManifesto(equipe, b.pedido)
  expect(reserva.espacoId).toBe(b.espaco.id)
  expect(reserva.arquivos).toEqual([
    {
      ...b.pedido.manifesto,
      tipo: 'manifesto-compilado',
      chave: `cenarios/${b.espaco.id}/blobs/${b.pedido.manifesto.digest}`,
      tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json',
    },
  ])
  expect((await b.repo.espaco(b.espaco.id))!.usadoBytes).toBe(b.bytes.length)
  // O manifesto nunca entra pela reserva de recursos; repetir ou passar de 50 também não.
  for (const recursos of [
    [
      {
        ...b.pedido.manifesto,
        mime: 'application/vnd.sistemazero.cena-compilada+json',
        papel: 'manifesto',
      },
    ],
    [{ digest: 'f'.repeat(64), bytes: 9, mime: 'model/gltf-binary', papel: 'recurso' }].flatMap(
      (r) => [r, r],
    ),
    [],
  ])
    await expect(b.servico.reservarRecursosDoManifesto(equipe, b.pedido, recursos)).rejects.toThrow(
      /recursos/i,
    )
  expect((await b.repo.espaco(b.espaco.id))!.usadoBytes).toBe(b.bytes.length)
})

test('não reserva arquivos se o perfil já mudou ou a origem é privada', async () => {
  const b = await montar()
  await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  await expect(
    b.servico.reservarManifesto(equipe, { ...b.pedido, operacaoId: crypto.randomUUID() }),
  ).rejects.toThrow(/destino/i)
  const privada = await montar(true)
  await expect(privada.servico.reservarManifesto(equipe, privada.pedido)).rejects.toThrow(/equipe/i)
  expect((await privada.repo.espaco(privada.espaco.id))!.usadoBytes).toBe(0)
})

test('leitura do jogo expõe apenas versão publicada e arquivo que pertence à versão', async () => {
  const b = await montar()
  expect(await b.servico.perfilDoJogo(b.pedido.perfil)).toBeNull()
  const a = await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  const visivel = await b.servico.perfilDoJogo(b.pedido.perfil)
  expect(visivel?.id).toBe(a.publicacao.id)
  expect(visivel).not.toHaveProperty('espacoId')
  expect(visivel).not.toHaveProperty('autorId')
  const arquivo = await b.servico.arquivoDoJogo(a.publicacao.id, b.pedido.manifesto.digest)
  expect(arquivo.chave).toBe(`cenarios/${b.espaco.id}/blobs/${b.pedido.manifesto.digest}`)
  await expect(b.servico.arquivoDoJogo(a.publicacao.id, 'f'.repeat(64))).rejects.toThrow()
  await expect(
    b.servico.arquivoDoJogo(crypto.randomUUID(), b.pedido.manifesto.digest),
  ).rejects.toThrow()
  await expect(
    b.servico.lerPerfilDaOficina({ ...equipe, suporte: true }, b.pedido.perfil),
  ).rejects.toThrow()
  expect(await b.servico.lerPerfilDaOficina(equipe, b.pedido.perfil)).toEqual(visivel)
})

test('preparo da publicação autoriza o espaço real sem reservar bytes nem aceitar versão vencida', async () => {
  const b = await montar()
  const preparo = await b.servico.preparar(equipe, b.pedido)
  expect(preparo.espacoId).toBe(b.espaco.id)
  expect((await b.repo.espaco(b.espaco.id))!.usadoBytes).toBe(0)
  await b.servico.publicarConferido(equipe, b.pedido, b.resumo, b.conferidos)
  const repetida = await b.servico.preparar(equipe, b.pedido)
  expect(repetida.publicacao?.versao).toBe(1)
  await expect(
    b.servico.preparar(equipe, { ...b.pedido, operacaoId: crypto.randomUUID() }),
  ).rejects.toThrow(/destino/i)
})

test('o jogo lê em lote só arquivos da versão, e só da atual ou da anterior da ilha', async () => {
  const b = await montar()
  const publicar = (versaoEsperada: number) =>
    b.servico.publicarConferido(
      equipe,
      { ...b.pedido, operacaoId: crypto.randomUUID(), versaoEsperada },
      b.resumo,
      b.conferidos,
    )
  const v1 = await publicar(0)
  const lote = await b.servico.arquivosDoJogo(v1.publicacao.id, [b.pedido.manifesto.digest])
  expect(lote.arquivos).toEqual([
    {
      digest: b.pedido.manifesto.digest,
      chave: `cenarios/${b.espaco.id}/blobs/${b.pedido.manifesto.digest}`,
      bytes: b.bytes.length,
      tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json',
    },
  ])
  for (const digests of [
    [],
    ['f'.repeat(64)],
    [b.pedido.manifesto.digest, b.pedido.manifesto.digest],
  ])
    await expect(b.servico.arquivosDoJogo(v1.publicacao.id, digests)).rejects.toThrow()
  await expect(
    b.servico.arquivosDoJogo(
      v1.publicacao.id,
      Array.from({ length: 101 }, (_, i) => i.toString(16).padStart(64, '0')),
    ),
  ).rejects.toThrow()
  await publicar(1)
  // Quem estava jogando a v1 quando a v2 entrou ainda termina de carregar.
  expect((await b.servico.arquivoDoJogo(v1.publicacao.id, b.pedido.manifesto.digest)).digest).toBe(
    b.pedido.manifesto.digest,
  )
  await publicar(2)
  // Com a v3 no ar, a v1 não abre mais pelo jogo, nem um por um nem em lote.
  await expect(
    b.servico.arquivoDoJogo(v1.publicacao.id, b.pedido.manifesto.digest),
  ).rejects.toThrow()
  await expect(
    b.servico.arquivosDoJogo(v1.publicacao.id, [b.pedido.manifesto.digest]),
  ).rejects.toThrow()
})
