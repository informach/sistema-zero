# Prazo de sete dias do presente por indicação

## Decisão

O curso Cadê Todo Mundo? continua parte da Comunidade dos Criadores e só é concedido sem custo quando uma família resgata um link de indicação. Para resgates novos, esse acesso termina sete dias após o cadastro pelo link. Resgates iniciados antes da implantação preservam o acesso concedido sem prazo. A regra não altera assinaturas nem outras concessões do curso.

## Concessão e expiração

Cada resgate grava uma versão da regra no momento do primeiro cadastro. Resgates preexistentes ficam com a versão antiga (sem vencimento); os novos gravam o prazo de sete dias. A data de criação do resgate no banco é a âncora imutável, inclusive se a concessão precisar ser retomada após falha. O serviço de indicações passa a enviar `expiresAt` ao serviço de cursos no grant. A verificação de acesso já feita pelo serviço de cursos encerra o acesso automaticamente nessa data, sem tarefa agendada ou mudança em outras origens de acesso.

Se a concessão não puder ser concluída antes do vencimento, o resgate não deve anunciar um curso utilizável: fica com erro diagnosticável para atendimento. Uma submissão repetida nunca renova os sete dias. A migração deixa os registros antigos sem versão de prazo e exige que apenas novos inserts escolham a regra nova.

## Comunicação

Informar de forma direta que o prazo é de sete dias **a partir do cadastro pelo link**, não da primeira aula. A informação aparece na área dos pais, na página do embaixador, na página de resgate do presente, no texto compartilhável e nos e-mails de convite e boas-vindas. Novos resgates usam modelos próprios de boas-vindas; os modelos antigos continuam disponíveis para resgates históricos cujo e-mail atrasou. O convite oferece só o curso, sem assinatura, cartão ou demais cursos. Na área dos pais, o título passa a ser “Seja um embaixador do Sistema Zero”, não “Indique e ganhe”. A mensagem diferencia o prazo do curso do período de garantia de sete dias usado para o bônus do embaixador.

## Verificação

Cobrir novos e antigos resgates, retomada sem reiniciar prazo, concessão com `expiresAt` correto, expiração real na checagem de acesso, e presença/clareza da informação nas superfícies públicas. Rodar testes, typecheck e formatação dos pacotes alterados. Não converter resgates antigos por backfill.

Na implantação, aplicar a migração do referrals e executar o seed idempotente de templates no messaging antes de liberar o novo código do referrals. Os templates novos não são criados pelo deploy padrão do messaging.

## Apresentação do embaixador na área dos pais

Os pais não devem ser apresentados como participantes de “Indique e ganhe”, mas como embaixadores. O bônus por Pix permanece inalterado para os embaixadores auto-cadastrados. Muda apenas o título e a comunicação, sem remover o ponto de entrada nem desativar a concessão do bônus.
