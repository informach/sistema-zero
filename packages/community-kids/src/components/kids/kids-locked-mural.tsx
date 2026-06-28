import { Lock } from 'lucide-react'
import { KidsMascot } from './mascot'

/**
 * Tela do Mural dos Criadores BLOQUEADO (sem o produto): o item aparece no menu, mas a
 * criança ainda não tem acesso. Recado gentil (sem link de venda — kids não tem funil;
 * o responsável adquire e libera, ou vem de bônus no desafio do 1º jogo). Espelha o
 * `KidsLockedClube`/`KidsLockedStudio`.
 */
export function KidsLockedMural() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">
        Mural dos Criadores
      </h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 text-muted-foreground">
        O Mural dos Criadores é a vitrine onde a galera mostra os jogos que criou! 🎨✨ Ele ainda
        não está liberado pra você — peça pra um responsável dar uma olhada. Quando liberar, ele
        aparece aqui pra você ver e curtir os projetos!
      </p>
    </div>
  )
}
