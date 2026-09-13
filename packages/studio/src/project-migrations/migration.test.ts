import { describe, expect, it } from 'bun:test'
import { createEmptyProject } from '../core/project'
import {
  prepareProjectDocument,
  projectBlockTypes,
  projectFormatVersion,
} from '../core/projectDocument'
import { migrateGameTwoDHTML } from './html'
import { migrateProjectDocument } from './index'
import { migrateGameTwoDJavaScript } from './javascript'
import { copyDocument } from './types'

function document() {
  return { ...createEmptyProject('migration-test', 'Meu jogo'), formatVersion: 1 }
}

describe('conversor isolado de documentos', () => {
  it('converte mapas RPG manuais preservando ordem, comentários e callbacks', () => {
    const source =
      'SZGameKit.rpgOnMap("vila", () => { /* entrada */ entrou(); });\nSZGameKit.rpgOnMap("vila", () => saiu());'
    const converted = migrateGameTwoDJavaScript(source, [], '$.files.script.js')
    const order: string[] = []
    const callbacks: Array<() => void> = []
    new Function('SZGameKit', 'entrou', 'saiu', converted)(
      {
        rpgCreateMap: (...args: unknown[]) => {
          order.push('criar')
          expect(args.slice(0, 3)).toEqual(['vila', 0, 0])
          expect(args[5]).toBe('unbounded')
        },
        rpgOnEnterMap: (_: string, fn: () => void) => {
          order.push('registrar')
          callbacks.push(fn)
        },
      },
      () => order.push('entrou'),
      () => order.push('saiu'),
    )
    expect(order).toEqual(['criar', 'registrar', 'registrar'])
    for (const fn of callbacks) fn()
    expect(order.slice(-2)).toEqual(['entrou', 'saiu'])
    expect(converted).toContain('/* entrada */')
    for (const ambiguous of [
      'SZGameKit.rpgOnMap(nome, () => {});',
      'if (ativa) { SZGameKit.rpgOnMap("vila", () => {}); }',
      'const SZGameKit = custom; SZGameKit.rpgOnMap("vila", () => {});',
      'SZGameKit.rpgMapSize(10, 20);',
      'const kit = SZGameKit; kit.rpgOnMap("vila", () => {});',
    ])
      expect(() => migrateGameTwoDJavaScript(ambiguous, [], '$')).toThrow()
  })
  it('repara somente IDs de sombras copiadas e conserva os argumentos dos métodos genéricos', async () => {
    const raw = {
      ...document(),
      ir: null,
      blocksState: {
        szBehaviorAreasVersion: 7,
        blocks: {
          blocks: [
            {
              id: 'call',
              type: 'sz_js_method_on',
              fields: { METHOD: 'playJump' },
              extraState: { items: 2 },
              inputs: {
                OBJ: {
                  block: { id: 'api', type: 'sz_val_variable', fields: { NAME: 'SZGame2D' } },
                },
                ARG0: { shadow: { id: 'number', type: 'sz_val_number', fields: { NUM: 11 } } },
                ARG1: { shadow: { id: 'number', type: 'sz_val_number', fields: { NUM: 29 } } },
              },
            },
          ],
        },
      },
    }
    const first = await migrateProjectDocument(raw)
    expect(first.document.blocksState).toMatchObject({
      blocks: {
        blocks: [
          {
            id: 'call',
            fields: { METHOD: 'playFx' },
            extraState: { items: 3 },
            inputs: {
              OBJ: { block: { id: 'api' } },
              ARG0: { shadow: { fields: { TEXT: 'jump' } } },
              ARG1: { shadow: { fields: { NUM: 11 } } },
              ARG2: { shadow: { fields: { NUM: 29 } } },
            },
          },
        ],
      },
    })
    expect(first.changes.some((change) => change.rule === 'blockly.shadow-identity')).toBe(true)
    expect(projectBlockTypes(first.document.blocksState)).toContain('sz_js_method_on')
    expect(first.document).toEqual((await migrateProjectDocument(raw)).document)
  })
  it('copia e converte pilhas longas sem recursão e recusa IDs duplicados', async () => {
    let tail: Record<string, unknown> = { type: 'sz_g2d_play_jump', id: 'last' }
    for (let i = 0; i < 2000; i++)
      tail = { type: 'sz_g2d_play_shoot', id: String(i), next: { block: tail } }
    const raw = {
      ...document(),
      blocksState: { szBehaviorAreasVersion: 7, blocks: { blocks: [tail] } },
    }
    const copy = copyDocument(raw)
    expect(copy).not.toBe(raw)
    const converted = await migrateProjectDocument(raw)
    expect(projectBlockTypes(converted.document.blocksState)).toEqual(['sz_g2d_play_fx'])
    expect(() =>
      projectBlockTypes({
        blocks: {
          blocks: [
            { type: 'a', id: 'same' },
            { type: 'b', id: 'same' },
          ],
        },
      }),
    ).toThrow('mesmo identificador')
  })

  it('converte colisão circular, parada de música e ferramentas retidas com IDs determinísticos', async () => {
    const raw = {
      ...document(),
      projectTools: ['sz_g2d_play_whistle'],
      blocksState: {
        szBehaviorAreasVersion: 7,
        blocks: {
          blocks: [
            {
              type: 'sz_g2d_circle_collides',
              id: 'old',
              fields: { NAME: 'encostou', A: 'a', B: 'b' },
            },
            { type: 'sz_g2d_stop_music', id: 'sz-converted-1' },
            { type: 'sz_g2d_stop_track', id: 'stop' },
            { type: 'sz_g2d_every_frames', id: 'empty', inputs: { BODY: {} } },
          ],
        },
      },
    }
    const first = (await migrateProjectDocument(raw)).document
    expect(first).toEqual((await migrateProjectDocument(raw)).document)
    expect(first).toEqual((await migrateProjectDocument(first)).document)
    expect(first.projectTools).toContain('sz_g2d_play_fx')
    expect(first.blocksState).toMatchObject({
      blocks: {
        blocks: [
          {
            type: 'sz_js_const_create',
            id: 'old',
            inputs: { VALUE: { block: { id: 'sz-converted-2', type: 'sz_g2d_circle_touches' } } },
          },
          { type: 'sz_g2d_stop_track', fields: { SCOPE: 'synth' } },
          { type: 'sz_g2d_stop_track', fields: { SCOPE: 'all' } },
          { inputs: {} },
        ],
      },
    })
  })
  it('converte sons e pontuação sem tocar no original, nos recursos ou na disposição', async () => {
    const raw = {
      ...document(),
      assets: [
        {
          id: 'image',
          kind: 'image',
          dataUrl: 'data:image/png;base64,AA==',
          metadata: { type: 'sz_g2d_play_shoot' },
        },
      ],
      blocksState: {
        szBehaviorAreasVersion: 7,
        blocks: {
          blocks: [
            {
              type: 'sz_g2d_score',
              id: 'points',
              x: 83,
              y: 27,
              data: 'anotação',
              fields: { NAME: 'pontos' },
              inputs: {
                INITIAL: { shadow: { type: 'sz_val_number', id: 'number', fields: { NUM: 12 } } },
              },
              next: { block: { type: 'sz_g2d_play_shoot', id: 'sound', disabled: true } },
            },
          ],
        },
      },
      ir: {
        html: [],
        css: [],
        js: [{ type: 'g2d:score', varName: 'pontos', initial: 12 }, { type: 'g2d:playShoot' }],
        extensions: [],
      },
    }
    const original = structuredClone(raw)
    const { document: out } = await migrateProjectDocument(raw)
    expect(raw).toEqual(original)
    expect(out.assets).toEqual(raw.assets)
    expect(out.blocksState).toMatchObject({
      blocks: {
        blocks: [
          {
            type: 'sz_js_var_create',
            id: 'points',
            x: 83,
            y: 27,
            data: 'anotação',
            inputs: { VALUE: { shadow: { id: 'number', fields: { NUM: 12 } } } },
            next: {
              block: {
                type: 'sz_g2d_play_fx',
                id: 'sound',
                disabledReasons: ['MANUALLY_DISABLED'],
                fields: { FX: 'shoot' },
              },
            },
          },
        ],
      },
    })
    expect(out.ir).toMatchObject({
      behavior: {
        start: [
          { type: 'var', name: 'pontos', value: { type: 'num', value: 12 } },
          { type: 'g2d:playFx', fx: 'shoot' },
        ],
      },
    })
    expect((await migrateProjectDocument(out)).document).toEqual(out)
    expect((await migrateProjectDocument(out)).changes).toEqual([])
  })

  it('preserva a autoridade do código manual e os arquivos extras', async () => {
    const raw = {
      ...document(),
      mode: 'bridge',
      bridgeCodeAhead: true,
      files: { ...document().files, 'script.js': '// minha regra\nSZGame2D.playJump();' },
      extraFiles: [
        { name: 'ajuda.js', language: 'javascript', content: 'SZGame2D.playWhistle();' },
      ],
      ir: { js: [{ type: 'g2d:playExplosion' }] },
      blocksState: { blocks: { blocks: [{ type: 'sz_g2d_play_explosion' }] } },
    }
    const { document: out } = await migrateProjectDocument(raw)
    expect(out.files).toMatchObject({ 'script.js': '// minha regra\nSZGame2D.playFx("jump");' })
    expect(out.extraFiles).toMatchObject([{ content: 'SZGame2D.playFx("whistle");' }])
    expect(out.ir).toBeNull()
    expect(out.blocksState).toBeNull()
  })

  it('recusa versões futuras, ciclos e getters sem executá-los', async () => {
    expect(() => projectFormatVersion({ formatVersion: 99 })).toThrow('mais nova')
    const raw: Record<string, unknown> = document()
    raw.cycle = raw
    await expect(migrateProjectDocument(raw)).rejects.toThrow('circular')
    let reads = 0
    const getter = Object.defineProperty(document(), 'assets', {
      enumerable: true,
      get() {
        reads++
        return []
      },
    })
    await expect(migrateProjectDocument(getter)).rejects.toThrow('executável')
    expect(reads).toBe(0)
    const versionGetter = Object.defineProperty(document(), 'formatVersion', {
      get() {
        reads++
        return 1
      },
    })
    await expect(migrateProjectDocument(versionGetter)).rejects.toThrow('JSON')
    expect(reads).toBe(0)
  })

  it('projeto corrente segue sem executar migração', async () => {
    const raw = { ...document(), formatVersion: 2 }
    expect(await prepareProjectDocument(raw)).toBe(raw)
  })

  it('as ferramentas vêm de blocos conectados, sombras e rascunhos, sem ler campos arbitrários', () => {
    expect(
      projectBlockTypes({
        blocks: {
          blocks: [
            {
              type: 'sz_js_var_create',
              fields: { impostor: { type: 'inventado' } },
              inputs: {
                VALUE: { block: { type: 'sz_val_variable' }, shadow: { type: 'sz_val_number' } },
              },
            },
            { type: 'sz_g2d_play_fx' },
          ],
        },
      }),
    ).toEqual(['sz_g2d_play_fx', 'sz_js_var_create', 'sz_val_number', 'sz_val_variable'])
  })
})

