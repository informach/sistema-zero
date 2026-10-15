# P20 · Conversas sobre jogos

Produção de 14/10/2026: sete slides em 1080 × 1350, com a copy integral da [ficha atual](../../../../postagens/02-p11-a-p20.md#p20). Série **Teste em casa**. Paleta azul, branca e amarela, Nunito 600/800. O convite para seguir permanece no slide 7.

## Pessoas, papel e telas

Cinco fotografias novas, geradas com `image_gen` nativo. Mãe e filha são fictícias, com continuidade de fisionomia, roupa, ambiente e relação entre as cenas. Não representam clientes nem um depoimento. [Prompts](prompts.json) e [arquivos de origem](imagens-geradas.json).

- Capa: menina conta uma ideia, mãe escuta, notebook com a demonstração da plataforma.
- Slide 2: enquadramento próximo da tela e da mão, mostrando o que a menina explica.
- Slide 3: mãe pergunta; filha volta o olhar para ela.
- Slide 4: desenho de fase com um buraco, arco de salto e um inimigo; a menina explica uma escolha.
- Slide 7: ambas sorriem olhando o desenho.

A captura real do jogo foi fornecida como referência de composição para as telas dos notebooks dos slides 1 e 2. As telas fazem parte da fotografia gerada; não são a fonte usada para comprovar regras do jogo. Não foram acrescentados menus, produtos de terceiros ou funcionalidades. A prova do funcionamento está nas capturas diretas dos slides 5 e 6.

O desenho da menina é uma ilustração da conversa. A demonstração digital é da equipe e não é atribuída à personagem fictícia.

## Demonstração real da plataforma

Fonte: `mundoDeBlocosProfissionalExample`, em `packages/studio/src/official-extensions/game-3d-advanced/examples.ts`. Referência técnica: `__gen_mundoProfissional.ts` no mesmo pacote. Projeto gerado e executado com o runtime atual, sem alterar o código do aplicativo nem dados de usuários.

Foi usado o **Mundo de Blocos Profissional**, em terceira pessoa. A versão básica não foi usada. O clique no chão perto do personagem criou um bloco de grama em x=0, y=0, z=8. O bloco nasce no chão e não foi empilhado. Ele oferece apoio a 1,2 unidade de altura; a muralha tem 2,4.

A posição inicial do personagem e os ângulos de câmera foram preparados para enquadrar a ação. O clique que cria o bloco é real, processado pelo jogo. Para demonstrar o apoio, o personagem foi posicionado em queda baixa sobre o bloco e pousou pela física. Daí, espaço e W fizeram o salto até a muralha. Ao pousar acima de 2,2, o programa acionou a vitória. Cores, geometria, alcance, alturas, controles, colisões e condição de vitória foram preservados.

O slide 5 amplia a parte relevante da captura com um viewport SVG; isso retira as bordas e os indicadores periféricos, sem redesenhar o jogo. O slide 6 usa um segundo ângulo, com o personagem no topo. O painel de vitória foi ocultado apenas na captura de apresentação para deixar o cenário visível. A [captura completa da vitória](06-vitoria-completa.png) conserva a tela original “Chegou ao topo!”.

A [regra de vitória](06-regra-vitoria.png) foi renderizada pelo Blockly real. A conjunção foi disposta em duas linhas usando a opção nativa de organização das entradas, para leitura. As duas condições estão presentes: altura maior que 2,2 **e** apoio firme. O recorte conserva as ações de som e mudança para vitória; apenas os controles de edição inferiores ficam fora do enquadramento.

## Verificações

- [Capturas verificadas](capturas-verificadas.json): um bloco criado pelo clique; apoio em y=1,2; pouso em y=2,4; estado de vitória e painel visível.
- [Blocos capturados](blocos-capturados.json): condição completa e ações reais.
- [Verificação de montagem](verificacao.json): sete slides, textos comparados à ficha, fontes e imagens carregadas, limites de layout e prévia móvel.
- [Conferência de entrega](entrega-verificada.json): dimensões dos PNGs, arquivos e links locais.
- Legenda conferida pelo linter de Light Copy, sem ocorrências mecânicas; revisão editorial preservou a copy aprovada. Isso não é um teste de conversão.

Scripts da produção em `output/instagram/p20-2026-10-14/`. A montagem HTML usa apenas os arquivos locais da pasta de entrega. Nenhuma publicação, agendamento, automação, commit ou deploy foi feito nesta produção. Sem ZIP.
