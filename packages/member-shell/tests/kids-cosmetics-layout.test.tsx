import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  KIDS_AVATAR_CATEGORY_GROUPS,
  kidsAvatarGroupOf,
} from '../src/components/cosmetics/avatar3d/configurator-shared'
import { AVATAR_CATEGORIES } from '../src/lib/avatar3d-catalog'

/**
 * Proposta "painel ao lado" do Kids (Canvas de 26/10/2026): o avatar e o quarto põem os controles
 * à direita do 3D quando a área do editor tem 45rem ou mais. O que dá para travar sem WebGL é a
 * MARCAÇÃO, e é ela o mecanismo: a régua é uma container query, não a largura da janela.
 */
const source = (relative: string) => readFileSync(resolve(import.meta.dir, '..', relative), 'utf8')

describe('as categorias do avatar em três grupos', () => {
  test('toda categoria entra em exatamente um grupo', () => {
    const agrupadas = KIDS_AVATAR_CATEGORY_GROUPS.flatMap((group) => group.categories)
    expect([...agrupadas].sort()).toEqual([...AVATAR_CATEGORIES].sort())
    expect(new Set(agrupadas).size).toBe(agrupadas.length)
  })

  test('o grupo de uma categoria é o que a contém', () => {
    expect(kidsAvatarGroupOf('hair').id).toBe('cabeca')
    expect(kidsAvatarGroupOf('shoes').id).toBe('roupa')
    expect(kidsAvatarGroupOf('nose').id).toBe('rosto')
  })
})

describe('o painel ao lado do 3D', () => {
  test('o avatar mede o próprio contêiner e põe o painel ao lado a partir de 45rem', () => {
    const tela = source('src/components/cosmetics/avatar3d/configurator.tsx')
    expect(tela).toContain('@container/avatar')
    expect(tela).toContain('@min-[45rem]/avatar:flex-row')
    // Só a grade de peças rola: ao lado, ela perde o teto de altura e ocupa o resto do painel.
    expect(tela).toContain('@min-[45rem]/avatar:max-h-none')
    expect(tela).toContain('@min-[45rem]/avatar:flex-1')
  })

  test('o quarto mede o próprio contêiner, e a bandeja usa o contêiner dela para as colunas', () => {
    const tela = source('src/components/cosmetics/room/room-builder-view.tsx')
    expect(tela).toContain('@container/quarto')
    expect(tela).toContain('@min-[45rem]/quarto:grid-cols-')
    expect(tela).toContain('@container/bandeja')
    // ⚠️ `sm:` mede a JANELA: num painel de 420px ao lado do quarto, `sm:grid-cols-6` daria seis
    // colunas espremidas. As bandejas medem o contêiner.
    expect(source('src/components/cosmetics/room/room-builder-trays.tsx')).not.toMatch(/\bsm:/)
  })

  test('ao lado, o quarto ocupa a largura e a altura da janela, como o avatar', () => {
    // 27/10/2026, pedido dela. Antes a coluna do quarto era 3:2 com teto pela altura da janela, e
    // a página inteira rolava; hoje o editor tem a altura da janela (a partir do `md`) e a moldura
    // troca o 3:2 pela altura que sobra. A câmera encaixa o quarto em qualquer formato.
    const tela = source('src/components/cosmetics/room/room-builder-view.tsx')
    expect(tela).toContain('md:@min-[45rem]/quarto:h-[max(30rem,calc(100dvh-2rem))]')
    expect(tela).toContain('@min-[45rem]/quarto:grid-cols-[minmax(0,1fr)_')
    expect(tela).toContain("'@min-[45rem]/quarto:aspect-auto @min-[45rem]/quarto:h-full'")
    expect(tela).not.toContain('w-fit')
    expect(source('src/components/cosmetics/room/use-responsive-zoom.ts')).toContain(
      'Math.min(width / worldW, height / worldH)',
    )
  })
})
