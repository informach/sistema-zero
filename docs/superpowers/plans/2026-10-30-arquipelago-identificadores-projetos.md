# C01d: peças distintas nos projetos de desafio

## Causa e decisão

A reanálise C01c encontrou IDs repetidos nos quatro jogos da corrida da Vila e em Pulo
com apoio do Pico, nos dois públicos. Os geradores reutilizam a mesma instância de `apply`
e, no Pico, da expressão de posição `y`. `structuredClone` preserva referências compartilhadas;
atribuir IDs por caminho nessa árvore faz as ocorrências reutilizarem o primeiro ID.

Cada ocorrência de instrução ou expressão deve nascer independente na fábrica do projeto.
Transformar essas constantes em funções que criam nós. Não relaxar o leitor do Estúdio,
apagar IDs depois de gerar nem fazer o importador corrigir silenciosamente documentos inválidos.
Não mudar o atribuidor global: ele preserva IDs existentes e não precisa receber um grafo
compartilhado de autores para estes projetos. Regras, textos, arte e moedas permanecem iguais.

## Etapas

- [x] Reproduzir a recusa no leitor canônico com todos os projetos locais dos dois públicos.
- [x] Corrigir as duas fábricas e regenerar os quatro manifestos e relatório C01c.
- [x] Comparar antes/depois sem IDs, inclusive código gerado, regras e arte.
- [x] Importação Blockly, executor real da Vila e do quadro de pulo, testes, tipagem e Biome.
- [x] Revisão completa e documentação.
- [x] Commit `e801f3545`, conciliação `cc6a8c620` e merge local `0285b4284`. Sem push.

## Limites e pedidos de arte

Nenhum pedido de arte. Não muda a jogabilidade; a prova no navegador é a execução real dos
objetivos. Não substituir a pendência curricular dos outros pacotes por essa correção técnica.
Nenhuma importação, publicação ou escrita em banco remoto.

## Achado da tipagem

A verificação conjunta dos geradores expôs TS2590 em duas listas grandes do exemplo
Reino Zero, sem relação com os IDs. Importar o leitor puro no teste é adequado para seu
escopo, mas não resolveu a falha: os geradores também alcançam o catálogo do Estúdio.
Correção no exemplo: formar essas duas listas com argumentos tipados como `JSStatement`,
evitando a inferência de uma união entre centenas de literais. Sem `any`, cast ou supressão.
Cada instrução continua conferida. Snapshot JSON completo do exemplo antes/depois idêntico.
A suíte oficial isolada do Estúdio e a tipagem conjunta passam a integrar a revisão.

## Provas e revisão

- Antes: 98 testes passaram e dez falharam por ID repetido. Depois: 108 passaram,
  conferindo inicial e gabarito, 216 asserções. Suíte documental: 126 testes aprovados,
  12.532 asserções. O leitor permaneceu intacto.
- Comparação profunda com o HEAD anterior, removendo somente `id`/`__id` de nós de IR ou
  Blockly: os quatro manifestos são iguais. IDs de objetivos e assets não foram ignorados.
  Código gerado, metadados, textos, regras, recompensas e arte idênticos.
- Importador Blockly: dois testes aprovados, 108 asserções. Os dois públicos da Vila e do
  Pico geram o mesmo JavaScript após abrir os blocos.
- O relatório C01c agora analisa todas as 108 entradas, sem erro de documento. A corrida
  da Vila continua com dependência opcional de clique em grupo; isso é correção curricular
  posterior, não resolvida mudando IDs. As demais lacunas seguem visíveis no relatório.
- Contratos: 208 aprovados, 9.044 asserções. Relatório do Members: um aprovado,
  114 asserções. Executor real da Vila: um aprovado, 155 asserções; pulo do Pico: um
  aprovado, 42 asserções. Gabaritos passam, iniciais e negativos causais reprovam.
  Comandos e limites em `docs/qa/2026-10-30-identificadores-desafios/README.md`.
- Suíte oficial do Estúdio (`bun run test`): 821 arquivos em 156 processos isolados,
  11.167 testes aprovados, quatro ignorados, zero falhas, 255.317 asserções.
- Biome dos arquivos TS/JSON pequenos aprovado. Os quatro manifestos excedem o teto padrão
  de 1 MB; lint executado com `--files-max-size=4194304`, aprovado. Seu formato é o produzido
  pelos geradores, conferido pelos testes de correspondência, sem reformatação manual.
- Tipagem com 8 GB: Estúdio completo e configuração conjunta dos geradores aprovados,
  depois do ajuste das listas do Reino Zero. Sem reduzir os arquivos conferidos ou suprimir erros.
- Revisão completa: fábricas, IDs, equivalência dos dados, capacidade do teste de detectar
  documento vazio, fronteiras, relatórios e documentação conferidos. Nenhuma alteração remota.
