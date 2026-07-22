# Full review da Carreira do Criador e do modo Pro

**Data:** 22/07/2026  
**Escopo:** alteração consolidada no commit `41ae52ab`, com foco em `core`, `members`, `member-shell`, `community-kids`, `studio`, `studio-runtime` e `admin`.  
**Tipo de revisão:** arquitetura, regras de domínio, autorização, persistência, experiência do aluno, autoria, runtime, testes e documentação.  
**Mudanças no produto durante a revisão:** nenhuma.

> **Status após a correção, em 22/07/2026:** todos os achados de implementação e
> documentação deste relatório foram corrigidos. A autoria Pro ganhou seletor e
> preview remoto no Admin; projetos com extensões futuras ficam preservados e
> bloqueados; o 423 tem tela amigável; o corpo do BFF é limitado pelo stream; a
> imagem usa lockfile e `npm ci`; o banco recebeu normalização e constraint; a
> prontidão pagina até o fim; contratos residuais foram removidos; e o manual
> `docs/carreira-do-criador.md` passou a ser a referência operacional. O texto
> abaixo permanece como registro histórico do estado encontrado na revisão.

## Resumo executivo

A nova estrutura da carreira está conceitualmente correta e muito mais sólida que a regra anterior baseada apenas em contagens. O catálogo central define posições exatas, exige conclusão e publicação, separa cursos bônus e aplica a regra de aprender primeiro para liberar depois. O modo Pro também está corretamente restrito à Lenda no código.

O conjunto ainda não está pronto para lançamento sem ajustes. Foram encontrados dois problemas de alta prioridade:

1. O painel administrativo não oferece um caminho funcional para criar e pré-visualizar uma aula Pro.
2. A trava de ferramentas por carreira pode ser contornada por um projeto importado ou antigo que já declare uma extensão ainda bloqueada.

Também há um defeito de navegação em cursos de etapas futuras, riscos menores na borda do runtime e documentação materialmente desatualizada. A documentação atual não pode ser usada como referência confiável da carreira nem do modo Pro.

## O que ficou bem resolvido

- A fonte técnica da carreira foi centralizada em `packages/core/src/career/catalog.ts`.
- Os 31 cursos obrigatórios são identificados por etapa e posição exata. Curso bônus e posição repetida não substituem requisito.
- O nível é derivado da interseção entre `course_complete` e `course_showcased`.
- O snapshot do nível, eixo e posição evita que uma alteração posterior no curso rebaixe quem já conquistou o marco.
- A matrícula comercial e a trava pedagógica são regras separadas.
- O acesso direto aos cursos passa por `CheckAccessService`, inclusive nos endpoints auxiliares.
- O comportamento falha fechado quando o nível é desconhecido.
- A equipe interna tem um bypass explícito e limitado por papel.
- O Estúdio livre começa no Construtor, a Ponte começa no Mestre dos Jogos e o Pro começa apenas na Lenda.
- A rota local do Pro é isolada em `/estudio/pro/[id]`, com COOP, COEP e CSP próprios.
- As atividades Pro das aulas usam um BFF autenticado e um runtime remoto isolado.
- O runtime recria `package.json` e `vite.config`, não aceita comandos nem dependências enviados pela criança, desliga a internet, limita arquivos e executa o resultado em iframe sem `allow-same-origin`.

## Achados de alta prioridade

### 1. A autoria de aulas Pro não está funcional

**Severidade:** alta  
**Confiança:** alta

O editor de aula sempre monta o Estúdio com `professional: false` e `terminal: false` em `packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx:1127`. Quando não existe projeto inicial, `packages/admin/src/components/studio/studio-embed.tsx:45` cria somente um projeto clássico.

Não existe seletor de template Pro, botão de promoção ou importação de um projeto Pro nessa interface. Portanto, o fluxo normal do painel não consegue criar a atividade Pro que o aluno deveria fazer antes de virar Lenda.

