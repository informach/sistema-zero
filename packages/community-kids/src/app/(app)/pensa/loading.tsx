import { EmbeddedAppLoading } from '@/components/kids/embedded-app-loading'

/**
 * Espera do Pensa enquanto o Server Component resolve o acesso.
 *
 * A moldura vem do módulo COMPARTILHADO com o `PensaClient` (ver
 * `embedded-app-loading.tsx`): as duas esperas precisam ser idênticas, senão a
 * troca entre elas aparece como um piscar. Não duplique as classes aqui.
 */
export default function PensaLoading() {
  return <EmbeddedAppLoading label="Carregando o Pensa…" />
}
