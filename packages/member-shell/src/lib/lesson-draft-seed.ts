/**
 * Qual versão o Estúdio ou o Pinta da fase abre, quando o rascunho também mora na conta
 * (10/10/2026). Pura, e por isso testável caso a caso: é a regra que decide se a criança vê o
 * trabalho de outro computador ou o deste.
 *
 * A decisão dela: abre a versão MAIS NOVA, e a outra fica guardada neste computador (o bloco a
 * traz de volta por "Outra versão"). A criança não escolhe nada na abertura.
 *
 * As três fontes:
 * - `local`: o rascunho deste navegador;
 * - `cloud`: o rascunho guardado na conta (subido por qualquer aparelho);
 * - `submission`: o último envio à equipe.
 *
 * ⚠️ O relógio que compara é o do SERVIDOR: a conta e o envio já vêm nele, e o local é convertido
 * pela diferença medida na hora (`skewMs`). Relógio de aparelho de criança é o primeiro a mentir.
 *
 * ⚠️ Um envio sem impressão digital (anterior a 10/10/2026) nunca passa por cima de um rascunho
 * local: era a regra de antes, e mudar isso agora encheria de "outra versão" quem só abriu a aula.
 */

export interface DraftSource {
  /** `updatedAt` (local) ou hora do servidor (conta/envio), em ms. */
  at: number
  fingerprint: string | null
}

export interface DraftSeedInput {
  local: DraftSource | null
  /** O que este aparelho confirmou com a conta (`null` = nunca). */
  mark: { revision: number; updatedAt: number } | null
  cloud: (DraftSource & { revision: number }) | null
  submission: DraftSource | null
  /** Hora do servidor menos hora deste aparelho (ms). */
  skewMs: number
}

export type DraftSeedDecision =
  /** Abre o local. `upload`: ele mudou desde a última subida. `backupCloud`: a da conta vira a "outra". */
  | { open: 'local'; upload: boolean; backupCloud: boolean; adoptRevision: number | null }
  /** Abre a versão da conta; `backupLocal`: a daqui vira a "outra". */
  | { open: 'cloud'; backupLocal: boolean }
  /** Abre o último envio; `backupLocal`: a daqui vira a "outra". */
  | { open: 'submission'; backupLocal: boolean }
  /** Nada guardado: segue a ordem de sempre (aula anterior da cadeia, depois o projeto inicial). */
  | { open: 'fallback' }

const iguais = (a: DraftSource | null, b: DraftSource | null) =>
  Boolean(a?.fingerprint && b?.fingerprint && a.fingerprint === b.fingerprint)

export function decideLessonDraftSeed(input: DraftSeedInput): DraftSeedDecision {
  const { local, mark, cloud, submission } = input
  // O envio só compete quando é mais novo que o rascunho da conta (senão a conta já o contém) e
  // quando tem impressão (ver o cabeçalho).
  const envioValido =
    submission?.fingerprint && (!cloud || submission.at > cloud.at) ? submission : null

  if (!local) {
    if (cloud && envioValido && !iguais(cloud, envioValido) && envioValido.at > cloud.at)
      return { open: 'submission', backupLocal: false }
    if (cloud) return { open: 'cloud', backupLocal: false }
    if (submission) return { open: 'submission', backupLocal: false }
    return { open: 'fallback' }
  }

  const localMudou = !mark || local.at !== mark.updatedAt
  const contaMudou = Boolean(cloud && (!mark || cloud.revision !== mark.revision))
  const localNoServidor = local.at + input.skewMs

  // O concorrente mais novo de fora deste aparelho.
  const candidatos: Array<{ fonte: 'cloud' | 'submission'; source: DraftSource }> = []
  if (cloud && contaMudou) candidatos.push({ fonte: 'cloud', source: cloud })
  if (envioValido && !iguais(envioValido, local)) {
    if (!cloud || !iguais(envioValido, cloud))
      candidatos.push({ fonte: 'submission', source: envioValido })
  }
  const remoto = candidatos.sort((a, b) => b.source.at - a.source.at)[0]

  const adotar = cloud && contaMudou ? cloud.revision : null
  if (!remoto)
    return { open: 'local', upload: localMudou, backupCloud: false, adoptRevision: adotar }
  // O mesmo conteúdo dos dois lados não é conflito: só passa a conhecer a revisão da conta.
  if (iguais(remoto.source, local))
    return {
      open: 'local',
      upload: localMudou && !iguais(cloud, local),
      backupCloud: false,
      adoptRevision: adotar,
    }

  // Este aparelho não mexeu desde a última conversa com a conta: a versão de fora é a continuação.
  if (!localMudou) return { open: remoto.fonte, backupLocal: false }

  // Os dois mudaram: abre o mais novo, o outro vira a "outra versão".
  if (remoto.source.at > localNoServidor) return { open: remoto.fonte, backupLocal: true }
  return {
    open: 'local',
    upload: true,
    backupCloud: remoto.fonte === 'cloud',
    adoptRevision: adotar,
  }
}
