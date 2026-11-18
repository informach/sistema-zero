import {
  type CatalogoDeCenario,
  validarDocumento as validarV1,
} from '@sistemazero/molda-cenarios-core'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  CELULAS_DA_PECA,
  codificarPecaDeAlturas,
  criarFonteDeAlturas,
  digestDosBytes,
  lerPecaDeAlturas,
  migrarDaV1,
  type ResolverDeModeloV1,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core/v2'
import { RECORTE_DA_COLINA } from '../sistemas/colina-da-faisca'
import {
  ARQUIPELAGO,
  alturaDoArquipelago,
  FUNDO_DO_ARQUIPELAGO,
} from '../sistemas/geografia-do-arquipelago'
import { LAGO_DE_CATALOGO } from '../sistemas/refino-da-faisca'
import { encaixeDaAguaImportada } from './encaixes-de-agua'
import { encaixeDoCaminhoImportado } from './encaixes-de-caminho'
import { assentarInstancias, estadoHerdado } from './importacao-v1/apoio'
import { alturaComRelevo, criarTerrenoDeCenario, paraMundo } from './importacao-v1/terreno'

export const GEOGRAFIA_DA_IMPORTACAO = '46b0ed92f'

/** Adaptador de importação: o motor genérico não conhece nem calcula a geografia do jogo. */
export async function converterFaiscaV1(
  valor: unknown,
  catalogo: CatalogoDeCenario,
  resolver: ResolverDeModeloV1,
) {
  if (LAGO_DE_CATALOGO)
    throw new Error('A importação usa o contexto do editor v1, não a variante de ensaio do /macro')
  const origem = validarV1(valor)
  if (origem.base.id !== 'faisca-v2' || origem.base.versao !== GEOGRAFIA_DA_IMPORTACAO)
    throw new Error('A geografia deste projeto não corresponde à fonte de importação conferida')
  for (const o of origem.instancias)
    if (!catalogo.has(o.modelo)) throw new Error(`Falta no catálogo o modelo ${o.modelo}`)
  const documento = migrarDaV1(origem, resolver)
  documento.caminhos = documento.caminhos.map((c) => {
    const modelo = documento.modelos.find((m) => m.id === c.acabamento),
      encaixe = modelo && encaixeDoCaminhoImportado(modelo)
    return encaixe ? { ...c, encaixeModelo: encaixe } : c
  })
  documento.aguas = documento.aguas.map((a) => {
    if (a.tipo !== 'lago' || !a.modelo) return a
    const modelo = documento.modelos.find((m) => m.id === a.modelo),
      encaixe = modelo && encaixeDaAguaImportada(modelo)
    return encaixe ? { ...a, encaixeModelo: encaixe } : a
  })
  const passo = 4,
    lado = passo * CELULAS_DA_PECA
  const limites = ARQUIPELAGO.map((i) => ({
    minX: i.centro.x - i.raio - 16,
    minZ: i.centro.z - i.raio - 16,
    maxX: i.centro.x + i.raio + 16,
    maxZ: i.centro.z + i.raio + 16,
  }))
  for (const c of origem.relevo)
    limites.push({
      minX: c.centro.x - c.raio,
      minZ: c.centro.z - c.raio,
      maxX: c.centro.x + c.raio,
      maxZ: c.centro.z + c.raio,
    })
  const x0 = Math.floor(Math.min(...limites.map((l) => l.minX)) / lado) * lado
  const z0 = Math.floor(Math.min(...limites.map((l) => l.minZ)) / lado) * lado
  const colunas = Math.ceil((Math.max(...limites.map((l) => l.maxX)) - x0) / lado) * CELULAS_DA_PECA
  const linhas = Math.ceil((Math.max(...limites.map((l) => l.maxZ)) - z0) / lado) * CELULAS_DA_PECA
  const altura = alturaComRelevo(origem, alturaDoArquipelago)
  if (colunas * passo > 8192 || linhas * passo > 8192 || colunas > 4096 || linhas > 4096)
    throw new Error('A extensão da importação excede o limite do terreno')
  const grade = new Float64Array((colunas + 1) * (linhas + 1))
  let menor = FUNDO_DO_ARQUIPELAGO,
    maior = FUNDO_DO_ARQUIPELAGO
  for (let z = 0; z <= linhas; z++)
    for (let x = 0; x <= colunas; x++) {
      const h = altura(x0 + x * passo, z0 + z * passo)
      if (!Number.isFinite(h)) throw new Error('A fonte produziu uma altura inválida')
      grade[z * (colunas + 1) + x] = h
      menor = Math.min(menor, h)
      maior = Math.max(maior, h)
    }
  const min = Math.floor(menor),
    max = Math.max(min + 1, Math.ceil(maior))
  const fundoQuantizado = Math.round(((FUNDO_DO_ARQUIPELAGO - min) / (max - min)) * 65535)
  const fundo = min + (fundoQuantizado / 65535) * (max - min)
  const base: BaseDeTerreno = {
    tipo: 'terreno',
    origem: { x: x0, z: z0 },
    passo,
    colunas,
    linhas,
    min,
    max,
    fundo,
    pecas: [],
  }
  const arquivos = new Map<string, Uint8Array>()
  const dados = new Map<string, ReturnType<typeof lerPecaDeAlturas>>()
  for (let linha = 0; linha < linhas / CELULAS_DA_PECA; linha++)
    for (let coluna = 0; coluna < colunas / CELULAS_DA_PECA; coluna++) {
      const amostras = Float64Array.from(
        { length: AMOSTRAS_DA_PECA },
        (_, i) =>
          grade[
            (linha * CELULAS_DA_PECA + Math.floor(i / 65)) * (colunas + 1) +
              coluna * CELULAS_DA_PECA +
              (i % 65)
          ]!,
      )
      const bytes = codificarPecaDeAlturas(amostras, min, max)
      const peca = lerPecaDeAlturas(bytes)
      if (peca.amostras.every((h) => h === fundoQuantizado)) continue
      const digest = await digestDosBytes(bytes)
      base.pecas.push({ coluna, linha, digest })
      arquivos.set(digest, bytes)
      dados.set(digest, peca)
    }
  const recortes = origem.aguas
    .filter((a) => !estadoHerdado(origem, a).oculto)
    .map((a) => a.recorte.map((p) => paraMundo(p, a.centro, a.giro, a.escala)))
  if (
    [0, 1, 2].every((i) =>
      origem.instancias.some(
        (p) =>
          p.id === `escada-farol-${i}` &&
          !p.oculto &&
          Math.abs(p.transformacao.posicao.x + 3) < 0.001,
      ),
    )
  )
    recortes.push(RECORTE_DA_COLINA.furo.map((p) => ({ ...p })))
  if (recortes.length) base.recortes = recortes
  documento.base = base
  const fonte = criarFonteDeAlturas(base, dados)
  // Mesmo assentamento geométrico da cena de origem. O deslocamento novo conserva sua altura
  // visível sobre as amostras quantizadas; a intenção anterior fica registrada por objeto.
  const nativo = criarTerrenoDeCenario(origem)
  const assentadas = new Map(
    assentarInstancias(origem, catalogo, nativo.exata).map((o) => [o.id, o]),
  )
  for (const o of documento.instancias) {
    const n = assentadas.get(o.id)!
    const anterior = origem.instancias.find((i) => i.id === o.id)!
    o.transformacao = {
      ...structuredClone(n.transformacao),
      escala: { x: n.transformacao.escala, y: n.transformacao.escala, z: n.transformacao.escala },
    }
    o.propriedades = {
      ...o.propriedades,
      'arquipelago.importacao.apoio': JSON.stringify(anterior.apoio),
    }
    if (o.apoio.tipo === 'terreno')
      o.apoio = {
        ...o.apoio,
        referencia: 'pivo',
        deslocamento:
          n.transformacao.posicao.y - fonte(n.transformacao.posicao.x, n.transformacao.posicao.z),
        inclinar: false,
      }
  }
  return {
    documento: validarDocumento(documento),
    recursos: [...arquivos].map(([digest, conteudo]) => ({ digest, conteudo })),
    origem: {
      digest: await digestDosBytes(new TextEncoder().encode(JSON.stringify(origem))),
      geografia: GEOGRAFIA_DA_IMPORTACAO,
      carimbos: origem.relevo.length,
      instancias: origem.instancias.length,
      caminhos: origem.caminhos.length,
      aguas: origem.aguas.length,
      marcos: origem.marcos.length,
    },
    erroMaximoDeQuantizacao: (max - min) / 65535 / 2,
  }
}
