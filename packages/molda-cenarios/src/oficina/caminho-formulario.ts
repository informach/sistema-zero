import type { CaminhoDeCenario, ModeloDoCenario } from '@sistemazero/molda-cenarios-core/v2'

export const NOMES_CAMINHO: Record<CaminhoDeCenario['tipo'], string> = {
  trilha: 'Trilha',
  praca: 'Praça',
  estrada: 'Estrada',
  cerca: 'Cerca',
  muro: 'Muro',
  ponte: 'Ponte',
}

export function caminhoComPeca(
  c: CaminhoDeCenario,
  modelo: ModeloDoCenario | null,
): CaminhoDeCenario {
  const novo = { ...c, acabamento: modelo?.id ?? null }
  if (!modelo) {
    delete novo.encaixeModelo
    return novo
  }
  if (c.acabamento === modelo.id && c.encaixeModelo) return novo
  novo.encaixeModelo = {
    eixo: 'x',
    ...(modelo.volume
      ? {
          baseLocal: modelo.volume.min.y,
          ...(c.tipo === 'ponte' ? { pisoLocal: modelo.volume.min.y } : {}),
        }
      : {}),
  }
  return novo
}
/** O rascunho pode começar sem controles; só a preparação valida a curva completa. */
export function rascunhoDeCaminho(tipo: CaminhoDeCenario['tipo'], id: string): CaminhoDeCenario {
  const comum = {
    id,
    nome: NOMES_CAMINHO[tipo],
    grupo: null,
    oculto: false,
    bloqueado: false,
    acabamento: null,
    largura: 2.6,
    pontos: [],
  }
  switch (tipo) {
    case 'trilha':
      return { ...comum, tipo }
    case 'praca':
      return { ...comum, tipo, fechada: true }
    case 'estrada':
      return { ...comum, tipo, molde: { borda: 1.3, deslocamento: 0, suavizacao: 4 } }
    case 'cerca':
      return { ...comum, tipo, largura: 0.12, altura: 1.2, comprimentoDoModulo: 2 }
    case 'muro':
      return { ...comum, tipo, largura: 0.3, altura: 2, comprimentoDoModulo: 2 }
    case 'ponte':
      return { ...comum, tipo, espessura: 0.2, guardas: true, alturaDaGuarda: 0.7 }
  }
}
