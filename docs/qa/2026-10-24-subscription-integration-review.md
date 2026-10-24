# Revisão da integração financeira — 24/10/2026

A composição inclui os commits financeiros e o trabalho concluído do
Estúdio Python até `3d0eb050d`. A integração foi feita em worktree isolado e depois
avançou o staging local por fast-forward. As alterações não commitadas da outra
sessão, inclusive jogos, assets e evidências, foram preservadas.

## Achados corrigidos

1. A identidade temporária de notificações não bastava para impedir contagem
   repetida de um ciclo pago. O componente permanente de ciclos agora participa
   da mesma transação do agregado/outbox. A prova PostgreSQL reproduziu 3→4 antes
   e manteve 3→3 depois, incluindo concorrência e rollback. Detalhes em
   `2026-10-24-subscription-cycle-idempotence.md`.
2. A contagem histórica divergente exige fonte, recibos e identidades concordantes,
   versão/frescor e auditoria permanente. O comando técnico é preview por padrão;
   nenhum ajuste real foi aplicado. Detalhes em
   `2026-10-24-subscription-legacy-cycle-review.md`.
3. A integração Python incluiu `.oga` no contrato de assets, mas não regenerou o
   contrato da imagem e seu perfil. O primeiro CI bloqueou essa divergência. Os
   dois artefatos foram regenerados pelo gerador canônico; conferência e 20 testes
   de runtime / 118 asserções passaram. Não equivale a publicar uma imagem nova
   ou homologar todos os fluxos Pro.
4. O Admin ainda esperava nomes de categorias sem os novos ícones e oferecia
   codecs marcados como ocultos pelo catálogo Python. O seletor passa a excluir
   os ocultos e mantém instalação/aprovação do ambiente. RED causal preservado;
   cinco testes / 42 asserções passaram, incluindo JavaScript e indisponibilidade.
5. O passo geral do CI não fornecia PostgreSQL aos testes de Payments e Messaging.
   Foram adicionadas etapas explícitas para as duas pastas `tests/db`, com bancos
   descartáveis distintos. Provas locais em bancos novos: Payments **177/720**;
   Messaging **7/34**, sem falhas/skips. O primeiro nome do banco Messaging foi
   recusado pelo guarda de QA; corrigiu-se o nome para `_test`, sem relaxar o guarda.

## Evidência consolidada e limites

Após conciliar o código commitado do Estúdio, Payments completo passou com
**598 testes / 1.882 asserções / zero falhas**, usando PostgreSQL QA. Tipagem
financeira do lote anterior passou. Os testes focados adicionais acima não devem
ser somados como se fossem novos casos de produto ou homologação ponta a ponta.

O commit posterior `3d0eb050d`, da outra sessão, não altera o domínio financeiro
nem entradas do perfil gerado do container. Sua composição passou em 101 testes
focados / 1.609 asserções de blocos, mídia, áudio, entrada, ritmo e renderização
Pygame Zero; o `check:validation-profile` continuou aprovado. Essa seleção não é
prova de todas as partidas, navegador real ou desempenho do novo conjunto de jogos.

A tokenização real em Chromium/Node, pelo helper da aplicação e SDK Efí em sandbox,
passou para Visa e Mastercard. A primeira tentativa sob Bun foi interrompida e
os processos próprios foram reconciliados; não é resultado funcional aprovado.
A tentativa de operações criou uma assinatura QA cuja cobrança permaneceu pendente.
O cancelamento dessa assinatura foi confirmado. Não houve prova completa de retry
ou troca preventiva nem alteração de assinatura de produção. Esse estado não é
tratado como pagamento confirmado nem resolvido com alteração fictícia do banco.

Logs estão no diretório operacional `.cache/release-lesson-layout-20261023` do
worktree principal: `financial-integrated-payments-r1.log`,
`integrated-runtime-profile-{red,green}-r1.log`,
`integrated-admin-palette-{red,green}-r1.log`,
`financial-ci-payments-db-r1.log`, `financial-ci-messaging-db-r2.log`,
`financial-sandbox-tokenization-r2.log` e `financial-sandbox-operations-r2.json`.
Não contêm credenciais, tokens de cartão ou dados de clientes reais.

## Antes da ativação

Ainda são exigidos CI da composição final, deploy e revisão de migrations/versões,
seed restrito dos avisos e conferência da fila antiga, remetente, telas autenticadas
Kids/Adultos/Admin e prova dos efeitos no provedor. A política permanece desativada;
não enviar mensagens nem usar cliente real como fixture. Aplicar a correção técnica
do contador somente depois da imagem qualificada e da retirada das réplicas antigas.

A publicação dos textos de gravação é uma entrega anterior já implantada. A nova
exigência de avaliar missões Python executando o programa tem plano próprio em
`docs/superpowers/plans/2026-10-24-python-mission-execution.md` e ainda não foi
implementada por este lote financeiro.
