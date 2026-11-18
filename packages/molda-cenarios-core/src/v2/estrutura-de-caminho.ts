import { CenarioInvalido } from '../validacao'
import {
  type ModuloNaCurva,
  medirCurva,
  modulosNaCurva,
  type PontoNoChao,
  perfilDaPonte,
} from './curvas'
import type { CaminhoDeCenario, Transformacao } from './documento'
import { medidasDaPecaDeCaminho } from './medidas-de-caminho'
import { ChaveDeParteDeCaminhoSchema } from './parametros-de-caminho'
import type { FonteDeAlturas } from './terreno'
import { curvaDoCaminho } from './topologia-de-caminho'
import { transformarPonto, transformarVolume, type VolumeDeComposicao } from './volume'

type Ponto3 = Transformacao['posicao']
export interface PecaEstruturalDoCaminho {
  /** Identidade autoral da parte; não é índice de malha interno de um GLB. */
  chave: string
  tipo: 'caixa' | 'modelo' | 'pilar'
  /** Caixa usa cubo centrado; modelo conserva espaço local. Pilar informa o envelope:
   * suas tampas precisam conformar as superfícies reais inferior/superior no motor. */
  transformacao: Transformacao
  /** Acrescentar a altura real do chão a cada vértice/contato, depois da transformação. */
  noTerreno: boolean
}
export interface EstruturaDoCaminho {
  pecas: PecaEstruturalDoCaminho[]
  avisos: string[]
}
export interface FontesDaEstrutura {
  /** Face inferior real do GLB já encaixado. Nulo onde o modelo não oferece apoio. */
  baseDoTabuleiro?: (ponto: PontoNoChao) => number | null
  /** Consulta de contato: não mede o perfil nem prepara as demais peças. */
  somenteParte?: string
}
const MAX_PECAS = 20_000
const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}
const conferirQuantidade = (n: number) => {
  if (!Number.isFinite(n) || n > MAX_PECAS)
    falhar(
      'A estrutura gera peças demais. Aumente o módulo ou divida o caminho em trechos menores.',
    )
}
const CUBO = { min: { x: -0.5, y: -0.5, z: -0.5 }, max: { x: 0.5, y: 0.5, z: 0.5 } }
function conferirEnvelope(volume: VolumeDeComposicao, transformacao: Transformacao): Transformacao {
  const caixa = transformarVolume(volume, transformacao)
  if (
    ![...Object.values(caixa.min), ...Object.values(caixa.max)].every(
      (v) => Number.isFinite(v) && Math.abs(v) <= 100_000,
    )
  )
    return falhar(
      'O encaixe da estrutura ultrapassa os limites do mundo. Confira as medidas e as cabeceiras.',
    )
  return transformacao
}
const lerAltura = (fonte: FonteDeAlturas, p: PontoNoChao) => {
  const y = fonte(p.x, p.z)
  if (!Number.isFinite(y)) return falhar('O caminho encontrou uma altura inválida.')
  return y
}
/** Referencial ortonormal, com Y sobre o piso e sem reflexão no modelo. Euler XYZ do motor. */
function referencial(de: Ponto3, ate: Ponto3, eixo: 'x' | 'z' = 'x') {
  const dx = ate.x - de.x,
    dy = ate.y - de.y,
    dz = ate.z - de.z,
    horizontal = Math.hypot(dx, dz),
    comprimento = Math.hypot(horizontal, dy)
  if (!(horizontal > 1e-6) || !Number.isFinite(comprimento))
    return falhar('O lance precisa de dois apoios diferentes e finitos.')
  const u = { x: dx / comprimento, y: dy / comprimento, z: dz / comprimento },
    w = { x: -dz / horizontal, y: 0, z: dx / horizontal },
    v = { x: -u.y * w.z, y: horizontal / comprimento, z: u.y * w.x },
    cx = eixo === 'x' ? u : { x: -w.x, y: 0, z: -w.z },
    cz = eixo === 'x' ? w : u,
    cosY = Math.hypot(cx.x, v.x),
    y = Math.atan2(cz.x, cosY),
    rotacao =
      cosY > 1e-12
        ? { x: Math.atan2(-cz.y, cz.z), y, z: Math.atan2(-v.x, cx.x) }
        : { x: Math.atan2(v.z, v.y), y, z: 0 }
  return { rotacao, comprimento, horizontal }
}
const caixa = (
  chave: string,
  posicao: Ponto3,
  escala: Ponto3,
  rotacao = { x: 0, y: 0, z: 0 },
  noTerreno = false,
): PecaEstruturalDoCaminho => ({
  chave,
  tipo: 'caixa',
  noTerreno,
  transformacao: conferirEnvelope(CUBO, { posicao, escala, rotacao }),
})

