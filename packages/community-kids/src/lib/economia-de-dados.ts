/**
 * O aparelho pediu para economizar dados (plano no limite, "Economia de dados" do
 * Android). O runtime do Rive são ~676 KB (81 KB de JS + 595 KB de WASM) — quem
 * ligou essa chave não está pedindo isso para ver um enfeite se mexer. Só o
 * Chromium/Android implementa, então a ausência da API significa "não sei", e
 * "não sei" anima normalmente.
 *
 * ⚠️ Mora aqui, e não junto de um dos consumidores, porque são DOIS (o Zappy
 * animado e a arte da trilha) e uma segunda cópia é como uma delas apodrece.
 */
export function economiaDeDados(): boolean {
  const conexao = (navigator as { connection?: { saveData?: boolean } }).connection
  return conexao?.saveData === true
}
