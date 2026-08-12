import type { JSX } from 'react'

/**
 * Estados de carregamento reusáveis e acessíveis. `LoadingScreen` é o feedback
 * genérico (ex.: carregando o projeto); `EditorSkeleton` imita a barra de abas +
 * área de código para o fallback do Suspense enquanto o chunk do modo é avaliado
 * — assim o usuário NUNCA vê uma tela congelada/em branco durante a navegação.
 */

const SKELETON_LINES = ['w-3/5', 'w-2/5', 'w-4/5', 'w-1/2', 'w-3/4', 'w-1/3', 'w-2/3'].map(
  (w, i) => ({ w, delay: i * 80 }),
)

export function Spinner({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-block animate-spin rounded-full border-2 border-sz-border border-t-sz-accent motion-reduce:animate-none',
        className ?? 'h-6 w-6',
      ].join(' ')}
    />
  )
}

export function LoadingScreen({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-sz-bg text-sz-fg-soft">
      <Spinner />
      {/* <output> é a região "status" semântica (aria-live=polite implícito). */}
      <output aria-busy="true" className="text-sm">
        {message}
      </output>
    </div>
  )
}

export function EditorSkeleton({ message }: { message: string }): JSX.Element {
  return (
    <div aria-busy="true" className="flex h-full w-full flex-col bg-sz-bg">
      {/* Barra de abas fantasma */}
      <div className="flex items-center gap-2 border-b border-sz-border bg-sz-panel px-3 py-2">
        <div className="h-4 w-20 animate-pulse rounded bg-sz-border motion-reduce:animate-none" />
        <div className="h-4 w-16 animate-pulse rounded bg-sz-border/70 motion-reduce:animate-none" />
        <div className="h-4 w-16 animate-pulse rounded bg-sz-border/50 motion-reduce:animate-none" />
      </div>
      {/* Linhas de código fantasma */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {SKELETON_LINES.map((line) => (
          <div
            key={line.w}
            className={`h-3.5 ${line.w} animate-pulse rounded bg-sz-border/60 motion-reduce:animate-none`}
            style={{ animationDelay: `${line.delay}ms` }}
          />
        ))}
      </div>
      <output className="sr-only">{message}</output>
    </div>
  )
}
