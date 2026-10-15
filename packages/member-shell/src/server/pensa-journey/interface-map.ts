/**
 * O que os guias do Pensa precisam dizer e que NÃO é bloco (full review de 14/10/2026).
 *
 * ⚠️⚠️ Cada rótulo daqui foi conferido no código das ferramentas, e é por isso que a lista é curta:
 * - Estúdio: o botão "⋯" tem o nome "Mais opções" (`topbar.more`); "Extensões" mora no grupo
 *   "O meu jogo" (`topbar.extensions`, `menuLayout.ts`) e abre "Extensões oficiais", em que cada
 *   cartão tem "Instalar" e depois "Instalada" (`extensions.install`/`.installed`, pt-BR.ts);
 *   "Imagens" e "Modelos 3D" ficam no grupo "Materiais"; "🎨 Trazer do Pinta" e "🧊 Trazer do
 *   Molda" (`pintaImport.button`/`moldaImport.button`); a pré-visualização tem "▶ Reproduzir",
 *   "⏹ Parar" e "⟳ Atualizar" (`PreviewIframe.tsx`), e o olhinho "Mostrar pré-visualização".
 * - Pinta: o foguete "Usar no Estúdio" (`sendToStudio`, `pinta/src/core/copy.ts`).
 * Mudou um rótulo lá? Mude aqui (os nomes das extensões têm teste que lê os manifestos).
 */

/** O nome do cartão de cada extensão na janela "Extensões oficiais" (o `name` do manifesto). */
export const STUDIO_EXTENSION_NAMES: Readonly<Record<string, string>> = {
  'game-2d': 'Jogo 2D',
  'game-2d-advanced': 'Jogo 2D Avançado',
  'game-3d': 'Jogo 3D',
  'game-3d-advanced': 'Jogo 3D Avançado',
  'world-3d': 'Mundo 3D',
}

/**
 * As áreas do projeto como a criança as vê: o rótulo do bloco da área na categoria
 * "🗂️ Áreas do projeto" (o teste confere contra o catálogo do Estúdio).
 */
export const STUDIO_AREA_NAMES: Readonly<Record<string, string>> = {
  structure: '🧱 Estrutura',
  appearance: '🎨 Aparência',
  molds: '🧩 Meus moldes',
  start: '⚙️ Ao iniciar',
  events: '⚡ Quando acontecer',
  loops: '🔁 Enquanto estiver rodando',
}

/**
 * As extensões DONAS do palco: um jogo usa UMA só, e o Estúdio recusa instalar a segunda (espelho de
 * `FULLSCREEN_RUNTIME_EXTENSION_IDS`, `studio/src/official-extensions/fullscreenConflicts.ts`; o
 * teste lê aquele arquivo pelo caminho).
 */
export const GAME_RUNTIME_EXTENSION_IDS: readonly string[] = [
  'game-2d',
  'game-2d-advanced',
  'game-3d',
  'game-3d-advanced',
  'world-3d',
]
export const isGameRuntimeExtension = (id: string) => GAME_RUNTIME_EXTENSION_IDS.includes(id)

export const STUDIO_INTERFACE_MAP = `MAPA DA INTERFACE (rótulos reais que não são blocos; use exatamente estes nomes nos passos):
- O Guia do Pensa aparece DENTRO do Estúdio, com o jogo já aberto. Nunca escreva passo de abrir o Estúdio nem de abrir o jogo.
- Estúdio, a tela: à esquerda fica a paleta (as categorias de blocos); o espaço grande ao lado dela é o espaço de montar, onde os blocos são montados. Chame-o sempre de "espaço de montar".
- Estúdio, áreas do projeto: as áreas são BLOCOS. Para usar uma, clique na categoria "🗂️ Áreas do projeto" da paleta, pegue o bloco da área (${Object.values(STUDIO_AREA_NAMES).join(', ')}) e arraste para o espaço de montar. Cada área existe uma vez só no jogo: se ela já está no espaço de montar, use a que está lá. Nunca escreva "vá para a área" nem "abra a área".
- Estúdio, pegar um bloco: clique na categoria da paleta e nas subcategorias, na ordem do path do bloco (por exemplo "Jogo 2D", depois "Sprites"), pegue o bloco pelo nome e arraste até ele encaixar dentro da área certa (ou dentro do bloco certo). Também dá para achar o bloco pelo "🔎 Pesquisar", digitando o nome dele.
- Estúdio, rodar o jogo: na pré-visualização, "▶ Reproduzir" (vira "⏹ Parar"); "⟳ Atualizar" roda de novo. Se a pré-visualização sumiu, o olhinho "Mostrar pré-visualização" no alto.
- Estúdio, extensões: cada jogo usa UMA extensão de jogo só (${Object.values(STUDIO_EXTENSION_NAMES).join(', ')}): o Estúdio não deixa instalar duas no mesmo jogo. Instalar é o botão "⋯" (Mais opções) no alto, "Extensões", e no cartão da extensão "Instalar". O sistema já coloca esse passo na primeira missão que precisa da extensão: não escreva passo de instalar.
- Estúdio, desenho do Pinta: "⋯" (Mais opções), "Imagens", "🎨 Trazer do Pinta".
- Estúdio, criação do Molda: "⋯" (Mais opções), "Modelos 3D", "🧊 Trazer do Molda".
- Estúdio, arte de uma colega: "⋯" (Mais opções), "Imagens" ou "Modelos 3D", "Trazer da equipe". Só aparece para quem programa quando alguém da equipe terminou uma arte numa missão.
- Pinta: no fim do desenho para o jogo, o foguete "Usar no Estúdio" leva o desenho para o Estúdio.`

export interface InstallStep {
  id: string
  text: string
  hint: string
  required: false
}

/** O passo determinístico de instalar uma extensão (o projeto do plano nasce sem nenhuma). */
export function extensionInstallStep(extensionId: string): InstallStep {
  const name = STUDIO_EXTENSION_NAMES[extensionId] ?? extensionId
  return {
    id: `install-${extensionId.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`.slice(0, 100),
    text: `Clique no botão ⋯ (Mais opções), no alto do Estúdio, escolha "Extensões" e, no cartão ${name}, aperte "Instalar".`,
    hint: `Isso coloca os blocos do ${name} na paleta. Se o cartão já mostra "Instalada", pode pular este passo.`,
    required: false,
  }
}

/**
 * Em que missão entra cada passo de instalar: a PRIMEIRA missão do Estúdio, na ordem do plano, que
 * usa uma extensão. Como o arquivo do jogo é um só por plano, instalar uma vez basta.
 * ⚠️ Extensão de JOGO entra uma vez só no plano inteiro: o Estúdio recusa a segunda (o planejador
 * já recusa a proposta que mistura duas; isto protege um plano antigo de mandar instalar o que não
 * instala).
 */
export function installStepsByMission(
  missions: readonly { key: string; destination: string; extensionIds: readonly string[] }[],
): Map<string, InstallStep[]> {
  const seen = new Set<string>()
  let game: string | null = null
  const steps = new Map<string, InstallStep[]>()
  for (const mission of missions) {
    if (mission.destination !== 'studio') continue
    const fresh = mission.extensionIds.filter((id) => {
      if (seen.has(id)) return false
      if (isGameRuntimeExtension(id)) {
        if (game) return false
        game = id
      }
      return true
    })
    for (const id of fresh) seen.add(id)
    if (fresh.length) steps.set(mission.key, fresh.map(extensionInstallStep))
  }
  return steps
}
