# Encerramento por ciclo posterior pago — 24/10/2026

## Resultado

O Admin pode conferir um ciclo posterior pago para encerrar um acompanhamento
antigo. A cobrança original continua FAILED. O encerramento usa o motivo próprio
SUBSEQUENT_CYCLE_PAID, mantém auditoria permanente do administrador/request e
identifica o recibo posterior, a origem observada e seu período. Não há débito,
payment.paid adicional, concessão de período ou alteração fictícia do recibo antigo.

A ação exige conta administrativa própria, versão e request ID. O cliente não
informa datas, ator ou identificadores da operadora. A aplicação consulta novamente
a assinatura e os dois detalhes de cobrança. Exige assinatura ativa, origem antiga
recusada e recibo posterior local PAID/VERIFIED_PERIOD, com titular, contrato,
valor/moeda e período coincidentes com a fonte. Dados ausentes ou divergentes,
cancelamento solicitado, operação pendente ou lease vigente impedem o fechamento.

O repositório confere versões, identidade e frescor depois dos locks; caso,
auditoria e evento são atômicos. A prova é conferida novamente depois das escritas.
Replays retornam a decisão auditada sem outra consulta. A confirmação e retirada
de avisos usam o mesmo closeout durável, com tentativas/janela limitadas.

A descoberta também reconsidera admissões IGNORED/CASE_EXISTS em lote limitado,
somente após não existir outro caso ativo e se a origem continuar elegível. Preserva
política e tentativas totais; não reinicia o orçamento nem o prazo de caso anterior.

Os templates de confirmação agora distinguem confirmação de um pagamento de
liquidação de todas as recusas antigas. Continuam oito templates, sem nova variável
ou transporte e com destinatário Kids/responsável versus Adulto/titular preservado.

## Verificação

- Migration 0023 gerada pelo Drizzle: tabela de auditoria e ampliação do CHECK de
  motivos. Aplicada no PostgreSQL QA r13 desde zero, sem alteração dos ambientes.
- Payments completo: **582 testes, 1.824 asserções, zero falhas/skips**, 46 arquivos,
  19,71 s. Após o último ajuste de guarda/idempotência, os **18 cenários de banco,
  68 asserções** deste lote foram reexecutados e passaram.
- Banco real: dois administradores, fonte divergente, recibo/período ausentes,
  versões alteradas durante consulta, lease/intenção pendentes e rollback depois
  de expiração após locks/escritas. A prova de retomada percorre descoberta,
  claim e admissão reais da recusa seguinte, sem alterar a recusa antiga.
- Tipagem completa Payments e tipagem focada da UI Admin: exit 0.
- Admin DOM/BFF: dois wrappers externos aprovados; a matriz interna inclui a nova
  ação, permissões, JSON estrito, ausência de ator/datas e clique duplo. Não somar
  novamente contagens dos wrappers e testes internos.
- Templates: um teste com 61 asserções, oito modelos renderizados, sem placeholders
  pendentes e com escape HTML e distinção de públicos preservados.

Logs locais: `financial-resolution-full-r1.log`,
`financial-resolution-db-final-r1.log`, `financial-resolution-types-final-r1.log`,
`financial-resolution-admin-r1.log`, `financial-resolution-admin-types-r1.log` e
`financial-resolution-templates-r1.log`, no cache de release do worktree principal.

## Limites

Não houve mensagem, cobrança ou cancelamento real. Esta evidência é local, com
PostgreSQL e gateway falso; não substitui sandbox, navegação autenticada nem o
ensaio integrado de ambos os públicos. Configuração, ativação e deploy financeiro
continuam pendentes. Operações com resultado desconhecido continuam exigindo
conferência; esta ação não inventa sucesso nem libera repetição ambígua de cartão.
