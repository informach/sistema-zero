import { describe, expect, test } from 'bun:test'

const sourcePath = new URL('../scripts/seed-templates.ts', import.meta.url)

test('templates de indicação prometem o novo curso sem falsificar resgates históricos', async () => {
  const source = await Bun.file(sourcePath).text()
  const referralTemplates = source.slice(
    source.indexOf("key: 'referrals-ambassador-link'"),
    source.indexOf("key: 'referrals-bonus-eligible'"),
  )
  expect(referralTemplates).toContain('Cadê Todo Mundo?')
  expect(referralTemplates).not.toContain('Desafio do Primeiro Jogo')
  expect(referralTemplates).not.toContain('vitalício')

  const invite = referralTemplates.slice(
    referralTemplates.indexOf("key: 'referrals-scholarship-invite'"),
    referralTemplates.indexOf("key: 'referrals-scholarship-welcome'"),
  )
  expect(invite).toContain('9 a 14 anos')
  expect(invite).toContain('Não pedimos cartão')
  expect(invite).toContain('este curso e a participação no Mural')
  expect(invite).toContain('publicar o jogo do curso, comentar e reagir')
  expect(invite).toContain('7 dias')
  expect(invite).toContain('cadastro')
  expect(invite).toContain('Mural dos Criadores')

  const welcome = referralTemplates.slice(
    referralTemplates.indexOf("key: 'referrals-scholarship-welcome'"),
    referralTemplates.indexOf("key: 'referrals-scholarship-welcome-7d'"),
  )
  expect(welcome).not.toContain('Cadê Todo Mundo?')
  expect(welcome).not.toContain('Desafio do Primeiro Jogo')

  const newWelcome = referralTemplates.slice(
    referralTemplates.indexOf("key: 'referrals-scholarship-welcome-7d'"),
    referralTemplates.indexOf("key: 'referrals-scholarship-existing-7d'"),
  )
  expect(newWelcome).toContain('7 dias')
  expect(newWelcome).toContain('cadastro')
  expect(newWelcome).not.toContain('Mural dos Criadores')

  const existingWelcome = referralTemplates.slice(
    referralTemplates.indexOf("key: 'referrals-scholarship-existing-7d'"),
    referralTemplates.indexOf("key: 'referrals-scholarship-welcome-7d-mural'"),
  )
  expect(existingWelcome).toContain('7 dias')
  expect(existingWelcome).not.toContain('Mural dos Criadores')

  const visitorWelcome = referralTemplates.slice(
    referralTemplates.indexOf("key: 'referrals-scholarship-welcome-7d-mural'"),
  )
  expect(visitorWelcome).toContain("key: 'referrals-scholarship-existing-7d-mural'")
  expect(visitorWelcome).toContain('Mural dos Criadores')
  expect(visitorWelcome).toContain('enquanto a conta existir')
  for (const key of [
    'referrals-scholarship-welcome-mural-trial',
    'referrals-scholarship-existing-mural-trial',
    'referrals-campaign-welcome-mural-trial',
    'referrals-campaign-existing-mural-trial',
  ]) {
    expect(source).toContain(`key: '${key}'`)
  }
  expect(source).toContain('A aula 2 ensina como publicar')
  expect(source).toContain(
    'O link do jogo publicado continua funcionando enquanto a publicação estiver disponível',
  )

  const existingAccountEmail = source.slice(
    source.indexOf("key: 'new-access'"),
    source.indexOf("key: 'password-reset'"),
  )
  expect(existingAccountEmail).not.toContain('Sua compra foi confirmada')
})

test('deploy da mensageria semeia as novas versões antes dos envios', async () => {
  const railway = (await Bun.file(
    new URL('../../../.railway/services/messaging.json', import.meta.url),
  ).json()) as {
    deploy: { preDeployCommand: string[] }
  }
  const manifest = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as {
    scripts: Record<string, string>
  }
  expect(railway.deploy.preDeployCommand).toContain(
    'bun run --filter @sistemazero/messaging db:deploy',
  )
  expect(manifest.scripts['db:deploy']).toContain('db:migrate')
  expect(manifest.scripts['db:deploy']).toContain('templates:seed')
})

