# A casca isolada no staging: conferência no app de verdade (20/11/2026)

Etapa 4 do plano de 20/11. Chrome de mesa no Windows (o Chrome conectado), logado no staging com a
conta da equipe. App adulto (`community-staging-66f2.up.railway.app`) e Kids
(`community-kids-staging.up.railway.app`, perfil de teste Construtor(a), este navegador autorizado
só por hoje, "QA casca 20-11"). Casca do Worker de staging
(`sistemazero-studio-runtime-staging.helena-bcc.workers.dev/v1/classic-shell/1.html`).

## O que foi conferido

| Conferência | Resultado |
|---|---|
| A prévia está na casca de outro site (adulto e Kids) | sim: o iframe "Pré-visualização" aponta para a casca, sem `srcdoc` |
| O jogo roda e fala com o editor | sim: palco verde e "oi da casca de staging" nas Mensagens do jogo |
| Programa hostil (30 s de trabalho síncrono que não é laço) | editor respondendo: maior atraso do relógio **54 ms** em 3 s de medição; o aviso "O preview parece travado" apareceu |
| Parar com o jogo preso | o botão voltou a "Rodar" em até 1 s; editor a 51 ms depois |
| Conserto com o travamento AINDA em curso | o conserto rodou 3 s depois do início do programa hostil (que iria até 30 s) |
| Recarregar 50 ms depois de Rodar | o último código voltou inteiro e rodou sozinho na reabertura |
| Jogo 3D (A Ilha do Farol, Kids) na casca | roda com os modelos; editor a **55 ms** com o 3D rodando |
| Teclas com clique no palco | chegam ao jogo ("tecla ArrowUp", "tecla d") |
| **Teclas depois de Rodar, sem clicar no palco** | **não chegavam** (ver abaixo) |
| Zappy no Estúdio adulto | **não abria a conversa** (ver abaixo) |

## Defeitos achados e consertados

1. **As setas não chegavam ao jogo depois de Rodar.** O editor põe o foco no quadro da casca e a
   casca troca o quadro do jogo a cada documento. Ela recebia o evento `focus` enquanto o navegador
   ainda levava o foco até ela e passava o foco ao jogo na mesma hora; o foco terminava de volta na
   casca. `contentWindow.focus()` também não serve (o navegador ignora sem gesto num quadro de origem
   opaca). Conserto `590c6ff48`: a casca foca o ELEMENTO do jogo na tarefa seguinte; e2e novo em
   `preview-shell.spec.ts` (falhava antes, passa agora).
   ⚠️ A página da casca é servida pelo Worker, e o Worker confere o rótulo do perfil de validação
   contra o da imagem do contêiner (`studio-runtime/src/index.ts`, relatório de tipos). Publicar só o
   código do Worker quebraria a validação do Pro; o conserto chega ao staging no próximo ciclo de
   imagem qualificada (construída e testada no CI, enviada ao registro, Worker publicado com a
   referência por digest). **Até lá a casca foi desligada no staging** (`STUDIO_CLASSIC_SHELL_ENABLED=0`
   nos dois apps, deploy em `590c6ff48`): sem ela, a prévia direta já foca o jogo depois de Rodar.
2. **Zappy do Estúdio adulto.** As rotas `/api/studio/zappy` (histórico) e `/messages` (envio) estavam
   trocadas no app adulto em relação ao Kids e ao adaptador (405 nas duas), e `/api/members/ai-credits`
   não existia. Conserto `847f4369c` com teste que trava as cinco rotas iguais às do Kids.

## Não conferido aqui

- Vídeos da aula com a casca ligada (a casca foi desligada antes dessa parte; ela não mexe nos
  cabeçalhos da página, e o Firefox de mesa isola sem COEP: `2026-11-20-studio-firefox-site-isolation.md`).
- Firefox e Safari de verdade com a casca (os ensaios do CI cobrem Chromium e Firefox com a
  preferência do Firefox de mesa; WebKit segue o estudo B4).
- Troca de perfil com gravação em voo no app.
