import { EmbeddedAppLoading } from '@/components/kids/embedded-app-loading'

/**
 * Espera do Molda enquanto o Server Component resolve o acesso.
 *
 * A moldura vem do módulo COMPARTILHADO com o `MoldaClient` (ver
 * `embedded-app-loading.tsx`) — as duas esperas precisam ser idênticas, senão a
 * troca aparece como um piscar. Não duplique as classes aqui.
 */
export default function MoldaLoading() {
  return <EmbeddedAppLoading label="Carregando o Molda…" />
}
