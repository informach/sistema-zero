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
 * Além do fechamento `</script` (que encerraria o elemento), neutraliza também
 * a ABERTURA da escalada de duplo-escape do tokenizer HTML: um corpo com `<!--`
 * seguido de `<script` move o parser para o estado "script data double escaped",
 * onde um `</script` deixa de fechar o elemento. Inserir a barra invertida em
 * `<!--` e `<script` impede o parser de entrar nesse estado, mantendo a
 * semântica do JS intacta (`<\!--` ≡ `<!--`, `<\script` ≡ `<script`).
 */
export function escapeScriptContent(code: string): string {
  return code
    .replace(/<!--/g, '<\\!--')
    .replace(/<script/gi, '<\\script')
    .replace(/<\/script/gi, '<\\/script')
}

/** Escapa o conteúdo de um `<style>` inline (neutraliza o fechamento `</style`). */
export function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}
