# Consultas e grades limitadas — 21/11/2026

Referência: `dd34e6f99b00a7e219c67e63e4535312d0a2a2da`. O formato 8 permanece
interno; este lote não ativa o store, persistência física 3 ou contratos externos.

`topTileAt`/`flattenCellAt` passam a consultar coordenadas globais assinadas,
mantendo a camada vencedora, a ordem, a visibilidade herdada e os filtros de
folhas disponíveis. A consulta de frente percorre somente chunks guardados e
considera os ancestrais no contrato regional. O ramo legado mantém sua política,
inclusive detecção antiga de frente e aritmética dos argumentos fracionários.

`flattenMapWindow` extrai uma grade temporária por um retângulo explícito, usando
o leitor comum e recorte antes de visitar células. O orçamento de saída é fixo:
65.536 casas, a área máxima anterior de um mapa denso. Não acompanha aumentos
futuros da extensão autoral. Índices e identificadores de folhas ocupam no máximo
196.608 bytes de buffers por saída; isso não mede o heap total dos leitores.

As APIs antigas de achatamento aceitam regiões pequenas, começando na origem do
documento. Acima do orçamento, lançam recusa explícita antes de acessar payloads;
um adaptador deve optar pela janela limitada ou pelo documento estruturado.
O resultado contém índices das peças, como antes, sem objetos, flags, offsets ou
parallax. Não deve ser usado para transportar a cena completa ou salvar um mapa.
O documento autoral e seus vínculos permanecem intactos.

Quatro regressões foram reproduzidas no módulo anterior: casas regionais vazias,
achatamento vazio, acesso incompatível ao buffer de frente e leitura do payload
antes da admissão do tamanho. A revisão acrescentou testes de janelas nas bordas,
lacunas vazias, teto exato, limites inválidos e queda para uma folha visível quando
a arte da camada superior está indisponível. O caminho denso continua direto;
não constrói leitores/índices de chunks para as consultas de uma casa.

O laboratório de Chromium substitui apenas `tilemapOps.ts` pelo módulo anterior.
Os demais módulos são comuns, incluindo a API nova de janelas: sua saída é uma
prova atual, não uma alegação de que ela existia na referência. Cada perfil compara
64 resultados JSON densos completos: filtros, grupos, frente/fundo, múltiplas folhas,
flags decodificadas e consultas dentro/fora, fracionárias e não finitas.
Provas do núcleo regional são páginas de QA, sem simular store público 8 por casts.

Resultados, logs compactados e hashes estão em `index.json`. Ensaios de oficina
são separados das provas do núcleo. Não foram executados novos contratos em
Tiled, Phaser, Pygame ou Godot neste lote, nem aparelhos físicos adicionais.
Render, abertura fria, autosave e SLA global continuam com suas qualificações
próprias. Crescimento/redimensionamento, curadoria de recursos, store/IO e
adaptadores ainda precisam encerrar os consumidores antes da promoção pública.

Suíte completa: 2.629 aprovados, três controles Pygame omitidos pela configuração
local, zero falhas; 30.010 asserções em 235 arquivos, 173,24 s. Regressão focada:
72 testes/283 asserções. Chromium: três perfis do núcleo, seis controles dos modos
anteriores do laboratório e quatro percursos da oficina (32 camadas e Vila, por
mouse/toque emulado), todos sem retry. São 192 comparações JSON densas exatas.
