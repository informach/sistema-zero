# Revisão completa — comissões, preço anual e alinhamento

Revisão sobre a PR 244, incluindo a incorporação do histórico de staging. Escopo: contratos,
formulário Admin, validação HTTP/configuração, snapshots e locks, conversão e estorno,
migrações, Catálogo/checkout, copy dos dois públicos e mudanças do palco, incluindo os commits
de `gravacao/palco` até `f1249594046b85e715f875dbd2eb8d55f9e1cb1e`, autorizados pelo usuário.

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
Kids 8; cinco páginas de oferta em cinco larguras e 72 imagens sem erros. Palco: 41 testes,
619 asserções, check e typecheck; prova de organização com Blockly real no Chrome 156 passou.
Roteiros do Farol: 18 clipes nas aulas 1, 2 e 3, zero erros. Os gestos novos foram revisados
quanto ao bloco arrastado, limites da área visível, espera de estabilização e falhas retomáveis.
A edição não commitada da aula 3 no worktree do palco conserva o SHA256 original.
Typechecks/checks e CI do commit final são a barreira
de entrega. A revisão não identificou outros problemas bloqueadores no escopo.

## Complemento: cartões e campanhas no painel privado

O usuário aprovou cartões com prévia/PNG e “Minhas campanhas”, exclusivamente para consulta.
Revisão concluída sobre o complemento: o beneficiário é derivado do token ativo no servidor;
o SQL filtra pessoa e rascunhos antes de paginar/contar; a resposta projeta apenas campos próprios,
sem participantes, e-mail, auditoria ou notas internas. Nenhuma rota de escrita foi acrescentada.
Paginação mantém a assinatura HMAC do pathname, no-store, no-referrer e noindex.

Achados corrigidos:
- **P2 — rota inexistente virava 500:** a prova de ausência de escrita pelo token reproduziu
  um erro interno para caminho sem rota. O tratamento explícito de NOT_FOUND agora retorna 404.
- **P3 — página fora do intervalo sem retorno:** um endereço manual de paginação podia deixar
  a lista vazia sem navegação quando havia apenas uma página. O retorno agora existe também
  nesse caso e aponta para uma página válida; a legenda informa “Página indisponível”.
- **P3 — acabamento de botões e marca:** ações novas adotam o tamanho e a receita do host,
  com alvo mínimo de 44 px. A arte usa os caminhos oficiais da marca, paleta canônica e fontes
  carregadas antes de medir/desenhar, incluindo o peso usado nos rótulos.

O QR codifica exatamente o link público, incluindo query, e nunca recebe o token privado.
Prévia/download invalidam imagens anteriores na troca de dados e permitem recuperar falha.
Campanhas pausadas/encerradas não oferecem divulgação no painel. O cartão administrativo
identifica situações sem resgate. Bônus/participantes não entram na arte pública.

Evidências: Referrals 225 testes com PostgreSQL; UI 135 testes; 27 testes direcionados de funil;
typechecks Admin/Kids/UI/Referrals e Astro sem erros. Chrome decodificou o QR do PNG, comparou
o arquivo baixado e verificou troca de público, diálogo aninhado, erro/retry, URL inválida e título
longo. O build real do funil passou dez casos em duas larguras, mais resgate, painel, campanhas,
cartão e retorno da paginação. Revisão visual das capturas de desktop, celular e PNG realizada.

## Publicação final

O usuário pediu o mesmo código nas duas branches e autorizou incluir o palco em produção.
Confirmou manter uma única instância de gravação, hospedada em staging. Após merge da PR,
`staging` avança para o mesmo commit de `main`. Publicar os serviços afetados dos dois ambientes
pelos fluxos canônicos; validar recibos, versões e preços antes de declarar a entrega concluída.
