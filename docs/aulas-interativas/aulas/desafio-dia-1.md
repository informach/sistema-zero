# A Chave do Farol · Dia 1 · O personagem ganha movimento

## Resumo

- Estado de entrada: primeiro contato com a aventura. No projeto, cenário, sprites, desenho por quadro e comportamento do barco preparados; sem controles nem movimento.
- Vitória do dia: conhecer o jogo que vai programar, saber onde está o caderno e fazer o personagem andar em quatro direções sem sair da tela.
- Seções: 8. Jogo pronto e caderno, como na Aula 1 do Cadê Todo Mundo?. Depois, três pares de experiência e montagem: a cada quadro, velocidade e limite da tela.
- Clipes: 8.

**Decisões de 05/10/2026:** uma ideia por seção, e cada conceito novo ganha uma experiência antes de virar bloco. A primeira versão do Dia 1 juntava controles, movimento a cada quadro, velocidade, limite e ordem num único vídeo de 5 a 6 minutos. Toda aula também termina numa ação prática. As duas seções da antiga aula de introdução (`boas-vindas`) passaram a abrir o Dia 1. Assim, o primeiro dia já termina com uma construção enviada. Essas duas seções mantiveram blocos e critérios; mudaram a aula em que ficam e a saída do caderno, que agora é **Próxima seção**. A divisão em ideias criou as outras cinco seções e o critério intermediário `movimentoSemBorda`.

**Revisão de 06/10/2026:** todas as falas conversam com a criança e chamam a atenção dela para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"); as pontes do Zappy começam convidando ("Sua vez!", "Hora de…"). O caderno é apresentado como escolha: ler na aula ou baixar para guardar. Cada fala virou uma conversa contínua, com o porquê de cada resultado (as experiências ficaram um pouco mais longas). Saiu da montagem a frase solta "O cenário e os desenhos já estão preparados": o que vem pronto só entra na fala quando ajuda a ação, como os blocos que já estão em Ao iniciar. Seções, blocos e critérios não mudaram.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
| --- | --- | --- | --- | --- | --- |
| Qual jogo será criado | Não | Na partida pronta | Contexto do barco e do farol, seguido do convite para jogar | Antes da construção | Dar sentido ao projeto |
| Mover o personagem na versão pronta | Não | Jogando | Setas na tela ou teclado | Na seção 1 | Entrar na aventura sem um tour |
| Consultar o caderno | Operação de apoio | Material disponível | Vídeo curto e PDF opcional | Seção 2 | Permitir consulta durante a montagem |
| Navegar e pedir ajuda | Interface | No Como Fazer | Links diretos opcionais | Quando necessário | Evitar aula de navegação antes da atividade |
| Sprite | Vocabulário | Na identificação do personagem | Definição curta antes de nomear o bloco | Na montagem | Evitar termo desconhecido na instrução |
| Controles e movimento | Não | No jogo | Setas aparecem; personagem se move depois do segundo bloco | Após cada montagem | Mostrar que os controles sozinhos não movem ninguém |
| A cada quadro do jogo | Sim, em nível inicial | Na experiência `quadro` (cena `lighthouse-walk`) | Avançar quadro a quadro sem e com a seta, depois Rodar | Seção 3, antes da montagem `andar` | Ver a repetição antes de pôr o movimento dentro dela |
| Velocidade | Sim, como quantidade por quadro | Na experiência `tanto` e depois no próprio jogo | Comparar 3 e 1 na cena; na seção `velocidade`, escolher a velocidade e ficar com ela (mexa e veja) | Seções 5 e 6 | Ver que o número é quanto o personagem anda em cada quadro |
| Borda e ordem | Relação concreta | Na experiência `limite` e depois no próprio jogo | Rodar sem e com Manter dentro da tela; no jogo, ver o personagem sair e pôr o limite logo abaixo do movimento | Seções 7 e 8 | Mover primeiro, conferir o limite depois |

## Diagnóstico do desenho atual

O tour foi retirado. O contexto inicial permanece: anunciar **A Chave do Farol**, situar o barco e o farol apagado e convidar a jogar, sem mostrar o trajeto resolvido. A ajuda inclui `plataforma-baixar-materiais` e identifica o Como Fazer como área de ajuda. Nenhum mapa foi acrescentado como material.

Os antigos vídeos `video-d1-chegada` e `video-d1-movimento` permanecem aposentados, com o contexto necessário incorporado à montagem. O review encontrou “sprite” no nome do bloco antes da definição; a explicação agora vem primeiro, também no caderno. O seletor de borda não tem campo ctx, e as instruções correspondem ao bloco atual. A velocidade começa em 3; depois da experiência, a pessoa escolhe a dela, de 1 a 6, e fica com ela. Movimento e limite ficam dentro de **A cada quadro do jogo**.

## Proposta final