describe('conversão do JavaScript manual por AST', () => {
  it('mantém a ordem dos argumentos e o alcance histórico da parada de música', () => {
    const code = migrateGameTwoDJavaScript(
      'SZGame2D.stopMusic(log.push("a")); SZGame2D.stopTrack(log.push("b"));',
      [],
      '$',
    )
    const log: string[] = []
    new Function('SZGame2D', 'log', code)({ stopTrack: (scope: string) => log.push(scope) }, log)
    expect(log).toEqual(['a', 'synth', 'b', 'all'])
  })

  it('converte JSX e TypeScript sem mudar trechos autorais', () => {
    expect(
      migrateGameTwoDJavaScript(
        'const Som = () => <button onClick={() => SZGame2D.playJump()}>Pular</button>;',
        [],
        '$.tree.Som.tsx',
      ),
    ).toContain('SZGame2D.playFx("jump")')
    expect(
      migrateGameTwoDJavaScript('const n = <number>valor; SZGame2D.playJump();', [], '$.tree.a.ts'),
    ).toContain('const n = <number>valor;')
  })

  it('converte somente o código executável do HTML, inclusive eventos com entidades', () => {
    const html =
      '<!-- SZGame2D.playJump() --><p>SZGame2D.playJump()</p><script type="application/json">{"text":"SZGame2D.playJump()"}</script><button onclick="SZGame2D[&quot;playJump&quot;]()">oi</button><script>/* som */ SZGame2D.stopMusic();</script>'
    const out = migrateGameTwoDHTML(html, [], '$.files.index.html')
    expect(out).toBe(
      '<!-- SZGame2D.playJump() --><p>SZGame2D.playJump()</p><script type="application/json">{"text":"SZGame2D.playJump()"}</script><button onclick="SZGame2D[&quot;playFx&quot;](&quot;jump&quot;)">oi</button><script>/* som */ SZGame2D.stopTrack("synth");</script>',
    )
  })
  it('mantém comentários, textos e efeitos dos argumentos na mesma ordem', () => {
    const source =
      '// SZGame2D.playJump()\nconst texto = "SZGame2D.playShoot()";\nSZGame2D.playShoot(log.push("argumento"));'
    const converted = migrateGameTwoDJavaScript(source, [], '$.files.script.js')
    expect(converted).toContain('// SZGame2D.playJump()')
    expect(converted).toContain('"SZGame2D.playShoot()"')
    const log: string[] = []
    new Function('SZGame2D', 'log', converted)({ playFx: (fx: string) => log.push(fx) }, log)
    expect(log).toEqual(['argumento', 'shoot'])
  })

  it('preserva chamadas opcionais e comentários em chamadas sem argumentos', () => {
    const out = migrateGameTwoDJavaScript('SZGame2D?.["playJump"]?.(/* meu som */);', [], '$')
    expect(out).toBe('SZGame2D?.["playFx"]?.(/* meu som */"jump");')
  })

  it('recusa referências a funções, escopo ambíguo e acessos dinâmicos', () => {
    for (const code of [
      'const som = SZGame2D.playJump;',
      'function f(SZGame2D) { SZGame2D.playJump(); }',
      'SZGame2D[nome]();',
      'const api = SZGame2D; api.playJump();',
      'window.SZGame2D.playJump();',
    ])
      expect(() => migrateGameTwoDJavaScript(code, [], '$')).toThrow()
  })
})
