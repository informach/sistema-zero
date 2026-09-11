/**
 * O cartão dos formulários de entrada (entrar, esqueci a senha, redefinir) no desenho
 * das telas-modelo: o `Card` do ui com o raio e o fio dos cartões do kids, sem sombra.
 * O `Card` pinta com utilitárias (`rounded-xl border-border shadow-sm`), então quem
 * ajusta é o `className`: o `.kids-carta`, que mora em camada, perderia para elas.
 */
export const AUTH_CARD = 'w-full rounded-(--raio-carta) border-(--borda-carta) shadow-none'

/** O título do cartão em Baloo, como todo título do app. */
export const AUTH_TITLE = 'sz-display text-2xl'
