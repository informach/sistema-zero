# Terrenos prontos: prova local em 19/11/2026

Implementação em `bosque-terrenos.ts`, catálogo existente e `MapTerrainPanel.tsx`.
Mesma oficina, paleta Arcade, botões e estilos do Pinta. Nenhuma alteração no
formato: o backup do modelo permanece na versão 4.

## Verificações

- `PYTHON=.../pinta-python/Scripts/python.exe bun test src`, no pacote Pinta:
  **2.119 aprovados, zero falhas, zero omitidos, 23.625 asserções, 180 arquivos**.
  O Python disponível executou também os casos nativos condicionais.
- `bun run typecheck`: código de saída 0.
- Biome dos oito arquivos de código alterados: oito conferidos, zero correções.
- Playwright: **seis aprovados**, zero falhas, omissões ou novas tentativas.
  Dois fluxos nos perfis desktop Chromium, toque emulado Pixel 7 e desktop com
  CPU 4× mais lenta. [Recibo](navegadores.json).

O primeiro fluxo cobre duas folhas, materiais, pincel, balde, retângulo, linha,
prévia, vizinhos, semente, borracha, Escape, cancelamento nativo do toque,
desfazer/refazer e reabertura. O segundo cria o bosque pela galeria em **Começar**,
seleciona cores por teclado, pinta nas três camadas sem abrir regras, troca da
borracha para pintura, salva, recarrega e compara as camadas reabertas.

Os testes de documento verificam todas as 81 combinações em cada folha, três
artes distintas por centro de material, teto de 85 peças, orçamento de 2 MiB,
sanitização sem perda, backup e IDs independentes entre cópias do modelo.
As provas negativas detectaram modelo ausente, aviso incorreto de peça vazia e
variações de areia visualmente idênticas; os três casos foram corrigidos.

O teste aguarda a galeria depois de **Voltar**, confirmando o término do flush
antes da recarga. Esse requisito corrige o teste que interrompia a gravação em
andamento; não foi inserido atraso arbitrário no produto.

## Inspeção e limites

Capturas do fluxo real: [desktop](bosque-desktop.png), [toque](bosque-touch.png),
[CPU reduzida](bosque-cpu-4x.png). Arte e interface inspecionadas no Chromium.
Os ensaios usam namespace local exclusivo e artes de homologação.

Esta prova foi executada somente nesta máquina Windows. Toque e redução de CPU
são simulações; não houve telefone físico nem participação de crianças.
Não comprova ainda publicação autenticada, desempenho em outro aparelho ou a
conclusão das demais etapas da missão. O CI remoto deverá repetir os fluxos
depois da integração com as alterações mais recentes de staging.
