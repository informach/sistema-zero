import { MAX_BYTES_DO_ENVELOPE_DE_PUBLICACAO } from '@sistemazero/molda-cenarios-core/publicacao'
import type { GatewayConfigInput } from './gateway-config.schema'

type Route = NonNullable<GatewayConfigInput['routes']>[number]

/** Documento/fragmento até 8 MiB, mais envelope limitado de comandos e protocolo. */
export const CENARIOS_LOTE_MAX_BYTES = 8 * 1024 * 1024 + 64 * 1024
/** Registro de até 50 modelos de uma vez, afirmado pelo BFF. */
export const CENARIOS_REGISTRO_MAX_BYTES = 256 * 1024

/**
 * Molda Cenários (oficina de cenários 3D): bibliotecas, modelos, mundos e cenários guardados no
 * `members`. Rotas explícitas, uma por caminho, para nenhum curinga abrir o que não foi pensado.
 *
 * - Quem pode usar a ferramenta (`CENARIOS_MODO`) e de quem é cada espaço é o `members` que
 *   decide; aqui só entra conta ativa com JWT.
 * - Os caminhos não têm `admin` nem `internal`, então a política do Kids deixa a criança passar
 *   (`kidsMayAccess`). O responsável, na área dos pais, não entra.
 * - Arquivo nenhum passa pela borda: o navegador sobe o modelo direto ao armazenamento, por URL
 *   assinada pelo BFF. Só o BFF (HMAC) afirma que o arquivo chegou, em `/members/internal/cenarios`.
 */
