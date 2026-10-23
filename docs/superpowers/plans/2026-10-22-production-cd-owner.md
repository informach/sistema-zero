# Produção com um único controlador de implantação

**Objetivo:** preparar uma onda explícita e serializada de produção, reutilizando a
barreira canônica Members/Auth antes de publicar aplicativos. Este lote não faz
deploy, não desliga triggers remotos e não conclui a primeira promoção.

**Decisão aprovada:** o workflow `deploy-production` é o único dono de deployments.
O workflow de configuração conserva o plano aprovado do PR e confere deriva no
push de main; não aplica configuração nem publica aplicações. Staging permanece
com seu fluxo atual. As alternativas de depender de Wait for CI ou aplicar toda a
IaC antes da barreira foram recusadas: o primeiro pode esperar o próprio workflow;
o segundo pode iniciar réplicas antes da carga canônica.

## Contratos

- Registry fechado de projeto/ambiente de produção e IDs de serviços; nenhum ID
  staging substitui produção. Os três IDs já fornecidos por GitHub variables são
  validados e a identidade real dos deployments é conferida.
- Main precisa ser o SHA solicitado, proveniente de PR interno promovido, com a
  mesma árvore do head aprovado. Os nove jobs do CI devem ter concluído com sucesso
  na mesma tentativa. O plano deve vir do workflow de configuração desse PR e
  conferir árvore `.railway`, CLI, etag e hash do change set.
- A consulta real `serviceInstanceAutoDeployStatus.enabled` deve ser `false` para
  todos os serviços antes da etapa IaC. Ausência/erro/true recusa a onda. Não se
  presume que `branch` ou `checkSuites` desligam autodeploy. Antes de cada POST são
  rechecados main e o trigger do serviço; ao final, todos os triggers novamente.
- Planos não vazios de build/deploy/source são recusados ANTES de apply. A CLI
  5.62.1 não oferece apply sem deploy; um plano vazio somente confere drift.
- Seleção explícita, sem estreia de serviço sem deployment saudável. Mudança de
  backend exige Members e Auth juntos; apps dependem do resultado canônico V1.
  ACK desconhecido interrompe, sem retry automático/cancelamento/rollback.
- Os mesmos probes SSH de contexto/admissão protegem os backends. Aplicativos
  exigem SUCCESS do deployment exato, SHA/contexto reais, único ativo e antigos
  REMOVED. SUCCESS usa o healthcheck configurado; não substitui a barreira V1.
- Limites de implantação: 60 min por espera de backend, 140 min na barreira canônica,
  20 min para apps, 180 min por job. Produção tem teto interno de 175 min para preservar
  margem de gravação/limpeza. A decisão usa Members observado em 24m25 e Auth em cerca
  de 56 min (22/10), sem atribuir toda a demora a uma única causa. Uma nova exaustão
  ainda falha fechada, preservando ACKs e sem repetir mutações.

## Implementação e verificações

1. Estender o registry e a porta existente com a oferta explícita de aplicações e
   leitura de triggers. Manter callers/defaults staging inalterados. Testar contexto,
   trigger true/unknown, pending e aposentadoria real antes de liberar apps.
2. Adicionar `scripts/ci/production-release.mjs` e testes: resolução do PR/CI/plano,
   algoritmo canônico antes dos POSTs de apps, recusa de planos não vazios, deriva
   de main e checkpoints sanitizados antes de mutações.
3. Trocar o shell paralelo do workflow de produção pelo controlador e deixar o
   workflow Railway push-main sem apply. Testar ordem e ausência de segundo dono.
4. Atualizar `.railway/README.md`, registrar comandos e executar apenas testes
   locais inertes, formatação e sintaxe. Root revisa antes de commit/publicação.

## Primeira promoção: pendências operacionais explícitas

Este recorte não aplica um plano real não vazio. Antes da primeira promoção:

Inventário readonly do Root em 22/10, 20:59 UTC: 17 triggers `enabled=true` e
somente Fiscal `false`. Portanto o gate atualmente recusa a onda. Nenhum trigger
foi desligado por esta implementação.

1. Root inventaria os triggers de produção e desliga os nativos com o mecanismo
   oficial; guarda leitura posterior. Congela também operações externas durante a
   onda. O gate não é um lock atômico contra outro operador.
