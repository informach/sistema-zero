# Promoção da plataforma para produção

Atualizado em **27/09/2026**. Este caminho foi mantido para preservar referências. A sequência antiga de 19/09 foi substituída: **não restaurar `0091_sai_o_apoio_das_secoes`** nem truncar o journal do código atual. A preparação detalhada está no [plano de execução](../superpowers/plans/2026-09-27-promocao-producao.md); os dados de partida estão no [diagnóstico](../plans/2026-09-27-promocao-producao-design.md).

## Estado e correções verificadas em 27/09

- Produção continua com Members até a migration `0075`; a candidata tem `0098`. A release A foi preparada a partir de main, com aplicação antiga e migrations `0076`–`0090`. O HEAD atual exige colunas da B e não serve como A apenas retirando entradas do journal.
- `0091_mysterious_kate_bishop` adiciona a marcação de caderno e remove `support_block_ids`; `0093_ebook_attachment_links` muda o Livro 3D para `attachmentId`. A B só pode entrar depois da A e dentro da janela de transição dos consumidores.
- O conversor local já aceita produção explicitamente, verifica os destinos e cobre mural, criações, entregas atuais/anteriores, rascunhos/desfazer, grants e configurações. O hash de publicação é compartilhado com Members. Consulte o [operador Studio](../../packages/studio/scripts/project-migrations/README.md).
- CORS público aplicado no bucket `comunidade-sistema-zero`, com probe instalado. GET e HEAD confirmados nas origens oficiais Kids/Comunidade; uma amostra de arquivo existente também passou pelo CDN sem parâmetro de cache.
- `R2_UGC_BUCKET=comunidade-sistema-zero-ugc` ativo no Admin. Regra `admin-community-attachments-read` permite GET/HEAD nos domínios oficial e Railway do Admin; a regra de upload dos alunos foi preservada. URLs assinadas verificadas a partir do contêiner Admin: HEAD 200 e GET parcial 206, com a origem correta.
- Admin redeployado no **mesmo** SHA `5734facb7f97cd04515f0f0c53aa21980b8f821e`, deployment `c94f7607-8de0-4359-af92-1cc70e190247`, para ativar a variável. Nenhum outro serviço foi promovido e nenhum jogo de produção foi convertido.
- Certificado Fiscal continua vencido. Sua renovação foi excluída desta rodada pelo usuário; não redeployar o Fiscal antes de resolvê-la.
- Provas do operador: preflight de schema em staging passou; produção em `0075` foi recusada antes da captura. A conferência com candidato `5bdce5eb` foi recusada no Kids de staging, que já avançou para `21321aa0`, enquanto Members ainda estava no candidato informado. Essa guarda funciona: registrar e alinhar os SHAs da onda antes de converter, sem ignorar a divergência.

A subida completa foi autorizada, incluindo o trabalho de autoria e o curso adicional Cadê Todo Mundo?. O candidato B inclui o commit de autoria `3bc13008`. A, a barreira de manutenção e o modal estão preparados. O ensaio restaurou o dump de produção em PostgreSQL 18, aplicou A e B com os runners reais, converteu 87 documentos/18 assets (76 linhas e 27 objetos) e verificou recuperação, reaplicação e segunda migração vazia. O backup remoto privado contém o dump validado e 109 objetos (486.601.608 bytes). Dados privados permanecem fora do Git. CI e operações finais de produção continuam como gates, sem confundir ensaio com deploy.

## Ordem da janela

