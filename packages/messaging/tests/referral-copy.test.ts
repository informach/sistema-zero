import { expect, test } from 'bun:test'

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
  expect(invite).toContain('8 a 15 anos')
  expect(invite).toContain('Não pedimos cartão')
  expect(invite).toContain('apenas este curso')
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

  const existingAccountEmail = source.slice(
    source.indexOf("key: 'new-access'"),
    source.indexOf("key: 'password-reset'"),
  )
  expect(existingAccountEmail).not.toContain('Sua compra foi confirmada')
})

test('deploy da mensageria semeia as novas versões antes dos envios', async () => {
  const railway = (await Bun.file(new URL('../railway.json', import.meta.url)).json()) as {
    deploy: { preDeployCommand: string }
  }
  const manifest = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as {
    scripts: Record<string, string>
  }
  expect(railway.deploy.preDeployCommand).toContain('db:deploy')
  expect(manifest.scripts['db:deploy']).toContain('db:migrate')
  expect(manifest.scripts['db:deploy']).toContain('templates:seed')
})
