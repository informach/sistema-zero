import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { createRoot } from 'react-dom/client'
import { CommerceCard } from '../src/components/commerce/commerce-card'
import { PendingPurchases } from '../src/components/commerce/pending-purchases'

const root = document.getElementById('root')
if (!root) throw new Error('Prévia sem raiz')
const router = {
  back() {},
  forward() {},
  refresh() {},
  hmrRefresh() {},
  push() {},
  replace() {},
  prefetch: async () => {},
}
const gift = location.search.includes('gift')
createRoot(root).render(
  <AppRouterContext.Provider value={router}>
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-5 sm:p-10">
      <h1 className="sz-display text-3xl">Área dos pais</h1>
      <p className="text-muted-foreground">Para sua família continuar criando.</p>
      {location.search.includes('pending') ? (
        <PendingPurchases />
      ) : (
        <CommerceCard
          mode={gift ? 'gift' : 'purchase'}
          origin={{
            kind: 'promotion',
            offerRef: gift
              ? 'cade-presente'
              : location.search.includes('monthly')
                ? 'comunidade-mensal'
                : 'comunidade-anual',
          }}
          title={gift ? 'Seu próximo jogo começa aqui' : 'Comunidade dos Criadores'}
          description={
            gift
              ? 'Um presente para vocês criarem juntos.'
              : 'Aulas, ferramentas e acompanhamento para transformar ideias em jogos.'
          }
          buttonLabel={gift ? 'Ativar presente' : 'Assinar a comunidade'}
        />
      )}
    </main>
  </AppRouterContext.Provider>,
)
