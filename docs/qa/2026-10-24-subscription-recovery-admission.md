# Entrada durável de regularização — 24/10/2026

Lote posterior a `6bdad049d`, na branch financeira. Não ativa avisos, débito ou
cancelamento D7; não constitui o full review financeiro ou validação em produção.

## Escopo revisado

Migration **0015 gerada por Drizzle** cria uma entrada única por pagamento. A
descoberta só considera renovação de cartão recusada, assinatura ativa com ciclo
anterior pago, sem pedido de cancelamento e observação dentro da ativação da política.
A política é congelada na descoberta. Política desabilitada impede descobrir e
reivindicar novas entradas; não há janela de sete dias iniciada nessa etapa.

Claims usam transações curtas, SKIP LOCKED, lease com identidade e prazo, tentativas
limitadas e atraso persistido. Cinco tentativas sem conclusão terminam em revisão,
inclusive após crash no último executor. Workers são seriais, limitados a quatro
entradas por rodada, sem sobrepor ticks; parada drena o trabalho em andamento.

A admissão exige público vindo da metadata confiável da compra e GET recente da
assinatura e da cobrança, com identidade/valor/vínculo conferidos. Data ausente ou
anterior à ativação não entra automaticamente; público desconhecido fica em revisão.
Uma renovação posterior paga impede usar a cobrança antiga como prova de não
pagamento. Nenhum texto de recusa é usado para autorizar efeitos financeiros.

Caso único por origem e por assinatura ativa conserva idempotência entre réplicas.
Se houver crash após abrir o caso, sua mesma origem é recuperada, mesmo quando o
caso já encerrou. Pedido de cancelamento concorrente também é conferido dentro da
transação de criação do caso. O worker genérico de cancelamento continua sem executar
solicitações NONPAYMENT.

## Verificação executada

- PostgreSQL 17 próprio, banco descartável `sistemazero_recovery_test_r6`, porta
  15463; migrations aplicadas desde banco vazio até 0015.
- Suíte Payments: **472 pass, 0 fail, 1309 asserções**, 39 arquivos, nenhum skip.
  Novos testes: seis de prova da fonte e treze de admissão, incluindo Kids/Adultos,
  réplicas, lease reciclada, crash, política desligada e parada em andamento.
- Tipagem completa de Payments: exit 0, Node heap 768 MiB.
- Biome dos arquivos modificados e `git diff --check`: exit 0 antes do commit.

O relógio avançado dos testes de admissão isola a janela de ativação dos dados que
outros testes mantêm no mesmo banco de QA; nenhum relógio de produto foi alterado.
Negativo da fixture Date em postgres-js foi preservado e corrigido para serialização
ISO explícita, sem alterar código financeiro. Logs em
`.cache/subscription-recovery-20261023/recovery-admission-*`.

Não houve chamada financeira real, mensagem para cliente, migração em staging ou
produção. Próximos lotes: coordenação dos avisos/casos, D7, pagamento explícito e
período original, operação de exceções, templates/seeds, sandbox/UI e reviews globais.
