/**
 * Neutralização de conteúdo inline de `<script>`/`<style>`.
 *
 * Usado nos DOIS caminhos que embutem código do aluno num documento HTML:
 * - geração do `index.html` persistido (placement inline-head/body-end) em
 *   `html.ts`;
 * - montagem do `srcdoc` do iframe de preview em `preview/bootstrap.ts`.
 *
 * Ambos importam estas funções para que não possam divergir: um código com
 * `</script>` ou `</style>` literal não pode fechar o elemento cedo (corromperia
 * o arquivo e, na Ponte, truncaria o JS a ponto de o Babel falhar e os blocos
 * serem apagados). A barra invertida é transparente para JS/CSS — `<\/script` é
 * lido como `</script` pelo motor de JS, e `<\/style` idem dentro do CSS.
 */

/**
 * Escapa o conteúdo de um `<script>` inline.
 *
 * Neutraliza APENAS a sequência de FECHAMENTO `</script` (case-insensitive) —
 * a única que de fato encerra o elemento `<script>` cedo e corromperia o
 * documento persistido / truncaria o JS na Ponte. A barra invertida é
 * transparente para o JS (`<\/script` ≡ `</script` numa string ou regex), então
 * o conteúdo do aluno continua válido.
 *
 * Por que NÃO mexer em `<!--`/`<script` (aberturas do estado "double escaped"):
 * reescrevê-las QUEBRAVA regex literais legítimos do aluno no script PERSISTIDO
 * — `/<!--/u` virava `/<\!--/u` (SyntaxError sob a flag `u`) e `/<script>/`
 * mudava de significado. O estado de duplo-escape só se ATIVA com um `<!--` e um
 * `<script` CRUS no fluxo, mas para fechar o elemento o parser de fechamento
 * casa `</script`; como já o neutralizamos, o `</script>` REAL do gerador
 * sempre fecha — o documento nunca "escorrega" para dentro do script. Logo,
 * neutralizar só o fechamento é suficiente E preserva os regexes.
 *
 * Esta função cobre o `index.html` PERSISTIDO (`generators/html.ts`) e os
 * scripts 1ª-parte do preview (interceptor/permissionGuard/loopGuard/extensões),
 * que são código nosso e não trazem esses regexes — a narrow é segura para eles.
 * O JS do aluno no preview já é emitido como script EXTERNO via `data:` URL e
 * não passa por aqui.
 */
export function escapeScriptContent(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}

/** Escapa o conteúdo de um `<style>` inline (neutraliza o fechamento `</style`). */
export function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}
