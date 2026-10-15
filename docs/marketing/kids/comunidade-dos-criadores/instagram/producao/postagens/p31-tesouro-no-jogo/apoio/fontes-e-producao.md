# P31 · Um tesouro no jogo

Produção de 14/10/2026: sete slides em 1080 × 1350, com a copy integral da [ficha atual](../../../../postagens/09-p31-a-p40.md#p31). Série **Por trás do jogo**. Azul, creme e amarelo, Nunito 600/800. Convite para seguir no slide 7.

## Cenas e ilustrações

Quatro imagens novas geradas com `image_gen` nativo: duas cenas de família e duas ilustrações editoriais. [Prompts](prompts.json) e [origens](imagens-geradas.json).

- Capa: filho convida o pai a procurar o segredo no computador.
- Slide 2: esboço com dois possíveis esconderijos e uma pista luminosa. É uma ideia desenhada, não um mapa disponível no jogo.
- Slide 3: contraste entre um baú logo na entrada e outro atrás de várias paredes. Ilustração editorial; esses baús e paredes não são capturas do Meu Mundo.
- Slide 7: o mesmo pai joga; o mesmo filho observa atrás da cadeira, segurando o riso. Enquadramento diferente da capa.

Pai e filho são fictícios. Não são alunos, depoentes ou registros de uma família real. Não se atribui a autoria da demonstração à criança. As telas dos computadores nas fotos foram compostas pelo gerador usando capturas da nossa plataforma como referência. A comprovação das regras vem das capturas diretas nos slides 4–6.

## Capturas reais

Fonte: `meuMundoExample`, em `packages/studio/src/official-extensions/world-3d/examples.ts`, executado com o runtime atual da extensão Mundo 3D. Fonte dos avisos: Baloo 2, a padrão do jogo. Nenhuma alteração no aplicativo ou nos dados dos usuários.

Na cópia isolada para demonstração, o som do motor foi desligado e o aviso recebeu o acento em **Você**. Mantidos terreno, cenário, ponto secreto em x=35/z=-35, tecla E e regra original: mostrar a mensagem por três segundos e tremer a câmera com força 0,6 por 0,4 segundo. O bloco capturado recebeu a mesma correção de acento.

A posição e a direção do carrinho foram preparadas por `carPlace`; o período do dia foi escolhido por `setTime`. A câmera é a nativa de seguir o carro, rente ao terreno. Não há tomada de cima, água visível nem cenário desenhado sobre a captura. A distribuição do cenário foi fixada por uma semente para reproduzir os enquadramentos.

- Slide 4: manhã; o carro se aproxima e o pilar ciano aparece entre árvores. As passagens são os espaços do cenário, sem trilhas artificiais acrescentadas.
- Slide 5: dois momentos, antes e depois de apertar E. O recorte dos blocos vem do Blockly real e inclui tanto a mensagem quanto o tremor.
- Slide 6: nova partida à noite; o carro passa ao lado do pilar, ainda sem acionar a descoberta. O detalhe mostra a chegada e a mensagem após E. O movimento de passagem foi feito com W. O painel inicial terminou de desaparecer antes da captura.

As ampliações são recortes SVG dos PNGs reais, sem redesenhar o jogo. A seta entre as imagens e a borda amarela são elementos editoriais. O tremor foi acionado e registrado no teste; as artes são quadros estáticos, não reproduzem movimento.

## Verificação

- [Capturas verificadas](capturas-verificadas.json): posição, velocidade, texto antes/depois e chamada real de `cameraShake` após E. A passagem noturna não contém a mensagem da descoberta.
- [Blocos capturados](blocos-capturados.json): evento E, mensagem e tremor.
- [Montagem](verificacao.json): textos comparados com a ficha, fontes e imagens, limites e prévia móvel.
- [Entrega](entrega-verificada.json): dimensões dos PNGs, arquivos, links e legenda.

Scripts em `output/instagram/p31-2026-10-14/`. A pasta da entrega conserva os arquivos necessários para abrir a montagem localmente. Revisão editorial e verificação técnica não são um teste de conversão. Peça produzida para revisão, sem publicação ou agendamento.
