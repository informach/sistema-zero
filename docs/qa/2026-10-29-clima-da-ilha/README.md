# Clima da sua ilha (fase4-08), conferência no navegador

`playground/verificar-clima-browser.ts`, Chrome local com SwiftShader, DPR 0,5, qualidade leve.
Computador 1280 × 720; celular emulado 390 × 844, toque e menos movimento. Posto das Nuvens aberto.

| Passo | Computador | Celular |
|---|---|---|
| Plantar e regar um canteiro; plantar outro sem regar | aprovado | aprovado |
| Menu, "Clima da sua ilha", Chuva: sol a 50%, gotas (nenhuma com menos movimento), 🌧️ no relógio | aprovado | aprovado |
| A chuva rega sozinha o canteiro só plantado | aprovado | aprovado |
| Nublado: sem gotas, céu 45% cinza | aprovado | aprovado |
| Sol: a alface regada pede água aos 30% (gota azul e "Regar"); regar adianta 15% | aprovado | aprovado |
| Celular: sem rolagem lateral; sem erro na página | n/a | aprovado |

Prints: `clima-<tela>-chuva.png`, `clima-<tela>-nublado.png`, `clima-<tela>-sede.png`.

Limites: SwiftShader não mede desempenho de aparelho (as gotas são 250 riscos no modo leve). O pedido
de água espera o relógio de verdade (54 s para a alface). A fala do Zappy ao escolher o clima some
sozinha e pode ser trocada pela dica da câmera: o verificador confere o estado, e o texto fica com o
teste de regra.
