import { describe, expect, test } from 'bun:test'
import type { Project } from '@sistemazero/studio'
import { loadLessonArt } from '../src/lib/lesson-art-load'
import { applyLessonArt, type LessonArtSlot } from '../src/lib/lesson-art-slots'

/** O desenho da vaga de arte entrando no jogo do bloco de Estúdio (etapa 5). */

const PNG = 'data:image/png;base64,AAAA'
const DESENHO = 'data:image/png;base64,DESENHO'

function projeto(assets: Project['assets'] = []): Project {
  return {
    id: 'sz-lesson-studio-bloco-perfil',
    name: 'Chave do Farol',
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    assets,
  } as Project
}

const chaveDourada = {
  id: 'chave-dourada',
  name: 'chave-dourada',
  kind: 'image' as const,
  dataUrl: PNG,
  width: 32,
  height: 32,
  source: 'library' as const,
}

const vaga = (over: Partial<LessonArtSlot> = {}): LessonArtSlot => ({
  name: 'minha-chave',
  mode: 'add',
  replaces: 'chave-dourada',
  image: { dataUrl: DESENHO, width: 64, height: 64 },
  ...over,
})

describe('o desenho entra no jogo', () => {
  test('modo materiais: a imagem com o nome da vaga entra, marcada como desenho da aula', () => {
    const out = applyLessonArt(projeto([chaveDourada]), [vaga()])
    expect(out.assets?.map((a) => a.name)).toEqual(['chave-dourada', 'minha-chave'])
    expect(out.assets?.[1]).toMatchObject({
      id: 'lesson-art-minha-chave',
      kind: 'image',
      dataUrl: DESENHO,
      width: 64,
      height: 64,
      source: 'lesson-art',
    })
  })

  test('redesenhar atualiza a mesma imagem (mesmo id), sem duplicar', () => {
    const uma = applyLessonArt(projeto(), [vaga()])
    const duas = applyLessonArt(uma, [
      vaga({ image: { dataUrl: 'data:image/png;base64,NOVO', width: 64, height: 64 } }),
    ])
    expect(duas.assets).toHaveLength(1)
    expect(duas.assets?.[0]).toMatchObject({
      id: 'lesson-art-minha-chave',
      dataUrl: 'data:image/png;base64,NOVO',
    })
  })

  test('sem mudança, o MESMO projeto volta (abrir não marca como alterado)', () => {
    const uma = applyLessonArt(projeto(), [vaga()])
    expect(applyLessonArt(uma, [vaga()])).toBe(uma)
    const semDesenho = projeto([chaveDourada])
    expect(applyLessonArt(semDesenho, [vaga({ image: null })])).toBe(semDesenho)
  })

  test('uma imagem da CRIANÇA com o nome da vaga nunca é trocada', () => {
    const daCrianca = { ...chaveDourada, id: 'x', name: 'minha-chave', source: 'upload' as const }
    const base = projeto([daCrianca])
    expect(applyLessonArt(base, [vaga()])).toBe(base)
  })

  test('modo trocar: a imagem do jogo passa a mostrar o desenho, com o mesmo id e nome', () => {
    const out = applyLessonArt(projeto([chaveDourada]), [vaga({ mode: 'replace' })])
    expect(out.assets).toHaveLength(1)
    expect(out.assets?.[0]).toMatchObject({
      id: 'chave-dourada',
      name: 'chave-dourada',
      dataUrl: DESENHO,
      source: 'lesson-art',
    })
  })

  test('modo trocar sem a imagem no jogo, ou sem `replaces`, não acrescenta nada', () => {
    const base = projeto()
    expect(applyLessonArt(base, [vaga({ mode: 'replace' })])).toBe(base)
    const outra = projeto([chaveDourada])
    expect(applyLessonArt(outra, [vaga({ mode: 'replace', replaces: null })])).toBe(outra)
  })

  test('vaga vazia não tira o desenho que já entrou numa abertura anterior', () => {
    const comDesenho = applyLessonArt(projeto(), [vaga()])
    expect(applyLessonArt(comDesenho, [vaga({ image: null })])).toBe(comDesenho)
  })

  test('projeto Pro ou Python fica como está', () => {
    const pro = { ...projeto(), kind: 'pro' } as unknown as Project
    expect(applyLessonArt(pro, [vaga()])).toBe(pro)
    const python = { ...projeto(), programmingLanguage: 'python' } as unknown as Project
    expect(applyLessonArt(python, [vaga()])).toBe(python)
  })

  test('as animações do desenho viajam junto (o seletor por nome no bloco Animar sprite)', () => {
    const sprite = {
      frameW: 32,
      frameH: 32,
      animations: [{ name: 'brilho', from: 0, to: 1, fps: 4, loop: true }],
    }
    const out = applyLessonArt(projeto(), [
      vaga({ image: { dataUrl: DESENHO, width: 64, height: 32, sprite } }),
    ])
    expect(out.assets?.[0]?.sprite).toEqual(sprite as never)
  })
})

