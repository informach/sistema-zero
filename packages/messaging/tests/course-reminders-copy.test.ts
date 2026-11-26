import { describe, expect, test } from 'bun:test'

// Lembretes do curso (25/11/2026), enviados pelo members. A copy é conferida no texto da fonte
// (o seed conecta no banco ao ser importado).
const source = await Bun.file(new URL('../scripts/seed-templates.ts', import.meta.url)).text()

function block(key: string): string {
  const start = source.indexOf(`key: '${key}'`)
  if (start < 0) throw new Error(`template ausente: ${key}`)
  const next = source.indexOf('key: ', start + 6)
  return source.slice(start, next < 0 ? undefined : next)
}

function readable(key: string): string {
  return [...block(key).matchAll(/'([^'\n]*)'/g)].map((match) => match[1]).join('\n')
}

const CONTRACTS = {
  'course-not-started': ['nome', 'curso', 'link'],
  'course-not-started-adult': ['nome', 'curso', 'link'],
  'course-stalled': ['nome', 'curso', 'link'],
  'course-stalled-adult': ['nome', 'curso', 'link'],
  'course-completed': ['nome', 'curso', 'link', 'comunidade'],
  'course-completed-adult': ['nome', 'curso', 'link', 'comunidade'],
  'course-not-started-vilao-em-aliado': ['nome', 'link'],
  'course-stalled-vilao-em-aliado': ['nome', 'link'],
  'course-completed-vilao-em-aliado': ['nome', 'link', 'comunidade'],
  'course-not-started-pais': ['nome', 'curso', 'link'],
  'course-stalled-pais': ['nome', 'curso', 'link'],
  'course-completed-pais': ['nome', 'curso', 'link', 'comunidade'],
  'course-not-started-autismo-frustracoes': ['nome', 'link'],
  'course-stalled-autismo-frustracoes': ['nome', 'link'],
  'course-completed-autismo-frustracoes': ['nome', 'link', 'comunidade'],
} as const

describe('lembretes do curso', () => {
  test('cada template existe uma vez, só em e-mail, com o contrato de variáveis', () => {
    for (const [key, variables] of Object.entries(CONTRACTS)) {
      expect(source.split(`key: '${key}'`).length - 1).toBe(1)
      expect(block(key)).toContain("channel: 'email'")
      expect(block(key)).toContain(
        `variables: [${variables.map((name) => `'${name}'`).join(', ')}]`,
      )
      for (const name of variables) expect(block(key)).toContain(`{{${name}}}`)
    }
  })

  test('botões e a Comunidade só na conclusão', () => {
    expect(block('course-not-started')).toContain("ctaButton('Começar o curso', '{{link}}')")
    expect(block('course-stalled')).toContain("ctaButton('Continuar o curso', '{{link}}')")
    for (const key of ['course-completed', 'course-completed-adult'])
      expect(block(key)).toContain("ctaButton('Conhecer a Comunidade', '{{comunidade}}')")
    for (const key of [
      'course-not-started',
      'course-not-started-adult',
      'course-stalled',
      'course-stalled-adult',
    ])
      expect(readable(key)).not.toContain('Comunidade')
  })

  test('o adulto fala com a própria pessoa; nada de prazo nem de acesso vitalício', () => {
    for (const key of [
      'course-not-started-adult',
      'course-stalled-adult',
      'course-completed-adult',
    ])
      expect(readable(key)).not.toMatch(/criança|filho|responsável/i)
    for (const key of Object.keys(CONTRACTS))
      expect(readable(key)).not.toMatch(/vitalíc|sem prazo|prazo|termina em|dias de acesso/i)
  })

  test('Light Copy: sem exclamação, travessão, pergunta, emoji ou palavras vetadas', () => {
    for (const key of Object.keys(CONTRACTS)) {
      const text = readable(key)
      expect(text).not.toMatch(/[!?—–]/)
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
      for (const banned of ['carreira', 'mesmo que', 'sem precisar', 'não é '])
        expect(text.toLowerCase()).not.toContain(banned)
    }
  })

  test('cursos para pais: falam com o responsável sobre o curso dele, nunca da criança criando no curso', () => {
    for (const key of [
      'course-not-started-vilao-em-aliado',
      'course-stalled-vilao-em-aliado',
      'course-not-started-pais',
      'course-stalled-pais',
    ]) {
      expect(readable(key)).toContain('área dos pais')
      expect(readable(key)).not.toMatch(/Comunidade|criança|criando jogos/)
    }
    // O guia nomeia o próprio conteúdo; o presente do fim do guia continua surpresa.
    for (const key of [
      'course-not-started-vilao-em-aliado',
      'course-stalled-vilao-em-aliado',
      'course-completed-vilao-em-aliado',
    ]) {
      expect(readable(key)).not.toMatch(/presente|Cadê/i)
    }
    expect(readable('course-not-started-vilao-em-aliado')).toContain('Helena')
  })

  test('curso da Vivianne: fala do conteúdo dele com o responsável, sem prometer o fim das crises', () => {
    for (const key of [
      'course-not-started-autismo-frustracoes',
      'course-stalled-autismo-frustracoes',
    ]) {
      expect(readable(key)).toContain('área dos pais')
      expect(readable(key)).not.toMatch(/Comunidade|criança|criando jogos/)
    }
    for (const key of [
      'course-not-started-autismo-frustracoes',
      'course-stalled-autismo-frustracoes',
      'course-completed-autismo-frustracoes',
    ]) {
      expect(readable(key)).toContain('Como ajudar seu filho autista')
      expect(readable(key)).not.toMatch(/acabar com|nunca mais|sem crises|cura/i)
    }
    expect(readable('course-not-started-autismo-frustracoes')).toContain('Vivianne Lima')
    expect(block('course-completed-autismo-frustracoes')).toContain(
      "ctaButton('Conhecer a Comunidade', '{{comunidade}}')",
    )
  })
})