2. Obtém plano fresco e preserva configuração anterior, IDs e definições de rollback
   sem valores secretos. Se houver alterações reais de build/deploy/source, prepara
   tarefas separadas por backend/apps: cada tarefa deve aplicar somente sua fase,
   identificar qualquer deployment iniciado pelo apply e adotá-lo explicitamente
   no controlador existente. Nenhum apply global pode anteceder Members/V0/Auth/V1.
3. Migrações são separadas de seed. Catalog `db:deploy` deve executar somente
   migrações; carga editorial/seed é uma operação explícita, não efeito de deploy.
4. Depois dessa conciliação, um plano fresco vazio e o gate de triggers permitem
   dispatch com SHA/main e CSV explícitos. Validar autenticação e fluxos de cada
   aplicação após a onda. Falha parcial mantém os recibos; não reinicia tudo às cegas.

A fase de apply/adoption por serviço acima continua pendente de revisão operacional;
não há alegação de produção pronta ou configuração já conciliada neste lote.

Referências primárias: [Wait for CI](https://docs.railway.com/deployments/github-autodeploys#wait-for-ci)
espera a conclusão dos workflows; o [SDK IaC](https://docs.railway.com/infrastructure-as-code/reference#sources)
declara origem e branch, não expõe toggle de autodeploy. O schema incluído no SDK
3.11.0 fornece a consulta `serviceInstanceAutoDeployStatus` usada pelo gate.

## Conciliação operacional observada em 22/10

O desligamento oficial `serviceInstanceAutoDeployUpdate(enabled:false)` do Admin
recebeu ACK false; a leitura posterior confirmou `enabled=false`, nenhum trigger
e o mesmo deployment. A operação também removeu `source.checkSuites` e mudou o
ETag da configuração. O primeiro operador parou após esse único ACK; nenhum
outro serviço foi alterado por aquela tentativa e o recibo parcial foi preservado.

A declaração anterior de `checkSuites:true` conflitava com esse estado real.
A primeira correção manteve `branch:main` sem o campo, mas a leitura seguinte
mostrou que essa forma não é uniforme entre serviços. Essa etapa intermediária
foi substituída pelo mapa literal descrito abaixo. Isso não transforma metadados de
origem em toggle: `serviceInstanceAutoDeployStatus.enabled=false` continua
obrigatório para todos os serviços e antes dos POSTs. Os alvos restantes foram conciliados nas etapas seguintes, sem repetir a operação
já confirmada do Admin.


## Origens literais e 18 toggles desligados

R3 confirmou seis novas transições completas e parou após o ACK do Helpdesk:
nesse serviço, o desligamento também removeu branch. O recibo NEG foi preservado.
A reconstrução da configuração inteira com os source.before do plano anterior
reproduziu o hash original, sem drift de variáveis, build, deploy ou volumes.
R4 permitiu duas previsões literais só no próprio alvo reconhecido: remover
checkSuites, ou remover checkSuites e branch. Os nove ACKs e readbacks restantes
concluíram com os 18 toggles false, pending zero e deployments ativos preservados.
Isso não é deploy de aplicativos nem prova dos fluxos de produção.

A definição agora usa production-sources.ts com os 18 nomes fechados, repo e
rootDirectory atuais, branch main somente onde foi preservada e ausência exata
onde foi removida. Nome novo ou desconhecido recusa antes de criar recurso.
Staging mantém seu helper e sua branch. O helper github() injeta main por default;
por isso não deve reconstruir a origem de produção. Omissão de source também não
serve: a CLI 5.62.1 a compara como null e pode desconectar a origem.

A extração posterior ficou vinculada ao recibo R4 SHA
719ef0ddb725f5e32f05e007b946632e061388d76af40acdc62b57515a4d04ff,
configuração SHA 4d09835a59654a69d01a4d12165875891c98649678e9322130d71745154d99ab
e ETag 5ea7995731e991d30c80b708e3d872dbe0cbc1040571af21517bfc78c02e9cef.
O candidato independente passou no planner real com zero mudanças e nenhum apply.
O gate automático passou a recusar toda source update, nos dois ambientes, mesmo
rotulada segura. Alteração futura de origem exige operação específica e readback
nativo completo; não há ciclo off, IaC e off para esconder uma reativação.

Main e commitSha continuam sendo autoridades do controlador canônico. A aceitação
real de um novo deploy do Helpdesk com branch ausente permanece pendente até sua
onda: o planner sem drift não equivale a esse ensaio, nem a produção pronta.
