# Escopos léxicos: cópias somente ao modificar

Baseline de código `6aa3e791e`. Windows local, Ryzen 5 5600G (12 threads lógicas),
34.142.584.832 bytes de RAM reportados pelo sistema, Bun 1.3.11. Os resultados são
de laboratório nesta máquina; não qualificam o aparelho de entrada de 8 GB.
Os [dados completos](2026-11-18-studio-symbols-performance.json) contêm todas as
amostras, ambiente e hashes. Não comparar com os números Linux históricos.

## Causa e mudança

`cloneSymbols` copiava os nomes de variáveis, funções, classes, Canvas e física a
cada escopo, mesmo quando nenhum nome daquele conjunto mudava. `SymbolNames` mantém
o conjunto nativo como armazenamento e compartilha uma foto entre escopos. A primeira
alteração real desanexa a foto; adicionar nome já existente ou apagar nome ausente
não copia. Mudanças posteriores no pai não vazam para os filhos ou irmãos. Mapas de
definições/instâncias continuam copiados, e os conjuntos por dono físico têm fotos
independentes. Nada foi retirado dos diagnósticos ou dos tipos.

A coleção é interna ao validador. Seus iteradores leem o armazenamento capturado;
não é um substituto geral para um Set mutado durante a própria iteração. As iterações
do validador leem uma foto e escrevem em outro escopo. A interface pública do índice
Canvas 3D continua `ReadonlySet`; não se expôs uma nova capacidade ao programa do aluno.
Não há cache global, persistência adicional nem recursos que exijam descarte manual.

## Resultado por fixture

31 amostras por comparação. No ensaio de escopos há três aquecimentos adicionais;
no perfil existente do Clássico foi preservado seu procedimento original.

| Medição | Antes | Depois |
|---|---:|---:|
| 500 nomes globais, 1.000 condicionais: referências p50 | 61,38 ms | 16,65 ms |
| Mesma fixture: referências p95 | 68,12 ms | 19,60 ms |
| Farol ampliado a 5.008 blocos: diagnósticos p50 | 65,66 ms | 60,64 ms |
| Mesmo Farol: trabalho completo por edição p50 | 116,88 ms | 112,85 ms |
| Farol a 10.000: trabalho por edição p50 | 259,25 ms | 252,09 ms |
| Mesmo Farol a 10.000: trabalho por edição p95 | 285,39 ms | 290,11 ms |

O ganho forte é na fixture com muitos nomes compartilhados entre escopos. O Farol
tem poucos nomes e continua caro por outras razões; seu p95 de 10.000 piorou nesta
rodada. Não declarar esse custo resolvido, nem atribuir o ganho sintético ao editor
inteiro. O perfil usa Blockly sem SVG e não mede arrasto, digitação, memória, GPU ou FPS.

## Integridade

- 157 exemplos/projetos, cada um acompanhado de controle negativo de leitura e
  atribuição sem declaração: 314 resultados e 314 mensagens. Saída completa antes
  e depois idêntica, inclusive caminhos, textos e ordem; SHA-256
  `2d8d8e1101de9f5a80dd53fc867de4f2c369ddccab12646389d879b9e0637d38`.
- Fotos de pai/filhos/irmãos, exclusão/reinserção e mil edições ramificadas
  determinísticas comparadas com cópias nativas de Set.
- IR, geração e projetos protegidos em Blockly real: 318 testes, zero falhas,
  95.477 asserts. Essa contagem inclui as comparações determinísticas da coleção.
- Typecheck isolado da coleção/testes e Biome aprovados. O workflow executa a
  suíte completa/typecheck do Estúdio e publica os dois novos relatórios por SO.

Ordem de inserção e resolução léxica preservadas; desempates não mudaram; sem
operações de ponto flutuante ou RNG no caminho alterado. A fixture de teste usa
semente fixa, sem alterar o gerador aleatório do jogo.

Reprodução (dentro de `packages/studio`):

```powershell
bun scripts/reference-diagnostics-golden.ts
bun scripts/profile-reference-scopes.ts
$env:SZ_PROFILE_SAMPLES='31'
bun scripts/profile-js-classic.ts --json
bun test ./src/ir ./src/generators ./src/blockly/__tests__/protectedCourses.test.ts
```

Trocar somente `programmingReferences.ts` pela versão baseline para o ensaio antes,
preservando/restaurando o arquivo de trabalho em `finally`. Não rodar simultaneamente
outra medição. Renderização incremental e o ciclo visual de 10.000 blocos permanecem
trabalho separado e obrigatório da etapa 2.
