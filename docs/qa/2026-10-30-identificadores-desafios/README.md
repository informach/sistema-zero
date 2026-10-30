# IDs dos projetos da Vila e do Pico

Lote C01d da auditoria. As fábricas compartilhavam instâncias de instrução e expressão;
o leitor canônico recusava dez entradas dos manifestos, contando Kids e adulto.
Cada ocorrência agora nasce com seu nó próprio. Nenhuma regra de jogo mudou.

## Provas

| Conferência | Resultado |
| --- | --- |
| Leitor do Estúdio antes da correção | 98 testes passaram, dez falharam por IDs repetidos |
| Leitor depois | 108 passaram, 216 asserções, inicial e gabarito de todos os pacotes |
| Conteúdo documental completo | 126 passaram, 12.532 asserções |
| Contratos completos | 208 passaram, 9.044 asserções |
| Relatório com a derivação do Members | Um teste passou, 114 asserções |
| Importação Blockly da Vila e do Pico | Dois testes passaram, 108 asserções, ambos os públicos |
| Executor real da Vila | Um teste passou, 155 asserções, 293 segundos |
| Executor real de Pulo com apoio | Um teste passou, 42 asserções, 26 segundos; quatro quadros não alterados filtrados |
| Suíte oficial isolada do Estúdio | 11.167 testes passaram, quatro ignorados, zero falhas; 255.317 asserções em 156 processos |

Comparação profunda dos quatro manifestos com o commit anterior, ignorando apenas IDs de
nós de IR e Blockly: iguais. Código gerado, regras, objetivos, texto, arte e recompensas
intactos. A importação Blockly também confirmou o mesmo JavaScript após carregar os blocos.

A tipagem conjunta revelou duas expressões grandes demais para o TypeScript no exemplo
Reino Zero. As listas passaram a receber cada instrução como `JSStatement` antes de serem
compostas. O snapshot completo do exemplo ficou idêntico, sem cast ou supressão. A suíte
oficial `bun run test` do Estúdio foi executada por causa desse ajuste adicional.
`NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit` no Estúdio também passou.
Na raiz, `bunx tsc --noEmit -p docs/desafios-do-jogo/tsconfig.json` passou com os mesmos 8 GB.
Biome aprovou seis arquivos TS/JSON pequenos e o lint dos quatro manifestos com teto de 4 MB;
o formato dos manifestos é conferido contra os próprios geradores.

## Navegador e executor

Chrome local em `C:/Program Files/Google/Chrome/Application/chrome.exe`, configurado só na
variável do processo `SZ_CHECK_CHROMIUM`. Os verificadores existentes carregam o documento
real de prévia e passam as observações ao juiz do executor. Não usam navegador publicado.

Comandos em `packages/studio-runtime`:

```powershell
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test tests/vila-doce-browser.test.ts
bun test tests/quadros-pico-browser.test.ts -t pico-pulo-com-apoio
```

Na Vila, os nove gabaritos passam; iniciais e variantes com prazo congelado, condição
retirada, caixa ignorada, reinício ausente ou entrega repetida reprovam conforme o caso.
No pulo, o gabarito passa; inicial, reinício ausente, condição ignorada e pulo sem subida
reprovam. Não há screenshot novo: não houve alteração visual, e esta é prova de execução,
não avaliação de legibilidade ou de celular físico.

## Limites

Nenhum banco, publicação, arte ou salvamento alterado. Os projetos continuam em rascunho.
As lacunas curriculares do relatório `regras-a-completar.json` permanecem para os próximos
lotes; validade do documento não é prova de cobertura de ensino.

## Integração local

Commit `e801f3545`, conciliação com a praia `cc6a8c620`, merge no staging `0285b4284`.
Código e artefatos de `packages/arquipelago` idênticos ao staging da sessão da praia.
Na árvore conciliada: 109 testes do leitor/relatório aprovados, 330 asserções; 28 testes
de itens/coleções da praia aprovados, 626 asserções. Sem conflito ou push.
