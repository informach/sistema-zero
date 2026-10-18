# Revisão: projetos na galeria e modelos 3D na oficina

## Escopo e resultado

A galeria oferece **Importar projeto** no cartão inferior para arquivos nativos do Molda
e pacotes ZIP. A importação de modelos externos permanece em **Trazer 3D**, dentro da
oficina. Foram revisados os componentes removidos, as referências compartilhadas, os
textos, a restauração, as permissões, a persistência e os testes dos dois fluxos.

Não restaram referências executáveis ao diálogo de importação de modelos da galeria.
A restauração continua criando cópias independentes, sem alterar os projetos existentes,
e preserva geometria, pintura e movimentos. Os painéis de modelos conservam revisão,
confirmação e desfazer. Os tokens e o desenho compartilhado da plataforma permanecem.

## Achados corrigidos

1. **Mensagem de tamanho incorreta:** o erro de restauração informava 32 MB, embora o
   limite atual seja 192 MiB. A mensagem agora deriva de `MAX_BACKUP_FILE_BYTES`, o
   mesmo contrato usado pelo leitor, sem aumentar os limites de entrada.
2. **Interferência entre testes do admin recebida de staging:** o CI remoto
   [39163502111](https://github.com/informach/sistema-zero/actions/runs/39163502111)
   falhou nos quatro testes de autoria Python. O visualizador de entregas deixava um
   mock global de `StudioEmbed` no processo. A ordem visualizador → autoria reproduziu
   as quatro falhas localmente; isolando os três cenários do visualizador em um processo
   próprio, a mesma ordem passou. Nenhuma regra de autorização nem asserção dos cenários
   existentes foi removida. O padrão de processo próprio já é usado pelos testes do admin.
3. **Propriedade global alterada por testes Python:** a execução remota
   [39164324612](https://github.com/informach/sistema-zero/actions/runs/39164324612)
   passou pelos pacotes, mas o Studio falhou ao coletar `gameStorage.test.ts`.
   Dois testes restauravam apenas o valor de `indexedDB`, deixando uma propriedade
   somente leitura que antes não existia. A restauração agora conserva o descritor
   completo ou remove a propriedade temporária quando originalmente ausente.
   A reprodução do descritor passou de 13 aprovados/1 falha para 14 aprovados/zero falhas.
4. **Dependência de tipos ausente em pacotes com processos Node:** a checagem ampla local
   identificou duas versões de `@types/node` na mesma compilação, resolvidas por Bun
   e JSON-RPC através de dependências transitivas. Isso apagava o método `on` do tipo
   do processo filho. Serviço de linguagem, Studio e Members agora declaram
   `@types/node` 24.19.0 diretamente, com
   lockfile atualizado. As três configurações de tipos do serviço passaram, sem casts,
   supressões ou alterações no comportamento do runtime.
5. **Fixture sem discriminação de tipo no Members:** o teste de projeto JavaScript
   legado acessava `files` em uma união que também admite árvores Pro. O teste agora
   confere que recebeu a variante JavaScript Classic antes de retirar os campos de
   linguagem. Os três cenários do contrato permaneceram aprovados.
6. **Coleta de callback no teste de retirada Python:** o Happy DOM guarda o callback
   de observação de mutações por `WeakRef`. Sob coleta de lixo, o teste perdia o
   gatilho de retirada e chegava ao prazo limite. A reprodução com `Bun.gc(true)`
   falhou nos dois cenários. O teste agora observa a montagem real do iframe por
   um spy restaurado no `finally` e agenda a retirada na microtarefa seguinte,
   conservando o runner real e as asserções de remoção síncrona. Os dois cenários
   passaram sob coleta forçada; a suíte completa passou com 9.253 aprovações,
   zero falhas e os quatro skips existentes. A checagem de tipos do teste passou.
7. **Contrato assíncrono no teste de personalização do Farol:** a integração Python
   tornou `completeLibraryAssets` assíncrona. O teste do curso ainda lia a Promise
   como projeto. A falha foi reproduzida isoladamente; as duas chamadas agora são
   aguardadas, mantendo todas as verificações de conteúdo e identidade. Os nove
   cenários do arquivo passaram após a correção.

## Verificação da integração local

Staging remoto avançou de `a1e182943` para `ac85a7a32`, com a frente Python do Estúdio.
Foi integrado por fast-forward antes do merge desta alteração, sem conflitos.

| Comando | Resultado |
| --- | --- |
| `bun install --frozen-lockfile` na raiz | Aprovado |
| `bun run test` em `packages/molda` | 3.406 aprovados, zero falhas, 474 arquivos |
| `bun run typecheck` em `packages/molda` | Aprovado |
| `bun run check` em `packages/molda` | Aprovado, 1.470 arquivos |
| `bunx vite build --config playground/vite.config.ts --outDir ../.cache/project-import-build` | Aprovado |
| `bun test tests/copy-vocabulario.test.ts` em `packages/community-kids` | 16 aprovados |
| `PW_REUSE_SERVER=1 bunx playwright test e2e/gallery-project-import.spec.ts` | 12 aprovados, Chromium/Firefox/WebKit |
| Reprodução visualizador → autoria após isolamento | 5 cenários aprovados; visualizador executa seus 3 cenários no processo filho |
| `bun test` em `packages/admin` após isolamento | 649 aprovados, zero falhas; os 3 cenários do visualizador também aprovados no processo filho |
| Biome dos dois arquivos de teste do admin | Aprovado |
| Reprodução da restauração de `indexedDB` | 14 aprovados, zero falhas |
| `STUDIO_STORAGE_BROWSER=chromium bun run test` em `packages/studio` após correção | 9.253 aprovados, zero falhas, 687 arquivos; 4 testes de executor pulados pela configuração existente |
| `bun run typecheck` em `packages/studio-language-service` | Aprovado nas três configurações |
| `bun run typecheck` em `packages/studio` após declarar os tipos do Node | Aprovado |
| `bun run typecheck` em `packages/members` após as correções | Aprovado |
| Prova de tipos dos eventos de processo com a configuração do Studio | Aprovado |
| `bun test tests/unit/python-activity-schema.test.ts` em `packages/members` | 3 aprovados, zero falhas |
| `git diff --check` | Aprovado |

Os testes de navegador usam o seletor real de arquivos para JSON e ZIP, recarregam a
galeria, abrem o projeto restaurado e conferem **Trazer 3D** no editor. Também verificam
arquivo de modelo recusado como projeto, retorno do foco e largura de 390 px.
A captura `.cache/gallery-project-import-mobile.png` foi inspecionada sem cortes ou
sobreposição. Os logs estão em `packages/molda/.cache/project-import-*`.

O CI e o deploy remoto são acompanhados após o push. O deploy deve considerar também a
frente Python integrada, pois a execução anterior falhou antes de publicar seus serviços.
