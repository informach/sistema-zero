/**
 * A marca de origem de um desenho do Pinta (`sourceRef`: "este desenho é a cópia daquele
 * documento") e os nomes que a compõem. UMA regra para os dois lados, que não se importam
 * (invariante "zero import pinta↔studio"): o Pinta saneia a marca com
 * {@link PINTA_SOURCE_REF_PATTERN} e o Estúdio só reconhece como desenho de jogo de exemplo o
 * jogo/desenho cujo nome passa em {@link PINTA_EXAMPLE_NAME_PATTERN}. Se divergissem (um nome
 * que o Estúdio aceita e a marca não), a cópia nasceria sem a marca e cada "Editar" criaria
 * outra; o teste ao lado confere que todo nome aceito compõe uma marca válida.
 *
 * A marca de um desenho de exemplo é `example-<galeria>:<jogo>/<jogo>-<desenho>`; com os nomes
 * no teto (63) o caminho mede 191, dentro dos 200 da marca.
 */

/** Nome de jogo ou de desenho de exemplo: minúsculas, dígitos, `_` e `-` (até 63). */
export const PINTA_EXAMPLE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/

/** `<origem>:<caminho>`, só ASCII de URL (letras, dígitos, `.`, `_`, `/`, `:` e `-`). */
export const PINTA_SOURCE_REF_PATTERN = /^[a-z][a-z0-9-]{0,31}:[A-Za-z0-9._/:-]{1,200}$/
