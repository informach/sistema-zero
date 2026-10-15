# P42 · Combinar o que fica pronto

Produção local em 14/10/2026. Sete slides de 1080 × 1350, 4:5, sRGB. Segundo post da semana 14, série Tradução de criança, desejo W12. A proposta é definir um resultado e conferir o que falta; não extrapola a experiência para todas as tarefas da criança.

## Copy e direção

[Ficha vigente](../../../../postagens/10-p41-a-p50.md#p42), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json), [legenda](../legenda.txt) e [verificação da montagem](verificacao.json). Texto integral dos sete slides e legenda preservados.

Cinco imagens selecionadas pela ferramenta nativa image_gen.imagegen. [Prompts completos e referências](prompts.json), [origens e hashes](imagens-geradas.json). Todos os originais permanecem no diretório de geração; as imagens selecionadas foram copiadas para esta pasta. A capa serviu como referência de identidade para as cenas 3 e 7. Família totalmente fictícia, sem identificação de aluno real. Nenhuma foto se repete entre slides.

Papéis gerados em branco, com texto aplicado em HTML/SVG na montagem: frações equivalentes no caderno, lista antes da tarefa, bilhete com dois itens conferidos e marca final. Fontes [Nunito](LICENSE-Nunito) e [Caveat](Caveat-OFL.txt). Não são certificados, notas ou resultados de aluno. [Descrições completas](../texto-alternativo.txt).

## Demonstração real do jogo

Base: packages/studio/src/official-extensions/game-3d/examples.ts, cacaEstelarBasicoExample, e runtime nativo Jogo 3D. [IR original](caca-original.json), [código original](caca-original.js), [IR da demonstração](caca-demonstracao.json), [código da demonstração](caca-demonstracao.js), [fonte da adaptação](adaptacao-visual.js).

O exemplo básico representa naves com cubos. Para tornar a ação reconhecível na arte, a demonstração usa modelos de naves montados com createModel, createBlock e addToModel, todos recursos nativos da plataforma. Também foram adicionadas linhas decorativas no piso e luz mais clara. As adições foram convertidas em IR e executadas pelo mesmo gerador e runtime. Não há interface ou nave desenhada por IA sobre o jogo. A aparência é uma adaptação desta demonstração, não a aparência padrão do exemplo.

Da criação do enxame em diante, o código gerado é idêntico ao original: posição inicial, movimento, proximidade de disparo e colisão, três escudos, placar, reinício e condição pontos >= 10. A captura não atribui pontos nem escreve estados de vitória. A automação joga usando setas e espaço. Um observador somente de leitura registra posições, placar e estado de execução. Frames intermediários não são renderizados para evitar fila de GPU; a lógica continua a cada quadro e o renderizador nativo desenha o estado capturado. [Estados e evidências](capturas-verificadas.json).

Slide 5: captura aos quatro pontos com inimiga ainda presente. Slide 6: nove pontos, partida em andamento e inimiga presente; dez pontos, partida encerrada com Ás dos céus! e Naves abatidas: 10. O placar permanece visível mesmo na vitória. Contadores, arena e quadro de vitória são recortes dos PNGs reais, ampliados na montagem. Os títulos externos do comparativo são editoriais. Nenhuma vista de jogo é repetida entre slides.

Captura local com Playwright headless. Sem conta real e sem alteração do código da aplicação. Scripts reproduzíveis em output/instagram/p42-2026-10-14/: preparar.ts exporta o original e compila o runtime; visual.ts produz a adaptação visual e verifica igualdade das regras; capturar.mjs joga e captura. A montagem usa montar.mjs e elementos.txt.

## Entrega

[Prévia](../index.html), [montagem editável](../montagem.html), [publicação](../publicacao.txt), [verificação final](entrega-verificada.json). Conferência editorial, visual e funcional da demonstração. Não é teste de conversão. Não publicado ou agendado. Próximo carrossel: P25, primeiro post da semana 15.
