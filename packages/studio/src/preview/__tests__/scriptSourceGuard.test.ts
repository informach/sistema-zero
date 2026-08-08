import { describe, expect, it } from 'bun:test'
import { buildPreviewDoc } from '../bootstrap'
import { buildScriptSourceGuardRuntime } from '../scriptSourceGuard'

interface FakeNode {
  tagName: string
  src: string
  setAttribute(name: string, value: string): void
  setAttributeNS(ns: string | null, name: string, value: string): void
}

interface GuardEnv {
  script: FakeNode
  image: FakeNode
  applied: string[]
  warnings: string[]
  ElementProto: object
  ScriptProto: object
}

function runGuard(): GuardEnv {
  const applied: string[] = []
  const warnings: string[] = []

  class FakeElement {
    tagName = 'DIV'
    setAttribute(name: string, value: string): void {
      applied.push(`setAttribute:${name}=${value}`)
    }
    setAttributeNS(_ns: string | null, name: string, value: string): void {
      applied.push(`setAttributeNS:${name}=${value}`)
    }
  }
  class FakeScriptElement extends FakeElement {
    override tagName = 'SCRIPT'
    _src = ''
  }
  Object.defineProperty(FakeScriptElement.prototype, 'src', {
    get(this: FakeScriptElement) {
      return this._src
    },
    set(this: FakeScriptElement, value: string) {
      this._src = value
      applied.push(`src=${value}`)
    },
    enumerable: true,
    configurable: true,
  })
  class FakeImageElement extends FakeElement {
    override tagName = 'IMG'
    src = ''
  }

  const fakeConsole = { warn: (message: string) => warnings.push(message) }
  new Function('HTMLScriptElement', 'Element', 'console', buildScriptSourceGuardRuntime())(
    FakeScriptElement,
    FakeElement,
    fakeConsole,
  )

  return {
    script: new FakeScriptElement() as unknown as FakeNode,
    image: new FakeImageElement() as unknown as FakeNode,
    applied,
    warnings,
    ElementProto: FakeElement.prototype,
    ScriptProto: FakeScriptElement.prototype,
  }
}

describe('scriptSourceGuard', () => {
  it('recusa `script.src = data:` e `blob:` e avisa no Console', () => {
    const env = runGuard()
    env.script.src = 'data:text/javascript,while(true){}'
    env.script.src = 'blob:https://exemplo.test/abc-123'
    expect(env.applied).toHaveLength(0)
    expect(env.script.src).toBe('')
    expect(env.warnings).toHaveLength(2)
  })

  it('deixa passar script legítimo e mantém o getter', () => {
    const env = runGuard()
    env.script.src = './utils.js'
    env.script.src = 'https://esm.sh/three@0.180.0'
    expect(env.script.src).toBe('https://esm.sh/three@0.180.0')
    expect(env.applied).toEqual(['src=./utils.js', 'src=https://esm.sh/three@0.180.0'])
  })

  it('normaliza maiúsculas, espaços e controles no início da URL', () => {
    for (const hostile of [
      '  data:text/javascript,1',
      'DATA:text/javascript,1',
      `${String.fromCharCode(1)}data:text/javascript,1`,
      '\n\tdata:text/javascript,1',
      '  BLOB:https://exemplo.test/x',
    ]) {
      const env = runGuard()
      env.script.src = hostile
      expect(env.applied, hostile).toHaveLength(0)
    }
  })

  it('fecha setAttribute/setAttributeNS só para <script src>', () => {
    const env = runGuard()
    env.script.setAttribute('src', 'data:text/javascript,1')
    env.script.setAttribute('SRC', 'data:text/javascript,1')
    env.script.setAttributeNS(null, 'src', 'data:text/javascript,1')
    expect(env.applied).toHaveLength(0)

    env.script.setAttribute('type', 'data:sei-la')
    env.image.setAttribute('src', 'data:image/png;base64,AAAA')
    env.script.setAttribute('src', './ok.js')
    expect(env.applied).toEqual([
      'setAttribute:type=data:sei-la',
      'setAttribute:src=data:image/png;base64,AAAA',
      'setAttribute:src=./ok.js',
    ])
  })

  it('trava os acessores e limita os avisos', () => {
    const env = runGuard()
    expect(Object.getOwnPropertyDescriptor(env.ScriptProto, 'src')?.configurable).toBe(false)
    const setAttr = Object.getOwnPropertyDescriptor(env.ElementProto, 'setAttribute')
    expect(setAttr?.configurable).toBe(false)
    expect(setAttr?.writable).toBe(false)
    expect(() => Object.defineProperty(env.ScriptProto, 'src', { value: 'livre' })).toThrow()
    for (let i = 0; i < 20; i++) env.script.src = 'data:text/javascript,1'
    expect(env.warnings).toHaveLength(3)
  })

  it('entra no documento antes do código do aluno', () => {
    const doc = buildPreviewDoc({ html: '<body></body>', css: '', js: 'console.log(1)' })
    const guardIdx = doc.indexOf('HTMLScriptElement.prototype')
    const userIdx = doc.lastIndexOf('<script src="data:text/javascript;base64,')
    expect(guardIdx).toBeGreaterThan(-1)
    expect(userIdx).toBeGreaterThan(guardIdx)
  })
})
