# Quadros completos e repertório da jornada

Parte L03 da entrega integral. Referência: `docs/desafios-do-jogo/conteudo-por-posto.md` e
proposta original do Arquipélago. Preparar arquivos validados não significa importar,
publicar ou alterar progresso. Nenhuma gravação em banco remoto nesta implementação.

## Decisões

- Conservar slugs dos principais e das variações já existentes. Preencher os quadros 1 a 5
  com atividades curtas, jogáveis e distintas, culminando no principal do quadro 6.
- Os primeiros quadros usam o repertório anterior ao posto da ilha. Conteúdo posterior fica
  condicionado às conquistas efetivas, nunca ao nível de bloco presumido nem a blocos manuais.
- Não copiar o gabarito do principal e remover uma linha cinco vezes. Cada atividade tem
  intenção própria, cenário pronto, comportamento inicial incompleto, gabarito e negativos.
- Reutilizar geradores do Estúdio e a arte embutida. Um auxiliar de autoria pode montar
  projetos e objetivos; não criar uma linguagem ou um executor paralelo.
- Objetivos executam as ações por teclado ou toque e observam o resultado. Cor e valores
  coerentes permanecem livres. Cenário pronto não é objetivo.
- Manifestos Kids e adulto têm slugs próprios e o mesmo exercício verificado. Não inventar
  identificadores de cursos; a análise publicada do Members resolve os vínculos reais.
- Manter os arquivos das variações diárias com sua finalidade. Duplicar uma variação diária
  como quadro não completa o conteúdo da proposta.

## Primeiro conjunto: Bosque

| Quadro | Atividade | Intenção | Pré-requisito |
| --- | --- | --- | --- |
| 1 | Vagalume aceso | Responder a uma tecla e mudar uma informação; reiniciar pelo extra | Eventos e informação do Faísca |
| 2 | O lanche do coelho | Coletar, lembrar e entregar só quando tiver o alimento | Coleta e condição do Faísca |
| 3 | Trilha das pegadas | Seguir uma sequência de três marcas, sem pular etapas | Informação e decisão do Faísca |
| 4 | Cuide dos quatro | Contar um cuidado por bicho, sem repetir o mesmo acerto | Grupo, contato e pontos da Nave |
| 5 | Travessia tranquila | Separar início, movimento, chegada e reinício | Estado de partida da Nave |
| 6 | Corrida dos bichos | Integrar movimento, sorteio, chegada única e nova partida | Repertório confirmado da Nave |

## Segundo conjunto: Vila Doce

Os cinco quadros anteriores à corrida aplicam os eventos, informações, condições e contadores
do Construtor. Não exigem pulo ou relógio: o resfriamento diminui uma unidade por atualização,
de 120 a zero, com o laço já ensinado e pronto no inicial. Não representa segundos. O principal existente permanece
com a dependência real dos seus blocos. Não liberar blocos pelo posto.

| Quadro | Atividade | Ação a completar | Erro que precisa ser recusado |
| --- | --- | --- | --- |
| 1 | O forno da vez | Escolher entre dois fornos e assar só no indicado | Assar no forno errado ou contar repetido |
| 2 | A caixa de pães | Entregar um pão por pedido e descontar o estoque | Entregar sem estoque ou descontar duas vezes |
| 3 | Suco na ordem | Laranja, água e servir, lembrando a sequência | Servir vazio ou pular a primeira etapa |
| 4 | O doce esfriou | Entregar só quando o resfriamento pronto terminar | Entregar quente ou contar duas vezes |
| 5 | Bandejas da padaria | Escolher quantidade e entregar exatamente o pedido | Aceitar falta ou sobra, sem limpar após o acerto |
| 6 | A corrida do entregador | Integrar movimento, prazo, contato e reinício | Mantém os negativos do principal existente |

Teclado e controles de toque do Jogo 2D, cenário SVG pronto, valores observáveis e extra Enter
para uma rodada nova. Os dois públicos recebem artefatos separados sem publicação automática.
Cada regra nova precisa de inicial negativo, gabarito positivo e alteração causal errada no
executor oficial. As outras ilhas recebem a mesma análise antes da autoria.

## Terceiro conjunto: Recife Coral

