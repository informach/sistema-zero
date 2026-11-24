import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { publicacoesDoEnsaio } from '../playground/publicacoes-do-ensaio'
import { cenarioPublicadoParaTeste } from './fixtures/cenario-publicado'

test('servidor de QA só oferece blobs vinculados à publicação, sem progresso ou acesso de autoria', async () => {
  const raiz = mkdtempSync(join(tmpdir(), 'cenarios-publicados-qa-')),
    p = await cenarioPublicadoParaTeste(),
    id = p.publicacao.id,
    pedir = (caminho: string) =>
      publicacoesDoEnsaio(raiz, new Request(`http://127.0.0.1:4530${caminho}`))
  if (
    dirname(resolve(raiz)) !== resolve(tmpdir()) ||
    !basename(raiz).startsWith('cenarios-publicados-qa-')
  )
    throw Error('Diretório temporário fora do escopo do ensaio.')
  try {
    mkdirSync(join(raiz, 'perfis'))
    mkdirSync(join(raiz, 'publicacoes', id), { recursive: true })
    mkdirSync(join(raiz, 'blobs'))
    await Bun.write(join(raiz, 'perfis/sua-ilha.json'), JSON.stringify(p.publicacao))
    await Bun.write(join(raiz, 'publicacoes', id, 'publicacao.json'), JSON.stringify(p.publicacao))
    await Bun.write(
      join(raiz, 'blobs', p.publicacao.manifesto.digest),
      JSON.stringify(p.pacote.cena),
    )
    for (const a of p.pacote.cena.arquivos)
      await Bun.write(join(raiz, 'blobs', a.digest), p.pacote.arquivos.get(a.caminho)!)
    const perfil = (await pedir('/api/cenarios/jogo/perfis/sua-ilha'))!
    expect(await perfil.json()).toEqual({ publicacao: p.publicacao })
    expect(perfil.headers.get('cache-control')).toContain('no-store')
    const endereco = `/api/cenarios/jogo/publicacoes/${id}/arquivos/${p.publicacao.manifesto.digest}`,
      meta = (await (await pedir(endereco))!.json()) as { url: string },
      conteudo = (await publicacoesDoEnsaio(raiz, new Request(meta.url)))!
    expect(await conteudo.json()).toEqual(p.pacote.cena)
    expect(
      (await pedir(`/api/cenarios/jogo/publicacoes/${id}/arquivos/${'0'.repeat(64)}`))!.status,
    ).toBe(404)
    expect(await (await pedir('/api/cenarios/jogo/perfis/bosque'))!.json()).toEqual({
      publicacao: null,
    })
    expect(
      (await publicacoesDoEnsaio(
        raiz,
        new Request(`http://127.0.0.1:4530${endereco}`, { method: 'POST' }),
      ))!.status,
    ).toBe(405)
    await Bun.write(join(raiz, 'blobs', p.publicacao.manifesto.digest), '{}')
    expect((await pedir(endereco))!.status).toBe(500)
  } finally {
    rmSync(raiz, { recursive: true, force: true })
  }
})

test('sem diretório de QA nenhuma publicação é inventada nem arquivo é servido', async () => {
  const r = (await publicacoesDoEnsaio(
    null,
    new Request('http://127.0.0.1/api/cenarios/jogo/perfis/sua-ilha'),
  ))!
  expect(await r.json()).toEqual({ publicacao: null })
  expect(await publicacoesDoEnsaio(null, new Request('http://127.0.0.1/fora'))).toBeNull()
})
