# Desafio do Primeiro Jogo · Dia 2 · A nave atira

## Resultado pedagógico

A criança parte do projeto entregue no Dia 1: tela 800 × 480, nave em (400, 410), 54 × 62,
estrelas e movimento no motor. No fim deste dia, a barra de espaço cria um tiro onde a nave
estiver, com som, que sobe e é retirado do grupo ao sair da tela. O Dia 3 recebe o grupo `tiros`,
raio 5, vx 0, vy −9, efeito `tiro` e a ordem mover → retirar → desenhar no motor. Só a cor do
tiro é livre.

São 12 seções e 11 vídeos planejados. Vídeo conceitual e experiência ocupam a mesma seção;
vídeo prático e Estúdio ocupam a seção seguinte. Cada conceito abstrato tem uma comparação
manipulável. O Zappy faz uma ponte curta por seção, sem recontar o vídeo ou a instrução dos
controles. A criança assiste ao vídeo e completa a experiência ou a atividade para avançar.
O quiz tem seção própria, sem vídeo; a entrega vem depois.

## Decisões críticas

| Questão | Decisão e motivo |
|---|---|
| Ao iniciar, Enquanto estiver rodando e Quando acontecer | Reusar `once-vs-always` com o preset `tres-caixas-tiro`: três lugares, uma ação e o botão de tecla. A criança compara espera, disparo no evento e inundação no motor. O vídeo usa a analogia concreta da campainha, sem ensinar o botão da cena. |
| Grupo de sprites | Não criar uma quinta experiência só para nomear o grupo. O Estúdio permite ver um único bloco movendo vários tiros; `cleanup` torna visível a coleção guardada. |
| Número escrito ou lido | `fixed-vs-read` é indispensável: as duas entradas parecem iguais no bloco, mas só a leitura acompanha a nave. O novo vídeo dá o modelo mental do endereço anotado e do endereço consultado *agora*; a cena deixa a criança testar. |
| x e y do tiro | As marcas da caixa na `fixed-vs-read` esclarecem centro x e borda de cima. O vídeo prático amplia o encaixe de blocos sobre os números. Não chamar a borda de “pontinha” do desenho. |
| Sinal da velocidade | O novo vídeo explica os eixos e o sentido do sinal; `velocity` permite comparar y negativo e positivo. A instrução não revela antecipadamente qual observação a criança terá. O caso começa no meio, com espaço para subir e descer. |
| Tiro fora da tela | O novo vídeo distingue invisível de removido com uma analogia; `cleanup` mostra cena e contador. Não afirmar que este jogo ficará lento: poucos disparos não reproduzem esse problema. |
| Ordem de desenho | O vídeo de mover/desenhar retoma o Dia 1: os tiros agora são desenhados depois da nave. Isso explica por que ficam à frente sem contradizer a lição anterior. |
| Palpite e pergunta | Palpite apenas quando testa uma crença útil antes da ação; não é porta de entrada para mexer na cena. Pergunta final, quando houver, exige a comparação observada, não o nome de um controle. |

## Percurso por seção

| # | Seção | Esquerda: vídeo e ponte | Direita: ação e conclusão |
|---|---|---|---|
| 1 | O primeiro disparo | `video-abertura`, mostra a vitória do dia | Assistir ao vídeo. |
| 2 | A terceira área | `video-terceira-area` parte da barra de espaço que ainda não dispara, relembra as duas áreas e explica o evento; Zappy convida a comparar | `experiencia-tres-areas`, preset `tres-caixas-tiro`: começar a partida, observar a espera, apertar a tecla e depois comparar com a ação no motor. Vídeo + experiência. |
| 3 | Grupo e evento | `video-montar-grupo-e-evento` apresenta uma nave versus muitos tiros e o grupo como saquinho antes da montagem; Zappy passa a vez | Estúdio: grupo `tiros` em Ao iniciar e evento de barra de espaço em Quando acontecer. Vídeo + critérios de projeto. |
| 4 | Escrito e lido | `video-escrito-e-lido` explica o endereço fixo e a leitura na hora; Zappy convida a testar | `experiencia-escrito-e-lido`: dois disparos de posições distintas com número fixo, depois com leitura, e marcas da caixa. Vídeo + experiência. |
| 5 | Criar o tiro | `video-criar-tiro`; Zappy convida a encaixar no projeto | Estúdio: centro x e posição y da nave no evento, raio 5. Vídeo + critério. |
| 6 | Sinal da velocidade | `video-sinal-da-velocidade` explica os eixos; Zappy convida a comparar | `experiencia-direcao`: testar y negativo e positivo a partir do centro. Vídeo + experiência. |
| 7 | Velocidade e som | `video-velocidade-som`; Zappy conduz à montagem | Estúdio: vx 0, vy −9 e efeito `tiro` depois do disparo. Vídeo + critérios. |
| 8 | Tiros voam | `video-tiros-voam`; Zappy aponta para o motor | Estúdio: mover e desenhar o grupo `tiros` a cada quadro. Vídeo + critérios. |
| 9 | O tiro saiu da tela | `video-tiro-fora-da-tela`; Zappy convida a olhar os bastidores | `experiencia-faxina`, preset `tiro-cima`: comparar tiros invisíveis ainda guardados e a regra de remoção. Vídeo + experiência. |
| 10 | Faxina | `video-faxina`; Zappy convida ao encaixe no meio | Estúdio: retirar quem saiu entre mover e desenhar. Vídeo + critérios. |
| 11 | Quiz | Uma fala curta do Zappy, sem vídeo | Duas perguntas sobre leitura da posição e remoção do grupo; só o quiz conclui. |
| 12 | Entrega | `video-teste-e-envio`, com teste em dois lugares, conferência, envio e fecho | Estúdio e critérios de entrega; vídeo + projeto concluem. |

