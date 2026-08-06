import { EmbeddedAppLoading } from '@/components/kids/embedded-app-loading'

/**
 * Espera do Pinta enquanto o Server Component resolve o acesso.
 *
 * A moldura vem do módulo COMPARTILHADO com o `PintaClient` (ver
 * `embedded-app-loading.tsx`) — as duas esperas precisam ser idênticas, senão a
 * troca aparece como um piscar. Não duplique as classes aqui.
 */
export default function PintaLoading() {
  return <EmbeddedAppLoading label="Carregando o Pinta…" />
}
