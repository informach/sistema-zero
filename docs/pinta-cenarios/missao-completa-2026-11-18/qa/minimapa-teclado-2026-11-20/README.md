# Navegação pelo minimapa — correção e provas

O minimapa existente já oferecia cores, orçamento e janela visível. A auditoria
reproduziu dois defeitos de teclado: setas sem ação e ativação sem ponteiro
usando coordenadas zero, com salto ao canto. O mesmo componente agora usa o
centro real do palco a cada ação. Setas movem meia janela, PageUp/Down uma
janela vertical, Home/End os extremos. Enter/Espaço mantêm o centro. Atalhos
com modificadores permanecem disponíveis ao navegador/host.

Nenhum dado autoral, protocolo, renderer de arte ou estilo visual foi alterado.
Há descrição acessível e dica de teclado no botão existente. Sem novo painel,
sem outro minimapa, sem mudança do histórico de edição.

- Regressão inicial: **dois casos falharam** antes da correção, mantendo os
  dois casos existentes aprovados. Focado final: **quatro aprovados**.
- Suíte Pinta: **2.266 aprovados, zero falhas/omissões**, 27.289 verificações,
  193 arquivos, 235,91 s; Python/Pygame real disponível.
- Oficina real: **três aprovados**, zero retries/falhas/omissões, 39,4 s.
  Desktop, toque emulado e CPU 4× nesta máquina: clique/toque, setas, ativação
  sem ponteiro e extremos. Fechar/reabrir conservou todas as células das duas
  camadas do mapa de 192 × 128, com igualdade completa do conteúdo.
- Tipos do Pinta e harness/config: saída 0. Biome: saída 0, 16.508 arquivos
  em 29 s, após integrar a formatação da fixture remota que bloqueava o CI.

As capturas foram inspecionadas. Perfis simulados não são aparelhos físicos
adicionais nem testes com crianças ou leitores de tela humanos. Esta correção
não encerra streaming, automapping, projeções ou o ciclo autenticado de staging.
O typecheck integral pós-merge e o CI completo são evidências separadas.

`origem.json` guarda base e hashes dos logs; `fontes.json` registra o código
verificado; `checksums.json` confere os artefatos normalizados.