## Auditoria das experiências

**Evento — `once-vs-always`, preset `tres-caixas-tiro`.** A cena não pode repetir apenas a
oposição do Dia 1. As metas são `on-event`, `key-fires` e `flood`: colocar a ação no evento e
começar o jogo sem tecla deve produzir espera; apertar a tecla produz um tiro; colocá-la no motor
e começar outra partida produz vários. A instrução pede a comparação sem enunciar os resultados;
o passo a passo fica nas pistas. O botão **Começar o jogo** fica depois da configuração, junto dos
demais controles. O relógio para sozinho após um teste curto, sem impedir o disparo pela tecla.

**Posição — `fixed-vs-read`.** O palco começa com a nave no meio e o número escrito 400.
Atirar, mover e atirar de novo deve deixar duas marcas no mesmo x (`same-spot`). Repetir com o
centro x da nave deve seguir a posição atual (`follows`). Ligar as marcas da caixa e atirar
com a leitura mostra o centro x e a borda de cima (`box-marks`). A criança precisa poder ver
marcas e nave ao mesmo tempo. O palpite sobre x 400 testa uma crença real; não cita o botão da
cena. O vídeo não entrega a resposta da experiência antes da criança observar.

**Direção — `velocity`.** O caso usa tiro como figura e cenário espacial; a preparação deixa
vx e vy zerados com margem nos dois sentidos. As metas `up` e `down` exigem experimentar os
dois sinais. O vídeo explica o modelo do eixo y, mas a instrução da cena manda comparar, sem
antecipar a observação. O projeto canônico volta a vy −9 na seção prática seguinte.

**Faxina — `cleanup`, preset `tiro-cima`.** O tiro sai por cima, não pelo lado; não há cacto,
chão nem sprite entrante. O contador de tiros guardados mostra o que a cena sozinha esconde.
A criança observa dois tiros saírem antes de ligar a regra (`invisible-stored`) e então verifica
a remoção (`rule-removes`). Palpite sobre invisível versus removido é útil porque testa a
concepção que motiva o bloco. O efeito não depende de prometer lentidão perceptível.

Nos quatro casos, o contexto (HUD e cena) fica acima ou à esquerda; a instrução permanece
próxima dos controles, abaixo ou ao lado conforme o espaço. No palpite só aparecem contexto,
pergunta e alternativas. O modo ampliado preserva a comparação simultânea entre cena e ação.

## Gravações

| Vídeo | Papel |
|---|---|
| `video-abertura` | Mostrar a vitória do dia. |
| `video-terceira-area` | Mostrar por que o tiro precisa esperar a tecla antes de nomear Quando acontecer e evento. |
| `video-montar-grupo-e-evento` | Recuperar uma nave/muitos tiros e a analogia do saquinho antes de criar o grupo e selecionar a tecla. |
| `video-escrito-e-lido` | Explicar número fixo e leitura atual, sem gesto de paleta. |
| `video-criar-tiro` | Mostrar os dois encaixes sobre os números; explicar o raio padrão 5 sem redigitar e deixar o tiro visível para depois do desenho do grupo. |
| `video-sinal-da-velocidade` | Explicar eixos e sinal antes da experimentação. |
| `video-velocidade-som` | Conferir vx 0 sem redigitar, escrever vy −9 e mostrar o efeito no evento. |
| `video-tiros-voam` | Mostrar mover/desenhar o grupo e a ordem das camadas. |
| `video-tiro-fora-da-tela` | Explicar invisível versus ainda guardado. |
| `video-faxina` | Mostrar a peça entrando entre mover e desenhar. |
| `video-teste-e-envio` | Mostrar teste, conferência, envio e fechamento. |

O [roteiro de gravação](desafio-dia-2.roteiro.md) traz fala e ação de tela de cada clipe.
Os clipes novos são planos de gravação, não mídias já publicadas. A fala deve nomear categoria,
subcategoria, seção da paleta, bloco e âncora de encaixe nos vídeos práticos. A barra de espaço
é a quinta opção do menu de teclas na versão atual; conferir isso novamente antes de gravar.

## Continuidade e revisão

O Dia 2 não altera introdução, certificado nem o projeto de entrada do Dia 1. Os campos x/y do
tiro leem a nave na hora do disparo; o grupo começa vazio em Ao iniciar. O motor continua com
limpar, estrelas, nave e, depois, mover → retirar → desenhar tiros. A cor do tiro é escolha da
criança; raio 5, vx 0 e vy −9 não são convite a mudar porque o Dia 3 os toma como ponto de
partida. Antes da publicação, conferir que as narrações gravadas correspondem aos vídeos
planejados e que a criança consegue completar a experimentação sem depender de texto narrado
que não esteja na página.