### Seção 1. A Chave do Farol

- **Intenção:** apresentação (`presentation`).
- **Por que existe:** conhecer a aventura pela ação.
- **Conclui quando:** vídeo e participação no jogo, sem exigir vitória.
- **Blocos:** `video-intro-farol`, `ponte-intro-farol` e `jogo-pronto`.

**Ponte do Zappy na página (não gravar):** Sua vez! Jogue a versão pronta: pegue a chave e leve o personagem até o farol. Depois, clique em Próxima seção.

O vídeo é uma demonstração, como nas experiências: apresenta a aventura, mostra como se anda com um gesto só ("Olha aqui: quando eu seguro a seta da tela para a direita…"), sem resolver o caminho, e só no fim passa a vez.

### Seção 2. Seu Caderno do Aluno

- **Intenção:** material (`material`).
- **Por que existe:** apresentar o apoio que acompanha as aulas.
- **Conclui quando:** vídeo; leitura, impressão e download opcionais.
- **Blocos:** `video-intro-caderno`, `ponte-intro-caderno`, `materiais-farol` com bookPreview e `ajuda-como-fazer-intro`.

**Ponte do Zappy na página (não gravar):** Este é o seu caderno! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima seção.

O vídeo chama a atenção para o caderno ("Olha aqui: este é o seu Caderno do Aluno!") e oferece as duas escolhas como convite: ler aqui mesmo, na aula, ou clicar em **Baixar** para guardar e consultar onde quiser. A fala não diz que a pessoa não precisa baixar ou imprimir, porque soa como uma ordem para não fazer (ajuste do responsável, 06/10/2026).

Anexar somente `output/pdf/desafio-farol-caderno.pdf` ao leitor. O caderno tem 21 páginas, com comparação de velocidades, experiência de memória, montagem da porta em duas etapas, testes, publicação e certificado. O mapa antigo para responsáveis não integra esta versão.

### Seção 3. Como o personagem anda

- **Intenção:** exploração (`exploration`).
- **Por que existe:** mostrar que o jogo repete a cada quadro e que, com a seta segurada, o personagem anda um pouco em cada repetição.
- **Conclui quando:** vídeo e os dois testes da experiência.
- **Blocos:** `video-d1-quadro`, `ponte-d1-quadro` e `experiencia-quadro` (cena `lighthouse-walk`, metas `still-without-arrow` e `moves-each-frame`).

**Ponte do Zappy na página (não gravar):** Sua vez! Avance um quadro de cada vez e fique de olho no x.

### Seção 4. Faça o personagem andar

- **Intenção:** aplicação (`application`), com verificação e sem envio.
- **Por que existe:** montar no jogo o que a experiência mostrou.
- **Conclui quando:** vídeo e aprovação de dois critérios: as quatro direções e o movimento dentro de A cada quadro do jogo.
- **Blocos:** `video-d1-andar`, `ponte-d1-andar` e a ajuda opcional `ajuda-d1`; Estúdio pela `workspaceKey: projeto`.

**Ponte do Zappy na página (não gravar):** Hora de fazer o seu personagem andar! Faça as setas aparecerem e coloque o movimento dentro de A cada quadro do jogo. Depois teste e clique em Verificar esta etapa.

Com o destino à vista antes de cada bloco: controles com só as quatro direções no fim de Ao iniciar; movimento dentro de **A cada quadro do jogo**, logo abaixo de Desenhar o cenário.

### Seção 5. O tanto que ele anda

- **Intenção:** exploração (`exploration`).
- **Por que existe:** tornar concreto que a velocidade é o tanto que o personagem anda em cada quadro.
- **Conclui quando:** vídeo e um teste com cada velocidade.
- **Blocos:** `video-d1-tanto`, `ponte-d1-tanto` e `experiencia-velocidade` (metas `step-speed-3` e `step-speed-1`).

**Ponte do Zappy na página (não gravar):** Sua vez! Compare as duas velocidades e repare nas marcas no chão.

### Seção 6. Escolha a velocidade

- **Intenção:** aplicação (`application`), com verificação e sem envio.
- **Por que existe:** aplicar a experiência da velocidade no próprio jogo, escolhendo a velocidade e ficando com ela. É o mexa e veja do Dia 1.
- **Conclui quando:** vídeo e os dois critérios de `andar` (as quatro direções e o movimento), que aceitam qualquer velocidade. A escolha não vira critério.
- **Blocos:** `video-d1-velocidade`, `ponte-d1-velocidade`; Estúdio pela `workspaceKey: projeto`.

**Ponte do Zappy na página (não gravar):** Escolha a velocidade do seu personagem: troque o 3 por um número de 1 a 6, teste e deixe o que você mais gostar. Depois clique em Verificar esta etapa.

