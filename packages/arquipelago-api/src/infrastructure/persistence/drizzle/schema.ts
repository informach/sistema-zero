import {
  FANTASMA_MAX_BYTES,
  type Insumo,
  type ItensDaVenda,
  LIMITES_DO_DESAFIO,
  type MetadadosDoDesafio,
  type MoradorDoPedido,
  type PagamentoDaProfissao,
  type PagamentoDaVenda,
  type PagamentoDoPedido,
  PERCURSOS,
  type PostoDaVila,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { SituacaoDaCompra } from '../../../domain/insumos.port'

/**
 * Schema `arquipelago` (Postgres compartilhado, 1 schema por bounded context). Só o serviço do
 * jogo lê e grava aqui; a plataforma nunca toca estas tabelas (e o jogo nunca toca as dela).
 */
export const arquipelagoSchema = pgSchema('arquipelago')

/** Uma cópia aprovada por jogador e desafio; a primeira aprovação é preservada para medição. */
export const minijogos = arquipelagoSchema.table(
  'minijogos',
  {
    jogadorId: uuid().notNull(),
    desafioId: uuid().notNull(),
    publico: varchar({ length: 8 }).notNull(),
    titulo: varchar({ length: 200 }).notNull(),
    projeto: text().notNull(),
    capa: text(),
    aprovadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.desafioId] }),
    check('minijogos_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check(
      'minijogos_tamanho_check',
      sql`length(${t.projeto}) <= ${sql.raw(String(LIMITES_DO_DESAFIO.projetoCaracteres))}`,
    ),
  ],
)

/** Um salvamento por jogador (perfil no Kids, conta no adulto). `revisao` é a trava. */
export const salvamentos = arquipelagoSchema.table(
  'salvamentos',
  {
    jogadorId: uuid().primaryKey(),
    publico: varchar({ length: 8 }).notNull(),
    revisao: integer().notNull(),
    dados: jsonb().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    check('salvamentos_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check('salvamentos_revisao_check', sql`${t.revisao} >= 1`),
  ],
)

/** Mudança confirmada por revisão. Não contém identidade da criação nem prova de autoria. */
export const mudancasDeAparencia = arquipelagoSchema.table(
  'mudancas_de_aparencia',
  {
    jogadorId: uuid()
      .notNull()
      .references(() => salvamentos.jogadorId, { onDelete: 'cascade' }),
    revisao: integer().notNull(),
    objeto: varchar({ length: 40 }).notNull(),
    publico: varchar({ length: 8 }).notNull(),
    origem: varchar({ length: 10 }).notNull(),
    registradoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.revisao, t.objeto] }),
    check('mudancas_aparencia_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check(
      'mudancas_aparencia_origem_check',
      sql`${t.origem} in ('pinta', 'molda', 'criacao', 'galeria')`,
    ),
    check('mudancas_aparencia_revisao_check', sql`${t.revisao} >= 2`),
    index('mudancas_aparencia_periodo_idx').on(t.publico, t.registradoEm),
  ],
)

/** Um melhor trajeto por percurso. Nenhum nome nem sessão histórica é guardado. */
export const fantasmas = arquipelagoSchema.table(
  'fantasmas',
  {
    jogadorId: uuid()
      .notNull()
      .references(() => salvamentos.jogadorId, { onDelete: 'cascade' }),
    percurso: varchar({ length: 40 }).notNull(),
    publico: varchar({ length: 8 }).notNull(),
    dados: jsonb().notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.percurso] }),
    check('fantasmas_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check(
      'fantasmas_percurso_check',
      sql`${t.percurso} in (${sql.join(
        PERCURSOS.map((id) => sql.raw(`'${id}'`)),
        sql`, `,
      )})`,
    ),
    check(
      'fantasmas_tamanho_check',
      sql`octet_length(${t.dados}::text) <= ${sql.raw(String(FANTASMA_MAX_BYTES))}`,
    ),
    check(
      'fantasmas_versao_check',
      sql`${t.dados}->>'versao' = '1' and ${t.dados}->>'percurso' = ${t.percurso}`,
    ),
  ],
)

