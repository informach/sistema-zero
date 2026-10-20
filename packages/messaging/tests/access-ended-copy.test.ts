import { describe, expect, test } from 'bun:test'

// O seed conecta no banco ao ser importado; a copy é conferida no texto da fonte,
// como em `kids-access-copy.test.ts`.
const source = await Bun.file(new URL('../scripts/seed-templates.ts', import.meta.url)).text()

function block(key: string): string {
  const start = source.indexOf(`key: '${key}'`)
  if (start < 0) throw new Error(`template ausente: ${key}`)
  const next = source.indexOf('key: ', start + 6)
  return source.slice(start, next < 0 ? undefined : next)
}

/** O texto que a pessoa lê: strings entre aspas simples, sem as chaves/URLs do código. */
function readable(key: string): string {
  return [...block(key).matchAll(/'([^'\n]*)'/g)].map((match) => match[1]).join('\n')
}

const CONTRACTS = {
  'gift-expiry-2d': ['nome', 'data', 'link'],
  'gift-expired': ['nome', 'link'],
  // Presente adulto (20/10/2026): o members manda as MESMAS variáveis do Kids.
  'gift-expiry-2d-adult': ['nome', 'data', 'link'],
  'gift-expired-adult': ['nome', 'link'],
  'subscription-ended-kids': ['nome', 'link'],
  'subscription-ended-adult': ['nome', 'link'],
  'profile-turned-18': ['nome', 'nome_perfil', 'link'],
} as const

describe('fim do acesso e perfil que fez 18 anos (20/10/2026)', () => {
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

  test('assuntos, textos aprovados e botões', () => {
    const expectations: Record<keyof typeof CONTRACTS, string[]> = {
      // O presente é um curso + o Mural por tempo limitado, nunca a assinatura da Comunidade.
      'gift-expiry-2d': [
        "subject: '{{nome}}, o presente do curso termina em {{data}}'",
        'O acesso de presente ao curso e ao Mural termina em <strong>{{data}}</strong>.',
        'O perfil, os projetos e os jogos publicados continuam guardados na conta. Para seguir com os próximos cursos no mesmo perfil, use o mesmo e-mail na assinatura.',
        'Ver como continuar',
      ],
      'gift-expired': [
        "subject: 'O presente do curso terminou, {{nome}}'",
        'O que foi feito continua na conta: o perfil da criança, os projetos e os jogos publicados no Mural.',
        'Com a assinatura, a criança segue de onde parou e continua nos próximos cursos.',
        'Ver como continuar',
      ],
      // Copy do Canvas aprovado (presente adulto, quadro E-mails).
      'gift-expiry-2d-adult': [
        "subject: '{{nome}}, o presente de 7 dias termina em {{data}}'",
        'O acesso de presente ao <strong>Cadê Todo Mundo</strong> e ao <strong>Mural adulto</strong> termina em <strong>{{data}}</strong>.',
        'Se ainda falta uma parte do jogo, estes dois dias servem para terminar e publicar. Depois do fim, os seus projetos continuam guardados na conta. Para seguir com os próximos cursos, a assinatura usa este mesmo e-mail.',
        'Ver como continuar na Comunidade',
      ],
      'gift-expired-adult': [
        "subject: 'O presente de 7 dias terminou, {{nome}}'",
        'O que você fez continua na conta: os projetos e o progresso no curso.',
        'Com a assinatura da Comunidade dos Criadores, você segue de onde parou, com os próximos cursos, o Estúdio e o Mural. São 7 etapas, e cada uma põe ferramentas novas no seu Estúdio.',
        'Ver como continuar',
        '7 dias de garantia na assinatura. Cancele quando quiser.',
      ],
      'subscription-ended-kids': [
        "subject: 'A assinatura da Comunidade terminou, {{nome}}'",
        'O perfil, o posto da Jornada, os projetos guardados, os certificados e os jogos publicados continuam na conta.',
        'Quando quiser voltar, a assinatura nova começa no dia em que o pagamento é aprovado e a criança segue de onde parou.',
        'Ver como voltar',
      ],
      'subscription-ended-adult': [
        "subject: 'A sua assinatura da Comunidade terminou, {{nome}}'",
        'Os projetos em Meus Jogos, os jogos publicados no Mural, os certificados e o progresso nos cursos continuam na sua conta. A etapa que você alcançou e os blocos que liberou também ficam.',
        'Quando quiser voltar, a assinatura nova começa no dia em que o pagamento é aprovado e você segue de onde parou.',
        'Ver como voltar',
      ],
      'profile-turned-18': [
        "subject: '{{nome_perfil}} fez 18 anos'",
        'O perfil Kids continua com a sua assinatura, e agora existe também a área adulta.',
        '{{nome_perfil}} fez 18 anos, e o perfil Kids continua funcionando enquanto a sua assinatura estiver ativa.',
        'Agora {{nome_perfil}} também pode ter uma conta própria na área adulta. Ela começa nova, usa o mesmo Estúdio, e os projetos continuam no perfil Kids.',
        'Conhecer a área adulta',
      ],
    }
    for (const [key, texts] of Object.entries(expectations))
      for (const text of texts) expect(block(key)).toContain(text)
    // O link vem pronto do chamador (com as UTMs); o template não monta URL.
    for (const key of Object.keys(CONTRACTS)) expect(block(key)).toContain("ctaButton('")
    expect(block('profile-turned-18')).toContain("ctaButton('Conhecer a área adulta', '{{link}}')")
  })

  test('o presente não é chamado de assinatura nem de Comunidade', () => {
    for (const key of ['gift-expiry-2d', 'gift-expired'] as const) {
      expect(readable(key)).not.toContain('Comunidade')
      expect(readable(key)).not.toContain('presente de 7 dias termina')
    }
    expect(source).not.toContain('no dia da aprovação')
  })

  test('o presente adulto fala com a própria pessoa, sem o perfil da criança', () => {
    expect(readable('gift-expiry-2d-adult')).toContain('Cadê Todo Mundo')
    for (const key of ['gift-expiry-2d-adult', 'gift-expired-adult'] as const) {
      const text = readable(key)
      expect(text).not.toContain('Cadê Todo Mundo?')
      expect(text).not.toMatch(/criança|filho|responsável/i)
      expect(text).toMatch(/você|seus projetos/)
    }
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
})
