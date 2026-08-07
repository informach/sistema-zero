import type { JSX } from 'react'
import { cn } from '#ui'
import { useStudioLayout } from '../../studio/layoutContext'
import { useStudioTutor } from '../../studio/tutor'
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '../../ui-internal/ErrorBoundary'
import { ZappyPanel } from './ZappyPanel'

/**
 * ⚠️ ESTE ARQUIVO EXISTE POR UMA REGRA: um erro do Zappy NÃO pode derrubar o
 * Estúdio.
 *
 * O tutor era o único painel grande sem rede de proteção — `ExtensionsPanel` e
 * `AssetsPanel` já tinham a sua (ver `Shell.tsx`), o Zappy não. Qualquer throw
 * dele subia até a boundary RAIZ do `StudioCore` e trocava a IDE inteira pela
 * tela "Algo deu errado", com o jogo da criança fora do ar por causa de uma
 * conversa. Relato real da dona do produto (08/2026).
 *
 * A diferença que isto faz é a diferença entre "o Zappy falhou" e "perdi o meu
 * jogo": aqui o erro fica DENTRO do painel do tutor, e o editor, os blocos, o
 * preview e o trabalho dela seguem intactos.
 */

/**
 * Fallback com a MOLDURA do painel (mesmas classes de posicionamento do
 * `ZappyPanel`) — um fallback de seção genérico apareceria solto no meio do
 * editor, já que o tutor é um painel `absolute` e não um bloco no fluxo.
 */
function TutorErrorFallback({
  reset,
  onClose,
  isNarrow,
}: ErrorBoundaryFallbackProps & { onClose: () => void; isNarrow: boolean }): JSX.Element {
  return (
    <aside
      role="alert"
      className={cn(
        'absolute z-[75] flex flex-col border-sz-border bg-sz-panel text-sz-fg shadow-2xl',
        isNarrow
          ? 'inset-x-2 bottom-2 top-[4.25rem] rounded-2xl border'
          : 'bottom-0 right-0 top-[3.25rem] w-[min(26rem,42%)] border-l',
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-bold text-base">O Zappy tropeçou aqui</p>
        {/* O que a criança precisa ouvir primeiro é que o jogo dela está a
            salvo — o susto é a tela de erro, não a perda. */}
        <p className="max-w-xs text-sm text-sz-fg-soft">
          Seu jogo está do jeitinho que você deixou. Foi só a conversa que travou.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-sz-accent px-3 py-2 font-semibold text-sm text-sz-bg hover:opacity-90"
          >
            Tentar de novo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm text-sz-fg-mute hover:bg-sz-bg"
          >
            Fechar o Zappy
          </button>
        </div>
      </div>
    </aside>
  )
}

export function ZappyPanelBoundary({
  onError,
}: {
  /** Telemetria do host: sem isto, um crash do tutor morre num console.error. */
  onError?: (error: Error) => void
}): JSX.Element {
  const { open, setOpen } = useStudioTutor()
  const { isNarrow } = useStudioLayout()
  return (
    <ErrorBoundary
      label="zappy"
      // Fechar e reabrir o Zappy limpa o erro sozinho — é o gesto que a própria
      // copy do fallback sugere, e o que a criança faria por instinto.
      resetKeys={[open]}
      onError={onError}
      fallback={(props) =>
        // ⚠️ Com o tutor FECHADO o recado não pode aparecer. O `ZappyPanel` só
        // devolve `null` DEPOIS de rodar os hooks dele (seletores de logs, de
        // diagnóstico, a varredura das mensagens), então ele consegue lançar com
        // o painel fechado — e sem esta guarda o erro abria, sozinho, um painel
        // grande por cima do editor que a criança nunca pediu. Fechado, o erro
        // fica contido em silêncio; abrir o Zappy troca o `resetKeys` e a
        // tentativa recomeça do zero.
        open ? (
          <TutorErrorFallback
            {...props}
            isNarrow={isNarrow}
            onClose={() => {
              props.reset()
              setOpen(false)
            }}
          />
        ) : null
      }
    >
      <ZappyPanel />
    </ErrorBoundary>
  )
}
