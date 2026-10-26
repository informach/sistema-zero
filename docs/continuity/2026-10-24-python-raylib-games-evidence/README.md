# Evidência de autoria visual dos exemplos Raylib (lote 1)

Cada `<jogo>-rN.json.snapshot` é o recibo de `scripts/python/visual-example-qualification.ts`
(`--extension python-raylib-2d` ou `python-raylib-3d`) para
`src/examples/python/raylib/<jogo>/main.py`: análise pelo CPython do Pyodide da distribuição
registrada, projeção em blocos sem nenhum trecho opaco, ida e volta completa por um workspace
Blockly salvo e recarregado, e as edições causais de
`scripts/python/fixtures/raylib-games/<jogo>.edits.json` refletidas no Python gerado.

`scripts/generate-raylib-games.ts` lê estes recibos para gerar
`src/examples/python/raylibGames.blocks.generated.ts` (os blocos que cada exemplo exige).
O recibo não aprova capacidades de execução: a disponibilidade continua sendo do host.

⚠️ Os recibos deste lote foram feitos com a paleta local (núcleo + os dois catálogos Raylib),
porque a release oficial ainda não traz os blocos do Raylib. Eles serão refeitos com a
release nova quando ela for gerada.
