import { describe, expect, test } from 'bun:test'

// O seed conecta no banco ao ser importado; a copy é conferida no texto da fonte,
// como em `referral-copy.test.ts`.
const sourcePath = new URL('../scripts/seed-templates.ts', import.meta.url)

function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  if (from < 0 || to < 0) throw new Error(`trecho não encontrado: ${start} … ${end}`)
  return source.slice(from, to)
}

const source = await Bun.file(sourcePath).text()
const constants = between(source, 'const DEVICE_SETUP', '// ── Templates')
const kids = between(source, "...(['kids-welcome', 'kids-new-access'] as const)", "key: 'welcome'")
const transition = between(source, "key: 'kids-access-transition'", "key: 'welcome'")

describe('acesso infantil por aparelho nos templates (10/10/2026)', () => {
  test('a preparação usa os rótulos reais e cobre a conta que nasce sem perfil', () => {
    for (const label of [
      'Adicionar criança',
      'Acesso nos aparelhos',
      'Autorizar aparelho',
      'Quem vai entrar?',
      'Eu sou aluno',
    ]) {
      expect(constants.split(label).length - 1).toBeGreaterThanOrEqual(2) // texto e HTML
    }
    expect(constants).toContain('se ele já existir')
    expect(source).not.toContain('escolha o perfil do seu filho e abra')
    expect(source).not.toContain('Libere o computador')
    expect(source).not.toContain('O perfil da criança vocês criam juntos')
  })

  test('aviso de transição existe nos dois canais e diz o que continua guardado', () => {
    expect(source.split("key: 'kids-access-transition'").length - 1).toBe(2)
    expect(transition).toContain("channel: 'email'")
    expect(transition).toContain("channel: 'whatsapp'")
    expect(transition).toContain("variables: ['nome', 'link']")
    for (const text of [
      'sem usar a sua senha',
      'Acesso nos aparelhos',
      'Autorizar aparelho',
      'Em outro aparelho',
      'Eu sou aluno',
      'continuam guardados',
      'Abrir a área dos pais',
      'pelo link abaixo',
    ]) {
      expect(transition).toContain(text)
    }
  })

  test('boas-vindas e novo acesso Kids: botão no e-mail, link no WhatsApp', () => {
    expect(kids).toMatch(/pelo \$\{where\} abaixo/)
    expect(kids).toContain("instruction('botão')")
    expect(kids).toContain("instruction('link')")
    // O novo acesso não tem link de senha: o rodapé fala da entrada dos responsáveis.
    expect(kids).toContain('PARENT_SIGN_IN_HELP')
    expect(kids).toContain('DEVICE_ALREADY_READY')
    expect(kids).not.toContain('O acesso do seu filho está liberado')
  })

  test('presentes e Desafio levam à preparação do computador', () => {
    const welcome = between(
      source,
      "key: 'referrals-scholarship-welcome'",
      "key: 'referrals-scholarship-welcome-7d'",
    )
    expect(welcome).toContain('DEVICE_SETUP.html')
    const existing = between(
      source,
      "key: 'referrals-scholarship-existing-7d'",
      "key: 'referrals-scholarship-welcome-7d-mural'",
    )
    expect(existing).toContain('DEVICE_SETUP.html')
    expect(existing).toContain("ctaButton('Abrir a área dos pais'")
    const notStarted = between(
      source,
      "key: 'challenge-not-started'",
      "key: 'challenge-day-one-complete'",
    )
    expect(notStarted).toContain('Acesso nos aparelhos')
    expect(notStarted).toContain("ctaButton('Abrir a área dos pais'")
  })

  test('sem travessão nos textos novos', () => {
    expect(`${constants}${kids}`).not.toContain('—')
  })
})
