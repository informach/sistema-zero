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

## Complemento: calendário, cupons e primeira cobrança

Revisão do escopo ampliado: calendário canônico de Brasília; isolamento de público e parceiro;
vínculo imutável do cupom; consulta interna autenticada; expiração separada do presente;
recuperação de cadastro parcial; preços autoritativos; validade individual já adquirida;
primeira cobrança com desconto e renovações integrais.

Achados corrigidos nesta rodada:

- **P1 — desconto permanente na assinatura:** o desconto nativo da Efí vale para todos os
  ciclos. A integração usa criação em duas etapas, persiste as identidades antes de ativar,
  confirma o preço recorrente integral e retoma falhas por worker com lease. Prova em sandbox
  confirmou que atualizar itens preserva o valor da primeira cobrança já criada.
- **P1 — segunda tentativa após resposta perdida:** o checkout conserva o pedido autorizado
  na memória, repete o mesmo identificador e bloqueia troca de plano/método durante confirmação.
  O servidor recupera a assinatura persistida. Tokens não são gravados. Recusa inicial encerra
  a recorrência; pendência conserva consulta e reconciliação até obter resultado definitivo.
- **P2 — recusa de dados tratada como espera de 24 horas:** o adapter distingue respostas
  definitivas 400/422 de falhas ambíguas. A recusa inicia cancelamento imediato da assinatura
  preparada; o resultado é confirmado antes de liberar outra tentativa. Falhas 429/500 continuam
  na reconciliação, sem repetir a ativação.
- **P2 — prévia de cupom de outro plano:** cotação e SSR passam o plano validado pelo alternador;
  mudar o plano invalida a prévia anterior e exige nova conferência. Links anuais cotam o anual.
- **P2 — conferência de período rejeitava primeira cobrança promocional:** agora verifica o
  valor pela identidade da cobrança. Prova PostgreSQL cobre preço normal e primeira promocional.
- **P2 — cupom encerrado junto com presente:** validade própria deriva do calendário e do estado
  explícito da campanha; painel e cartão continuam disponíveis após o fim do resgate gratuito.
- **P2 — habilitação de cupons nas assinaturas existentes:** migração limitada às quatro ofertas
  canônicas preenche apenas configuração ausente, preservando desabilitação explícita e conteúdo.
- **P3 — criação após falha e divulgação avulsa:** retry recupera cupom pelo código sem outro POST;
  cupom inativo não pode ser vinculado. Divulgação avulsa tem retry e invalida seleção obsoleta.
- **P2 — Palco confundia próximo bloco com conteúdo encaixado:** a busca usa o caminho próprio
  do pai e do filho para excluir o restante da pilha. Blockly real reproduziu ambos os erros
  (bloco e campo) antes da correção e confirmou os quatro casos depois, sem alterar o roteiro WIP.
- **P3 — acabamento e acessibilidade:** cartões usam datas sem segundos e fim inclusivo;
  status vazio continua na árvore acessível. `qrcode` entra no prebundle explícito do funil.
  Documentação operacional usa papel da pessoa, mantendo identificação real nos recibos privados.

Verificação local: Payments 617 testes, Referrals 228, Funnel 601, Catalog 162 mais a prova
adicional da migração de cupons; suites financeiras com PostgreSQL descartável. Typechecks dos
cinco serviços sem erros. Browser real verificou Kids/Adultos, larguras 320/390/1440, primeira
cobrança versus renovação, troca de plano, replay do mesmo pedido e bloqueios durante pendência.
O build do funil verificou cupom expirado com preço normal nas três páginas do Desafio. Cartões
de campanha e cupons avulsos tiveram PNG baixado e QR decodificado; painel é somente leitura.

O CI do HEAD final e os recibos de deploy ainda são necessários antes da conclusão operacional.

## Revisão completa do programa de embaixadores

- **P2 — presente adulto oculto apesar do curso publicado:** consultas de leitura confirmaram
  `cade-todo-mundo-adulto` publicado e disponível no Gateway dos dois ambientes. Faltava
  `COMMUNITY_URL` no Referrals; configurada por ambiente e preservada no IaC. A ativação depende
  do próximo deploy, sem alterar o curso nem os resgates existentes.
- **P2 — faixa etária divergente:** presente, painel, mensagens de WhatsApp, cartões, Admin e
  entrada nas duas comunidades passam a informar Kids de 9 a 17 anos. Adultos: 18 anos ou mais.
- **P2 — fim de resgate apresentado como dia seguinte:** painel, cartão e páginas Kids/Adultos
  mostram o último minuto válido em Brasília, preservando o limite exclusivo usado no servidor.
- **P2 — confirmação de formulário obsoleta:** durante o envio, nome, e-mail e público ficam
  bloqueados; o mesmo vale para a chave Pix durante o salvamento. Editar o próximo convite
  remove a confirmação anterior. Browser reproduziu todos os quatro controles liberados antes
  do ajuste e confirmou o bloqueio depois, com respostas atrasadas controladas.
- **P3 — orientação incompleta:** dúvidas explicam links pessoais versus campanhas, cartões,
  cupons como benefício separado e administração exclusiva da equipe. Comissões não são
  prometidas por resgate gratuito nem por compra avulsa.

Revisados isolamento do parceiro, ausência de dados dos convidados no painel, privacidade da
capability, estados de campanha, vínculo de cupom, valores por plano e termos históricos.
Prova local: 602 testes do funil, testes de entrada Kids e Adultos, build e navegador real com
dez estados em duas larguras, resgate dos dois presentes, convites, Pix e cartões. Capturas
de celular e desktop conferidas. A confirmação dos links publicados fica para o pós-deploy.

## Publicação final

O usuário pediu o mesmo código nas duas branches e autorizou incluir o palco em produção.
Confirmou manter uma única instância de gravação, hospedada em staging. Após merge da PR,
`staging` avança para o mesmo commit de `main`. Publicar os serviços afetados dos dois ambientes
pelos fluxos canônicos; validar recibos, versões e preços antes de declarar a entrega concluída.
