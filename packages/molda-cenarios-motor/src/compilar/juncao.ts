import {
  type CenaCompilada,
  LIMITES_DA_EXPORTACAO,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import { Box3, type Material, Matrix4, Mesh } from 'three'
import { lerGlb, type ModeloCarregado } from '../modelos'
import { ArquivosDaCompilacao } from './arquivos'
import { gravarGlbCompilado } from './arquivos-glb'
import { conferirConteudoCompilado } from './conteudo'
import { inspecionarGlbDaCompilacao } from './inspecao-glb'
import {
  bytesDaParteParaJuncao,
  LoteEstaticoCompilado,
  layoutDaParteEstatica,
} from './lote-estatico'
import { cederDuranteCompilacao, volumeDaCaixa } from './montagem'
import type { ProgressoDaCompilacao } from './recursos'

export interface OpcoesDaJuncaoEstatica {
  tamanhoDaRegiao?: number
  progresso?: (p: ProgressoDaCompilacao) => void
}
export function tamanhoDaRegiaoDaJuncao(valor?: number) {
  const tamanho = valor ?? 64
  if (!Number.isFinite(tamanho) || tamanho < 16 || tamanho > 512)
    throw Error('A região de junção precisa medir entre 16 e 512 metros.')
  return tamanho
}

/** Junta geometria já compilada; nenhum apoio, caminho ou terreno é recalculado.
 * Transparência conserva a ordenação por objeto. Atores/efeitos permanecem separados. */
export async function juntarEstaticosDoPacote(
  entrada: PacoteCompilado,
  sinal: AbortSignal,
  opcoes: OpcoesDaJuncaoEstatica = {},
): Promise<PacoteCompilado> {
  sinal.throwIfAborted()
  const tamanho = tamanhoDaRegiaoDaJuncao(opcoes.tamanhoDaRegiao)
  const { cena } = await conferirConteudoCompilado(entrada.cena, entrada.arquivos, sinal),
    arquivos = new ArquivosDaCompilacao(sinal),
    modelos = new Map<string, ModeloCarregado>(),
    preservados = new Set<string>(),
    grupos = new Map<
      string,
      { lote: LoteEstaticoCompilado; material: Material; matriz: Matrix4 }
    >(),
    nos: CenaCompilada['nos'] = [],
    ids = new Set(cena.nos.map((n) => n.id)),
    metadados = new Map(cena.arquivos.map((a) => [a.caminho, a]))
  let memoriaDosModelos = 0,
    memoriaDosLotes = 0,
    numero = 0
  try {
    for (const [i, no] of cena.nos.entries()) {
      sinal.throwIfAborted()
      opcoes.progresso?.({
        etapa: 'geometria',
        feitos: i,
        total: cena.nos.length,
        nome: 'Juntando peças estáticas',
      })
      if (no.efeito || no.preservarHierarquia || no.faixas || preservados.has(no.arquivo)) {
        nos.push(no)
        continue
      }
      let modelo = modelos.get(no.arquivo)
      if (!modelo) {
        const bytes = entrada.arquivos.get(no.arquivo)!,
          r = inspecionarGlbDaCompilacao(bytes)
        if (r.animavel) {
          preservados.add(no.arquivo)
          nos.push(no)
          continue
        }
        memoriaDosModelos += r.bytesDeMaterializacao + r.bytesDePixels
        if (memoriaDosModelos + memoriaDosLotes * 3 > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
          throw Error(
            'Os modelos excedem a memória disponível para juntar. Divida a região de exportação.',
          )
        modelo = await lerGlb(bytes.slice().buffer)
        modelos.set(no.arquivo, modelo)
        sinal.throwIfAborted()
      }
      if (modelo.partes.some((p) => p.material.transparent)) {
        nos.push(no)
        continue
      }
      const centro = {
          x: (no.volume.min.x + no.volume.max.x) / 2,
          z: (no.volume.min.z + no.volume.max.z) / 2,
        },
        coluna = Math.floor(centro.x / tamanho),
        linha = Math.floor(centro.z / tamanho),
        matriz = new Matrix4().makeTranslation(
          (coluna + 0.5) * tamanho,
          0,
          (linha + 0.5) * tamanho,
        ),
        relativa = matriz.clone().invert().multiply(new Matrix4().fromArray(no.matriz))
      for (const p of modelo.partes) {
        if (
          memoriaDosModelos + (memoriaDosLotes + bytesDaParteParaJuncao(p.geometria)) * 3 >
          LIMITES_DA_EXPORTACAO.malha.bytesDaFonte
        )
          throw Error(
            'A junção excede o orçamento de memória. Divida a região ou exporte sem juntar.',
          )
        const chave = `${coluna}/${linha}/${p.material.uuid}/${layoutDaParteEstatica(p.geometria)}`
        let grupo = grupos.get(chave)
        if (!grupo) {
          if (grupos.size >= 8192)
            throw Error('A junção exige lotes demais. Divida a região de exportação.')
          grupo = { lote: new LoteEstaticoCompilado(), material: p.material, matriz }
          grupos.set(chave, grupo)
        }
        const anterior = grupo.lote.bytesDeEntrada
        grupo.lote.adicionar(
          { geometria: p.geometria, matriz: relativa.clone().multiply(p.matriz) },
          no.entidade,
        )
        memoriaDosLotes += grupo.lote.bytesDeEntrada - anterior
        if (memoriaDosModelos + memoriaDosLotes * 3 > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
          throw Error(
            'A junção excede o orçamento de memória. Divida a região ou exporte sem juntar.',
          )
      }
      await cederDuranteCompilacao(sinal)
    }
    for (const g of grupos.values()) {
      sinal.throwIfAborted()
      const partes = g.lote.finalizar()
      try {
        for (const p of partes) {
          while (
            ids.has(`lote-estatico-${numero}`) ||
            entrada.arquivos.has(`lotes/lote-${numero}.glb`)
          )
            numero++
          if (nos.length >= 32768) throw Error('A cena unida excede o limite de nós.')
          const m = new Mesh(p.geometria, g.material)
          m.name = 'lote'
          const a = await gravarGlbCompilado(
              m,
              `lotes/lote-${numero}.glb`,
              'modelo',
              arquivos,
              sinal,
            ),
            volume = new Box3().setFromObject(m).applyMatrix4(g.matriz),
            id = `lote-estatico-${numero++}`
          ids.add(id)
          nos.push({
            id,
            entidade: null,
            arquivo: a.caminho,
            matriz: g.matriz.elements.slice(),
            volume: volumeDaCaixa(volume),
            faixas: p.faixas,
          })
          await cederDuranteCompilacao(sinal)
        }
      } finally {
        for (const p of partes) p.geometria.dispose()
        memoriaDosLotes -= g.lote.bytesDeEntrada
        g.lote.descartar()
      }
    }
    const usados = new Set([...nos, ...cena.colisoes].map((n) => n.arquivo))
    for (const t of cena.texturas) usados.add(t.arquivo)
    if (cena.terreno) {
      usados.add(cena.terreno.alturas)
      usados.add(cena.terreno.pngAlturas)
      if (cena.terreno.buracos) usados.add(cena.terreno.buracos)
    }
    for (const caminho of usados)
      if (!arquivos.arquivos.has(caminho)) {
        const a = metadados.get(caminho),
          bytes = entrada.arquivos.get(caminho)
        if (!a || !bytes) throw Error('A junção perdeu uma dependência da cena.')
        const { caminho: _, digest: __, bytes: ___, ...meta } = a
        await arquivos.adicionar(caminho, bytes, meta)
        await cederDuranteCompilacao(sinal)
      }
    const resultado = await conferirConteudoCompilado(
      {
        ...cena,
        nos,
        arquivos: arquivos
          .descrever()
          .sort((a, b) => (a.caminho < b.caminho ? -1 : a.caminho > b.caminho ? 1 : 0)),
      },
      arquivos.arquivos,
      sinal,
    )
    opcoes.progresso?.({
      etapa: 'geometria',
      feitos: cena.nos.length,
      total: cena.nos.length,
      nome: 'Peças estáticas reunidas',
    })
    sinal.throwIfAborted()
    return { cena: resultado.cena, arquivos: new Map(arquivos.arquivos) }
  } finally {
    for (const g of grupos.values()) g.lote.descartar()
    for (const m of modelos.values()) m.descartar()
    arquivos.descartar()
  }
}
