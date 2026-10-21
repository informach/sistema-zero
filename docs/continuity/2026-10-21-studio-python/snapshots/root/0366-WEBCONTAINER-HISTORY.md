# Histórico concreto do startup Pro

Somente leitura, Root `01f7d35a87a70e006004f9fa992713b067f3ad7a`. Baseline escolhida: `a1e1829431ae098f19ea77d023bd5d139d5653ab`, pai imediato do commit inicial de integração Python `aff20c1f9` (18/10/2026 17:28 -03). Não confundir igualdade de fonte com memória histórica medida: não há neste review ensaio equivalente da baseline.

## O que já existia antes de Python

`git rev-parse <baseline>:<path>` e `HEAD:<path>` deram o MESMO blob nos sete componentes abaixo:

| Arquivo (sob packages/studio/src/) | Blob igual |
|---|---|
| components/terminal/webContainerClient.ts | 49a2e9e9d9e68713e099375095ae7b89b58f866c |
| modes/pro/useWebContainerSync.ts | 105b634d713b1eaa4c7527b3a1dfde4d8af3dc37 |
| modes/pro/ProCodeEditor.tsx | 518c276f726d07fbc67c78e8b802d0b466e13eea |
| modes/pro/dependencyDeclarations.ts | 3901bed9c25527fcb8ff538170e1db8a35a1d20b |
| monaco/pro/languageService.ts | 720dcc26763ff154bdfaf2f4e31fecb999be770f |
| monaco/pro/workerClient.ts | cdf4339004633445bd4d9d84dbcde617c01f8b0b |
| monaco/pro/defaultLibraries.json | e39cf6ddbbf79b20aa03e92f9e1e80a6b7f5cfe2 |

- Singleton `bootPromise`, WebContainer.boot credentialless/forwardPreviewErrors, posse única do FS e reaproveitamento por template já existiam.
- Mount compartilhado, promise/generation, fila de sincronização, watcher e cleanup não foram modificados na integração Python.
- Leitura de node_modules inteiro para encontrar manifests/d.ts, com 30k nós/32M caracteres; TS worker local/stdlib e caches de linguagem não são novos do lote Python.
- ProPreview já iniciava automaticamente `ensureMounted → npm install → npm run dev`, com prazo de instalação e cleanup de processos. Não foi introduzido um segundo npm/dev-server pelo delta lido.
- Essa base Pro foi construída em `b94714927` (15/10 18:51), complementada por workspace `77c7e43b7` (16/10 00:38) e integração de diagnósticos `3e5fecb28` (16/10 07:24), antes de `aff20`.
- `@webcontainer/api` continua 1.6.4; Monaco 0.52.2, TS5.9.3. O manifest já tinha Vite8.0.16: não houve migração de Vite7 para8 no delta Python analisado.

## Deltas reais e seu alcance

1. **Python (aff20 / consolidação0e6)**: provider e Terminal passaram a selecionar `javaScriptProject(project)`; para JS essa função devolve a MESMA referência, sem clone. `ProCodeMode` foi extraído para ProWorkspace compartilhado; mantém um provider e um slot de preview. Layout de workspace não recebeu novo runtime/mount no recorte. Monaco ganhou readOnly/indentação/recusa de edição/EOL/observação; o guard que evita aquecer serviço TS clássico quando proMode já existia. `useFreeStudioRuntime` só autoriza/instancia Python se programmingLanguage==='python'; no JS desta fixture fica inativo. Nenhuma evidência estática de boot Python paralelo neste caminho.
2. **Upgrade de segurança 8ea9e93c7, 20/10 17:48**: pinos Vite8.0.16→8.1.6. Lock canônico do runtime troca Rolldown1.0.3→1.1.5, @oxc-project/types0.133.0→0.139.0 e binding-wasm32-wasi1.0.3→1.1.5; este binding troca @emnapi/core/runtime1.10.0→1.11.1 e wasm-runtime^1.1.4→^1.1.6. Binding WASI JÁ existia no lock antigo. Essa mudança é candidata mensurável; não prova que esse binding esteja sendo usado no WebContainer ou que explique o pico.
3. **Reparo legado 24d298969, 20/10 18:47**: ProToolchainGate agora impede boot usando o par aposentado, obtém lock no BFF, persiste transacionalmente e só então monta o preview. Antes de npm install, acrescenta `await flushProjectOperations(store,projectId)`; mesma sequência npm depois. Não há novo loop/retry automático npm. Históricos da reparação são hashes compactos limitados.
4. **Fixture executada**: Vanilla tem 6 arquivos, devScript `vite --host 0.0.0.0 --strictPort false`, Vite8.0.16/TS5.9.3 e nenhum package-lock original. O novo percurso prepara lock canônico96dd72… e Vite8.1.6 antes do primeiro npm. Portanto comparar somente os manifests do host ou o npm install sem lock da baseline NÃO isola a variável; o próximo diagnóstico precisa registrar o par efetivamente montado e as fases.
5. **Host/persistência**: `studio-pro-editor` ganhou adapter de abertura retido, namespace separado da identidade, guard Python e preparador Free; `studio-pro-client` ajustou identidade real/cloud e missão. Não encontrei mudança de dependência de efeito que remonte o projeto a cada Save nesse recorte; o adapter de preparo é memoizado por freeRuntime, e a key continua vinculada à identidade/contexto/projeto.

## Conclusão e discriminante mínimo

Não confirmei regressão concreta de boot duplicado, mount duplicado ou TS index duplicado introduzida por Python. Também não é correto chamar o pico de 2 GiB de preexistente só porque os módulos são iguais: não medimos a baseline no mesmo Chrome/fixture.

O próximo dado útil é a fase real no instante do crescimento, junto ao papel do processo/target: boot antes de mount, npm install, leitura de declarations, npm dev/server-ready e TS worker. Atualmente sabemos apenas que o primeiro visual não chegou; isso não localiza a fase. Preservar orçamento/oráculos, não reduzir funcionalidade, não downgrade vulnerável. Uma comparação controlada de versões só faria sentido isolada e autorizada DEPOIS desse discriminante, sem publicar dependência antiga e sem usar Docker nativo como equivalente à VM do navegador.

Se o crescimento ocorrer ANTES de npm dev, Vite/Rolldown startup não explica aquele pico. Se ocorrer durante dev e o alvo for o runtime WC, a alteração de Vite/Rolldown vira hipótese forte a testar; se for TS/editor, os componentes de linguagem iguais e a carga efetiva de declarações orientam outro ramo. A nova ponte remota não é correção autorizada para ocultar essa diferença.

Nenhum teste/browser/provider executado. Erros locais de leitura PowerShell (JSON com chave vazia e sintaxe de pipeline) foram corrigidos apenas no comando, usando ConvertFrom-Json -AsHashtable; os valores acima vêm da leitura final bem-sucedida, não dos nulls da tentativa inválida. Nenhuma fonte/cache histórico foi modificada.
