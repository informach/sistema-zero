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
 * O que esta função DE FATO neutraliza: APENAS a sequência de FECHAMENTO
 * `</script` (case-insensitive). Ela NÃO toca em `<!--` nem na ABERTURA
 * `<script` — as duas aberturas que ativam o estado "script data double escaped"
 * do parser de HTML. A barra invertida é transparente para o JS
 * (`<\/script` ≡ `</script` numa string ou regex), então o conteúdo do aluno
 * continua válido.
 *
 * Por que isso BASTA para o uso desta função (e por que NÃO mexemos em
 * `<!--`/`<script`): reescrever as aberturas QUEBRARIA regex literais legítimos
 * do aluno no script persistido — `/<!--/u` viraria `/<\!--/u` (SyntaxError sob a
 * flag `u`) e `/<script>/` mudaria de significado. Os clientes desta função são
 * código NOSSO/persistido que não depende do estado de duplo-escape para
 * delimitar o elemento: como o `</script` é sempre neutralizado, o `</script>`
 * REAL do gerador é o único token de fechamento que o parser casa, então o
 * elemento sempre fecha no lugar certo e o documento não "escorrega" para dentro
 * do script. Esta função NÃO é uma sanitização geral contra o estado de
 * duplo-escape para conteúdo arbitrário/adversário — é uma narrow deliberada.
 *
 * Cobre o `index.html` PERSISTIDO (`generators/html.ts`) e os scripts 1ª-parte
 * do preview (interceptor/permissionGuard/loopGuard/extensões), que são código
 * nosso e não trazem esses regexes. O caminho CANÔNICO do JS do aluno no preview
 * EVITA injeção inline por completo: ele é emitido como script EXTERNO via
 * `data:` URL (ver `preview/bootstrap.ts`), não passa por aqui e nunca vira texto
 * dentro de um `<script>` inline.
 */
export function escapeScriptContent(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}

/** Escapa o conteúdo de um `<style>` inline (neutraliza o fechamento `</style`). */
export function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}
