import type { CreateTemplateInput } from '../src/domain/template/template.aggregate'

interface EmailBlocks {
  emailLayout(input: {
    preheader: string
    title: string
    content: string
    footerNote: string
  }): string
  p(html: string): string
  ctaButton(label: string, href: string): string
  fallbackLink(href: string): string
}

/** Pure seed source. Rendering and persistence keep using the canonical email stack. */
export function subscriptionRecoveryTemplates(
  blocks: EmailBlocks,
): Array<Omit<CreateTemplateInput, 'id' | 'now'>> {
  return (['kids', 'adult'] as const).flatMap((audience) => {
    const product = audience === 'kids' ? 'Comunidade Kids' : 'Comunidade Adulta'
    const owner =
      audience === 'kids' ? 'da assinatura que dá acesso à criança' : 'da sua assinatura'
    const footerNote =
      audience === 'kids'
        ? 'Você recebe este aviso como responsável pela assinatura no Sistema Zero.'
        : 'Você recebe este aviso sobre sua assinatura no Sistema Zero.'
    const details = [
      {
        purpose: 'initial',
        name: 'Aviso inicial',
        subject: 'Precisamos conferir a renovação de {{produto}}',
        title: 'A renovação não foi confirmada',
        paragraphs: [
          'Olá, {{nome}}. A cobrança de <strong>{{valor}}</strong> referente a <strong>{{produto}}</strong> não foi aprovada.',
          `Confira o pagamento ${owner}. O prazo para regularizar é de <strong>{{dias}} dias a partir deste aviso</strong>. Se o pagamento continuar sem confirmação ao fim do prazo, encerraremos as próximas renovações desta assinatura.`,
          'Esse prazo não amplia o período de acesso já pago. Na sua conta, você pode consultar a assinatura, atualizar o cartão ou solicitar o cancelamento.',
          'Abrir este link não autoriza uma cobrança. Uma tentativa de pagamento pelo painel exige sua confirmação; atualizar somente o cartão vale para as próximas renovações.',
        ],
        variables: ['nome', 'produto', 'valor', 'dias', 'link'],
        button: 'Conferir assinatura',
      },
      {
        purpose: 'reminder',
        name: 'Lembrete',
        subject: 'Lembrete sobre a renovação de {{produto}}',
        title: 'O prazo de regularização está chegando',
        paragraphs: [
          'Olá, {{nome}}. Ainda não confirmamos o pagamento de <strong>{{valor}}</strong> referente a <strong>{{produto}}</strong>.',
          `O prazo para regularizar termina em <strong>{{prazo}} (horário de Brasília)</strong>. Se continuar sem confirmação, encerraremos as próximas renovações ${owner}.`,
          'Você pode conferir a situação ou solicitar o cancelamento na sua conta. Não cobramos os meses recusados em bloco. Atualizar somente o cartão não quita uma cobrança anterior.',
        ],
        variables: ['nome', 'produto', 'valor', 'prazo', 'link'],
        button: 'Conferir regularização',
      },
      {
        purpose: 'recovered',
        name: 'Pagamento confirmado',
        subject: 'Pagamento de {{produto}} confirmado',
        title: 'O pagamento foi confirmado',
        paragraphs: [
          'Olá, {{nome}}. Confirmamos o pagamento de <strong>{{valor}}</strong> referente a <strong>{{produto}}</strong>.',
          `O acompanhamento dessa cobrança ${owner} foi encerrado. Consulte na conta o período correspondente ao pagamento e a situação da assinatura.`,
          'O histórico dos pagamentos permanece disponível. Se houver outra pendência, ela aparecerá separadamente na conta.',
        ],
        variables: ['nome', 'produto', 'valor', 'link'],
        button: 'Ver assinatura e período',
      },
      {
        purpose: 'canceled',
        name: 'Recorrência encerrada',
        subject: 'Recorrência de {{produto}} encerrada',
        title: 'As próximas renovações foram encerradas',
        paragraphs: [
          `Olá, {{nome}}. Confirmamos o encerramento da recorrência ${owner}, referente a <strong>{{produto}}</strong>.`,
          'Não serão geradas novas renovações desta assinatura. O encerramento não altera o período que já foi pago. Consulte a validade atual na conta, respeitando outros acessos que você tenha.',
          'O histórico, os projetos e as conquistas permanecem preservados. Para voltar depois, será necessária uma nova contratação.',
        ],
        variables: ['nome', 'produto', 'link'],
        button: 'Ver situação da conta',
      },
    ]
    return details.map((detail) => ({
      key: `recovery-${audience}-${detail.purpose}`,
      channel: 'email',
      name: `${detail.name} — ${product}`,
      subject: detail.subject,
      variables: detail.variables,
      body: blocks.emailLayout({
        preheader: detail.title,
        title: detail.title,
        footerNote,
        content: [
          ...detail.paragraphs.map(blocks.p),
          blocks.ctaButton(detail.button, '{{link}}'),
          blocks.fallbackLink('{{link}}'),
        ].join('\n'),
      }),
    }))
  })
}