/** Consentimento adulto revogável. O código em claro não é persistido. */
export const convitesAdultos = arquipelagoSchema.table(
  'convites_adultos',
  {
    jogadorId: uuid()
      .primaryKey()
      .references(() => salvamentos.jogadorId, { onDelete: 'cascade' }),
    hash: varchar({ length: 64 }).notNull().unique(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [check('convites_adultos_hash_check', sql`${t.hash} ~ '^[0-9a-f]{64}$'`)],
)

/**
 * Visitas de outras crianças (N08a, 30/10/2026): o convite de cada criança anfitriã, só o hash do
 * código, gerado pelo responsável da conta dela. Apagar o salvamento apaga o convite.
 */
export const convitesDeAmigos = arquipelagoSchema.table(
  'convites_de_amigos',
  {
    perfilId: uuid()
      .primaryKey()
      .references(() => salvamentos.jogadorId, { onDelete: 'cascade' }),
    contaId: uuid().notNull(),
    hash: varchar({ length: 64 }).notNull().unique(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [check('convites_de_amigos_hash_check', sql`${t.hash} ~ '^[0-9a-f]{64}$'`)],
)

/** As casas de amigos que cada família aceitou, com o apelido que ela deu (N08a). */
export const casasDeAmigos = arquipelagoSchema.table(
  'casas_de_amigos',
  {
    id: uuid().primaryKey().defaultRandom(),
    contaVisitante: uuid().notNull(),
    perfilAnfitriao: uuid()
      .notNull()
      .references(() => salvamentos.jogadorId, { onDelete: 'cascade' }),
    apelido: varchar({ length: 24 }).notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('casas_de_amigos_par').on(t.contaVisitante, t.perfilAnfitriao),
    check('casas_de_amigos_apelido_check', sql`char_length(${t.apelido}) between 1 and 24`),
  ],
)

/** Segundos de tempo livre por jogador e dia civil de São Paulo. */
export const tempoDiario = arquipelagoSchema.table(
  'tempo_diario',
  {
    jogadorId: uuid().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    segundos: integer().notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.dia] }),
    check('tempo_diario_segundos_check', sql`${t.segundos} between 0 and 86400`),
  ],
)

/** Eventos aceitos, para que uma resposta perdida possa ser reenviada sem somar duas vezes. */
export const eventosTempo = arquipelagoSchema.table(
  'eventos_tempo',
  {
    jogadorId: uuid().notNull(),
    eventoId: uuid().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    segundos: integer().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.eventoId] }),
    check('eventos_tempo_segundos_check', sql`${t.segundos} between 1 and 120`),
  ],
)

/** Uma única concessão ativa por perfil, independentemente do número de abas. */
export const controleDeTempo = arquipelagoSchema.table('controle_de_tempo', {
  jogadorId: uuid().primaryKey(),
  sessaoAtual: uuid(),
})

/** Histórico mínimo para reconhecer repetições e impedir que uma sessão antiga seja reaberta. */
export const sessoesDeTempo = arquipelagoSchema.table(
  'sessoes_de_tempo',
  {
    jogadorId: uuid().notNull(),
    sessaoId: uuid().notNull(),
    cursor: timestamp({ withTimezone: true }).notNull(),
    vencimento: timestamp({ withTimezone: true }).notNull(),
    estado: varchar({ length: 12 }).notNull(),
    ultimaSequencia: integer().notNull(),
    ultimaAcao: varchar({ length: 12 }).notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.sessaoId] }),
    check('sessoes_de_tempo_estado_check', sql`${t.estado} in ('ativa', 'encerrada', 'expirada')`),
    check('sessoes_de_tempo_sequencia_check', sql`${t.ultimaSequencia} >= 0`),
    check('sessoes_de_tempo_acao_check', sql`${t.ultimaAcao} in ('iniciar', 'pulsar', 'pausar')`),
  ],
)

