# Pendências financeiras na conta Kids/Adultos

O resultado incerto de uma regularização agora aparece na própria assinatura,
independentemente do histórico de pagamentos. Se o webhook já liquidou o pagamento,
a pendência continua visível até sua conferência auditada; atualizar a página não
convida a pagar novamente. A leitura pública contém somente tipo/estado, sem IDs
do provedor, executor, autor ou dados de cartão.

Payments consulta as operações vigentes em um SELECT para os IDs já escopados ao
e-mail autenticado (até 50 assinaturas). READY vencido não aparece; EXECUTING e
UNKNOWN permanecem pendentes até confirmação. Consulta não escreve nem chama a
operadora. Os contextos de cartão e regularização passam a explicar qual operação
os bloqueia, em vez de responder com uma falha genérica.

Kids e Adultos usam a mesma leitura com loading, erro explícito e botão para
atualizar. Uma falha não é apresentada como ausência de assinaturas e não deixa
ações financeiras de uma leitura antiga na tela. Leituras substituídas/desmontadas
são abortadas; respostas antigas não substituem a lista nova. Nenhum POST é repetido
automaticamente. Cancelamento conserva sua mensagem própria e o período pago.

## Verificação local

- RED contra os três serviços anteriores: **1 pass / 3 fail**, restaurando o
  candidato byte a byte depois do controle; confirma o desaparecimento da pendência
  e os contextos genéricos do código anterior.
- Payments completo em PostgreSQL 17 dedicado: **532 testes / 1640 asserções**,
  zero falhas/skips. Tipos completos do Payments: exit 0.
- UI compartilhada, executada isoladamente: **14 testes / 111 asserções**, zero
  falhas. Inclui outra operação bloqueadora, consentimento,
  tokenização, perda de resposta e resposta antiga após atualização.
- Kids, tela real da área dos pais: **13 testes / 65 asserções**, zero falhas.
- Adulto completo: **90 testes / 446 asserções**, zero falhas. O wrapper inclui a
  tela real de assinaturas isolada, sem somar suas asserções internas novamente.
- Contratos compartilhados de cartão/retry/continuidade: **10 testes / 53
  asserções externas**, zero falhas (inclui wrapper da UI, não somar duplicado).
- Tipagem focada do formulário/hook/fixture compartilhados, heap 1024 MiB: exit 0.
- Biome, diff check e instalação frozen sem scripts conferidos.

A primeira tipagem local esgotou o heap ao puxar o módulo amplo de tipos de aulas
para o hook financeiro. O contrato de assinaturas foi movido para o módulo
financeiro leve, com reexport no agregador existente. A verificação focada então
identificou um uso incorreto do segundo argumento de `apiGet`; a correção usa o
terceiro argumento para AbortSignal, com RED causal e GREEN no transporte real da
fixture. Não foi escondido erro com cast, supressão ou aumento de heap.

A dependência de DOM da nova prova adulta foi declarada como devDependency. O lock
mantém o grafo anterior, acrescentando somente essa declaração de workspace; a
instalação frozen passou. Atualizações oportunistas de tipos não fazem parte do lote.

## Limites

Não houve cobrança, troca de cartão, cancelamento, aviso ou acesso a cliente real.
Sem migration nova neste lote. Configuração/ativação financeira, sandbox e navegação
autenticada integrada dos dois públicos, demais exceções e full review continuam
pendentes. A execução local não substitui o typecheck completo dos apps no CI.
