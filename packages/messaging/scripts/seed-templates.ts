/**
 * Popula/ATUALIZA os templates de mensagem (UPSERT idempotente — a key que já
 * existe tem subject/body/variables/name atualizados; `active` é preservado).
 * Uso: `bun run templates:seed`.
 *
 * O conteúdo aqui é a FONTE DA VERDADE versionada dos templates padrão — rode o
 * seed após editar. E-mails usam HTML compatível com clientes de e-mail (tabelas
 * + CSS inline; nada de flex/grid/oklch) e a logo hospedada no R2 público
 * (`EMAIL_LOGO_URL` — default aponta p/ o bucket de DEV `testes`; em produção
 * suba a mesma PNG no bucket público de prod e exporte a env antes de rodar).
 * A PNG fonte está em `assets/logo-sistema-zero.png` (gerada do
 * `community/public/logo_white.svg` — tinta #0D1117, p/ fundo claro).
 */
import { EmailSender } from '../src/domain/sender/email-sender.aggregate'
import { Template } from '../src/domain/template/template.aggregate'
import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleSenderRepository } from '../src/infrastructure/persistence/drizzle/sender.repository'
import { DrizzleTemplateRepository } from '../src/infrastructure/persistence/drizzle/template.repository'

// Logos EMBUTIDAS no e-mail (attachment inline + Content-ID, padrão do
// comunidade-sistema-zero): a imagem viaja DENTRO da mensagem — sem hospedagem
// externa, sem proxy de imagem, sem link que quebra. As PNGs (puras, sem efeito,
// geradas dos SVGs do community) vivem em `assets/` e o composition-root as
// injeta no gateway do SendGrid, que anexa só as referenciadas por `cid:`.
const LOGO_URL = 'cid:logo-sz-light' // tinta escura (tema claro)
const LOGO_DARK_URL = 'cid:logo-sz-dark' // texto claro (swap no dark desenhado)

// ── Paleta da marca (hex ≈ tokens oklch do community/admin) ───────────────────
const INK = '#0d1117' // foreground / tinta da logo
const TEXT = '#2b3036' // corpo de texto (um passo mais suave que a tinta)
const MUTED = '#5f6469' // muted-foreground
const BORDER = '#dcdee1' // border
const PAGE_BG = '#fbfaf7' // background
const BOX_BG = '#eef0f3' // secondary (caixa do código OTP)
const LINK = '#00647c' // link
const CYAN = '#42e5e0' // brand-cyan (início do gradiente CTA)
const LIME = '#bfea00' // brand-lime (fim do gradiente CTA)
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

// ── Tema DARK desenhado (hex ≈ tokens `.dark` do community) ───────────────────
// Só vale nos clientes que respeitam `prefers-color-scheme` (Apple Mail, Samsung,
// Outlook iOS/2019+). O Gmail IGNORA o media query e inverte cores por conta
// própria — p/ ele a defesa é a logo-chip e uma paleta que inverte sem quebrar.
const D_PAGE = '#05070b' // background dark
const D_CARD = '#0d1117' // card dark
const D_TEXT = '#d3d8dd' // corpo
const D_BRIGHT = '#f5f7f9' // títulos/código
const D_MUTED = '#7a8286' // muted-foreground dark
const D_BORDER = '#262c36' // bordas/divisores
const D_BOX = '#161b22' // caixa do código OTP
const D_LINK = LIME // link no dark = brand-lime (token --link do community dark)

// ── Blocos reutilizáveis (e-mail-safe: tabelas + CSS inline) ──────────────────

/** Botão "à prova de bala": tabela + bgcolor sólido (Outlook) + gradiente da marca. */
function ctaButton(label: string, href: string): string {
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto;">
  <tr>
    <td align="center" bgcolor="${CYAN}" class="btn" style="border-radius:10px;background:${CYAN};background-image:linear-gradient(90deg,${CYAN},${LIME});">
      <a href="${href}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${INK};text-decoration:none;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>`
}