/** O limite diário que o responsável escolheu para a família (sem linha = 30 minutos). */
export const limitesDaFamilia = arquipelagoSchema.table(
  'limites_da_familia',
  {
    contaId: uuid().primaryKey(),
    minutos: integer().notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [check('limites_da_familia_minutos_check', sql`${t.minutos} between 10 and 240`)],
)

/**
 * De que conta é cada criança (28/10/2026, fase1-18): gravado quando ela guarda o jogo, com a conta
 * que vem do login dela (`x-auth-account-id`). É o que deixa a área dos pais ler a semana só das
 * crianças da própria conta, sem confiar na lista que chega pelo repasse.
 */
export const perfisDaConta = arquipelagoSchema.table(
  'perfis_da_conta',
  {
    jogadorId: uuid().primaryKey(),
    contaId: uuid().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index('perfis_da_conta_conta_idx').on(t.contaId)],
)

/**
 * As permissões de visita da família (ECA Digital, art. 21; sem linha = o padrão restrito do
 * contrato, `PERMISSOES_PADRAO`). As visitas são da Fase 3: hoje só se grava e se lê.
 */
export const permissoesDaFamilia = arquipelagoSchema.table('permissoes_da_familia', {
  contaId: uuid().primaryKey(),
  visitasDeIrmaos: boolean().notNull(),
  visitasDeOutrasCriancas: boolean().notNull(),
  fotosNoClube: boolean().notNull(),
  atualizadoEm: timestamp({ withTimezone: true }).notNull(),
})

/**
 * As compras da galeria (fase1-13, 29/10/2026): uma linha por jogador e aparência. Nasce
 * `pendente` com a chave que vai ao Members (repetir nunca cobra duas vezes) e vira `paga` quando
 * o Members confirma o débito. Só a paga vale como aparência dela.
 */
export const comprasDaGaleria = arquipelagoSchema.table(
  'compras_da_galeria',
  {
    jogadorId: uuid().notNull(),
    aparenciaId: varchar({ length: 80 }).notNull(),
    objeto: varchar({ length: 20 }).notNull(),
    moedas: integer().notNull(),
    chave: uuid().notNull(),
    situacao: varchar({ length: 10 }).notNull(),
    criadaEm: timestamp({ withTimezone: true }).notNull(),
    pagaEm: timestamp({ withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.aparenciaId] }),
    uniqueIndex('compras_da_galeria_chave_idx').on(t.chave),
    check('compras_da_galeria_situacao_check', sql`${t.situacao} in ('pendente', 'paga')`),
    check('compras_da_galeria_moedas_check', sql`${t.moedas} >= 0`),
  ],
)

/**
 * Os desafios cadastrados pela equipe (seção Jogo do Admin). `revisao` é a trava da edição; a
 * publicação congela uma cópia em `desafio_publicacoes`. Um quadro do Quadro das Cores por ilha e
 * público (fora os arquivados).
 */
export const desafios = arquipelagoSchema.table(
  'desafios',
  {
    id: uuid().primaryKey(),
    slug: varchar({ length: 80 }).notNull(),
    publico: varchar({ length: 8 }).notNull(),
    ilha: varchar({ length: 40 }).notNull(),
    tipo: varchar({ length: 40 }).notNull(),
    quadro: smallint(),
    ordem: integer().notNull(),
    situacao: varchar({ length: 12 }).notNull(),
    revisao: integer().notNull(),
    revisaoPublicada: integer(),
    /** Projeção da posição publicada para impor unicidade, atualizada na transação de publicação. */
    metadadosPublicados: jsonb().$type<MetadadosDoDesafio>(),
    conteudo: jsonb().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoPor: uuid().notNull(),
  },
  (t) => [
    uniqueIndex('desafios_slug_unico').on(t.slug),
    uniqueIndex('desafios_quadro_unico')
      .on(
        sql`coalesce(${t.metadadosPublicados}->>'publico', ${t.publico})`,
        sql`coalesce(${t.metadadosPublicados}->>'ilha', ${t.ilha})`,
        sql`(case when ${t.metadadosPublicados} is null then ${t.quadro} else (${t.metadadosPublicados}->>'quadro')::int end)`,
      )
      .where(
        sql`coalesce(${t.metadadosPublicados}->>'tipo', ${t.tipo}) = 'quadro-das-cores' and ${t.situacao} <> 'arquivado'`,
      ),
    index('desafios_lista').on(t.publico, t.ilha, t.ordem),
    check('desafios_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check(
      'desafios_tipo_check',
      sql`${t.tipo} in ('quadro-das-cores', 'desafio-do-dia', 'pedido-de-morador')`,
    ),
    check('desafios_situacao_check', sql`${t.situacao} in ('rascunho', 'publicado', 'arquivado')`),
    check(
      'desafios_quadro_check',
      sql`(${t.tipo} = 'quadro-das-cores') = (${t.quadro} is not null) and (${t.quadro} is null or ${t.quadro} between 1 and 6)`,
    ),
    check('desafios_revisao_check', sql`${t.revisao} >= 1`),
  ],
)