function encaixarModelo(
  c: CaminhoDeCenario,
  de: Ponto3,
  ate: Ponto3,
  volume?: VolumeDeComposicao,
): PecaEstruturalDoCaminho {
  const {
      volume: limites,
      eixo,
      transversal,
      medidas,
      inicio,
      fim,
      centroTransversal,
      baseLocal,
    } = medidasDaPecaDeCaminho(c, volume),
    ponte = c.tipo === 'ponte'
  const ref = referencial(de, ate, eixo),
    largura = c.largura / medidas[transversal],
    escala = {
      x: largura,
      y: ponte
        ? largura
        : (c.tipo === 'muro' || c.tipo === 'cerca' ? c.altura : medidas.y) / medidas.y,
      z: largura,
    }
  escala[eixo] = ref.comprimento / (fim - inicio)
  const ancora = {
      x: (limites.min.x + limites.max.x) / 2,
      y: baseLocal,
      z: (limites.min.z + limites.max.z) / 2,
    },
    transformacao: Transformacao = { posicao: { x: 0, y: 0, z: 0 }, rotacao: ref.rotacao, escala },
    q = transformarPonto(
      { ...ancora, [eixo]: (inicio + fim) / 2, [transversal]: centroTransversal },
      transformacao,
    )
  transformacao.posicao = {
    x: (de.x + ate.x) / 2 - q.x,
    y: (de.y + ate.y) / 2 - q.y,
    z: (de.z + ate.z) / 2 - q.z,
  }
  return {
    chave: 'modelo/0',
    tipo: 'modelo',
    noTerreno: !ponte,
    transformacao: conferirEnvelope(limites, transformacao),
  }
}

/** Módulos retos conservam os controles de esquina; curvas suaves usam a distribuição do núcleo. */
function modulosDoCaminho(
  c: Extract<CaminhoDeCenario, { tipo: 'cerca' | 'muro' }>,
): ModuloNaCurva[] {
  const curva = curvaDoCaminho(c),
    n = curva.pontos.length,
    lances = c.suave
      ? [curva]
      : Array.from({ length: curva.fechada ? n : n - 1 }, (_, i) =>
          medirCurva([curva.pontos[i]!, curva.pontos[(i + 1) % n]!]),
        )
  const quantidade = lances.reduce(
    (s, l) => s + Math.max(l.fechada ? 3 : 1, Math.round(l.comprimento / c.comprimentoDoModulo)),
    0,
  )
  conferirQuantidade(
    c.acabamento || c.tipo === 'muro' ? quantidade : quantidade * 3 + (curva.fechada ? 0 : 1),
  )
  return lances.flatMap((l) => modulosNaCurva(l, c.comprimentoDoModulo))
}

/** Validação autoral sem depender de bytes do terreno ou gerar malhas. */
export function parteEstruturalExiste(c: CaminhoDeCenario, chave: string): boolean {
  if (!ChaveDeParteDeCaminhoSchema.safeParse(chave).success) return false
  const [tipo, numero] = chave.split('/'),
    indice = Number(numero)
  if (c.tipo === 'ponte') {
    const comprimento = Math.hypot(
        c.pontos[1]!.x - c.pontos[0]!.x,
        c.pontos[1]!.z - c.pontos[0]!.z,
      ),
      nPilares = c.pilares ? Math.max(0, Math.ceil(comprimento / c.pilares.espacamento) - 1) : 0
    if (tipo === 'pilar') return indice < nPilares * 2
    if (c.acabamento) return tipo === 'modelo' && indice === 0
    if (tipo === 'tabuleiro') return indice === 0
    if (!c.guardas) return false
    return tipo === 'guarda'
      ? indice < 2
      : tipo === 'guarda-poste' && indice < (Math.max(1, Math.ceil(comprimento / 2)) + 1) * 2
  }
  if (c.tipo !== 'cerca' && c.tipo !== 'muro') return false
  const n = modulosDoCaminho(c).length
  if (c.acabamento || c.tipo === 'muro') return tipo === 'modulo' && indice < n
  return tipo === 'poste' ? indice < n + (c.fechada ? 0 : 1) : tipo === 'travessa' && indice < n * 2
}

