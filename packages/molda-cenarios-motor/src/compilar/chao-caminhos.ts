import type { CenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type BufferGeometry,
  type Material,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { criarPlanoDoCenario } from '../plano'
import type { SuperficieDoObjeto } from '../superficies'
import type { FonteDeColisao } from '../teste/colisoes'
import { gravarColisaoLocal } from './colisoes'
import { dividirParteEstatica } from './geometria'
import { cederDuranteCompilacao, type MontagemDaCompilacao } from './montagem'
import type { PixelsDaTextura } from './pintura'
import { RecortesDoSoloCompilado } from './recortes-caminhos'
import { particionarTerrenoCompilado } from './setores'
import { pixelsPorMetroDoSolo, prepararSoloCompilado } from './solo'
import type { montarSuperficiesDaCompilacao } from './superficies'

export type SuperficiesDaCompilacao = ReturnType<typeof montarSuperficiesDaCompilacao>

/**
 * Quanto um caminho colado no chão sobe nos mundos em campo (plano "Mundos de 2 km", lote 3): lá o
 * chão não é recortado embaixo dele (o jogo desenha o relevo na hora), e o glTF não guarda o
 * deslocamento de profundidade do decalque; 3 cm somem com a disputa de profundidade sem que se veja.
 */
export const ELEVACAO_DO_DECAL_EM_CAMPO = 0.03

/** Materializa cada intervalo de material sem transportar offsets de profundidade
 * específicos do editor. A remoção de decals do chão deve acontecer antes (ou, em campo, o decal
 * sobe `elevarDecal` metros). */
export async function gravarSuperficieComum(
  f: SuperficieDoObjeto,
  papel: 'caminho' | 'agua',
  saida: MontagemDaCompilacao,
  elevarDecal = 0,
) {
  const materiais = Array.isArray(f.material) ? f.material : [f.material],
    intervalos = Array.isArray(f.material)
      ? f.geometria.groups
      : [
          {
            start: f.geometria.drawRange.start,
            count: f.geometria.drawRange.count,
            materialIndex: 0,
          },
        ]
  if (!intervalos.length)
    throw Error('A superfície com vários materiais precisa de intervalos explícitos.')
  for (const intervalo of intervalos) {
    const fonte = materiais[intervalo.materialIndex ?? 0]
    if (!fonte) throw Error('Um intervalo da superfície não possui material.')
    // O clone não é transformado; os buffers originais continuam sob o gerador.
    const entrada = f.geometria.clone(),
      material = fonte.clone()
    try {
      const fim = Math.min(
          f.geometria.index?.count ?? f.geometria.getAttribute('position').count,
          f.geometria.drawRange.start + f.geometria.drawRange.count,
          intervalo.start + intervalo.count,
        ),
        inicio = Math.max(f.geometria.drawRange.start, intervalo.start)
      if (fim <= inicio) continue
      entrada.clearGroups()
      entrada.setDrawRange(inicio, fim - inicio)
      if (papel === 'caminho' && material.polygonOffset && !material.depthWrite) {
        material.polygonOffset = false
        material.depthWrite = true
        if (elevarDecal > 0) {
          // A subida é no MUNDO: leva o vetor vertical para o espaço local da superfície.
          const local = new Vector3(0, elevarDecal, 0).applyMatrix3(
            new Matrix3().setFromMatrix4(f.matriz.clone().invert()),
          )
          entrada.translate(local.x, local.y, local.z)
        }
      }
      const partes = dividirParteEstatica(
        { geometria: entrada, matriz: new Matrix4() },
        new Matrix4(),
      )
      try {
        for (const g of partes) {
          saida.adicionar(await saida.gravar(new Mesh(g, material), papel), f.matriz, f.id)
          await cederDuranteCompilacao(saida.sinal)
        }
      } finally {
        for (const g of partes) g.dispose()
      }
    } finally {
      entrada.dispose()
      material.dispose()
    }
  }
}

/** Mantém a malha física original e instancia o collider em sua matriz de precisão completa. */
export async function gravarFontesFisicas(
  fontes: readonly FonteDeColisao[],
  tipo: 'caminho' | 'agua',
  saida: MontagemDaCompilacao,
) {
  for (const [i, f] of fontes.entries()) {
    if (!f.objeto) throw Error('A fonte física precisa identificar sua entidade.')
    const t = await gravarColisaoLocal(
      [{ ...f, matriz: new Matrix4() }],
      `colisoes/${tipo}-${i}.glb`,
      saida.arquivos,
      saida.sinal,
    )
    if (t) saida.adicionarColisao(t, f.matriz, f.objeto, tipo)
    await cederDuranteCompilacao(saida.sinal)
  }
}

export async function compilarChaoECaminhos(
  s: SuperficiesDaCompilacao,
  saida: MontagemDaCompilacao,
  imagens: ReadonlyMap<string, PixelsDaTextura>,
  objetosParaRecorte: Iterable<SuperficieDoObjeto> = [],
  /**
   * O relevo em campo (plano "Mundos de 2 km", lote 3): o terreno não vira peças desenhadas nem
   * colisão (o jogo desenha e colide pelo campo de alturas); os caminhos continuam iguais.
   */
  relevoEmCampo = false,
): Promise<CenaCompilada['plano']> {
  const d = s.preparada.documento,
    base = d.base,
    caminhos = s.caminhos.superficies()
  function* fontesDoRecorte() {
    yield* caminhos
    if (base.tipo === 'plano') yield* objetosParaRecorte
  }
  const recortes = new RecortesDoSoloCompilado(fontesDoRecorte(), s.alturas, {
    incluirSolidos: base.tipo === 'plano',
  })
  const camadas = base.tipo === 'terreno' ? base.solo?.camadas : undefined,
    pixelsPorMetro = pixelsPorMetroDoSolo(camadas, base.tipo === 'terreno' ? base.passo : 1)
  let numero = 0,
    plano: CenaCompilada['plano']
  const gravarParte = async (g: BufferGeometry, matriz: Matrix4, material: Material) => {
    saida.sinal.throwIfAborted()
    if (!(material instanceof MeshStandardMaterial))
      throw Error('O chão precisa do material padrão do gerador.')
    const t = await gravarColisaoLocal(
      [{ geometria: g, matriz: new Matrix4() }],
      `colisoes/chao-${numero++}.glb`,
      saida.arquivos,
      saida.sinal,
    )
    const fisica = t ? saida.adicionarColisao(t, matriz, null, 'terreno') : null
    const cortada = recortes.recortar({ geometria: g, matriz })
    try {
      if (!cortada.getAttribute('position')?.count) return fisica
      const partes = dividirParteEstatica(
        { geometria: cortada, matriz: new Matrix4() },
        new Matrix4(),
      )
      try {
        for (const geometria of partes) {
          const preparada = await prepararSoloCompilado(
            { geometria, matriz, material },
            camadas,
            imagens,
            saida.sinal,
            pixelsPorMetro,
          )
          try {
            preparada.material.polygonOffset = false
            saida.adicionar(
              await saida.gravar(new Mesh(preparada.geometria, preparada.material), 'terreno'),
              matriz,
              null,
            )
          } finally {
            preparada.descartar()
          }
          await cederDuranteCompilacao(saida.sinal)
        }
      } finally {
        for (const g of partes) g.dispose()
      }
    } finally {
      cortada.dispose()
    }
    return fisica
  }
  if (base.tipo === 'plano') {
    const piso = criarPlanoDoCenario(base.largura, base.comprimento)
    try {
      piso.updateWorldMatrix(true, false)
      const colisao = await gravarParte(piso.geometry, piso.matrixWorld, piso.material)
      if (!colisao) throw Error('O piso plano não produziu sua colisão.')
      plano = { largura: base.largura, comprimento: base.comprimento, colisao: colisao.id }
    } finally {
      piso.geometry.dispose()
      piso.material.dispose()
    }
  } else if (base.tipo === 'terreno' && s.terreno && relevoEmCampo) {
    // Nada a gravar do chão: as alturas e os pesos saem em `gravarDadosDoTerreno`.
  } else if (base.tipo === 'terreno' && s.terreno) {
    const malhas: Mesh[] = []
    s.terreno.grupo.updateWorldMatrix(true, true)
    s.terreno.grupo.traverse((n) => {
      if ((n as Mesh).isMesh) malhas.push(n as Mesh)
    })
    for (const m of malhas) {
      if (Array.isArray(m.material))
        throw Error('O terreno nativo não deve misturar materiais numa peça.')
      const setores = particionarTerrenoCompilado(
        { geometria: m.geometry, matriz: m.matrixWorld },
        base,
      )
      try {
        for (const p of setores) await gravarParte(p.geometria, p.matriz, m.material)
      } finally {
        for (const p of setores) p.geometria.dispose()
      }
    }
  } else throw Error('Converta o relevo antes de compilar.')
  for (const f of caminhos) {
    await gravarSuperficieComum(f, 'caminho', saida, relevoEmCampo ? ELEVACAO_DO_DECAL_EM_CAMPO : 0)
    saida.ancora(f.id, new Matrix4())
  }
  await gravarFontesFisicas(s.caminhos.fontesDoTeste(), 'caminho', saida)
  return plano
}
