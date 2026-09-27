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
          'Boa notícia! Um novo curso já está liberado na sua conta do <strong>Sistema Zero</strong>.',
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
      footerNote: 'Você recebeu este e-mail porque um novo acesso foi liberado para este endereço.',
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
      'Boa notícia! Um novo curso já está liberado no seu *Sistema Zero*. 🎉',
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
  // Ciclo do Desafio do Primeiro Jogo (acesso fixo de 30 dias). O funil envia
  // `challenge-access-approved` nos dois canais; o MEMBERS envia os demais por
  // e-mail, com dedupe por matrícula + vencimento + marco.
  {
    key: 'challenge-access-approved',
    channel: 'email' as const,
    name: 'Desafio: acesso aprovado (e-mail)',
    subject: 'O primeiro jogo do seu filho pode começar, {{nome}} 🎮',
    variables: ['nome', 'link', 'expira_em', 'acao', 'orientacao'],
    body: emailLayout({
      preheader: 'O acesso está liberado. Veja a data final e abram juntos a primeira etapa.',
      title: 'O primeiro jogo pode começar 🎮',
      content: [
        p(
          'Olá, {{nome}}! O pagamento foi aprovado e o <strong>Desafio do Primeiro Jogo</strong> já está liberado para sua família.',
        ),
        p('O acesso fica disponível até <strong>{{expira_em}}</strong>, sem renovação automática.'),
        p('{{orientacao}}'),
        ctaButton('{{acao}}', '{{link}}'),
        divider,
        small(
          'Escolham um primeiro momento possível na rotina, cadastrem o perfil da criança e abram a etapa 1. As cinco etapas podem ser distribuídas dentro do período de acesso.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque comprou o Desafio do Primeiro Jogo.',
    }),
  },
  {
    key: 'challenge-access-approved',
    channel: 'whatsapp' as const,
    name: 'Desafio: acesso aprovado (WhatsApp)',
    variables: ['nome', 'link', 'expira_em', 'acao', 'orientacao'],
    body: [
      'Olá, {{nome}}! 🎮',
      '',
      'O pagamento foi aprovado e o *Desafio do Primeiro Jogo* já está liberado para sua família.',
      'Seu acesso vai até *{{expira_em}}*, sem renovação automática.',
      '',
      '{{orientacao}}',
      '{{link}}',
      '',
      'Primeiro passo: escolher um momento possível e abrir a etapa 1. 🚀',
    ].join('\n'),
  },
  {
    key: 'challenge-not-activated',
    channel: 'email' as const,
    name: 'Desafio: conta ainda não ativada (e-mail)',
    subject: '{{nome}}, falta só criar sua senha para começar o Desafio',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'Seu acesso está contando; crie a senha para aproveitar o período do desafio.',
      title: 'Seu Desafio está esperando por vocês',
      content: [
        p('Olá, {{nome}}! O acesso já foi liberado, mas a senha da conta ainda não foi criada.'),
        p(
          'Como os 30 dias começaram na aprovação do pagamento, vale resolver esse passo agora. Use o botão abaixo, informe o e-mail da compra e siga as instruções para definir sua senha.',
        ),
        ctaButton('Criar senha e entrar', '{{link}}'),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque comprou o Desafio do Primeiro Jogo.',
    }),
  },
  {
    key: 'challenge-not-started',
    channel: 'email' as const,
    name: 'Desafio: etapa 1 ainda não iniciada (e-mail)',
    subject: 'Que tal abrir a primeira etapa, {{nome}}?',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'A conta está pronta; o próximo passo leva poucos minutos.',
      title: 'Hoje pode ser o começo do primeiro jogo',
      content: [
        p('Olá, {{nome}}! A conta já está pronta, mas a primeira etapa ainda não foi iniciada.'),
        p(
          'Não precisa separar uma tarde inteira. Entre com a criança, escolha o perfil e dê apenas o primeiro passo. Quando quiserem, vocês continuam de onde pararam.',
        ),
        ctaButton('Abrir o Desafio', '{{link}}'),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque tem acesso ativo ao Desafio do Primeiro Jogo.',
    }),
  },
  {
    key: 'challenge-day-one-complete',
    channel: 'email' as const,
    name: 'Desafio: etapa 1 concluída (e-mail)',
    subject: 'Primeira etapa concluída: o jogo já começou a ganhar forma 🎉',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'Celebre o primeiro passo e continue do ponto em que a criança parou.',
      title: 'Primeira fase concluída 🎉',
      content: [
        p(
          'Olá, {{nome}}! A primeira etapa foi concluída. O jogo já saiu da ideia e começou a ganhar forma na tela.',
        ),
        p('Quando estiverem prontos, retomem do mesmo ponto. Uma etapa de cada vez é suficiente.'),
        ctaButton('Continuar o Desafio', '{{link}}'),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque há progresso no Desafio do Primeiro Jogo.',
    }),
  },
  {
    key: 'challenge-expiry-7d',
    channel: 'email' as const,
    name: 'Desafio: faltam 7 dias (e-mail)',
    subject: 'Falta uma semana para o acesso ao Desafio terminar',
    variables: ['nome', 'data', 'link'],
    body: emailLayout({
      preheader: 'O acesso vai até {{data}}. Retome do ponto em que a criança parou.',
      title: 'Ainda dá tempo de avançar com calma',
      content: [
        p(
          'Olá, {{nome}}! O acesso ao Desafio do Primeiro Jogo termina em <strong>{{data}}</strong>.',
        ),
        p(
          'Falta uma semana. Entre para ver onde a criança parou e escolha a próxima etapa possível, sem precisar recomeçar.',
        ),
        ctaButton('Retomar o Desafio', '{{link}}'),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque tem acesso temporário ao Desafio do Primeiro Jogo.',
    }),
  },
  {
    key: 'challenge-expiry-3d',
    channel: 'email' as const,
    name: 'Desafio: faltam 3 dias (e-mail)',
    subject: 'Últimos 3 dias do acesso ao Desafio do Primeiro Jogo',
    variables: ['nome', 'data', 'link'],
    body: emailLayout({
      preheader:
        'O acesso termina em {{data}}. Abra a plataforma e conclua o próximo passo possível.',
      title: 'Últimos dias para continuar o projeto',
      content: [
        p('Olá, {{nome}}! O período do Desafio termina em <strong>{{data}}</strong>.'),
        p(
          'Se o jogo ainda não ficou pronto, tudo bem: retomem agora e avancem até o próximo marco possível. O projeto e o progresso continuam guardados na conta.',
        ),
        ctaButton('Continuar agora', '{{link}}'),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque tem acesso temporário ao Desafio do Primeiro Jogo.',
    }),
  },
  {
    key: 'challenge-completed',
    channel: 'email' as const,
    name: 'Desafio: concluído (e-mail)',
    subject: 'O primeiro jogo ficou pronto! E agora?',
    variables: ['nome', 'link'],
    body: emailLayout({
      preheader: 'Celebre a conquista e conheça o próximo caminho de criação.',
      title: 'Primeiro jogo concluído! 🏆',
      content: [
        p(
          'Olá, {{nome}}! A criança concluiu o Desafio do Primeiro Jogo. Vale celebrar: ela transformou uma ideia em um projeto próprio, etapa por etapa.',
        ),
        p(
          'Se quiser continuar criando com novos projetos, ferramentas e acompanhamento, conheça a Comunidade do Criador.',
        ),
        ctaButton('Conhecer a Comunidade', '{{link}}'),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque o Desafio do Primeiro Jogo foi concluído na sua conta.',
    }),
  },
  {
    key: 'challenge-expired',
    channel: 'email' as const,
    name: 'Desafio: acesso encerrado (e-mail)',
    subject: 'O período do Desafio terminou, {{nome}}',
    variables: ['nome', 'data', 'link'],
    body: emailLayout({
      preheader: 'O período terminou, mas o progresso e os projetos continuam guardados.',
      title: 'O período do Desafio terminou',
      content: [
        p(
          'Olá, {{nome}}! O acesso ao Desafio do Primeiro Jogo terminou em <strong>{{data}}</strong>.',
        ),
        p(
          'O progresso e os projetos continuam guardados na conta. Para seguir criando e voltar a acessar esse conteúdo, conheça a Comunidade do Criador.',
        ),
        ctaButton('Conhecer a Comunidade', '{{link}}'),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque teve acesso ao Desafio do Primeiro Jogo.',
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
      preheader: 'Convide famílias para criar um jogo com o curso Cadê Todo Mundo?.',
      title: 'Sua página de embaixador está pronta, {{nome}} 🎁',
      content: [
        p(
          'Você agora é embaixador(a) do <strong>Sistema Zero</strong> e pode presentear crianças que você conhece com acesso ao curso <strong>Cadê Todo Mundo?</strong>, sem custo para a família indicada.',
        ),
        p(
          'Para novos resgates, a família tem 7 dias de acesso ao curso a partir do cadastro pelo link.',
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
    subject: '{{indicador}} indicou você para o curso Cadê Todo Mundo? 🎁',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'Seu filho pode criar um jogo de procurar personagens, sem custo pelo convite.',
      title: '{{nome}}, você ganhou um presente de {{indicador}} 🎁',
      content: [
        p(
          '<strong>{{indicador}}</strong> pensou na sua família e convidou você para receber o curso <strong>Cadê Todo Mundo?</strong>, do Sistema Zero, sem custo.',
        ),
        p(
          'No Sistema Zero, crianças aprendem criando projetos. Neste curso, crianças de 8 a 15 anos montam, passo a passo, um jogo de procurar personagens e concluem a jornada com um certificado. O convite libera apenas este curso e o Mural dos Criadores em modo visitante — não a assinatura da Comunidade dos Criadores.',
        ),
        p('O acesso ao curso dura 7 dias a partir do cadastro pelo link, não da primeira aula.'),
        p(
          'O convite também dá acesso ao <strong>Mural dos Criadores</strong> para ver e jogar criações de outras crianças enquanto a conta existir. Publicar, comentar e copiar jogos não fazem parte do presente.',
        ),
        p(
          'Para receber o curso, confirme seus dados de responsável no link abaixo. Não pedimos cartão:',
        ),
        ctaButton('Conhecer e liberar o curso', '{{link}}'),
        divider,
        small(
          'Este é um convite único: {{indicador}} nos passou o seu e-mail só para isso. Se não tiver interesse, pode ignorar, que a gente não escreve de novo.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Convite enviado a pedido de {{indicador}}. Sem interesse? Pode ignorar, não enviaremos de novo.',
    }),
  },
  {
    key: 'referrals-scholarship-welcome',
    channel: 'email' as const,
    name: 'Boas-vindas da bolsa (e-mail)',
    subject: 'Seu acesso está pronto, {{nome}}! Crie sua senha',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'O curso recebido por indicação já está na sua conta.',
      title: 'Seu acesso está pronto, {{nome}} 🎉',
      content: [
        p(
          'O curso indicado por <strong>{{indicador}}</strong> já está liberado na sua conta do <strong>Sistema Zero</strong>.',
        ),
        p(
          'Falta só um passo: criar a sua senha de acesso. O perfil da criança vocês criam juntos lá dentro, em um minutinho.',
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
  {
    key: 'referrals-scholarship-welcome-7d',
    channel: 'email' as const,
    name: 'Boas-vindas do presente por sete dias (conta nova)',
    subject: 'Seu curso está liberado por 7 dias, {{nome}}',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'Cadê Todo Mundo? já está na sua conta. Seus 7 dias começaram no cadastro.',
      title: 'Seu presente está pronto, {{nome}} 🎁',
      content: [
        p(
          '<strong>{{indicador}}</strong> indicou sua família para receber o curso <strong>Cadê Todo Mundo?</strong> sem custo.',
        ),
        p(
          'Você tem 7 dias de acesso ao curso a partir do cadastro pelo link. Criar ou recuperar a senha depois não reinicia esse prazo. Vale começar agora com a criança.',
        ),
        ctaButton('Criar minha senha e começar', '{{link}}'),
        divider,
        small(
          'O link para criar a senha expira em 14 dias e só pode ser usado uma vez. Esse prazo do link é diferente dos 7 dias de acesso ao curso. Se o link expirar, use “Esqueci minha senha” na página de login.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque resgatou um presente por indicação.',
    }),
  },
  {
    key: 'referrals-scholarship-existing-7d',
    channel: 'email' as const,
    name: 'Presente por sete dias (conta existente)',
    subject: 'Cadê Todo Mundo? está na sua conta por 7 dias, {{nome}}',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'Entre na sua conta para começar o curso recebido por indicação.',
      title: 'Seu presente está na sua conta, {{nome}} 🎁',
      content: [
        p(
          '<strong>{{indicador}}</strong> indicou sua família para receber o curso <strong>Cadê Todo Mundo?</strong> sem custo.',
        ),
        p(
          'O acesso a este curso dura 7 dias a partir do cadastro pelo link. Entre com sua senha de sempre e comece agora. Recuperar a senha não reinicia esse prazo.',
        ),
        ctaButton('Acessar meus cursos', '{{link}}'),
        divider,
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque resgatou um presente por indicação.',
    }),
  },
  {
    key: 'referrals-scholarship-welcome-7d-mural',
    channel: 'email' as const,
    name: 'Presente de sete dias com Mural visitante (conta nova)',
    subject: 'Seu curso e o Mural estão liberados, {{nome}}',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'Cadê Todo Mundo? por 7 dias; jogos do Mural para ver e jogar sem prazo.',
      title: 'Seu presente está pronto, {{nome}} 🎁',
      content: [
        p(
          '<strong>{{indicador}}</strong> indicou sua família para receber o curso <strong>Cadê Todo Mundo?</strong> sem custo.',
        ),
        p(
          'O curso fica disponível por <strong>7 dias a partir do cadastro pelo link</strong>. Criar ou recuperar a senha depois não reinicia esse prazo.',
        ),
        p(
          'Vocês também podem <strong>ver e jogar os jogos do Mural dos Criadores</strong> enquanto a conta existir, mesmo depois dos 7 dias. Este presente não libera publicar, comentar, reagir nem fazer cópias dos jogos. Uma assinatura ativa libera a participação completa.',
        ),
        ctaButton('Criar minha senha e começar', '{{link}}'),
        divider,
        small(
          'O link para criar a senha expira em 14 dias e só pode ser usado uma vez. Esse prazo é diferente dos 7 dias de acesso ao curso. Se expirar, use “Esqueci minha senha” na página de login.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque resgatou um presente por indicação.',
    }),
  },
  {
    key: 'referrals-scholarship-existing-7d-mural',
    channel: 'email' as const,
    name: 'Presente de sete dias com Mural visitante (conta existente)',
    subject: 'Seu curso e o Mural estão na sua conta, {{nome}}',
    variables: ['nome', 'indicador', 'link'],
    body: emailLayout({
      preheader: 'Entre na sua conta para começar o curso e jogar no Mural.',
      title: 'Seu presente está na sua conta, {{nome}} 🎁',
      content: [
        p(
          '<strong>{{indicador}}</strong> indicou sua família para receber o curso <strong>Cadê Todo Mundo?</strong> sem custo.',
        ),
        p(
          'O curso fica disponível por <strong>7 dias a partir do cadastro pelo link</strong>. Recuperar a senha não reinicia esse prazo.',
        ),
        p(
          'O acesso para <strong>ver e jogar os jogos do Mural dos Criadores</strong> continua enquanto sua conta existir. Publicar, comentar, reagir e copiar jogos não fazem parte do presente; uma assinatura ativa libera a participação completa.',
        ),
        ctaButton('Acessar meu presente', '{{link}}'),
        divider,
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque resgatou um presente por indicação.',
    }),
  },
  {
    key: 'referrals-bonus-eligible',
    channel: 'email' as const,
    name: 'Bônus do embaixador liberado (e-mail)',
    subject: 'Boa notícia, {{nome}}: seu bônus de embaixador liberou! 🎉',
    variables: ['nome', 'valor', 'link'],
    body: emailLayout({
      preheader: 'Uma família que você indicou assinou a Comunidade dos Criadores.',
      title: 'Seu bônus liberou, {{nome}} 🎉',
      content: [
        p(
          'Uma família que ganhou a bolsa com o seu link deu o próximo passo e assinou a <strong>Comunidade dos Criadores</strong>. O período de garantia passou e o seu bônus de <strong>{{valor}}</strong> está liberado.',
        ),
        p(
          'Para receber, é só cadastrar (ou conferir) a sua chave Pix na sua página de embaixador:',
        ),
        ctaButton('Abrir minha página', '{{link}}'),
        divider,
        small(
          'O bônus é um agradecimento único por indicação que virar assinatura. A gente paga por Pix, direto na chave que você cadastrar, normalmente em poucos dias. Não é salário nem renda garantida, e não cria vínculo com a plataforma.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote:
        'Você recebeu este e-mail porque é embaixador(a) do Sistema Zero e tem um bônus a receber.',
    }),
  },
  // Aviso de resposta do HELPDESK a um chamado aberto no PORTAL da Ajuda. Enviado
  // pelo helpdesk (consumer HMAC `helpdesk`) DEPOIS de a resposta já estar gravada
  // na conversa. CONTRATO de variáveis com `portal-reply-notification.ts` do
  // helpdesk: NÃO renomear sem mudar o chamador. Só o link, sem o texto da
  // resposta: o portal é autenticado e o e-mail não; e o remetente default é a
  // própria caixa contato@, então responder a este e-mail viraria chamado separado.
  {
    key: 'helpdesk-reply',
    channel: 'email' as const,
    name: 'Resposta no chamado da Ajuda (e-mail)',
    subject: 'Respondemos ao seu chamado: {{assunto}}',
    variables: ['saudacao', 'assunto', 'link'],
    body: emailLayout({
      preheader: 'A equipe respondeu ao seu chamado na Ajuda do Sistema Zero.',
      title: '{{saudacao}} Sua resposta chegou 💬',
      content: [
        p(
          'A equipe do <strong>Sistema Zero</strong> respondeu ao seu chamado <strong>{{assunto}}</strong>.',
        ),
        p(
          'A resposta está na área de Ajuda, no mesmo lugar onde você abriu o chamado. Se precisar continuar a conversa, é por lá também.',
        ),
        ctaButton('Ver a resposta', '{{link}}'),
        divider,
        small(
          'Este e-mail é só um aviso. Para falar com a equipe, use a Ajuda pelo botão acima: respostas a este e-mail podem virar um chamado separado.',
        ),
        fallbackLink('{{link}}'),
      ].join('\n'),
      footerNote: 'Você recebeu este e-mail porque abriu um chamado na Ajuda do Sistema Zero.',
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