Mesmo que um projeto Pro seja inserido por API ou por manipulação manual do JSON, a pré-visualização no Admin tenta usar o WebContainer local. O Admin mantém COEP desligado de propósito em `packages/admin/next.config.ts:69`, e o `StudioEmbed` não recebe o adapter remoto usado nas aulas. Na prática, a prévia Pro não tem um ambiente compatível.

O backend também aceita `initialProject` como JSON praticamente opaco e não valida se `proMeta.templateId` pertence aos cinco templates suportados. Uma atividade com template inválido ou obsoleto pode ser publicada e só falhar para a criança na compilação.

**Impacto:** os cursos que deveriam ensinar o modo Pro não podem ser produzidos e revisados pelo fluxo oficial do painel.

**Recomendação:** criar um fluxo explícito de autoria Pro no Admin, com seletor dos cinco templates, criação do projeto inicial, validação server-side do template e preview remoto. O preview pode usar um BFF administrativo para o mesmo runtime isolado. Não é adequado ativar COEP em todo o Admin, porque isso afetaria os players e imagens cross-origin da autoria.

### 2. Extensões bloqueadas continuam ativas em projetos importados ou antigos

**Severidade:** alta  
**Confiança:** alta

O botão de importação apenas avisa quando o projeto usa ferramentas ainda não liberadas e preserva essas extensões em `packages/studio/src/components/projects/ImportButton.tsx:54`.

O painel de extensões mantém qualquer extensão já instalada visível, mesmo que esteja fora de `allowExtensions`, em `packages/studio/src/components/extensions/ExtensionsPanel.tsx:194`. Em seguida, `packages/studio/src/components/blocks/BlocklyPanel.tsx:382` registra todas as extensões declaradas no projeto. O preview também monta os runtimes com base em `installedExtensions`.

Isso permite importar um JSON com uma extensão oficial de uma etapa futura e usar os blocos e o runtime antes de conquistar o nível. O aviso é amigável, mas a trava atual é apenas de apresentação.

**Impacto:** a criança pode contornar a progressão pedagógica que a carreira foi criada para garantir.

**Recomendação:** separar extensões preservadas de extensões ativas. O projeto pode manter os metadados e os blocos bloqueados para não perder conteúdo, mas toolbox, registro Blockly, geração e runtime devem receber somente a interseção entre `installedExtensions` e a permissão da carreira. A interface deve explicar que aquela parte volta a funcionar quando a ferramenta for conquistada.

## Achados de prioridade média

### 3. Curso de etapa futura pode levar a uma página de erro

**Severidade:** média  
**Confiança:** alta

`careerLocksForCourses` anexa o curso-base da própria etapa a qualquer curso bloqueado em `packages/members/src/application/career-course-locking/career-course-locking.ts:33`, inclusive quando o motivo é `future-tier`.

Os cards transformam qualquer trava que tenha `foundationCourseSlug` em link, por exemplo em `packages/community-kids/src/components/kids/catalog-course-card.tsx:118`. Só que o curso-base de uma etapa futura também está bloqueado. Ao abrir, o members devolve 423 e a página do curso não trata esse status. Ela lança um erro genérico em `packages/community-kids/src/app/(app)/cursos/[slug]/page.tsx:33`.

**Recomendação:** fornecer `foundationCourseSlug` somente para `foundation-first`. Cursos de etapa futura devem ficar sem link ou apontar para o próximo curso realmente disponível. A página de curso também deve tratar `COURSE_CAREER_LOCKED` de forma amigável para acesso direto por URL.

### 4. O limite de corpo do BFF Pro depende de `Content-Length`

**Severidade:** média  
**Confiança:** alta

`packages/community-kids/src/app/api/studio/pro-runtime/build/route.ts:35` rejeita o tamanho pelo header e depois executa `request.json()` em `:43`. Uma requisição autenticada sem `Content-Length`, por exemplo com transferência em chunks, passa pela validação local e é materializada inteira na memória.

O Worker aplica limites depois, mas o custo no BFF já aconteceu.