/** Cópia imutável de cada publicação: o que a pessoa joga e o que a conferência usa. */
export const desafioPublicacoes = arquipelagoSchema.table(
  'desafio_publicacoes',
  {
    desafioId: uuid()
      .notNull()
      .references(() => desafios.id, { onDelete: 'cascade' }),
    revisao: integer().notNull(),
    metadados: jsonb().$type<MetadadosDoDesafio>().notNull(),
    conteudo: jsonb().notNull(),
    blocosDerivados: text().array().notNull(),
    blocosExigidos: text().array().notNull(),
    /** Os objetivos como a criança os vê (sem regra), feitos pelo Members na publicação. */
    vista: jsonb().notNull(),
    analise: jsonb().notNull(),
    publicadoEm: timestamp({ withTimezone: true }).notNull(),
    publicadoPor: uuid().notNull(),
  },
  (t) => [primaryKey({ columns: [t.desafioId, t.revisao] })],
)

/** O último resultado de cada objetivo para quem está tentando (por desafio). */
export const desafioProgresso = arquipelagoSchema.table(
  'desafio_progresso',
  {
    jogadorId: uuid().notNull(),
    desafioId: uuid()
      .notNull()
      .references(() => desafios.id, { onDelete: 'cascade' }),
    revisao: integer().notNull(),
    ultimosResultados: jsonb().notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.jogadorId, t.desafioId] })],
)

/**
 * Desafio feito. Feito continua feito: existindo a linha, a disponibilidade não é recalculada
 * (mudança nos blocos dos cursos não tira o que a pessoa fez). As moedas saem pela porta do
 * Members com chave única; `moedas_situacao` guarda o que ainda falta confirmar (`teto` = o teto
 * semanal de moedas do jogo já tinha sido alcançado: o prêmio espera e é cobrado de novo numa semana
 * seguinte, guardada em `moedas_teto_semana`).
 */
export const desafiosConcluidos = arquipelagoSchema.table(
  'desafios_concluidos',
  {
    jogadorId: uuid().notNull(),
    desafioId: uuid()
      .notNull()
      .references(() => desafios.id, { onDelete: 'cascade' }),
    publico: varchar({ length: 8 }).notNull(),
    revisao: integer().notNull(),
    concluidoEm: timestamp({ withTimezone: true }).notNull(),
    extraConcluidoEm: timestamp({ withTimezone: true }),
    recompensaVistaEm: timestamp({ withTimezone: true }),
    moedas: integer().notNull(),
    moedasSituacao: varchar({ length: 12 }).notNull(),
    moedasExtra: integer().notNull(),
    moedasExtraSituacao: varchar({ length: 12 }).notNull(),
    /** Semana (segunda, em São Paulo, `AAAA-MM-DD`) em que o prêmio bateu no teto semanal. */
    moedasTetoSemana: varchar({ length: 10 }),
    moedasExtraTetoSemana: varchar({ length: 10 }),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.desafioId] }),
    index('desafios_concluidos_jogador').on(t.jogadorId),
    check('desafios_concluidos_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check(
      'desafios_concluidos_moedas_check',
      sql`${t.moedasSituacao} in ('nenhuma', 'pendente', 'creditado', 'teto') and ${t.moedasExtraSituacao} in ('nenhuma', 'pendente', 'creditado', 'teto')`,
    ),
  ],
)

/**
 * O desafio do dia de cada pessoa (28/10/2026): escolhido na primeira leitura do dia de São Paulo e
 * fixo até a meia-noite (`domain/desafio-do-dia.ts`). `feito_em`: a conferência passou nesse
 * desafio naquele dia ("Amanhã tem outro"), mesmo quando ele já tinha sido feito antes.
 */
export const desafioDoDia = arquipelagoSchema.table(
  'desafio_do_dia',
  {
    jogadorId: uuid().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    desafioId: uuid()
      .notNull()
      .references(() => desafios.id, { onDelete: 'cascade' }),
    escolhidoEm: timestamp({ withTimezone: true }).notNull(),
    feitoEm: timestamp({ withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.jogadorId, t.dia] })],
)

