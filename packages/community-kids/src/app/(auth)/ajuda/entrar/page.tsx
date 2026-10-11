import Link from 'next/link'
import { AUTH_CARD } from '@/components/kids/auth-card'

/** Cada pergunta com alvo de toque de 44px; o marcador nativo do `<details>` continua. */
const SUMMARY = 'min-h-11 cursor-pointer py-2.5 font-bold'
const ITEM = 'rounded-xl border border-border px-4 pb-2'

/**
 * Ajuda de entrada, sem login. Os nomes em negrito são os rótulos REAIS das telas; o que não
 * é botão não aparece como se fosse.
 */
export default function EntryHelpPage() {
  return (
    <article className={`${AUTH_CARD} space-y-5 p-6 sm:p-8`}>
      <h1 className="sz-display text-3xl">Ajuda para entrar</h1>
      <section>
        <h2 className="sz-display text-xl">Como entro para criar?</h2>
        <p className="mt-2 text-sm">
          Clique em <strong>Eu sou criador(a)</strong>. Se o seu nome aparecer, clique nele. Na
          primeira vez neste navegador, digite o código que seu responsável preparou para você.
        </p>
        <p className="mt-2 text-sm">
          Terminou por hoje? É só fechar a página. Se clicar em <strong>Sair</strong> e depois em{' '}
          <strong>Sair deste aparelho</strong>, você vai precisar de outro código.
        </p>
      </section>
      <section>
        <h2 className="sz-display text-xl">Sou responsável. Como preparo?</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Clique em <strong>Eu sou responsável</strong> e entre com sua senha ou com o código
            enviado ao seu e-mail.
          </li>
          <li>
            Na Área dos pais, encontre a criança. Se ela ainda não tem perfil, use{' '}
            <strong>Adicionar criança</strong>.
          </li>
          <li>
            Clique em <strong>Acesso nos aparelhos</strong> e depois em{' '}
            <strong>Autorizar aparelho</strong>.
          </li>
          <li>
            Escolha <strong>Neste aparelho</strong> ou <strong>Em outro aparelho</strong>, dê um
            nome ao aparelho e escolha <strong>Por quanto tempo?</strong>. A data de término aparece
            antes de você confirmar.
          </li>
          <li>
            Neste aparelho: clique em <strong>Autorizar este aparelho</strong>. Quando a criança for
            usar o computador, clique em <strong>Ir para a área da criança</strong>. Isso fecha seu
            acesso de responsável.
          </li>
          <li>
            Em outro aparelho: clique em <strong>Gerar código</strong> e em <strong>Copiar</strong>.
            No computador da criança, abra o endereço mostrado junto do código e deixe a criança
            digitar. O código vale por 10 minutos e libera um único navegador. Depois clique em{' '}
            <strong>Conferir se a criança já entrou</strong>.
          </li>
        </ol>
      </section>
      <details className={ITEM}>
        <summary className={SUMMARY}>O código não funcionou</summary>
        <p className="mt-1 text-sm">
          Confira as letras. O código pode ter vencido, já ter sido usado em outro aparelho ou
          pertencer a outro perfil. Peça ao responsável para gerar um novo código para você. Não é
          preciso usar a senha dele.
        </p>
      </details>
      <details className={ITEM}>
        <summary className={SUMMARY}>Antes eu entrava. Agora pede código</summary>
        <p className="mt-1 text-sm">
          A entrada das crianças mudou: o responsável prepara o acesso uma vez em cada computador. O
          prazo também pode ter terminado ou o responsável pode ter encerrado o acesso. Isso
          acontece ainda ao trocar de navegador, limpar os cookies ou usar uma janela anônima. Seu
          progresso continua guardado no seu perfil.
        </p>
      </details>
      <details className={ITEM}>
        <summary className={SUMMARY}>Dois irmãos usam o mesmo computador</summary>
        <p className="mt-1 text-sm">
          O responsável autoriza cada perfil separadamente. Por exemplo: André e Débora usam o
          computador de casa. Em <strong>Acesso nos aparelhos</strong> do André e depois no da
          Débora, o responsável autoriza o mesmo computador. São dois acessos, cada um com o seu
          prazo, e encerrar o do André não muda o da Débora.
        </p>
        <p className="mt-2 text-sm">
          No dia a dia, use <strong>Trocar de perfil</strong> no menu do avatar. Se um irmão ainda
          não tem acesso nesse navegador, ele vai precisar do próprio código.
        </p>
      </details>
      <details className={ITEM}>
        <summary className={SUMMARY}>Quero renovar ou encerrar um acesso</summary>
        <p className="mt-1 text-sm">
          Entre como responsável e clique em <strong>Acesso nos aparelhos</strong> da criança. Em
          cada aparelho, <strong>Renovar prazo</strong> mostra a data atual e a nova antes de
          confirmar, e <strong>Encerrar acesso</strong> tira a entrada daquele perfil naquele
          navegador, sem mudar os irmãos e sem apagar o progresso.
        </p>
        <p className="mt-2 text-sm">
          Um acesso encerrado não volta. Para usar o aparelho de novo, clique em{' '}
          <strong>Autorizar aparelho</strong> outra vez.
        </p>
      </details>
      <details className={ITEM}>
        <summary className={SUMMARY}>Perdi minha senha de responsável</summary>
        <p className="mt-1 text-sm">
          Você pode entrar com um código enviado ao seu e-mail. Para criar outra senha, use{' '}
          <Link href="/esqueci-senha" className="underline">
            Esqueci minha senha
          </Link>
          .
        </p>
      </details>
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
      >
        Voltar à escolha de entrada
      </Link>
    </article>
  )
}
