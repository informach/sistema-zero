# Pagamentos em produção: credencial HMAC sincronizada

Incidente de 17/11/2026, ambiente Railway `production` do projeto `sistema-zero`.
Oferta inicialmente reportada: `/pro/desafio-primeiro-jogo/oferta`.

## Causa e correção aplicada

O funil autenticava no gateway, mas o Payments recusava o consumer `gateway`
com HTTP 401, `Assinatura HMAC inválida`, antes de chamar a Efí. O segredo em
`payments.consumers.hmac_secret` divergia de `GATEWAY_HMAC_SECRET` do gateway.
Os fingerprints foram comparados sem publicar os segredos.

A correção sincronizou somente o segredo desse registro com a credencial atual
do gateway, em transação com bloqueio da linha e conferência dos fingerprints
observados antes da escrita. Consumer ativo, CIDRs e destinos dos webhooks foram
preservados. Não foi necessário implantar código nem reiniciar serviços.

O mesmo consumer atende Adulto e Kids e os métodos Pix e cartão. O motivo
histórico da divergência não foi estabelecido nesta intervenção. Ao rotacionar
essa credencial, sincronizar o gateway e o cadastro do consumer no Payments;
o mesmo segredo autentica os webhooks de retorno ao gateway.

## Evidências verificadas

- Sentry: [SISTEMA-ZERO-FUNNEL-2](https://informach-nucleo-de-aprendizag.sentry.io/issues/SISTEMA-ZERO-FUNNEL-2),
  nove falhas de Pix entre 02:04 e 02:06 UTC, resposta do upstream 401.
- Antes da correção, chamadas assinadas de leitura e criação de cartão sem dados
  de cartão retornavam 401. Depois, a leitura de UUID inexistente retornou 404
  `PAYMENT_NOT_FOUND` e o cartão incompleto retornou 400
  `Dados do cartão são obrigatórios`, comprovando a passagem pela autenticação.
- Checkout público Adulto: Pix de R$ 67 gerado, QR Code e copia e cola exibidos;
  pagamento técnico `619621a4-5874-4b04-85ce-3f15180e4525`.
- API pública com sessão Kids: Pix gerado com QR Code e copia e cola;
  pagamento técnico `0069b614-f780-455c-be1f-d1f61915c276`.
- Outra compra Adulto foi criada às 08:00 UTC e confirmada pela Efí às 08:01 UTC.
  O webhook chegou ao gateway com HTTP 200; o funil registrou `fulfill.ensured`,
  `grant.done` e `welcome.sent` para e-mail e WhatsApp.
- Cartão: OAuth de produção aprovado, identificação Visa e consulta de parcelas
  funcionando no checkout, tokenização no navegador concluída com cartão de teste,
  sem enviar esse token para cobrança.
- Teste controlado do endpoint de cartão com token deliberadamente inválido
  atravessou funil, gateway e Payments e chegou à Efí. A Efí respondeu
  `validation_error` para `/payment/credit_card/payment_token`, exigindo 40
  caracteres hexadecimais, conforme esperado. Não houve cobrança de cartão real.
- A primeira tentativa controlada de cartão encontrou timeout de 20 segundos no
  OAuth da Efí. A tentativa seguinte chegou ao endpoint de cobrança em cerca de
  um segundo; a autenticação independente também funcionou. Não foi aplicada
  alteração de timeout com base nesse evento isolado.
- Consulta aos logs do Payments desde 07:56 UTC não encontrou novos
  `auth.hmac_invalid`.

Os dois Pix técnicos não foram pagos; expiram pelo prazo normal do provedor.
Os testes de cartão não comprovam aprovação de transação por banco emissor.