/** Uma sessão remunerada por balcão/dia. Prêmio e regra são imutáveis depois da reserva. */
export const turnosRemunerados = arquipelagoSchema.table(
  'turnos_remunerados',
  {
    id: uuid().primaryKey(),
    jogadorId: uuid().notNull(),
    contaId: uuid().notNull(),
    publico: varchar({ length: 8 }).$type<PublicoJogo>().notNull(),
    posto: varchar({ length: 20 }).$type<PostoDaVila>().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    versao: integer().notNull(),
    moedas: integer().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
    concluidoEm: timestamp({ withTimezone: true }),
    pagamento: varchar({ length: 12 }).$type<PagamentoDaProfissao>().notNull(),
    tetoSemana: date({ mode: 'string' }),
  },
  (t) => [
    uniqueIndex('turnos_remunerados_dia').on(t.jogadorId, t.publico, t.posto, t.dia),
    index('turnos_remunerados_pendentes').on(t.jogadorId, t.publico, t.pagamento, t.criadoEm),
    check('turnos_remunerados_publico', sql`${t.publico} in ('kids','adulto')`),
    check('turnos_remunerados_posto', sql`${t.posto} in ('padaria','sorveteria','sucos')`),
    check('turnos_remunerados_valores', sql`${t.versao} = 1 and ${t.moedas} between 1 and 100`),
    check(
      'turnos_remunerados_pagamento',
      sql`(${t.concluidoEm} is null and ${t.pagamento} = 'aguardando' and ${t.tetoSemana} is null) or (${t.concluidoEm} is not null and ((${t.pagamento} in ('pendente','creditado') and ${t.tetoSemana} is null) or (${t.pagamento} = 'teto' and ${t.tetoSemana} is not null)))`,
    ),
  ],
)

/** Comando econômico fora do save. A reserva sobrevive à perda da resposta da carteira. */
export const comprasDeInsumos = arquipelagoSchema.table(
  'compras_de_insumos',
  {
    chave: uuid().primaryKey(),
    jogadorId: uuid()
      .notNull()
      .references(() => salvamentos.jogadorId),
    contaId: uuid().notNull(),
    publico: varchar({ length: 8 }).$type<PublicoJogo>().notNull(),
    versao: integer().notNull(),
    revisaoBase: integer().notNull(),
    item: varchar({ length: 40 }).$type<Insumo>().notNull(),
    quantidade: smallint().notNull(),
    moedas: smallint().notNull(),
    situacao: varchar({ length: 20 }).$type<SituacaoDaCompra>().notNull(),
    saldo: integer(),
    criadaEm: timestamp({ withTimezone: true }).notNull(),
    concluidaEm: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('compras_de_insumos_pendente')
      .on(t.jogadorId)
      .where(sql`${t.situacao} = 'pendente'`),
    index('compras_de_insumos_jogador').on(t.jogadorId, t.publico, t.criadaEm),
    check('compras_de_insumos_publico', sql`${t.publico} in ('kids','adulto')`),
    check(
      'compras_de_insumos_valores',
      sql`${t.versao} = 1 and ${t.revisaoBase} between 1 and 2147483646 and ${t.quantidade} between 1 and 10 and ${t.moedas} between 1 and 30`,
    ),
    check(
      'compras_de_insumos_estado',
      sql`(${t.situacao} = 'pendente' and ${t.concluidaEm} is null and ${t.saldo} is null) or (${t.situacao} = 'entregue' and ${t.concluidaEm} is not null and ${t.saldo} is not null and ${t.saldo} >= 0) or (${t.situacao} in ('saldo-insuficiente','recusada') and ${t.concluidaEm} is not null and ${t.saldo} is null)`,
    ),
  ],
)

