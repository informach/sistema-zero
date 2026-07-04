import { Lock } from 'lucide-react'
import { KidsMascot } from './mascot'

/** Gostinho do que a criança encontra no Estúdio quando liberar. */
const PREVIEW = [
  { emoji: '🧩', text: 'Monte jogos com blocos que viram código' },
  { emoji: '🎮', text: 'Teste e jogue o que você criou' },
  { emoji: '🚀', text: 'Compartilhe as suas criações' },
] as const

/**
 * Tela do Estúdio Completo BLOQUEADO (sem o produto): o item aparece no menu, mas a
 * criança ainda não tem acesso. Recado gentil + prévia do que tem dentro (sem link de
 * venda; o responsável adquire e libera). Espelha o `KidsLockedClube`.
 */
export function KidsLockedStudio() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">
        Estúdio Completo
      </h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 text-muted-foreground">
        O Estúdio Completo é onde você cria os seus próprios jogos e apps, do seu jeito! 🎮✨
      </p>

      <ul className="mt-5 flex w-full flex-col gap-2 text-left">
        {PREVIEW.map((item) => (
          <li
            key={item.text}
            className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              {item.emoji}
            </span>
            <span className="font-medium text-sm">{item.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-muted-foreground text-sm">
        Peça pra um responsável dar uma olhada. Quando liberar, ele aparece aqui pra você criar à
        vontade!
      </p>
    </div>
  )
}
