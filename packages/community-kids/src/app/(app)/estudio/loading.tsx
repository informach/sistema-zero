import { EMBEDDED_STUDIO_FRAME, EmbeddedAppLoading } from '@/components/kids/embedded-app-loading'

/**
 * Espera do Estúdio enquanto o Server Component resolve o acesso. Cobre também
 * `/estudio/pro/[id]` (o boundary do Next vale para os segmentos filhos).
 *
 * A moldura vem do módulo COMPARTILHADO com o `StudioFullClient` (ver
 * `embedded-app-loading.tsx`) — as duas esperas precisam ser idênticas, senão a
 * troca aparece como um piscar. Não duplique as classes aqui.
 */
export default function EstudioLoading() {
  return <EmbeddedAppLoading label="Carregando o Estúdio…" frame={EMBEDDED_STUDIO_FRAME} />
}
