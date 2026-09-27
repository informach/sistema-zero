# Desafio de 30 dias com Mural visitante permanente

## Resultado esperado

Uma **nova compra** da oferta `desafio-primeiro-jogo-30-dias` concede o curso e o Mural completo pelo prazo comprado de 30 dias. Na mesma aprovação, concede também o direito permanente de visitante do Mural. Quando o prazo termina, o aluno continua podendo ver e jogar no Mural, mas não publicar, copiar ou interagir como membro pleno. Uma assinatura ativa da Comunidade continua oferecendo acesso completo independentemente do Desafio.

A oferta histórica `desafio-primeiro-jogo` permanece vitalícia e não recebe um direito adicional de visitante. Nenhuma matrícula antiga é alterada em massa.

## Opções consideradas

1. Agendar a troca de completo para visitante no vencimento: introduz estado e processamento assíncrono, com risco de atraso ou falha. Desnecessário porque a leitura de acesso já considera a validade de cada matrícula.
2. Criar um segundo item de oferta com validade própria no catálogo: exige ampliar o contrato de política por item, o catálogo e a reconciliação da oferta já cadastrada. É uma boa capacidade genérica futura, mas é uma mudança maior do que esta regra comercial específica.
3. Conceder o direito independente de visitante no mesmo webhook da compra: reutiliza o contrato de acesso já existente, sem job nem migração. **Escolhida.**

## Desenho

- O motor de concessão resolve e aplica a política comprada como hoje. Após os itens do catálogo, apenas para a oferta resolvida `desafio-primeiro-jogo-30-dias` com política explícita `fixed/30/days` e item de Mural completo, concede uma matrícula de visitante com `expiresAt = null`.
- A matrícula de visitante usa o mesmo produto sintético, tipo `community` e chave `mural-dos-criadores-visitante` do presente de embaixador. Seus metadados comuns ficam em um único módulo. O snapshot registra a oferta de origem e política vitalícia; a procedência é `payment` com o ID da compra.
- A chave de idempotência é derivada de pagamento + produto visitante, igual ao padrão de compra. Uma reentrega não duplica matrículas. Uma falha após algum dos grants deixa o webhook falhar e ser reentregue; os grants já salvos são no-op e o que faltou é concluído.
- O resultado do webhook continua considerando `itemsResolved` como a quantidade de itens resolvidos do catálogo; a concessão extra conta em `granted`.
- A leitura atual já combina os direitos: durante os 30 dias há Mural completo; depois, apenas visitante. Nenhum processo de expiração precisa criar uma nova matrícula.

## Limites e verificação

- Não alterar ofertas, preços, regras das assinaturas, grants manuais, direitos históricos ou matrículas existentes.
- Testar compra e reentrega, fronteira exata de 30 dias, acesso completo durante o prazo, só visitante depois, ausência de visitante para oferta antiga e demais ofertas, e recuperação de falha parcial.
- Atualizar o manual de operação para deixar explícito que mudar só a duração de outra oferta não reproduz automaticamente este bônus permanente.
