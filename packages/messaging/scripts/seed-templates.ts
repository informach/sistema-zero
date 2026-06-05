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
import { Template } from '../src/domain/template/template.aggregate'
import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleTemplateRepository } from '../src/infrastructure/persistence/drizzle/template.repository'

const LOGO_URL =
  process.env.EMAIL_LOGO_URL ??
  'https://pub-02366636d03f4612aae5881ac9c585d8.r2.dev/email/logo-sistema-zero.png'

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

// ── Blocos reutilizáveis (e-mail-safe: tabelas + CSS inline) ──────────────────

/** Botão "à prova de bala": tabela + bgcolor sólido (Outlook) + gradiente da marca. */
function ctaButton(label: string, href: string): string {
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto;">
  <tr>
    <td align="center" bgcolor="${CYAN}" style="border-radius:10px;background:${CYAN};background-image:linear-gradient(90deg,${CYAN},${LIME});">
      <a href="${href}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${INK};text-decoration:none;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>`
}

/** Linha de fallback do CTA (clientes que bloqueiam botão/imagens). */
function fallbackLink(href: string): string {
  return `
<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">
  Se o botão não funcionar, copie e cole este endereço no navegador:
</p>
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;">
  <a href="${href}" target="_blank" style="color:${LINK};text-decoration:underline;">${href}</a>
</p>`
}

/** Caixa de destaque do código OTP (mono, espaçado, alto contraste). */
function codeBox(code: string): string {
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;">
  <tr>
    <td align="center" bgcolor="${BOX_BG}" style="background:${BOX_BG};border:1px solid ${BORDER};border-radius:12px;padding:24px 16px;">
      <span style="font-family:'Courier New',Courier,monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:8px;color:${INK};">${code}</span>
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

/** Layout base: página 600px, card branco com logo, miolo e rodapé institucional. */
function emailLayout(input: EmailLayoutInput): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Sistema Zero</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${input.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${PAGE_BG}" style="background:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <img src="${LOGO_URL}" width="232" alt="Sistema Zero" style="display:block;width:232px;max-width:70%;height:auto;border:0;">
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${INK};">${input.title}</h1>
              ${input.content}
            </td>
          </tr>
          <!-- Rodapé -->
          <tr>
            <td align="center" style="padding:24px 24px 0;">
              <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">${input.footerNote}</p>
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">Sistema Zero · Mensagem automática — não é necessário responder.</p>
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
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT};">${html}</p>`
const small = (html: string) =>
  `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${html}</p>`
const divider = `<hr style="border:0;border-top:1px solid ${BORDER};margin:28px 0 20px;">`

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

await connection.close()
