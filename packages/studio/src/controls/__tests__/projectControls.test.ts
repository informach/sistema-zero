import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type ControlBinding,
  defaultProjectControls,
  describeProjectControls,
} from '../projectControls'

/** IR mínima com os statements dados no "Ao iniciar". */
function irCom(...statements: unknown[]) {
  return {
    version: 2,
    html: [],
    css: [],
    behavior: { start: statements, events: [], loops: [] },
    extensions: [],
  }
}

function teclas(bindings: ControlBinding[]) {
  return bindings.map((b) => `${b.key}|${b.code}`)
}

describe('describeProjectControls — o padrão seguro', () => {
  it('projeto ilegível mantém EXATAMENTE o que o pad já mandava', () => {
    for (const projeto of [null, undefined, {}, { ir: null }, { ir: { lixo: true } }]) {
      const c = describeProjectControls(projeto as never)
      expect(c.fallback).toBe(true)
      // ⚠️ A metade que precisa falhar: se alguém tornar A e B derivados, um jogo
      // que este módulo não entenda perde os dois botões que hoje funcionam.
      expect(c.face.A).toEqual({ label: 'Pular', key: ' ', code: 'Space' })
      expect(c.face.B).toEqual({ label: 'Começar', key: 'Enter', code: 'Enter' })
      expect(teclas(c.directions.left)).toEqual(['ArrowLeft|ArrowLeft'])
      expect(c.face.X).toBeNull()
      expect(c.face.Y).toBeNull()
    }
  })

  it('as casas que o jogo não usa ficam vazias, para o botão apagar', () => {
    const c = describeProjectControls({ ir: irCom({ type: 'g2d:keyDown', key: 'Space' }) })
    expect(c.fallback).toBe(false)
    expect(c.face.X).toBeNull()
    expect(c.face.Y).toBeNull()
    expect(c.strip.select).toBeNull()
  })
})

describe('describeProjectControls — o que ele aprende do jogo', () => {
  it('jogo que lê a tecla A/D faz o direcional mandar TAMBÉM a letra', () => {
    const c = describeProjectControls({
      ir: irCom({ type: 'g2d:keyDown', key: 'a' }, { type: 'g2d:keyDown', key: 'd' }),
    })
    // A seta continua indo — é ela que alimenta todo helper de movimento.
    expect(teclas(c.directions.left)).toEqual(['ArrowLeft|ArrowLeft', 'a|KeyA'])
    expect(teclas(c.directions.right)).toEqual(['ArrowRight|ArrowRight', 'd|KeyD'])
    // E a direção que o jogo NÃO lê por letra não ganha alias à toa.
    expect(teclas(c.directions.up)).toEqual(['ArrowUp|ArrowUp'])
  })

  it('a tecla de fogo vai para o Y com o code certo', () => {
    const c = describeProjectControls({ ir: irCom({ type: 'g2d:keyDown', key: 'f' }) })
    // ⚠️ `KeyF`, não `f`: o 3D lê event.code CRU, e um botão com code errado é um
    // botão morto com cara de certo.
    expect(c.face.Y).toEqual({ label: 'Soltar fogo', key: 'f', code: 'KeyF' })
  })

  it('jogo que lê Z recebe Z no botão A', () => {
    const c = describeProjectControls({ ir: irCom({ type: 'g2d:keyDown', key: 'z' }) })
    expect(c.face.A).toEqual({ label: 'Pular', key: 'z', code: 'KeyZ' })
  })

  it('a ação semântica de correr enche o X sem o jogo citar tecla nenhuma', () => {
    const c = describeProjectControls({ ir: irCom({ type: 'g2d:actionDown', action: 'action' }) })
    expect(c.face.X).toEqual({ label: 'Correr ou agir', key: 'Shift', code: 'ShiftLeft' })
  })

  it('pausa e selecionar enchem a tira', () => {
    const c = describeProjectControls({
      ir: irCom(
        { type: 'g2d:onActionPressed', action: 'pause' },
        { type: 'g2d:actionDown', action: 'select' },
      ),
    })
    expect(c.strip.start).toEqual({ label: 'Pausar', key: 'Escape', code: 'Escape' })
    expect(c.strip.select).toEqual({ label: 'Selecionar', key: 'Backspace', code: 'Backspace' })
  })

  it('entende os dialetos das outras extensões', () => {
    const tresD = describeProjectControls({
      ir: irCom(
        { type: 'g3d:keyDown', key: 'KeyW' },
        { type: 'g3d:keyDown', key: 'ShiftLeft' },
        { type: 'g3k:keyPressed', key: 'KeyF' },
      ),
    })
    expect(teclas(tresD.directions.up)).toEqual(['ArrowUp|ArrowUp', 'w|KeyW'])
    expect(tresD.face.X?.code).toBe('ShiftLeft')
    expect(tresD.face.Y?.code).toBe('KeyF')

    const avancado = describeProjectControls({
      ir: irCom({ type: 'gk:actionDown', action: 'correr' }, { type: 'gk:keyDown', key: 'escape' }),
    })
    expect(avancado.face.X?.code).toBe('ShiftLeft')
    expect(avancado.strip.start?.label).toBe('Pausar')
  })

  it('acha o bloco FUNDO, dentro de evento e de "se"', () => {
    const c = describeProjectControls({
      ir: irCom({
        type: 'g2d:onKey',
        key: 'Enter',
        body: [
          {
            type: 'if',
            cond: { type: 'g2d:keyDown', key: 'f' },
            then: [{ type: 'while', body: [{ type: 'g2d:actionDown', action: 'select' }] }],
          },
        ],
      }),
    })
    // ⚠️ A varredura é por FORMA (procura `type` em qualquer objeto aninhado), e não
    // por lista de chaves de corpo: a união da IR passa de 900 membros e os corpos
    // moram em chaves diferentes.
    expect(c.face.Y?.code).toBe('KeyF')
    expect(c.strip.select).not.toBeNull()
  })
})

