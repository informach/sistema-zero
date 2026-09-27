# Corre Dino — revisão das 13 aulas a partir dos vídeos originais

As 13 aulas foram reorganizadas em **127 seções**, com **14 seções de observação**, **17 seções de experimentação** e construções pequenas no mesmo Estúdio de cada aula. As atividades são **19 cenas nativas**: 17 de experimentar e 2 de demonstrar (as duas da `velocity`, nas aulas 5 e 12). Há **86 clipes planejados** por trechos dos roteiros originais. Os arquivos gravados ainda precisam de conferência de timecodes, recorte e complementos visuais; esta pasta não contém os vídeos editados.

Cada pasta contém `roteiro.md` (percurso, decisões, fala e montagem), `manifesto.json` (estrutura importável) e `montagem.json` (origem dos trechos, entrada, saída e instruções de edição). Os roteiros originais foram apenas lidos e mantidos íntegros.

## O que o professor prepara e o que a criança faz

| Seção | Professor | Criança | Conclusão |
| --- | --- | --- | --- |
| Apresentação | Seleciona o recorte que retoma o projeto e apresenta a meta | Assiste, pausa e revê | 90% do clipe isolado assistido |
| Demonstração | Prepara o clipe e, quando a cena ajuda, uma demonstração que toca sozinha | Observa, pausa e revê; na cena guiada, avança parte por parte e termina em "Agora é sua vez" | 90% do clipe isolado; com cena, ver a demonstração até o fim |
| Experimentação | Escolhe a cena, o elenco e, quando quer, o caso e as metas que ela cobra | Aposta antes de mexer, mexe até as descobertas caírem, pede pista e usa Conferir | As descobertas da cena mais a pergunta final, corrigida no servidor |
| Construção | Combina clipe do gesto, orientação curta e critérios de montagem | Pausa o vídeo, monta no mesmo projeto e usa Conferir | Peças, valores, ordem e conexões exigidas; vídeo não substitui a montagem |
| Entrega | Define o estado esperado e revisa o jogo recebido | Testa, confere e envia o projeto | Critérios finais e envio |
| Fechamento e quiz | Reaproveita a recapitulação e confere compreensão | Assiste à retomada e responde três perguntas curtas | Progresso de vídeo e respostas corrigidas |

As aplicações compartilham **uma única referência de Estúdio**. Os exemplos de experimentação são separados dele. Não há botão que converta demonstração em experimentação nem convite obrigatório a outros desafios depois da missão.

Os identificadores da trilha guiada são `dino`, `cactos`, `pontos` e `velocidade`; a cor do Dino e o título visível do jogo continuam escolhas curtas. Isso reduz confusão entre o nome criado e os seletores dos blocos. Projetos antigos com identificadores personalizados precisam de critérios correspondentes ao importar esta revisão; não renomear silenciosamente o trabalho de uma criança.

## Decisões por aula

