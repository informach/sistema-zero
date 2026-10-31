# Aventura das Nuvens (fase4-07), conferência no navegador

`playground/verificar-nuvens-aventura-browser.ts`, Chrome local com SwiftShader, DPR 0,5, qualidade
leve. Computador 1280 × 720; celular emulado 390 × 844, toque e menos movimento. Cada parte abre um
contexto novo do navegador.

| Passo | Computador | Celular |
|---|---|---|
| Saltos: "Começar", o cronômetro, as paradas nas plataformas 1 a 3 | aprovado | aprovado |
| Saltos: queda no chão volta, pelo corte, para a plataforma 2 onde ela está | aprovado | aprovado |
| Saltos: chegada na plataforma 4, resultado com "As 3 fitas do arco-íris", sem recordes da família | aprovado | aprovado |
| Luneta de dia: o Zappy avisa que as estrelas só aparecem à noite, a vista não abre | aprovado | aprovado |
| Corrida de balão: a argola vermelha começa, a laranja conta, "Parar" tira o cronômetro | aprovado | aprovado |
| De noite: a mira acha a arara, a fala e "Constelações: 1 de 6"; "Voltar" devolve a câmera | aprovado | aprovado |
| Celular: os botões do visor sobem a mira; sem rolagem lateral; sem erro na página | n/a | aprovado |

Os saltos vão de parada em parada pelo transporte de conferência; os pulos de verdade entre as
plataformas são do `verificar-nuvens-browser.ts` (fase4-06), aprovado de novo depois desta fase.
A corrida de balão é pilotada pelo controle (o piloto lê o corpo a cada leitura do controle).

Prints: `saltos-<tela>-alto.png`, `saltos-<tela>-resultado.png`, `balao-corrida-<tela>.png`,
`estrelas-<tela>-arara.png`, `estrelas-<tela>-ceu.png`.

Limites: SwiftShader não mede desempenho de aparelho. As fitas dos saltos não são pegas pelo
transporte (a estrela delas fica para o teste da parábola). O céu da vista às 18h28 ainda tem o tom
do anoitecer.
