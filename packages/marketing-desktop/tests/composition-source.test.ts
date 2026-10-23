import { expect, test } from 'bun:test'
import { validateCompositionSource } from '../src/main/media/composition-source'

const assetId = '1481c4af-9ae6-4cdd-a405-3b58d22da102'
const source = `import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
export default function GeneratedComposition(props) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const opacity = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const positions = [0, 1, 2];
  return <AbsoluteFill style={{backgroundColor: props.background}}>
    <Img src={props.assets['${assetId}']} style={{width: config.width, height: config.height, objectFit: 'cover'}} />
    {positions.map((item, index) => <div key={index} style={{position: 'absolute', left: item * 100, top: 40, opacity, color: props.accent}}>{props.title}</div>)}
    <div style={{position: 'absolute', bottom: 40, fontSize: 30, color: '#ffffff'}}>{props.body}</div>
  </AbsoluteFill>;
}`
const component = (body: string) =>
  `export default function GeneratedComposition(props) { ${body} }`

test('aceita TSX visual puro e registra somente imagens autorizadas usadas', () => {
  expect(validateCompositionSource(source, [assetId, crypto.randomUUID()])).toMatchObject({
    source,
    assetIds: [assetId],
  })
  expect(validateCompositionSource(source, [assetId]).javascript).toContain(
    'exports.default = GeneratedComposition',
  )
  expect(
    validateCompositionSource(component('return <div>{Math.round(4.3)}</div>'), []).assetIds,
  ).toEqual([])
  expect(
    validateCompositionSource(
      component(
        'return <div style={{display:"flex",flexShrink:0,flexGrow:1,flexBasis:40,flexWrap:"wrap",alignSelf:"center",rowGap:8,columnGap:12}}/>',
      ),
      [],
    ).javascript,
  ).toContain('flexShrink: 0')
})

test('recusa código com acesso ao ambiente, recursos externos e escapes de protótipo', () => {
  const unsafe = [
    "import fs from 'node:fs'; export default function GeneratedComposition(props) { return <div/>; }",
    "import {useEffect} from 'react'; export default function GeneratedComposition(props) { return <div/>; }",
    component("return <div>{fetch('https://example.com')}</div>"),
    component("return <div>{props['con' + 'structor']}</div>"),
    component("return <div>{props['constructor']}</div>"),
    component("return <div>{props['con\\u0073tructor']}</div>"),
    component("const value = {'__pro\\u0074o__': props}; return <div/>"),
    component('return <div>{props.constructor}</div>'),
    component('return <div>{Math.random()}</div>'),
    component("return <iframe src='https://example.com'/>"),
    component("return <div style={{backgroundImage: 'url(https://example.com)'}}/>"),
    component('return <div dangerouslySetInnerHTML={props}/>'),
    component('return <div {...props}/>'),
    component('return <div onClick={props.title}/>'),
    component('return <script/>'),
    component('return <GeneratedComposition/>'),
    component('const value = new Function(props.body); return <div/>'),
    component("const value = import('node:fs'); return <div/>"),
    component('return <div>{process.env}</div>'),
    component('return <div>{window.top}</div>'),
  ]
  for (const value of unsafe) expect(() => validateCompositionSource(value, [assetId])).toThrow()
  expect(() =>
    validateCompositionSource(
      source.replace(`props.assets['${assetId}']`, "'https://example.com/x.png'"),
      [assetId],
    ),
  ).toThrow('imagens devem referenciar')
  expect(() => validateCompositionSource(source, [])).toThrow('mídia autorizada')
})

test('limita trabalho e exclui mutação, laços, recursão e estilo dinâmico não validado', () => {
  for (const value of [
    component('while(true) {} return <div/>'),
    component('let value = 0; value++; return <div/>'),
    component('props.title = "mudança"; return <div/>'),
    component('return GeneratedComposition(props)'),
    component('const style = {color: props.accent}; return <div style={style}/>'),
    component(
      `const items = [${Array.from({ length: 33 }, (_, index) => index).join(',')}]; return <div/>`,
    ),
    component(
      'const items = [1]; return <div>{items.map((one) => items.map((two) => items.map((three) => three)))}</div>',
    ),
    component('return <div>{unknown}</div>'),
    source.replace('function GeneratedComposition', 'function* GeneratedComposition'),
    source.replace('function GeneratedComposition', 'async function GeneratedComposition'),
  ])
    expect(() => validateCompositionSource(value, [assetId])).toThrow()
  expect(() => validateCompositionSource('a'.repeat(32001), [])).toThrow('32 KB')
  expect(() =>
    validateCompositionSource(
      'export default function GeneratedComposition(props) { return <div>',
      [],
    ),
  ).toThrow()
})
