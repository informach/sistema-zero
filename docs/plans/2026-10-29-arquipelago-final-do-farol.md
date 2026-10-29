# Final no alto do Farol (fase4-11)

## Decisões propostas

- Entrada na Lenda, posição 8. Antes, um recado gentil pela voz adequada ao público. Sem custo, missão adicional ou prazo.
- O interior existente é uma sala separada, montada sobre o referencial do Farol a 40 m de altura. Esse afastamento é uma decisão de implementação, não a altura narrativa da torre. A passagem usa um corte, sem escada artificial nem carregamento das seis ilhas completas.
- A chegada usa a âncora `entrada`; a leitura usa `mesa`. O corpo anda na sala. As medidas do piso, paredes e mesa vêm do GLB. Colisores simples temporários ficam no código, conforme autorizado. O recurso é privado, baixado ao entrar e descartado ao sair.
- A página revela o segredo na voz da Íris. Depois, seis fachos aparecem na ordem do anel. A câmera parte da varanda e se afasta para enquadrar o arquipélago. Com menos movimento, usa a vista final fixa. Pausa interrompe a sequência.
- Só ao concluir a sequência a Íris aparece perto da casa. O morador genérico cuida de olhar, aceno, fala e piscar. As medidas saem do corpo e da cabeça do modelo, excluindo chapéu e braços estendidos.
- O progresso pertence à montagem do jogo, separado do salvamento. Reabrir a sala permite reler e rever. Visitas não iniciam o final. Nenhum estado externo ou banco é alterado.

## Pedido de salvamento futuro

Um booleano `finalDoFarol`, inicialmente `false`, registra a conclusão. O acréscimo JSON `,"finalDoFarol":false` ocupa 21 bytes UTF-8, ou 20 quando verdadeiro. Não foi acrescentado agora. A sessão responsável pela próxima versão deve confirmar o teto com o pior caso completo antes da migração. A leitura da página e a presença da Íris permanecem apenas nesta sessão.

## Pedidos de arte

- Em `alto-do-farol.glb`, acrescentar `col-piso-sala` (piso circular, raio 4,2, topo y 0), `col-parede-sala-*` (anel na parede existente, interior livre), `col-mesa-iris` (mesa no setor x negativo, z negativo), `col-base-lente` e `col-guarda-varanda-*` conforme as malhas existentes. Manter passagem livre entre `entrada` e `mesa`. Os colisores temporários de código serão substituídos numa tarefa posterior.
- Acrescentar `chegada` no piso livre junto de `entrada` (-0,95; 0; 0,85), `leitura` junto de `mesa` (-0,82; 0; -1,99), e `camera-varanda` junto de `varanda` (5,2; 0; 0), com orientação voltada para fora. As âncoras atuais permitem a implementação sem regenerar agora.
- Em `mundo/farol.glb`, separar a porta num nó com pivô de dobradiça se for desejada a abertura física animada. Nesta entrega, a porta ganha a ação de subir; não é alterada a malha fundida da torre.

Atendido em 29/10: `alto-do-farol.glb` traz os colisores (`col-cil-piso-sala-1`, `col-parede-sala-1..16`, `col-cil-grade-escada-1` no lugar da grade do vão, `col-mesa-iris-1` com a estante, `col-cil-base-lente-1`, raio 0,72, cobrindo também a lente que gira na altura da criança) e as âncoras `chegada` (-0,9; 0; 0,8: a posição pedida encostava na grade do vão, que agora colide), `leitura` e `camera-varanda`. O guarda-corpo da varanda não colide: a varanda fica fora das paredes e só a câmera vai lá. Os colisores temporários do código saíram (`prepararSala` lê os do arquivo). O `farol.glb` ganhou o nó `porta` com pivô na dobradiça, e a porta abre quando a criança chega perto com a Lenda aberta.

## Etapas

- [x] Regras puras, texto final e estado de sessão.
- [x] Sala, entrada e saída, colisores, câmera e seis fachos.
- [x] Íris, diário e voz adulta.
- [x] Testes, navegador em computador e celular, prints e revisão completa.
- [x] Documentação e commit local, sem push.

## Revisão e verificação

- A chegada inicialmente somava a posição da sala duas vezes depois da montagem. A conversão agora volta ao referencial do modelo antes de levar a âncora ao mundo, com teste de regressão.
- O foco automático no botão de descer capturava WASD. Apenas os painéis de leitura e final recebem foco automático.
- A névoa de exploração escondia o anel na vista final. A câmera panorâmica suspende a névoa somente durante essa vista, sem carregar ilhas completas. Sala, avatar e Zappy 3D ficam ocultos enquanto a câmera observa o anel.
- A física global pausa com painéis. A passagem abre a física no meio opaco do corte para aplicar o teleporte. A opacidade tem relógio próprio, pausável, com 600 ms de tempo ativo; não depende de uma animação CSS correndo durante uma pausa.
- Visitas e foto ficam indisponíveis no interior. A posição da sala e o cochilo automático não atravessam a passagem. O limite de tempo da plataforma continua funcionando.
- A primeira execução geral com o navegador simultâneo teve dois estouros de 5 s em testes de colisão da Vila e do Recife. Sem essa concorrência, a suíte passou: 973 testes, um pulado, nenhuma falha. Nenhum teste existente foi alterado para aumentar esse limite.
- A conferência inicial passou em computador e celular emulado: sala, página, pausa, seis ilhas, Íris, reentrada e saída. A rodada final acrescenta diário, porta antes da Lenda, falha de carregamento e memória, além dos prints sem névoa.
- Nenhum pedido de arte bloqueia este final: os colisores temporários foram autorizados na tarefa, e as âncoras existentes são suficientes. A abertura física animada da porta exterior fica para quando houver um nó separado.

Os resultados finais dos comandos e do navegador ficam também no README de `docs/qa/2026-10-29-final-farol/`.

### Ajustes da revisão visual e dos casos de borda

- O enquadramento panorâmico deixa as seis ilhas acima do painel de fala. Na sala em retrato, preserva pelo menos 46 graus na horizontal; o campo vertical varia de 65 a 110 graus, sem atravessar as paredes com a câmera.
- No celular, Descer fica abaixo da segunda linha do menu, a 120 px do topo. O verificador confere que os dois botões não se sobrepõem.
- Esc recebido durante o corte fica na fila e desce assim que a passagem termina, em vez de ser ignorado.
- A gravação de posição e o cochilo só voltam depois de terminar o corte e de o pedido de teleporte ser atendido pela física. O instante entre mudar a etapa e mover o corpo também fica protegido.
- A câmera guarda a pose anterior no começo do carregamento, antes de qualquer mudança na direção do corpo, e a restaura ao sair.

### Resultado da entrega

Entrada na Lenda, sala explorável, última página, seis fachos e volta da Íris implementados. Revisão completa concluída, com os problemas encontrados corrigidos. `bun test`: 975 passaram, 1 integração opcional com banco local pulada, nenhuma falha. `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`: passou. Biome: 24 arquivos conferidos, sem correções pendentes. `git diff --check`: passou.

O verificador passou em computador e celular emulado, com pausa, menos movimento, diário, reentrada, saída durante o corte e reserva após falha de carregamento. A comparação depois da reentrada ficou em 388 geometrias nos dois ambientes. Prints e medições estão em `docs/qa/2026-10-29-final-farol/`. Falta validar desempenho em celular físico. Os pedidos de arte e do campo futuro estão acima. Nenhum GLB nem formato de salvamento foi alterado. Entrega em commit e integração no staging local, sem push.
