# Comissão por plano e anual de R$ 970

Decisão aprovada pelo usuário em 05/11/2026: mensal permanece R$ 97; anual Kids e Adultos passa de R$ 797 para R$ 970. Comissão padrão única de aquisição: R$ 30 no mensal e R$ 80 no anual, sem recorrência. Não criar Viviane/campanha nem enviar mensagens.

## Desenho

- Manter o catálogo como autoridade comercial. Atualizar seeds/fallbacks e migrar somente as duas ofertas anuais conhecidas de BRL 79700 para 97000. Preservar descontos específicos, transações, assinaturas e documentos históricos. Economia passa a R$ 194, equivalente a dois meses; equivalente mensal R$ 80,83.
- Campanhas: manter `commissionAmountCents` como valor mensal/legado e acrescentar `commissionAnnualAmountCents` opcional. Ausência significa acordo antigo de valor único. Admin oferece mensal/anual com padrões compartilhados 3000/8000; comissão continua desligada até habilitação. Edições omitidas preservam condições; desligar limpa valores; duplicar não habilita comissão.
- Snapshot de campanha inclui o anual quando configurado. Resgates anteriores preservam o acordo fixo antigo. Indicações diretas novas congelam os dois bônus em campo privado no resgate; registros antigos mantêm o bônus legado. A oferta informa o ciclo comercial de 1 ou 12 meses; valor pago, cupom e parcelamento não classificam o plano. Ciclo desconhecido em acordo por plano exige retry, sem pagar um valor presumido.
- API/telas do embaixador exibem os dois valores recebidos do serviço e deixam claro o pagamento único. Histórico de conversões guarda o valor efetivo e mantém dedupe, estorno, garantia e reconciliação existentes.
- Entrega no destino de produção previamente autorizado, por CI/plano/onda canônicos; não promover arquivos exclusivos de Palco em staging. Staging não foi solicitado nesta mudança.

## Alternativas avaliadas

Dois valores no acordo preservam configurabilidade e histórico. Um percentual sobre a cobrança mudaria a regra aprovada; inferir o plano pelo preço quebraria com cupons. Trocar globalmente o valor único do bônus não diferencia planos nem preserva aceites históricos.

## Verificação

Regressões de mensal/anual em campanhas e indicações diretas, legado, desativação, alteração após aceite, ciclos inválidos, duplicatas/estorno; formulário, defaults e telas; upgrade PostgreSQL sobre dados antigos e atualização restrita do catálogo. Suítes/typechecks dos pacotes afetados, lint, geração sem drift e build do funil. Em produção, conferir preços/checkout público, migrações e SHA/saúde de cada serviço publicado.
