# Promoção completa da plataforma para produção

## Escopo autorizado

Promover o conjunto validado de staging: oficinas ao vivo, comunidade e ofertas
adultas, jornada configurável, objetivos das aulas, integrações criativas e Studio
JavaScript/Python. Não tratar esta promoção como implantação isolada de Python.
O usuário autorizou todos os componentes Python em produção; a proteção atual
é o produto Estúdio Completo, suas capacidades e os blocos da linguagem
conquistados por cursos ou oficinas. Preview de equipe mantém as permissões
existentes. O seletor não substitui autorização de execução no servidor.

Este plano é operacional e ainda não é recibo de implantação. Cada item somente
passa a concluído com leitura do destino e evidência da operação correspondente.

## Referências verificadas em 22/10

- Projeto Railway: `415d5a1c-5f75-432c-8445-b395d0977ce3`.
- Staging: `f634cff6-aafb-4804-8b69-172fad4e946e`.
- Produção: `19c212a5-85c0-493c-9630-a7a0569e8412`.
- Main remoto: `6f93dcb…`; staging remoto: `001ce0788…` nesta leitura.
- Os nove checks de `001ce0788…` passaram; o job de deploy Railway expirou.
  A retomada manual R1 adotou Members e iniciou Auth; sua consulta expirou,
  mantendo a falha registrada. Auth posteriormente chegou a SUCCESS. A R2
  adotou os dois deployments exatos, conferiu retirada dos anteriores e admissão
  por SSH e executou migrate/initialize/verify canônicos. Às 20:45:46 UTC,
  retornou `BACKEND_BARRIER_PASSED`, jornada publicada versão 1, sem novo POST
  de deployment na R2. Aplicativos e commits posteriores não estão qualificados
  por essa barreira. Evidência: `staging-backend-001-adoption-r2.json.snapshot`
  no diretório público de continuidade.
- Produção ainda usa imagens antigas de Runtime/Language. Runtime não tem os
  bindings R2/PythonInspectionJob atuais; Language ainda usa PythonLanguageOwner.
  Não copiar namespaces de staging nem apagar o Owner sem tratar sua aposentadoria.
- Inventário Cloudflare de 19:56 UTC: zero instâncias físicas e zero
  active/assigned/scheduling/starting em ambos os aplicativos. Quatro DOs
  históricas de Language continuam registradas; isso não comprova retirada dos leases.
- Members de produção não tem catálogo/hosts Python. Os apps têm frame origin
  de produção. Credenciais de admissão Auth/Members estão presentes, iguais e
  distintas dos tokens internos; nenhuma rotação é necessária por esse motivo.
- `LIVE_MEDIA_READY=false` em produção. Provisionamento antigo de SFU/TURN,
  supervisor, gravador, volume e checkpoint não equivale a ensaio atual do conjunto.
- A inspeção SQL própria foi somente leitura, em snapshot repeatable read:
  projects/artifacts/conversations/cycles/tasks/project_members legados de Pensa
  tinham zero registros; vínculos `pensa-` de creations também eram zero. Outras
  tabelas consultadas estavam ausentes, não foram classificadas como vazias.
  Isso descreve aquela leitura; não substitui backup/janela ou nova conferência
  imediatamente antes de migrations destrutivas 0126/0128.

## Inventário e ordem de implantação

| Frente | Recursos e contratos a conferir | Evidência para liberar |
|---|---|---|
| Banco e jornada | Migrations Auth/Members, seed inicial canônico, perfis anteriores e conquistas, token de admissão dedicado | Members novo, initialize, Auth novo com anteriores retirados, captura/baseline e policy publicada; sem reset/reseed de publicação existente |
| Objetivos e aulas | Critérios servidor, manifestos/roteiros ajustados, Admin e ambos os BFFs | Autoria, publicação e verificação coerentes; criatividade aceita sem mudar as instruções gravadas |
| Comunidade adulta | Política/capacidades adultas, catálogo de cursos, páginas e acessos | Login, navegação e acesso por produto/audiência corretos; sem herdar identidade Kids |
| Ofertas adultas | Admin, catálogo, funnel, quiz, pagamentos, webhooks e concessão | Oferta publicada correta, quiz/resultado e checkout de teste autorizado; idempotência e acesso após confirmação |
| Oficinas | Members, Admin, Kids/Adult, live-recorder, supervisor, SFU/TURN, R2 privado, volume, VM/checkpoint e callbacks | Inscrição/acesso, professora/aluno, mídia, encerramento/replay e concessão de blocos; produto Completo continua separado |
| Studio JavaScript | Editor clássico/Pro, blocos/Ponte/fonte, Pinta/Molda, aulas, Mural e página pública | Regressão JavaScript e percursos de salvar/reabrir/executar/publicar/jogar |
| Python web | Runtime, Language, imagens por digest, R2, catálogo e hosts, CSP/frame origins | Distribuição íntegra, linguagem, inspeção/execução/preview, grants e autorização; Members ativado por último |
| Demais serviços | Gateway, Hub, catálogo, pagamentos, mensagens, funnel, indicações, marketing, atendimento e Fiscal | Não deixar backlog de deploy anterior oculto; conferir configuração, SHA, saúde e restrições próprias |

