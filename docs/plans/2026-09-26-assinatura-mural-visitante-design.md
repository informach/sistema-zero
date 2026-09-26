# Assinatura com Mural visitante permanente

## Resultado

Quando um pagamento confirmado concede uma assinatura que inclui o Mural completo, a conta recebe também um direito independente e permanente de visitante. Durante a assinatura, prevalece o acesso completo. Após cancelamento ou expiração, continua possível ver e jogar no Mural, sem permissões de publicação, cópia ou interação reservadas ao acesso pleno. A regra não transforma assinaturas sem Mural em acesso à comunidade Kids.

## Alternativas e decisão

- Conceder o visitante só no cancelamento: depende de entrega e processamento daquele evento; uma falha deixa a pessoa sem acesso.
- Deduzir o visitante em cada leitura a partir de uma assinatura antiga: mistura histórico com acesso atual e exigiria consultas/regras especiais permanentes.
- **Conceder junto ao primeiro pagamento processado:** cria uma matrícula independente que a leitura existente já reconhece. Renovação e reentrega não criam outras matrículas da mesma assinatura. Escolhida.

## Contrato técnico

- O grant de assinatura continua criando/estendendo seus itens normais. Se a oferta resolvida contiver um item `community` com `courseRef: mural-dos-criadores`, cria também o entitlement sintético `mural-dos-criadores-visitante` com `expiresAt: null`.
- O visitante conserva no snapshot a oferta de origem e política `lifetime`. Sua procedência é o pagamento confirmado. A chave idempotente usa o ID da assinatura, não o ID de cada cobrança; a matrícula **não** tem `subscriptionId` vinculado, para que cancelamento/expiração revogue apenas os itens da assinatura.
- O grant do Desafio de 30 dias permanece como está. Ambas as origens usam o mesmo produto sintético de visitante, mas com chaves de idempotência separadas. O resultado `itemsResolved` continua sendo a contagem de itens do catálogo; `granted` inclui o visitante quando criado.
- Uma falha ao persistir o visitante faz o webhook falhar; na reentrega, os itens já concedidos são idempotentes e o direito ausente é concluído.
- A mudança no grant vale para pagamentos processados após a publicação. Uma concessão retroativa para assinaturas pagas antes da mudança exige decisão e operação separadas; não ocorre implicitamente na leitura ou no cancelamento.

## Verificação

Testar primeira compra, renovação, reentrega, cancelamento, expiração, ausência de Mural na oferta, preservação do Desafio de 30 dias e falha parcial. Conferir o webhook HTTP e a regra existente do Hub que permite ler/jogar sem publicar.
