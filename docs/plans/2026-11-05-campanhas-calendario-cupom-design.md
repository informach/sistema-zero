# Campanhas reutilizáveis: calendário e cupom

## Requisitos aprovados durante a entrega

- Recurso genérico para próximas campanhas; nenhum comportamento depende do nome Laopa.
- Data de referência da palestra editável no Admin; recalcular janelas automaticamente.
- Presente: três dias de resgate a partir da data da campanha (dias configuráveis).
- Cupom: sete dias a partir da campanha, configuráveis; Laopa 50% no Desafio do Primeiro Jogo Kids.
- Laopa em produção: 06/11/2026, cupom até o fim de 12/11 (13/11 00:00 Brasília).
- Curso comprado: 30 dias a partir do pagamento. Comissão 30/80 por assinatura em até 45 dias
  do resgate. Esses dois prazos são individuais e não mudam quando a palestra muda.
- Dois cartões separados, no Admin e em Minhas campanhas do parceiro: presente e desconto.
- Só Admin cria/altera; parceiro consulta, copia e baixa PNG. Preservar direitos já aceitos.
- Full review e correção após concluir o escopo ampliado; deploy staging e produção alinhados.
- Cupons avulsos continuam no Catálogo, sem campanha ou embaixador obrigatório, com escopo
  escolhido pelo admin (ofertas específicas ou todas as ofertas habilitadas do mesmo público).
- No cadastro da campanha, embaixador e cupom são vínculos opcionais e independentes.
- Toda a estrutura atende Kids e Adultos. A campanha Laopa é Kids; ofertas e presente devem
  pertencer ao público escolhido, sem oferecer acesso de outra comunidade.
- O presente atual é Cadê Todo Mundo? e Mural por sete dias; não inclui o Desafio do Primeiro
  Jogo. O curso comprado com o cupom é um benefício separado, com acesso por 30 dias do pagamento.
- Cupom expirado mantém a página comercial com preço normal e aviso destacado próximo ao preço;
  a pessoa pode continuar comparando e comprando. O checkout revalida e nunca aumenta uma cobrança
  silenciosamente. Falha de consulta não pode ser apresentada como expiração.
- Decisão posterior: cupons também devem atender ofertas de assinatura mensal/anual, com desconto
  APENAS na primeira cobrança. Renovações usam o preço cheio. O fluxo atual bloqueia assinaturas;
  esta extensão exige integração financeira própria antes de remover o bloqueio.

## Extensão financeira: primeira cobrança da assinatura

Documentação oficial consultada em 05/11/2026:
- https://dev.efipay.com.br/docs/api-cobrancas/assinatura/
- https://comunidade.sejaefi.com.br/discussao/gestao-cobrancas-transacoes-assinatura-integracao-pagamentos

O desconto nativo da assinatura Efí se repete nos ciclos. Não enviar um cupom de aquisição
como desconto recorrente nem simplesmente usar o preço descontado como valor permanente da
assinatura. A API permite atualizar itens de assinatura ativa; a alternativa de primeira cobrança
avulsa exige coordenar início da recorrência, token e recuperação de falhas.

Prova real em sandbox: assinatura 109371, primeira cobrança 45063383 por 500 centavos;
PUT dos itens para 1000 centavos manteve a primeira cobrança em 500 e o valor recorrente em
1000. Assinatura de teste cancelada ao final. Evidência privada em `.cache/commissions-970`.
O provedor rejeita `repeats: 1` (mínimo 2) e `trial_days: 366` (máximo 365).

Desenho escolhido: criação em duas etapas. Persistir a intenção e, depois, o identificador da
assinatura/cobrança ainda sem forma de pagamento ANTES de ativar o cartão. Nunca repetir o POST
que ativa/cobra em caso de resposta ambígua. Guardar o valor promocional e a identidade da
primeira cobrança; as outras sempre exigem o valor integral. Após ativar, atualizar os itens
da assinatura para o preço integral e reconsultar para confirmar. Registro durável e worker
no boot/a cada minuto retomam essa confirmação após falhas. Se não for possível confirmar a
renovação em até 24 horas, cancelar a recorrência e manter o registro do primeiro pagamento.
Uma assinatura preparada sem ativação não pode cobrar. Nenhum token de cartão será persistido.
Cupons são registrados somente no pagamento inicial; renovações removem a atribuição de cupom.

## Direção técnica

O Referrals deve ser a fonte do calendário da campanha. Datas derivadas em Brasília no servidor,
com helper puro compartilhado e validação de datas reais/limites. Campanhas legadas continuam
com início/fim explícitos. Nova edição por calendário conserva os snapshots anteriores.

Evitar duas cópias independentes das datas do cupom. O Catálogo continua sendo a autoridade
de desconto, escopo, cotação e uso. O cupom fica associado à campanha e,
na cotação, conferir a política de validade atual por uma leitura interna autenticada do
Referrals. Falha dessa leitura deve recusar somente o cupom vinculado, sem inventar desconto.
A validade do cupom é independente do fim do resgate grátis: entre os dias 4 e 7, o cupom pode
continuar válido mesmo que o presente não aceite novos resgates. Pausa explícita deve ser respeitada.

O vínculo/percentual/escopo precisam ser conferidos antes de liberar a divulgação. Desconto de
cupom é imutável no agregado atual; alterar condições precisa respeitar esse contrato. Criar/
recuperar o cupom deve ser idempotente, sem recriação cega depois de resposta incerta. A UI do
Catálogo precisa indicar que a validade é gerenciada pela campanha, para não oferecer uma edição
que depois seria ignorada. A associação é conferida pelo Catálogo antes de vincular e antes de cada cotação.

## Preflight em produção, 05/11/2026 10:28 UTC

- `desafio-primeiro-jogo-30-dias`: ativo, BRL 6700, one_time, fixed, 30 days, allowsCoupon=true.
- ID dessa oferta: `337b3fee-ae48-4afc-81af-f2371ae32eec`; desconto 50% → BRL 3350.
- Oferta legada `desafio-primeiro-jogo`: lifetime BRL 3700, não usar neste cupom.
- Nenhum cupom com prefixo LAOPA existe. Dados e saída completos na evidência privada em `.cache`.
