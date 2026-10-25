import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { parseJS } from '../../../parsers/js'

describe('Ponte da campanha — funções que exigem preservar modificadores', () => {
  for (const method of ['onFixedUpdate', 'onCampaignEvent']) {
    it(`${method}: o callback nomeado reconstruído conserva sua própria identidade`, () => {
      const source = `SZGameKit.${method}(${method === 'onCampaignEvent' ? '"coleta", ' : ''}function volta() { return volta; });`
      const ir = parseJS(source)
      expect(
        ir.some((node) => node.type === 'gk:onFixedUpdate' || node.type === 'gk:onCampaignEvent'),
      ).toBe(false)
      const registered: Array<() => unknown> = []
      new Function('SZGameKit', compileStatements(ir, 0))({
        onFixedUpdate: (callback: () => unknown) => registered.push(callback),
        onCampaignEvent: (_event: string, callback: () => unknown) => registered.push(callback),
      })
      expect(registered).toHaveLength(1)
      const callback = registered[0]
      if (!callback) throw new Error('Callback ausente da reconstrução')
      expect(callback()).toBe(callback)
    })
  }

  for (const callback of [
    'async function (dt, passo) { console.log(passo); }',
    'async (dt, passo) => { console.log(passo); }',
    'function* (dt, passo) { console.log(passo); }',
    'async function* (dt, passo) { console.log(passo); }',
  ]) {
    for (const call of [
      `SZGameKit.onFixedUpdate(${callback});`,
      `SZGameKit.onCampaignEvent("coleta", ${callback});`,
    ]) {
      it(`preserva ${call}`, () => {
        const ir = parseJS(call)
        expect(ir.some((node) => node.type === 'gk:onFixedUpdate')).toBe(false)
        expect(ir.some((node) => node.type === 'gk:onCampaignEvent')).toBe(false)
        const generated = compileStatements(ir, 0)
        if (callback.startsWith('async')) expect(generated).toContain('async')
        if (callback.includes('function*')) expect(generated).toMatch(/function\s*\*/)
        expect(generated).toContain('console.log(passo)')
        expect(parseJS(generated)).toEqual(ir)
      })
    }
  }

  it('continua convertendo o callback síncrono que os blocos representam', () => {
    expect(
      parseJS('SZGameKit.onFixedUpdate((dt, passo) => { console.log(passo); });')[0]?.type,
    ).toBe('gk:onFixedUpdate')
    expect(
      parseJS('SZGameKit.onCampaignEvent("coleta", () => { console.log("pegou"); });')[0]?.type,
    ).toBe('gk:onCampaignEvent')
  })
})
