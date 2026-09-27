import { writeFileSync } from 'node:fs'
import { normalizeSZIR, SZIRV2Schema } from '../src/ir'
import { NUMEROS_SOURCE, QUIZ_SOURCE } from '../src/official-extensions/game-2d/__gen_textGames'
import { parseJS } from '../src/parsers/js'

const samples = [
  {
    name: 'Chuva de números',
    symbol: 'numberRainExample',
    description:
      'Colete 10 números pares e desvie dos ímpares. Use as setas ou o dedo para mover a cesta. Enter ou toque no botão para começar e jogar de novo.',
    source: NUMEROS_SOURCE,
  },
  {
    name: 'Quiz de números',
    symbol: 'textQuizExample',
    description:
      'Use as teclas 1, 2 ou 3 ou toque na resposta correta. Cada alternativa é um sprite criado de uma lista. Enter avança após responder e reinicia ao terminar.',
    source: QUIZ_SOURCE,
  },
]
let output =
  "import type { ExtensionExample } from '#extensions'\nimport { beginnerGameExample } from './shared'\n\n"
for (const sample of samples) {
  const statements = parseJS(sample.source)
  const raw = JSON.stringify(statements)
  if (raw.includes('"rawJS"') || raw.includes('"memberCall"')) {
    const visit = (v: unknown): void => {
      if (!v || typeof v !== 'object') return
      if ('type' in v && (v.type === 'rawJS' || v.type === 'memberCall'))
        console.log(JSON.stringify(v))
      else for (const child of Object.values(v)) visit(child)
    }
    visit(statements)
    throw new Error(`${sample.name}: código sem bloco`)
  }
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: statements,
    extensions: [{ extensionId: 'game-2d' }],
  })
  const checked = SZIRV2Schema.safeParse(ir)
  if (!checked.success) {
    console.log(checked.error.issues)
    throw new Error(`${sample.name}: IR inválida`)
  }
  const example = {
    name: sample.name,
    experience: 'game',
    description: sample.description,
    ir: {
      ...ir,
      html: [{ type: 'canvas', id: 'tela', width: 600, height: 400 }],
      css: [
        { selector: 'body', declarations: { margin: '0', background: '#102030' } },
        { selector: 'canvas', declarations: { background: '#102030' } },
      ],
    },
  }
  output += `export const ${sample.symbol}: ExtensionExample = beginnerGameExample(${JSON.stringify(example, null, 2)})\n\n`
}
writeFileSync(
  new URL('../src/official-extensions/game-2d/examples/textGames.ts', import.meta.url),
  output,
)
console.log('Dois exemplos gerados sem código avançado')
