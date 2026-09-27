# Desafio do Primeiro Jogo: A Chave do Farol

## Decisão aprovada

O novo Desafio do Primeiro Jogo mantém o identificador `desafio-primeiro-jogo`, a oferta existente e o acesso de 30 dias. O jogo construído no curso se chama **A Chave do Farol**. Ele ocupa três dias entre o curso gratuito **Cadê Todo Mundo?** e **Nave Contra Asteroides**, mas não exige que a pessoa tenha feito o gratuito. A introdução e o certificado pertencem ao Desafio; os cinco dias do jogo de nave permanecem em seu curso separado.

Numa única cena vista de cima, o jogador guia um personagem, encontra uma chave, chega ao farol e acende a luz para orientar um barco. Não há inimigos, cronômetro, câmera ou salto. O cenário, o personagem, a chave, o farol, o barco e a arte local começam preparados. A criança programa as três regras que dão sentido ao jogo: movimento, coleta da chave e decisão de abrir/acender. A vitória final é visível e não deve ser atribuída a blocos que já vieram prontos.

O jogo deve ser jogável por teclado e por quatro controles direcionais visíveis e acessíveis ao toque. O Jogo 2D atual oferece movimento em quatro direções e detecção do início de contato, mas seu controle clássico exibe cinco botões de ação irrelevantes. Criar uma opção explícita de direcional com apenas quatro botões na extensão, preservando os modos existentes dos demais jogos. O controle não deve cobrir o personagem, a chave ou o farol nem bloquear o Estúdio incorporado em telas pequenas ou ampliadas.

### Alternativas descartadas

- Um caminho lateral só com esquerda e direita reduziria a aventura a atravessar a tela e voltar.
- Um toque por casa em botões desenhados no canvas exigiria toques repetitivos e tornaria o movimento pouco natural.
- Labirinto, inimigos, tempo ou salto acrescentariam dificuldade de jogo e de programação antes da primeira vitória.
- Usar o controle clássico completo mostraria A, B, início, pausa e seleção sem função nesta aventura.

## Percurso e autoria

| Aula | Vitória que a pessoa vê | Regra que ela constrói |
| --- | --- | --- |
| Introdução | Conhece o jogo e consegue voltar à aula | Nenhuma regra do jogo |
| Dia 1 | O personagem anda pelo mapa por toque ou teclado | Ativar o direcional, mover em quatro direções e manter o personagem na cena |
| Dia 2 | A chave é recolhida e o jogo registra que ela foi encontrada | Reagir ao encontro com a chave, recolhê-la e guardar `temChave` |
| Dia 3 | Sem chave, o farol permanece fechado; com chave, a luz acende e o barco chega | Testar `temChave` ao alcançar o farol e acionar o final correto |
| Certificado | Recebe o certificado e conhece a possibilidade de continuar criando | Nenhuma regra nova |

O projeto inicial traz apenas as regras de infraestrutura necessárias à cena e ao desenho. A criança monta as regras listadas acima, com verificação do projeto, não apenas de cliques no player. O estado salvo no fim de cada dia é a entrada do próximo; uma cópia de retomada coerente serve somente quando o projeto anterior não está disponível. Os recursos do projeto são locais e usados por blocos da extensão Jogo 2D e pelos blocos básicos de variável e condição do Estúdio. Não há Pinta, Estúdio completo ou dependência de rede para a arte.

O vídeo prático mostra cada gesto com o caminho e o rótulo atuais da paleta, o encaixe exato, os campos e o teste. O vídeo conceitual explica a ideia com exemplos próximos, mas deixa a observação concreta para a experiência. Toda seção começa pelo contexto do jogo; há no máximo um vídeo por seção, e vídeo e atividade aparecem juntos. A conclusão de uma seção de atividade exige os dois. Zappy serve de ponte breve, sem repetir a instrução interna da experiência. Não haverá palpite ou quiz só para preencher tempo.

Movimento e encontro com a chave produzem retorno imediato no próprio jogo; não precisam de cena paralela. No Dia 3, criar uma experiência curta da porta com e sem chave. A pessoa muda o estado da chave, testa a porta nas duas condições e observa a diferença antes de programar o `se` no Estúdio. O vídeo explica o significado da condição, mas não narra a sequência dos controles nem entrega o resultado da comparação. A experiência tem instrução curta, pistas progressivas e metas baseadas nos dois testes efetivos, não na simples mudança de um controle.

## Introdução, material e encerramento

A introdução atual tem sete seções e ainda ensina um jogo de nave. Redesenhá-la em três momentos: apresentação conversada do farol com demonstração da navegação da aula; apresentação do caderno; e caminho para voltar ao curso ou pedir ajuda. O primeiro uso de blocos, `Salvo` e `Enviar para o professor` entra no Dia 1 quando esses gestos passam a ter finalidade. O caderno e o material para responsáveis devem retratar a nova aventura, com download opcional e sem bloquear a progressão.

O certificado preserva a emissão e uma seção de próximos passos. Atualizar imagem e fala para a conquista do farol. O vídeo de continuidade começa pedindo que a criança chame um responsável e dirige a explicação da Comunidade dos Criadores ao adulto; não pede que a criança venda uma assinatura. Preço e condições continuam na página externa da oferta, e abrir essa página não é requisito para concluir a aula. Catálogo, funil, preço e duração da oferta não são alterados por este projeto.

## Entrega e verificação

Produzir descrições e módulos no padrão dos outros cursos; proposta, roteiro falado `.roteiro.md` e manifesto importável para os três dias; adaptar os trios de introdução e certificado; preparar os projetos encadeados e a arte; implementar o direcional e a experiência; e criar testes de progressão e regras. O pacote antigo `packages/studio-aulas` citado por uma orientação de roteiro não existe neste repositório: o contrato editorial vigente é o trio em `docs/aulas-interativas/aulas/`.

Verificar manifestos, regras de conclusão, tipos, testes do Jogo 2D, cena, projeto inicial e continuação entre aulas. Ensaiar o jogo em teclado e toque, tela pequena e Estúdio ampliado; testar porta sem chave, coleta única, reinício, final com chave e ausência do projeto salvo. Todos os vídeos permanecem `plannedVideo` até gravação e vínculo no admin. Não importar, publicar ou alterar a oferta automaticamente.
