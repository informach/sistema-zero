import { expect, test } from 'bun:test'
import { buildRaylibDesktopFiles } from '../../../export/raylibDesktop'
import { pythonOfficialModulesFor } from '../../../python/officialModules'
import { RAYLIB_3D_EXTENSION, RAYLIB_MODULE_FILES } from './contract'

test('cenário é módulo oficial somente com Raylib; módulo autoral mantém precedência', () => {
  expect(RAYLIB_MODULE_FILES).toContain('cenario.py')
  const contexto = {
    paths: ['src/main.py'],
    entrypoint: 'src/main.py',
    extensionIds: [RAYLIB_3D_EXTENSION.id],
  }
  expect(pythonOfficialModulesFor(contexto).has('cenario')).toBe(true)
  expect(pythonOfficialModulesFor({ ...contexto, extensionIds: [] }).has('cenario')).toBe(false)
  for (const path of ['src/cenario.py', 'cenario.py', 'src/cenario/__init__.py']) {
    expect(
      pythonOfficialModulesFor({ ...contexto, paths: [...contexto.paths, path] }).has('cenario'),
    ).toBe(false)
  }
})

test('desktop inclui o mesmo auxiliar junto ao entrypoint e registra sua origem gerada', () => {
  const r = buildRaylibDesktopFiles({
    occupied: ['src/main.py'],
    directories: ['src'],
    entrypoint: 'src/main.py',
  })
  expect(r.files['src/cenario.py']).toContain('class Cenario:')
  expect(r.generated).toContain('src/cenario.py')
  expect(r.files[r.requirementsPath]).toBe('raylib==6.0.1.0\n')
  expect(Object.keys(r.files)).not.toContain('pyray/__init__.py')
})

test('auxiliar desktop não sobrescreve módulos/pacotes autorais nem colide em outro case', () => {
  for (const occupied of [['src/cenario.py'], ['src/Cenario.py'], ['src/cenario/__init__.py']]) {
    const r = buildRaylibDesktopFiles({ occupied, directories: ['src'], entrypoint: 'src/main.py' })
    expect(r.files['src/cenario.py']).toBeUndefined()
  }
  const r = buildRaylibDesktopFiles({
    occupied: ['src/main.py'],
    directories: ['src', 'src/cenario'],
    entrypoint: 'src/main.py',
  })
  expect(r.files['src/cenario.py']).toBeUndefined()
})
