# Lote 6 — Primeira auditoria das curvas

18/11/2026. Base: `7c8810775`, fechamento do lote 5. **Somente 6.1 em andamento.** Este recorte não entrega a nova aba Caminhos nem fecha seus contratos.

O núcleo adiantado do Claude foi conferido antes de integrar estrada/cerca/muro/ponte. Testes novos reproduziram três falhas: passos infinitos eram aceitos por estações/módulos; uma praça de 1 cm de lado perdia precisão ao ser transladada para 100 km; alturas não finitas chegavam aos buffers da faixa e ao perfil da ponte. O polígono que se cruza com área assinada não nula já era corretamente recusado.

Correções: intervalos precisam ser finitos; área usa coordenadas relativas ao primeiro ponto; altura/posição inválida não é publicada na malha/perfil. A suavização também confere seu orçamento de pontos antes de gerar a saída, conservando o limite anterior. Não foi substituído o algoritmo de curvas nem alterada a convenção do eixo X/giro dos módulos.

Prova vermelha/verde: três dos quatro testes novos falharam antes e todos passaram depois. Regressões de curvas/água, operações de rio/represa e precisão também passaram. Suíte completa do núcleo: 206 testes/8.490 asserções; motor: 98/2.800; oficina: 92/595, sem falhas. Tipagem do núcleo e Biome aprovados.

Os caminhos importados da Faísca têm seis trilhas e uma praça, com 2–8 controles e acabamento de catálogo. Seus dados serão preservados. Antes do desenho no palco, ainda faltam a união tipada das seis variantes, limites/recursos, geometria coerente com o terreno, apoio em estruturas, operações autorais e a extensão ao clipboard. Não há aceite artístico, nova implantação ou início dos lotes 7–10 neste recorte.
