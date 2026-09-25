# Prazo de sete dias do presente por indicação

## Decisão

O curso Cadê Todo Mundo? continua parte da Comunidade dos Criadores e só é concedido sem custo quando uma família resgata um link de indicação. Para resgates novos, esse acesso termina sete dias após o cadastro pelo link. Resgates iniciados antes da implantação preservam o acesso concedido sem prazo. A regra não altera assinaturas nem outras concessões do curso.

## Concessão e expiração

Cada resgate grava uma versão da regra no momento do primeiro cadastro. Resgates preexistentes ficam com a versão antiga (sem vencimento); os novos gravam o prazo de sete dias. A data de criação do resgate no banco é a âncora imutável, inclusive se a concessão precisar ser retomada após falha. O serviço de indicações passa a enviar `expiresAt` ao serviço de cursos no grant. A verificação de acesso já feita pelo serviço de cursos encerra o acesso automaticamente nessa data, sem tarefa agendada ou mudança em outras origens de acesso.

Se a concessão não puder ser concluída antes do vencimento, o resgate não deve anunciar um curso utilizável: fica com erro diagnosticável para atendimento. Uma submissão repetida nunca renova os sete dias. A migração deixa os registros antigos sem versão de prazo e exige que apenas novos inserts escolham a regra nova.

## Comunicação

Informar de forma direta que o prazo é de sete dias **a partir do cadastro pelo link**, não da primeira aula. A informação aparece na área dos pais, na página do embaixador, na página de resgate do presente, no texto compartilhável e nos e-mails de convite e boas-vindas. O convite oferece só o curso, sem assinatura, cartão ou demais cursos. Na área dos pais, o título passa a ser “Seja um embaixador do Sistema Zero”, não “Indique e ganhe”. A mensagem diferencia o prazo do curso do período de garantia de sete dias usado para o bônus do embaixador.

## Verificação

Cobrir novos e antigos resgates, retomada sem reiniciar prazo, concessão com `expiresAt` correto, expiração real na checagem de acesso, e presença/clareza da informação nas superfícies públicas. Rodar testes, typecheck e formatação dos pacotes alterados. Não converter resgates antigos por backfill.

## Decisão complementar pendente

O usuário esclareceu que os pais não devem ser apresentados como participantes de “Indique e ganhe”, mas como embaixadores. Ainda falta confirmar se isso muda apenas a comunicação ou se elimina o bônus por Pix para embaixadores auto-cadastrados. A regra dos sete dias não depende dessa resposta.
