# P40 · Explicar o caminho

Produção de 14/10/2026. Sete PNGs em 1080 × 1350, com a copy integral da [ficha atual](../../../../postagens/09-p31-a-p40.md#p40). Série **Teste em casa**. Paleta azul, creme e amarelo; Nunito 600/800. Chamada para seguir no slide final.

## Cenas e continuidade

Cinco imagens novas feitas com `image_gen` nativo: mapa editorial e cenas de explicação, dúvida, desenho e teste. [Prompts](prompts.json) e [origens das imagens](imagens-geradas.json).

Mãe e filho são fictícios, com a mesma fisionomia, roupas e ambiente entre cenas. Não são depoentes ou alunos reais. O mapa também é fictício: uma casa amarela, uma esquina com árvore e o portão da escola. Não contém nome, endereço nem localização real de aluno. A folha mantém o mesmo trajeto; cada imagem apresenta uma ação e um enquadramento diferentes.

- Slide 1: menino explica o trajeto à mãe.
- Slide 2: mapa com os rótulos editoriais **Começo**, **Esquina** e **Portão**, aplicados na montagem.
- Slide 3: duas mãos indicam locais diferentes, esquina e escola.
- Slide 4: novo enquadramento da mão terminando o desenho, ligado por uma seta à captura real da corrida.
- Slide 7: o mesmo menino usa o computador; a tela foi composta pelo gerador a partir de uma captura real do Estúdio com a corrida e seus comandos.

A fotografia da tela não é a prova das regras do jogo. A demonstração digital é da equipe; não se atribui sua autoria ao menino fictício. A [captura original do Estúdio](07-estudio-real.png) foi guardada junto do [recorte nativo dos comandos](07-blocos-corrida.png).

## Demonstração da plataforma

Fonte: `corridaExample`, em `packages/studio/src/official-extensions/world-3d/examples.ts`, executado com o runtime atual do Mundo 3D. O Estúdio foi aberto no playground local em um contexto de navegador isolado; nenhuma conta de aluno ou projeto real foi alterado.

Na cópia de captura, o som do motor foi desligado e o título recebeu o acento em **Pôr**. As posições dos cinco pontos, as duas voltas, o cenário, a física e a regra de passagem em ordem foram preservados. Fonte do indicador: Baloo 2 nativa do jogo.

Ordem real: (60,40) → (40,0) → (20,-60) → (-20,-20) → (-10,30). Os números nas artes correspondem exatamente a essa sequência. O teste posicionou o carro nos pontos usando `carPlace` e deixou o runtime processar cada chegada; não escreveu diretamente o estado da corrida. O cronômetro mostra o tempo desse teste preparado, não um tempo de jogador.

Após passar pelo segundo e ir ao quarto, o indicador continuou em **ponto 3/5 · volta 1/2**. **Ponto 3/5 significa próximo ponto exigido, não três pontos já concluídos.** Ir ao quinto sem passar pelo terceiro também não completou a volta. Retomar o terceiro, o quarto e o quinto, em ordem, levou à segunda volta.

## Enquadramento e edição

O slide 4 usa a câmera nativa atrás do carro. Para enquadrar os cinco anéis juntos no slide 5 e o terceiro/quarto no slide 6, a cópia isolada do runtime recebeu um ajuste de câmera para produção. Esse enquadramento elevado não é apresentado como controle disponível ao aluno. A instrumentação também lê o estado e projeta as posições reais dos anéis; não modifica regras, posições de objetos ou contadores.

As setas, números e linhas de chamada são anotações editoriais sobre capturas reais. A seta amarela acompanha a ordem dos pontos, não uma trilha desenhada no terreno. Nenhum anel foi acrescentado ou reposicionado na edição. Os recortes SVG apenas ampliam partes dos PNGs.

No slide 6, o indicador original foi capturado com densidade de pixels maior e ampliado para leitura. Seu texto não foi redesenhado. As marcações **3** e **4** identificam o anel pendente e aquele em que o carro foi colocado fora da ordem.

## Conferência

- [Capturas e estados](capturas-verificadas.json): ordem, posições, indicadores e volta incompleta/completa.
- [Comandos capturados](blocos-capturados.json): criação da corrida e cinco checkpoints reais.
- [Montagem](verificacao.json): texto igual à ficha, fontes e imagens, margens e prévia móvel.
- [Entrega](entrega-verificada.json): sete PNGs, dimensões, arquivos, links e legenda.

Scripts da produção em `output/instagram/p40-2026-10-14/`. As imagens, fontes e referências necessárias à montagem estão na pasta da entrega. Revisão editorial e verificação funcional não são teste de conversão. Peça produzida para revisão; sem publicação ou agendamento.