Depois da retomada, a pessoa troca o 3 por um número de 1 a 6, testa alguns e deixa o que mais gostar. As verificações seguintes (a entrega do Dia 1 e as dos outros dias) conferem o movimento sem exigir um número.

### Seção 7. Até onde ele pode ir?

- **Intenção:** exploração (`exploration`).
- **Por que existe:** ver o personagem sair da tela sem limite e ficar inteiro com o limite ligado, antes de montar o bloco.
- **Conclui quando:** vídeo e os dois testes da experiência.
- **Blocos:** `video-d1-limite`, `ponte-d1-limite` e `experiencia-limite` (metas `left-the-screen` e `stayed-inside`).

**Ponte do Zappy na página (não gravar):** Sua vez! Teste sem o limite e com ele e repare no que acontece na borda.

### Seção 8. Mantenha o personagem na tela

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** completar o primeiro comportamento jogável e entregar o dia.
- **Conclui quando:** vídeo, três critérios de projeto aprovados e envio confirmado.
- **Blocos:** `video-d1-borda`, `ponte-d1-borda` e o Estúdio `projeto`.

**Ponte do Zappy na página (não gravar):** Agora mantenha o personagem na tela! Coloque o limite logo abaixo do movimento, teste as quatro beiradas e clique em Verificar esta etapa antes de enviar para o professor.

Primeiro a pessoa vê o personagem sair pela beirada no próprio jogo. Depois, com o bloco de movimento à vista, encaixa **Manter o sprite dentro da tela** logo abaixo dele: primeiro move, depois confere a borda. Testar as quatro bordas com o dispositivo disponível, sem exigir teclado e toque de quem só tem um deles. Terminar em **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Concluir aula**.

## Experiências e demonstrações desta aula

- **Jogo pronto:** atividade project-play com a cópia concluída de A Chave do Farol, `completion: participation` e targets vazio. Deixa jogar por toque ou teclado. Experimentar basta; não exigir vencer. É uma atividade isolada, sem Estúdio de entrega, e não alimenta a cadeia de criação.
- **Cena `lighthouse-walk`, cenário Farol:** criada em 05/10/2026 para o Dia 1. O personagem anda para a direita no mapa do farol. Os controles são Segurar a seta para a direita, Avançar 1 quadro, Rodar/Parar, Velocidade 1 e Velocidade 3, Manter dentro da tela e Recomeçar. Os mostradores são quadro, x e velocidade. A mesma cena serve às três experiências, cada uma com as metas do seu conceito (`setup.goals`); os controles de velocidade e de limite só aparecem quando o caso cobra essas metas.
- **Montagens:** o projeto é o mesmo nas seções 4, 6 e 8. A prévia atualiza sozinha; Atualizar não é um passo a repetir a cada encaixe.

Não apresentar evento, variável ou condição antes do uso. Nenhuma demonstração resolve o jogo pela pessoa.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-intro-farol` | Jogo, contexto e demonstração de um gesto, sem resolver | Versão pronta | 45 a 60 s | Regravar |
| `video-intro-caderno` | Capa e página real do PDF | Caderno anexado | 25 a 35 s | Regravar |
| `video-d1-quadro` | Experiência: sem a seta e com a seta, quadro a quadro | Cena nova | 70 a 90 s | Gravar |
| `video-d1-andar` | Controles e movimento, teste e verificação | Projeto inicial | 3 a 4 min | Gravar |
| `video-d1-tanto` | Experiência: velocidade 3 e 1 | Cena nova | 50 a 65 s | Gravar |
| `video-d1-velocidade` | Escolher a velocidade e ficar com ela (mexa e veja) | Mesmo projeto | 70 a 90 s | Gravar |
| `video-d1-limite` | Experiência: sem e com o limite | Cena nova | 50 a 65 s | Gravar |
| `video-d1-borda` | Borda no jogo, limite, testes e entrega | Mesmo projeto | 2 a 3 min | Regravar |

## Continuidade

Preservar as seções `apresentacao`, `caderno` e `borda` (agora a última, com a entrega), a chave `materiais-farol`, a chave `projeto` e a cadeia `desafio-primeiro-jogo`. As seções `quadro`, `andar`, `tanto`, `velocidade` e `limite` são novas. A pessoa programa as regras de movimento, não a arte nem o barco preparado.

Valores finais: controles com as quatro direções, personagem, a velocidade escolhida (3 se a pessoa não mudar) e movimento antes do limite de tela. O Dia 2 assume esse trabalho enviado; a retomada preparada só é alternativa quando não há envio anterior.

No Admin, a aula antiga `boas-vindas` sai do curso sem apagar progresso nem certificados; ver [Atualização de aulas existentes](../modulos-desafio-primeiro-jogo.md#atualização-de-aulas-existentes). Anexar o PDF antes de gravar a seção 2. Os links do Como Fazer abrem na mesma aba e voltam para a aula.
