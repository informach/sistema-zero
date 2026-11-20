import type { CenariosPublicadosDoJogo } from '@sistemazero/arquipelago-contracts'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  MIME_DO_MANIFESTO,
  type PublicacaoParaOJogo,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import type { BuscarArquivoCompilado } from '@sistemazero/molda-cenarios-motor/leitura'
import { Matrix4 } from 'three'
import { ArquivosDaCompilacao } from '../../../molda-cenarios-motor/src/compilar/arquivos'
import { exemplo, glb } from '../../../molda-cenarios-motor/tests/fixtures/glb-compilacao'

export async function cenarioPublicadoParaTeste() {
  const { j, bin } = exemplo(),
    posicoes = new Float32Array([-12, 0, -12, 0, 0, 12, 12, 0, -12]),
    inventario = new ArquivosDaCompilacao(new AbortController().signal),
    matriz = new Matrix4().makeTranslation(10, 3, -4).elements,
    volume = { min: { x: -2, y: 3, z: -16 }, max: { x: 22, y: 3, z: 8 } }
  bin.set(new Uint8Array(posicoes.buffer))
  j.accessors[0]!.min = [-12, 0, -12]
  j.accessors[0]!.max = [12, 0, 12]
  const bytes = glb(j, bin)
  await inventario.adicionar('solo.glb', bytes, {
    mime: 'model/gltf-binary',
    papel: 'modelo',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  })
  await inventario.adicionar('colisao.glb', bytes, {
    mime: 'model/gltf-binary',
    papel: 'colisao',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  })
  const cena = lerCenaCompilada({
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Praça publicada',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'ensaio', revisao: 1, digest: 'a'.repeat(64) },
    arquivos: inventario.descrever(),
    entidades: [
      { id: 'solo', nome: 'Solo', tipo: 'objeto', grupo: null, matriz, volume },
      { id: 'lugar:casa', nome: 'Morada', tipo: 'marcador', grupo: null },
    ],
    nos: [{ id: 'no', entidade: 'solo', arquivo: 'solo.glb', matriz, volume }],
    colisoes: [
      { id: 'colisao', entidade: 'solo', arquivo: 'colisao.glb', tipo: 'malha', matriz, volume },
    ],
    aguas: [],
    caminhos: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    marcadores: [
      { id: 'lugar:casa', nome: 'Morada', posicao: { x: 10, y: 3, z: -4 }, giro: 0, objeto: null },
    ],
    ambiente: { hora: 12 },
  })
  const manifesto = new TextEncoder().encode(JSON.stringify(cena)),
    publicacao: PublicacaoParaOJogo = {
      id: crypto.randomUUID(),
      perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
      versao: 1,
      fonte: cena.fonte,
      manifesto: { digest: await digestDosBytes(manifesto), bytes: manifesto.length },
    },
    pacote: PacoteCompilado = { cena, arquivos: new Map(inventario.arquivos) }
  return { publicacao, pacote }
}

export async function portaDoCenarioParaTeste(
  inicial: Awaited<ReturnType<typeof cenarioPublicadoParaTeste>>,
) {
  let atual: typeof inicial | null = inicial
  const arquivos = new Map<string, { bytes: Uint8Array; mime: string }>()
  const registrar = async (p: typeof inicial) => {
    const manifesto = new TextEncoder().encode(JSON.stringify(p.pacote.cena))
    p.publicacao.manifesto = { digest: await digestDosBytes(manifesto), bytes: manifesto.length }
    arquivos.set(p.publicacao.manifesto.digest, { bytes: manifesto, mime: MIME_DO_MANIFESTO })
    for (const a of p.pacote.cena.arquivos)
      arquivos.set(a.digest, { bytes: p.pacote.arquivos.get(a.caminho)!, mime: a.mime })
  }
  await registrar(inicial)
  const porta: CenariosPublicadosDoJogo = {
    async perfil() {
      return { status: 200, corpo: { publicacao: atual?.publicacao ?? null } }
    },
    async arquivo(_id, digest) {
      const a = arquivos.get(digest)!
      return {
        status: 200,
        corpo: {
          url: `https://ensaio.exemplo/${digest}`,
          bytes: a.bytes.length,
          tipoDoConteudo: a.mime,
        },
      }
    },
  }
  const buscar: BuscarArquivoCompilado = async (url) =>
    new Response(arquivos.get(url.pathname.slice(1))!.bytes.slice().buffer)
  return {
    porta,
    buscar,
    async usar(proximo: typeof inicial | null) {
      if (proximo) await registrar(proximo)
      atual = proximo
    },
  }
}
