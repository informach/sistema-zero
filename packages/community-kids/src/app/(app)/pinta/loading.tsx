/**
 * Esqueleto do Pinta — fallback de Suspense enquanto o Server Component resolve o
 * acesso (`checkPintaAccessReadonly`). Espelha a MOLDURA real do app (a mesma caixa
 * que o `PintaClient` mostra enquanto o pacote carrega) — transição contínua, sem
 * salto de layout. Mesma régua do `PensaLoading`/`EstudioLoading`.
 */
export default function PintaLoading() {
  return (
    <div
      aria-busy="true"
      className="grid min-h-[34rem] w-full flex-1 place-items-center overflow-hidden rounded-2xl border-2 border-border bg-card text-muted-foreground text-sm"
    >
      Carregando o Pinta…
    </div>
  )
}