| Aula | Demonstração escolhida | Experimento escolhido e momento | Construção final |
| --- | --- | --- | --- |
| [1 — Preparar o mundo](aula-01/roteiro.md) | A descoberta do limite antecede a montagem; o clipe abre as coordenadas | `stage-size` antes da montagem da tela, `coordinates` antes de preencher x e y, e criar × desenhar (`world`) com o Dino ainda invisível | Ao iniciar, tela 480 × 270, borda, Dino x 110/y 150/tamanho 64 |
| [2 — Quadros e camadas](aula-02/roteiro.md) | Floresta cobrindo o Dino | `draw-loop` logo depois do clipe do livrinho; `layers` depois de observar o desaparecimento | Limpar → floresta → Dino; borda retirada sem perder o resto |
| [3 — Gravidade e impulso](aula-03/roteiro.md) | O próprio vídeo mostra a queda inicial e o gesto; não acrescentar uma demonstração repetida | `gravity` antes de corrigir a flutuação (a criança faz o pulo e liga a gravidade no ar); `impulse` depois de aprender a pousar, comparando 9 e 14 | Gravidade → controle com força 14 → desenho |
| [4 — Som do pulo](aula-04/roteiro.md) | O vídeo já mostra os controles e o som provisório | Entrada × evento real antes de transferir o som | Um som no evento de pulo; evento provisório retirado |
| [5 — Nascimento dos cactos](aula-05/roteiro.md) | Avalanche; borda 480 e x 560; a direção da velocidade negativa termina na demonstração `velocity`, com o cacto | `spawn` antes de montar o relógio separado | Criar a cada 1,4 s; mover/desenhar a cada quadro; x 560/VX -5 |
| [6 — Limpeza](aula-06/roteiro.md) | Medidor e teste já estão nos clipes de construção | Visível × guardado depois de medir o acúmulo | Faxina permanece; relógio volta a 1,4; medidor sai |
| [7 — Estado do jogo](aula-07/roteiro.md) | Condição, formato da pergunta e ramo então | Estado depois de proteger o quadro, antes de proteger o relógio | Duas rotinas obedecem a jogando; fundo continua em inicio |
| [8 — Menu e controles](aula-08/roteiro.md) | Senão se e textos como peças, antes do menu | Tecla × toque depois do evento Enter provisório | Entrada ampla, ramo inicio e dica correspondente |
| [9 — Colisão e reinício](aula-09/roteiro.md) | Cacto que colidiu × grupo inteiro | Reinício depois de criar fim, antes de montar o caminho de volta | Colisão, efeitos, tela fim e reset no ramo correto |
| [10 — Área de colisão](aula-10/roteiro.md) | Desenho × contorno parado | `hitbox` antes do ajuste real: a área abre grande, como o jogo antes do conserto, e a criança a diminui até 80% sem mexer no cacto | Área 80%; sprite preservado; instrumento retirado |
| [11 — Pontos](aula-11/roteiro.md) | Contraste; frase com texto/valor/texto | Pontuar só jogando, antes do relógio dos pontos | Memória zero, HUD ligado à variável, relógio 1 s, frase de fim |
| [12 — Sorteio](aula-12/roteiro.md) | Padrão fixo; a conta com negativos termina na demonstração `velocity`, comparando os passos de -5 e -6 | `random` com sorteio de verdade: primeiro o lugar, depois a velocidade, uma propriedade por vez | X entre 500–560; VX = -5 − sorteio(0,1) |
| [13 — Dificuldade](aula-13/roteiro.md) | Base × velocidade recebida ao nascer; régua de negativos e sinal > | `acceleration` antes do acelerador: cada "Passar 5 segundos" faz nascer um cacto com o número dele | Base -5, relógio 5 s, condição > -9, incremento -1 e descrição final |

Não há obrigação de colocar os dois formatos em toda aula. A explicação visual do próprio clipe pode bastar. A investigação aparece quando comparar estados ajuda a compreender uma relação causal.

## O que mudou no código

Os critérios de Estúdio agora permitem três exigências adicionais, com a mesma avaliação no servidor e no cliente:

- **Quantidade exata de blocos ativos**, inclusive zero: verifica retirada de eventos provisórios, instrumentos e duplicações.
- **Ordem na mesma sequência:** verifica floresta antes do Dino, gravidade antes do controle e efeitos antes da troca de cena. Um bloco em outro ramo não satisfaz a ordem.
- **Peças conectadas a entradas específicas:** verifica o contador no valor do placar, sorteio em x ou VX, variável no lado correto da conta e ação no então da condição esperada. As condições de um encaixe precisam corresponder à mesma peça.

O formulário do professor oferece essas opções pelo catálogo real, incluindo ramos senão se e partes de juntar texto. Não exige JSON ou código. Validação de autoria rejeita blocos indisponíveis, encaixes incompatíveis e padrões excessivamente profundos. Os novos campos são opcionais: critérios existentes continuam válidos.

A checagem estrutural não prova toda a jogabilidade. Cada roteiro também descreve o teste visual/funcional a realizar, incluindo controles, contraste, áudio, conservação do resultado e reinício.

## Correções importantes dos vídeos

