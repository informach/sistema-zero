# Acesso infantil por perfil e navegador — revisão e publicação

## Implementação

- Entrada separada em responsável e aluno; adulto autenticado abre `/pais`.
- Autorização por criança e navegador, válida hoje ou por 7, 30 ou 90 dias. Código de dez caracteres, com validade de dez minutos, resgatável por um único navegador.
- Retorno pelo avatar, acesso individual para irmãos, último perfil usado e aviso de vencimento. Área dos pais exige autenticação adulta e a troca não cria autorizações.
- Revogação verificada pelo Auth, Gateway e BFF, inclusive uploads. Abas antigas não podem salvar com a sessão de outro perfil. Sair de um perfil e esquecer o navegador são ações distintas.
- Gestão de perfis, compras, atendimento, créditos e indicação preservada em `/pais`. Tutorial adulto v3; tutorial da criança permanece v2.
- Ajuda pública em `/ajuda/entrar`. No Como Fazer, cinco tutoriais novos (três para a criança e dois guias do responsável) e dois revistos (troca de perfil e continuar uma fase).
- Mensagens: `kids-welcome` e `kids-new-access` no Funil e no Referrals, com reserva na chave antiga; presentes, Desafio, resumo semanal e cobrança recusada levam o responsável à Área dos pais e à preparação do computador. O aviso de transição `kids-access-transition` está pronto e não foi enviado.

## Verificação

Os testes usam apenas banco PostgreSQL local dedicado `sistemazero_kids_access_test`. Nenhuma migration foi aplicada em staging ou produção. Os logs da implementação ficam em `.tmp/kids-*.log`; os do full review, em `.tmp/review-*.log`. Não entram no repositório.

Resultado final do full review de 10/10/2026, depois das correções:

| Pacote | Aprovados | Observação |
| --- | ---: | --- |
| Auth | 247 | Inclui 16 casos de acesso infantil em PostgreSQL real. |
| Gateway | 229 | Escopo, revogação e indisponibilidade. |
| Kids | 1.183 | Suíte completa, incluindo entrada, suporte e histórico. |
| member-shell | 1.104 | Suíte completa, incluindo BFF, mídia, cookies e proxy. |
| Members | 1.340 | 49 testes de banco pulados; não contam como evidência de execução. |
| Referrals | 145 | Suíte completa. |
| Messaging | 137 | Suíte completa. |
| Funnel | 20 | Testes direcionados de primeiro acesso. |

Total: **4.405 testes aprovados, zero falhas**, além dos 49 pulados mencionados. Os typechecks dos nove pacotes afetados passaram. Biome aprovou 140 arquivos; passaram também a checagem de migration, `git diff --check` e a validação dos 45 tutoriais. O build de produção do Kids passou após a correção do suporte. As sugestões de acrescentar imagens aos tutoriais em texto continuam registradas.

Cobertura nova: consumo concorrente e repetição do código no mesmo navegador; isolamento de irmãos e aparelhos; autorização revogada, perfil arquivado, expiração, renovação e encerramento de sessão adulta; troca de perfil e falha de logout; mutação em aba antiga; autorização de mídia; restrição de APIs por público; contrato HTTP real e exigência de autenticação adulta recente.

### Revisão de conteúdo (10/10/2026, depois do full review)

Recorte: Como Fazer, templates, links dos e-mails, Funil, Referrals e estes documentos. Corrigidos: aviso de transição às famílias; preparação do computador nos presentes; conta nova que nasce sem perfil (**Adicionar criança** antes de **Acesso nos aparelhos**); links do resumo semanal, do Desafio (não iniciado e vencimento em 7 e 3 dias) e da cobrança recusada, que levavam o responsável à área da criança e agora vão a `/pais`; reserva na chave antiga quando o Messaging ainda não tem a nova; claim do welcome do Referrals liberado quando o Messaging recusa o envio (4xx); testes de contrato das chaves no Funil e no Referrals; guias do responsável; avisos exatos e a armadilha do **Sair** na ajuda da criança; ordem de publicação abaixo.

