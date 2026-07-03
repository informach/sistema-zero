import { Lock } from 'lucide-react'
import { KidsMascot } from './mascot'

/**
 * Tela do Pinta BLOQUEADO (sem o produto): o item aparece no menu, mas a criança
 * ainda não tem acesso. Recado gentil (sem link de venda — kids não tem funil; o
 * responsável adquire e libera). Espelha o `KidsLockedPensa`/`KidsLockedStudio`.
 */
export function KidsLockedPinta() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">Pinta</h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 text-muted-foreground">
        O Pinta é onde você desenha os personagens, cenários e peças dos seus jogos: pixel art,
        animações e muito mais! 🎨✨ Ele ainda não está liberado pra você. Peça pra um responsável
        dar uma olhada e, quando liberar, ele aparece aqui prontinho pra desenhar com você.
      </p>
    </div>
  )
}
