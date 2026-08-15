/**
 * APRESENTAÇÃO das famílias da caixa de ferramentas do Estúdio.
 *
 * "Família" é o topo do caminho da paleta (`palettePath[0]`) — literalmente a categoria que a
 * criança já lê dentro do editor. Ela entrou na tela porque os nomes de GAVETA se repetem entre
 * extensões: `🔊 Som` existe em quatro famílias, `🎨 Aparência` e `🔤 Texto` em três. Sem o topo,
 * a criança via uma pílula só, com a contagem somada, e nunca saberia que abriu uma caixa nova.
 *
 * ⚠️ Aqui só mora o EMOJI. O nome vem do catálogo em runtime, então uma família nova (uma
 * extensão que ainda nem existe) aparece sozinha, com o nome puro — mesma tolerância do
 * `badgeInfo()` devolvendo `null` para slug desconhecido. Nunca esconda uma família só porque
 * ela não está neste mapa: a criança perderia uma conquista real.
 *
 * ⚠️ Não confundir com o DEGRAU do curso ("Iniciante 2D"), que é vocabulário da EQUIPE e não
 * pode aparecer para a criança (ver `tests/copy-vocabulario.test.ts`). Estes nomes são os da
 * paleta do editor, que ela já vê todo dia.
 */
const FAMILY_EMOJI: Record<string, string> = {
  'Jogo 2D': '🎮',
  'Jogo 2D Avançado': '🕹️',
  'Jogo 3D': '🧊',
  'Jogo 3D Avançado': '🛸',
  'Mundo 3D': '🌍',
  Programação: '🧠',
  HTML: '📄',
  CSS: '🎨',
  SVG: '✏️',
  Canvas: '🖌️',
  'Canvas 3D': '🔮',
}

/**
 * O nome da família como a criança lê. Família fora do mapa (ou que já traz emoji própria,
 * como `🗂️ Áreas do projeto`) sai com o nome puro.
 */
export function familyLabel(family: string): string {
  const emoji = FAMILY_EMOJI[family]
  return emoji ? `${emoji} ${family}` : family
}
