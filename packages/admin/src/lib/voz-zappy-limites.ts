/**
 * Os limites da voz do Zappy que o CLIENTE também precisa conhecer.
 *
 * ⚠️⚠️ Moram aqui, e não no `server/voz-zappy.ts`, porque aquele arquivo é `server-only`: o botão
 * do editor não pode importá-lo. Duplicar o número no componente foi exatamente o defeito que este
 * arquivo existe para impedir — o botão loteava de 60 em 60 contra uma rota que aceitava 24, e
 * toda aula grande respondia 400 antes de gerar uma frase sequer.
 */

/**
 * Quantas falas cabem em UM pedido, e o teto é de TEMPO, não de bom senso.
 *
 * O admin fica atrás do Cloudflare, que corta a requisição em ~100 s com um 524 (foi assim que o
 * livro 3D caiu em 07/09/2026). Com 8 frases em paralelo a ~3 s cada, 24 frases novas levam ~9 s.
 * O botão lotea sozinho, então este número não limita o tamanho da aula: limita o tempo de UMA
 * resposta.
 */
export const MAX_TEXTOS_POR_PEDIDO = 24
