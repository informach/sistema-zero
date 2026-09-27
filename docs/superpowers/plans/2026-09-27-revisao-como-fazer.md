# Revisão e publicação do Como fazer

> Execução nesta sessão com `executing-plans`, dentro da revisão e publicação já autorizadas pelo usuário.

**Objetivo:** conferir todos os tutoriais com o código atual, corrigir os caminhos e a linguagem, preencher lacunas relevantes e publicar o lote em staging e produção.

**Arquitetura:** manter `docs/como-fazer/como-fazer.json` como fonte editorial. Usar o validador de `core/help` e o serviço real de Members para publicar por slug, preservando IDs, links e dados externos à ajuda. Guardar o conteúdo anterior e conferir revisões antes de escrever.

**Tecnologias:** JSON editorial, TypeScript/Bun, HelpService, Drizzle/Postgres e transporte operacional do Railway.

**Requisitos:** linguagem infantil simples e natural; sem travessões; nomes e passos iguais aos da interface; sem etapas implícitas; instruções de salvar, confirmar e voltar quando necessárias. Publicação dos tutoriais nos dois ambientes sem redeploy de aplicativos.

- [x] Capturar coleções, rascunhos e publicações atuais dos dois ambientes e conferir suas versões de código.
- [x] Revisar os 24 tutoriais por coleção: Plataforma, Estúdio, Pinta e Pensa. Mapear cada ação ao componente/rota que a implementa.
- [x] Identificar tarefas ausentes com foco em navegação, seções, entregas, arquivos, recuperação/salvamento, mural e ferramentas, incluindo Molda se houver um fluxo acessível que precise de orientação.
- [x] Reescrever o lote e atualizar `docs/como-fazer/README.md`; registrar achados e fontes em `docs/como-fazer/REVISAO-2026-09-27.md`.
- [x] Executar `bun docs/como-fazer/validar.ts`, conferir links e referências, ausência de travessões e leitura editorial completa do resultado.
- [x] Preparar um plano de diferenças por slug para cada ambiente, preservando mídias e edições existentes que não pertençam ao lote. Publicar pelo HelpService em transação, com comparação do snapshot capturado.
- [x] Publicar em staging e conferir o conteúdo efetivamente publicado, a leitura pública da ajuda e a busca do Zappy. Depois repetir em produção e comparar os dois ambientes com o lote validado.
- [x] Registrar quantidade de tutoriais revisados/criados e os comprovantes de publicação. Manter backups privados e alterações editoriais versionadas.
