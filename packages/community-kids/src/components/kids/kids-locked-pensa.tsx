import { Lock } from 'lucide-react'
import { KidsMascot } from './mascot'

/**
 * Tela do Pensa BLOQUEADO (sem o produto): o item aparece no menu, mas a criança
 * ainda não tem acesso. Recado gentil (sem link de venda — kids não tem funil; o
 * responsável adquire e libera). Espelha o `KidsLockedStudio`.
 */
export function KidsLockedPensa() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">Pensa</h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 text-muted-foreground">
        O Pensa é onde você planeja seu jogo antes de construir: a ideia, as telas, as missões,
        tudo! 💡✨ Ele ainda não está liberado pra você. Peça pra um responsável dar uma olhada e,
        quando liberar, ele aparece aqui prontinho pra pensar junto com você.
      </p>
    </div>
  )
}
