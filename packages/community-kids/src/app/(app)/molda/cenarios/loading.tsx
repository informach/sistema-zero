import { EmbeddedAppLoading } from '@/components/kids/embedded-app-loading'

/** Espera da oficina de cenários: a mesma moldura do cliente, para a troca não piscar. */
export default function CenariosLoading() {
  return <EmbeddedAppLoading label="Carregando os cenários…" />
}
