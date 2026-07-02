/**
 * Esqueleto do Pensa — fallback de Suspense enquanto o Server Component resolve o
 * acesso (`checkPensaAccessReadonly`). Espelha a MOLDURA real do app (a mesma caixa
 * que o `PensaClient` mostra enquanto o pacote carrega) — transição contínua, sem
 * salto de layout. Ver o `EstudioLoading`, que segue a mesma régua.
 */
export default function PensaLoading() {
  return (
    <div
      aria-busy="true"
      className="grid min-h-[34rem] w-full flex-1 place-items-center overflow-hidden rounded-2xl border-2 border-border bg-card text-muted-foreground text-sm"
    >
      Carregando o Pensa…
    </div>
  )
}
