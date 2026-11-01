import {
  aprendaIssoEm,
  aprendaODesafio,
  type ConteudoDoDesafio,
  type CoresConquistadas,
  type DesafioAberto,
  type DesafiosDoJogador,
  diaDeSaoPaulo,
  ILHAS,
  type IlhaId,
  ilha,
  ilhaAberta,
  type LinguagemDoDesafio,
  linguagemDoProjeto,
  migrarConteudoDoDesafio,
  type PedirAmbienteDoDesafio,
  POSICOES_DA_JORNADA,
  ProjetoDoMinijogoSchema,
  postoDoCursoBase,
  QUADROS_POR_ILHA,
  type ResultadoDaVerificacao,
  resumoDoDesafio,
  type VerificarDesafio,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import { type CandidatoDoDia, escolherDesafioDoDia } from '../domain/desafio-do-dia'
import {
  chaveDasMoedas,
  eVersao2,
  passouNosObrigatorios,
  semanaDeSaoPaulo,
  situacaoDoDesafio,
} from '../domain/desafios'
import type {
  ConclusaoGuardada,
  DesafioPublicado,
  RepositorioDoJogadorNosDesafios,
} from '../domain/desafios.port'
import type { Jogador } from '../domain/jogador'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../domain/membros.port'
import type { RepositorioDosMinijogos } from '../domain/minijogos.port'
import type { PortaDasMoedas } from '../domain/moedas.port'
import type { RepositorioDasRevisoesHumanas } from '../domain/revisoes-humanas.port'
import {
  AcessoBloqueadoError,
  DesafioBloqueadoError,
  DesafioMudouError,
  DesafioNaoEncontradoError,
  DesafiosDesligadosError,
  PlataformaIndisponivelError,
} from './erros'
import { type LeiturasDosMembros, publicoDosMembros } from './leituras-dos-membros'

/** `ARQUIPELAGO_DESAFIOS`: desligado, só a equipe (para testar) ou aberto a quem joga. */
export type ModoDosDesafios = 'desligado' | 'equipe' | 'aberto'

/** Prêmios pendentes cobrados de novo por leitura da lista (o resto fica para a próxima). */
const COBRANCAS_POR_LISTA = 3

/**
 * O lado de quem joga os desafios (decisão de 27/10/2026): lista da ilha com a situação e o
 * "Aprenda isso em", abrir (sem gabarito e sem regras), conferir no Members com o verificador das
 * aulas e o prêmio uma vez só (moedas com chave única pela porta do Members).
 * - Feito continua feito: concluído, nada é recalculado.
 * - Suporte (somente leitura) abre e confere, sem gravar e sem prêmio.
 * - Equipe vê todas as ilhas abertas e todos os blocos.
 */
export class ServicoDosDesafios {
  constructor(
    private readonly deps: {
      politica: PoliticaDeAcesso
      modo: ModoDosDesafios
      repo: RepositorioDoJogadorNosDesafios
      leituras: LeiturasDosMembros
      membros: PortaDosMembros | null
      moedas: PortaDasMoedas | null
      logger: Logger
      minijogos?: RepositorioDosMinijogos
      /** A fila da revisão humana da Lenda (lacunas, 01/11/2026). */
      revisoes?: RepositorioDasRevisoesHumanas
      agora?: () => Date
    },
  ) {}

  /** Só leitura: conquistas não dependem de publicação, carteira ou Members disponíveis. */
  async cores(jogador: Jogador): Promise<CoresConquistadas> {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
    const conclusoes = await this.deps.repo.conclusoes(jogador.id, jogador.publico)
    return {
      versao: 1,
      ilhas: ILHAS.map((i) => ({ id: i.id, quadros: posicoesConquistadas(conclusoes, i.id) })),
    }
  }

  async listar(jogador: Jogador, ilha?: IlhaId): Promise<DesafiosDoJogador> {
    this.exigirLigado(jogador)
    const [publicados, conclusoes, regua, curriculo] = await Promise.all([
      this.deps.repo.listarPublicados(jogador.publico),
      this.deps.repo.conclusoes(jogador.id, jogador.publico),
      this.regua(jogador),
      this.deps.leituras.curriculo(publicoDosMembros(jogador)),
    ])
    const feitos = new Map(conclusoes.map((c) => [c.desafioId, c]))
    const rotulos = new Map(curriculo.catalogo.map((b) => [b.type, b.rotulo]))
    const doDia = await this.doDia(jogador, publicados, feitos, regua)
    // A revisão humana da Lenda (lacunas, 01/11/2026): uma leitura, usada nos desafios que pedem.
    const revisoes = this.deps.revisoes ? await this.deps.revisoes.daPessoa(jogador.id) : null
    // Com `?ilha=`, o desafio do dia de outra ilha vem junto (o cartão do dia precisa dele).
    const desafios = publicados
      .filter((d) => !ilha || d.metadados.ilha === ilha || d.id === doDia?.id)
      .flatMap((d) => {
        const conteudo = conteudoDe(d, this.deps.logger)
        if (!conteudo) return []
        const feito = feitos.get(d.id)
        const linguagem = linguagemDoProjeto(conteudo.projetoInicial)
        const { situacao, faltam } = situacaoDoDesafio({
          concluido: feito !== undefined,
          ilhaAberta: ilhaAberta(d.metadados.ilha, regua.posicao),
          blocosExigidos: d.publicacao.blocosExigidos,
          blocos: regua.blocos,
          faltaCurso: faltaCursoBase(linguagem, d.metadados.ilha, regua.cursosBase),
        })
        return [
          {
            id: d.id,
            revisao: d.publicacao.revisao,
            ilha: d.metadados.ilha,
            tipo: d.metadados.tipo,
            quadro: d.metadados.quadro,
            ordem: d.metadados.ordem,
            titulo: conteudo.titulo,
            situacao,
            faltam: faltam.map((bloco) => ({
              bloco,
              rotulo: rotulos.get(bloco) ?? null,
              cursos: aprendaIssoEm(bloco, curriculo),
            })),
            aprenda: aprendaODesafio(
              {
                linguagem,
                posto:
                  postoDoCursoBase(linguagem, d.metadados.ilha) ?? postoDaIlha(d.metadados.ilha),
                blocos: d.publicacao.blocosExigidos,
              },
              curriculo,
            ),
            recompensa: conteudo.recompensa,
            recompensaVista: feito?.recompensaVistaEm != null,
            extraFeito: feito?.extraConcluidoEm != null,
            // O cartão do Quadro (01/11/2026): o que se faz e a miniatura, só nos quadros de ilha
            // aberta (a lista inteira levaria a de todas as ilhas a cada leitura).
            resumo: resumoDoDesafio(conteudo),
            ...(d.metadados.tipo === 'quadro-das-cores' &&
            situacao !== 'ilha-fechada' &&
            conteudo.imagem
              ? { imagem: conteudo.imagem }
              : {}),
            ...(conteudo.recompensa.revisaoHumana && revisoes
              ? { revisaoHumana: revisoes.get(d.id) ?? null }
              : {}),
          },
        ]
      })
    if (!jogador.somenteLeitura)
      await this.cobrarPendentes(jogador, conclusoes, COBRANCAS_POR_LISTA)
    return {
      versao: 1,
      ilhas: ILHAS.map((i) => ({
        id: i.id,
        aberta: ilhaAberta(i.id, regua.posicao),
        quadro: { feitos: quadrosFeitos(conclusoes, i.id), total: QUADROS_POR_ILHA },
      })),
      desafios,
      doDia,
    }
  }

  /**
   * O desafio do dia da pessoa: o guardado hoje (fixo até a meia-noite de São Paulo) ou, na
   * primeira leitura do dia, a escolha da regra (`escolherDesafioDoDia`) entre os publicados de
   * tipo `desafio-do-dia` ao alcance dela. Suporte vê a escolha sem gravar. Um guardado que deixou
   * de estar publicado (arquivado no meio do dia) some até amanhã.
   */
  private async doDia(
    jogador: Jogador,
    publicados: readonly DesafioPublicado[],
    feitos: ReadonlyMap<string, ConclusaoGuardada>,
    regua: Regua,
  ): Promise<DesafiosDoJogador['doDia']> {
    const dia = diaDeSaoPaulo(this.agora())
    const guardado = await this.deps.repo.desafioDoDia(jogador.id, dia)
    if (guardado) {
      const aindaPublicado = publicados.some((d) => d.id === guardado.desafioId)
      return aindaPublicado
        ? { id: guardado.desafioId, dia, feito: guardado.feitoEm !== null }
        : null
    }
    const candidatos: CandidatoDoDia[] = publicados.flatMap((d) => {
      if (d.metadados.tipo !== 'desafio-do-dia') return []
      const aberta = ilhaAberta(d.metadados.ilha, regua.posicao)
      const { situacao } = situacaoDoDesafio({
        concluido: false,
        ilhaAberta: aberta,
        blocosExigidos: d.publicacao.blocosExigidos,
        blocos: regua.blocos,
        faltaCurso: faltaCursoBase(
          linguagemDoProjeto(
            (d.publicacao.conteudo as { projetoInicial?: unknown } | null)?.projetoInicial,
          ),
          d.metadados.ilha,
          regua.cursosBase,
        ),
      })
      if (situacao !== 'disponivel') return []
      return [
        {
          id: d.id,
          ilha: d.metadados.ilha,
          posicaoDaIlha: ilha(d.metadados.ilha).posicao,
          ordem: d.metadados.ordem,
          feitoEm: feitos.get(d.id)?.concluidoEm ?? null,
        },
      ]
    })
    const escolhido = escolherDesafioDoDia(dia, candidatos)
    if (!escolhido) return null
    if (jogador.somenteLeitura) return { id: escolhido, dia, feito: false }
    const fixo = await this.deps.repo.guardarDesafioDoDia({
      jogadorId: jogador.id,
      dia,
      desafioId: escolhido,
      agora: this.agora(),
    })
    return { id: fixo.desafioId, dia, feito: fixo.feitoEm !== null }
  }

  async abrir(jogador: Jogador, id: string): Promise<DesafioAberto> {
    this.exigirLigado(jogador)
    const desafio = await this.deps.repo.lerPublicado(id)
    if (!desafio || desafio.metadados.publico !== jogador.publico)
      throw new DesafioNaoEncontradoError()
    const conteudo = conteudoDe(desafio, this.deps.logger)
    if (!conteudo) throw new DesafioNaoEncontradoError()
    const feito = await this.feito(jogador, id)
    if (!feito) await this.exigirDisponivel(jogador, desafio.metadados.ilha, desafio.publicacao)
    const progresso = await this.deps.repo.progresso(jogador.id, id)
    const regua = await this.regua(jogador)
    return {
      id,
      jogadorId: jogador.id,
      blocosPermitidos: regua.blocos === 'todos' ? null : [...regua.blocos],
      revisao: desafio.publicacao.revisao,
      titulo: conteudo.titulo,
      enunciado: conteudo.enunciado,
      dicas: conteudo.dicas,
      desafioExtra: conteudo.desafioExtra ?? null,
      ...(conteudo.imagem ? { imagem: conteudo.imagem } : {}),
      objetivos: desafio.publicacao.vista,
      projetoInicial: conteudo.projetoInicial,
      // Resultados de outra revisão não valem: os objetivos podem ter mudado.
      ultimosResultados:
        progresso?.revisao === desafio.publicacao.revisao ? progresso.ultimosResultados : [],
      concluido: feito !== undefined,
    }
  }

  /**
   * O ambiente Python do Estúdio de desafio (C02b). As mesmas conferências da verificação (a
   * revisão publicada, o público, a ilha aberta ou o desafio feito); o Members confere o pedido
   * do Estúdio contra o projeto INICIAL desta revisão e devolve a decisão. Nada é guardado.
   */
  async ambiente(jogador: Jogador, id: string, pedido: PedirAmbienteDoDesafio): Promise<unknown> {
    this.exigirLigado(jogador)
    const lido = await this.deps.repo.lerPublicacao(id, pedido.revisao)
    if (!lido || lido.desafio.metadados.publico !== jogador.publico)
      throw new DesafioNaoEncontradoError()
    if (lido.desafio.situacao !== 'publicado') throw new DesafioMudouError()
    const conteudo = conteudoDe({ id, publicacao: lido.publicacao }, this.deps.logger)
    if (!conteudo) throw new DesafioMudouError()
    const feito = await this.feito(jogador, id)
    if (!feito) await this.exigirDisponivel(jogador, lido.desafio.metadados.ilha, lido.publicacao)
    if (!this.deps.membros) throw new PlataformaIndisponivelError()
    try {
      return await this.deps.membros.autorizarAmbiente({
        requester: jogador.id,
        accountId: jogador.contaId ?? jogador.id,
        audience: publicoDosMembros(jogador),
        projetoInicial: conteudo.projetoInicial,
        pedido: pedido.pedido,
      })
    } catch (erro) {
      if (erro instanceof MembrosIndisponiveisError) throw new PlataformaIndisponivelError(erro)
      throw erro
    }
  }

  async verificar(
    jogador: Jogador,
    id: string,
    pedido: VerificarDesafio,
  ): Promise<ResultadoDaVerificacao> {
    this.exigirLigado(jogador)
    const lido = await this.deps.repo.lerPublicacao(id, pedido.revisao)
    if (!lido || lido.desafio.metadados.publico !== jogador.publico)
      throw new DesafioNaoEncontradoError()
    // Arquivado (ou a pessoa abriu uma revisão que nunca foi publicada): abrir de novo.
    if (lido.desafio.situacao !== 'publicado') throw new DesafioMudouError()
    const conteudo = conteudoDe({ id, publicacao: lido.publicacao }, this.deps.logger)
    if (!conteudo) throw new DesafioMudouError()
    const feito = await this.feito(jogador, id)
    if (!feito) await this.exigirDisponivel(jogador, lido.desafio.metadados.ilha, lido.publicacao)
    if (!this.deps.membros) throw new PlataformaIndisponivelError()
    const copia = conteudo.recompensa.atracao
      ? JSON.parse(JSON.stringify(ProjetoDoMinijogoSchema.parse(pedido.projeto)))
      : null

    let conferencia: Awaited<ReturnType<PortaDosMembros['verificarObjetivos']>>
    try {
      conferencia = await this.deps.membros.verificarObjetivos({
        requester: jogador.id,
        audience: publicoDosMembros(jogador),
        objetivos: conteudo.objetivos,
        projetoInicial: conteudo.projetoInicial,
        projeto: pedido.projeto,
      })
    } catch (erro) {
      if (erro instanceof MembrosIndisponiveisError) throw new PlataformaIndisponivelError(erro)
      throw erro
    }
    const resultados = conferencia.resultados
    const passou = passouNosObrigatorios(conteudo.objetivos, resultados)
    if (jogador.somenteLeitura)
      return { passou: passou.principal, resultados, concluidoAgora: false, extraAgora: false }

    const agora = this.agora()
    // Lenda (lacunas, 01/11/2026): a versão 2 e a volta à revisão humana comparam com o aprovado
    // guardado, lido antes de o envio de agora o trocar. Reenviar o mesmo jogo não conta.
    const lenda = conteudo.recompensa.extraNaVersao2 || conteudo.recompensa.revisaoHumana
    const versao2 =
      lenda && feito && conteudo.recompensa.atracao && this.deps.minijogos
        ? eVersao2({
            jaAprovado: true,
            passouAgora: passou.principal,
            aprovadoGuardado: (await this.deps.minijogos.abrir(jogador.id, id))?.projeto,
            enviado: copia,
          })
        : false
    if (passou.principal && conteudo.recompensa.atracao && this.deps.minijogos)
      await this.deps.minijogos.guardar({
        jogador,
        desafioId: id,
        titulo: conteudo.titulo,
        projeto: copia,
        agora,
      })
    const medida = await this.deps.repo.guardarTentativa({
      jogadorId: jogador.id,
      desafioId: id,
      revisao: pedido.revisao,
      resultados,
      dicas: pedido.dicas ?? 0,
      agora,
    })
    const concluidoAgora = passou.principal
      ? await this.deps.repo.concluir({
          jogadorId: jogador.id,
          desafioId: id,
          publico: jogador.publico,
          revisao: pedido.revisao,
          moedas: conteudo.recompensa.moedas,
          moedasExtra: conteudo.recompensa.moedasExtra,
          tentativas: medida.tentativas,
          dicas: medida.dicas,
          agora,
        })
      : false
    // O desafio do dia de hoje passou: "Amanhã tem outro" (vale também para quem refaz).
    if (passou.principal)
      await this.deps.repo.marcarDesafioDoDiaFeito(jogador.id, diaDeSaoPaulo(agora), id, agora)
    if (
      passou.principal &&
      conteudo.recompensa.revisaoHumana &&
      this.deps.revisoes &&
      (!feito || versao2)
    )
      await this.deps.revisoes.enviar({
        jogadorId: jogador.id,
        desafioId: id,
        publico: jogador.publico,
        titulo: conteudo.titulo,
        agora,
      })
    // O extra vale com o principal passando junto (e uma vez só). Na versão 2, o extra é o envio
    // mudado depois da aprovação, com os objetivos opcionais (se houver) passando junto.
    const extraPassou = conteudo.recompensa.extraNaVersao2
      ? Boolean(versao2) && (passou.extra || !conteudo.objetivos.some((o) => o.optional))
      : passou.extra
    const extraAgora =
      passou.principal && extraPassou
        ? await this.deps.repo.marcarExtra(jogador.id, id, agora)
        : false
    if (concluidoAgora || extraAgora) {
      const conclusoes = await this.deps.repo.conclusoes(jogador.id, jogador.publico)
      await this.cobrarPendentes(
        jogador,
        conclusoes.filter((c) => c.desafioId === id),
        2,
      )
    }
    return { passou: passou.principal, resultados, concluidoAgora, extraAgora }
  }

  /** O jogo mostrou a festa do prêmio: não mostra de novo. */
  async recompensaVista(jogador: Jogador, id: string): Promise<{ ok: true }> {
    this.exigirLigado(jogador)
    if (!jogador.somenteLeitura)
      await this.deps.repo.marcarRecompensaVista(jogador.id, id, this.agora())
    return { ok: true }
  }

  private exigirLigado(jogador: Jogador): void {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
    const { modo } = this.deps
    if (modo === 'desligado' || (modo === 'equipe' && !jogador.equipe))
      throw new DesafiosDesligadosError()
    // Sem Members não há régua (posto e blocos) nem conferência: só os desafios desligam.
    if (!this.deps.leituras.ligadas()) throw new PlataformaIndisponivelError()
  }

  /** Posição na jornada, blocos e cursos-base conquistados; a equipe tem tudo aberto. */
  private async regua(jogador: Jogador): Promise<Regua> {
    if (jogador.equipe)
      return { posicao: POSICOES_DA_JORNADA, blocos: 'todos', cursosBase: 'todos' }
    const dados = await this.deps.leituras.jogador(jogador)
    return {
      posicao: dados.posicao,
      blocos: new Set(dados.blocos),
      // Members anterior, sem o campo: nenhum curso-base, então a linguagem do posto espera.
      cursosBase: new Set(dados.cursosBase ?? []),
    }
  }

  private async feito(jogador: Jogador, id: string): Promise<ConclusaoGuardada | undefined> {
    const conclusoes = await this.deps.repo.conclusoes(jogador.id, jogador.publico)
    return conclusoes.find((c) => c.desafioId === id)
  }

  private async exigirDisponivel(
    jogador: Jogador,
    ilha: IlhaId,
    publicacao: { blocosExigidos: string[]; conteudo?: unknown },
  ): Promise<void> {
    const regua = await this.regua(jogador)
    const { situacao } = situacaoDoDesafio({
      concluido: false,
      ilhaAberta: ilhaAberta(ilha, regua.posicao),
      blocosExigidos: publicacao.blocosExigidos,
      blocos: regua.blocos,
      faltaCurso: faltaCursoBase(
        linguagemDoProjeto(
          (publicacao.conteudo as { projetoInicial?: unknown } | null)?.projetoInicial,
        ),
        ilha,
        regua.cursosBase,
      ),
    })
    if (situacao === 'ilha-fechada' || situacao === 'falta-curso' || situacao === 'faltam-blocos')
      throw new DesafioBloqueadoError(situacao)
  }

  /**
   * Paga os prêmios que esperam: os pendentes e os que bateram no teto numa semana anterior (a chave
   * é a mesma em toda tentativa, então repetir é seguro). Falha não atrapalha a pessoa: o prêmio
   * continua esperando para a próxima vez.
   */
  private async cobrarPendentes(
    jogador: Jogador,
    conclusoes: readonly ConclusaoGuardada[],
    limite: number,
  ): Promise<void> {
    const moedas = this.deps.moedas
    if (!moedas) return
    const semana = semanaDeSaoPaulo(this.agora())
    const espera = (situacao: string, tetoSemana: string | null) =>
      situacao === 'pendente' || (situacao === 'teto' && tetoSemana !== semana)
    const pendentes = conclusoes
      .flatMap((c) => [
        ...(espera(c.moedasSituacao, c.moedasTetoSemana)
          ? [{ desafioId: c.desafioId, premio: 'principal' as const, valor: c.moedas }]
          : []),
        ...(espera(c.moedasExtraSituacao, c.moedasExtraTetoSemana)
          ? [{ desafioId: c.desafioId, premio: 'extra' as const, valor: c.moedasExtra }]
          : []),
      ])
      .slice(0, limite)
    for (const p of pendentes) {
      try {
        const r = await moedas.creditar({
          userId: jogador.id,
          // Adulto: a conta é a própria pessoa. Kids: o perfil e a conta da família.
          accountId: jogador.contaId ?? jogador.id,
          audience: publicoDosMembros(jogador),
          key: chaveDasMoedas(jogador.id, p.desafioId, p.premio),
          amount: p.valor,
        })
        if (r.situacao === 'recusado') {
          this.deps.logger.error('arquipelago.moedas_recusadas', {
            desafioId: p.desafioId,
            premio: p.premio,
            codigo: r.codigo,
          })
          continue
        }
        await this.deps.repo.marcarMoedas(jogador.id, p.desafioId, p.premio, r.situacao, semana)
        // Teto cheio vale para os outros prêmios desta semana também: não insiste.
        if (r.situacao === 'teto') return
      } catch (erro) {
        this.deps.logger.warn('arquipelago.moedas_pendentes', {
          desafioId: p.desafioId,
          premio: p.premio,
          erro: erro instanceof Error ? erro.name : 'desconhecido',
        })
        return
      }
    }
  }

  private agora(): Date {
    return this.deps.agora?.() ?? new Date()
  }
}

/** Quadros do Quadro das Cores feitos na ilha (um por número, arquivados inclusive). */
export function quadrosFeitos(conclusoes: readonly ConclusaoGuardada[], ilha: IlhaId): number {
  return posicoesConquistadas(conclusoes, ilha).length
}

export function posicoesConquistadas(
  conclusoes: readonly ConclusaoGuardada[],
  ilha: IlhaId,
): number[] {
  return [
    ...new Set(
      conclusoes
        .filter((c) => c.tipo === 'quadro-das-cores' && c.ilha === ilha && c.quadro !== null)
        .map((c) => c.quadro)
        .filter(
          (q): q is number => q !== null && Number.isInteger(q) && q >= 1 && q <= QUADROS_POR_ILHA,
        ),
    ),
  ].sort((a, b) => a - b)
}

interface Regua {
  posicao: number
  blocos: ReadonlySet<string> | 'todos'
  cursosBase: ReadonlySet<string> | 'todos'
}

/** A linguagem do posto pede o curso-base do posto da ilha (A3); blocos seguem só pelos blocos. */
function faltaCursoBase(
  linguagem: LinguagemDoDesafio,
  id: IlhaId,
  cursosBase: Regua['cursosBase'],
): boolean {
  // No Farol, a variante de cada linguagem pede o curso-base de onde a linguagem começa (A29).
  const posto = postoDoCursoBase(linguagem, id)
  if (posto === null || cursosBase === 'todos') return false
  return !cursosBase.has(posto)
}

function postoDaIlha(id: IlhaId): string {
  return ilha(id).posto
}

function conteudoDe(
  d: Pick<DesafioPublicado, 'id' | 'publicacao'>,
  logger: Logger,
): ConteudoDoDesafio | null {
  const conteudo = migrarConteudoDoDesafio(d.publicacao.conteudo)
  // Publicação guardada fora do formato atual: some da lista e vai ao log (nunca inventar).
  if (!conteudo)
    logger.error('arquipelago.publicacao_ilegivel', {
      desafioId: d.id,
      revisao: d.publicacao.revisao,
    })
  return conteudo
}
