import {
  CenarioDesatualizado,
  type CenariosHost,
} from '@sistemazero/molda-cenarios/oficina/autoria'
import { ErroDaOficina } from '@sistemazero/molda-cenarios/oficina/host-http'
import {
  ComandoDeCenarioSchema,
  IntencaoDeAguaSchema,
  ParametrosDeTerrenoSchema,
  ReceitaDeTerrenoSchema,
  VistaDeCameraSchema,
} from '@sistemazero/molda-cenarios-core/v2'
import { z } from 'zod'
import { capturarPelaOficina, capturarSemJanela } from './captura'
import { CenarioMudou, criarIntencoes, type Intencoes } from './intencoes'
import {
  type ExecutarPagina,
  exportarCenario,
  paginaNoChrome,
  trazerModelos,
} from './trazer-e-exportar'

/**
 * As ferramentas do agente, iguais no MCP e no CLI. As de leitura e organização chamam o cliente
 * da oficina; as de intenção viram UM lote cada (um passo de desfazer), com as mesmas funções da
 * edição à mão; as consultas não gravam nada. Guia: `docs/molda-cenarios-agentes.md`.
 */

export interface Contexto {
  host: CenariosHost
  intencoes: Intencoes
  /** Baixa um arquivo do app com o token (o retrato que a oficina aberta guardou). */
  baixar?(endereco: string): Promise<Uint8Array>
  /** Quem roda a página sem janela (trazer e exportar); sem ele, o Chrome deste computador. */
  executarPagina?: ExecutarPagina
}
export function criarContexto(
  host: CenariosHost,
  baixar?: (endereco: string) => Promise<Uint8Array>,
): Contexto {
  return { host, intencoes: criarIntencoes(host), ...(baixar ? { baixar } : {}) }
}

const id = z.uuid()
const idDoDocumento = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_./:-]{0,199}$/)
  .describe('Id de uma entidade do documento (objeto, água, caminho).')
const nome = z.string().trim().min(1).max(120)
const vazio = z.object({}).strict()
const ponto = z.object({ x: z.number().finite(), z: z.number().finite() }).strict()
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const revisaoEsperada = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe('A revisão lida por último. Se o cenário mudou desde então, nada é gravado.')
const operacaoId = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,80}$/)
  .optional()
  .describe('Repetir o mesmo id depois de uma resposta perdida não aplica duas vezes.')
const lote = { cenarioId: id, revisaoEsperada, operacaoId }
const modeloEscolhido = z
  .object({ bibliotecaId: id, modeloId: id, digest })
  .strict()
  .describe('Um modelo como `buscar_modelos` devolve: biblioteca, id e digest.')

type Ferramenta<S extends z.ZodType> = {
  name: string
  description: string
  schema: S
  executar(c: Contexto, a: z.infer<S>): Promise<unknown>
}
const ferramenta = <S extends z.ZodType>(f: Ferramenta<S>) => f

const opcoesDoLote = (a: {
  revisaoEsperada?: number | undefined
  operacaoId?: string | undefined
}) => ({
  ...(a.revisaoEsperada !== undefined ? { revisaoEsperada: a.revisaoEsperada } : {}),
  ...(a.operacaoId ? { operacaoId: a.operacaoId } : {}),
})

