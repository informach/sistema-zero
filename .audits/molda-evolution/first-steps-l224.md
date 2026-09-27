# Review — lote 224, primeiros passos contextuais

Encerrado. Design: `docs/plans/2026-09-09-molda-first-steps.md`.

## Implementação e review

- `SceneFirstSteps` tem somente assunto, abertura e posições de leitura em React.
  Não recebe editor/documento/gestos, não persiste nem observa frames/ponteiros.
- `SceneCanvas` escolhe contexto Modelar/pintura/Animar e usa chave do projeto.
  Sobreposição no palco não altera dimensões de canvas/projeção; limitada à área,
  com rolagem própria e acionador fora da região rolável. Gaveta mantém z-index maior.
- Três dicas por assunto usam nomes existentes: adicionar/mover/copiar; preparar
  imagem/camada e pintar; guardar chave inicial, experimentar e gravar pose.
  Texto de ajuda fica no seu módulo, sem aumentar o catálogo comum de COPY.
- Sem modal, foco preso, atalhos globais ou ações automáticas. Escape local não
  atinge SceneCanvas/Workshop nem recolhe propriedades; Delete/Ctrl-Z ficam locais.
  Abrir move foco no layout somente se acionador ainda o possui e não há modal.
- Botões de leitura nos extremos usam aria-disabled com clamp, conservando foco;
  continuam no percurso de Tab. Nenhum timer, medição GPU, telemetria ou inferência
  de aprendizado/conclusão. Reabrir usa contexto atual e retoma sua posição.
- Estado é descartado com o projeto ou remontagem do palco após falha WebGL.
  Não acrescentar cache global de progresso nem gravar leitura no documento.

## Provas

- 1d3d06/083968: 94/0, 2.393 asserts, três arquivos (componente/Workshop/CSS).
- Acrescentada integração de pintura: 1a8311/21aa5c **95/0, 2.397 asserts,
  três arquivos, 27,80 s**. Modelar contextual, Delete/undo local, pintura continua
  aberta, documento/seleção/revisão/upload inalterados. Pose pendente sobrevive a
  ajuda, navegação e Escape, pode ser gravada e desfeita com uma entrada.
- Unidade: limites de navegação, foco na abertura/fechamento, contexto ao reabrir,
  leitura por assunto, nova chave de projeto, Tab não prevenido, nenhum focus trap.

## Gates finais

- Review de acessibilidade do Biome pediu semântica para o contêiner com teclado:
  `aside` identificado substitui div, sem supressão. e8fd6d: **1.149 arquivos**, limpo.
- Tipos finais 700629: passaram. Nenhuma edição de código/testes depois disso.
- Integral 31e682/c29091: **2.805/0, 8.508.078 asserts, 377 arquivos, 162,01 s**.
  Sete logs WebGL esperados. Sem act nesta execução; não é correção dos avisos antigos.
- Vite 59ffeb: **1,15 s, 2.289 módulos**. ScenePlayground 211,88→216,51 kB
  (65,62 gzip); CSS 53,64→53,93. Index 364,39, SceneViewport 117,52 e workers
  inalterados. Three 579,29 mantém aviso >500 kB. Sem promessa de melhoria de FPS.
- Kids 23de86/6ca9b3: **7,2 s compilação, 9,7 s tipos, 59 páginas/669 ms**, exit 0.

Browser oficial sem conexão na tentativa documentada no lote 220. Não houve review
visual, toque, leitor de tela ou teste com crianças. As skills de interface/Tailwind
orientaram o painel dispensável, tokens da plataforma e alvos de 44 px; escrita
concisa orientou instruções concretas e nomes reais. Limitações permanecem visíveis.