export function cenariosRoutes(transforms: Route['transforms']): Route[] {
  const base = {
    service: 'members',
    auth: { required: true, mode: 'any', strategies: ['jwt'] },
    authorize: { statuses: ['active'] },
    transforms,
  } satisfies Partial<Route>
  const ler = (id: string, caminho: string): Route => ({
    ...base,
    id: `members-cenarios-${id}`,
    methods: ['GET'],
    pathPattern: `/members/cenarios${caminho}`,
    // A gaveta da biblioteca pagina e busca enquanto a criança digita.
    rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
  })
  const escrever = (
    id: string,
    metodo: 'POST' | 'PATCH' | 'DELETE',
    caminho: string,
    opcoes: { corpo?: number; porMinuto?: number } = {},
  ): Route => ({
    ...base,
    id: `members-cenarios-${id}`,
    methods: [metodo],
    pathPattern: `/members/cenarios${caminho}`,
    rateLimit: { max: opcoes.porMinuto ?? 120, windowMs: 60_000, by: 'principal' },
    ...(metodo === 'DELETE' ? {} : { maxBodyBytes: opcoes.corpo ?? 64 * 1024 }),
  })
  const interna = (id: string, caminho: string, corpo: number): Route => ({
    id: `members-cenarios-interno-${id}`,
    methods: ['POST'],
    pathPattern: `/members/internal/cenarios${caminho}`,
    service: 'members',
    auth: { required: true, mode: 'any', strategies: ['hmac'], allowedConsumers: ['member-shell'] },
    transforms,
    maxBodyBytes: corpo,
    // Por conta: uma família importando um pacote grande não segura a fila das outras.
    rateLimit: { max: 300, windowMs: 60_000, by: 'json-field', field: 'ator.contaId' },
  })

  return [
    ler('acesso', '/acesso'),
    ler('espacos', '/espacos'),
    ler('publicacao-perfil', '/publicacoes/perfis/:ilha'),
    escrever('publicacao-preparar', 'POST', '/publicacoes/preparar'),
    escrever('publicacao-manifesto-reservar', 'POST', '/publicacoes/manifesto/reservar'),

    ler('bibliotecas', '/espacos/:espacoId/bibliotecas'),
    escrever('biblioteca-criar', 'POST', '/espacos/:espacoId/bibliotecas'),
    escrever('biblioteca-molda', 'POST', '/espacos/:espacoId/biblioteca-molda'),
    escrever('biblioteca-editar', 'PATCH', '/bibliotecas/:id'),
    escrever('biblioteca-apagar', 'DELETE', '/bibliotecas/:id'),

    ler('modelos', '/bibliotecas/:id/modelos'),
    ler('texturas', '/bibliotecas/:id/texturas'),
    escrever('texturas-reservar', 'POST', '/bibliotecas/:id/texturas/reservar'),
    escrever('texturas-apagar', 'POST', '/bibliotecas/:id/texturas/apagar'),
    escrever('textura-editar', 'PATCH', '/texturas/:id'),
    ler('conjuntos', '/bibliotecas/:id/conjuntos'),
    escrever('conjunto-criar', 'POST', '/bibliotecas/:id/conjuntos', {
      corpo: CENARIOS_LOTE_MAX_BYTES,
    }),
    ler('conjunto', '/conjuntos/:id'),
    ler('conjunto-versao', '/conjuntos/:id/versoes/:revisao'),
    escrever('conjunto-editar', 'PATCH', '/conjuntos/:id'),
    escrever('conjunto-oficina', 'POST', '/conjuntos/:id/editar'),
    escrever('conjunto-publicar', 'POST', '/conjuntos/:id/publicar', {
      corpo: CENARIOS_LOTE_MAX_BYTES,
      porMinuto: 30,
    }),
    escrever(
      'conjunto-miniatura-reservar',
      'POST',
      '/conjuntos/:id/versoes/:revisao/miniatura/reservar',
    ),
    escrever('conjunto-apagar', 'DELETE', '/conjuntos/:id'),
    ler('biblioteca-organizacao', '/bibliotecas/:id/organizacao'),
    // Até 50 arquivos por chamada: 120 chamadas por minuto cobrem um pacote de milhares.
    escrever('modelos-reservar', 'POST', '/bibliotecas/:id/modelos/reservar'),
    escrever('modelos-apagar', 'POST', '/bibliotecas/:id/modelos/apagar'),
    escrever('modelo-editar', 'PATCH', '/modelos/:id'),
    ler('arquivo', '/espacos/:espacoId/arquivos/:digest'),

    ler('mundos', '/espacos/:espacoId/mundos'),
    ler('mundo', '/mundos/:id'),
    escrever('mundo-criar', 'POST', '/espacos/:espacoId/mundos'),
    escrever('mundo-editar', 'PATCH', '/mundos/:id'),
    escrever('mundo-apagar', 'DELETE', '/mundos/:id'),

    ler('cenarios', '/mundos/:id/cenarios'),
    escrever('cenario-criar', 'POST', '/mundos/:id/cenarios'),
    ler('cenario', '/cenarios/:id'),
    escrever('cenario-exportacao', 'POST', '/cenarios/:id/exportacao', {
      corpo: 1024,
      porMinuto: 30,
    }),
    ler('cenario-historico', '/cenarios/:id/historico'),
    ler('cenario-revisoes', '/cenarios/:id/revisoes'),
    escrever('cenario-historico-mover', 'POST', '/cenarios/:id/historico'),
    escrever('cenario-restaurar', 'POST', '/cenarios/:id/restaurar'),
    // A edição: cada gesto vira um lote. O editor junta os gestos numa fila, mas arrastar e
    // pintar rápido passa fácil de dois por segundo.
    escrever('cenario-lotes', 'POST', '/cenarios/:id/lotes', {
      corpo: CENARIOS_LOTE_MAX_BYTES,
      porMinuto: 600,
    }),
    escrever('cenario-duplicar', 'POST', '/cenarios/:id/duplicar'),
    escrever('cenario-recursos-reservar', 'POST', '/cenarios/:id/recursos/reservar'),
    escrever('cenario-capa-reservar', 'POST', '/cenarios/:id/capa/reservar'),
    escrever('cenario-apagar', 'DELETE', '/cenarios/:id'),

    interna('modelos', '/modelos', CENARIOS_REGISTRO_MAX_BYTES),
    interna('texturas', '/texturas', CENARIOS_REGISTRO_MAX_BYTES),
    interna('lotes', '/lotes', CENARIOS_LOTE_MAX_BYTES),
    interna('capa', '/capa', 16 * 1024),
    interna('conjunto-miniatura', '/conjuntos/miniatura', 16 * 1024),
    interna('publicacao-recursos', '/publicacoes/recursos', MAX_BYTES_DO_ENVELOPE_DE_PUBLICACAO),
    interna('publicacao-confirmar', '/publicacoes/confirmar', MAX_BYTES_DO_ENVELOPE_DE_PUBLICACAO),
    interna('publicacao-jogo-perfil', '/publicacoes/jogo/perfil', 16 * 1024),
    interna('publicacao-jogo-arquivo', '/publicacoes/jogo/arquivo', 16 * 1024),
  ]
}