1. Fechar o pacote de execução com SHAs de A e B, serviços por onda, CI, duração medida, backups privados de Postgres/R2 e recuperação ensaiada. Reconsultar deployments e journals. Registrar início da janela já autorizada.
2. Suspender os gatilhos automáticos que possam antecipar serviços; congelar merges em main durante a sequência. O workflow atual resolve main no momento da execução. Usar CSV por onda; nunca `services=all` nesta promoção.
3. Configurar `RELEASE_MAINTENANCE_MODE=full` em Members, Hub, Admin, Community e Kids; Members também recebe `RELEASE_SCHEMA_STAGE=hold`. Publicar A nesses cinco serviços sem migrar o banco. Conferir a barreira de processo, retirar pods antigos, drenar uploads e fazer backup final. Preservar callbacks e ampliar temporariamente a margem de reenvio das entregas financeiras.
4. Alterar Members para `RELEASE_SCHEMA_STAGE=apply` e redeployar o mesmo SHA A. Conferir migrations até `0090`, preservação de `support_block_ids` e compatibilidade com os leitores antigos. Os cinco serviços continuam em manutenção até concluir B e a conversão.
5. Na janela de manutenção completa, aplicar B e publicar os novos consumidores na ordem de dependências definida no plano. Conferir cada SHA, `SUCCESS` e health. Não servir livros transformados ao frontend antigo.
6. Com schema B e código candidato ativos, executar dry-run/aplicação/verificação do backfill de materiais e conferir as bases dos rascunhos como previsto no plano. O reparo histórico `drafts:rebase-revisions` não faz parte automática desta B; sua montagem de blocos/anexos está defasada para Livro 3D/caderno. Não sobrescrever conflitos reais nem substituir cursos existentes. A publicação adicional de Cadê Todo Mundo? é uma operação separada, por slug, com prévia e validação de assets.
7. Executar o preflight, capturar o corpus final, gerar plano, simular e conferir tipos/comparações remotas. Só aplicar com relatório sem pendências, backup pronto e SHA completo conferido em Members e Kids. Comandos no [README do conversor](../../packages/studio/scripts/project-migrations/README.md).
8. Recapturar em diretório novo: a segunda migração deve ficar vazia. Testar os jogos do mural, editar/salvar/remixar, entregas anteriores, aulas legadas, quiz separado, progresso, anexos/PDF e publicação/desfazer no Admin. Testar a autorização de anexos pelo Hub na nova interface; a prova de infraestrutura não substitui esse smoke autenticado.
9. Conferir o aviso dispensável uma vez por visita e Como fazer. Reabrir somente com os critérios de aceitação do plano atendidos; retomar jobs e gatilhos e acompanhar erros/filas.

## Revalidação de mídia

Somente leitura, a partir de `packages/admin`:

```powershell
$env:R2_PUBLIC_URL = 'https://cdn.sistemazero.com.br'
$env:R2_CORS_PROBE_ORIGIN = 'https://kids.sistemazero.com.br'
bun scripts/r2-cors-public-check.ts
```

Repita com `https://comunidade.sistemazero.com.br`. O script `r2-cors-public.ts` gerencia a regra e o probe; mesmo `--check` escreve um objeto temporário. O script `r2-cors-admin-ugc.ts --origins=https://admin.sistemazero.com.br,https://admin-production-aeb0.up.railway.app` mostra a proposta sem gravar; `--apply` mescla e verifica. Executá-los com credenciais/buckets do destino conferido, sem expor segredos.

A política de CORS não torna o UGC público. As assinaturas e a autorização do Hub continuam obrigatórias. A [documentação do Cloudflare](https://developers.cloudflare.com/r2/buckets/cors/) explica também a propagação e a necessidade de invalidar cache quando objetos já armazenados no CDN mantiverem headers antigos; a prova atual incluiu objeto existente sem cache-busting.

## Parada e recuperação

- Schema, SHA, bucket, integridade ou revisão divergente: parar antes de promover. Nenhum erro vira permissão para editar o journal ou ignorar uma fonte ausente.
- Falha parcial do conversor: preservar corpus/plano e backups; retomar o mesmo lote ou executar `rollback` antes de novas edições. A recuperação conserva IDs e cria revisões novas; recusa trabalho concorrente.
- Rollback do código não reverte banco nem objetos. Depois da B, o código antigo não é uma recuperação válida sem restauração coordenada e testada dos contratos/dados.
- Preservar backups fora do Git e do cleanup. Evidências locais desta correção: `.cache/production-readiness-2026-09-27/` (`cors-before-fix.json`, resultados de CORS e `admin-r2-verified.json`). Esses arquivos não substituem o backup durável da janela.
