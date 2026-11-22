# Projeto regional e edição offline de uma aba antiga

Base de código `1a761e9b63706ecb1c6c58876bed44d273cea07f`. O material é a Vila do ensaio privado de projetos regionais. Os executáveis históricos e a fixture têm SHA-256 conferido pelos dois runners. O resultado se refere ao Estúdio clássico JavaScript.

## O que o Chrome fez

`probe.mjs` abre duas abas da mesma origem e do mesmo perfil sintético. O bundle `16bf6725f8704ed3305e5783397cdee0b230b6ab` grava cinco projetos PNG4 com script e bloco identificáveis. A outra aba faz o refresh privado de cada material para PNG5. Os comandos de autoria e a leitura final são executados com rede desligada. Entre a destruição e a leitura final somente o shell e o bundle usados para criar a nova aba vêm da fixture local. O sandbox usa um perfil temporário do Chrome.

| Operação por entry point | Resultado lido do IndexedDB, depois de reabrir |
| --- | --- |
| `persistProject` de 16bf segurando a cabeça anterior, caminho de persistência do autosave | Recusou e preservou o PNG5, o script e o ID de bloco. A sonda não aciona o timer da UI. |
| `restoreProjectFromCloud` de 16bf, snapshot antigo com uma edição textual e outra de bloco | O projeto voltou ao PNG4, ao script do restauro e ao bloco trocado. |
| `discardImportedProjectSnapshot` de 16bf | O ID deixou de resolver. |
| Mesmo descarte com backup sintético de chave válida | O ID e a chave de backup foram removidos. A carga do backup é só um sentinela para observar limpeza física. |
| `useProjectStore.getState().deleteProject` no bundle moderno, ação explícita | O ID deixou de resolver. A futura V5 precisa preservar esta escolha do autor. |

`resultado.json` guarda as cinco leituras e controles independentes de restauro e limpeza. Essa primeira prova mostra o estado atual. A proposta de proteção está em `desenho.md`.

## Medição da retenção

`bench-scene.mjs` usa IndexedDB do Chrome, `conditionalWrite`, `readValues`, `localSnapshotsEqual` e os codecs de grafo do produto. Primeiro persiste e abre um projeto com o binário 16bf. Em outro escopo privado, o writer real gera o estado com PNG5 a partir da mesma V4. O cálculo é feito nas dez partições da identidade observada. A sonda grava a foto num prefixo exclusivo de QA, volta à V4 pelo restauro de 16bf, grava o fork e verifica todos os digests e valores das duas linhas de autoria. Tratamos a ausência como parte da foto. Na V4 entram miniatura e placar do jogo. Não há histórico Pro nestes clássicos. A sonda faz leituras pontuais e nunca pede `getAll`/listagem do perfil. Os recibos de transação, a cobrança lógica e o índice da sonda cobrem só os projetos sintéticos.

Valores do ensaio no Chrome 157.0.8103.80, Bun 1.3.11 no empacotamento. Cada coluna temporal é uma amostra. A preparação inclui serialização e SHA-256, e a abertura verifica SHA, decodifica a partição e compara seu conteúdo. O tempo de criação da fixture e o carregamento dos bundles ficam fora das medições.

| Projeto | V4 de origem | V4 + regional | V4 + regional + fork | Preparar | Commit | Abrir/verificar regional | Commit do fork | Reabrir/verificar ambas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 material, fonte e bloco | 3.905 B | 12.473 B | 14.668 B | 0,6 ms | 2,1 ms | 2,0 ms | 1,3 ms | 2,1 ms |
| 9 materiais, 5 arquivos extras | 8.132.900 B | 16.270.464 B | 24.401.654 B | 39,9 ms | 58,4 ms | 46,7 ms | 70,0 ms | 96,3 ms |

Em ambos os casos a última transação leu no máximo 24 chaves, três partes foram compartilhadas pelo fork e doze corpos distintos permaneceram. O débito inclui chave e valor do grafo UTF-8 observado da V4, manifestos, chaves e corpos privados e o registro de saldo. O tamanho real da V4 muda no restauro, conforme `currentSourceBytes` em `medidas.json`. O perfil real pode comprimir/deduplicar dados, cobrar overhead de páginas, ou ter outra quota física.

A memória JS amostrada entre fases ficou entre 103.127.814 e 104.454.136 B no cenário pequeno e entre 147.784.460 e 303.499.412 B no grande. A medida inclui o harness, os dois bundles reais, a origem e as fotos para comparação. É uma amostragem com `--enable-precise-memory-info`, e não o pico físico do navegador, o consumo incremental exato do editor ou uma previsão para um perfil de 1 GiB. O benchmark mantém referências para verificar igualdade integral e lê novamente corpos já existentes. Uma implementação deverá limitar o pico por partes e usar comprimentos certificados por cabeças privadas no CAS.

Os dois cenários recusam um limite um byte abaixo do medido. Por construção o limite igual aceita. Um último `put` com valor não clonável lança `DataCloneError`; na releitura nenhuma parte ou saldo existe. Um CAS preparado sobre a origem anterior é recusado depois do restauro V4. Em ambos os casos, reabertura do modelo de retenção comprova o conteúdo exato de regional e fork. Essas provas não incluem ainda UI de recuperação, recarga entre versões V5, integração do preview, proveniência remota, regressão WebKit/Firefox nem uma quota geral de produção.

## Repetição

Usar Node com Playwright/Chrome disponível via `$studio`. Os três insumos estão no cache imutável da prova `projetos-js-regionais-privados-2026-11-22`, que também contém a receita de build. Na raiz do checkout auditado, PowerShell:

```powershell
$qa = 'docs/pinta-cenarios/missao-completa-2026-11-18/qa/projeto-autoridade-offline-2026-11-22'
$studio = 'C:/Users/tocha/projects/sistema-zero-pinta-project-png5-11bfb840-6198-4b2a-9651-9e207546d3c7/packages/studio'
$fixture = "$studio/.cache/pinta-regional-browser-fixture.json"
$old = "$studio/.cache/pinta-project-old.mjs"
$modern = "$studio/.cache/pinta-project-new.mjs"
New-Item -ItemType Directory -Force .cache/authority-qa | Out-Null
bun "$qa/build-bench.mjs" .cache/authority-qa/bench.mjs
node "$qa/probe.mjs" $studio $fixture $old $modern
node "$qa/bench.mjs" $studio $fixture $old $modern .cache/authority-qa/bench.mjs
```

`resultado.json` e `medidas.json` são os recibos da execução. O hash do bundle da sonda depende da versão de Bun e da formatação da fonte. Os hashes de comparação histórica e da Vila são requisitos verificados antes de abrir o navegador.
