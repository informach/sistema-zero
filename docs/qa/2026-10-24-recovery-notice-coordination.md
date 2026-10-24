# Coordenação de avisos de regularização — 24/10/2026

Lotes posteriores a `16bd9b966`. O coordenador e o worker D7 estão ligados na
composição da branch financeira e testados localmente; não implantados. Templates
foram acrescentados ao seed versionado; o seed não foi executado em ambientes reais.

## Comportamentos

- Envelope exato persistido antes da rede; recibo gravado antes do estado do caso.
  Prazo começa no aceite original identificado, não na tentativa local.
- Resposta perdida reutiliza envelope/chave e conserva o aceite original. Há cinco
  tentativas persistidas de solicitar o aviso; falha continua em revisão e não
  inicia prazo fictício. O reagendamento não altera o deadline anunciado.
- Mensagem inicial ainda apenas na fila/SENDING no D7, ou comprovadamente falha,
  não autoriza cancelamento silencioso. Consulta indisponível reagenda a análise.
- Pagamento confirmado retira as intenções de aviso mesmo sem ID local. Caso
  financeiro fechado pode retomar as retiradas pendentes por até 24h do fechamento,
  incluindo avisos antigos, com limite de tentativas e dois minutos de intervalo.
  Não reabre caso financeiro nem reenvia aviso para descobrir seu ID.
- Oito templates de e-mail usam o layout canônico, por público e finalidade.
  Kids fala ao responsável; Adultos, ao assinante. Produto vem da assinatura.
  Prazo é formatado em horário de Brasília. A comunicação não concede acesso,
  não promete uma data de acesso que não foi consultada e não autoriza débito.
- WhatsApp não é disparado com base apenas na existência de um número; esta etapa
  implementa o canal principal de e-mail. Preferência/consentimento e fallback
  operacional continuam sujeitos à integração e ao review global.

## Evidências

PostgreSQL local descartável `sistemazero_recovery_test_r6`, porta 15463.

- Payments: **479 pass, 0 fail, 1349 asserções, 39 arquivos**, sem skips.
- Messaging: **171 pass, 0 fail, 813 asserções, 25 arquivos**, com banco real.
- Tipagem completa dos dois pacotes: exit 0, execuções seriais/heap 768 MiB.
- Biome/diffcheck dos arquivos modificados: exit 0 antes do commit.

Prova causal da retomada de retirada: caso encerrado com aviso de sete dias antes
não era reivindicado pelo scheduler (RED 18/1). A consulta agora usa a data de
fechamento e inclui avisos pendentes, sem remover o backoff da confirmação (GREEN
19/0/98 no foco). Fixture antiga de confirmação passou a registrar a retirada do
lembrete, para não deixar outro trabalho pendente fora do objeto daquela asserção.

Logs em `.cache/subscription-recovery-20261023/recovery-notice-*`. A simulação do
transporte nos testes de coordenação não substitui sandbox Efí ou entrega real de
e-mail. Nenhum cliente real recebeu mensagem ou operação financeira.

Próximos: integrar worker/coordenador/D7 com autoridade persistida e prova nova,
pagamento explícito/período original, Admin/exceções, corte do dunning antigo,
configuração/seeds, sandbox/UI e os dois reviews globais/lotes finais autorizados.

## Complemento — autoridade de execução D7

O caso pode gravar um checkpoint com CAS/outbox e conservar a mesma lease, sem
ampliar seu prazo. A autorização consulta versão, identidade, estado efetivamente
persistido e orçamento restante antes dos efeitos. Um estado alterado só em memória
não autoriza cancelamento; a versão anterior perde autoridade após o checkpoint.

`executeForRecovery` no caso de uso compartilhado de cancelamento exige a decisão
CANCEL_PENDING persistida, prazo vencido, aviso inicial saudável e nova prova da
cobrança/assinatura. Registra pedido automático com o ID do caso antes da rede.
Revalida antes do PUT; pagamento novo ou pedido humano concorrente rejeita a
autoridade da operação sem enviar cancelamento. Executores antigos/vencidos não
concluem a nova operação. A confirmação permanece por GET no provedor.

Pagamento durante cancelamento incerto vai para revisão, sem anunciar recuperação.
Razão UNPAID_AFTER_NOTICE exige pedido auditado do próprio caso; apenas estar em
CANCEL_PENDING não transforma um cancelamento externo em decisão automática.
Consultas saudáveis do aviso não esgotam um contador de falhas de entrega; se o
Messaging fica indisponível, a verificação usa reagendamento e janela finita.

Verificação: Payments **485 pass, 0 fail, 1374 asserções**, PostgreSQL real, 39
arquivos; tipagem completa exit 0 e Biome/diffcheck antes do commit. Inclui quatro
cenários D7 com repositórios reais: confirmação, decisão não gravada/lease expirada,
pagamento na janela anterior ao PUT e pedido humano concorrente. Transporte Efí
é simulado nesses testes; não há qualificação de sandbox ou implantação.

A integração do coordenador/worker foi verificada no complemento seguinte. Nenhuma
política ou assinatura real foi ativada por esses testes.

## Complemento mais recente — coordenador e worker integrados

O passo acima foi concluído na composição: worker serial reivindica uma lease
somente quando o caso vai iniciar, consulta a política entre casos e drena a execução
ativa ao parar, sem iniciar outro caso durante shutdown. Ausência da configuração
de Messaging impede instanciar esse worker; a política continua desativada por padrão.
A autorização D7 também consulta a política novamente antes do PUT, protegendo
contra uma pausa administrativa durante as consultas anteriores.

O coordenador consulta a fonte, ingere o ciclo pago pelo handler canônico e confere
o pagamento persistido antes de comunicar recuperação. Se faltar confirmação,
reagenda ou encaminha à revisão, com janela de indisponibilidade limitada. Novo
pedido humano interrompe os avisos. Lembrete mais recente retira intenções antigas
ainda pendentes após indisponibilidade, conservando a agenda original.

Após quitação, somente a solicitação automática do mesmo caso pode ser retirada;
CANCEL READY é rejeitado apenas depois da retirada auditada. CANCEL em execução
ou incerto com pagamento novo mantém revisão e não libera outra ação financeira.
Encerramentos confirmados sincronizam assinatura/caso e usam confirmação própria;
falhas de comunicação permanecem como trabalho separado do caso financeiro fechado.

Verificação da composição: **494 testes Payments, 0 falhas, 1412 asserções**, 39
arquivos com PostgreSQL real, nenhum skip; tipos completos exit 0. Nove cenários
novos cobrem Kids/Adultos D3/D6/D7, quitação e reentrega idempotente, chegada de
pagamento entre decisão e PUT, solicitação humana, pausa durante a execução, parada
do worker e distinção CANCEL READY/EXECUTING. Transporte Efí e Messaging é simulado
nos testes do coordenador; as transações, leases, auditoria e outbox são reais.

Falta concluir pagamento autorizado e período original de acesso, operação/Admin,
corte do dunning antigo, configuração/seeds, sandbox/UI e reviews globais. Esta
composição não autoriza afirmar que a entrega financeira completa está pronta.
