# Coordenação de avisos de regularização — 24/10/2026

Lote posterior a `16bd9b966`. O serviço de coordenação de avisos está implementado
e testado, mas ainda não ligado a um worker de execução D7 em produção. Templates
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