- Aula 2: o rastro é sutil nas pernas, antes da floresta. Não encenar um borrão inexistente.
- Aula 3: no projeto original, o Dino suspenso não consegue pular antes de cair. Na cena `gravity` é a criança que faz o pulo e liga a gravidade com o Dino no ar; ela é apresentada como modelo separado do projeto.
- Aula 6: seguir a retirada do medidor descrita na Parte 4 e no Fecho; a nota inicial que o deixava até a aula 7 está desatualizada.
- Aula 9: a colisão com grupo é conferida dentro de Se jogando a cada quadro, entre desenhar o grupo e a faxina. Esse bloco não é um registro de evento na área Quando acontecer.
- Aula 10: ajustar a área do Dino, não a do cacto. Na cena `hitbox` a área começa grande e a criança diminui até 80%, o mesmo sentido do conserto da aula. 80% é a escolha desta versão, não uma regra universal de justiça.
- Aula 11: atualizar as referências históricas ao medidor e à introdução do Se.
- Aula 11: manter o placar dentro do Se jogando, com os valores originais x 12, y 30 e tamanho 24; ele não aparece no menu.
- Aula 12: sorteio pode repetir, e a cena `random` sorteia de verdade, um sorteio por vez. Ela mostra que o resultado fica dentro dos limites; não é prova estatística.
- Aula 13: -9 limita a **base**; o sorteio ainda pode produzir -10. Cactos antigos mantêm a velocidade recebida. Publicar ou compartilhar não é requisito de conclusão.

## Produção e entrada na plataforma

O conteúdo está em arquivos locais, como candidatos de autoria. O manifesto reutiliza o Estúdio já existente na aula: ao importar em um ambiente de revisão, conferir a extensão Jogo 2D, os blocos disponíveis, os identificadores e a continuidade do projeto. As regras são conferidas novamente contra a configuração real antes da publicação.

Exportar os clipes planejados e vinculá-los às respectivas chaves de vídeo. Não foram inventados timecodes: entrada e saída são trechos reais dos roteiros fornecidos. As demonstrações novas têm orientação de imagem e narração no mapa de montagem. As coordenadas e a direção da velocidade negativa deixaram de depender de imagem explicativa: hoje são as cenas `coordinates` e `velocity`, e a montagem marca com `cenaAnterior` os clipes planejados quando ainda descrevem a experiência de antes. O contraste e a referência ao cacto continuam sendo imagens planejadas em vídeo.

Para as imagens complementares: destacar uma coisa por vez; manter escala e posição nas comparações; usar legendas e texto além de cor; evitar animação decorativa enquanto a criança precisa ler. Manter o áudio de uma única mídia por vez. Os modelos nativos já oferecem controles delimitados e evidências visíveis.

## Verificação reproduzível

Executar na raiz do repositório, passando a pasta dos originais:

```powershell
bun docs/aulas-interativas/qa/gerar-candidatos-v6.ts 'CAMINHO_DOS_ROTEIROS'
bun docs/aulas-interativas/qa/validar-revisao-completa.ts 'CAMINHO_DOS_ROTEIROS'
```

O [relatório de verificação](../qa/revisao-13-aulas-verificacao.json) confere os 13 hashes de fonte, as âncoras dos 86 clipes, todas as seções e os programas finais de referência. Há também teste de carregar/salvar os 13 programas no Blockly real e gerar JavaScript com sintaxe válida. Isso não substitui revisar os vídeos produzidos nem percorrer as aulas publicadas com uma criança.

O [full review](../qa/full-review-2026-09-12.md) acrescenta execução dos 13 projetos no motor real, casos de montagem incorreta, retomada das experiências e verificações da API. A ordem também pode ser conferida dentro de um encaixe, como gravidade antes do controle no então de Se jogando.

## Edição atual do Jogo 2D

Os roteiros e os mapas de montagem desta pasta foram atualizados para a paleta 1.0 e documentos de projeto no formato 2. Consulte [a atualização dos três cursos](../ATUALIZACAO-JOGO-2D.md), [a lista completa de blocos](blocos-corre-dino.json) e [a matriz por aula](blocos-por-aula.json). As gravações indicadas nos mapas ainda precisam ser feitas e validadas em staging.
