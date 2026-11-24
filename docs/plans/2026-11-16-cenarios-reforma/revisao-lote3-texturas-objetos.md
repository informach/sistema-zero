# Lote 3.3 — Formas, tonalidade e texturas por objeto

17/11/2026 · staging · parte interna concluída e revisada. O lote 3 permanece aberto.

A Aparência usa o mesmo acervo da aba Chãos das bibliotecas conectadas ao mundo. É possível buscar, paginar, escolher uma imagem, definir a repetição em metros e aplicar em um ou vários objetos. Escolher não grava antes de Aplicar. Restaurar a textura conserva a tonalidade; restaurar as cores conserva a textura. Operações passam pelos comandos, revisão e histórico existentes.

As formas de rascunho e os modelos GLB recebem o mesmo acabamento. A projeção usa a superfície real em coordenadas locais, a transformação interna do modelo e a escala da instância. Não interpreta UVs de atlas como metros. Faces coplanares compartilham o referencial; inclinações, espelho e escala não uniforme foram conferidos. Existe a conta equivalente para materializar UVs comuns nos exportadores posteriores. Escolher outro acabamento substitui a paleta, os mapas e as máscaras do material original; restaurar devolve os materiais e UVs originais, que permanecem intactos.

As leituras verificam tamanho, cabeçalho estático PNG/WebP, SHA-256 e dimensões efetivamente decodificadas, com até quatro pedidos simultâneos. Há cancelamento, proteção contra respostas antigas, compartilhamento por conteúdo e descarte de imagem/texture/material/geometria próprios. Erros de leitura e de preparação da superfície aparecem na interface. A lista e o palco oferecem nova tentativa. O serviço e o GC foram verificados no [recorte anterior](revisao-lote3-referencias-texturas.md).

## Evidências

Capturas usam imagem quadriculada de ensaio para avaliar escala e inclinação, sem aprovar uma direção de arte para a Faísca. A cena contém uma rampa, uma caixa e um banco GLB real; o poço real foi utilizado antes da troca de modelo.

| Evidência | Arquivo |
| --- | --- |
| Antes e depois, mesma câmera, claro | [Antes](evidencias/lote3-texturas/antes-conjunto-light-1440.png) · [Depois](evidencias/lote3-texturas/aplicado-conjunto-light-1440.png) |
| Antes e depois, mesma câmera, escuro | [Antes](evidencias/lote3-texturas/antes-conjunto-dark-1440.png) · [Depois](evidencias/lote3-texturas/aplicado-conjunto-dark-1440.png) |
| Painel, claro e escuro | [Claro](evidencias/lote3-texturas/painel-light-1440.png) · [Escuro](evidencias/lote3-texturas/painel-dark-1440.png) |
| Seletor do acervo | [Busca](evidencias/lote3-texturas/escolha-dark-1440.png) |
| Tela de 390 px | [Painel](evidencias/lote3-texturas/painel-dark-390.png) · [Palco](evidencias/lote3-texturas/aplicado-conjunto-dark-390.png) |
| Movimento e edição | [Gravação do ensaio](evidencias/lote3-texturas/movimento.webm) |
| Resultado reproduzível | [Três configurações](evidencias/lote3-texturas/resultado.json) |

Comando: `node packages/molda-cenarios/playground/oficina/verificar-texturas-objetos.mjs output/cenarios-reforma/lote3-texturas-resize`. Requer a oficina local na porta 4541 e os dois GLBs já catalogados em `output/molda-cenarios/acervo`, fora do Git.

## Testes e revisão

- Núcleo: 109 testes, 3.195 asserções; motor: 39 testes, 571 asserções; oficina: 43 testes, 288 asserções. Nenhuma falha.
- Tipagem dos três pacotes e do Molda aprovada. Build Vite da oficina aprovado; permanece o aviso de chunk acima de 500 kB, sem ocultar ou aumentar seu limite.
- Chrome: claro/escuro em 1.440 px e escuro em 390 px, sem erros de página ou console. Busca, 27 itens paginados, cancelamento, aplicação única/múltipla, repetição inválida recusada, escala não uniforme, giro, espelho, tonalidade, troca de modelo, restauração, undo/redo e reentrada conferidos. Bibliotecas apagadas conservam a leitura dos arquivos fixados. Imagem inválida e falha na primeira consulta produzem erro visível e recuperação.
- Três ciclos de restaurar/reaplicar estabilizaram em 23 chamadas de desenho, 30 geometrias e 7 texturas na GPU nessa cena. O indicador de orçamento expõe esses contadores na descrição. Não equivale a medição de FPS ou aceite em celular físico.
- Regressões: acervo de chãos PNG/JPEG/WebP e cópia do Molda; quatro formas com cores; espelho/troca, grade e andares com cores. Todos os ensaios passaram nos temas e tamanhos previstos pelos scripts.
- Revisão conferiu autoria dos recursos, recortes por material, normais ausentes e espelhadas, ausência de alteração dos GLBs originais, tratamento de falhas e histórico sem URLs temporárias. A ordem da tabela de referências não tem significado no contrato de inversão; referências e relações são restauradas.
- A inspeção visual encontrou um quadro vazio ao recolher o painel. A causa era `setSize` apagar o framebuffer durante o ResizeObserver, depois do RAF, deixando o redesenho para o frame seguinte. O ciclo compartilhado agora aplica o tamanho e desenha no mesmo RAF, mantendo a atualização imediata da proporção da câmera. A regressão falhou antes e passou depois; 262 testes/38.977 asserções do viewport Molda passaram. As capturas foram refeitas e inspecionadas depois da correção, sem espera fixa para esconder o defeito.

As partes 3.1, 3.2 e 3.3 estão implementadas, testadas e revisadas. Próximo: 3.4, árvore/camadas/seleção por área/área de transferência. Ainda faltam espalhamento, conjuntos vivos, retratos e eficiência, ensaio jogável e revisão integral do lote 3. Implantação e validação de staging ficam no encerramento global, conforme orientação da usuária.
