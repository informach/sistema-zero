# Verificação de navegação 3D hospedada — 27/10/2026

Na imagem anterior, o jogo correto da Ilha reprovou por indisponibilidade: o personagem não chegava ao alvo no prazo no contêiner de meio vCPU. O mesmo comportamento foi reproduzido em contêiner local limitado. A redução experimental da resolução não resolveu, e duas páginas 3D simultâneas voltaram a falhar; essas alternativas foram descartadas.

O verificador usa pulsos de teclado adaptados ao deslocamento observado, com limite de duração, preservando as entradas e a velocidade do jogo. Só as verificações que incluem navegação 3D usam o novo contêiner dedicado `standard-4`, limitado a 10 instâncias; os demais continuam no `standard-1`. O contêiner maior tem custo maior enquanto ativo e sua concorrência é limitada: acompanhar uso e latência antes de ampliar. A seleção falha fechada se o recurso dedicado não estiver configurado.

Quando o objeto não se move, a reprovação só é registrada se a cena avançou ao menos quatro quadros; sem essa evidência, ou quando houve movimento mas o prazo acabou, continua sendo indisponibilidade do executor. Assim, uma infraestrutura lenta não vira reprovação da criança por simples expiração.

Na configuração experimental de staging, o jogo correto passou os sete objetivos em 42,5 s; o jogo sem movimento foi reprovado nos sete em 43,5 s, com HTTP 200. Uma prova JavaScript de build e validação no contêiner comum também passou. O tempo de verificação continua alto e deve ser medido com outros jogos e computadores; não equivale à homologação de todo o Estúdio. Testes locais cobrem a escolha do contêiner, velocidades diferentes, ausência de quadros e leituras lentas. A imagem e o Worker finais devem ser implantados juntos com o perfil gerado e testados novamente.

## Atualização de 28/10/2026: o robô segura a seta e espera o jogo ficar pronto

Medido no Chromium sem placa de vídeo, com as artes do Jardim Secreto refeitas no Blender: cada
comando do robô (ler a posição, apertar ou soltar uma tecla) espera um quadro, ~170 ms, e a
abertura de um jogo 3D trava os quadros por 4 a 6 s quando os modelos chegam (o primeiro desenho
com tudo montado). Os toques curtos gastavam a maior parte do prazo em idas e voltas, e as teclas
apertadas durante a trava não andavam nada: um jogo certo reprovava, ou ficava no limite.

- `check-approach-3d.mjs`: num trecho longo (mais de 1,2) a seta fica apertada e o robô acompanha
  a posição, soltando antes do ponto pela velocidade medida e pela demora da leitura (duas
  leituras e uma pausa, mais uma folga de 0,25 que fica dentro da distância que o planejador
  guarda dos objetos a evitar). O fim do trecho continua em toques curtos. Teste novo com a
  leitura custando um quadro: chega sem passar do ponto, em poucas apertadas.
- `check-objectives.mjs` (`waitForModels`): antes do primeiro passo de um jogo 3D, espera
  `window.__szModelosPendentes` (que o Jogo 3D agora publica) chegar a zero e uma janela de 2 s
  de quadros sem nenhum intervalo acima de 400 ms, com prazo de 15 s. Um jogo sem trava passa
  direto pela janela.

Resultado no mesmo computador: os cinco cenários 3D do Jardim e os nove da Ilha distinguem como
esperado. A imagem do executor e o Worker precisam ser publicados de novo para valer no servidor.
