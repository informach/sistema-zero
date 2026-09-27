# Nave Contra Asteroides · Dia 4 · O jogo passa a contar

## Resultado pedagógico

O jogo chega do Dia 3 com tiros, asteroides e colisão. Ao fim deste dia, cada acerto soma 1
na variável `pontos`, o placar lê esse valor, a nave começa com três vidas e uma batida tira
uma, com 45 quadros de proteção. O Dia 5 recebe as duas contagens separadas, ainda sem tela
de vitória ou derrota. Não prometer que o jogo já termina quando as vidas acabam.

São oito seções e sete vídeos planejados: três conceitos com experiências, duas montagens
guiadas, quiz isolado e entrega. Vídeo e atividade são necessários para concluir cada seção.
O Zappy aparece uma vez por seção como ponte ou tarefa, sem recontar os controles. O vídeo
prático mostra categoria, gaveta, bloco e âncora de encaixe; a experiência testa a ideia.

## Diagnóstico e decisões

| Questão | Decisão |
|---|---|
| Uma variável não é o mesmo que o número desenhado na tela. | `video-variavel` parte da pergunta concreta “como o jogo lembra quantos asteroides foram atingidos?” antes de apresentar a caixinha e nomear variável. `variable` deixa guardar, somar com placar escondido e só depois mostrar. |
| A proteção parecia corrigir dano múltiplo da mesma pedra. | O roteiro explica que a pedra atingida já saiu do grupo; os 45 quadros protegem contra as *próximas* pedras. `invincibility` compara 0, 45 e 15 sem revelar de antemão a contagem. |
| A prática de vida reúne muitos blocos. | Manter um clipe prático único como cadeia coerente — dar vidas, tratar colisão, desenhar corações — mas reservar tempo para zoom e pausas. Se a gravação real ficar longa demais, dividir a prática editorialmente antes de publicar; não pôr dois clipes na mesma seção. |
| A experiência de Ao iniciar × motor concluía após só a primeira metade. | Meta nova `lives-loop` exige que a criança também observe três batidas com a ação no motor. A conclusão só chega com `once` e `lives-loop`; teste de regressão cobre as duas metades. |
| Múltiplos balões duplicavam instruções e quiz dividia a entrega. | Uma fala curta após cada vídeo; quiz em seção própria antes de testar e enviar. |

## Percurso por seção

| # | Seção | Vídeo | Ação e critério |
|---|---|---|---|
| 1 | Abertura | `video-abertura` mostra pontos e corações | Assistir. |
| 2 | A caixa dos pontos | `video-variavel` explica guardar, mudar e mostrar | `experiencia-variavel` (`variable`): metas `stored`, `changed-hidden`, `shown`. Vídeo + experiência. |
| 3 | O acerto vira número | `video-pontos-e-placar` mostra a cadeia completa | Estúdio: criar `pontos=0` em Ao iniciar; somar 1 na colisão de tiro e pedra; desenhar `Pontos:` lendo a variável em x 12, y 30, tamanho 24. Vídeo + critérios. |
| 4 | O respiro | `video-protecao` explica a proteção contra próximas pedras | `experiencia-protecao` (`invincibility`): comparar 0, 45 e 15 quadros; metas `no-shield`, `window`, `expires`. Vídeo + experiência. |
| 5 | A batida machuca | `video-batida-e-coracoes` mostra as vidas e a colisão | Estúdio: três vidas em Ao iniciar; na colisão nave × asteroide, remover inimigo, explodir, tirar 1 vida com proteção 45 e tremer; corações em x 12, y 48, tamanho 22. Vídeo + critérios. |
| 6 | As vidas são dadas uma vez | `video-vidas-uma-vez` retoma preparação e motor sem mostrar as contagens das batidas | `experiencia-uma-vez` (`once-vs-always`, preset `uma-ficha-vidas`): observar perda com a ação em Ao iniciar e reposição no motor. Metas `once` e `lives-loop`; vídeo + experiência. |
| 7 | Quiz | Sem vídeo; uma ponte do Zappy | Duas questões sobre pontos e vidas; só o quiz conclui. |
| 8 | Entrega | `video-fecho` mostra dois acertos, duas batidas, conferência e envio | Estúdio, com critérios de todo o dia; vídeo + projeto. |

## Auditoria das experiências

**`variable`.** O palco precisa distinguir caixa guardada e valor visível. A criança guarda
um número, soma 1 com Mostrar placar desligado e só então liga a visualização. As três
metas são encadeadas: um toque inicial não deve satisfazer “mudou escondido” nem “foi
mostrado”. A fala não antecipa o resultado do teste; a pergunta de conclusão, se houver,
deve versar sobre a diferença entre guardar e mostrar, não sobre o nome do interruptor.

**`invincibility`.** Há três pedras agendadas nos quadros 1, 10 e 30. A comparação de
0, 45 e 15 quadros de proteção tem de deixar observáveis tanto a janela que bloqueia dano
quanto o fim dela. A experiência não deve dizer quantos corações sobram antes da ação;
mandar observar é suficiente. A pedra que bate é removida, por isso a explicação não pode
atribuir as perdas seguintes à mesma pedra.

**`once-vs-always`, preset `uma-ficha-vidas`.** A cena usa nave e asteroide no céu estrelado,
sem chão. A criança coloca Dar três vidas à nave em Ao iniciar e começa o jogo: nas batidas,
as vidas diminuem (`once`). Ela então coloca a ação no motor e começa uma nova partida:
as vidas voltam a encher enquanto o jogo roda (`lives-loop`). Cada teste para automaticamente
após três batidas. A faixa mostra duas
metas e a avaliação não conclui após a primeira. O teste do motor confirma a não-conclusão
intermediária e a conclusão depois do contraste. O checkpoint antigo apenas repetia a
decisão já observada e foi retirado.

O contexto de cada experiência (HUD e cena) precede a instrução, que fica junto aos
controles; em largura suficiente, cena à esquerda e instrução/controles à direita. No
palpite, não expor controles inativos. Em modo ampliado, preservar a vista simultânea
do resultado e da ação.

## Gravação e continuidade

`video-variavel`, `video-protecao` e `video-vidas-uma-vez` ainda são planos de clipe.
O [roteiro](nave-contra-asteroides-dia-4.roteiro.md) registra narração e enquadramento; conferir a
gravação antes de importar como aula publicada. O vídeo prático da batida deve falar
os nomes atuais dos blocos e mostrar o campo dos 45 quadros. A tremida é retorno visual,
não dano extra. Na entrega, dois acertos elevam pontos de 0 a 2; duas batidas apagam
dois corações e não reduzem pontos. Mostrar as duas contagens no mesmo enquadramento.

Valores canônicos para o Dia 5: `pontos=0` na partida, soma de 1 por acerto, rótulo
`Pontos:`, placar (12, 30, 24), três vidas, dano 1, proteção 45, corações (12, 48, 22),
apelido `inimigo`. Cores de placar, corações e explosão são livres se tiverem contraste
com o fundo. Esses números, o rótulo do placar e o estilo corações já vêm nos blocos: os vídeos
os conferem sem mandar redigitar. Já os campos de sprite de Dar vidas, Machucar e Desenhar vidas
precisam ser trocados de `jogador` para `nave`. A introdução e o certificado são do Desafio do Primeiro Jogo, não deste curso.