/**
 * Plano numérico das peças: motor, colisão e apoios partilham os mesmos referenciais.
 * Sem Three, IO ou alteração do modelo do acervo. Peças no terreno exigem conformação da
 * geometria pelo motor, não apenas transladar o pivô para a altura de uma única câmera.
 */
export function estruturaDoCaminho(
  c: CaminhoDeCenario,
  alturaEm: FonteDeAlturas,
  volume?: VolumeDeComposicao,
  fontes: FontesDaEstrutura = {},
): EstruturaDoCaminho {
  const pecas: PecaEstruturalDoCaminho[] = [],
    avisos: string[] = [],
    somente = fontes.somenteParte
  if (c.tipo !== 'cerca' && c.tipo !== 'muro' && c.tipo !== 'ponte') return { pecas, avisos }
  curvaDoCaminho(c)
  if (c.tipo === 'ponte') {
    const a = c.pontos[0]!,
      b = c.pontos[1]!,
      de = { ...a, y: c.cotas?.de ?? lerAltura(alturaEm, a) },
      ate = { ...b, y: c.cotas?.ate ?? lerAltura(alturaEm, b) },
      ref = referencial(de, ate),
      nPostes = Math.max(1, Math.ceil(ref.horizontal / 2)),
      nPilares = c.pilares ? Math.max(0, Math.ceil(ref.horizontal / c.pilares.espacamento) - 1) : 0
    conferirQuantidade(
      (c.acabamento ? 1 : 1 + (c.guardas ? 2 + (nPostes + 1) * 2 : 0)) + nPilares * 2,
    )
    if (!somente && perfilDaPonte(de, ate, alturaEm).atravessa)
      avisos.push('O terreno atravessa o tabuleiro. Revise o relevo ou as cabeceiras.')
    const raiz: Transformacao = { posicao: de, rotacao: ref.rotacao, escala: { x: 1, y: 1, z: 1 } },
      adicionar = (chave: string, centro: Ponto3, tamanho: Ponto3) => {
        if (!somente || somente === chave)
          pecas.push(caixa(chave, transformarPonto(centro, raiz), tamanho, ref.rotacao))
      }
    if (c.acabamento) {
      if (!somente || somente === 'modelo/0') pecas.push(encaixarModelo(c, de, ate, volume))
    } else {
      adicionar(
        'tabuleiro/0',
        { x: ref.comprimento / 2, y: -c.espessura / 2, z: 0 },
        { x: ref.comprimento, y: c.espessura, z: c.largura },
      )
      if (
        c.guardas &&
        (!somente || somente.startsWith('guarda/') || somente.startsWith('guarda-poste/'))
      ) {
        const esp = Math.min(0.1, c.largura / 8, c.alturaDaGuarda / 4)
        for (let lado = 0; lado < 2; lado++) {
          const z = ((lado === 0 ? -1 : 1) * (c.largura - esp)) / 2
          adicionar(
            `guarda/${lado}`,
            { x: ref.comprimento / 2, y: c.alturaDaGuarda - esp / 2, z },
            { x: ref.comprimento, y: esp, z: esp },
          )
          for (let i = 0; i <= nPostes; i++)
            adicionar(
              `guarda-poste/${i * 2 + lado}`,
              { x: (ref.comprimento * i) / nPostes, y: (c.alturaDaGuarda - esp) / 2, z },
              { x: esp, y: c.alturaDaGuarda - esp, z: esp },
            )
        }
      }
    }
    if (c.pilares && (!somente || somente.startsWith('pilar/'))) {
      if (c.acabamento && !fontes.baseDoTabuleiro)
        return falhar(
          'Carregue a geometria inferior real do tabuleiro antes de acrescentar pilares ao modelo.',
        )
      let semChao = false
      for (let i = 0; i < nPilares; i++) {
        const t = ((i + 1) * c.pilares.espacamento) / ref.horizontal
        for (let lado = 0; lado < 2; lado++) {
          if (somente && somente !== `pilar/${i * 2 + lado}`) continue
          const z = (lado === 0 ? -1 : 1) * Math.max(0, (c.largura - c.pilares.largura) / 3),
            p = transformarPonto({ x: ref.comprimento * t, y: 0, z }, raiz)
          if (alturaEm.temChao && !alturaEm.temChao(p)) {
            semChao = true
            continue
          }
          const fundo = lerAltura(alturaEm, p),
            topo = c.acabamento
              ? fontes.baseDoTabuleiro!(p)
              : p.y - (c.espessura * ref.comprimento) / ref.horizontal
          if (topo === null) {
            semChao = true
            continue
          }
          if (!Number.isFinite(topo))
            return falhar('O tabuleiro oferece uma altura inferior inválida para o pilar.')
          if (topo <= fundo + 1e-6) continue
          pecas.push({
            ...caixa(
              `pilar/${i * 2 + lado}`,
              { x: p.x, y: (topo + fundo) / 2, z: p.z },
              {
                x: Math.min(c.pilares.largura, c.largura),
                y: topo - fundo,
                z: Math.min(c.pilares.largura, c.largura),
              },
            ),
            tipo: 'pilar',
          })
        }
      }
      if (semChao)
        avisos.push(
          'Alguns pilares não têm apoio entre o chão e o tabuleiro; confira as superfícies antes de construí-los.',
        )
    }
    return { pecas, avisos }
  }
  const modulos = modulosDoCaminho(c)
  for (const [i, m] of modulos.entries()) {
    if (somente) {
      const [tipo, numero] = somente.split('/'),
        indice = Number(numero),
        modulo =
          tipo === 'travessa'
            ? Math.floor(indice / 2)
            : tipo === 'poste'
              ? Math.min(indice, modulos.length - 1)
              : indice
      if (i !== modulo) continue
    }
    const de = { ...m.de, y: 0 },
      ate = { ...m.ate, y: 0 },
      ref = referencial(de, ate)
    if (c.acabamento) {
      pecas.push({ ...encaixarModelo(c, de, ate, volume), chave: `modulo/${i}` })
    } else if (c.tipo === 'muro') {
      pecas.push(
        caixa(
          `modulo/${i}`,
          { x: m.x, y: c.altura / 2, z: m.z },
          { x: ref.comprimento, y: c.altura, z: c.largura },
          ref.rotacao,
          true,
        ),
      )
    } else {
      pecas.push(
        caixa(
          `poste/${i}`,
          { ...m.de, y: c.altura / 2 },
          { x: c.largura, y: c.altura, z: c.largura },
          ref.rotacao,
          true,
        ),
      )
      if (i === modulos.length - 1 && !c.fechada)
        pecas.push(
          caixa(
            `poste/${i + 1}`,
            { ...m.ate, y: c.altura / 2 },
            { x: c.largura, y: c.altura, z: c.largura },
            ref.rotacao,
            true,
          ),
        )
      for (let k = 0; k < 2; k++) {
        if (somente && somente !== `travessa/${i * 2 + k}`) continue
        const altura = c.altura * (k === 0 ? 0.35 : 0.85),
          a = { ...m.de, y: lerAltura(alturaEm, m.de) + altura },
          b = { ...m.ate, y: lerAltura(alturaEm, m.ate) + altura },
          r = referencial(a, b)
        pecas.push(
          caixa(
            `travessa/${i * 2 + k}`,
            { x: m.x, y: (a.y + b.y) / 2, z: m.z },
            { x: r.comprimento, y: Math.min(0.12, c.altura / 8), z: Math.min(0.12, c.largura) },
            r.rotacao,
          ),
        )
      }
    }
  }
  return { pecas: somente ? pecas.filter((p) => p.chave === somente) : pecas, avisos }
}
