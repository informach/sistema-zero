import type { PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type AnimationClip,
  Box3,
  DirectionalLight,
  PerspectiveCamera,
  PointLight,
  SpotLight,
  Vector3,
} from 'three'
import { ArquivosDaCompilacao } from './arquivos'
import { gravarGlbCompilado } from './arquivos-glb'
import { prepararComposicaoDoGlb } from './composicao-glb'
import { copiarLuzParaGlb } from './luzes-glb'
import { prepararMatrizesExternasDoGlb } from './matrizes-glb'
import type { ProgressoDaCompilacao } from './recursos'
import { carregarCenaNoThree } from './runtime-three'

export interface OpcoesDoGlbUnico {
  progresso?: (progresso: ProgressoDaCompilacao) => void
}

export const LIMITACOES_DO_GLB_UNICO = [
  'Este destino aceita um arquivo de até 32 MiB e 8.192 partes visíveis. Cenas maiores podem usar o pacote Three dividido em recursos.',
  'Água tem o acabamento estático do compilador; ondas e efeitos dinâmicos ficam no pacote Three.',
  'Céu panorâmico, névoa e luz hemisférica não têm representação padrão neste GLB. O visualizador aplica seu ambiente.',
  'O arquivo conserva a composição visual e as animações. Colisões, nado e regras de jogo são fornecidos pelos outros destinos, não pelo visualizador GLB.',
] as const

/** Um destino do mesmo pacote: falha/cancelamento não altera autoria ou outra exportação válida. */
export async function gerarGlbUnico(
  pacote: PacoteCompilado,
  sinal: AbortSignal,
  opcoes: OpcoesDoGlbUnico = {},
) {
  const r = await carregarCenaNoThree(pacote, sinal, {
      aguaDinamica: false,
      progresso: (feitos, total) =>
        opcoes.progresso?.({ etapa: 'modelos', feitos, total, nome: 'Preparando a composição' }),
    }),
    arquivos = new ArquivosDaCompilacao(sinal)
  let normalizada: ReturnType<typeof prepararComposicaoDoGlb> | undefined
  try {
    if (!r.dados.nos.length)
      throw Error('Acrescente uma peça ao cenário antes de gerar o GLB único.')
    opcoes.progresso?.({ etapa: 'geometria', feitos: 0, total: 1, nome: 'Juntando a composição' })
    sinal.throwIfAborted()
    prepararMatrizesExternasDoGlb([...r.raiz.children])
    const ramos: { raiz: (typeof r.raiz.children)[number]; animacoes: AnimationClip[] }[] = [],
      nos = new Map(r.dados.nos.map((n) => [n.id, n])),
      nomes: { entidade: string | null; no: string; original: string; nome: string }[] = []
    for (const ramo of r.raiz.children) {
      const ator = r.instancias.get(ramo.name)!,
        entidade = nos.get(ramo.name)!.entidade
      for (const [j, clip] of ator.animacoes.entries()) {
        const original = clip.name
        clip.name = `${ramo.name}/${j}/${original}`
        nomes.push({ entidade, no: ramo.name, original, nome: clip.name })
      }
      ramos.push({ raiz: ramo, animacoes: ator.animacoes })
    }
    // Mesmo normalizador que já conserva pele, morphs, bind, winding e clipes nos modelos.
    normalizada = prepararComposicaoDoGlb(ramos)
    const raiz = normalizada.raiz,
      volume = new Box3().setFromObject(r.raiz),
      alvo = volume.getCenter(new Vector3()),
      camera = new PerspectiveCamera(50, 1, 0.02, 12000)
    raiz.name = r.dados.nome
    camera.position.copy(alvo).add(new Vector3(10, 10, 10))
    r.quadro(camera, alvo)
    const luzes: (DirectionalLight | PointLight | SpotLight)[] = [],
      avisos: string[] = [...LIMITACOES_DO_GLB_UNICO]
    r.cena.traverse((no) => {
      if (no instanceof DirectionalLight || no instanceof PointLight || no instanceof SpotLight)
        luzes.push(no)
    })
    for (const l of luzes) {
      const copia = copiarLuzParaGlb(l)
      raiz.add(copia.luz)
      if (copia.aviso) avisos.push(copia.aviso)
    }
    raiz.userData.moldaCenario = {
      versao: 1,
      fonte: r.dados.fonte,
      unidade: r.dados.unidade,
      eixoVertical: r.dados.eixoVertical,
      entidades: r.dados.entidades,
      marcadores: r.dados.marcadores,
      ambiente: r.dados.ambiente,
      licencas: r.dados.licencas,
      animacoes: nomes,
      limitacoes: avisos,
    }
    sinal.throwIfAborted()
    opcoes.progresso?.({ etapa: 'arquivos', feitos: 0, total: 1, nome: 'Gravando GLB único' })
    const meta = await gravarGlbCompilado(
        raiz,
        'cenario.glb',
        'modelo',
        arquivos,
        sinal,
        normalizada.animacoes,
        { luzes: true, ordenarImagens: true },
      ),
      bytes = arquivos.arquivos.get(meta.caminho)!
    sinal.throwIfAborted()
    opcoes.progresso?.({ etapa: 'arquivos', feitos: 1, total: 1, nome: 'GLB único pronto' })
    sinal.throwIfAborted()
    return { bytes, medidas: meta, avisos }
  } finally {
    normalizada?.descartar()
    arquivos.descartar()
    r.descartar()
  }
}