describe('presente adulto (20/10/2026)', () => {
  const ADULT_KEYS = {
    'referrals-scholarship-invite-adult': ['nome', 'indicador', 'link'],
    'referrals-scholarship-welcome-adult': ['nome', 'indicador', 'validade', 'link'],
    'referrals-scholarship-existing-adult': ['nome', 'indicador', 'validade', 'link'],
    'referrals-campaign-welcome-adult': ['nome', 'campanha', 'validade', 'link'],
    'referrals-campaign-existing-adult': ['nome', 'campanha', 'validade', 'link'],
  } as const

  async function adultSection() {
    const source = await Bun.file(sourcePath).text()
    const start = source.indexOf("key: 'referrals-scholarship-invite-adult'")
    const end = source.indexOf("key: 'referrals-bonus-eligible'")
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    // O trecho que o mapa das boas-vindas interpola (`ADULT_GIFT`, `adultGiftOrigin`).
    const shared = source.slice(
      source.indexOf('const ADULT_GIFT ='),
      source.indexOf('// ── Templates'),
    )
    return { source, section: `${shared}\n${source.slice(start, end)}` }
  }

  /** O texto que a pessoa lê: strings entre aspas simples, sem as chaves do código. */
  function readable(section: string): string {
    return [...section.matchAll(/'([^'\n]*)'/g)]
      .map((match) => match[1] ?? '')
      .filter((text) => !/^[a-z0-9-]+$/.test(text))
      .join('\n')
  }

  test('cada chave existe uma vez, só em e-mail, com o contrato de variáveis', async () => {
    const { source, section } = await adultSection()
    for (const [key, variables] of Object.entries(ADULT_KEYS)) {
      expect(source.split(`key: '${key}'`).length - 1).toBe(1)
      for (const name of variables) expect(section).toContain(`{{${name}}}`)
    }
    expect(section).toContain("variables: ['nome', 'indicador', 'link']")
    expect(section).toContain("['nome', 'indicador', 'validade', 'link']")
    expect(section).toContain("['nome', 'campanha', 'validade', 'link']")
    expect(section).not.toContain("channel: 'whatsapp'")
  })

  test('copy do Canvas aprovado', async () => {
    const { section } = await adultSection()
    for (const text of [
      "subject: '{{indicador}} deu a você 7 dias para fazer o seu primeiro jogo'",
      'o jardim e os personagens já estão prontos, e você monta as regras que fazem o jogo responder, no navegador do computador.',
      'O presente não pede cartão e não cria assinatura. Os 7 dias começam no cadastro.',
      "ctaButton('Ver o meu presente', '{{link}}')",
      'Seu curso e o Mural adulto estão liberados, {{nome}}',
      'Um presente novo na sua conta, {{nome}}',
      'na versão adulta, e o <strong>Mural adulto</strong>, até <strong>{{validade}} (horário de Brasília)</strong>.',
      'Uma das aulas mostra como publicar o jogo no Mural.',
      'Entre com o e-mail e a senha que você já usa e abra o curso no navegador do computador.',
      "'Criar minha senha'",
      "'Abrir meus cursos'",
    ])
      expect(section).toContain(text)
  })

  test('Light Copy: sem exclamação, travessão, pergunta, emoji ou palavras vetadas', async () => {
    const { section } = await adultSection()
    const text = readable(section)
    expect(text).toContain('Cadê Todo Mundo')
    expect(text).not.toMatch(/[!?—–]/)
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(text).not.toMatch(/\bIA\b/)
    expect(text).not.toMatch(/não é [^.]*\. É /)
    for (const banned of ['carreira', 'mesmo que', 'sem precisar', 'em preparação', 'criança'])
      expect(text.toLowerCase()).not.toContain(banned)
  })
})

describe('e-mails do embaixador cobrem os dois presentes (20/10/2026)', () => {
  async function block(key: string) {
    const source = await Bun.file(sourcePath).text()
    const start = source.indexOf(`key: '${key}'`)
    expect(start).toBeGreaterThan(0)
    const next = source.indexOf('key: ', start + 6)
    return source.slice(start, next < 0 ? undefined : next)
  }

  /** O texto que a pessoa lê, fora o nome oficial do curso Kids (que termina em "?"). */
  function readable(section: string): string {
    return [...section.matchAll(/'([^'\n]*)'/g)]
      .map((match) => (match[1] ?? '').replaceAll('Cadê Todo Mundo?', 'Cadê Todo Mundo'))
      .filter((text) => !/^[a-z0-9-]+$/.test(text))
      .join('\n')
  }

  test('a página do embaixador apresenta o presente Kids e o adulto', async () => {
    const text = readable(await block('referrals-ambassador-link'))
    expect(text).toContain('dois presentes')
    expect(text).toContain('para crianças, com o cadastro feito pelo responsável')
    expect(text).toContain('a versão adulta do curso para adultos')
    expect(text).toContain('um link para cada presente')
  })

  test('o bônus não presume que quem assinou é uma família', async () => {
    const text = readable(await block('referrals-bonus-eligible'))
    expect(text).toContain('Uma pessoa que recebeu o presente pelo seu link')
    expect(text).not.toMatch(/família|bolsa/i)
  })

  test('Light Copy nos dois', async () => {
    for (const key of ['referrals-ambassador-link', 'referrals-bonus-eligible']) {
      const section = await block(key)
      expect(section).toContain("variables: ['nome', ")
      const text = readable(section)
      expect(text).not.toMatch(/[!?—–]/)
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(text).not.toMatch(/\bIA\b/)
      expect(text).not.toMatch(/não é [^.]*\. É /)
      for (const banned of ['carreira', 'mesmo que', 'sem precisar', 'em preparação'])
        expect(text.toLowerCase()).not.toContain(banned)
    }
  })
})
