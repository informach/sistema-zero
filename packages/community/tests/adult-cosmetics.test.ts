import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TROPHY_HINT } from '@sistemazero/member-shell/lib/room-catalog'
import { ADULT_TROPHY_HINTS } from '../src/lib/adult-trophy-hints'

/**
 * Os editores 3D na pele ADULTA ("Meu avatar 3D" e "Meu espaço 3D", 19/10/2026). Os componentes são
 * os do member-shell com `skin="adult"` (o quarto pela entrada `AdultRoomBuilder`); o desenho mora em `src/app/cosmetics-adult.css` e as dicas
 * dos troféus em `src/lib/adult-trophy-hints.ts`. Aqui ficam as pontas que o member-shell não
 * alcança: as páginas ligam a pele, o CSS existe para cada classe que a pele usa, e as dicas falam
 * de adulto para adulto.
 */

const APP = join(import.meta.dir, '..', 'src', 'app')
const COSMETICS = join(
  import.meta.dir,
  '..',
  '..',
  'member-shell',
  'src',
  'components',
  'cosmetics',
)
const read = (path: string) => readFileSync(path, 'utf8')

describe('as páginas ligam a pele adulta', () => {
  test('meu-avatar passa skin="adult"; o quarto usa a entrada adulta com as dicas adultas', () => {
    expect(read(join(APP, '(app)', 'meu-avatar', 'page.tsx'))).toContain('skin="adult"')
    const quarto = read(join(APP, '(app)', 'quarto', 'page.tsx'))
    // A entrada própria (`room-builder-adult`) deixa a tela adulta fora do pacote do Kids.
    expect(quarto).toContain('room/room-builder-adult')
    expect(quarto).toContain('<AdultRoomBuilder')
    expect(quarto).toContain('trophyHints={ADULT_TROPHY_HINTS}')
    expect(quarto).toContain("back={{ href: '/progresso', label: 'Seu progresso' }}")
  })

  test('o globals.css importa o CSS da pele', () => {
    expect(read(join(APP, 'globals.css'))).toContain('@import "./cosmetics-adult.css";')
  })

  test('toda classe `sz-cos-*` que a pele usa tem regra no CSS do app', () => {
    const files = [
      'adult-ui.tsx',
      'avatar3d/configurator-adult.tsx',
      'room/room-builder-view-adult.tsx',
      'room/room-builder-trays-adult.tsx',
    ]
    const used = new Set(
      files.flatMap((file) => read(join(COSMETICS, file)).match(/sz-cos-[a-z0-9-]+/g) ?? []),
    )
    // Anti-vácuo: a varredura acha as classes.
    expect(used.size).toBeGreaterThan(30)
    const css = read(join(APP, 'cosmetics-adult.css'))
    for (const name of used) expect(css, `.${name} sem regra`).toContain(`.${name}`)
  })

  test('todo token que o CSS da pele lê existe no globals.css (renomear lá não apaga a cor calado)', () => {
    const css = read(join(APP, 'cosmetics-adult.css'))
    const globals = read(join(APP, 'globals.css'))
    const used = new Set(
      [...css.matchAll(/var\((--[a-z0-9-]+)/g)]
        .map((match) => match[1] as string)
        .filter((token) => !token.startsWith('--cos-')),
    )
    // Anti-vácuo: a varredura acha os tokens do app.
    expect(used.size).toBeGreaterThan(10)
    for (const token of used)
      expect(globals, `${token} não existe no globals.css`).toContain(`${token}:`)
  })

  test('a pele adulta não usa os tokens do Kids (que não existem neste app)', () => {
    const adultFiles = readdirSync(COSMETICS, { recursive: true, encoding: 'utf8' }).filter(
      (file) => file.endsWith('-adult.tsx') || file === 'adult-ui.tsx',
    )
    expect(adultFiles.length).toBeGreaterThanOrEqual(3)
    for (const file of adultFiles)
      expect(read(join(COSMETICS, file)), file).not.toMatch(/--kids-|--sz-hot|sz-btn-gradient/)
  })
})

describe('as dicas adultas dos troféus', () => {
  test('uma para cada dica do Kids', () => {
    expect(Object.keys(ADULT_TROPHY_HINTS).sort()).toEqual(Object.keys(TROPHY_HINT).sort())
  })

  test('voz de adulto: sem exclamação, sem emoji, sem aventura nem fase, e o Mural pelo nome', () => {
    for (const hint of Object.values(ADULT_TROPHY_HINTS)) {
      expect(hint).not.toContain('!')
      expect(/\p{Extended_Pictographic}/u.test(hint)).toBe(false)
      expect(hint).not.toMatch(/aventura|inteirinha|\bfases?\b|mostra/i)
    }
    expect(ADULT_TROPHY_HINTS['trofeu-primeiro-jogo']).toContain('Mural')
    expect(ADULT_TROPHY_HINTS['trofeu-diploma']).toBe('Conclua um curso inteiro.')
    expect(ADULT_TROPHY_HINTS['trofeu-oficina-completa']).toContain('partes de uma oficina')
  })
})
