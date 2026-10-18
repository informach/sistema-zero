# Provas do runtime Python do produto

Esta suíte executa os módulos reais `packages/studio/src/runtime/python` em Chrome e Edge. O servidor é somente uma ferramenta local de qualificação: o catálogo estrutural usado pelas fixtures não aprova releases em produção, e as rotas de teste não fazem parte do serviço público.

O assembler exige Node24+ e Bun. A compilação síncrona da biblioteca padrão não precisa de JSPI; o runtime interativo no navegador mantém sua própria exigência desse recurso. No desenvolvimento, `STUDIO_PYTHON_BUILD_NODE` pode apontar para um executável Node24 local; não é configuração de projeto ou do navegador. O CI prepara Node24 antes do build. No diretório `packages/studio`, executar com Node (o transporte Playwright/Bun travou no Windows durante L0):

```powershell
node node_modules/@playwright/test/cli.js test --config=playwright.python-runtime.config.ts
```

O builder verifica bytes/SHA256 dos artefatos fixados e produz a distribuição em `.cache/studio-python-runtime/distributions/<hash>`. Cada execução da suíte guarda relatório e anexos próprios em `.cache/studio-python-runtime/runs/<data>/`, sem sobrescrever as anteriores. `PYTHON_PROBE_PORT` permite escolher a porta local; `PYTHON_PROBE_OUTPUT_DIR` permite escolher outro diretório de evidências.

A biblioteca padrão é preparada pelo próprio CPythonWASM/Pyodide pinado em um processo Node exclusivo, usando APIs públicas. A receita `packages/studio/scripts/python/precompile-stdlib.py` mantém todas as fontes originais e adiciona bytecode CHECKED_HASH sem otimização. O manifesto de build fixa versões, receita, entrada e saída; todos os artefatos vendor são verificados antes de importar JavaScript. Não é necessário instalar Python nativo ou Docker para essa montagem. O cache `.cache/studio-python-runtime/prepared-stdlib` é revalidado a cada uso; um cache inválido nunca autoriza fallback silencioso para a distribuição original. Essa preparação acrescenta 4.520.636 bytes ao ZIP inicial; o desempenho do produto precisa ser medido com a distribuição atual.

Para repetir os testes de compilação, cache, concorrência e cancelamento, na raiz do repositório, após montar uma distribuição:

```powershell
$env:STUDIO_PYTHON_BUILD_TEST_VENDOR_DIRECTORY = '.cache/studio-python-runtime/vendor'
bun test ./packages/studio/scripts/python/prepare-stdlib.test.ts
```

Sem essa variável, os testes que exigem o compilador/vendor são explicitamente ignorados; os testes de receita, cache corrompido e validação de lifetime continuam executando. O CI executa a prova completa. A ferramenta de qualificação pode fornecer explicitamente outra biblioteca preparada por caminho/hash/receita; projetos e requisições HTTP não controlam essa opção.

As fronteiras e provas têm testes separados:

- `python-runtime.spec.ts`: interpretador/worker reais usando transporte de prova, com semântica de fonte/REPL/arquivos/entrada/saída. Não prova o supervisor.
- `python-supervisor.spec.ts`: frame, CSP, bootstrap, porta e supervisor reais. O marcador do loop vem de dentro dele, após mil iterações. ACK de Parar e destruição do target nativo são medições distintas; o anexo registra também CPU. Aplicam-se os limites da ADR001 (250ms/3s), não a meta de um segundo rejeitada no L0.
- `python-provider.spec.ts`: provider/sessão do host, duas instâncias, digest, cancelamento, reinício e entrada. Usa a rota real de distribuição, manifesto gerado dos arquivos reais e aprovação somente do harness.
- `python-lifecycle.spec.ts`: 30 ciclos por navegador, memória nativa Windows de PIDs pertencentes ao browser da prova, encerramento de workers e retenção sem GC forçado. É recorte de console Pro, não memória do editor completo.
- `python-profile.spec.ts`: traces CPU e recursos no boot frio/quente. Diagnóstico com overhead de instrumentação, não homologação de desempenho.

A suíte não substitui os aceites de integração no editor, Turtle completo, Pro/LSP, Pinta, aulas/salas, exportação, publicação anônima no Mural, jogos completos ou ciclos do produto integrado. Essas etapas continuam no plano de implementação. Não alterar o harness L0 nem reclassificar seus resultados históricos.

`r2-proof.ts` valida os arquivos do manifesto usando o binding local R2 do Wrangler, com checksum, gravação condicional, repetição concorrente e GET/304. Compilar com `bun build experiments/studio-python-runtime/r2-proof.ts --target=node --outfile=.cache/studio-python-runtime/r2-proof.mjs` na raiz; executar com Node passando a raiz e o diretório da distribuição como argumentos. Usa configuração própria e armazenamento efêmero; não acessa o bucket remoto nem aprova o catálogo de produção.