Os complementares reaplicam informações, eventos e condições já aprendidos antes do Explorador.
Não exigem Python ao entrar na ilha nem concedem blocos por posto. O principal Mira de bolhas
e suas três variações mantêm os slugs, projetos e regras existentes.

| Quadro | Atividade | Ação a completar | Negativo causal |
| --- | --- | --- | --- |
| 1 | A corrente muda | Alternar a direção da corrente a cada Espaço | Travar em uma direção ou mudar sem comando |
| 2 | Conchas por viagem | Levar até três conchas e descarregar a cesta inteira | Ultrapassar a cesta ou duplicar a entrega |
| 3 | Dois corais cuidados | Cuidar de cada coral uma vez, em qualquer ordem | Contar o mesmo coral novamente ou marcar os dois juntos |
| 4 | Uma bolha por vez | Iniciar uma bolha somente quando não há outra em voo | Repetir o disparo antes de a bolha voltar |
| 5 | A chave do navio | Pegar a chave e consumi-la ao abrir, uma única vez | Abrir sem chave, manter a chave ou repetir a abertura |
| 6 | Mira de bolhas | Integrar mira, voo, captura e pontos | Preserva os negativos já existentes |

Laço, cenário SVG, estado visível e controles de toque ficam preparados. A corrente e a bolha
têm movimento pronto, observado pelo executor, mas só os eventos que faltam são avaliados.
Enter é o extra de reinício. As duas comunidades recebem manifestos distintos, preparados
sem importar ou publicar. Cenários do executor devem rodar com gabarito, inicial e erros causais.

## Quarto conjunto: Pico Gelado

A entrada do Mestre reaplica habilidades anteriores. Este conjunto é uma opção em blocos
JavaScript já conquistados, junto do principal existente; não se apresenta como curso novo
Python nem concede blocos por chegar ao posto. Conteúdo textual Python pode ser publicado
separadamente quando vinculado ao curso correspondente. Não alterar os quatro desafios antigos.

| Quadro | Atividade | Ação a completar | Prova negativa |
| --- | --- | --- | --- |
| 1 | Pulo com apoio | Espaço pula apenas quando o chão dá apoio | Pular de novo no ar ou sem subir |
| 2 | Freio no gelo | Espaço encerra o deslize, para o corpo e conserva a parada | Continuar andando ou reiniciar a cada toque |
| 3 | Floco recolhido | Contato recolhe o floco e conta uma vez | Contar antes de tocar ou contar repetido |
| 4 | Mochila de neve | Adicionar cargas de 1 ou 2, até o peso total 4 | Aceitar uma carga que ultrapassa o limite |
| 5 | Passagem segura | Entrar depois que o bloqueio pronto some e só uma vez | Entrar antes da liberação ou repetir a travessia |

Movimento, chão, arte e controles fornecidos não são recompensados como autoria. Os objetivos
observam a ação que falta. Enter é o extra de nova rodada. Reutilizar os SVGs existentes do
Pico, sem posição absoluta disfarçada de velocidade ou blocos manuais. Cada conjunto terá
schema, repertório, ida e volta Blockly, executor real, negativos e gesto no celular emulado.
Os manifestos adultos são separados e ficam em rascunho, assim como os novos quadros Kids.

## Quinto e sexto conjuntos: Vale e Nuvens

Continuam como reaplicações em blocos JavaScript. O repertório efetivo é comparado com os
cursos anteriores, sem antecipar o ensino textual de JavaScript ou substituir Python. Nos
complementares, as ações pedidas usam somente essa lista. O `Para cada` ainda não consta
nas listas atuais: fica montado com corpo vazio em Vale 1/2 e Nuvens 5, seguindo o principal
do Vale. Testes exigem o mesmo grupo e item no inicial/gabarito e não permitem introduzir
outro laço. Não se concede esse bloco nem se declara seu ensino concluído. Na publicação,
a equipe deve conferir essa mediação e o vínculo curricular. As operações comuns
de autoria (IR, palco e objetivos) ficam em um helper de documentos, sem entrar no motor.

