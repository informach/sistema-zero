import { expect, it } from 'bun:test'
import { absolutePythonImport, pythonModulePaths, relativePythonImport } from './modulePaths'

const file = { kind: 'file' as const, content: '' }
it('resolves packages before modules and modules before namespace directories from the entrypoint root', () => {
  const paths = pythonModulePaths(
    {
      'main.py': file,
      'helper.py': file,
      'src/main.py': file,
      'src/helper.py': file,
      'src/pkg.py': file,
      'src/pkg/__init__.py': file,
      'src/pkg/child.py': file,
      'src/shadow.py': file,
      'src/shadow/child.py': file,
      'src/namespace/child.py': file,
    },
    'src/main.py',
  )
  expect(paths.resolve('helper')).toEqual({ kind: 'module', path: 'src/helper.py' })
  expect(paths.resolve('pkg')).toEqual({ kind: 'package', path: 'src/pkg' })
  expect(paths.resolve('pkg.child')).toEqual({ kind: 'module', path: 'src/pkg/child.py' })
  expect(paths.resolve('shadow.child')).toBeNull()
  expect(paths.resolve('namespace')).toEqual({ kind: 'namespace', path: 'src/namespace' })
  expect(paths.packageOf('src/pkg/child.py')).toBe('pkg')
  expect(paths.packageOf('src/pkg/__init__.py')).toBe('pkg')
  expect(paths.packageOf('other/main.py')).toBeNull()
  expect(paths.nameOf({ kind: 'module', path: 'helper.py' })).toBeNull()
})

it('preserves relative imports inside packages and uses absolute names across top-level packages', () => {
  expect(absolutePythonImport('pkg.child', 'helper', 2)).toBe('pkg.helper')
  expect(absolutePythonImport('pkg', null, 1)).toBe('pkg')
  expect(() => absolutePythonImport('pkg', 'helper', 2)).toThrow()
  expect(relativePythonImport('pkg.child', 'pkg.helper')).toBe('..helper')
  expect(relativePythonImport('pkg', 'pkg')).toBe('.')
  expect(relativePythonImport('other', 'pkg.helper')).toBe('pkg.helper')
})
