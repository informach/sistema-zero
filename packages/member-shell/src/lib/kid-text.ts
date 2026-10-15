/**
 * O texto que a criança lê não tem travessão (15/10/2026, pedido dela: "a linguagem tem que ser
 * humanizada, sem travessões"). Os modelos escrevem "—" e "–" o tempo todo, mesmo com o pedido no
 * prompt, então a régua mora aqui e roda em TODA saída que vira fala do Zappy ou texto de missão.
 *
 * O que muda, sempre pelo jeito de quem fala:
 * - travessão no meio da frase vira vírgula ("o dragão — que é verde — voa" → "o dragão, que é
 *   verde, voa"); o hífen solto entre espaços, que faz o mesmo papel, também;
 * - travessão abrindo a linha (fala ou item) sai;
 * - intervalo de números vira "a" ("8–13" → "8 a 13").
 * A pontuação que a troca junta (", ." / "( ," / vírgula no fim da linha) é arrumada. O hífen das
 * palavras ("guarda-chuva") e o de conta entre números ("10 - 2") ficam como estão.
 */
const DASH = /[—–]|(?<!\d)\s+-\s+(?!\d)/

export function semTravessao(texto: string): string {
  if (!DASH.test(texto)) return texto
  return texto
    .split('\n')
    .map((linha) =>
      linha
        .replace(/(\d)\s*[—–]\s*(\d)/g, '$1 a $2')
        .replace(/^(\s*)[—–]\s*/, '$1')
        .replace(/\s*[—–]\s*/g, ', ')
        .replace(/(?<!\d)\s+-\s+(?!\d)/g, ', ')
        .replace(/,\s*([,.;:!?…)])/g, '$1')
        .replace(/\(\s*,\s*/g, '(')
        .replace(/([:;])\s*,\s*/g, '$1 ')
        .replace(/^(\s*),\s*/, '$1')
        .replace(/,\s*$/, ''),
    )
    .join('\n')
}

/**
 * Passa o `semTravessao` nos campos de texto de uma resposta do modelo, sem tocar em ids, chaves,
 * blocos ou qualquer string fora de `keys` (nomes de campo, na profundidade que for).
 */
export function semTravessaoNosCampos<T>(value: T, keys: ReadonlySet<string>, key = ''): T {
  if (typeof value === 'string') return (keys.has(key) ? semTravessao(value) : value) as T
  if (Array.isArray(value)) return value.map((item) => semTravessaoNosCampos(item, keys, key)) as T
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, semTravessaoNosCampos(v, keys, k)]),
    ) as T
  return value
}
