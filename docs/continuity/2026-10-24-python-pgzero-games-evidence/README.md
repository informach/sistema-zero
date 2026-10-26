# Evidência de autoria visual dos exemplos Pygame Zero (lote 1)

Cada `<jogo>-rN.json.snapshot` é o recibo de `scripts/python/visual-example-qualification.ts`
(`--extension python-pgzero`) para `src/examples/python/pgzero/<jogo>/main.py`: análise pelo
CPython do Pyodide da distribuição registrada, projeção em blocos sem nenhum trecho opaco,
ida e volta completa por um workspace Blockly salvo e recarregado, e as edições causais de
`scripts/python/fixtures/pgzero-games/<jogo>.edits.json` refletidas no Python gerado.

`scripts/generate-pgzero-games.ts` lê estes recibos para gerar
`src/examples/python/pgzeroGames.blocks.generated.ts` (os blocos que cada exemplo exige).
O recibo não aprova capacidades de execução: a disponibilidade continua sendo do host.
