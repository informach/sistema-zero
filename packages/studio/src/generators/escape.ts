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
 * Neutraliza TRÊS sequências que o tokenizer HTML reconhece dentro de
 * `<script>…</script>`:
 *  - `</script` (FECHAMENTO) — encerraria o elemento cedo;
 *  - `<!--` e `<script` (ABERTURAS do "script data double escaped") — `<!--`
 *    seguido de `<script` põe o tokenizer no estado de DUPLO-ESCAPE, no qual o
 *    `</script>` REAL do gerador NÃO fecha mais o elemento (só transiciona de
 *    volta), e todo o resto do documento passa a ser lido como script.
 *    Neutralizar a abertura `<script` impede entrar nesse estado.
 *
 * A barra invertida é transparente para a maioria do JS (`<\/script` ≡
 * `</script` numa string ou regex). ⚠️ LIMITAÇÃO conhecida: dentro de um REGEX
 * literal do aluno, `/<!--/u` vira `/<\!--/u` (SyntaxError sob a flag `u`) e
 * `/<script>/` muda de significado. Por isso o preview NÃO usa mais esta função
 * para o JS do aluno: TODO o JS do aluno é emitido como script EXTERNO via
 * `data:` URL (ver `preview/bootstrap.ts` — module/clássico/clássico-deferido),
 * que não passa por aqui e preserva o código verbatim. Esta função cobre o
 * `index.html` PERSISTIDO (`generators/html.ts`) e os scripts 1ª-parte do
 * preview (interceptor/permissionGuard/loopGuard/extensões), onde a defesa
 * contra early-close/duplo-escape pesa mais que esse caso raro de regex.
 */
export function escapeScriptContent(code: string): string {
  return code
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    .replace(/<script/gi, '<\\script')
}

/** Escapa o conteúdo de um `<style>` inline (neutraliza o fechamento `</style`). */
export function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}
