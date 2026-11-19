# Retomada do Estúdio na staging — 19/11/2026

## Origem e ambiente

Atualização local por fast-forward de `3b08219eb` para `72652bf49`.
Durante a rodada, a árvore compartilhada avançou para `ce6fee40b` por outra
frente. As alterações locais de cenas Pro e dos demais produtos foram
preservadas; não fazem parte do incremento de descarte abaixo. Não foi
criada nenhuma worktree ou implantado código nesta rodada.

Windows, navegadores do Playwright 1.64.1, instalação congelada pelo Bun
1.3.11. Estes resultados não são medições em um aparelho físico de entrada.

## Revisão das falhas históricas

- 881 testes de níveis de blocos e da extensão Jogo 3D passaram, em 38 arquivos,
  com 10.521 asserções. As falhas históricas correspondentes não foram
  reproduzidas na revisão atual.
- O orçamento dos bundles passou, com 53 asserções. Nenhum teto foi alterado.
- Os 23 testes de abertura/fonte e dos projetos dos cursos passaram, com 58
  asserções. Não foram regravadas a matriz ou as referências dos cursos.

Evidências locais: `packages/studio/.cache/mission/continuation-72652-*` e
`offscreen-course-contracts.txt`. A instalação completa foi conferida antes
dos testes no navegador; a primeira rodada de contratos precedeu essa
reconciliação da instalação.

## Correção de descarte da montagem sob demanda

`createOffscreenBodies` interceptava `centerOnBlock` e `undo`, mas `dispose`
não restituía os métodos. Uma nova montagem sobre o mesmo workspace podia
reter e encadear o controlador encerrado. Agora o controlador:

- guarda e devolve as funções originais, mantendo o receptor da chamada;
- só restitui uma função que ainda pertence a ele, conservando integrações
  instaladas depois;
- deixa um interceptador retido por outra integração inativo após o descarte;
- trata o descarte repetido de maneira idempotente.

Não foram alterados blocos, cores, campos, arquivos, serialização ou geração
de código. Isto corrige posse de recursos; não é uma medição de redução de
heap e não resolve a abertura incremental de 5.000/10.000 blocos.

### Prova

O teste independente do aplicativo compila o controlador de produção e o
Blockly real, injeta um workspace no navegador e verifica descarte,
remontagem, render pendente e preservação de integrações posteriores.
Reprovou antes da correção (`restored=false`, `remounted=false`); passou
depois em Chromium, Firefox e WebKit, sem retries (3 casos, 9,4 s).
Não acrescenta API de teste ao produto. Foi incluído na matriz de CI, com
os traces de falha enviados como artefatos.

Checagem estrita dos três arquivos TypeScript alterados: aprovada. Biome:
aprovado. A checagem completa da árvore e a CI integrada não são declaradas
aprovadas por esses recortes.

## Navegador integrado e isolamento

Uma execução com trace reteve: seis aprovações, uma falha e um skip
intencional (WebKit, isolamento de CPU não suportado pelo arranjo medido).
Passaram os dois casos do Clássico (incluindo editar/desfazer em 2.000
blocos), render/console/Parar/Rodar nos três motores e isolamento no Firefox.

O caso hostil Chromium reprovou: atraso do relógio do editor 63 ms, mas
9.026 ms de tempo externo para obter uma observação de 3.000 ms. O limite
externo continua em 5.000 ms e o do relógio em 500 ms. Uma execução isolada
sem trace passou. Isso sugere influência da instrumentação, mas não prova
a causa: os resultados não devem ser confundidos com melhora do produto.
A comparação controlada adicional, no mesmo build servido na porta 5355,
usou braços off/on/on/off e diretórios de evidência separados. Os dois
braços off passaram (11,0 e 10,9 s por teste completo); os dois on
reprovaram antes da observação, com início em 13.105 e 12.905 ms para o
limite inalterado de 10.000 ms. Isso identifica a captura completa como
interferência na medição deste laboratório, sem significar redução do
custo do programa do aluno.

O ensaio de CPU foi separado em `preview-shell-performance.spec.ts`.
Somente nele o trace retém chamadas, rede e fontes sem snapshots DOM e
screencast por ação. O caso funcional continua com captura completa no
arquivo original; ambos compartilham as mesmas ações em um helper. Não
foram retiradas as verificações de render, comunicação, CPU ocupada,
Parar, conserto e Rodar de novo. O WebKit continua marcado como não
qualificado para isolamento de CPU, sem botão ou promessa substituta.

Duas execuções Chromium com o novo arranjo passaram sem retries:

| Amostra | Início durante carga de 30 s | Observação externa de 3 s | Maior atraso do editor |
| --- | --- | --- | --- |
| 1 | 3.415 ms | 3.012 ms | 63 ms |
| 2 | 3.414 ms | 3.007 ms | 63 ms |

O recibo JSON é escrito no diretório do caso, inclusive quando passa.
Evidências: `shell-control-*`, `shell-lighttrace*`, `shell-qualified*` em
`packages/studio/.cache/mission`. Isto mede a resposta desta fixture de
isolamento, não digitação, FPS nem o custo de um profiler do produto.
Os testes funcional e de desempenho também foram acrescentados ao recorte
Windows da CI, que antes não incluía nenhum dos dois.

Após a separação, a rodada conjunta teve quatro aprovações (funcional e
CPU nos dois motores Chromium/Firefox), um skip explícito e uma saída
nativa do worker WebKit antes do caso começar (0 ms, código 3221226505).
Essa rodada não é verde. Uma execução diagnóstica somente do caso WebKit,
sem retries e com `DEBUG=pw:browser`, passou em 12,3 s e confirmou o
encerramento normal do navegador (exitCode 0). A causa da saída nativa
inicial não foi determinada e permanece como risco do ambiente/runner,
sem alteração de prazo ou captura de erro para escondê-la.

Na rodada conjunta, o recibo Chromium registrou início em 3.628 ms,
observação externa de 3.015 ms e atraso máximo de 63 ms; o Firefox,
4.162/3.008/52 ms respectivamente. Resultados locais, não p95.

O trace original da rodada integrada foi sobrescrito pelo diretório padrão
da execução seguinte; o log da falha e os valores extraídos acima foram
preservados. As rodadas controladas usam diretórios exclusivos para evitar
repetir essa perda de evidência. A documentação oficial descreve os snapshots
por ação e o custo da captura: https://playwright.dev/docs/trace-viewer.

## O que permanece aberto

Esta rodada não conclui a missão. Continuam necessários: abertura sem criar
todo o SVG, integração/ativação segura da casca no host, solução efetiva de
execução para WebKit, fluxo Members Verificar/Enviar/Concluir, Pro modular,
depuração, profiler, testes dos alunos e jogos extensos com streaming e
orçamentos de memória. Não foram feitas alegações de FPS ou metas universais.

Reprodução do teste de descarte, sem build do app:

```powershell
cd packages/studio
bunx --no-install playwright test --config e2e/offscreen-lifecycle.config.ts
```