/** Linha de fallback do CTA (clientes que bloqueiam botão/imagens). */
function fallbackLink(href: string): string {
  return `
<p class="mut" style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">
  Se o botão não funcionar, copie e cole este endereço no navegador:
</p>
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;">
  <a href="${href}" target="_blank" class="lnk" style="color:${LINK};text-decoration:underline;">${href}</a>
</p>`
}

/** Caixa de destaque do código OTP (mono, espaçado, alto contraste). */
function codeBox(code: string): string {
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;">
  <tr>
    <td align="center" bgcolor="${BOX_BG}" class="codebox" style="background:${BOX_BG};border:1px solid ${BORDER};border-radius:12px;padding:24px 16px;">
      <span class="code" style="font-family:'Courier New',Courier,monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:8px;color:${INK};">${code}</span>
    </td>
  </tr>
</table>`
}

interface EmailLayoutInput {
  /** Texto de pré-visualização (aparece ao lado do assunto na inbox; fica oculto no corpo). */
  preheader: string
  title: string
  /** Blocos HTML do miolo (parágrafos/CTA/caixas — já com os {{placeholders}}). */
  content: string
  /** "Você recebeu este e-mail porque…" (transacional, por template). */
  footerNote: string
}

/**
 * Layout base: página 600px, card branco com logo, miolo e rodapé institucional.
 *
 * Dark mode (duas camadas):
 *  1. Gmail/inversão FORÇADA (ignora media query): a logo é o "chip" com fundo
 *     branco baked na PNG (imagens não são recoloridas) e a paleta clara inverte
 *     sem quebrar (texto escuro→claro, fundos claros→escuros).
 *  2. Clientes com dark de VERDADE (Apple Mail, Samsung, Outlook iOS/2019+):
 *     `prefers-color-scheme: dark` aplica o tema dark do community (com
 *     `!important` p/ vencer os estilos inline) e troca o chip pela logo de
 *     texto claro (transparente).
 */
function emailLayout(input: EmailLayoutInput): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Sistema Zero</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      body, .page { background: ${D_PAGE} !important; }
      .card { background: ${D_CARD} !important; border-color: ${D_BORDER} !important; }
      .ttl, .code { color: ${D_BRIGHT} !important; }
      .txt { color: ${D_TEXT} !important; }
      .mut { color: ${D_MUTED} !important; }
      .dvd { border-top-color: ${D_BORDER} !important; }
      .codebox { background: ${D_BOX} !important; border-color: ${D_BORDER} !important; }
      .lnk { color: ${D_LINK} !important; }
      /* Gradiente invertido no dark (lime→cyan), como no community. */
      .btn { background: ${LIME} !important; background-image: linear-gradient(90deg, ${LIME}, ${CYAN}) !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: block !important; }
    }
  </style>
</head>
<body class="page" style="margin:0;padding:0;background:${PAGE_BG};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${input.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${PAGE_BG}" class="page" style="background:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:100%;">
          <!-- Logo: chip (default/Gmail) + texto claro (só no dark desenhado) -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <img src="${LOGO_URL}" width="232" alt="Sistema Zero" class="logo-light" style="display:block;width:232px;max-width:70%;height:auto;border:0;">
              <img src="${LOGO_DARK_URL}" width="232" alt="Sistema Zero" class="logo-dark" style="display:none;width:232px;max-width:70%;height:auto;border:0;mso-hide:all;">
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td bgcolor="#ffffff" class="card" style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:40px 40px 32px;">
              <h1 class="ttl" style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${INK};">${input.title}</h1>
              ${input.content}
            </td>
          </tr>
          <!-- Rodapé -->
          <tr>
            <td align="center" style="padding:24px 24px 0;">
              <p class="mut" style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">${input.footerNote}</p>
              <p class="mut" style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">Sistema Zero · Mensagem automática — não é necessário responder.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const p = (html: string) =>
  `<p class="txt" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT};">${html}</p>`
const small = (html: string) =>
  `<p class="mut" style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${html}</p>`
const divider = `<hr class="dvd" style="border:0;border-top:1px solid ${BORDER};margin:28px 0 20px;">`