describe('describeProjectControls — o pad de dentro do jogo', () => {
  it('jogo que liga os controles clássicos é sinalizado', () => {
    const ligado = describeProjectControls({
      ir: irCom({ type: 'g2d:enableClassicControls', mode: 'auto' }),
    })
    expect(ligado.ownPadMode).toBe('auto')

    const permanente = describeProjectControls({
      ir: irCom({ type: 'g2d:enableClassicControls', mode: 'always' }),
    })
    expect(permanente.ownPadMode).toBe('always')

    const desligado = describeProjectControls({
      ir: irCom({ type: 'g2d:enableClassicControls', mode: 'off' }),
    })
    expect(desligado.ownPadMode).toBeNull()
  })
})

describe('describeProjectControls — a rede do código', () => {
  it('sem IR, lê o script.js que é o que de fato roda', () => {
    const c = describeProjectControls({
      ir: null,
      files: {
        'script.js':
          "SZGame2D.enableClassicControls('auto');\nif (SZGame2D.keyDown('f')) shoot();\nif (SZGame2D.actionDown('pause')) stop();",
      } as never,
    })
    expect(c.fallback).toBe(false)
    expect(c.ownPadMode).toBe('auto')
    expect(c.face.Y?.code).toBe('KeyF')
    expect(c.strip.start?.label).toBe('Pausar')
  })
})

describe('o subpath é leve', () => {
  it('não arrasta Blockly, Monaco nem three', () => {
    const fonte = readFileSync(join(import.meta.dir, '..', 'projectControls.ts'), 'utf8')
    // A página pública de jogar usa o subpath leve; um import de editor aqui
    // colocaria o Blockly inteiro no bundle de quem só quer jogar.
    for (const proibido of ['blockly', 'monaco', 'three', '#blockly', '#monaco']) {
      expect(fonte.toLowerCase()).not.toContain(`from '${proibido}`)
    }
    // Só tipos entram do núcleo: `import type` some no build.
    const imports = fonte.match(/^import .*$/gm) ?? []
    expect(imports.every((linha) => linha.startsWith('import type'))).toBe(true)
  })
})

describe('a tabela de teclas', () => {
  it('todo par key/code é o que o navegador emitiria de verdade', () => {
    const c = defaultProjectControls()
    const todos = [
      ...Object.values(c.directions).flat(),
      ...Object.values(c.face),
      ...Object.values(c.strip),
    ].filter((b): b is ControlBinding => b !== null)
    for (const b of todos) {
      if (b.key === ' ') expect(b.code).toBe('Space')
      else if (/^[a-z]$/.test(b.key)) expect(b.code).toBe(`Key${b.key.toUpperCase()}`)
      else if (b.key === 'Shift') expect(b.code).toBe('ShiftLeft')
      else expect(b.code).toBe(b.key)
    }
  })
})
