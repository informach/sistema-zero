# Preparação do corte financeiro — 24/10/2026

## Código e configuração preparados

O Funil deixa de produzir avisos de falha de renovação. O webhook continua
autenticado e idempotente: reconhece a entrega e mantém o fluxo de pagamento,
fulfillment e renovação paga. O módulo remetente antigo e seus testes exclusivos
foram removidos; a integração verifica ausência de comunicação e concessão de
acesso na recusa. Payments passa a ser o único coordenador dos novos avisos.

O seed restrito reutiliza os modelos e o layout canônicos. O seed geral tornou-se
importável sem executar configuração, abrir conexão ou escrever. Seus comandos
existentes continuam disponíveis; o script restrito não modifica remetentes nem
modelos fora dos oito `recovery-*`.

```sh
bun scripts/seed-subscription-recovery.ts --environment staging
bun scripts/seed-subscription-recovery.ts --environment staging --apply --retire-legacy
```

Executar dentro de `packages/messaging`, no ambiente Railway correspondente e na
imagem nova verificada. Para produção, trocar somente o argumento de ambiente.
O primeiro comando é leitura. O segundo cria/atualiza apenas os oito modelos e
desativa os dois modelos antigos, preservando o histórico. Não reativa modelo que
o Admin desativou. Reexecução com conteúdo idêntico não altera versões.

O JSON informa modelos existentes/ativos/atuais, remetente default verificado e
quantidade agregada de mensagens antigas QUEUED/SCHEDULED/SENDING. `ready: false`
impede considerar concluída a preparação. O seed não retira mensagens já
renderizadas: antes de ativar, a fila antiga deve estar vazia ou ter sua retirada
tratada e confirmada pelo serviço. Não considerar simples desativação do template
como supressão de uma mensagem já criada.

## Railway — preparação confirmada em 18:21 UTC

Staging e produção receberam, com `skipDeploys`, as referências:

- Gateway: nova credencial própria do consumer Payments, sem rotação das existentes.
- Payments: `PAYMENTS_HMAC_SECRET` referencia o Gateway; `GATEWAY_URL` referencia
  a URL privada já usada pelo Funil; `EFI_ACCOUNT_IDENTIFIER` referencia o
  identificador público já configurado no Funil.
- URLs de regularização: Kids `/pais/conta`; Adultos `/compras`, nos domínios
  correspondentes a cada ambiente.

Valores resolvidos foram comparados, sem registrar segredos. Staging está com
`EFI_SANDBOX=true`; produção com `false`. A operação não iniciou deploy, não mudou
a política e não ativou o coordenador financeiro. Recibo local sanitizado:
`.cache/release-lesson-layout-20261023/financial-infra-prepared-r1.json` no worktree
principal. Não contém chave, identificador da conta Efí ou dados de clientes.

## CI Windows

O CI da base 6639b899a atingiu 20 minutos durante o download FFmpeg, parado em 2%,
antes dos testes nativos. O download passa a usar o CLI com Node, em etapa própria
de até cinco minutos e timeout de inatividade de 45 segundos. Os testes nativos e
de mídia continuam exigidos. YAML e `install --dry-run chromium` foram validados;
isso ainda não prova download nem testes aprovados no runner Windows remoto.

## Evidência local

- Messaging completo com PostgreSQL QA dedicado: **176 testes, 843 asserções,
  zero falhas/skips**. Tipagem completa: exit 0.
- Seed em banco real: preview sem escrita, oito modelos, idempotência sem mover
  versões, preservação de modelo alheio/desativado e aposentadoria explícita dos
  antigos. Catálogo inválido recusa antes de escrever.
- CLI: dois negativos de escopo em processo próprio, oito asserções; falham antes
  de acessar banco errado e sem imprimir credenciais. Incluídos no total acima.
- Funil completo: **596 testes, zero falhas, dois testes opcionais PostgreSQL não
  executados** (analytics/commercial-report, fora desta mudança). Tipagem Astro:
  334 arquivos, zero erros e três hints. Biome: 362 arquivos, zero erros e sete
  avisos existentes em testes de outras áreas; nenhum arquivo foi alterado por
  essa checagem geral.
- A conferência local do seed retorna `ready: false` quando faltam templates ou
  remetente verificado; ausência de dados não vira aprovação.

Logs: `financial-cutover-messaging-final-r1.log`,
`financial-cutover-messaging-types-final-r1.log`, `financial-cutover-funnel-r1.log`,
`financial-cutover-funnel-types-r1.log`, `financial-cutover-funnel-biome-r1.log`,
`financial-cutover-seed-preview-r1.json` e `financial-ci-node-install-dryrun-r1.log`.

## Sequência ainda necessária

1. Full review da composição financeira e CI completo do SHA final.
2. Integrar em staging preservando os trabalhos de outras sessões. Implantar
   consumidores Members/Funil antes de ativar os produtores dos novos períodos.
3. Conferir migrations/predeploy, imagens e SHA de todos os serviços envolvidos.
   Política nova começa desativada; não aceitar mensagem de saúde como ativação.
4. Confirmar retirada das réplicas antigas do Funil. Executar o seed restrito e
   conferir `ready`, destinatários e contratos. Sem envio a cliente real em QA.
5. Ensaiar Kids e Adultos: login/posse, tokenização sandbox, troca de cartão,
   pagamento explícito do ciclo original, avisos, prazo/cancelamento, acesso e
   concorrência. Relógio controlado prova o D7; nunca adiantar relógio de produção.
6. Após revisão/correções e aceite em staging, promover o mesmo código e configurar
   produção. Ativar política somente com os pré-requisitos verificados.
7. Casos históricos entram individualmente, com estado atual e aviso/prazo novos;
   nenhuma ação foi feita sobre a cliente mencionada pelo usuário.
