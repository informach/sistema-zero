# Terrenos e cancelamento de gestos

Foi encontrada uma falha no editor: `pointercancel` chamava a confirmação do gesto,
e Esc não cancelava a pintura. A reprodução falhou nas duas situações antes do conserto.
O cancelamento agora restaura o documento anterior e encerra o gesto sem criar uma
entrada de desfazer. A soltura tardia não confirma a edição descartada.

Os testes também conferem que outro ponteiro não cancela o gesto, que o crescimento
à esquerda restaura dimensões e posições dos objetos e que um cancelamento tardio
não sobrescreve a cópia adotada após um conflito de persistência. Esse último caso
exercita a recuperação no store com persistência controlada; não é prova de conflito
entre dispositivos reais. O documento e o formato não mudaram.

## Fluxo real no navegador

O fixture tem duas folhas independentes, 83 peças por folha, dois materiais em cada
terreno e variações de peças. Usa o editor de produção, importação e backup reais.
As asserções comparam os encaixes dos cantos compartilhados sem chamar o algoritmo
de pintura para produzir o resultado esperado.

O fluxo passou em desktop, toque emulado por CDP e CPU 4× mais lenta:

- Linha, retângulo, lápis, borracha e balde; atualização de vizinhos e transições.
- Prévia sob o mouse sem alteração do backup autoral.
- Sementes 37 e 38 produzem variações distintas; repetir 37 reproduz as peças.
- Desfazer/refazer por gesto e cancelamento por Esc ou `touchCancel` nativo.
- Pintura na segunda folha sem alterar a primeira; salvar e reabrir conservando camadas.

Os três perfis passaram na mesma rodada final, sem retry ou omissão.
[Relatório](verificacao.json). [Desktop](desktop.png), [toque emulado](touch.png) e
[CPU reduzida](cpu-4x.png). Não são ensaios em aparelhos físicos distintos.

## Regressão e limites

A suíte completa passou em 2.110 testes, com três casos Pygame condicionais omitidos
por falta do interpretador no PATH. Os dois arquivos correspondentes foram
reexecutados com Python/Pygame nativo: 18 testes aprovados, incluindo os três casos,
sem omissão. Typecheck aprovado; Biome conferiu 16.144 arquivos sem erros, com
303 avisos e 245 informações preexistentes.

As tentativas anteriores do harness foram preservadas: busca de folha pelo nome
antes da normalização, balde sobre uma borda existente e alvo inferior do ensaio
de toque. O harness final consulta folhas por ID, escolhe a região vazia e verifica
explicitamente que os alvos pertencem ao canvas visível. Os traces anteriores
continuam em diretórios exclusivos locais.

Isso comprova os gestos de terrenos e a correção de cancelamento. Os terrenos do
ensaio foram preparados por código: a oferta de modelos prontos para começar sem
configurar regras ainda precisa ser entregue antes de encerrar a etapa 3. O rollout
autenticado continua sendo a etapa 0b, sem conclusão deduzida destes ensaios locais.