| Ilha e quadro | Ação | Negativo necessário |
| --- | --- | --- |
| Vale 1, Contagem da lista | Recontar os ninhos atuais percorrendo o grupo | Número fixo ou acumular a contagem anterior |
| Vale 2, Cinza retirada | Percorrer as três manchas e esconder todas | Limpar apenas uma ou apenas mudar o contador |
| Vale 3, Folhas bem usadas | Cobrir o ninho escolhido e consumir uma folha só no primeiro cuidado | Consumir de novo ou cobrir outro ninho |
| Vale 4, Uma onda por vez | Iniciar só fora de uma onda, esperar o final para repetir | Ondas sobrepostas |
| Vale 5, Rodada conferida | Fechar somente depois de processar os três ninhos | Fechar cedo ou somar a rodada duas vezes |
| Nuvens 1, Reserva de água | Guardar até três e gastar só quando houver água | Reserva acima do limite ou abaixo de zero |
| Nuvens 2, Luz na medida | Crescer só na faixa de luz de 1 a 3 | Crescer sem luz ou com luz acima da faixa |
| Nuvens 3, Canteiros livres | Plantar somente no canteiro escolhido ainda vazio | Plantio duplicado ou no canteiro errado |
| Nuvens 4, Dois recursos | Um passo usa água e adubo juntos para produzir | Produzir com um recurso ausente ou consumir só um |
| Nuvens 5, Colheita da lista | Colher a lista inteira retirando as flores, sem duplicar | Retirar só a primeira ou contar novamente |

Os SVGs vêm dos principais existentes. Os objetivos observam a lista, os recursos e os
estados reais, inclusive desenho quando esconder é a ação ensinada. Enter reinicia; Kids e
adultos têm manifestos separados, com todos os novos itens em rascunho. A publicação dos
quatro desafios Kids anteriores é preservada, sem importar arquivo em banco remoto.

## Verificação por conjunto

- [x] Bosque: dois JSON determinísticos e schema do contrato.
- [x] Bosque: blocos nas listas locais dos cursos declarados, sem escape de código.
- [x] Bosque: ida e volta pelo Blockly gera o mesmo programa.
- [x] Bosque, quadros novos: executor real aprova gabaritos e reprova iniciais e erros causais.
- [x] Bosque: importar, exportar e reimportar em memória, sem duplicação por público.
- [x] Bosque, quadros novos: navegador no computador e celular, capturas e instruções legíveis.
- [ ] Revisão integrada com lista e abertura reais do Quadro das Cores.

Evidência do primeiro conjunto em `docs/qa/2026-10-29-quadros-bosque/README.md`.
Vila Doce: os cinco complementares passaram por schema/repertório, Blockly, HTTP em memória,
tipagem, 20 cenários do executor oficial e 10 casos visuais por teclado/toque. Evidências em
`docs/qa/2026-10-29-quadros-vila/README.md`. Falta a abertura integrada pelo Quadro das Cores.

A revisão encontrou que os novos quadros e o principal do Bosque não indicavam uma atração,
necessária para o serviço guardar o projeto aprovado no fliperama. O manifesto agora declara
esse vínculo, sem alterar a recompensa de moedas ou o projeto jogável. A prova do serviço
continua separada da prova pedagógica.

Recife: 23 cenários do executor e 10 casos visuais aprovados; repertório até Inventor,
Blockly e HTTP em memória conferidos. Evidências em `docs/qa/2026-10-30-quadros-recife/README.md`.
Pico: cinco complementares, 25 cenários distintos do executor e 10 casos visuais. A revisão
corrigiu a exigência indevida de altura de pulo e a ausência de verificação da coleta visual.
Evidências em `docs/qa/2026-10-30-quadros-pico/README.md`.
Vale e Nuvens: cinco complementares cada, 42 cenários distintos no executor oficial e
20 casos de navegador com teclado/toque. A revisão corrigiu a forma de observar grupos e
a opacidade padrão. Registros em `docs/qa/2026-10-30-quadros-vale/README.md` e
`docs/qa/2026-10-30-quadros-nuvens/README.md`. Tipagem pós-fix em andamento.
Todos os seis manifestos de ilhas têm seis quadros, mas publicação, currículo real,
primeiro pedido da ilha central, conteúdo pós-Farol e integração no jogo ainda exigem aceite. Commit e push permanecem
reservados ao fechamento do programa integral, conforme a orientação da dona.
