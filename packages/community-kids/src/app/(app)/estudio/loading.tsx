/**
 * Esqueleto do Estúdio — fallback de Suspense do Next enquanto o Server Component
 * resolve o acesso (`checkStudioAccessReadonly`). Espelha a MOLDURA real do editor
 * (a mesma caixa que o `StudioFullClient` mostra enquanto o pacote pesado carrega),
 * em vez do grid de cards genérico do `(app)/loading.tsx` — assim a transição
 * esqueleto → editor é contínua, sem o "salto" de um layout sem relação com o
 * conteúdo. Preenche a altura (o `<main>` do `/estudio` é `flex flex-col` de largura
 * e altura totais — ver `MainContainer`).
 */
export default function EstudioLoading() {
  return (
    <div
      aria-busy="true"
      className="grid min-h-[34rem] w-full flex-1 place-items-center overflow-hidden rounded-2xl border-2 border-border bg-card text-muted-foreground text-sm"
    >
      Carregando o Estúdio…
    </div>
  )
}