export const FERRAMENTAS = [
  // ----- Organização e leitura -----
  ferramenta({
    name: 'listar_espacos',
    description:
      'Lista os espaços desta conta: o da conta e, para a equipe, o da Equipe Sistema Zero (onde mora o acervo licenciado), com o uso e o limite de armazenamento.',
    schema: vazio,
    executar: (c) => c.host.espacos(),
  }),
  ferramenta({
    name: 'listar_bibliotecas',
    description:
      'Lista as bibliotecas de modelos de um espaço, com a licença (livre, propria ou restrita) e quantos modelos cada uma tem.',
    schema: z.object({ espacoId: id }).strict(),
    executar: (c, a) => c.host.listarBibliotecas(a.espacoId),
  }),
  ferramenta({
    name: 'buscar_modelos',
    description:
      'Busca modelos numa biblioteca por nome, pasta e etiqueta (sem acento, vários termos). Devolve id, digest, medidas reais (min e max em metros) e triângulos, sem baixar arquivo. Use `proximo` como `cursor` para a página seguinte.',
    schema: z
      .object({
        bibliotecaId: id,
        busca: z.string().max(120).optional(),
        pasta: z.string().max(240).optional(),
        cursor: z
          .string()
          .regex(/^[0-9]{1,7}$/)
          .optional(),
        limite: z.number().int().min(1).max(200).default(40),
      })
      .strict(),
    executar: (c, a) =>
      c.host.listarModelos(a.bibliotecaId, {
        ...(a.busca ? { busca: a.busca } : {}),
        ...(a.pasta !== undefined ? { pasta: a.pasta } : {}),
        ...(a.cursor ? { cursor: a.cursor } : {}),
        limite: a.limite,
      }),
  }),
  ferramenta({
    name: 'buscar_modelos_no_espaco',
    description:
      'Busca modelos em TODAS as bibliotecas de um espaço por nome, pasta, etiqueta e tamanho em metros (altura e o maior lado no chão), ou pelos ids. Bom para achar "uma árvore de 4 a 8 m" sem saber a biblioteca.',
    schema: z
      .object({
        espacoId: id,
        busca: z.string().max(120).optional(),
        pasta: z.string().max(240).optional(),
        etiqueta: z.string().min(1).max(60).optional(),
        ids: z.array(id).min(1).max(200).optional(),
        alturaMin: z.number().min(0).max(10_000).optional(),
        alturaMax: z.number().min(0).max(10_000).optional(),
        ladoMin: z.number().min(0).max(10_000).optional(),
        ladoMax: z.number().min(0).max(10_000).optional(),
        cursor: z
          .string()
          .regex(/^[0-9]{1,7}$/)
          .optional(),
        limite: z.number().int().min(1).max(200).default(40),
      })
      .strict(),
    executar: (c, a) => {
      const { espacoId, ...filtro } = a
      return c.host.buscarModelosNoEspaco(espacoId, filtro)
    },
  }),
  ferramenta({
    name: 'trazer_modelos',
    description:
      'Traz modelos deste computador para uma biblioteca, pelo mesmo caminho da oficina: GLB, glTF (com os arquivos dele), OBJ, FBX e ZIP, arquivos soltos ou pastas inteiras (a pasta vira a pasta do modelo). Cada modelo é conferido, medido e fotografado; o que não serve volta em `recusados` com o motivo. Até 5.000 arquivos e 512 MB por vez; precisa do Chrome neste computador.',
    schema: z
      .object({
        bibliotecaId: id,
        caminhos: z
          .array(z.string().min(1).max(1024))
          .min(1)
          .max(200)
          .describe('Arquivos ou pastas neste computador.'),
      })
      .strict(),
    executar: (c, a) =>
      trazerModelos(c.host, a.bibliotecaId, a.caminhos, c.executarPagina ?? paginaNoChrome()),
  }),
  ferramenta({
    name: 'listar_conjuntos',
    description:
      'Lista os conjuntos (composições prontas de vários modelos) de uma biblioteca, com a revisão publicada de cada um.',
    schema: z.object({ bibliotecaId: id, busca: z.string().max(120).optional() }).strict(),
    executar: (c, a) => c.host.listarConjuntos(a.bibliotecaId, a.busca ? { busca: a.busca } : {}),
  }),
  ferramenta({
    name: 'listar_mundos',
    description: 'Lista os mundos de um espaço. Cada mundo guarda cenários.',
    schema: z.object({ espacoId: id }).strict(),
    executar: (c, a) => c.host.listarMundos(a.espacoId),
  }),
  ferramenta({
    name: 'criar_mundo',
    description: 'Cria um mundo no espaço. Depois ligue as bibliotecas que os cenários vão usar.',
    schema: z.object({ espacoId: id, nome }).strict(),
    executar: (c, a) => c.host.criarMundo(a.espacoId, a.nome),
  }),
  ferramenta({
    name: 'ligar_bibliotecas',
    description:
      'Define as bibliotecas que os cenários do mundo podem usar (a lista inteira, não só as novas).',
    schema: z.object({ mundoId: id, bibliotecas: z.array(id).max(64) }).strict(),
    executar: (c, a) => c.host.editarMundo(a.mundoId, { bibliotecas: a.bibliotecas }),
  }),
  ferramenta({
    name: 'listar_cenarios',
    description: 'Lista os cenários de um mundo, com a revisão atual de cada um.',
    schema: z.object({ mundoId: id }).strict(),
    executar: (c, a) => c.host.listarCenarios(a.mundoId),
  }),
  ferramenta({
    name: 'criar_cenario',
    description: 'Cria um cenário vazio no mundo.',
    schema: z.object({ mundoId: id, nome }).strict(),
    executar: (c, a) => c.host.criarCenario(a.mundoId, a.nome),
  }),
  ferramenta({
    name: 'ler_cenario',
    description:
      'Lê o documento inteiro do cenário, a revisão atual e quantos passos há para desfazer e refazer.',
    schema: z.object({ cenarioId: id }).strict(),
    executar: (c, a) => c.host.abrirCenario(a.cenarioId),
  }),
  ferramenta({
    name: 'duplicar_cenario',
    description:
      'Cria uma cópia do cenário no mesmo mundo, para experimentar sem mexer no original.',
    schema: z.object({ cenarioId: id }).strict(),
    executar: (c, a) => c.host.duplicarCenario(a.cenarioId),
  }),
  ferramenta({
    name: 'editar_cenario',
    description: [
      'Aplica um lote de comandos do documento, inteiro ou nada (os mesmos da edição à mão).',
      'Prefira os comandos de intenção (gerar_terreno, encher_agua, tracar_caminho, espalhar...): eles moldam o relevo e enviam as peças por você.',
      'Passe `revisaoEsperada` (obrigatória aqui); se o cenário mudou, a resposta traz `revisaoAtual` e nada é aplicado.',
    ].join(' '),
    schema: z
      .object({
        cenarioId: id,
        revisaoEsperada: z.number().int().min(0),
        comandos: z.array(ComandoDeCenarioSchema).min(1).max(500),
        operacaoId,
      })
      .strict(),
    executar: (c, a) =>
      c.host.editarCenario(
        a.cenarioId,
        a.revisaoEsperada,
        a.comandos,
        a.operacaoId ?? crypto.randomUUID(),
      ),
  }),

  // ----- Intenções: cada uma é um lote, um passo de desfazer -----
  ferramenta({
    name: 'gerar_terreno',
    description:
      'Gera o relevo inteiro por uma receita: `ilha` (altura acima do mar), `colinas`, `vale`, `plano`, entre outras. Cria o relevo se o cenário ainda não tiver um.',
    schema: z.object({ ...lote, receita: ReceitaDeTerrenoSchema }).strict(),
    executar: (c, a) => c.intencoes.gerarTerreno(a.cenarioId, a.receita, opcoesDoLote(a)),
  }),
  ferramenta({
    name: 'esculpir_terreno',
    description:
      'Passa uma ferramenta do relevo pelos pontos (em metros): elevar, abaixar, aplainar, suavizar, nivelar (até `altura`), plato, rampa, ruido, erosao, morro, cratera, furar ou fechar. `raio` e `forca` controlam o pincel.',
    schema: z
      .object({
        ...lote,
        parametros: ParametrosDeTerrenoSchema.partial().required({ ferramenta: true }),
        pontos: z.array(ponto).min(1).max(512),
      })
      .strict(),
    executar: (c, a) =>
      c.intencoes.esculpirTerreno(
        a.cenarioId,
        { parametros: a.parametros, pontos: a.pontos },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'pintar_chao',
    description:
      'Pinta o chão com uma camada de solo pelos pontos. A camada é criada se ainda não existir (até oito).',
    schema: z
      .object({
        ...lote,
        camada: z
          .object({
            id: z.string().regex(/^[a-z0-9-]{1,40}$/),
            nome,
            cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          })
          .strict(),
        pontos: z.array(ponto).min(1).max(512),
        raio: z.number().min(0.25).max(512).optional(),
        forca: z.number().min(0).max(1).optional(),
      })
      .strict(),
    executar: (c, a) =>
      c.intencoes.pintarChao(
        a.cenarioId,
        {
          camada: a.camada,
          pontos: a.pontos,
          ...(a.raio !== undefined ? { raio: a.raio } : {}),
          ...(a.forca !== undefined ? { forca: a.forca } : {}),
        },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'encher_agua',
    description:
      'Põe água: `mar` (num nível), `lago` (enche a bacia a partir de um ponto, até o nível), `rio` (pelos pontos, cavando o leito), `represa` ou `cachoeira`. O leito moldado vai no mesmo lote.',
    schema: z.object({ ...lote, nome: nome.optional(), intencao: IntencaoDeAguaSchema }).strict(),
    executar: (c, a) =>
      c.intencoes.encherAgua(
        a.cenarioId,
        { ...(a.nome ? { nome: a.nome } : {}), intencao: a.intencao },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'tracar_caminho',
    description:
      'Traça um caminho pelos pontos: `trilha`, `praca` (pontos do contorno), `estrada`, `cerca`, `muro` ou `ponte` (dois pontos). Trilha, praça e estrada moldam o relevo por baixo (`moldarTerreno`, padrão sim).',
    schema: z
      .object({
        ...lote,
        caminho: z.looseObject({
          tipo: z.enum(['trilha', 'praca', 'estrada', 'cerca', 'muro', 'ponte']),
          nome: nome.default('Caminho'),
          pontos: z
            .array(z.object({ x: z.number(), z: z.number(), y: z.number().optional() }))
            .min(2)
            .max(512),
          largura: z.number().min(0.05).max(100).default(2),
          acabamento: z.string().nullable().default(null),
        }),
        moldarTerreno: z.boolean().optional(),
      })
      .strict(),
    executar: (c, a) =>
      c.intencoes.tracarCaminho(
        a.cenarioId,
        {
          caminho: a.caminho,
          ...(a.moldarTerreno !== undefined ? { moldarTerreno: a.moldarTerreno } : {}),
        },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'colocar_modelo',
    description:
      'Põe um modelo da biblioteca em (x, z), pisando no chão. `giro` em radianos em volta do eixo vertical.',
    schema: z
      .object({
        ...lote,
        modelo: modeloEscolhido,
        x: z.number().finite(),
        z: z.number().finite(),
        giro: z
          .number()
          .min(-Math.PI * 2)
          .max(Math.PI * 2)
          .optional(),
        escala: z.number().min(0.01).max(100).optional(),
      })
      .strict(),
    executar: (c, a) =>
      c.intencoes.colocarModelo(
        a.cenarioId,
        {
          bibliotecaId: a.modelo.bibliotecaId,
          modeloId: a.modelo.modeloId,
          digest: a.modelo.digest,
          x: a.x,
          z: a.z,
          ...(a.giro !== undefined ? { giro: a.giro } : {}),
          ...(a.escala !== undefined ? { escala: a.escala } : {}),
        },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'montar_conjunto',
    description: 'Monta um conjunto da biblioteca em (x, z), na versão publicada dele.',
    schema: z
      .object({ ...lote, conjuntoId: id, x: z.number().finite(), z: z.number().finite() })
      .strict(),
    executar: (c, a) =>
      c.intencoes.montarConjunto(
        a.cenarioId,
        { conjuntoId: a.conjuntoId, x: a.x, z: a.z },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'espalhar',
    description:
      'Espalha modelos (árvores, pedras, flores) numa área redonda, sem encostar nos objetos que já existem e fora da água (`evitarAgua`, padrão sim). `densidade` é quantos por 100 m².',
    schema: z
      .object({
        ...lote,
        modelos: z.array(modeloEscolhido).min(1).max(8),
        centro: ponto,
        raio: z.number().min(0.2).max(2000),
        densidade: z.number().min(0.1).max(1000).optional(),
        afastamento: z.number().min(0.1).max(100).optional(),
        tamanhoMin: z.number().min(0.01).max(10).optional(),
        tamanhoMax: z.number().min(0.01).max(10).optional(),
        limite: z.number().int().min(1).max(2000).optional(),
        semente: z.number().int().min(0).max(0x7fffffff).optional(),
        evitarAgua: z.boolean().optional(),
      })
      .strict(),
    executar: (c, a) => {
      const { cenarioId, revisaoEsperada: _r, operacaoId: _o, ...pedido } = a
      return c.intencoes.espalhar(cenarioId, pedido, opcoesDoLote(a))
    },
  }),
  ferramenta({
    name: 'alinhar_ao_chao',
    description: 'Faz os objetos pisarem no relevo (apoio no chão), como ao colocar na oficina.',
    schema: z.object({ ...lote, ids: z.array(idDoDocumento).min(1).max(500) }).strict(),
    executar: (c, a) => c.intencoes.alinharAoChao(a.cenarioId, a.ids, opcoesDoLote(a)),
  }),
  ferramenta({
    name: 'encaixar_pecas',
    description:
      'Encaixa peças modulares (caminhos, pontes, rampas, escadas, plataformas, cercas) na vizinha mais perto pelos pontos de encaixe: a peça gira no próprio eixo vertical e anda até as pontas coincidirem, e fica solta do relevo. Os pontos são os escritos à mão no modelo (`encaixes`) ou os da geometria do arquivo. `vizinha` limita a uma peça; `alcance` (metros, padrão 3) é até onde procurar. Devolve o par usado em cada peça.',
    schema: z
      .object({
        ...lote,
        pecas: z.array(idDoDocumento).min(1).max(100),
        vizinha: idDoDocumento.optional(),
        alcance: z.number().positive().max(20).optional(),
      })
      .strict(),
    executar: (c, a) =>
      c.intencoes.encaixarPecas(
        a.cenarioId,
        {
          pecas: a.pecas,
          ...(a.vizinha ? { vizinha: a.vizinha } : {}),
          ...(a.alcance ? { alcance: a.alcance } : {}),
        },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'desenhar_regiao',
    description:
      'Desenha uma região do cenário: um retângulo no chão (x0, z0) a (x1, z1) com nome (Vila, Floresta, Caverna). No Estúdio, o jogo carrega a região onde o personagem está e as vizinhas, e o bloco "Quando entrar na região" usa o nome. Pelo nome: se a região já existe, redesenha a mesma. `vizinhas` são nomes de regiões que já existem (até 8); as vizinhas ficam sempre em par. Regiões não podem se sobrepor, mas podem encostar pela borda.',
    schema: z
      .object({
        ...lote,
        nome: z.string().trim().min(1).max(60),
        x0: z.number().finite(),
        z0: z.number().finite(),
        x1: z.number().finite(),
        z1: z.number().finite(),
        vizinhas: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
      })
      .strict(),
    executar: (c, a) =>
      c.intencoes.desenharRegiao(
        a.cenarioId,
        {
          nome: a.nome,
          x0: a.x0,
          z0: a.z0,
          x1: a.x1,
          z1: a.z1,
          ...(a.vizinhas ? { vizinhas: a.vizinhas } : {}),
        },
        opcoesDoLote(a),
      ),
  }),
  ferramenta({
    name: 'apagar_regiao',
    description:
      'Apaga uma região do cenário pelo nome (ou pelo id). As outras regiões que a tinham como vizinha deixam de ter.',
    schema: z.object({ ...lote, regiao: z.string().trim().min(1).max(200) }).strict(),
    executar: (c, a) => c.intencoes.apagarRegiao(a.cenarioId, a.regiao, opcoesDoLote(a)),
  }),
  ferramenta({
    name: 'desfazer',
    description: 'Desfaz o último passo do cenário (o mesmo botão da oficina).',
    schema: z.object(lote).strict(),
    executar: (c, a) => c.intencoes.moverHistorico(a.cenarioId, 'desfazer', opcoesDoLote(a)),
  }),
  ferramenta({
    name: 'refazer',
    description: 'Refaz o passo desfeito por último.',
    schema: z.object(lote).strict(),
    executar: (c, a) => c.intencoes.moverHistorico(a.cenarioId, 'refazer', opcoesDoLote(a)),
  }),

  // ----- Consultas: não gravam nada -----
  ferramenta({
    name: 'consultar_pontos',
    description:
      'Em cada ponto: se há chão, a altura do relevo e a água que cobre (nível e profundidade).',
    schema: z.object({ cenarioId: id, pontos: z.array(ponto).min(1).max(2000) }).strict(),
    executar: (c, a) => c.intencoes.consultarPontos(a.cenarioId, a.pontos),
  }),
  ferramenta({
    name: 'listar_regioes',
    description:
      'As regiões do cenário (as de carregar o jogo por partes e do bloco "Quando entrar na região"): nome, retângulo no chão e vizinhas. Não confunda com `consultar_regiao`, que lista o que existe num retângulo.',
    schema: z.object({ cenarioId: id }).strict(),
    executar: (c, a) => c.intencoes.listarRegioes(a.cenarioId),
  }),
  ferramenta({
    name: 'consultar_regiao',
    description:
      'O que existe num retângulo do chão (x0, z0) a (x1, z1): objetos, conjuntos, águas, caminhos e marcadores.',
    schema: z
      .object({
        cenarioId: id,
        x0: z.number().finite(),
        z0: z.number().finite(),
        x1: z.number().finite(),
        z1: z.number().finite(),
      })
      .strict(),
    executar: (c, a) =>
      c.intencoes.consultarRegiao(a.cenarioId, { x0: a.x0, z0: a.z0, x1: a.x1, z1: a.z1 }),
  }),
  ferramenta({
    name: 'conferir_implantacao',
    description:
      'Confere onde cada objeto ficou, sem gravar nada: flutuando (um canto da base mais de 15 cm acima do chão), enterrado (mais de 30% da altura abaixo do chão), sólido no meio de trilha, praça, estrada ou ponte, peça fina colada no chão, num caminho ou na água (pode piscar), e os campos `arquipelago.*` que o jogo recusaria (Íris repetida, placa incompleta, física, raio do tronco, fundação, papel inclinado). Devolve a contagem por tipo e até 50 exemplos repartidos entre os tipos.',
    schema: z.object({ cenarioId: id }).strict(),
    executar: (c, a) => c.intencoes.conferirImplantacao(a.cenarioId),
  }),
  ferramenta({
    name: 'orcamento',
    description:
      'Conta objetos, triângulos e bytes do cenário (a partir dos dados de cada modelo) e diz em quais destinos ele cabe: oficina, three (pacote), glb (arquivo único), estudio e arquipelago. É uma estimativa.',
    schema: z.object({ cenarioId: id }).strict(),
    executar: (c, a) => c.intencoes.orcamento(a.cenarioId),
  }),
  ferramenta({
    name: 'capturar_cenario',
    description:
      'Fotografa o cenário. `modo` sem-janela (padrão): um Chrome local, sem tela, monta o palco da oficina; `vista` livre, cima, frente ou lado; `enquadrar` limita a foto a alguns ids; `camera` (posicao, alvo, campoDeVisao em graus) fotografa de um ponto escolhido; precisa do Chrome neste computador. `modo` oficina: espera a oficina aberta neste cenário (aba à vista) abrir a versão atual e fotografá-la com a câmera de quem está nela.',
    schema: z
      .object({
        cenarioId: id,
        modo: z.enum(['sem-janela', 'oficina']).default('sem-janela'),
        vista: z.enum(['livre', 'cima', 'frente', 'lado']).default('livre'),
        largura: z.number().int().min(160).max(1920).default(960),
        enquadrar: z.array(idDoDocumento).max(200).optional(),
        camera: VistaDeCameraSchema.optional(),
      })
      .strict(),
    executar: (c, a) => {
      if (a.modo === 'oficina') {
        if (!c.baixar) throw Error('Este acesso não baixa arquivos do app.')
        return capturarPelaOficina(c.host, c.baixar, a.cenarioId)
      }
      return capturarSemJanela(c.host, a.cenarioId, {
        vista: a.vista,
        largura: a.largura,
        ...(a.enquadrar ? { enquadrar: a.enquadrar } : {}),
        ...(a.camera ? { camera: a.camera } : {}),
      })
    },
  }),
  ferramenta({
    name: 'exportar_cenario',
    description:
      'Exporta o cenário como a oficina: `three` (ZIP com o carregador three.js e um exemplo), `glb` (um arquivo só) ou `raylib` (ZIP para Raylib, sempre com as peças juntadas). `juntar` une as peças estáticas por região (`tamanhoDaRegiao`, em metros) para desenhar mais leve. Grava o arquivo neste computador em `saida` (arquivo ou pasta; sem ela, a pasta atual) e devolve o caminho, as medidas e os avisos. Precisa do Chrome neste computador.',
    schema: z
      .object({
        cenarioId: id,
        destino: z.enum(['three', 'glb', 'raylib']),
        juntar: z.boolean().default(false),
        tamanhoDaRegiao: z.number().int().min(16).max(512).default(64),
        revisaoEsperada,
        saida: z.string().min(1).max(1024).optional(),
      })
      .strict(),
    executar: (c, a) =>
      exportarCenario(
        c.host,
        a.cenarioId,
        {
          destino: a.destino,
          juntar: a.juntar,
          tamanhoDaRegiao: a.tamanhoDaRegiao,
          ...(a.revisaoEsperada !== undefined ? { revisaoEsperada: a.revisaoEsperada } : {}),
          ...(a.saida ? { saida: a.saida } : {}),
        },
        c.executarPagina ?? paginaNoChrome(),
      ),
  }),
  ferramenta({
    name: 'validar_lote',
    description:
      'Confere um lote de comandos sem gravar, com a mesma regra do servidor. Diz se passaria e quanto o cenário ficaria.',
    schema: z
      .object({ cenarioId: id, comandos: z.array(ComandoDeCenarioSchema).min(1).max(500) })
      .strict(),
    executar: (c, a) => c.intencoes.validarLote(a.cenarioId, a.comandos),
  }),
] as const

/** A resposta de uma captura: a imagem e os dados dela. */
export const ehImagem = (v: unknown): v is { imagem: Uint8Array; tipo: string } =>
  typeof v === 'object' && v !== null && 'imagem' in v && v.imagem instanceof Uint8Array

export type Resposta = { ok: true; valor: unknown } | { ok: false; erro: Record<string, unknown> }

/** Roda uma ferramenta pelo nome: a entrada é conferida ANTES de qualquer chamada ao serviço. */
export async function executarFerramenta(
  contexto: Contexto,
  nomeDaFerramenta: string,
  argumentos: unknown,
): Promise<Resposta> {
  const f = FERRAMENTAS.find((x) => x.name === nomeDaFerramenta)
  if (!f) return { ok: false, erro: { erro: 'Ferramenta desconhecida' } }
  try {
    const entrada = f.schema.parse(argumentos ?? {})
    return {
      ok: true,
      valor: await (f.executar as (c: Contexto, a: unknown) => Promise<unknown>)(contexto, entrada),
    }
  } catch (falha) {
    if (falha instanceof z.ZodError)
      return {
        ok: false,
        erro: {
          erro: 'Entrada inválida',
          problemas: falha.issues.slice(0, 12).map((i) => `${i.path.join('.')}: ${i.message}`),
        },
      }
    if (falha instanceof CenarioMudou || falha instanceof CenarioDesatualizado)
      return { ok: false, erro: { erro: falha.message, revisaoAtual: falha.revisaoAtual } }
    if (falha instanceof ErroDaOficina)
      return {
        ok: false,
        erro: { erro: falha.message, codigo: falha.codigo, ...(falha.detalhes ?? {}) },
      }
    return { ok: false, erro: { erro: falha instanceof Error ? falha.message : String(falha) } }
  }
}
