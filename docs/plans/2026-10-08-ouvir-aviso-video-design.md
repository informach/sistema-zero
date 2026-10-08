# Ouvir a orientação antes do vídeo

O aviso que pede para assistir ao vídeo também precisa atender quem ainda tem dificuldade
para ler. Acrescentar **Ouvir** abaixo da explicação, preservando **Ver o vídeo** como ação
principal. O áudio lê o título e a explicação, sem narrar o percentual assistido.

Usar a voz própria do Zappy (`uj19ZrP8mFHr1twXk7aq`), gravada uma vez e distribuída com o
app Kids. A voz do navegador variaria entre aparelhos; gerar a fala a cada clique acrescentaria
espera e custo a um texto fixo. O botão existente `ZappyOuvirButton` já oferece reprodução,
parada, tratamento de erro e foco de mídia compartilhado com o vídeo.

O som começa somente por toque. Durante a fala o botão mostra **Parar**. Iniciar o vídeo,
trocar de parte, liberar a atividade ou sair da página encerra a fala. Ouvir a orientação
não conta como assistir ao vídeo nem muda a regra de liberação. A atividade permanece montada.

O shell recebe a URL pelo contexto do player. O Kids fornece o MP3; o player adulto conserva
o aviso atual. O texto em `member-shell/src/lib/video-gate-copy.ts` corresponde ao registro de
geração em `community-kids/src/lib/zappy-video-gate-voice.json`; um teste evita divergência.
Alterar texto ou voz exige gerar outro arquivo com nome novo, por causa do cache de `/zappy/`.

Validação: testes do aviso e do foco de mídia; reprodução do MP3 real no Chromium; aviso
inteiro visível a 390 px; suites, tipos, lint e builds dos dois apps consumidores do shell.

Na revisão, o CI encontrou o botão de vídeo coberto pelo rodapé quando surgia o percentual
assistido. A reprodução local mediu o cartão 81 px além da altura reservada. Aviso e atividade
passaram a ocupar a mesma célula de grid, cuja altura acomoda o maior dos dois, preservando
a montagem do jogo. O teste confere essa reserva e os cliques reais após aparecer o progresso.
