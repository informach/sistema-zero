import { sha256Hex } from '@sistemazero/core/creations'
import { studioPortableFileConflict } from '@sistemazero/core/studio/portable-path'
import { pythonProjectLayoutError } from '../../state/pythonProjectLayout'
import { decodeProjectAsset, pythonAssetFileExtension } from '../assetBinary'
import type { ProjectAsset } from '../projectAssets'
import { buildPythonAssetBundle } from '../pythonAssets'
import type { PythonProjectDocument } from '../pythonProject'
import { lerAssetDeCena3D } from './referencias'

export interface FontePythonDoCenario {
  caminho: string
  texto: string
}

export function aplicarFontesPythonDoCenario(
  projeto: PythonProjectDocument,
  assets: ProjectAsset[],
  fontes: readonly FontePythonDoCenario[],
): PythonProjectDocument {
  const arquivos =
      projeto.kind === 'pro'
        ? Object.entries(projeto.tree).flatMap(([p, n]) => (n.kind === 'file' ? [p] : []))
        : Object.keys(projeto.files),
    pastas =
      projeto.kind === 'pro'
        ? Object.entries(projeto.tree).flatMap(([p, n]) => (n.kind === 'dir' ? [p] : []))
        : []
  if (
    fontes.some((f) => !f.caminho.endsWith('.py')) ||
    studioPortableFileConflict([...arquivos, ...fontes.map((f) => f.caminho)], pastas)
  )
    throw Error('O módulo do cenário colide com um arquivo ou pasta. As fontes foram preservadas.')
  const novo: PythonProjectDocument =
    projeto.kind === 'pro'
      ? {
          ...projeto,
          assets,
          tree: {
            ...projeto.tree,
            ...Object.fromEntries(
              fontes.map((f) => [f.caminho, { kind: 'file' as const, content: f.texto }]),
            ),
          },
        }
      : {
          ...projeto,
          assets,
          files: {
            ...projeto.files,
            ...Object.fromEntries(fontes.map((f) => [f.caminho, f.texto])),
          },
        }
  const erro = pythonProjectLayoutError(novo)
  if (erro) throw Error(erro)
  return novo
}

/** Material paths come from the same resolver as snapshot/export; logical scene paths never change. */
export async function prepararFontesPythonDoCenario(
  projeto: PythonProjectDocument,
  assets: ProjectAsset[],
  assetId: string,
  sinal: AbortSignal,
): Promise<{ assets: ProjectAsset[]; fontesPython: FontePythonDoCenario[]; avisos: string[] }> {
  const fontes =
      projeto.kind === 'pro'
        ? Object.fromEntries(
            Object.entries(projeto.tree).flatMap(([p, n]) =>
              n.kind === 'file' ? [[p, n.content]] : [],
            ),
          )
        : projeto.files,
    pastas =
      projeto.kind === 'pro'
        ? Object.entries(projeto.tree).flatMap(([p, n]) => (n.kind === 'dir' ? [p] : []))
        : [],
    porId = new Map(assets.map((a) => [a.id, a])),
    primario = porId.get(assetId)
  if (primario?.kind !== 'scene3d') throw Error('O cenário Python está incompleto.')
  const envelope = lerAssetDeCena3D(primario),
    mapa: Record<string, string> = Object.create(null)
  for (const r of envelope.recursos) {
    const asset = porId.get(r.asset)
    if (!asset) throw Error('Um recurso do cenário Python está ausente.')
    const { mime } = decodeProjectAsset(asset.dataUrl)
    mapa[r.caminho] =
      asset.proPath ??
      `assets/${await sha256Hex(asset.id)}.${pythonAssetFileExtension(mime, asset.kind)}`
    sinal.throwIfAborted()
  }
  const base = projeto.python.entrypoint.slice(0, projeto.python.entrypoint.lastIndexOf('/') + 1),
    anterior = primario.cena3dPython?.modulo,
    ocupados = [...Object.keys(fontes), ...assets.flatMap((a) => (a.proPath ? [a.proPath] : []))]
  if (studioPortableFileConflict(ocupados, pastas))
    throw Error(
      'Há caminhos conflitantes entre o cenário e os arquivos Python. Os arquivos foram preservados.',
    )
  let modulo =
    anterior?.startsWith(base) && anterior.slice(base.length).indexOf('/') < 0
      ? anterior
      : undefined
  if (!modulo) {
    const stem = `cenario_${assetId.slice(0, 20)}`
    for (let i = 1; i <= 999; i++) {
      const candidato = `${base}${stem}${i === 1 ? '' : `_${i}`}.py`
      if (!studioPortableFileConflict([...ocupados, candidato], pastas)) {
        modulo = candidato
        break
      }
    }
  }
  if (!modulo) throw Error('Não encontrei um nome livre para o módulo Python do cenário.')
  const fontesPython: FontePythonDoCenario[] = [],
    primarioComModulo = { ...primario, cena3dPython: { modulo } },
    novos = assets.map((a) => (a.id === assetId ? primarioComModulo : a))
  if (fontes[modulo] === undefined) {
    if (studioPortableFileConflict([...ocupados, modulo], pastas))
      throw Error('O caminho do módulo do cenário está ocupado. Os arquivos foram preservados.')
    const manifesto = primario.proPath ?? `assets/${await sha256Hex(primario.id)}.json`,
      profundidade = base.split('/').filter(Boolean).length
    fontesPython.push({
      caminho: modulo,
      texto: [
        '# Gerado pelo Molda Cenários. Reimportar a mesma revisão preserva suas edições.',
        'import json as _json',
        'from pathlib import Path as _Path',
        'from cenario import Cenario as _Cenario',
        '',
        `_RAIZ = _Path(__file__).resolve().parents[${profundidade}]`,
        `_ARQUIVOS = _json.loads(${JSON.stringify(JSON.stringify(mapa))})`,
        '',
        'def carregar():',
        `    with (_RAIZ / ${JSON.stringify(manifesto)}).open('r', encoding='utf-8') as arquivo:`,
        '        dados = _json.load(arquivo)',
        "    return _Cenario(_RAIZ, dados['cena'], arquivos=_ARQUIVOS)",
        '',
      ].join('\n'),
    })
  }
  const completo = aplicarFontesPythonDoCenario(projeto, novos, fontesPython),
    caminhos = [...Object.keys(fontes), ...fontesPython.map((f) => f.caminho)]
  await buildPythonAssetBundle(novos, { files: caminhos, directories: pastas })
  sinal.throwIfAborted()
  const autoral = [...Object.keys(fontes), ...pastas].some((p) =>
    [base, ''].some((b) => {
      const path = p.toLowerCase(),
        prefixo = `${b}cenario`.toLowerCase()
      return path === `${prefixo}.py` || path === prefixo || path.startsWith(`${prefixo}/`)
    }),
  )
  return {
    assets: completo.assets ?? [],
    fontesPython,
    avisos: autoral
      ? [
          'Seu módulo cenario tem prioridade sobre o auxiliar oficial. Confira se ele oferece Cenario com o argumento arquivos antes de executar.',
        ]
      : [],
  }
}
