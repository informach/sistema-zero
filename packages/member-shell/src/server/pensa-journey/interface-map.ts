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

export const STUDIO_INTERFACE_MAP = `MAPA DA INTERFACE (rótulos reais que não são blocos; use exatamente estes nomes nos passos):
- Estúdio, rodar o jogo: na pré-visualização, "▶ Reproduzir" (vira "⏹ Parar"); "⟳ Atualizar" roda de novo. Se a pré-visualização sumiu, o olhinho "Mostrar pré-visualização" no alto.
- Estúdio, extensões: botão "⋯" (Mais opções) no alto, "Extensões", e no cartão da extensão "Instalar". O sistema já coloca esse passo na primeira missão que precisa da extensão: não escreva passo de instalar.
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
    text: `Instale a extensão ${name}`,
    hint: `No Estúdio, toque no botão ⋯ (Mais opções), escolha "Extensões" e, no cartão ${name}, aperte "Instalar".\nOs blocos do ${name} aparecem na paleta. Se o cartão já mostra "Instalada", pode pular este passo.`,
    required: false,
  }
}

/**
 * Em que missão entra cada passo de instalar: a PRIMEIRA missão do Estúdio, na ordem do plano, que
 * usa uma extensão. Como o arquivo do jogo é um só por plano, instalar uma vez basta.
 */
export function installStepsByMission(
  missions: readonly { key: string; destination: string; extensionIds: readonly string[] }[],
): Map<string, InstallStep[]> {
  const seen = new Set<string>()
  const steps = new Map<string, InstallStep[]>()
  for (const mission of missions) {
    if (mission.destination !== 'studio') continue
    const fresh = mission.extensionIds.filter((id) => !seen.has(id))
    for (const id of fresh) seen.add(id)
    if (fresh.length) steps.set(mission.key, fresh.map(extensionInstallStep))
  }
  return steps
}
