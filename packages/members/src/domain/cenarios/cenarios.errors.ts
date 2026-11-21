import { DomainError } from '../shared/errors'

/** A ferramenta não está aberta para esta pessoa (ou está desligada no ambiente). → 403. */
export class CenariosFechadosError extends DomainError {
  readonly code = 'CENARIOS_FECHADOS'
  constructor(message = 'A oficina de cenários ainda não está aberta para esta conta') {
    super(message)
  }
}

/** Não deu para conferir o Molda de quem pede agora (banco ou jornada fora). → 424 (não 5xx: o
 * disjuntor do gateway contaria contra o members inteiro); tentar de novo resolve, ao contrário
 * do "fechado". */
export class CenariosIndisponiveisError extends DomainError {
  readonly code = 'CENARIOS_INDISPONIVEIS'
  constructor(readonly causa?: unknown) {
    super('Não consegui conferir o seu acesso agora. Tente de novo em instantes.')
  }
}

/** Não existe, ou é de outro espaço (nunca vaza existência). → 404. */
export class CenarioNaoEncontradoError extends DomainError {
  readonly code = 'CENARIO_NAO_ENCONTRADO'
  constructor(oque = 'O que você procura') {
    super(`${oque} não existe mais`)
  }
}

/** O cenário mudou em outro lugar depois da revisão que quem editava conhecia. → 409. */
export class CenarioDesatualizadoError extends DomainError {
  readonly code = 'CENARIO_DESATUALIZADO'
  constructor(readonly revisaoAtual: number) {
    super('O cenário mudou em outro lugar; abra a versão nova para continuar')
  }
}

/** O lote não vale: comando recusado ou vínculo quebrado. → 422, com os problemas. */
export class CenarioInvalidoError extends DomainError {
  readonly code = 'CENARIO_INVALIDO'
  constructor(readonly problemas: readonly string[]) {
    super(problemas[0] ?? 'Esta mudança não vale')
  }
}

/** Passou da cota do espaço ou de um teto de quantidade. → 409. */
export class CenariosSemEspacoError extends DomainError {
  readonly code = 'CENARIOS_SEM_ESPACO'
  constructor(message = 'O espaço está cheio: apague modelos que não usa para trazer mais') {
    super(message)
  }
}

/** O arquivo de um modelo não foi enviado, ou não é o que a reserva dizia. → 409, com os digests. */
export class CenarioArquivoAusenteError extends DomainError {
  readonly code = 'CENARIO_ARQUIVO_AUSENTE'
  constructor(readonly digests: readonly string[]) {
    super('Faltam arquivos de modelos; envie de novo')
  }
}

/** O mesmo arquivo acabou de ficar sem dono e ainda está saindo do armazenamento. → 409,
 * o cliente tenta de novo em instantes (a nova reserva pede o envio outra vez). */
export class CenarioArquivoSaindoError extends DomainError {
  readonly code = 'CENARIO_ARQUIVO_SAINDO'
  constructor() {
    super('Este arquivo acabou de ser apagado. Tente de novo em instantes.')
  }
}

/** O lote cria ou muda uma ferramenta que o posto de quem pede ainda não liberou. → 403, com as
 * famílias trancadas. Desfazer, refazer e voltar a uma versão nunca caem aqui. */
export class CenarioFerramentaTrancadaError extends DomainError {
  readonly code = 'CENARIO_FERRAMENTA_TRANCADA'
  constructor(readonly familias: readonly { id: string; rotulo: string }[]) {
    super(
      `Esta ferramenta ainda não está liberada para você: ${familias.map((f) => f.rotulo).join(', ')}`,
    )
  }
}

/** A biblioteca é restrita e a ação a levaria para fora da conta. → 403. */
export class BibliotecaRestritaError extends DomainError {
  readonly code = 'BIBLIOTECA_RESTRITA'
  constructor(message = 'Os modelos desta biblioteca são de uso restrito desta conta') {
    super(message)
  }
}
