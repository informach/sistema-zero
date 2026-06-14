import { describe, expect, it } from 'bun:test'
import { defaultMinifiers, identityMinifiers, minifyHtml } from '../minify'

describe('identityMinifiers', () => {
  it('passa o conteudo intacto', async () => {
    expect(await identityMinifiers.js('const  a = 1')).toBe('const  a = 1')
    expect(await identityMinifiers.css('a {  color : red ; }')).toBe('a {  color : red ; }')
    expect(identityMinifiers.html('<p>  oi  </p>')).toBe('<p>  oi  </p>')
  })
})

describe('minifyHtml', () => {
  it('apara espaco no fim das linhas e colapsa linhas em branco, sem mexer entre tags', () => {
    const out = minifyHtml('<a>x</a>   \n\n\n\n<b>y</b>   ')
    expect(out).toBe('<a>x</a>\n\n<b>y</b>')
    // nao colapsa o espaco SIGNIFICATIVO entre elementos inline
    expect(minifyHtml('<a>x</a> <b>y</b>')).toBe('<a>x</a> <b>y</b>')
  })
})

describe('defaultMinifiers', () => {
  it('minifica JS e CSS de verdade (terser + csso)', async () => {
    const m = await defaultMinifiers()
    const js = await m.js('function soma(primeiro, segundo) { return primeiro + segundo }')
    expect(js.length).toBeLessThan(
      'function soma(primeiro, segundo) { return primeiro + segundo }'.length,
    )
    const css = await m.css('a {  color:  red ;  }')
    expect(css).toBe('a{color:red}')
  })

  it('JS invalido nao quebra: devolve o original', async () => {
    const m = await defaultMinifiers()
    const broken = 'function ( { quebrado'
    expect(await m.js(broken)).toBe(broken)
  })
})
