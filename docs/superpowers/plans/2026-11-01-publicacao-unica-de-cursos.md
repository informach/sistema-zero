# Publicação única de cursos e navegação adulta consistente

## Pedido aprovado

A equipe cadastra o curso uma vez no Kids de staging. A promoção prepara e publica o curso Kids em produção com mídias próprias de produção. A cópia entre públicos usa Kids de staging para adulto de staging e Kids de produção para adulto de produção. Criar o destino ausente e atualizar o existente, preservando sua identidade e o progresso. Oferecer as operações no Admin, com ações compactas e acessíveis. O menu principal adulto deve ser idêntico dentro e fora da aula.

Não executar uma promoção real de staging para produção apenas para desenvolver a funcionalidade: o Kids de produção de Cadê Todo Mundo recebeu um PDF novo durante a tarefa anterior e pode ser mais recente que o staging. O fluxo precisa estar implementado e verificável antes de escolher um curso para essa promoção.

## Base entregue

Commit local `e7bdfd23d`, no staging, entrega o sincronizador Kids para adulto, preserva IDs, publica por transação e prepara áudio e Vimeo no Admin de cada ambiente. Cadê Todo Mundo já foi sincronizado nos dois ambientes, incluindo o PDF novo em produção. Guia e evidências em `docs/operations/sincronizar-curso-kids-adulto.md` e `docs/qa/2026-11-01-sincronizacao-cade-adulto.md`. A versão inicial exige destino existente e usa SSH operacional. Essa limitação precisa ser removida, e a aplicação web não deve executar Railway CLI nem comandos de shell.

## Decisões de arquitetura

- Reutilizar a regra de cópia e os publicadores canônicos, com contrato puro compartilhado. A origem é o conteúdo publicado; rascunho diferente bloqueia. Criar curso ausente numa transação, sem apagar dados existentes.
- A promoção entre ambientes é uma operação distinta da cópia entre públicos. URLs e IDs de mídia não podem simplesmente ser trocados por texto. Fazer inventário tipado das referências e das dependências dos pacotes ediSVG, remapear anexos, exemplos e referências internas.
- O Admin de origem autentica a equipe e apresenta a prévia. Nenhuma credencial de produção chega ao navegador. Os destinos são configuração do servidor, nunca URLs fornecidas pelo cliente. Portas S2S específicas, com tokens próprios, identidade de ambiente e operações limitadas a publicação de cursos.
- Trabalhos persistidos, com progresso, etapas, lease, retomada e chaves de idempotência por recurso. Vídeos podem levar minutos para processar; não amarrar a conclusão a uma requisição HTTP nem a um `after()` sem persistência. Reutilizar o padrão de trabalho durável existente no Members; o processador de mídia é do Admin e pode operar como worker separado sem mudar os contratos.
- R2: copiar para os buckets público e privado de produção, conferir tamanho e conteúdo, manter mapa de origem e destino e evitar duplicação. Links `r2priv:` passam a usar as chaves de produção. Arquivos ediSVG precisam de todos os arquivos do pacote, incluindo poster e dependências. Bytes binários não passam pela memória inteira do navegador ou pelo corpo JSON de um pedido.
- Vimeo: validar a API oficial e as permissões atuais antes de implementar a transferência. Criar o vídeo na pasta de produção, aplicar domínios de embed e privacidade, aguardar disponibilidade, reaproveitar a transferência confirmada em tentativas seguintes e tratar resposta incerta sem criar duplicatas. Legendas e capas precisam seguir o vídeo de destino.
- Voz: gerar ou reaproveitar no cache oficial do Admin de produção, com o perfil de voz de produção. Não levar URLs de áudio de teste para a versão publicada.
- Preparar tudo antes da troca do curso. Erro de mídia conserva o curso publicado anterior. A publicação final usa comparação de revisões e transação do Members, seguida de leitura independente e recibo.
- Na lista do Admin, ícones com tooltip e nome acessível para abrir e editar; operações de promover, copiar e excluir em Mais ações. Informar explicitamente ambiente e público no diálogo, com progresso e resultado. Não depender de hover para explicar uma operação no celular.

