# Pro: índice completo e montagem progressiva do mapa

## Achado e contrato

Ampliar o ensaio de linguagem de 60 para 1.000 arquivos expôs uma perda
funcional: `languageService.symbols` descartava tudo depois do 300º símbolo.
A função `update` do arquivo principal desaparecia do mapa. Não era uma
falha de resolução do TypeScript; a própria adaptação truncava sua árvore.
O teste de regressão com 350 constantes e uma função recebeu 300 em vez
dos 351 símbolos reais.

O serviço agora preserva o índice completo, na mesma ordem e com os mesmos
spans/depths. A travessia usa uma pilha explícita. A proteção da interface
passa a ser a montagem progressiva: cem itens na abertura, mais cem por
ação explícita. A busca filtra **todo** o índice e reinicia o recorte visual.
A contagem informa quantos resultados estão visíveis e o total encontrado.
Nenhum limite de arquivo, projeto, compilador ou material foi aumentado.

O protocolo do worker e as posições de origem continuam os existentes.
O transporte ainda recebe o índice completo do arquivo ativo; não foi
implementada paginação do transporte. Não é uma alegação de memória
constante para um arquivo arbitrariamente grande.

O campo de busca usa a mesma receita de borda, fundo, tamanho e raio dos
campos existentes de `ProCodeTools`; os botões usam `sz-pro-btn`. Não há
novos tokens, tema ou alteração da interface do Clássico. A captura
[`studio-pro-file-map.png`](2026-11-19-studio-pro-file-map.png) foi inspecionada:
busca em maiúsculas encontra `zzUpdate` e navega à linha 351 no Monaco real.
É uma fixture sintética, sem projeto ou asset de aluno.

## Verificação

- Vermelho: serviço devolvia 300/351 símbolos; componente montava 500 itens
  de uma vez em vez do recorte esperado de cem.
- Verde: serviço e painel, **18 testes, 49 asserções**.
- Família ampliada de linguagem/workspace, **53 testes, 212 asserções**.
- Navegador com StudioEditor, Monaco e worker reais: **quatro casos passaram**:
  busca/navegação além do recorte inicial; módulo carregado depois do painel;
  recuperação de worker; edição contínua com mapa aberto.
- Após ajustar a receita visual do campo, o caso novo foi repetido e passou.
  O executor da fixture tem um build de teste; isso não qualifica WebContainer.
- `tsc --noEmit` do pacote terminou com código 0 e sem diagnósticos. Biome
  passou nos nove arquivos de código, e o guarda de bundle passou com 53
  asserções. Nenhum teto foi ampliado.

Logs locais em `packages/studio/.cache/mission/pro-symbol-*-red.txt`,
`pro-map-family.txt`, `pro-map-browser.txt` e `pro-map-browser-final.txt`.
O workflow da missão coleta o ensaio de 1.000 arquivos em Linux e Windows
e inclui explicitamente os quatro recortes de mapa no job Windows.

## Medição nova: mil arquivos

[`studio-pro-language-1000.json`](2026-11-19-studio-pro-language-1000.json)
contém ambiente, hash, controles e leituras de memória. A fixture tem
1.000 arquivos/336.617 bytes, 30 amostras e três aquecimentos por operação.
Usa o serviço TS 5.9.3 real, sem navegador, transporte do worker, Monaco,
WebContainer, jogo ou Zappy. Foram diagnosticados todos os arquivos;
referências e renomeação atravessam módulos; uma dependência quebrada
produz TS2322 e sua correção remove o erro.

| Operação | p50 | p95 | Máximo |
| --- | --- | --- | --- |
| Editar corpo + diagnósticos | 177,3 ms | 239,2 ms | 245,4 ms |
| Referências | 7,8 ms | 10,8 ms | 11,2 ms |
| Renomeação | 8,2 ms | 12,8 ms | 14,2 ms |
| Índice completo do arquivo | 3,2 ms | 5,5 ms | 11,6 ms |

A primeira análise levou 1.880 ms. O RSS do processo após análise ficou
em aproximadamente 674 MiB; a leitura após dispose não demonstra liberação
imediata nem ausência de vazamento, pois não houve GC forçado ou ciclos
prolongados. São dados locais Windows/Ryzen 5600G/32 GiB, com outras frentes
ativas na máquina. Não constituem comparação controlada antes/depois.
Os 239 ms não medem digitação, mas apontam trabalho adicional na análise
de um arquivo com dependência direta de quase mil módulos.

A fixture padrão de 60 arquivos continua idêntica:
`0829e466cbc47add348a21bbfa9d702d804c9403ab85c8e1ee032e9e4870b4d7`.
O tamanho é configurável de 10 a 5.000 arquivos, com validação antes de
construir a fixture. Isso não altera os limites do produto.

```powershell
cd packages/studio
bun test src/monaco/pro src/modes/pro/workspace
bunx --no-install playwright test --config e2e/pro-workspace.config.ts --grep 'complete file map|symbols|continuous edits' --retries=0
$env:STUDIO_PRO_LANGUAGE_FILES='1000'
bun scripts/measure-pro-modular.ts --output=.cache/mission/pro-language-1000.json
```

## Ainda aberto

Não conclui a etapa Pro, o projeto de homologação F ou a missão. Continuam
necessários digitação/painéis/busca medidos no navegador, análise incremental
em projetos maiores, uso prolongado, filesystem, perfis de execução e as
ferramentas profissionais restantes. A busca de referências do painel ainda
tem um recorte de cem resultados que exige revisão explícita; a correção
do mapa não deve ser interpretada como correção desse outro fluxo.
