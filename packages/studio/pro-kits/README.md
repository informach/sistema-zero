# Autoria dos kits profissionais

`canvas-survival/` é a fonte de autoria do kit Guardiões da arena. O projeto entregue ao aluno é composto pelo factory público `loadProTemplate('canvas-survival')`: fontes autorais, helpers compartilhados e materiais independentes por projeto. A pasta de autoria não duplica `ui.ts`, `input.ts`, `progress.ts`, `contracts.ts` e `lifecycle.ts`.

No diretório `packages/studio`:

```sh
bun run gen:pro-kits
bun run check:pro-kits
bun run test:canvas-survival
bun run verify:canvas-export
```

Edite os `.ts` em `canvas-survival/src/`, nunca `canvas-survival.sources.generated.ts`. O gerador inclui o hash dos helpers compartilhados e compara o pack original e o lock próprio com o grafo aprovado pelo runtime. Mudanças de helpers, fontes, lock ou arte precisam de regeneração e revisão. `check:pro-kits` e a prova do ZIP rodam no CI.

O lock do kit tem seu próprio pacote raiz e apenas a árvore necessária de Vite/TypeScript. Quando o runtime mudar de versões, regenere e confira `npm ci`; uma dependência que não existe no grafo aprovado interrompe a geração. Não copie o lock completo da imagem para o kit.

`verify:canvas-export` usa o exportador público, extrai o ZIP em um diretório temporário fora do repositório, instala sem junction, confere a árvore npm, executa typecheck/build e joga no `dist/` servido sob caminho aninhado. O relatório fica em `.cache/studio-canvas-export-evidence.json` na raiz do repositório; o diretório temporário é informado para inspeção. Ele também valida o envelope com assets pelo `parseBuildRequest` real.

O modelo é puro e trabalha por ticks. Loader e renderer têm descarte explícito. UI é proprietária da fase e `frameLoop` é o único agendador de frames. Inspeção expõe cópias para observação, sem comandos para forçar vitória ou alterar o mundo. Fixtures de testes modificam configuração fonte antes de inicializar o jogo.

As provas de browser usam Node para o transporte Playwright e `node:http` para servir as fixtures. O Bun do Windows não oferece o mesmo comportamento de transporte, e o preload HappyDOM do Studio substitui `Response`; a fixture não depende desse global. Use os scripts do pacote para carregar o preload dos testes de UI. Os caminhos `./...test.ts` são explícitos porque a descoberta padrão do Bun está limitada a `src/`.

O construtor, o runtime remoto e a publicação permanente usam os contratos existentes do Studio Pro. Cenários genéricos de objetivo e desempenho precisam reconhecer o ID `canvas-survival` e esperar `readiness === 'ready'` antes de enviar entrada. O README dentro do kit descreve o projeto exportado para o aluno; este arquivo descreve a autoria no monorepo.
