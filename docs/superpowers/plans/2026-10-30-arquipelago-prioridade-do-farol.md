# A04: a orientação acompanha o final do Farol

Base: `9af68cb3e`. Escopo autorizado pelo achado A5 da auditoria de 30/10. Sem push, banco,
arte, formato de salvamento ou nova regra de progresso. Preservar os primeiros passos que
outra sessão integrou, seu estado e suas dicas pendentes.

A revisão foi atualizada para a base `8c89b2565`, incluindo os trajetos familiares e o
isolamento de ossos e materiais dos avatares que outra sessão integrou. A integração foi
fast-forward nesta worktree; os ajustes deste lote foram preservados.

## Decisão

`Hud` já calcula `noFarol` pelas etapas e pelo corte, mas só aplica isso a uma parte da tela.
Enquanto o final ocupa a cena, Agora, falas periféricas, rotina, mochila e tutorial cedem o
espaço à última página. Controles para andar/usar na sala, menu, tempo permitido e avisos de
salvamento continuam disponíveis. A própria tela do Farol já orienta página, fachos e fim.
Na sala, um lembrete no estilo do Agora aponta a mesa da Íris, sem inventar outra tarefa.
No celular, lembrete e botão de descer ficam numa coluna com 8 px de intervalo; o texto
pode quebrar a linha. A decisão vem da inspeção do print, que mostrou os dois se encostando.

O tutorial fica desmontado nesse trecho. Sua loja conserva fala, fila e progresso. A limpeza
retira somente guia 3D e indicação visual da HUD; não conclui, pula ou apaga passos. Ao voltar,
o componente retoma a leitura do estado real. A fala temporária do Zappy continua contando seu
prazo enquanto oculta, para não reapresentar um recado vencido ao descer. No menu do Farol,
o cartão de iniciar/rever os primeiros passos não aparece.

A revisão visual encontrou que o cartão do tutorial renovava um recado antigo ao remontar.
A loja agora carimba a expiração na emissão, fora do salvamento, e os dois cartões leem o
mesmo prazo. O teste reproduziu a falha antes da correção e verifica uma fala nova depois.

## Etapas

- [x] Acrescentar a orientação da mesa à sala do Farol. Suspender os elementos periféricos
  na HUD durante todas as etapas e o corte, preservando controles e painéis necessários.
- [x] Limpar `tela` ao desmontar os primeiros passos, além dos alvos 3D já limpos. Não alterar
  os dados de progresso. Ocultar o convite do tutorial no menu enquanto no Farol.
- [x] Provar que o tutorial conserva estado e fila ao desmontar e voltar. Ampliar o verificador
  real do Farol para conferir ausência de lembretes periféricos, presença da última página,
  menu durante a sequência e retomada das pendências ao sair. Incluir um cenário com tutorial
  ainda aberto, não só o perfil de teste que já o concluiu.
- [x] Navegador no computador e celular emulado, prints, suite completa, tipagem com 8 GB,
  Biome, revisão de diff e documentação. 1.308 testes aprovados, 1 ignorado, zero falhas;
  navegador completo e repetição específica dos recados aprovados. Evidência em
  `docs/qa/2026-10-30-prioridade-farol/`.
- [ ] Commit e merge no staging local.

## Limites

Não apagar lembretes ou progresso para organizar a tela. Não tornar o tutorial pré-requisito
do Farol e não alterar o acesso na Lenda. Não mudar a história final nem suas recompensas.
Sem pedido de arte. A validação física e a publicação remota continuam separadas.
