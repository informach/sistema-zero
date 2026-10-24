# Retirada da intenção original de aviso — 24/10/2026

Lote posterior a `dc9405695`. Protege a coordenação futura contra resposta perdida
ao enfileirar aviso. Não envia e-mails nem ativa cancelamento/regularização.

## Correção e limites

O identificador de mensagem pode não chegar a Payments, embora Messaging tenha
aceitado o POST. Retirar apenas por ID não resolve esse caso. A nova operação S2S
`POST /messaging/intents/suppress` recebe o envelope original e a mesma chave de
idempotência, sempre com token interno e consumidor autenticado.

Se a intenção ainda não existir, Messaging persiste diretamente uma mensagem
SUPPRESSED, com evento de supressão e nenhum evento queued. Não depende de template
ativo ou remetente: seu conteúdo indica que não houve renderização para envio.
O índice único consumidor/chave serializa a disputa com um enqueue já em andamento.
Um POST tardio devolve essa mesma intenção retirada. Se o enqueue vencer, a retirada
usa o controle existente de versão **e status ainda na fila**. Não declara envio
iniciado/aceito como desfeito. Retenção segue a política existente de mensagens
terminais; não se promete um registro eterno de idempotência.

Envio e retirada compartilham a comparação do pedido original. Destinatário,
conteúdo, canal, anexos e opções diferentes causam conflito. Os consumidores
continuam isolados. Payments recebe só uma capacidade adicional de Messaging no
Gateway; JWT não autoriza essa rota. O adapter conserva corpo exato/chave na
assinatura HMAC e retorna somente recibo mínimo.

## Verificação

- Messaging completo: **170 pass, 0 fail, 758 asserções**, com PostgreSQL real em
  banco local descartável. Inclui disputa de INSERT, retirada antes do enqueue,
  ausência de template, POST tardio, posse e corrida com claim do worker.
- Payments completo: **473 pass, 0 fail, 1314 asserções**, mesmo PostgreSQL local.
- Gateway: **290 pass, 2 skips Redis opcionais, 0 fail, 1215 asserções**.
- Tipagem completa dos três pacotes: exit 0, processos seriais com heap 768 MiB.
- Biome dos arquivos alterados e `git diff --check`: exit 0 antes do commit.

Um diagnóstico de tipagem no teste HTTP (`Response.json()` desconhecido) foi
corrigido consultando o ID canônico no repositório, sem cast ou supressão. Logs
locais: `.cache/subscription-recovery-20261023/notice-intent-*`.

Nenhum envio ou operação financeira em clientes reais, nenhum deploy. Falta ligar
essa operação à coordenação dos avisos, validar o fluxo completo e executar os dois
full reviews e lotes finais já aprovados.
