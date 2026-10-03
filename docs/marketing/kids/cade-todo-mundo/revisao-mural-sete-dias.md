# Revisão do presente e do Mural — 03/10/2026

Escopo: concessões do presente por indicação e campanha, vencimento, retomadas, atualização de resgates antigos, páginas, convites e e-mails. Inclui a orientação posterior de abrir os links do Como fazer na mesma aba da aula.

## Achados corrigidos

| Achado | Correção | Evidência |
| --- | --- | --- |
| O contrato do Mural aceitava uma matrícula da mesma origem com validade superior a sete dias. | Exigir matrícula ativa, mesma origem e vencimento, com limite de sete dias desde a concessão do curso. | Teste HTTP com curso de 30 dias reproduziu HTTP 200 indevido; após a correção recebe 409 sem conceder o Mural. |
| A confirmação do cadastro não informava a participação temporária e prometia visita mesmo para resgates históricos sem esse direito. | Resposta do serviço informa `muralAccess`; a confirmação distingue participação temporária, visita e direito ausente. | Testes da aplicação, contrato HTTP e renderização das três modalidades. |
| Respostas 202, 204 ou HTTP 200 com apenas uma concessão podiam concluir a etapa do Mural. | Exigir confirmação dos dois direitos ou resposta de entrega já confirmada. A mesma regra vale na atualização dos convites antigos. | Três casos reproduziram confirmação indevida; corrigidos, não gravam o checkpoint nem enviam e-mail. Reentrega confirmada continua aceita. |
| A aplicação da atualização de resgates antigos ainda não tinha sido exercitada com persistência real. | Testar o comando com PostgreSQL local e endpoint HTTP de teste. | Simulação sem chamadas; confirmação incompleta recusada; aplicação e repetição preservam prazo e e-mail. |
| Os links internos de ajuda abriam outra aba; textos dos materiais e do quiz não levavam o caminho de retorno à aula. | Links do Como fazer abrem na mesma aba. Textos, materiais e quiz conservam `voltar`; o montador da URL preserva parâmetros e fragmentos existentes. | Testes de markdown e materiais verificam ausência de nova aba, URL da aula e preservação dos parâmetros. |

## Conferências do produto

- Publicação pelo curso continua condicionada à matrícula e à atividade, sem exigir o Estúdio livre. Interações no Mural usam o direito temporário existente no Members; o visitante continua sem publicar, comentar ou reagir.
- Curso e Mural vencem juntos. O link público de uma publicação visível não depende da matrícula continuar ativa. Remoção/moderação da publicação continua sendo respeitada.
- Falhas e retomadas não reiniciam o prazo; outros direitos da conta permanecem independentes.
- Páginas, WhatsApp e novos modelos de e-mail explicam os sete dias de participação, a visita posterior e o escopo do presente. Faixa comunicada: 9 a 14 anos. A ajuda prática aponta para Preciso de ajuda e Recados.
- Os espaços entre as ações de compartilhamento e entre o botão do hero e a indicação etária usam o CSS das páginas do presente.

## Manifestos e implantação

Não é necessário alterar ou reimportar os manifestos para mudar a abertura dos links: seus endereços relativos já estão corretos. A regra fica nos componentes que renderizam a aula. O ajuste vale para os links do Como fazer nas aulas existentes, preservando o retorno oferecido pelo tutorial.

A implantação do presente exige publicar Members e cadastrar os novos modelos de e-mail antes de Referrals e Funil. A atualização de contas antigas é um comando separado, com simulação por padrão; procedimento em [Mural durante os sete dias](mural-sete-dias.md). Não foi aplicada em staging ou produção nesta revisão.

## Validação

As verificações de concessões e copy estão registradas em [Mural durante os sete dias](mural-sete-dias.md). A navegação foi verificada por renderização e testes locais; não houve sessão autenticada de uma criança em staging nem inspeção visual no navegador.

- Member-shell: checagem de tipos e Biome aprovados. Testes de markdown, materiais e tutorial: 41 aprovados. A primeira suíte completa teve um timeout na varredura de legibilidade das cenas; a execução final com `bun test --timeout 15000` passou com os 1.010 casos, sem alterar as asserções.
- Kids: checagem de tipos, Biome e build completo aprovados. A execução inicial simultânea aos builds teve quatro falhas de interação após timeouts. A repetição isolada passou com 47 casos, e a suíte completa final passou com os 1.155 testes, sem alterar timeouts ou asserções desse pacote.
- Community: cinco testes, checagem de tipos e build completo aprovados.
- O build do Funil está aprovado. Os quatro avisos de especificidade do CSS do quiz são anteriores a esta alteração.
