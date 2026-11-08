import { describe, expect, it } from 'bun:test'
import { isProConfigPath, proFileBaseName, proFileKind } from './proFileKinds'

describe('proFileKinds', () => {
  it('separa os arquivos de configuração dos que a criança mexe', () => {
    for (const path of [
      'package.json',
      'package-lock.json',
      'vite.config.js',
      'vite.config.mts',
      'tsconfig.json',
      'tsconfig.app.json',
      '.gitignore',
    ])
      expect(isProConfigPath(path)).toBe(true)
    for (const path of [
      'src/main.js',
      'index.html',
      'src/config.ts',
      'src/package.json',
      'README.md',
    ])
      expect(isProConfigPath(path)).toBe(false)
  })

  it('dá a cada arquivo um ladrilho e uma frase', () => {
    expect(proFileKind('src/main.js')).toEqual({
      tone: 'js',
      short: 'JS',
      descriptionKey: 'pro.files.desc.main',
      config: false,
    })
    expect(proFileKind('src/util.ts').descriptionKey).toBe('pro.files.desc.js')
    expect(proFileKind('src/util.ts').short).toBe('TS')
    expect(proFileKind('src/style.css').tone).toBe('css')
    expect(proFileKind('index.html')).toMatchObject({
      tone: 'html',
      descriptionKey: 'pro.files.desc.html',
    })
    expect(proFileKind('package.json')).toMatchObject({
      tone: 'config',
      short: '{ }',
      descriptionKey: 'pro.files.desc.package',
      config: true,
    })
    expect(proFileKind('vite.config.js')).toMatchObject({
      tone: 'config',
      descriptionKey: 'pro.files.desc.config',
    })
    expect(proFileKind('src', { kind: 'dir' })).toMatchObject({
      tone: 'dir',
      descriptionKey: 'pro.files.desc.dir',
    })
    expect(proFileKind('public/nave.png').tone).toBe('image')
    expect(proFileKind('notes.txt').tone).toBe('text')
  })

  it('reconhece onde o programa Python começa pelo entrypoint', () => {
    expect(proFileKind('src/main.py', { entrypoint: 'src/main.py' })).toMatchObject({
      tone: 'py',
      short: 'Py',
      descriptionKey: 'pro.files.desc.entry',
    })
    expect(proFileKind('src/cores.py', { entrypoint: 'src/main.py' }).descriptionKey).toBe(
      'pro.files.desc.py',
    )
    // Com entrypoint explícito, o nome padrão não vale sozinho.
    expect(proFileKind('src/main.py', { entrypoint: 'game/start.py' }).descriptionKey).toBe(
      'pro.files.desc.py',
    )
  })

  it('mostra só o nome do arquivo, sem a pasta', () => {
    expect(proFileBaseName('src/game/player.js')).toBe('player.js')
    expect(proFileBaseName('index.html')).toBe('index.html')
  })
})
