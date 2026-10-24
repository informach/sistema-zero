# Auditoria de cancelamento de assinaturas — 24/10/2026

Lote da branch `feat/subscription-recovery`, posterior a `4aeb59822`.
Não é o full review financeiro nem prova de implantação ou de chamadas reais à Efí.

## Comportamento conferido

- Pedido distingue cliente, administrador, consumidor S2S e processo de não
  pagamento; encerramento externo e fim das repetições não inventam pedido humano.
- Origem, autor, caso, solicitação, confirmação e substituições permanecem em tabela
  própria. Assinatura, auditoria e outbox são gravados atomicamente com CAS.
- Falha da auditoria reverte toda a gravação e conserva os eventos para uma nova
  tentativa. Histórico não depende da retenção do outbox.
- Recuperação retira somente sua própria solicitação automática ainda não
  confirmada. Um pedido humano prevalece e conserva o vínculo ao pedido anterior.
- Caso NONPAYMENT precisa pertencer à mesma assinatura e consumidor. Sua execução
  não passa pelo worker genérico: depende do futuro coordenador com revalidação D7.
- APIs de cancelamento exigem autor confiável e recusam perfil de criança ou
  impersonação. Ownership por e-mail continua no self-service; consumidor S2S
  continua escopado ao dono. Dados completos da auditoria não entram na view pública.

## Evidência local

PostgreSQL 17 descartável próprio, porta 15463, banco de QA
`sistemazero_recovery_test_r5`; migration 0014 gerada por Drizzle e aplicada nessa
base. Nenhum banco de cliente alterado.

Comandos executados a partir da raiz do worktree:

```powershell
# TEST_DATABASE_URL aponta somente para o banco de QA acima.
bun test packages/payments/tests
# Dentro de packages/payments:
node --max-old-space-size=768 node_modules/typescript/bin/tsc --noEmit
```

Suíte final: **453 pass, 0 fail, 1267 asserções, 37 arquivos**, sem skips.
Tipagem: exit 0, repetida após o último teste de permissões. Biome: 18 arquivos
TS/JSON verificados sem erros; o fake legado com NUL preservado não foi formatado.
`git diff --check`: exit 0. Logs locais em `.cache/subscription-recovery-20261023/`.

Negativos preservados: fixture DELETE antiga sem autor retornava 401; teste do
worker misturava relógio congelado do serviço e relógio real do pedido, causando
confirmação anterior à solicitação (corrigida a fixture, sem relaxar a invariante);
caso de outra assinatura era aceito antes da validação (RED 6/1, depois GREEN).

O CI `40080180893` terminou SUCCESS para o parent `c974f61cb`. Não cobre este
delta posterior. Ensaios reais de provedor, contato, cartões e fluxo D7 completo,
leitura operacional/Admin e os reviews globais continuam pendentes.