| Pacote | Resultado |
| --- | --- |
| Messaging | 142 testes aprovados (suíte completa), typecheck sem erro |
| Members | 25 testes aprovados nos três arquivos tocados, typecheck sem erro |
| Funnel | 29 testes aprovados nos três arquivos tocados e 36 nos testes de webhook e assinatura, `astro check` sem erro |
| Referrals | 150 testes aprovados (suíte completa), typecheck sem erro |
| Como Fazer | `bun docs/como-fazer/validar.ts` aprovado com 47 tutoriais; seguem as sugestões de imagem |

O navegador integrado informou `No browser is available` e a listagem de navegadores retornou vazia. A conferência visual manual em desktop, celular, zoom e teclado permanece pendente; testes de componentes e build não substituem essa conferência.

## Publicação coordenada

O [full review posterior](../../.audits/architectural-analysis-2026-10-10-acesso-infantil.md) corrigiu seleção de perfis pelo suporte, retenção do aparelho ao receber nova autorização, recuperação de aparelho expirado, tratamento de indisponibilidade, retorno pelo histórico e recuperação do formulário dos pais. A confirmação de acesso remoto e a formatação dos tutoriais também foram ajustadas. O suporte não recebe autorização persistente: a seleção antiga só atende à sessão de suporte autenticada; pais e alunos continuam recebendo 410 nesse caminho.

### O que o deploy faz sozinho

- **Auth** aplica a migration `0018_kids_study_access.sql` no preDeploy (`db:migrate`, `.railway/services/auth.json`). A migration é aditiva; não alterar migrations antigas.
- **Messaging** roda `db:deploy` no preDeploy (`.railway/services/messaging.json`): migrate e `templates:seed`. O seed cria `kids-welcome`, `kids-new-access` e `kids-access-transition` e atualiza os textos dos templates existentes, preservando `active`. Não é preciso rodar `templates:seed` à mão, e ninguém deve rodá-lo contra um ambiente só para conferir a copy.
- **Staging não tem ordem.** `packages/core` mudou, e o push na `staging` publica juntos, depois do CI verde, gateway, auth, catalog, payments, members, messaging, funnel, fiscal, hub, marketing, referrals, admin, community, community-kids e marketing-app (`.github/workflows/ci.yml`, job `deploy-staging`). Durante a subida, o staging passa alguns minutos com versões misturadas (tabela abaixo); é esperado.
- **Produção é por onda.** `gh workflow run "Deploy produção"` com o SHA aprovado da `main` e a lista de serviços de cada onda (`.github/workflows/deploy-production.yml`). A ordem abaixo vale para produção.

### Versões misturadas

| Combinação | Resultado |
| --- | --- |
| Auth novo, resto antigo | Funciona. A migration é aditiva e o Auth só emite o contexto Kids quando o Kids novo pede a entrada da família. Por isso o Auth vai primeiro. |
| Gateway novo, Kids antigo | Quebra o Kids inteiro: toda chamada com a sessão antiga recebe 401 `KIDS_LOGIN_REQUIRED`. |
| Kids novo, Gateway ou Auth antigos | Quebra a entrada: as rotas `/auth/kids/*` não existem, a criança vê 503 e o responsável entra num laço de login. |
| Members novo, Gateway antigo (ou o inverso) | Sem efeito visível sozinho; as miniaturas da grade de perfis (`/members/internal/device-avatars`) só funcionam com os dois novos. |
| Messaging novo antes do Kids novo | Os e-mails passam a falar de **Acesso nos aparelhos**, que ainda não existe na tela. Por isso o Messaging vem depois do Kids. |
| Funil/Referrals novos antes do Messaging | Funciona: a chave nova recebe 404 `TEMPLATE_NOT_FOUND`, e eles reenviam com a chave antiga (`welcome`/`new-access`), as mesmas variáveis e a mesma Idempotency-Key. |
| Funil/Referrals antigos depois do Kids novo | Funciona com um tropeço: o recorrente recebe `new-access` com link para `/cursos`, que manda o responsável para a entrada da criança. Por isso a onda 4 vem logo depois da 3. |

### Ordem de produção

