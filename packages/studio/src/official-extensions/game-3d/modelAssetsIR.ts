import { z } from 'zod'
import type { JSExpr } from '../../ir/schema'

type IdField = { __id: z.ZodOptional<z.ZodString> }

/** Interface (não interseção) — mesma razão do `platformIR.ts`: a união do núcleo tem teto. */
interface Common {
  __id?: string
}

/**
 * "Criar o objeto ⟨X⟩ com o modelo ⟨M⟩ na cena ⟨W⟩ tamanho ⟨S⟩" — um modelo 3D de
 * VERDADE (arquivo `.glb` do projeto, trazido do Molda ou enviado) como objeto comum
 * da cena do kit iniciante. `asset` é o NOME do asset `model3d` (o `field_asset_picker`
 * serializa a string); `size` é o lado maior, em blocos.
 */
interface CreateModelFile extends Common {
  type: 'g3d:createModelFile'
  varName: string
  worldVar: string
  asset: string
  size: number | JSExpr
}

/** "Usar o céu 360° ⟨P⟩ na cena ⟨W⟩" — céu de foto (`.hdr` do projeto) como fundo + luz. */
interface SkyPhoto extends Common {
  type: 'g3d:skyPhoto'
  worldVar: string
  asset: string
}

/**
 * Os dois nós do lote 7 do Molda (04/09/2026). Moram AQUI, e entram na união do
 * núcleo pelo `PlatformGameThreeDStatement` (`platformIR.ts`), pelo mesmo motivo do
 * Kit Plataforma: a fachada `ir/schema.ts` está no teto de linhas.
 */
export type ModelAssetsGameThreeDStatement = CreateModelFile | SkyPhoto

export function modelAssetsGameThreeDStatementSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: IdField,
) {
  const numeric = z.union([expr, z.number()])
  return [
    z.object({
      type: z.literal('g3d:createModelFile'),
      varName: irText(),
      worldVar: irText(),
      asset: irText(),
      size: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g3d:skyPhoto'),
      worldVar: irText(),
      asset: irText(),
      ...id,
    }),
  ] as const
}