describe('buscar e converter os desenhos', () => {
  const wire = { id: 'asset', kind: 'vector-sprite' }

  test('converte cada entrega e deixa vazia a vaga sem entrega', async () => {
    const vistos: unknown[] = []
    const out = await loadLessonArt(
      async () => ({
        slots: [
          { name: 'minha-chave', mode: 'add', replaces: 'chave-dourada', asset: wire },
          { name: 'meu-farol', mode: 'replace', replaces: null, asset: null },
        ],
      }),
      async (w) => {
        vistos.push(w)
        return { dataUrl: DESENHO, width: 64, height: 64 }
      },
    )
    expect(vistos).toEqual([wire])
    expect(out.failed).toBe(false)
    expect(out.slots).toEqual([
      {
        name: 'minha-chave',
        mode: 'add',
        replaces: 'chave-dourada',
        image: { dataUrl: DESENHO, width: 64, height: 64 },
      },
      { name: 'meu-farol', mode: 'replace', replaces: null, image: null },
    ])
  })

  test('leitura que falha não derruba nada: sem vagas e com o aviso', async () => {
    const out = await loadLessonArt(async () => {
      throw { status: 503, code: 'X', message: 'fora' }
    })
    expect(out).toEqual({ slots: [], failed: true })
  })

  test('desenho que não converte (ou lança) deixa a vaga vazia e liga o aviso', async () => {
    const read = async () => ({
      slots: [{ name: 'minha-chave', mode: 'add' as const, replaces: null, asset: wire }],
    })
    for (const convert of [async () => null, async () => Promise.reject(new Error('canvas'))]) {
      const out = await loadLessonArt(read, convert)
      expect(out.failed).toBe(true)
      expect(out.slots[0]?.image).toBeNull()
    }
  })
})

describe('o teto de materiais do Estúdio (review de 29/10/2026)', () => {
  test('o desenho que estouraria o teto fica de fora e avisa, sem tirar imagem nenhuma', () => {
    const avisos: string[] = []
    const base = projeto([chaveDourada])
    const out = applyLessonArt(base, [vaga()], {
      maxAssetsTotalChars: chaveDourada.dataUrl.length + 3,
      onTooBig: (nome) => avisos.push(nome),
    })
    expect(out).toBe(base)
    expect(avisos).toEqual(['minha-chave'])
    // Com folga, entra.
    expect(applyLessonArt(base, [vaga()]).assets).toHaveLength(2)
  })

  test('os tetos são os do Estúdio', async () => {
    const { PROJECT_ASSET_LIMITS } = await import('../../studio/src/core/projectAssets')
    const { STUDIO_ASSETS_MAX_COUNT, STUDIO_ASSETS_TOTAL_CHARS } = await import(
      '../src/lib/lesson-art-slots'
    )
    expect(STUDIO_ASSETS_TOTAL_CHARS).toBe(PROJECT_ASSET_LIMITS.maxAssetsTotalChars)
    expect(STUDIO_ASSETS_MAX_COUNT).toBe(PROJECT_ASSET_LIMITS.maxAssetsCount)
  })
})
