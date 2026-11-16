import type {
  ComandoDeCenario,
  DocumentoDeCenario,
  ModeloDeCatalogo,
} from '../packages/molda-cenarios-core/src'

/** Receita de autoria: somente comandos públicos, sem acesso ao renderer ou ao estado interno. */
export function comporEstudoDaFaisca(
  d: DocumentoDeCenario,
  catalogo: ModeloDeCatalogo[],
): ComandoDeCenario[] {
  const comandos: ComandoDeCenario[] = []
  const mover = (id: string, x: number, z: number, giro?: number) => {
    const p = d.instancias.find((p) => p.id === id)
    if (!p) throw Error(`Peça de referência ausente: ${id}`)
    comandos.push({
      tipo: 'instancia.atualizar',
      id,
      alteracoes: {
        transformacao: {
          ...p.transformacao,
          posicao: { ...p.transformacao.posicao, x, z },
          rotacao: { ...p.transformacao.rotacao, y: giro ?? p.transformacao.rotacao.y },
        },
      },
    })
  }
  comandos.push({ tipo: 'projeto.renomear', nome: 'Faísca — estudo das referências no Molda' })
  const praca = d.caminhos.find((p) => p.id === 'piso-praca')!
  comandos.push({
    tipo: 'caminho.definir',
    caminho: {
      ...praca,
      pontos: Array.from({ length: 20 }, (_, i) => ({
        x: Math.cos((i * Math.PI) / 10) * 11.5,
        z: 136.5 + Math.sin((i * Math.PI) / 10) * 9.5,
      })),
    },
  })
  mover('poco', -1.3, 136.5)
  mover('banco-catalogo-0', -6, 140.5, 0.25)
  mover('banco-catalogo-1', 5.5, 140.5, -0.25)
  mover('mesa-convivio', -7, 136.5)
  mover('quadro-suporte', -11.7, 134)
  mover('quadro-painel', -11.7, 134.675)
  mover('vizinho-leste-piso', 11.5, 126.5, -0.35)
  mover('casa-dos-jardins-piso', 3.3, 123, -0.1)
  const grupo = { grupo: 'estudo-jardins', bloqueado: false, oculto: false }
  comandos.push({
    tipo: 'grupo.definir',
    grupo: {
      id: grupo.grupo,
      nome: 'Jardins da praça — estudo',
      grupo: null,
      bloqueado: false,
      oculto: false,
    },
  })
  const adicionar = (
    sufixo: string,
    chave: string,
    x: number,
    z: number,
    escala: number,
    giro = 0,
  ) => {
    const modelo = catalogo.find((m) => m.caminho.endsWith(`/${chave}.glb`))
    if (!modelo) throw Error(`Modelo não encontrado no acervo: ${chave}`)
    comandos.push({
      tipo: 'instancia.criar',
      instancia: {
        id: `estudo-${sufixo}`,
        nome: modelo.nome,
        ...grupo,
        modelo: modelo.id,
        transformacao: { posicao: { x, y: 0, z }, rotacao: { x: 0, y: giro, z: 0 }, escala },
        apoio: { tipo: 'terreno', referencia: 'volume', deslocamento: -0.015, inclinar: false },
        fisica: chave.startsWith('arvore') ? 'tronco' : 'nenhuma',
        ...(chave.startsWith('arvore') ? { raioDoTronco: 0.2 } : {}),
      },
    })
  }
  // Grupos assimétricos enquadram as saídas; o eixo da porta e o lote continuam livres.
  for (const [i, x, z, s] of [
    [0, -13, 143, 0.85],
    [1, -15.5, 139, 1],
    [2, 13.5, 143, 0.9],
    [3, 16, 140, 1.1],
    [4, -13, 119, 1.1],
    [5, 13, 118, 1.15],
    [6, 33, 118, 1.1],
    [7, 44, 133, 0.85],
  ])
    adicionar(`copa-${i}`, 'arvore_redonda_01', x!, z!, s!)
  for (const [i, x, z, g] of [
    [0, -9.8, 142, 0.4],
    [1, -10.5, 132, 0],
    [2, 9.7, 142, -0.4],
    [3, 12.5, 134, 1.2],
    [4, 20, 139, 0.1],
    [5, 21, 131, 0.5],
    [6, 34.5, 132, 0.3],
    [7, 43, 121, 1.4],
  ])
    adicionar(`jardineira-${i}`, 'canteiro_flores', x!, z!, 0.7, g!)
  for (const [i, x, z] of [
    [0, -14, 145],
    [1, 14, 145],
    [2, 18, 136],
    [3, 36, 134],
    [4, 43, 120],
  ]) {
    adicionar(`cogumelos-${i}`, 'cogumelo_pintado_vermelho', x!, z!, 1.6)
    adicionar(`pedra-${i}`, 'rocha_media', x! - 0.5, z! - 0.6, 0.6, i! * 0.7)
  }
  // Pedras acompanham as duas laterais da subida, sem cobrir degraus ou acesso.
  for (const [i, x, z, s] of [
    [0, -7.2, 115, 1.2],
    [1, 1.5, 114, 1],
    [2, -8, 110, 1.3],
    [3, 2.5, 108, 1.2],
  ])
    adicionar(`colina-${i}`, 'rocha_larga', x!, z!, s!, i! * 0.5)
  return comandos
}