**Recomendação:** ler o stream com um contador de bytes e interromper acima do teto antes de fazer `JSON.parse`.

### 5. A imagem do runtime não é reproduzível

**Severidade:** média  
**Confiança:** alta

`packages/studio-runtime/Dockerfile:7` copia apenas `runtime/package.json` e usa `npm install` em `:8`. As versões diretas estão fixas, porém as dependências transitivas podem mudar entre builds.

**Recomendação:** versionar o lockfile específico da imagem e usar `npm ci --ignore-scripts`.

### 6. O banco aceita estados que o domínio rejeita

**Severidade:** média  
**Confiança:** alta

A migration `packages/members/src/infrastructure/persistence/drizzle/migrations/0047_panoramic_jack_power.sql:4` garante apenas a faixa de 1 a 6. Ela não impede `career_slot` em curso adulto e não limita as demais etapas a 1 até 5.

O serviço de domínio faz essas validações corretamente, mas carga manual, seed ou operação direta pode gravar um estado inválido.

**Recomendação:** espelhar no CHECK do Postgres as duas invariantes: somente audiência Kids pode ter posição e apenas Iniciante 2D aceita posição 6.

### 7. A prontidão da carreira no Admin consulta somente 100 cursos

**Severidade:** baixa a média  
**Confiança:** alta

`packages/admin/src/app/admin/membros/cursos/courses-client.tsx:116` carrega a auditoria com `limit=100&offset=0`. Se o catálogo Kids passar de 100 cursos, uma posição obrigatória que esteja fora da primeira página será mostrada como ausente.

**Recomendação:** paginar até o fim ou criar um endpoint dedicado que devolva apenas as 31 posições e seus estados.

## Código residual e sinais de deriva

- `CREATOR_CAREER_VERSION` é exportado em `packages/core/src/career/catalog.ts:7`, mas não é persistido, exposto ou consumido.
- Os ids `studio.blocks.avancado-3d` e `studio.bridge` estão na união de recompensas, mas nenhum nível os usa diretamente.
- `SANDBOX_TRANSPORT` está definido em `packages/studio-runtime/wrangler.jsonc`, mas o código fixa `transport: 'rpc'` e não lê a variável.
- Comentários em `gamification.repository.ts` ainda mencionam `countDistinct`, embora a consulta atual agrupe as posições.
- O comentário público de `StudioFeatures.professional` ainda diz que o recurso força Código e Terminal. A implementação atual permite `terminal: false` para o runtime remoto e decide os modos pelo tipo do projeto.

Esses itens não quebram o fluxo principal, mas mostram que o contrato versionado e a implementação já começaram a divergir.

## Auditoria da documentação

### Parecer

A documentação não está atualizada o suficiente para operar ou evoluir a nova carreira e o modo Pro com segurança.

| Documento | Estado | Problema principal |
|---|---|---|
| `packages/members/CLAUDE.md` | desatualizado | Ainda descreve carreira por contagem, “1 qualquer”, métodos `countQualifying...` e não documenta posições exatas nem a migration 0047. |
| `packages/member-shell/CLAUDE.md` | incorreto | Diz que o Pro abre no Gênio e na Lenda. O código e a decisão de produto liberam somente na Lenda. |
| `packages/studio/docs/embedding.md` | desatualizado | Descreve somente WebContainer local, afirma coerções antigas e lista apenas três templates. Hoje existem cinco e as aulas usam runtime remoto. |
| `packages/studio/CLAUDE.md` | incompleto | Descreve `ProPreview` como WebContainer e não explica `RemoteProPreview`, `proRuntime` ou a diferença entre aula e Estúdio livre. |
| `packages/admin/CLAUDE.md` | incompleto e otimista | Não documenta `careerSlot`, as 31 posições, o painel de prontidão nem o fato de a autoria Pro ainda não existir. |
| `packages/community-kids/CLAUDE.md` | incompleto | Menciona o gate por rank, mas não registra a matriz completa de recompensas, as travas de curso e o runtime Pro das aulas. |
| `packages/studio-runtime/README.md` | insuficiente | Não traz contrato completo do endpoint, cinco templates, códigos de erro, limites, deploy, rotação de segredo, observabilidade, smoke test e rollback. |
| `README.md` | incompleto | Não lista `@sistemazero/studio-runtime` na tabela de pacotes e não aponta para um manual da Carreira do Criador. |