// ── Templates ─────────────────────────────────────────────────────────────────

const seeds = [
  {
    key: 'welcome',
    channel: 'email' as const,
    name: 'Boas-vindas (e-mail)',
    subject: 'Bem-vindo(a) ao Sistema Zero, {{nome}}! Seu acesso está pronto',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'Crie sua senha e entre na área de membros — leva menos de um minuto.',
      title: 'Seu acesso está pronto, {{nome}} 🎉',
      content: [
        p(
          'Que bom ter você com a gente! Sua compra foi confirmada e a sua conta no <strong>Sistema Zero</strong> já está criada.',
        ),
        p(
          'Falta só um passo: criar a sua senha de acesso. Clique no botão abaixo — leva menos de um minuto.',
        ),
        ctaButton('Criar minha senha', '{{link}}'),
        p('Depois é só entrar na área de membros e começar pela primeira aula. Bons estudos! 🚀'),
        divider,
        small(
          'Por segurança, o link acima expira em <strong>1 hora</strong> e só pode ser usado uma vez. Se expirar, use a opção <strong>“Esqueci minha senha”</strong> na página de login para gerar outro.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque uma compra foi realizada com este endereço.',
    }),
  },
  {
    key: 'welcome',
    channel: 'whatsapp' as const,
    name: 'Boas-vindas (WhatsApp)',
    variables: ['nome', 'link'],
    body: [
      'Olá, {{nome}}! 👋',
      '',
      'Que bom ter você com a gente! Sua compra foi confirmada e o seu acesso ao *Sistema Zero* já está pronto. 🎉',
      '',
      'Falta só criar a sua senha — toque no link abaixo (leva menos de um minuto):',
      '{{link}}',
      '',
      '_Por segurança, o link expira em 1 hora e só pode ser usado uma vez. Se expirar, use a opção "Esqueci minha senha" na página de login._',
      '',
      'Bons estudos! 🚀',
    ].join('\n'),
  },
  {
    key: 'new-access',
    channel: 'email' as const,
    name: 'Novo acesso liberado (e-mail)',
    subject: 'Novo curso liberado, {{nome}}! 🎉',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'Seu novo acesso já está na área de membros — é só entrar.',
      title: 'Novo curso liberado, {{nome}}! 🎉',
      content: [
        p(
          'Boa notícia! Sua compra foi confirmada e um novo curso já está liberado na sua conta do <strong>Sistema Zero</strong>.',
        ),
        p(
          'Como você já tem conta, não precisa criar senha de novo — é só entrar com o seu e-mail e senha de sempre e começar.',
        ),
        ctaButton('Ver meus cursos', '{{link}}'),
        divider,
        small(
          'Esqueceu a senha? Use a opção <strong>“Esqueci minha senha”</strong> na página de login para criar uma nova.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque uma compra foi realizada com este endereço.',
    }),
  },
  {
    key: 'new-access',
    channel: 'whatsapp' as const,
    name: 'Novo acesso liberado (WhatsApp)',
    variables: ['nome', 'link'],
    body: [
      'Olá, {{nome}}! 👋',
      '',
      'Boa notícia! Sua compra foi confirmada e um novo curso já está liberado no seu *Sistema Zero*. 🎉',
      '',
      'Como você já tem conta, é só entrar com o seu e-mail e senha de sempre e começar:',
      '{{link}}',
      '',
      '_Esqueceu a senha? Use a opção "Esqueci minha senha" na página de login._',
      '',
      'Bons estudos! 🚀',
    ].join('\n'),
  },
  {
    key: 'password-reset',
    channel: 'email' as const,
    name: 'Redefinição de senha (e-mail)',
    subject: 'Redefina sua senha do Sistema Zero',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'Recebemos um pedido para redefinir a sua senha. O link expira em 1 hora.',
      title: 'Vamos redefinir sua senha?',
      content: [
        p('Olá, {{nome}}.'),
        p(
          'Recebemos um pedido para redefinir a senha da sua conta no <strong>Sistema Zero</strong>. Para criar uma nova senha, clique no botão abaixo:',
        ),
        ctaButton('Redefinir minha senha', '{{link}}'),
        divider,
        small('O link expira em <strong>1 hora</strong> e só pode ser usado uma vez.'),
        small(
          '<strong>Não foi você?</strong> Pode ignorar este e-mail com tranquilidade — sua senha atual continua valendo e nada muda na sua conta.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque alguém pediu a redefinição de senha desta conta.',
    }),
  },
  {
    key: 'otp',
    channel: 'email' as const,
    name: 'Código de acesso (e-mail)',
    subject: 'Seu código de acesso: {{codigo}}',
    variables: ['nome', 'codigo'],
    body: emailLayout({
      preheader: 'Use este código para entrar na sua conta. Ele expira em poucos minutos.',
      title: 'Seu código de acesso',
      content: [
        p('Olá, {{nome}}.'),
        p('Use o código abaixo para entrar na sua conta do <strong>Sistema Zero</strong>:'),
        codeBox('{{codigo}}'),
        small('O código expira em <strong>poucos minutos</strong> e só pode ser usado uma vez.'),
        divider,
        small(
          '🔒 Nunca compartilhe este código — nossa equipe <strong>jamais</strong> vai pedi-lo por telefone, WhatsApp ou e-mail.',
        ),
        small(
          '<strong>Não foi você?</strong> Pode ignorar este e-mail — sem o código, ninguém entra na sua conta.',
        ),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque alguém pediu um código de acesso para esta conta.',
    }),
  },
  {
    key: 'nfse-emitida',
    channel: 'email' as const,
    name: 'Nota fiscal emitida (e-mail)',
    subject: 'Sua nota fiscal — {{produto}}',
    variables: ['nome', 'produto', 'valor', 'chave'],
    body: emailLayout({
      preheader: 'A nota fiscal da sua compra foi emitida e está anexada em PDF neste e-mail.',
      title: 'Sua nota fiscal chegou, {{nome}}',
      content: [
        p(
          'A nota fiscal da sua compra de <strong>{{produto}}</strong>, no valor de <strong>{{valor}}</strong>, foi emitida com sucesso.',
        ),
        p(
          'O documento (DANFSe) está <strong>anexado a este e-mail em PDF</strong> — é só abrir ou baixar quando precisar. Guarde-o para a sua referência.',
        ),
        divider,
        small('Chave de acesso da NFS-e:'),
        `<p class="mut" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:18px;word-break:break-all;color:${MUTED};">{{chave}}</p>`,
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque uma compra foi realizada com este endereço.',
    }),
  },
  {
    key: 'otp',
    channel: 'whatsapp' as const,
    name: 'Código de acesso (WhatsApp)',
    variables: ['nome', 'codigo'],
    body: [
      'Olá, {{nome}}! Seu código de acesso ao *Sistema Zero* é:',
      '',
      '*{{codigo}}*',
      '',
      'Ele expira em poucos minutos e só pode ser usado uma vez.',
      '',
      '🔒 _Nunca compartilhe este código — nossa equipe jamais vai pedi-lo. Se você não solicitou, ignore esta mensagem._',
    ].join('\n'),
  },
  // Report SEMANAL dos pais (kids, Fase 5 07/2026) — enviado pelo MEMBERS (consumer
  // HMAC `members` no gateway) toda sexta 17h SP, com a semana corrente parcial.
  // CONTRATO de variáveis com o members (send-parent-reports): NÃO renomear sem
  // mudar o chamador. `resumo` é TEXTO com quebras de linha (o render escapa HTML;
  // o bloco pre-wrap preserva as quebras).
  {
    key: 'weekly-report',
    channel: 'email' as const,
    name: 'Resumo semanal para os pais (e-mail)',
    subject: 'Essa semana no Sistema Zero: as conquistas de {{criancas}} 🌟',
    variables: ['nome', 'criancas', 'semana', 'resumo', 'link'],
    body: emailLayout({
      preheader: 'O resumo da semana de aprendizado e criação das crianças.',
      title: 'Olá, {{nome}}! Veja como foi a semana 🌟',
      content: [
        p(
          'Este é o resumo da semana ({{semana}}) de <strong>{{criancas}}</strong> no <strong>Sistema Zero</strong>:',
        ),
        `<div class="codebox" style="white-space:pre-wrap;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT};background:${BOX_BG};border:1px solid ${BORDER};border-radius:12px;padding:16px 20px;margin:20px 0;">{{resumo}}</div>`,
        ctaButton('Ver na plataforma', '{{link}}'),
        divider,
        small(
          'Para deixar de receber este resumo semanal, desative-o na <strong>Área dos pais</strong> da plataforma.',
        ),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque há um perfil de criança ativo na sua conta do Sistema Zero.',
    }),
  },
  // Lembrete de RENOVAÇÃO do plano anual à vista (assinaturas, 07/2026) — enviado
  // pelo MEMBERS (consumer HMAC `members` via gateway) ~7 dias antes da validade
  // da matrícula vencer. CONTRATO de variáveis com o members
  // (send-renewal-reminders): NÃO renomear sem mudar o chamador. `data` chega
  // formatada (dd/mm/aaaa); `link` = /renovar?oferta=<slug> no funil.
  {
    key: 'renewal-reminder',
    channel: 'email' as const,
    name: 'Lembrete de renovação (e-mail)',
    subject: 'Seu acesso a {{produto}} vence em breve, {{nome}}',
    variables: ['nome', 'produto', 'data', 'link'],
    body: emailLayout({
      preheader: 'Renove agora e continue com acesso sem interrupção.',
      title: 'Hora de renovar, {{nome}} ⏰',
      content: [
        p(
          'Seu acesso a <strong>{{produto}}</strong> vale até <strong>{{data}}</strong>. Depois dessa data, a plataforma fica indisponível até a renovação.',
        ),
        p('Para continuar sem interrupção, renove agora — leva menos de dois minutos.'),
        ctaButton('Renovar meu acesso', '{{link}}'),
        divider,
        small(
          'Se você já renovou, pode ignorar este e-mail — o novo período entra em vigor automaticamente.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque tem um plano ativo no Sistema Zero.',
    }),
  },
  {
    key: 'renewal-reminder',
    channel: 'whatsapp' as const,
    name: 'Lembrete de renovação (WhatsApp)',
    variables: ['nome', 'produto', 'data', 'link'],
    body: [
      'Olá, {{nome}}! ⏰',
      '',
      'Seu acesso a *{{produto}}* vale até *{{data}}*.',
      '',
      'Para continuar sem interrupção, renove agora (leva menos de dois minutos):',
      '{{link}}',
      '',
      '_Se você já renovou, pode ignorar esta mensagem._',
    ].join('\n'),
  },
  // FALHA de cobrança de um ciclo de ASSINATURA (dunning, 07/2026) — enviado pelo
  // FUNIL (consumer HMAC `funnel` via gateway) quando o `payment.failed` de um
  // ciclo chega. CONTRATO de variáveis com o funil (server/dunning.ts): NÃO
  // renomear sem mudar o chamador. `link` = página de compras/assinaturas do app.
  {
    key: 'subscription-charge-failed',
    channel: 'email' as const,
    name: 'Falha na cobrança da assinatura (e-mail)',
    subject: 'Não conseguimos renovar sua assinatura, {{nome}}',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'A cobrança da sua assinatura não foi aprovada — atualize o pagamento.',
      title: 'Ops! A cobrança não passou 😕',
      content: [
        p(
          'Tentamos renovar a sua assinatura do <strong>Sistema Zero</strong>, mas a cobrança no cartão não foi aprovada (pode ser limite, vencimento ou bloqueio do banco).',
        ),
        p(
          'Seu acesso continua ativo por alguns dias. Para não perder nada, verifique o cartão com o seu banco — uma nova tentativa de cobrança pode acontecer em breve.',
        ),
        ctaButton('Ver minha assinatura', '{{link}}'),
        divider,
        small(
          'Se a cobrança não for aprovada até o fim do período já pago, o acesso é pausado automaticamente — e você pode reativar quando quiser.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque tem uma assinatura ativa no Sistema Zero.',
    }),
  },
  {
    key: 'subscription-charge-failed',
    channel: 'whatsapp' as const,
    name: 'Falha na cobrança da assinatura (WhatsApp)',
    variables: ['nome', 'link'],
    body: [
      'Olá, {{nome}}! 😕',
      '',
      'Tentamos renovar a sua assinatura do *Sistema Zero*, mas a cobrança no cartão não foi aprovada.',
      '',
      'Seu acesso continua ativo por alguns dias. Verifique o cartão com o seu banco — uma nova tentativa pode acontecer em breve.',
      '',
      'Acompanhe aqui: {{link}}',
    ].join('\n'),
  },
  // Lembrete de publicação MANUAL do app de marketing (F1, 07/2026) — enviado
  // pelo MARKETING (consumer HMAC `marketing` no gateway) na hora agendada de
  // uma publicação em modo lembrete. CONTRATO de variáveis com o marketing
  // (publisher-worker): NÃO renomear sem mudar o chamador. `horario` já chega
  // formatado em America/Sao_Paulo; `link` abre o composer da publicação.
  {
    key: 'marketing-reminder',
    channel: 'whatsapp' as const,
    name: 'Lembrete de publicação (WhatsApp)',
    variables: ['titulo', 'formato', 'horario', 'link'],
    body: [
      '📣 Hora de publicar!',
      '',
      '*{{titulo}}*',
      '{{formato}} — agendado para {{horario}}.',
      '',
      'Publique na rede e depois marque como publicada aqui:',
      '{{link}}',
    ].join('\n'),
  },
  // ── Indicações e bolsas (@sistemazero/referrals, 08/2026) — E-MAIL SÓ ──────
  // Decisão de produto: a plataforma NUNCA dispara WhatsApp frio (Evolution é
  // não-oficial, mensagem a desconhecido = risco de ban do chip + LGPD frágil);
  // o embaixador compartilha o link no PRÓPRIO WhatsApp.
  {
    key: 'referrals-ambassador-link',
    channel: 'email' as const,
    name: 'Página do embaixador (e-mail)',
    subject: 'Sua página de embaixador do Sistema Zero está pronta, {{nome}}!',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'Distribua bolsas do Desafio do Primeiro Jogo para quem você quiser.',
      title: 'Sua página de embaixador está pronta, {{nome}} 🎁',
      content: [
        p(
          'Você agora é embaixador(a) do <strong>Sistema Zero</strong> e pode presentear crianças que você conhece com uma <strong>bolsa 100% do Desafio do Primeiro Jogo</strong> (curso completo, vitalício).',
        ),
        p(
          'Na sua página você encontra o seu link de bolsa para compartilhar e também pode enviar convites por e-mail. Tudo pronto, sem burocracia:',
        ),
        ctaButton('Abrir minha página', '{{link}}'),
        divider,
        small(
          'Guarde este e-mail: o link acima é a sua chave de acesso à página (não precisa de senha). Se suspeitar que ele vazou, fale com a gente para gerar outro.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque foi cadastrado(a) como embaixador(a) do Sistema Zero.',
    }),
  },
  {
    key: 'referrals-scholarship-invite',
    channel: 'email' as const,
    name: 'Convite de bolsa (e-mail)',
    subject: '{{indicador}} indicou você: bolsa 100% do Desafio do Primeiro Jogo 🎁',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'Um presente de {{indicador}}: o curso completo, sem pagar nada.',
      title: '{{nome}}, você ganhou um presente de {{indicador}} 🎁',
      content: [
        p(
          '<strong>{{indicador}}</strong> acha que tem uma criança aí na sua casa que ia adorar criar o próprio jogo — e indicou você para uma <strong>bolsa 100%</strong> do <strong>Desafio do Primeiro Jogo</strong>, do Sistema Zero.',
        ),
        p(
          'É o nosso curso em que a criança (a partir de 9 anos) monta um jogo de verdade em 5 dias, passo a passo. Com a bolsa, o acesso é completo, vitalício e sem pagar nada.',
        ),
        p('Para resgatar, é só confirmar os seus dados de responsável no link abaixo:'),
        ctaButton('Resgatar a bolsa', '{{link}}'),
        divider,
        small(
          'Você recebeu este convite único porque {{indicador}} informou o seu e-mail. Não vamos enviar outras mensagens: se não tiver interesse, basta ignorar este e-mail e nada mais acontece.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Convite enviado a pedido de {{indicador}}. Sem interesse? Ignore — não enviaremos de novo.',
    }),
  },
  {
    key: 'referrals-scholarship-welcome',
    channel: 'email' as const,
    name: 'Boas-vindas da bolsa (e-mail)',
    subject: 'Sua bolsa está ativa, {{nome}}! Crie sua senha e comecem hoje',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'O Desafio do Primeiro Jogo já está liberado na sua conta.',
      title: 'Bolsa ativada, {{nome}} 🎉',
      content: [
        p(
          'A bolsa indicada por <strong>{{indicador}}</strong> foi resgatada e o <strong>Desafio do Primeiro Jogo</strong> já está liberado na sua conta do <strong>Sistema Zero</strong> — completo e vitalício.',
        ),
        p(
          'Falta só um passo: criar a sua senha de acesso (você é o responsável; o perfil da criança vocês criam juntos lá dentro, em um minutinho).',
        ),
        ctaButton('Criar minha senha', '{{link}}'),
        p(
          'Depois é só entrar, criar o perfil da criança e começar a primeira missão. Divirtam-se! 🚀',
        ),
        divider,
        small(
          'Por segurança, o link acima expira em <strong>14 dias</strong> e só pode ser usado uma vez. Se expirar, use a opção <strong>“Esqueci minha senha”</strong> na página de login para gerar outro.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque uma bolsa foi resgatada com este endereço.',
    }),
  },
]

// ── Upsert ────────────────────────────────────────────────────────────────────

const env = loadEnv()
const connection = createDbConnection(env.DATABASE_URL, { max: 2 })
const templates = new DrizzleTemplateRepository(connection.db)
const now = new Date()

for (const seed of seeds) {
  const existing = await templates.findByChannelAndKey(seed.channel, seed.key)
  if (existing) {
    // Atualiza conteúdo; preserva `active` (não religa template desativado de propósito).
    existing.update(
      {
        name: seed.name,
        subject: seed.subject ?? null,
        body: seed.body,
        variables: seed.variables,
      },
      now,
    )
    await templates.update(existing)
    console.log(`atualizado: ${seed.channel}/${seed.key}`)
    continue
  }
  await templates.create(Template.create({ id: crypto.randomUUID(), ...seed, now }))
  console.log(`criado: ${seed.channel}/${seed.key}`)
}

// ── Remetente default (create-if-missing — edições do admin nunca são sobrescritas) ──
// ⚠️ O endereço precisa estar VERIFICADO na SendGrid (autenticação do domínio
// sistemazero.com.br) — sem isso o envio falha com 403 "Sender Identity".
const senders = new DrizzleSenderRepository(connection.db)
const DEFAULT_SENDER = { fromEmail: 'contato@sistemazero.com.br', fromName: 'Helena e Júlio' }
const existingSender = await senders.findByEmail(DEFAULT_SENDER.fromEmail)
if (existingSender) {
  console.log(`remetente já existe: ${DEFAULT_SENDER.fromEmail}`)
} else {
  await senders.create(
    EmailSender.create({ id: crypto.randomUUID(), ...DEFAULT_SENDER, isDefault: true, now }),
    { clearOtherDefaults: true },
  )
  console.log(`remetente default criado: ${DEFAULT_SENDER.fromName} <${DEFAULT_SENDER.fromEmail}>`)
}

await connection.close()
