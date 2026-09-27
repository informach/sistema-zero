/**
 * Origens dos apps de ALUNO que leem buckets R2 por `fetch()` cross-origin.
 *
 * ⚠️ Mora num módulo próprio porque DOIS scripts de CORS dependem dela
 * (`r2-cors-private.ts` e `r2-cors-public.ts`). Duas listas divergiriam, e o
 * sintoma de uma origem faltando é sempre o mesmo: "No 'Access-Control-Allow-Origin'
 * header is present" no navegador da criança, sem erro nenhum do nosso lado.
 *
 * Os DOIS apps (community adulto + community-kids) × dev/staging/prod + domínios
 * definitivos. Origem que nunca bate num bucket é inócua (só não casa).
 */
export const STUDENT_APP_ORIGINS = [
  'http://localhost:3007', // community (dev)
  'http://localhost:3008', // community-kids (dev)
  'https://community-staging-66f2.up.railway.app', // community (staging)
  'https://community-kids-staging.up.railway.app', // community-kids (staging)
  'https://community-production-4149.up.railway.app', // community (prod, fallback railway)
  'https://community-kids-production.up.railway.app', // community-kids (prod, fallback railway)
  'https://comunidade.sistemazero.com.br', // community (prod, domínio definitivo)
  'https://kids.sistemazero.com.br', // community-kids (prod, domínio definitivo)
]
