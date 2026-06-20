import { describe, expect, it } from 'bun:test'
import type { LearningProfile } from '#core'
import { buildCoreToolbox } from '../toolbox'

/**
 * Coleta os nomes de TODAS as categorias, em qualquer profundidade — a toolbox
 * agora tem sub-categorias aninhadas: HTML/CSS em grupos coloridos e "Programação"
 * juntando JS (em grupos), DOM, Matemática, Valores, Funções, Classes e Objetos.
 */
function collectNames(contents: readonly unknown[], out: string[] = []): string[] {
  for (const c of contents) {
    if (c && typeof c === 'object' && (c as { kind?: string }).kind === 'category') {
      const cat = c as { name?: string; contents?: readonly unknown[] }
      if (cat.name) out.push(cat.name)
      if (Array.isArray(cat.contents)) collectNames(cat.contents, out)
    }
  }
  return out
}

function categoryNames(profile?: LearningProfile): string[] {
  return collectNames(buildCoreToolbox([], profile).contents)
}

describe('buildCoreToolbox — divulgação progressiva', () => {
  it('sem perfil mostra todas as categorias (incl. sub-categorias)', () => {
    const names = categoryNames()
    expect(names).toContain('HTML')
    expect(names).toContain('Canvas')
    // Canvas agora tem sub-categorias (igual HTML/Programação).
    expect(names).toContain('🖼️ Tela')
    expect(names).toContain('⬛ Formas')
    expect(names).toContain('✏️ Traçado')
    expect(names).toContain('🔄 Transformar')
    expect(names).toContain('Programação')
    expect(names).toContain('🧩 Funções')
    expect(names).toContain('🏛️ Classes')
    expect(names).toContain('📦 Objetos')
    expect(names).toContain('Avançado')
  })

  it('iniciante mostra HTML/CSS/Programação e esconde Canvas/Funções/Classes/Objetos/Avançado', () => {
    const names = categoryNames({ level: 'iniciante' })
    expect(names).toContain('HTML')
    expect(names).toContain('CSS')
    expect(names).toContain('Programação')
    expect(names).toContain('🏷️ Variáveis') // grupo de JS (iniciante)
    expect(names).not.toContain('Canvas')
    expect(names).not.toContain('🧩 Funções')
    expect(names).not.toContain('🏛️ Classes')
    expect(names).not.toContain('📦 Objetos')
    expect(names).not.toContain('Avançado')
  })

  it('"Programação" vem depois de CSS e contém a Página (DOM)', () => {
    const names = categoryNames({ level: 'iniciante' })
    expect(names.indexOf('CSS')).toBeLessThan(names.indexOf('Programação'))
    expect(names).toContain('🌐 Página')
  })

  it('intermediario mostra Canvas/Funções/Objetos, mas não Classes/Avançado', () => {
    const names = categoryNames({ level: 'intermediario' })
    expect(names).toContain('Canvas')
    expect(names).toContain('🧩 Funções')
    expect(names).toContain('📦 Objetos')
    expect(names).not.toContain('🏛️ Classes')
    expect(names).not.toContain('Avançado')
  })

  it('revealed mostra tudo mesmo com nível iniciante', () => {
    const names = categoryNames({ level: 'iniciante', revealed: true })
    expect(names).toContain('🏛️ Classes')
    expect(names).toContain('Avançado')
  })

  it('allowCategories força a sub-categoria além do nível (pelo nome ORIGINAL)', () => {
    const names = categoryNames({ level: 'iniciante', allowCategories: ['Classes'] })
    expect(names).toContain('🏛️ Classes')
  })

  it('a busca está sempre presente', () => {
    const tb = buildCoreToolbox([], { level: 'iniciante' })
    expect(tb.contents.some((c) => c.kind === 'search')).toBe(true)
  })
})