### Documentação que precisa existir

1. Um manual mestre da Carreira do Criador, ligado no README raiz.
2. A tabela dos oito níveis, requisitos exatos, 31 posições e recompensa de Estúdio de cada nível.
3. A regra de curso-base, etapa futura, curso bônus, matrícula e bypass de equipe.
4. O fluxo “aprender na aula, liberar no Estúdio livre depois”.
5. Um documento do modo Pro separando claramente aula Pro remota e Estúdio Pro local.
6. Um runbook do `studio-runtime` com ambientes, secrets, deploy, health check, métricas, alertas, smoke test e rollback.
7. Um guia de autoria Pro no Admin, depois que o fluxo for implementado.
8. Um checklist de lançamento com migration 0047, preenchimento das 31 posições, validação do painel e testes de acesso direto.

## Lacunas de testes

Os testes atuais validam bem as funções puras, os requisitos por posição, o gate do members, o mapeamento do Estúdio, a conversão para Pro, os templates e o preview remoto isolado. Ainda faltam testes para os fluxos que apresentaram risco:

1. Criar e pré-visualizar uma aula Pro no Admin.
2. Validar template Pro conhecido ao salvar o bloco.
3. Importar projeto com extensão futura e provar que ela fica inativa até o nível correto.
4. Abrir card de curso de etapa futura e receber uma tela amigável.
5. Enviar corpo acima do limite sem `Content-Length` ao BFF.
6. Testar o handler completo do Worker, incluindo token, rate limit, timeout, falha do Sandbox e cleanup.
7. Testar o BFF de ponta a ponta com sessão, acesso à aula, template autorado e resposta do runtime.
8. Testar a prontidão do Admin com mais de 100 cursos Kids.
9. Testar a abertura de projeto Pro criado, importado e existente na rota isolada `/estudio/pro/[id]`.

## Verificação executada

Foram executados 153 testes focados, todos aprovados:

- Core da carreira: 9 testes.
- Mapeamento de nível para Estúdio: 11 testes.
- Acesso pedagógico dos cursos: 4 testes.
- Integridade de conteúdo e gamificação: 81 testes.
- Contratos do runtime: 4 testes.
- Perfis de blocos, conversão Pro, extensões, importação, preview remoto e templates: 44 testes.

Também foi executado `tsc --noEmit` com sucesso nos sete pacotes afetados: `core`, `members`, `member-shell`, `studio`, `studio-runtime`, `community-kids` e `admin`.

Um primeiro comando dos testes de componentes do Estúdio foi iniciado na raiz e falhou porque o Bun não carregou o `bunfig.toml` e o preload de `happy-dom` do pacote. O mesmo conjunto foi repetido no diretório correto de `packages/studio` e terminou com 44 aprovações e nenhuma falha.

## Ordem recomendada de implementação

1. Fechar o desvio das extensões bloqueadas.
2. Implementar autoria, validação e preview remoto de aulas Pro no Admin.
3. Corrigir a navegação e o tratamento de 423 nos cursos da carreira.
4. Endurecer o limite de corpo do BFF e tornar a imagem do runtime reproduzível.
5. Reforçar as constraints do banco e corrigir a paginação da prontidão.
6. Criar os testes de integração que faltam.
7. Atualizar a documentação e publicar um manual mestre antes de liberar o Estúdio Completo.

## Conclusão

A carreira está bem desenhada no núcleo e segue a intenção pedagógica definida. O lançamento deve aguardar a correção dos dois achados de alta prioridade e a atualização da documentação. Sem isso, a progressão pode ser contornada e não existe um caminho oficial para produzir os cursos Pro que justificam a liberação final da Lenda.