1. **Auth**. A migration 0018 entra no preDeploy. Confira o serviço saudável antes de seguir; os demais continuam antigos e funcionando.
2. **Members, Gateway, community-kids, community e admin juntos**, numa só onda, em horário de pouco uso. A partir daqui toda sessão Kids antiga cai: o responsável entra de novo e autoriza o computador da criança. A janela de versões misturadas desta onda dura o tempo da subida; não separar estes serviços em ondas diferentes.
3. **Messaging**. O preDeploy semeia os templates novos e os textos revistos (presentes, Desafio, resumo semanal).
4. **Funnel e Referrals**. Passam a usar `kids-welcome`/`kids-new-access`. O reenvio com a chave antiga torna a ordem 3 → 4 segura mesmo se ela for invertida por engano.
5. **Tutoriais do Como Fazer.** Importar, revisar e publicar no Admin os sete tutoriais deste trabalho (`plataforma-entrar-com-codigo`, `plataforma-voltar-ao-meu-perfil`, `plataforma-nao-consigo-entrar`, `plataforma-preparar-acesso-da-crianca`, `plataforma-renovar-ou-encerrar-acesso`, `plataforma-trocar-de-perfil` e `plataforma-voltar-para-a-aula`), só depois de o Kids novo estar no ar no ambiente. Reconciliar com o **Exportar JSON** do ambiente para preservar as mídias dos outros tutoriais. O conteúdo publicado alimenta a busca do Zappy; não há cópia separada desses passos no tutor.
6. **Conferências**, primeiro em staging e depois o essencial em produção: o responsável entra por senha e por código do e-mail e cai na Área dos pais; autoriza o André neste aparelho e por código em outro navegador; a Débora continua pedindo código; a criança volta sem código; renovar e encerrar só mexem no aparelho escolhido; aba antiga não salva no perfil errado; **Sair → Sair deste aparelho** pede outro código; o endereço direto da Área dos pais exige o responsável; um link de fase é retomado depois da entrada. Nas mensagens: um e-mail de cada template novo num endereço da equipe, conferindo o link (`/login/responsavel`, `/pais` ou a definição de senha). Os tutoriais publicados e a busca do Zappy por "código", "entrar" e "não consigo entrar".

### Aviso às famílias atuais (decisão da dona)

Na onda 2, todas as sessões Kids antigas caem. O template `kids-access-transition` (e-mail e WhatsApp, variáveis `nome` e `link`, com `link` = `<kids>/login/responsavel`) explica a mudança e o passo único na Área dos pais. **Ele fica pronto no seed, sem chamador e sem script de envio.** A lista de destinatários (quais famílias, por e-mail e/ou WhatsApp, respeitando a decisão de não mandar WhatsApp frio) e o horário dependem de decisão da dona. O texto fala da mudança no passado, então serve para depois da onda 3; para avisar antes da troca, é preciso outra versão do texto. Não houve envio.

## Mídias afetadas

O tutorial `plataforma-trocar-de-perfil` conserva slug e IDs dos passos. Saíram do rascunho dois prints que ensinavam o caminho antigo: um da grade mista de perfis (`escolher`) e um do menu da conta antigo (`selecionar`). Os cinco tutoriais novos (`plataforma-entrar-com-codigo`, `plataforma-voltar-ao-meu-perfil`, `plataforma-nao-consigo-entrar`, `plataforma-preparar-acesso-da-crianca` e `plataforma-renovar-ou-encerrar-acesso`) têm instruções completas em texto. A lista do que capturar, passo a passo e com a sessão de captura necessária, está em [PRINTS-A-REFAZER-2026-10-06.md](../como-fazer/PRINTS-A-REFAZER-2026-10-06.md), seção de 10/10/2026: 23 capturas. O roteiro antigo de captura com cookies de conta não serve mais; o Chrome de captura precisa ser autorizado pela Área dos pais antes. Também é preciso substituir os trechos dos vídeos que mostram a entrada por e-mail da criança, a grade mista ou o antigo portão dos pais. Nenhum vídeo novo foi gravado nesta implementação.

Código, documentação e templates foram preparados localmente. Este trabalho não publicou conteúdo, não enviou mensagens e não executou deploy.