O conjunto anterior de CI contém 18 serviços Railway: Auth, Members, Admin,
Community, Community Kids, API Gateway, Hub, Catalog, Payments, Messaging,
Funnel, Referrals, Marketing, Marketing App, Helpdesk, Helpdesk App,
Live Recorder e Fiscal. Fiscal tem deploy manual e restrição de certificado
documentada; não disparar ou declarar atualizado sem conferência própria.
Essa lista não inclui Workers, SFU/TURN, R2, banco ou configuração de ofertas.

## Barreiras antes de promover main

1. Fechar o lote corrente em staging, preservar negativas e concluir o backlog
   com receipts vinculados a SHA e destino. Rever e verificar os commits finais.
2. Inventariar o diff completo main→staging por componente e migrations, incluindo
   alterações de outras sessões. Conferir infraestrutura e nomes preservados no IaC.
3. Corrigir a lacuna do rollout de produção: o wrapper e o controller canônicos
   do artefato implantado são fechados para staging. O novo registry/controller
   local já admite produção explícita e passou em 90 testes/430 asserções, mas
   o workflow de produção ainda dispara serviços em paralelo e não implementa
   a barreira de publicação da jornada.
   Usar destinos explicitamente permitidos e identidade remota real; nunca simular
   o ID de staging no container de produção. Testar a ordem e os casos de falha.
4. Conferir a relação entre plano de PR, apply, Wait for CI e autodeploys antes do
   merge. O apply não pode antecipar Auth/Members/apps e a espera não pode criar
   deadlock com a própria onda canônica. Não desativar controles para contornar isso.
5. Preparar plano de produção próprio e fresco para Python: origens, bucket,
   versões, namespaces, catálogo anterior e retirada de leases. Imagens atuais por
   digest podem ser reutilizadas; identidades/configurações de staging não.
6. Fazer rollout por ondas com checkpoint anterior a cada mutação. Resultado
   remoto desconhecido exige investigação, sem repetir automaticamente nem
   presumir rollback ou limpeza por TTL. Migração de dados não tem rollback
   automático por troca de imagem.
7. Executar a validação hospedada de cada frente e confirmar a configuração
   efetivamente carregada pelas réplicas novas. Ativar mídia e catálogo somente
   na ordem validada. Registrar commit, imagem, migrations, versões, flags e limites.

## Limites de aceite ainda abertos

O Runtime staging passou na prova HTTP de três casos em 131,42 s: compilação sem
execução, rejeição de sintaxe inválida e Turtle com stdin/Space/clique e captura
320×240. As retiradas lógicas passaram e a leitura posterior mostrou zero containers
ativos/pendentes. Isso não é prova de UI autenticada, jogos completos no Mural,
audibilidade ou desempenho.

F1 Pro continua negativo: p95 edited 1629,8 ms para meta de 1500 ms. O diagnóstico
de CPU não requalifica a série. Não alterar orçamento ou omitir essa pendência.
O ensaio no computador de 8 GB fica para depois da validação local, conforme decisão
do usuário. Nenhum resultado histórico deve ser atribuído automaticamente à nova
versão. Publicação do código e conclusão integral da homologação são estados distintos.

## Runbooks associados

- [Oficinas ao vivo](../../runbooks/2026-10-14-oficinas-ao-vivo-deploy.md).
- [Rollout canônico da jornada](2026-10-19-kids-journey-staging-rollout.md).
- [Ativação Python staging](2026-10-22-python-staging-activation.md).
- [Concessão por oficinas](2026-10-22-live-workshop-block-grants.md).
- [Fluxo Railway](../../../.railway/README.md).

Os recibos privados sanitizados do inventário são preservados para revisão. Valores
de credenciais, headers, variáveis completas, mídia de alunos e dados de perfis não
integram este documento ou o Git.
