# Conferência de pagamento após resposta incerta — 24/10/2026

## Comportamento

Uma tentativa explícita de pagar o ciclo original pode terminar sem resposta,
embora a operadora tenha recebido o valor. O Admin pode consultar a fonte e
encerrar essa operação como confirmada, sem repetir débito, atualizar cartão ou
cancelar assinatura. A ação existe na fila de regularização dos dois públicos;
staff pode consultar, mas não confirmar.

A conferência exige cobrança, valor, assinatura, titular e período originalmente
autorizados. Operação em execução só admite conferência depois da expiração da
autorização mais o orçamento externo de 60 segundos. Operações UNKNOWN continuam
bloqueando outra execução. O mesmo executor antigo não pode sobrescrever a
conferência. Troca de cartão incerta não é convertida em sucesso por esta ação.

O caminho canônico de liquidação recebe a observação recente e emite o evento
financeiro uma vez. Dinheiro recebido com período divergente é registrado como
pago, com acesso em revisão; não se concede um mês a partir de hoje. O Admin pode
conferir o período pela ação anterior e então concluir a operação de pagamento.

## Persistência e autorização

- Migration gerada `0020_pink_loki.sql`: coluna JSONB nullable e constraint de
  coerência em `payments.subscription_operations`; sem backfill ou exclusão.
- Auditoria permanente: autor autenticado, request ID, pagamento/versão, período,
  observação na fonte e confirmação. Não depende da retenção do outbox.
- Transação bloqueia assinatura, operação e pagamento nessa ordem. Revalida a
  prova depois das esperas pelos locks: validade máxima de 60 segundos.
- CAS confere executor/tentativa/estado. Repetição do mesmo autor/request ID é
  idempotente; concorrentes não substituem a primeira auditoria.
- HTTP/BFF aceitam só tentativa esperada e request ID; recusam identidade/período
  forjados, impersonação, papéis sem escrita, conteúdo inválido e corpo excessivo.
- UI usa uma ação por vez e consulta novamente a lista depois de resposta incerta.

## Evidência local

PostgreSQL 17 dedicado, base nova `sistemazero_recovery_test_r9`, migrations desde
zero até 0020. Nenhuma conta, cobrança ou mensagem real foi usada.

- Payments completo: **528 testes, 1622 asserções, zero falhas/skips**, 43 arquivos.
- Tipos completos do Payments, heap 768 MiB: exit 0.
- Admin: wrappers de BFF/UI e validação de entrada, **4 testes, 13 asserções
  externas**, zero falhas; as fixtures internas não são somadas novamente.
- Tipagem focada da UI Admin, heap 1024 MiB: exit 0.
- Casos causais incluem resposta perdida, dinheiro ainda não recebido, valor e
  período divergentes, duas confirmações concorrentes, executor antigo,
  confirmação após correção do período e prova vencida antes/durante a gravação.

Logs locais em `.cache/release-lesson-layout-20261023` do worktree coordenador,
prefixo `financial-confirm-`; não contêm dados reais de cartão.

## Limites e implantação

Este lote ainda não foi ativado em staging/produção. Aplicar 0020 antes de servir
o código que consulta a coluna; manter as migrations financeiras anteriores em
ordem. Revisão integrada, CI da composição, ensaios sandbox/UI e configuração dos
ambientes continuam pendentes. Não constitui qualificação de todo o fluxo de
cancelamento ou resolução de resultados incertos de troca de cartão. Nenhuma
ação automática foi executada sobre o caso histórico da cliente.