## Lotes e verificações

- [x] Corrigir o menu adulto por uma delimitação de tema no componente compartilhado. Reproduzir a perda de tokens de marca na aula, provar igualdade visual com e sem aula e preservar o tema Kids no conteúdo. Correção local, ainda não implantada.
- [x] Criar o curso adulto ausente no sincronizador, com identidade determinística, plano estável, rollback e testes de repetição. Não clonar um curso novo a cada operação. Verificado no Postgres descartável.
- [x] Substituir a grade ativa inteira, arquivando excedentes sem apagar conclusões ou progresso. Recuperar a identidade se uma aula voltar. Testes reais de retirada, restauração, contagem e rollback no Postgres local. Migration 0145 apenas local durante desenvolvimento.
- [x] Inventariar referências reais de mídia, configuração de buckets/pastas e contratos de ediSVG. Confirmar a API Vimeo por prova real. Inventário e remapeamento explícito no core, cópia R2 versionada no Admin, com qualificação real dos dois pares de buckets. Isso ainda não entrega o worker completo.
- [ ] Extrair contratos e regra de sincronização para uso de serviço, CLI e worker. Rotas de equipe e S2S com validação e autorização. Testar destinatário errado, origem alterada, links de teste remanescentes e mídias incompletas.
  - Regra de cópia extraída para `members/src/domain/course-publication/course-sync.ts`, sem Drizzle. Executor e conhecimento em `infrastructure/persistence/drizzle/course-sync.ts` e `course-knowledge-sync.ts`. O executor recebe parser canônico e política, sem importar a camada HTTP. A entrada Railway só compõe as dependências. Os 24 testes reais do sincronizador e seu bundle passaram; as rotas e o worker ainda não existem.
  - Revisão da extração corrigiu a ordem de publicação: o planejador ordena por módulo e aula, sem depender da ordem de UUIDs do inventário. Teste causal com inventário invertido falhou antes e passou depois; módulo de origem ausente é recusado. A ordem é importante para as dependências entre aulas.
- [ ] Persistir trabalhos e recursos de transferência, implementar processador com retomada e cancelamento antes da publicação. Migrações somente em banco local descartável durante desenvolvimento.
  - Base do registro implementada: migration 0146, contratos públicos sem captura ou token, criação idempotente, aprovação por versão e hash, posse pelo relógio do Postgres, tarefas em lote, cancelamento e publicação atômica do curso com o trabalho. Duas conexões reais provaram a posse exclusiva; processo antigo não escreve após expiração ou cancelamento. Falta ligar o worker e suas rotas. Evidência em `docs/qa/2026-11-01-publicacao-trabalhos.md`.
- [ ] Implementar cópia R2 e Vimeo, geração de voz, referências e preparação de exemplos. Testes causais de repetição, resposta incerta, checksum, falha de transcode e retomada após reinício.
- [ ] Interface de prévia, início e acompanhamento no Admin. Testes reais locais em computador e celular emulado, incluindo teclado, tooltips e mensagens de erro.
- [ ] CLI de promoção e comandos reutilizáveis sobre o mesmo mecanismo, sem uma segunda cópia das regras.
- [ ] Revisão completa, testes adequados dos pacotes, typecheck, lint, conferência de configuração e documentação operacional. Integrar em staging local e enviar a versão revista.

## Diagnóstico do menu

`CommunitySidebar` já é o mesmo componente nas rotas, mas `packages/ui/scripts/lesson-theme.mjs` desativa todo o tema adulto quando encontra `.sz-lesson-ui` na página. Isso remove os tokens `--topo`, `--texto-claro` e `--logo-zero-*` do menu. A classe `kids-menu` ainda faz o menu adulto receber regras visuais Kids. Corrigir a origem do escopo, usando os tokens e regras canônicos adultos numa ilha de tema para a navegação, sem copiar cores ou criar outro menu. Manter o recolhimento da aula e os ganchos estruturais do rodapé separados da identidade visual.

