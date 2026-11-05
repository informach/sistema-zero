# Revisão completa — comissões, preço anual e alinhamento

Revisão sobre a PR 244, incluindo a incorporação do histórico de staging. Escopo: contratos,
formulário Admin, validação HTTP/configuração, snapshots e locks, conversão e estorno,
migrações, Catálogo/checkout, copy dos dois públicos e mudanças do palco já homologadas em staging.

## Achados corrigidos

- **P2 — preço de comparação menor que o novo anual:** um valor válido de R$ 900 ficaria abaixo
  do novo preço de R$ 970. O UPDATE custom agora limpa somente comparações inferiores ao novo
  preço, preservando comparações válidas e nulas. A prova PostgreSQL falhou antes da correção
  com R$ 900 e passa depois, verificando também a preservação de R$ 1.164.
- **P2 — edição do acordo fixo legado:** preencher o anual ao abrir o editor mudava o contrato
  em uma edição sem relação com comissão. Além disso, alterar somente o mensal poderia alterar
  o anual implicitamente, embora a tela continuasse mostrando o valor antigo. O editor conserva
  anual nulo em edições comuns; ao separar os planos, preserva o anual exibido. Dois testes de
  interação verificam o corpo enviado. Correção incluída na implementação antes da publicação.
- **P2 — limite monetário na configuração:** valores positivos acima do limite do banco eram
  aceitos pela configuração de bônus e poderiam falhar apenas ao registrar a conversão. Ambos os
  bônus agora têm o mesmo teto de 100.000.000 centavos das campanhas, validado no boot. Testes
  cobrem excesso, overflow de int4, infinito e fração de centavo.
- **P3 — contrato do fake HTTP:** removida a dupla coerção de tipo do fetch de teste; o fake
  fornece `preconnect`, respeitando o contrato de Bun.

## Verificações

O resgate captura os termos; retomada e edição posterior não os sobrescrevem. Campanhas antigas
sem anual mantêm a regra fixa. Desativar comissão limpa ambos os valores. A rota pública do presente
não recebe condições financeiras nem permite escolhê-las. Admin exige autenticação e permissão;
o formulário respeita os limites do servidor. Ciclo não reconhecido solicita retry antes do INSERT.
Cupons não escolhem a comissão; ela depende de 1/12 meses no Catálogo. Dedupe, garantia, Pix manual,
estorno, autoindicação e janela de comissão permanecem sob as regras existentes.

As migrações foram geradas pelo Drizzle. O upgrade preserva dados financeiros anteriores;
o UPDATE comercial altera só os dois anuais BRL/12 no preço antigo, incrementa versão e é idempotente.
Os dois ambientes foram conferidos em leitura: preços esperados, tabelas pequenas e nenhuma
transação longa. As páginas derivam preço, economia e equivalente mensal do Catálogo.

Evidências locais: Referrals 223 testes com PostgreSQL, Catalog 156, Funil 596, Admin 11,
Kids 8; cinco páginas de oferta em cinco larguras e 72 imagens sem erros. Palco: 32 testes;
roteiro do Farol: seis clipes, zero erros. Typechecks/checks e CI do commit final são a barreira
de entrega. A revisão não identificou outros problemas bloqueadores no escopo.

## Alinhamento autorizado

O usuário pediu o mesmo código nas duas branches e autorizou incluir o palco em produção.
Confirmou manter uma única instância de gravação, hospedada em staging. Após merge da PR,
`staging` avança para o mesmo commit de `main`. Publicar os serviços afetados dos dois ambientes
pelos fluxos canônicos; validar recibos, versões e preços antes de declarar a entrega concluída.
