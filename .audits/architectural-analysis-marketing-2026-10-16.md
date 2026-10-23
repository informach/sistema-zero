# Marketing — segunda revisão integral para staging local

## Escopo e critério

Base `d8271493d`, em `feat/marketing-desktop-operational-review`, checkout isolado `sistema-zero-marketing`. Revisão das decisões e do fluxo L0–L10, das fronteiras entre contratos, servidor, web e Electron, dos caminhos de recuperação, das alterações anteriores e das provas registradas. A matriz de implementação e critérios operacionais permanece na [revisão integrada](marketing-full-review-2026-10-16.md). Esta rodada não transforma evidência automatizada em piloto físico nem autoriza publicação social.

Aplicadas `architectural-analysis`, `no-workarounds`, `systematic-debugging` e `verification-before-completion`. Busca de referências, leitura dos caminhos críticos e regressão de todos os pacotes envolvidos; não foi uma leitura manual de cada linha do monorepositório. Nenhum Docker, push, deploy ou inferência paga adicional. PostgreSQL 16 nativo, bancos exclusivos de testes, acervo conectado preservado.

## Achados corrigidos

| Achado | Causa e correção | Prova |
| --- | --- | --- |
| R1 — reenvio web permanentemente preso à rejeição | A identidade persistida por hash era reutilizada mesmo depois de o servidor recusar o objeto. Selecionar novamente o original agora cria uma nova identidade durável apenas após confirmar a rejeição anterior. Mantém o registro recusado; falha de rede/transferência incompleta conserva a identidade existente. | `browser-upload.test.ts`: falha reproduzida antes da correção, recuperação com dois IDs/operações e um único hash; nova seleção reutiliza o resultado confirmado. |
| R2 — biblioteca perdia páginas, escondia upload e não se recuperava da rede | O acompanhamento recarregava somente os primeiros 50 UUIDs. Um novo arquivo podia estar em outra página; erro de leitura substituía a lista por vazio. A biblioteca passa a acompanhar os IDs pendentes por consulta de estado em lotes de até 100, sem acessar o armazenamento multipart. Preserva páginas/cursor durante a conferência, inclui imediatamente o arquivo recebido e retenta a leitura após falha sem reenviar bytes. Leitura antiga não sobrescreve uma ação mais recente; projeção local atrasada não rebaixa uma confirmação remota. | UI real compartilhada em Chromium: baseline falha, versão corrigida mantém 52 arquivos e confirma após uma falha de rede. Testes cobrem 201 pendências em três consultas, isolamento de contexto, estados terminais e cursor. Endpoint real Elysia + PostgreSQL: leitura autorizada, revogação e exclusão de IDs de outro projeto. |
| R3 — SQLite dizia “verificando” após uma recusa na finalização | O adaptador nativo mapeava qualquer resposta diferente de `confirmed` para `verifying`. Agora conserva o estado e o erro retornados pelo servidor. | Regressão no adaptador real e SQLite: antes `verifying`, depois `failed` e motivo preservado; retomada sem repetir partes continua passando. |
| R4 — assinatura não identificava a versão escolhida antes de instalar | O updater conferia novamente o publicador, mas não a identidade do manifesto depois do download. Agora reconfere tamanho/SHA-512 e assinatura, inclusive depois de encerrar os produtores e antes de iniciar a instalação. Arquivo removido, modificado, truncado ou diferente assinado pelo mesmo publicador é recusado. | Teste de substituição com verificador de assinatura controlado, truncamento, publicador errado e alteração durante a verificação. Verificador Authenticode real e regras de manifesto continuam cobertos pelas provas anteriores. |

Os quatro achados foram corrigidos na origem. Sem aumentar timeout de testes, remover validação, suprimir erro, alterar originais, mudar aprovação ou adicionar fallback para API paga. A consulta de estado é aditiva; implantar o servidor antes dos novos clientes. Nenhuma migração de dados foi necessária.

## Revisão das fronteiras e do fluxo

