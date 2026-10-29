# Balão das Nuvens (fase4-09), conferência no navegador

`playground/verificar-balao-browser.ts`, Chrome local com SwiftShader (`--use-angle=swiftshader`),
DPR 0,5, qualidade leve. Computador 1280 × 720; celular emulado 390 × 844, toque e menos movimento.

| Passo | Computador | Celular |
|---|---|---|
| "Subir no balão" ao lado do cesto, E ou Usar; corpo no meio do cesto | aprovado | aprovado |
| Segurar o fogo sobe; o direcional leva para o lado (mais de 1,5 m) | aprovado | aprovado |
| Pausa: o cesto não anda | aprovado | aprovado |
| Soltar o fogo: desce até pousar; "Descer do balão" aparece e desce ali | aprovado | aprovado |
| Pousar no lugar do balão: a criança sai 1,2 a 1,7 m do cesto, de pé | aprovado | aprovado |
| Sem rolagem lateral no celular e sem erro na página | aprovado | aprovado |

Prints: `balao-<tela>-cesto.png`, `-voo.png`, `-pousou.png`, `-de-volta.png`. As medidas de cada
tela ficam em `resultado-<tela>.json`.

Limites: SwiftShader não mede desempenho de aparelho. O envelope do balão não colide (só o corpo da
criança), então ele pode atravessar uma copa ao voar por baixo dela. Num pouso em encosta a câmera
chega mais perto por causa da colisão dela com o chão, como no resto do jogo.