/** Consumo e cesta já confirmados; crédito retomável com chave financeira gerada no serviço. */
export const pedidosRemunerados = arquipelagoSchema.table(
  'pedidos_remunerados',
  {
    chave: uuid().primaryKey(),
    pagamentoId: uuid().notNull().unique(),
    jogadorId: uuid()
      .notNull()
      .references(() => salvamentos.jogadorId),
    contaId: uuid().notNull(),
    publico: varchar({ length: 8 }).$type<PublicoJogo>().notNull(),
    versao: integer().notNull(),
    revisaoBase: integer().notNull(),
    morador: varchar({ length: 12 }).$type<MoradorDoPedido>().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    pedido: varchar({ length: 40 }).notNull(),
    moedas: smallint().$type<3 | 4>().notNull(),
    pagamento: varchar({ length: 12 }).$type<PagamentoDoPedido>().notNull(),
    /** Com `teto`: a semana em que bateu; o crédito volta numa semana seguinte (§6.28, A32). */
    tetoSemana: date({ mode: 'string' }),
    entregueEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('pedidos_remunerados_dia').on(t.jogadorId, t.publico, t.morador, t.dia),
    index('pedidos_remunerados_pendente')
      .on(t.jogadorId, t.publico, t.entregueEm)
      .where(sql`${t.pagamento} = 'pendente'`),
    check('pedidos_remunerados_publico', sql`${t.publico} in ('kids','adulto')`),
    check(
      'pedidos_remunerados_morador',
      sql`${t.morador} in ('capi','bento','mare','floco','jade','irie','nico')`,
    ),
    check(
      'pedidos_remunerados_valores',
      sql`${t.versao} = 1 and ${t.revisaoBase} between 1 and 2147483646 and ${t.moedas} in (3,4)`,
    ),
    check(
      'pedidos_remunerados_pagamento',
      sql`${t.pagamento} in ('pendente','creditado','teto','recusado')`,
    ),
    check(
      'pedidos_remunerados_teto',
      sql`(${t.pagamento} = 'teto') = (${t.tetoSemana} is not null)`,
    ),
    index('pedidos_remunerados_teto_espera')
      .on(t.jogadorId, t.publico, t.entregueEm)
      .where(sql`${t.pagamento} = 'teto'`),
  ],
)

/**
 * A banca da feira (§6.28, A22): uma venda por perfil e dia, até cinco pratos, com a chave
 * financeira gerada no servidor e o pagamento. O consumo dos pratos acontece sob a trava do save.
 */
export const vendasNaFeira = arquipelagoSchema.table(
  'vendas_na_feira',
  {
    chave: uuid().primaryKey(),
    pagamentoId: uuid().notNull().unique(),
    jogadorId: uuid()
      .notNull()
      .references(() => salvamentos.jogadorId),
    contaId: uuid().notNull(),
    publico: varchar({ length: 8 }).$type<PublicoJogo>().notNull(),
    versao: integer().notNull(),
    revisaoBase: integer().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    itens: jsonb().$type<ItensDaVenda>().notNull(),
    moedas: smallint().notNull(),
    pagamento: varchar({ length: 12 }).$type<PagamentoDaVenda>().notNull(),
    /** Com `teto`: a semana em que bateu; o crédito volta numa semana seguinte (§6.28, A32). */
    tetoSemana: date({ mode: 'string' }),
    vendidaEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('vendas_na_feira_dia').on(t.jogadorId, t.publico, t.dia),
    index('vendas_na_feira_pendente')
      .on(t.jogadorId, t.publico, t.vendidaEm)
      .where(sql`${t.pagamento} = 'pendente'`),
    check('vendas_na_feira_publico', sql`${t.publico} in ('kids','adulto')`),
    check(
      'vendas_na_feira_valores',
      sql`${t.versao} = 1 and ${t.revisaoBase} between 1 and 2147483646 and ${t.moedas} between 1 and 10`,
    ),
    check(
      'vendas_na_feira_pagamento',
      sql`${t.pagamento} in ('pendente','creditado','teto','recusado')`,
    ),
    check('vendas_na_feira_teto', sql`(${t.pagamento} = 'teto') = (${t.tetoSemana} is not null)`),
    index('vendas_na_feira_teto_espera')
      .on(t.jogadorId, t.publico, t.vendidaEm)
      .where(sql`${t.pagamento} = 'teto'`),
  ],
)

export const schema = {
  mudancasDeAparencia,
  convitesAdultos,
  convitesDeAmigos,
  casasDeAmigos,
  fantasmas,
  pedidosRemunerados,
  vendasNaFeira,
  comprasDeInsumos,
  turnosRemunerados,
  minijogos,
  salvamentos,
  tempoDiario,
  eventosTempo,
  controleDeTempo,
  sessoesDeTempo,
  limitesDaFamilia,
  perfisDaConta,
  permissoesDaFamilia,
  comprasDaGaleria,
  desafios,
  desafioPublicacoes,
  desafioProgresso,
  desafiosConcluidos,
  desafioDoDia,
}