| Área | Verificação desta rodada |
| --- | --- |
| Identidade e colaboração | Sessão web canônica por requisição, cache desktop só de emissão com revogação na borda; escopo por conta/origem, acesso por projeto e autoria resolvida no servidor. Regressão Auth/Gateway e testes de concorrência/revogação. |
| Contexto e edição | Direção/fontes/revisões de origem, limites de seleção e proteção, resultado tipado por capacidade, aplicação transacional, alternativas, CAS e Desfazer. Contexto de análise e próxima pauta conservam a revisão de origem. |
| Execução com assinatura | Supervisor exige concessão e responsável; checkpoints/resultados são persistidos antes do envio; retomada não reinfere; cancelamento e recuperação têm persistência real. Nenhuma mudança de modalidade de assinatura nesta rodada. |
| Imagem e vídeo | Contratos e validadores de edição/captura/transcrição/Remotion; hashes de bundle e recibo, isolamento da composição e cache de trechos. Builds completos e regressão de preparação, codecs, cenas, efeitos, fontes, legendas e escopos. Provas visuais reais anteriores continuam identificadas, não alegadas como novas. |
| Arquivos e sincronização | Multipart/MD5/SHA, CORS, confirmação, projeções locais e exportação da edição exata; R1–R3 corrigidos. Limpeza exige confirmação remota exata e preserva pendências/originais; não ampliada nesta rodada. |
| Aprovação e distribuição | Edição imutável, revalidação no envio, idempotência/recuperação de entrega incerta, arquivo exato e descrições. Sem publicação real de teste. |
| Acervo e aprendizado | Importação/reconciliação e análise → hipótese/critério → próxima pauta; regressão dos pacotes de importação e do backend. Nenhuma recarga sobre arquivos que continuam mudando em outro trabalho. |
| Instalação e manutenção | Distribuidores fixados, downloads limitados/hash, extração sem caminhos ou links externos, instalação atômica, assinatura e encerramento de recursos. R4 corrigido; certificado/feed reais continuam um requisito de distribuição. |

Não encontrei código de produção comprovadamente morto que justificasse remoção, nem introduzi uma camada genérica de workflow. As provas de desenvolvimento têm entradas próprias e não foram tratadas como código morto por não aparecerem no fluxo cotidiano. Funções compartilhadas de estado e identidade de atualização concentram as invariantes alteradas. A dependência de desenvolvimento `@types/react-dom@19.2.3`, já usada no desktop, foi declarada na bancada para tipar a nova prova de renderer; nenhuma dependência de execução foi adicionada.

## Evidências novas

Logs na `.cache` da raiz, com prefixo `review2-`; JSON/screenshot da prova de UI em `packages/marketing-desktop/.cache/media-library-review`.

| Verificação | Resultado |
| --- | --- |
| Marketing completo, DB nativo | `review2-marketing`: 437 testes, 2.438 assertions, zero falhas/skips. |
| Endpoint/isolamento de arquivos após ampliar a prova HTTP | `review2-assets-http-pg`: 8 testes, 51 assertions, zero falhas. Sobreposição com a suíte completa. |
| Desktop Bun | `review2-desktop`: 95 testes, 1.936 assertions, zero falhas. |
| Persistência/supervisor Node/SQLite, estado final | `review2-sqlite-final`: 19 testes, zero falhas/skips. |
| Web, bancada, importação, produção e contratos | `review2-web-shared`: 155 testes, 620 assertions, zero falhas. |
| Gateway | `review2-gateway`: 248 testes, 790 assertions, zero falhas. |
| Auth completo, DB nativo, sem builds simultâneos | `review2-auth-serial`: 302 testes, 1.073 assertions, zero falhas/skips. |
| Migrações Auth | `review2-migrations`: guardas passaram. Nenhuma migração nova nesta rodada. |
| Tipos | `review2-backend-types`, `review2-desktop-types`, `review2-workbench-types-final`: código 0. |
| Builds completos | `review2-web-build` e `review2-desktop-build`: código 0; Electron inclui captura e composição Remotion. Aviso existente de tamanho do chunk Studio não foi suprimido. |
| Renderer final | `review2-media-ui-final`: código 0; 52 arquivos, duas consultas de estado (falha e recuperação), cache local atrasado não rebaixa a confirmação. |
| Higiene do diff | Biome passou nos 20 arquivos de código/configuração alterados ou novos; `git diff --check` passou. |

Falhas preservadas e investigadas: `review2-upload-red`, `review2-transfer-red`, `review2-update-red` e a baseline de UI reproduzem os achados. A primeira montagem do teste de renderer encontrou duas instâncias de React; o harness agora resolve uma única instância, como o build do aplicativo, sem mudar o produto para acomodar o teste. A primeira execução Auth durante builds simultâneos excedeu 5 s em hooks de preparação e teve efeitos subsequentes de fixture. A área isolada passou 27/27 em 4,83 s, e a suíte completa sem builds passou 302/302 em 10,77 s, conservando timeouts/asserções. Isso indica contenção do ambiente, não prova um defeito de autenticação. Os logs iniciais não são contabilizados como sucesso.

## Integração e limites

Commit e merge solicitados são locais. Preservar os arquivos de Studio e documentos paralelos no checkout `staging`; integrar qualquer avanço desse branch no checkout isolado antes do fast-forward. Não alterar ou publicar o acervo de produção.

Continuam abertos os critérios operacionais já registrados: certificado/feed/instalador reais, primeiro login de contas desconectadas, piloto em dois computadores, filmagem de celular com fala e continuidade de edição, recuperação na distribuição final e operação de backup remoto. Não são marcados concluídos por esta revisão. Não restou achado de código confirmado desta rodada sem correção.
