import { describe, expect, test } from 'bun:test'

// O seed conecta no banco ao ser importado; a copy é conferida no texto da fonte,
// como em `access-ended-copy.test.ts`.
const source = await Bun.file(new URL('../scripts/seed-templates.ts', import.meta.url)).text()

/** Os blocos da chave (um por canal), cada um até a chave seguinte. */
function blocks(key: string): string[] {
  const found: string[] = []
  let start = source.indexOf(`key: '${key}'`)
  while (start >= 0) {
    const next = source.indexOf('key: ', start + 6)
    found.push(source.slice(start, next < 0 ? undefined : next))
    start = source.indexOf(`key: '${key}'`, start + 6)
  }
  if (found.length === 0) throw new Error(`template ausente: ${key}`)
  return found
}

/** O texto que a pessoa lê: strings entre aspas simples, sem as chaves do código. */
function readable(key: string): string {
  return blocks(key)
    .flatMap((block) => [...block.matchAll(/'([^'\n]*)'/g)].map((match) => match[1]))
    .join('\n')
}

// Desafio adulto (21/10/2026): as MESMAS variáveis do equivalente Kids, menos a `orientacao` da
// confirmação (o funil só manda as quatro).
const CONTRACTS = {
  'challenge-access-approved-adult': {
    channels: ['email', 'whatsapp'],
    variables: ['nome', 'link', 'expira_em', 'acao'],
  },
  'challenge-not-activated-adult': { channels: ['email'], variables: ['nome', 'link'] },
  'challenge-not-started-adult': { channels: ['email'], variables: ['nome', 'link'] },
  'challenge-day-one-complete-adult': { channels: ['email'], variables: ['nome', 'link'] },
  'challenge-expiry-7d-adult': { channels: ['email'], variables: ['nome', 'data', 'link'] },
  'challenge-expiry-3d-adult': { channels: ['email'], variables: ['nome', 'data', 'link'] },
  'challenge-completed-adult': { channels: ['email'], variables: ['nome', 'link'] },
  'challenge-expired-adult': { channels: ['email'], variables: ['nome', 'data', 'link'] },
} as const

describe('Desafio do Primeiro Jogo para adultos (21/10/2026)', () => {
  test('cada template existe uma vez por canal, com o contrato de variáveis', () => {
    for (const [key, contract] of Object.entries(CONTRACTS)) {
      const found = blocks(key)
      expect(found.map((block) => block.match(/channel: '(\w+)'/)?.[1])).toEqual([
        ...contract.channels,
      ])
      for (const block of found) {
        expect(block).toContain(
          `variables: [${contract.variables.map((name) => `'${name}'`).join(', ')}]`,
        )
        for (const name of contract.variables) expect(block).toContain(`{{${name}}}`)
      }
    }
  })

  test('assuntos e botões', () => {
    const expectations: Record<keyof typeof CONTRACTS, string[]> = {
      'challenge-access-approved-adult': [
        "subject: '{{nome}}, o seu primeiro jogo pode começar'",
        "ctaButton('{{acao}}', '{{link}}')",
        'Não há renovação automática.',
      ],
      'challenge-not-activated-adult': ["ctaButton('Criar senha e entrar', '{{link}}')"],
      'challenge-not-started-adult': ["ctaButton('Abrir a primeira aula', '{{link}}')"],
      'challenge-day-one-complete-adult': ["ctaButton('Continuar o Desafio', '{{link}}')"],
      // O link do aviso de 7 dias é a página Seu progresso do app adulto.
      'challenge-expiry-7d-adult': [
        '<strong>Seu progresso</strong>',
        "ctaButton('Ver o meu progresso', '{{link}}')",
      ],
      'challenge-expiry-3d-adult': ["ctaButton('Continuar o Desafio', '{{link}}')"],
      'challenge-completed-adult': [
        "ctaButton('Ver o caminho depois do primeiro jogo', '{{link}}')",
        'É uma contratação separada e opcional',
      ],
      'challenge-expired-adult': [
        "subject: 'O seu acesso ao Desafio terminou, {{nome}}'",
        'Continuar como visitante não gera cobrança.',
        "ctaButton('Ver como continuar na Comunidade', '{{link}}')",
      ],
    }
    for (const [key, texts] of Object.entries(expectations))
      for (const text of texts) expect(blocks(key).join('\n')).toContain(text)
  })

  test('falam com a própria pessoa, sem criança, responsável ou Área dos pais', () => {
    for (const key of Object.keys(CONTRACTS)) {
      const text = readable(key)
      expect(text).not.toMatch(/criança|filh[oa]|responsável|Área dos pais|família|vocês/i)
      expect(text).toMatch(/(?<!\p{L})(você|sua|seu)(?!\p{L})/iu)
    }
  })

  test('Light Copy: sem exclamação, travessão, pergunta, emoji ou palavras vetadas', () => {
    for (const key of Object.keys(CONTRACTS)) {
      const text = readable(key)
      expect(text).not.toMatch(/[!?—–]/)
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
      for (const banned of ['carreira', 'mesmo que', 'sem precisar', 'em preparação', 'não é '])
        expect(text.toLowerCase()).not.toContain(banned)
    }
  })
})
