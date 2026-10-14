# Fontes e produção do P07

Produção em 13/10/2026. Terceiro carrossel na ordem do calendário: P01 → P34 → P07. Segunda publicação da semana 2. Nada foi agendado ou publicado.

## Copy e ilustrações

- [Ficha editorial P07](../../../../postagens/01-p01-a-p10.md#p07): dor D07, reflexão com orientação. A referência de pesquisa V07 é um caso estrangeiro, não uma regra geral ou comprovação de resultado para todas as crianças.
- Sete slides: seis de conteúdo e um convite adicional para seguir o perfil. A conclusão sobre escutar o motivo de querer parar permanece no slide 6.
- Quatro ilustrações produzidas com o image_gen incorporado ao Codex. Pai e filha fictícios, sem uso de fotografia de aluno ou atribuição de identidade real. A cena de mostrar a etapa é usada nos slides 3 e 7. [Prompts](prompts.md).
- Os arquivos originais gerados foram preservados em `C:/Users/tocha/.codex/generated_images/01a1177a-9196-73f3-b995-b63ba3002ced/`. Cópias usadas na montagem: [capa](01-dificuldade.png), [duas possibilidades](02-possibilidades.png), [mostrar onde parou](03-mostrar.png), [escutar o motivo](06-escutar.png).
- Tipografia Nunito, licença OFL em [LICENSE-Nunito](LICENSE-Nunito). Texto composto em HTML/CSS, sem depender da tipografia das imagens geradas.

## Demonstração do jogo

- Base: `platformerExample`, Mini plataforma, em `packages/studio/src/official-extensions/game-2d/examples/foundations.ts`.
- Execução: `gameTwoDRuntime`, em `packages/studio/src/official-extensions/game-2d/runtime.ts`, com código gerado a partir do projeto por `generateProjectFiles`.
- Personagem: `EXAMPLE_HERO_IMAGE`, da biblioteca oficial em `game-2d/examples/shared.ts`.
- [Exemplo original exportado](mini-plataforma-base.json). Adaptação comum às duas versões: fundo claro, personagem oficial e duas plataformas com colisão real. Velocidade 4, força do salto 11 e gravidade 0,6 preservadas. As duas plataformas foram acrescentadas para tornar a comparação visível; não são apresentadas como recurso já existente no exemplo original.
- [Antes](mini-plataforma-antes.json) e [depois](mini-plataforma-depois.json): a única diferença entre as versões é a posição horizontal da plataforma de destino, x=240 → x=180. Largura, altura, ponto inicial, salto e demais regras são iguais.
- Ambas recebem as mesmas teclas de movimento e salto e são capturadas após 38 passos de física. O script da captura congela a execução nesse passo, sem modificar as regras dos arquivos de projeto exportados.
- [Medições](captura-real.json): antes, personagem x=216, y=131,8, sem apoio; depois, x=216, y=74, apoiado na plataforma de destino. Sem erros de execução. A comparação não usa dois tempos diferentes para fabricar o resultado.
- [Captura antes](jogo-antes.png) e [captura depois](jogo-depois.png): 960 × 600, correspondentes ao espaço lógico de 320 × 200 do jogo.
- As linhas tracejadas são anotações editoriais em SVG, traçadas a partir das posições registradas do centro do personagem. A linha começa no ponto inicial e termina pouco antes do personagem para não cobrir seu rosto. Não fazem parte da interface do Estúdio. Os PNGs de captura permanecem sem essas sobreposições.
- A demonstração foi preparada pela equipe; não é atribuída a um aluno. Nenhum código do aplicativo ou curso foi alterado.

## Entrega e reprodução

- [Montagem editável](../montagem.html), [prévia](../index.html), [legenda](../legenda.txt) e [texto alternativo](../texto-alternativo.txt).
- Sete PNGs 1080 × 1350 na pasta principal; publicar na ordem de 01 a 07. `previa.png` serve somente para conferência.
- Scripts em `output/instagram/p07-2026-10-13/`: `preparar-captura.ts`, `capturar-jogo.mjs`, `montar-carrossel.mjs` e `verificar-entrega.mjs`.
- [Verificação de layout](verificacao-layout.json) e [verificação da entrega](verificacao-entrega.json) registram as conferências finais.