## Requisitos adicionais confirmados

- A grade de origem substitui a grade ativa do destino inteira. Não basta acrescentar ou atualizar as aulas correspondentes: módulos e aulas excedentes saem da navegação e da consulta do Zappy. Usar o mesmo princípio de arquivamento dos blocos para preservar registros históricos e conquistas, sem manter duas grades ativas. Preservar os IDs correspondentes e apresentar criações, mudanças e retiradas na prévia. O bloqueio inicial do sincronizador para aulas excedentes deve ser substituído por essa operação completa.
- Transcrições, PDFs do passo a passo marcados para o tutor e textos publicados devem estar prontos e vinculados às revisões certas. Ausência de índice nunca pode ser confundida com sucesso. O publicador deve instalar os extratos didáticos preparados e retirar os antigos na mesma transação da nova grade. Não copiar conversas, tentativas de alunos ou gabaritos para a base de conhecimento.
- O sincronizador local já recusa material do tutor ausente/desatualizado e repara um índice adulto perdido sem republicar o curso. A preparação automática desses materiais no novo fluxo web ainda precisa ser implementada.

## Infraestrutura e API verificadas

Leitura de configuração em 01/11/2026, sem exposição de credenciais:

| Destino | Staging | Produção |
| --- | --- | --- |
| R2 público | testes | comunidade-sistema-zero |
| R2 privado | testes-privado | comunidade-sistema-zero-privado |
| Vimeo, pasta | 29469881 | 29469887 |

Os dois ambientes usam a mesma conta R2 e a mesma conta Vimeo. Ambos os tokens Vimeo têm `create` e `video_files`. Confirmar as permissões de cópia R2 antes de usar o adapter.

A API oficial agora permite [copiar o vídeo atual](https://developer.vimeo.com/api/reference/videos#copy_video), por `POST /me/videos/{video_id}/copy`, com `name` de até 128 caracteres e escopo `create`. Preferir esse mecanismo a baixar e recodificar. Qualificação real na pasta de testes: cópia nova disponível, mesma resolução 1920×1080 e duração de 56 segundos, cinco representações com tamanhos idênticos e a mesma quantidade de faixas de texto. O vídeo original não mudou e a cópia de teste foi excluída. Recibo privado em `.cache/course-audience-sync/vimeo-copy-qualification.log`. Não confundir essa prova de API com uma promoção completa de curso.

## Worker e fronteiras

O worker durável será do Members, seguindo seus padrões de lease e composição. Ele chama uma porta S2S específica de mídia no Admin, onde já estão R2, Vimeo e ElevenLabs. Não importa código do Admin nem executa shell. Cada chamada de mídia é limitada; o estado de cada recurso é salvo entre chamadas. O navegador acompanha o trabalho, mas fechá-lo não interrompe a publicação. Isso evita depender do `instrumentation.register` do Next, que o launcher atual documenta não ser um boot confiável em produção, e não exige empacotar outro servidor Next.

Separar as credenciais do worker local das credenciais de delegação entre ambientes. Rotas peer só exportam trabalhos aprovados e criam destinos a partir desses trabalhos; não são uma porta genérica de edição administrativa. Produção recebe sua própria preparação de mídia e publica seu próprio curso. A cópia para adulto em produção parte do Kids de produção, inclusive quando executada após uma promoção.

## Base de transferência R2 implementada

`packages/core/src/course/publication-media.ts` inventaria e remapeia referências explícitas, agrupa aliases do mesmo recurso, preserva opções do Vimeo e recusa referências de origem remanescentes. O inventário entra no recibo privado do operador. `packages/admin/src/server/course-object-copy.ts` e o adapter R2 fazem a cópia condicional com destinos derivados da versão, reconciliando resposta perdida. Qualificação real do adapter, pública e privada, com payloads temporários de 68 bytes, bytes idênticos, recusa de ETag errado e limpeza confirmada. Evidência e limites em `docs/qa/2026-11-01-promocao-midias.md`. Nenhum curso foi promovido para desenvolver essa base.
