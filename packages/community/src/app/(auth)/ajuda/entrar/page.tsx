import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PublicTopBar } from '@/components/community/public-top-bar'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ajuda para entrar · Comunidade Sistema Zero',
  robots: { index: false, follow: false },
}

/** O e-mail que o Help Desk lê: cada mensagem vira um chamado da mesma fila do portal. */
const SUPPORT_EMAIL = 'contato@sistemazero.com.br'

const SUBJECTS = [
  { id: 'primeiro', label: 'Primeiro acesso' },
  { id: 'senha', label: 'Senha e código' },
  { id: 'compra', label: 'Compra e acesso' },
  { id: 'equipe', label: 'Falar com a equipe' },
]

/**
 * Ajuda para entrar (direção de arte de 18/10/2026): pública e fora dos buscadores, para quem não
 * consegue entrar e por isso não alcança o Como fazer nem o portal de chamados. Cada resposta segue
 * o comportamento de hoje (mensagem de boas-vindas por e-mail e WhatsApp, link de uso único, código
 * de 6 números, senha de 10 caracteres). Os nomes em negrito são os rótulos reais das telas.
 * ⚠️ Mora debaixo do `/ajuda` logado: o `proxy.ts` a declara em `publicPaths`.
 */
export default async function EntryHelpPage() {
  const user = await getSession()
  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar href={user ? '/' : '/login'}>
        <Link href={user ? '/' : '/login'} className="sz-btn shrink-0">
          {user ? 'Ir para o início' : 'Entrar'}
        </Link>
      </PublicTopBar>

      <section className="sz-band">
        <div className="sz-page flex flex-col gap-3 pt-10 pb-9">
          <h1 className="sz-h1">Ajuda para entrar</h1>
          <p className="sz-lead max-w-3xl">
            As respostas para o primeiro acesso, a senha e o código por e-mail. Esta página abre sem
            login.
          </p>
          <nav aria-label="Assuntos" className="mt-2 flex flex-wrap gap-2.5">
            {SUBJECTS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex min-h-12 items-center rounded-full border-2 border-border bg-card px-4 font-bold text-foreground text-xs no-underline hover:bg-muted focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <main className="sz-page flex flex-col gap-12 pt-10 pb-16">
        <HelpSection id="primeiro" title="Primeiro acesso">
          <Answer title="É o meu primeiro acesso. Qual é a minha senha?">
            <p>
              A senha ainda não existe: você cria. Depois da compra, mandamos por e-mail e WhatsApp
              a mensagem de boas-vindas com o botão para criar a senha.
            </p>
            <ol>
              <li>Toque no botão da mensagem.</li>
              <li>Escolha uma senha com 10 caracteres ou mais.</li>
              <li>Volte aqui e entre com o e-mail da compra e a senha.</li>
            </ol>
          </Answer>
          <Answer title="Não encontro a mensagem de boas-vindas">
            <p>
              Procure por “Sistema Zero” na caixa de spam e na aba Promoções. Confira se está
              olhando o e-mail que você usou na compra.
            </p>
            <p>
              Não achou? Use{' '}
              <Link href="/esqueci-senha" className="sz-link">
                Esqueci minha senha
              </Link>
              . O código também serve para criar a primeira senha.
            </p>
          </Answer>
          <Answer title="O botão da mensagem diz que o link não vale">
            <p>
              Cada link funciona uma vez e por um tempo limitado. Se você já criou a senha, é só
              entrar. Se não, peça um código em{' '}
              <Link href="/esqueci-senha" className="sz-link">
                Esqueci minha senha
              </Link>
              .
            </p>
          </Answer>
          <Answer title="Entrei. E agora?">
            <p>
              No Início, toque em <strong>Continuar</strong> no seu curso. A página{' '}
              <strong>Ajuda</strong>, no menu do alto, tem o Como fazer, com o passo a passo de cada
              parte da plataforma.
            </p>
          </Answer>
        </HelpSection>

        <HelpSection id="senha" title="Senha e código">
          <Answer title="Esqueci a senha">
            <ol>
              <li>
                Em Entrar, toque em <strong>Esqueci minha senha</strong>.
              </li>
              <li>
                Digite o e-mail da compra e toque em <strong>Enviar código</strong>.
              </li>
              <li>Digite os 6 números que chegaram no e-mail e a senha nova duas vezes.</li>
            </ol>
            <p>
              Depois disso, a conta sai dos outros aparelhos e você entra de novo com a senha nova.
            </p>
          </Answer>
          <Answer title="O código não chegou">
            <p>
              Olhe o spam e a aba Promoções. Confira se o e-mail foi digitado certo e toque em{' '}
              <strong>Reenviar código</strong>.
            </p>
            <p>Se aparecer “Muitas tentativas”, espere um minuto antes de pedir outro.</p>
          </Answer>
          <Answer title="Dá para entrar sem digitar a senha?">
            <p>
              Dá. Em Entrar, toque em <strong>Com código no e-mail</strong> e use o código de 6
              números. Isso vale depois que a senha foi criada uma vez.
            </p>
          </Answer>
          <Answer title="Aparece “E-mail ou senha incorretos”">
            <p>
              Confira se o teclado está com letras maiúsculas ligadas e toque em{' '}
              <strong>Mostrar</strong> para ver o que foi digitado. Se continuar, crie uma senha
              nova em{' '}
              <Link href="/esqueci-senha" className="sz-link">
                Esqueci minha senha
              </Link>
              .
            </p>
          </Answer>
        </HelpSection>

        <HelpSection id="compra" title="Compra e acesso">
          <Answer title="Paguei e não recebi nada">
            <p>
              A mensagem sai quando o pagamento é confirmado. No Pix, a confirmação é na hora. No
              cartão, quando o banco aprova. Confira o e-mail da compra e o spam.
            </p>
          </Answer>
          <Answer title="Aparece “Conta inativa”">
            <p>
              A conta foi pausada pela equipe. Escreva para o e-mail de atendimento, aqui embaixo,
              para entender o que aconteceu.
            </p>
          </Answer>
        </HelpSection>

        <section
          id="equipe"
          aria-labelledby="ajuda-entrar-equipe"
          className="sz-palco flex scroll-mt-6 flex-wrap items-center gap-8 rounded-[1.2rem] p-8 md:p-10"
        >
          <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-3">
            <h2 id="ajuda-entrar-equipe" className="sz-h2 text-white">
              Ainda não conseguiu? Fale com a equipe
            </h2>
            <p className="m-0">
              Mande um e-mail a partir do endereço que você usou na compra e conte o que aconteceu.
              A mensagem vira um chamado no nosso atendimento, e a resposta chega no seu e-mail.
            </p>
            <p className="m-0">Quem já entrou abre e acompanha os chamados na página Ajuda.</p>
          </div>
          <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-3 rounded-2xl bg-(--topo-borda) p-6">
            <span className="font-bold text-white">E-mail de atendimento</span>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex min-h-12 items-center gap-2.5 break-all font-bold text-(--sz-community-action-light) underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-(--sz-community-action-light) focus-visible:outline-offset-2"
            >
              <Mail aria-hidden="true" className="size-5 flex-none" />
              {SUPPORT_EMAIL}
            </a>
            <span className="text-xs">
              No e-mail, conte o que você tentou e o que apareceu na tela. Se puder, mande uma foto
              da tela.
            </span>
          </div>
        </section>
      </main>
    </div>
  )
}

function HelpSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`ajuda-entrar-${id}`}
      className="flex scroll-mt-6 flex-col gap-5"
    >
      <h2 id={`ajuda-entrar-${id}`} className="sz-h2">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function Answer({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="sz-card flex flex-col gap-3 p-6 [&_ol]:m-0 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-6 [&_p]:m-0">
      <h3 className="sz-h3">{title}</h3>
      {children}
    </article>
  )
}
