# P08 · Uma derrota não conta tudo

Produzido em 15/10/2026. Sétima imagem única do calendário, segunda publicação da semana 11. Série Por trás do jogo. D08 é hipótese: uma dificuldade pode levar a criança a dizer que não é capaz. O corpus não mediu a frequência dessa fala nas famílias. Público: pais e responsáveis por crianças de 9 a 14 anos. Objetivo: atração e convite para seguir.

## Copy e composição

[Ficha vigente](../../../../postagens/01-p01-a-p10.md#p08), [calendário](../../../../03-postagens.md), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy extraída](copy.json) e [legenda integral](../legenda.txt). Os dois parágrafos da arte e toda a legenda foram preservados. O bloco aparece abaixo da captura, ocupando a largura da arte para leitura; esse ajuste de disposição está registrado na ficha. Sem nota, caderno, criança triste ou atribuição da frase hipotética a aluno real.

A legenda propõe reconhecer o que funcionou e investigar a parte difícil. Explica uma mudança concreta nas regras da batalha. Não transforma uma dificuldade em diagnóstico nem promete melhora de autoestima. O exemplo é da equipe, não um curso ou resultado de aluno. [Linter aplicado à copy limpa](copy-linter.json), além da revisão editorial. A régua de vinte palavras se aplica à copy principal; os dizeres adicionais são conteúdo da interface real solicitada na ficha.

Paleta azul, branca e amarela; [Nunito](LICENSE-Nunito) 600 e 800. Gancho de 100 pixels, frase de apoio de 67 pixels. Margens laterais de 64 pixels. O bloco real ocupa 920 pixels de largura. A captura do Dragão mantém o nome do personagem, Dragao, como aparece na interface, sem redesenhar o texto. Exportação em sRGB, 1080 × 1350, 4:5.

## Demonstração e regras

Fonte: packages/studio/src/official-extensions/game-2d-advanced/examples/oChefaoExample.ts. Exportação por generateProjectFiles, execução com gameKitRuntime. [Origem e hashes](origem-jogo.json), [IR original](projeto-original.json), [IR da demonstração](projeto-com-visual.json) e [código exportado](projeto.js).

Adaptações locais: acrescentar a imagem ao Dragão; normalizar o destinatário dos golpes Investida e Curar de Voce para Você, nome usado pelo runtime. Sem essa normalização, os dois golpes já previstos no exemplo não aparecem no menu do herói. Nenhum arquivo da aplicação foi alterado. Os atributos, danos, condições e composição das equipes permanecem iguais. O time aliado contém somente o herói; os inimigos são Lacaio e Dragão.

O Dragão começa com 160 de vida. Enquanto sua vida não fica abaixo da metade, usa Garra; com vida menor que 80, executa o ataque ao time inteiro, com dano-base 22. A comparação usa menor que, não menor ou igual. A captura mostra 70 de 160, ou 43,75% da barra.

[Execução verificada](jogo-verificado.json): treze ações do jogador, com ataques e curas pelo menu; Lacaio derrotado antes de enfrentar o Dragão. O quadro foi capturado após o golpe que reduz a vida de 83 para 70, antes da resposta do Dragão. A execução continuou e confirmou a chamada rpgFoeHitAll, que derrota o herói nessa tentativa. Não há vitória ou superação inventada.

Os sorteios foram fixados no ponto médio para reprodução. A instrumentação lê o estado e registra as chamadas, sem atribuir valores de vida ou executar ataques pelo jogador. A captura ampliada usa a posição e a escala reais do canvas; exclui título do menu, mensagem de batalha, painel de informação e diálogo. [Captura completa](batalha-completa.png), [recorte usado](dragao-abaixo-da-metade.png).

## Visual e bloco reais

[Asset do Dragão](dragao.png), criado com image_gen.imagegen em fundo transparente. [Prompt, origem e hash](imagem-gerada.json). Personagem fictício original, sem fotografia ou referência licenciada. O asset foi carregado pelo bloco de adicionar chefão e desenhado pelo runtime. Não foi gerada uma tela falsa do jogo.

[Recorte do bloco](bloco-ataque-real.png) renderizado com Blockly, tema szTheme e renderer zelos, a partir do IR original. [Registro do bloco](bloco-capturado.json): sz_gk_rpg_foe_hit_all, alvo Dragao e dano 22. O texto não foi recriado em uma forma que imita a interface.

## Entrega

[PNG final](../01-p08.png), [prévia com legenda](../index.html), [prévia PNG](../previa.png), [montagem editável](../montagem.html), [texto alternativo](../texto-alternativo.txt), [publicação](../publicacao.txt), [checagem da montagem](verificacao.json) e [verificação final](entrega-verificada.json).

Conferidos copy, legenda, asset, execução, vida real do chefão, troca de ataque, bloco e parâmetros, margens, fontes, dimensões, links e prévia móvel. Scripts em output/instagram/p08-2026-10-15. Sem ZIP, publicação ou agendamento. Estado: 30 carrosséis com 220 PNGs e sete imagens únicas, totalizando 227 PNGs em 37 publicações. Próxima imagem única: P29, terceira publicação da semana 12.
