# Uma colisão mais justa

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-10-corre-dino.md`. SHA-256: `bdc328d620c6cb758db35578544f6beb4f2916714bf30bf0e4e6a0aad7f6519c`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu jogo já tem começo, partida e fim. Em alguns saltos, o dino parece perder antes de encostar no desenho do cacto.

**Resultado:** Distinguir o desenho da área de colisão e ajustar a tolerância usando evidência visual.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Quando as áreas se encontram? | Resolver a descoberta. |
| Veja a parte invisível da batida | Verificar os objetivos do projeto. |
| Ajuste a área do contato | Verificar os objetivos do projeto. |
| Escolha uma batida justa | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Quando as áreas se encontram?

**Intenção e objetivo (professor):** Exploração · Distinguir o desenho da área de colisão e ajustar a tolerância usando evidência visual.

**Texto para o aluno:**

Oi! Às vezes parece que o Dino perde sem encostar no cacto. Vamos ligar um raio-X para investigar essa batida.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Quando as áreas se encontram?**

Modelo: `experiment`. Critério desta seção.

Compare dois tamanhos da área de colisão. Os desenhos ficam no mesmo lugar; só a área muda.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** Por que pode existir colisão antes dos desenhos encostarem?

- A área usada pelo programa pode ser maior que a parte visível
- O programa sempre compara cada pixel colorido

**Resposta esperada (professor):** A área usada pelo programa pode ser maior que a parte visível

**Devolutiva:** A detecção usa a área configurada; o desenho e a área não precisam ter o mesmo contorno.

**Pistas:**

- Olhe as formas tracejadas e compare com a parte preenchida.

**Texto para o aluno:**

O computador pode usar uma forma simples para detectar contatos, sem seguir cada detalhe do desenho. Essa área inclui espaços transparentes e pode tocar o obstáculo antes da imagem parecer encostar.

Mostrar a caixa de colisão torna essa regra visível. Diminuir a área pode deixar o jogo mais justo, mas diminuir demais permite contatos que parecem impossíveis.

O experimento usa círculos para comparar áreas; no seu jogo, confira os retângulos com o raio-X.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Veja a parte invisível da batida

**Intenção e objetivo (professor):** Aplicação · Comparar a imagem com a área usada na colisão.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Ligar o raio-X

Em Jogo 2D, Aparência, coloque Mostrar a caixa de colisão do sprite no fim de Se jogando. Escolha dino e rode.

O contorno rosa vai mostrar a área que estava invisível.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Aparência, arrastar "Mostrar a caixa de colisão do sprite" para dentro do "Se a tela atual é jogando", no fim, abaixo do "Tirar do grupo cactos quem sair da tela"; escolher o dino. Rodar e mostrar o contorno rosa em volta do dino.

**Produção:** aula-10-passo-01: gravar a demonstração "ligar o raio-X" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Por que a batida pareceu roubada

Aproxime o dino de um cacto e observe os espaços entre o desenho e o contorno. Compare a batida olhando a imagem e depois a caixa.

Essa diferença explica a sensação de perder cedo.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

com o raio-X ligado, aproximar o zoom no dino; apontar os espaços vazios entre o desenho e as bordas do retângulo (em cima da cabeça, na frente do focinho, embaixo dos pés). Depois mostrar o dino raspando num cacto: os retângulos se tocam antes dos desenhos.

**Produção:** aula-10-passo-02: gravar a demonstração "por que a batida pareceu roubada" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Aproxime o Dino do cacto e observe o contorno. Procure os espaços entre o desenho e a caixa.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Mostre a caixa de colisão do sprite dino em A cada quadro do jogo. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_draw_hitbox","area":"loops","fields":{"SPRITE":"dino"},"withinBlock":"sz_g2d_update_each_frame"}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Ajuste a área do contato

**Intenção e objetivo (professor):** Aplicação · Configurar a escala da área de colisão do personagem.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Ajustar a área de colisão

Em Colisões, coloque Usar área de colisão de porcentagem do tamanho em Ao iniciar, como último bloco. Escolha dino e 80.

Recomece e confira a caixa menor com o raio-X ainda ligado.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Colisões, arrastar "Usar área de colisão de __ % do tamanho para o sprite __" para o Ao iniciar, encaixando como **último bloco**, embaixo do "Ir para a tela inicio"; deixar 80 e escolher o dino. Com o raio-X ainda ligado, mostrar a caixa menor.

**Produção:** aula-10-passo-03: gravar a demonstração "ajustar a área de colisão" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Comece com 80% e veja a caixa menor. Na próxima etapa você pode comparar outros valores.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Configure a área de colisão do sprite dino em Ao iniciar. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_set_hitbox_scale","area":"start","fields":{"SPRITE":"dino"}}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 4. Escolha uma batida justa

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Você escolhe o quanto perdoar

Compare 40 e 100. Depois escolha um valor de 70 a 85 observando os saltos.

Ao terminar, remova o bloco que mostra a caixa, mas preserve a configuração da área de colisão.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

trocar o 80 por 40 (jogar e ver como fica fácil demais), depois por 100 (voltar a ser injusto), depois voltar pra um número entre 70 e 85; por fim, apagar o bloco do raio-X.

**Produção:** aula-10-passo-04: gravar a demonstração "você escolhe o quanto perdoar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Jogue com o raio-X para justificar sua escolha. Depois desligue o diagnóstico e confira se o jogo parece justo. Envie.

Na Aula 11, você vai medir o resultado da partida com um placar.

Se algo sair diferente, conte o que tentou em **Preciso de ajuda**. Você pode rever os passos e ajustar seu projeto com calma.

**Estúdio compartilhado:** reutilizar o primeiro Estúdio da aula. A entrega acontece aqui, uma única vez.

**Critério configurado:** entrega do Estúdio. Se houver nota mínima, conferir a atividade vinculada: o manifesto preserva sua configuração. Para exigir aprovação automática na seção, ela precisa usar checagens estruturais compatíveis. O carimbo “já conferi” do professor não controla este avanço.

## Cadastro e validação em staging

1. Abra a aula correspondente no admin de staging. Importe `manifesto.json` no rascunho com **Vincular ao destino aberto** e confira a prévia. Preserve a configuração do Estúdio existente e sua cadeia, quando houver.

2. Confira o quadro de critérios de cada seção. Os nomes acima correspondem ao manifesto. Cada vídeo mantém a chave original: reimportar preserva mídias já vinculadas. Vincule e confira os vídeos planejados pelo uploader Vimeo.

3. Se uma versão anterior deste pacote já foi importada, retire do rascunho os cartões antigos listados abaixo. O importador preserva blocos omitidos e pode levá-los ao fechamento; omitir uma chave no arquivo não apaga o cartão antigo. Confira quizzes e entregas existentes separadamente para manter apenas as exigências intencionais.

4. Use a prévia para revisar apresentação e continuidade. Para testar bloqueios, publique apenas em staging e entre com um perfil de aluno de teste sem conclusão anterior. A prévia navega livremente e marcos concluídos são preservados.

5. Tente uma resposta incorreta ou um projeto sem o requisito, confira o bloqueio e depois cumpra o critério. Verifique liberação, retorno, recarga e continuidade para a próxima aula. Em uma etapa com vários objetivos, cumprir só um não deve liberar.

**Cartões antigos a retirar após reimportação:**

- `checar-comeco`: Confira: A criação de hoje
- `checar-entenda`: Confira: O que aconteceu?
- `checar-construir-1`: Confira: ligar o raio-X
- `checar-construir-2`: Confira: por que a batida pareceu roubada
- `checar-construir-3`: Confira: ajustar a área de colisão
- `checar-construir-4`: Confira: você escolhe o quanto perdoar

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
