# A Chave do Farol · Dia 1 · O personagem ganha movimento

**Conferência da equipe, 19/10/2026 (não gravar):** exemplos privados por parte, conforme o manifesto e sua fonte geradora. andar: entrada sem movimento e solução que anda sem borda. borda: entrada que já anda e solução com limite. O projeto inicial e a continuidade permanecem; a entrada para ensaio não substitui o baseline da verificação. Cores, imagens, textos e magnitude de velocidade do exemplo não são respostas únicas. A direção precisa continuar coerente e zero não demonstra movimento. Os objetivos atuais deste piloto conferem estrutura; os testes jogados do roteiro continuam necessários e não foram certificados automaticamente como comportamento. Esta revisão conserva as falas e as âncoras de edição já registradas. Não informa nova gravação, publicação ou ensaio com crianças.


## Resumo

- Estado de entrada: primeiro contato com a aventura. No projeto, cenário, sprites, desenho por quadro e comportamento do barco preparados; sem controles nem movimento.
- Vitória do dia: conhecer o jogo que vai programar, saber onde está o caderno e fazer o personagem andar em quatro direções sem sair da tela.
- Seções: 6. Jogo pronto e caderno, como na Aula 1 do Cadê Todo Mundo?. Depois, dois pares de experiência e montagem: a cada quadro e limite da tela.
- Clipes: 6.

**Decisões de 05/10/2026:** uma ideia por seção, e cada conceito novo ganha uma experiência antes de virar bloco. A primeira versão do Dia 1 juntava controles, movimento a cada quadro, velocidade, limite e ordem num único vídeo de 5 a 6 minutos. Toda aula também termina numa ação prática. As duas seções da antiga aula de introdução (`boas-vindas`) passaram a abrir o Dia 1. Assim, o primeiro dia já termina com uma construção enviada. Essas duas seções mantiveram blocos e critérios; mudaram a aula em que ficam e a saída do caderno, que agora é **Próxima parte**. A divisão em ideias criou as outras seções, hoje quatro (`quadro`, `andar`, `limite` e `borda`, depois da retirada de `tanto` e `velocidade` registrada abaixo), e o critério intermediário `movimentoSemBorda`.

**Revisão de 06/10/2026:** todas as falas conversam com a criança e chamam a atenção dela para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"); as pontes do Zappy começam convidando ("Sua vez!", "Hora de…"). O caderno é apresentado como escolha: ler na aula ou baixar para guardar. Cada fala virou uma conversa contínua, com o porquê de cada resultado (as experiências ficaram um pouco mais longas). Saiu da montagem a frase solta "O cenário e os desenhos já estão preparados": o que vem pronto só entra na fala quando ajuda a ação, como os blocos que já estão em Ao iniciar. Essa revisão de fala antecedeu a retirada das seções de velocidade registrada abaixo.

**Vocabulário da aventura, 06/10/2026:** no que a criança vê e ouve, aula virou fase, seção virou parte, o caderno virou Mapa da Aventura (a seção 2 se chama **Seu Mapa da Aventura**, e o material, **Mapa da Aventura: A Chave do Farol**) e professor virou equipe. As falas citam **Próxima parte**, **Verificar esta parte**, **Objetivo cumprido!**, **Enviar meu projeto** e **Concluir fase**. Chaves, seções e critérios não mudaram. Na mesma noite, o botão de envio passou a dizer o que a criança envia (**Enviar meu projeto**), e quem recebe e responde passou a ser a equipe; o tutorial de ajuda virou **Como pedir ajuda à equipe**.

**Full review de 06/10/2026:** "então" saiu de todas as falas como palavra de ligação (no Farol inteiro ele é o nome de um espaço do bloco Se); no lugar ficaram "por isso" ou duas frases. Três rótulos da ajuda da seção 2 não eram títulos de tutoriais que existem; agora os links usam exatamente os títulos de `docs/como-fazer/como-fazer.json`: **Como abrir o Mapa da Aventura e os materiais**, **Como abrir uma fase e trocar de parte**, **Como dar mais espaço ao jogo e à experiência**, **Como mostrar o menu e a lista de fases**, **Como continuar uma fase** e **Como pedir ajuda à equipe**. As pontes das experiências terminam em "Quando terminar, clique em Próxima parte.". Na experiência do quadro, "Olha a regra aqui embaixo" virou "Olha a regra do movimento", porque a posição muda com o tamanho da tela. Essa revisão de fala antecedeu a retirada das seções de velocidade registrada abaixo.

**Personalização ampliada, 06/10/2026:** as seções `tanto` e `velocidade` foram retiradas por decisão do responsável. Seus vídeos, pontes e experiência estão em `retireBlockKeys`. A montagem manda manter a velocidade em 3, sem convite para escolher outro valor. A avaliação aceita outros valores coerentes com a direção pedida. A personalização se concentra no Dia 3: visuais, avisos e lugar da chave. As demais chaves e o progresso são preservados.

**Revisão antes da gravação, 13/10/2026:** a fala diz o que chega no bloco e onde clicar (**Ativar controles clássicos** chega com **automáticos no celular**; **Mover sprite** e **Manter o sprite** chegam com **heroi**). A procura de **Enquanto estiver rodando** ganhou o socorro de arrastar um espaço vazio, e a área vem antes do bloco. As retomadas das partes 4 e 6 começam por um gesto da criança que mostra o que falta, e o fim do dia reconhece a conquista depois do envio. Na experiência do quadro, o vídeo aponta o **quadro** passando de 0 para 1 e o **+3** embaixo do personagem, e as descobertas dizem "personagem" (a palavra sprite só é explicada na parte 4). Na do limite, a comparação da janela explica a faixa **fora da tela** que a cena desenha, e o vídeo aponta na regra **Manter o sprite personagem dentro da tela** logo abaixo do bloco que move. No jogo pronto, o vídeo aponta o aviso do alto da tela. As listas de conferência ficaram curtas, as pontes das partes 4 e 6 terminam na saída e o critério das direções diz qual bloco usar. O roteiro ganhou as notas de gravação (aba nova depois do deploy, experiência sem progresso, envio sem envio anterior, selo **Guardado na sua conta** só quando aparece). As durações foram medidas de novo e subiram, sem acelerar.

## Vozes e produção · 10/10/2026

**Debinha** participa em 8 entradas, alternando por aula: Debinha, Dedé, Debinha e Dedé no certificado. O [roteiro completo](desafio-dia-1.roteiro.md) identifica **Professora**, **Debinha (avatar)** e as falas do **Zappy na página (não gravar)**. Cada entrada tem ID, fala literal, saída e retomada da professora.

O vídeo do Mapa da Aventura continua só com a professora. As participações ajudam a descobrir os controles, a repetição dos quadros e o limite da tela.

| Entrada | Fala de Debinha |
| --- | --- |
| F1P1-D01 | “E como eu levo o personagem até a chave?” |
| F1P3-D01 | “E se eu clicar em Rodar?” |
| F1P4-D01 | “As setas apareceram, mas ele ainda não anda!” |
| F1P5-D01 | “Como eu faço ele parar na borda?” |
| F1P6-D01 | “E onde eu coloco esse limite?” |

As três entradas da revisão de ritmo (F1P4-R01, F1P4-R02 e F1P6-R01) estão na tabela do fim desta proposta. Na ordem de corte da parte 4: F1P4-R01, F1P4-D01, F1P4-R02.

As falas estão aplicadas aos documentos; gravação, edição e publicação desta versão ainda não foram confirmadas. As durações da tabela foram revistas em 10/10/2026 com as participações: cobrem a fala estimada a 137 palavras por minuto e, nas montagens, os gestos sem fala. Medir a montagem final sem acelerar. Zappy permanece nas instruções da página e no recurso Ouvir; no vídeo, sua presença em memes ou na interface é visual. Manter o passo a passo completo, sem intervenções durante um arraste. [Direção e âncoras de edição](../../aulas-interativas-tecnico/AVATARES-NOS-VIDEOS.md#chave-do-farol).

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
| Borda e ordem | Relação concreta | Na experiência `limite` e depois no próprio jogo | Rodar sem e com Manter dentro da tela e apontar, na regra, o limite logo abaixo do movimento; no jogo, ver o personagem sair e pôr o limite logo abaixo do movimento | Seções 5 e 6 | Mover primeiro, conferir o limite depois |

## Diagnóstico do desenho atual

O tour foi retirado. O contexto inicial permanece: anunciar **A Chave do Farol**, situar o barco e o farol apagado e convidar a jogar, sem mostrar o trajeto resolvido. A ajuda inclui `plataforma-baixar-materiais` e identifica o Como Fazer como área de ajuda. Nenhum mapa foi acrescentado como material.

Os antigos vídeos `video-d1-chegada` e `video-d1-movimento` permanecem aposentados, com o contexto necessário incorporado à montagem. O review encontrou “sprite” no nome do bloco antes da definição; a explicação agora vem primeiro, também no caderno. O seletor de borda não tem campo ctx, e as instruções correspondem ao bloco atual. A velocidade 3 é o valor da demonstração; a magnitude pode variar, desde que o personagem se mova na direção pedida. Não há experiência nem montagem dedicada a comparar velocidades. Movimento e limite ficam dentro de **A cada quadro do jogo**.

## Proposta final

### Seção 1. A Chave do Farol

- **Intenção:** apresentação (`presentation`).
- **Por que existe:** conhecer a aventura pela ação.
- **Conclui quando:** vídeo e participação no jogo, sem exigir vitória.
- **Blocos:** `video-intro-farol`, `ponte-intro-farol` e `jogo-pronto`.

**Ponte do Zappy na página (não gravar):** Sua vez! Jogue a versão pronta: pegue a chave e leve o personagem até o farol. Depois, clique em Próxima parte.

O vídeo é uma demonstração, como nas experiências: apresenta a aventura, mostra como se anda com um gesto só ("Olha aqui: quando eu seguro a seta da tela para a direita…"), sem resolver o caminho, e só no fim passa a vez. Antes de passar a vez, planta a surpresa do final (decisão do responsável, 07/10/2026): "E tem uma coisa esperando por você lá no fim desta aventura: uma surpresa para deixar o jogo do seu jeito." Conta que a surpresa existe, sem dizer o que é; ela é lembrada uma vez no fim do Dia 2 e revelada em **Deixe o jogo com a sua cara**, no Dia 3.

### Seção 2. Seu Mapa da Aventura

- **Intenção:** material (`material`).
- **Por que existe:** apresentar o apoio que acompanha as aulas.
- **Conclui quando:** vídeo; leitura, impressão e download opcionais.
- **Blocos:** `video-intro-caderno`, `ponte-intro-caderno` e `materiais-farol` com bookPreview: o único bloco de materiais da fase, com o PDF do Mapa (anexado no Admin), um recado curto e os seis links do Como Fazer (07/10/2026).

**Ponte do Zappy na página (não gravar):** Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

O vídeo chama a atenção para o caderno ("Olha aqui: este é o seu Mapa da Aventura!") e oferece as duas escolhas como convite: ler aqui mesmo ou clicar em **Baixar** para guardar o mapa e consultar onde quiser. A fala não diz que a pessoa não precisa baixar ou imprimir, porque soa como uma ordem para não fazer (ajuste do responsável, 06/10/2026).

Anexar somente `docs/aulas-interativas/desafio-primeiro-jogo/mapa-da-aventura.pdf` ao leitor. O caderno tem 29 páginas (27 até a revisão de 13/10/2026) e acompanha a memória, a montagem da porta em duas etapas, as galerias de personalização, a posição da chave, os testes, a publicação e o certificado. O mapa antigo para responsáveis não integra esta versão.

### Seção 3. Como o personagem anda

- **Intenção:** exploração (`exploration`).
- **Por que existe:** mostrar que o jogo repete a cada quadro e que, com a seta segurada, o personagem anda um pouco em cada repetição.
- **Conclui quando:** vídeo e os dois testes da experiência.
- **Blocos:** `video-d1-quadro`, `ponte-d1-quadro` e `experiencia-quadro` (cena `lighthouse-walk`, metas `still-without-arrow` e `moves-each-frame`).

**Ponte do Zappy na página (não gravar):** Sua vez! Teste sem a seta e com a seta e repare no que acontece com o x. Quando terminar, clique em Próxima parte.

### Seção 4. Faça o personagem andar

- **Intenção:** aplicação (`application`), com verificação e sem envio.
- **Por que existe:** montar no jogo o que a experiência mostrou.
- **Conclui quando:** vídeo e aprovação de seis critérios: dois de montagem (controles com quatro direções e movimento dentro de A cada quadro do jogo) e quatro de comportamento, um para cada direção.
- **Blocos:** `video-d1-andar` e `ponte-d1-andar`; Estúdio pela `workspaceKey: projeto`. A ajuda opcional que ficava aqui (`ajuda-d1`) entrou no bloco do Mapa em 07/10/2026.

**Ponte do Zappy na página (não gravar):** Hora de fazer o seu personagem andar! Faça as setas aparecerem e coloque o movimento dentro de A cada quadro do jogo. Depois teste e clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

Depois da retomada da experiência e antes de procurar **Ao iniciar**, apresentar os comandos como
instruções que dizem ao jogo o que fazer e que aparecem como bloquinhos. No "Olha aqui: neste menu",
apontar a paleta de comandos como o lugar de escolher os blocos, sem pegar nenhum ainda. Esta é a
primeira montagem do Desafio, que também recebe quem nunca programou; a fala completa está no roteiro.

Com o destino à vista antes de cada bloco: controles com só as quatro direções no fim de Ao iniciar; movimento dentro de **A cada quadro do jogo**, logo abaixo de Desenhar o cenário praia-tropical. Primeiro a área **Enquanto estiver rodando**, com o socorro de arrastar um espaço vazio, e depois o bloco dentro dela. A fala diz o que chega em cada bloco e onde clicar: **Ativar controles clássicos** chega com **automáticos no celular** (trocar para **só as quatro direções**) e **Mover sprite** chega com **heroi** (trocar para **personagem**).

**Correção de montagem, 20/10/2026:** conservar a âncora “A velocidade já vem em 3; deixe assim.” e retirar a inserção que convidava a escolher outro tamanho de passo. Ensinar um comando por vez. Conservar o teste e a sequência já narrados; os quatro casos internos da avaliação não exigem novas falas. A avaliação continua aceitando outros valores coerentes, cores e imagens; não exigir velocidade literal 3. Preservar as falas já gravadas e as âncoras dos avatares; limitar eventual fala complementar ao fluxo de verificação que mudou, sem afirmar gravação ou publicação concluída.

### Seção 5. Até onde ele pode ir?

- **Intenção:** exploração (`exploration`).
- **Por que existe:** ver o personagem sair da tela sem limite e ficar inteiro com o limite ligado, antes de montar o bloco.
- **Conclui quando:** vídeo e os dois testes da experiência.
- **Blocos:** `video-d1-limite`, `ponte-d1-limite` e `experiencia-limite` (metas `left-the-screen` e `stayed-inside`).

**Ponte do Zappy na página (não gravar):** Sua vez! Teste sem o limite e com ele e repare no que acontece na borda. Quando terminar, clique em Próxima parte.

### Seção 6. Mantenha o personagem na tela

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** completar o primeiro comportamento jogável e entregar o dia.
- **Conclui quando:** vídeo, três critérios de projeto aprovados e envio confirmado.
- **Blocos:** `video-d1-borda`, `ponte-d1-borda` e o Estúdio `projeto`.

**Ponte do Zappy na página (não gravar):** Agora mantenha o personagem na tela! Coloque o limite logo abaixo do movimento, teste as quatro beiradas e clique em Verificar esta parte. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir fase.

Primeiro a pessoa vê o personagem sair pela beirada no próprio jogo. Depois, com o bloco de movimento à vista, encaixa **Manter o sprite dentro da tela** logo abaixo dele (o bloco chega com **heroi**: trocar para **personagem**): primeiro move, depois confere a borda. Testar as quatro bordas com o dispositivo disponível, sem exigir teclado e toque de quem só tem um deles. Terminar em **Verificar esta parte → Objetivo cumprido! → Enviar meu projeto → Enviar → Projeto enviado! → Concluir fase**, com o reconhecimento da conquista antes de **Concluir fase**.

## Experiências e demonstrações desta aula

- **Jogo pronto:** atividade project-play com a cópia concluída de A Chave do Farol, `completion: participation` e targets vazio. Deixa jogar por toque ou teclado. Experimentar basta; não exigir vencer. É uma atividade isolada, sem Estúdio de entrega, e não alimenta a cadeia de criação.
- **Cena `lighthouse-walk`, cenário Farol:** criada em 05/10/2026 para o Dia 1. O personagem anda para a direita no mapa do farol. Os controles são Segurar a seta para a direita, Avançar 1 quadro, Rodar/Parar, Manter dentro da tela e Recomeçar. A mesma cena serve às duas experiências, cada uma com as metas do seu conceito (`setup.goals`); o controle de limite só aparece quando o caso cobra essa meta. Não se pedem metas nem controles de comparação de velocidades.
- **Montagens:** o projeto é o mesmo nas seções 4 e 6. A prévia atualiza sozinha; Atualizar não é um passo a repetir a cada encaixe.

Não apresentar evento, variável ou condição antes do uso. Nenhuma demonstração resolve o jogo pela pessoa.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-intro-farol` | Jogo, contexto, demonstração de um gesto, sem resolver, o aviso da partida e a surpresa do final plantada | Versão pronta | 80 a 100 s | Gravar (se houver mídia antiga no Admin, substituir) |
| `video-intro-caderno` | Capa e página real do PDF | Caderno anexado | 30 a 40 s | Gravar (se houver mídia antiga no Admin, substituir) |
| `video-d1-quadro` | Experiência: sem a seta e com a seta, quadro a quadro | Cena nova | 100 a 120 s | Gravar |
| `video-d1-andar` | Controles e movimento, teste e verificação | Projeto inicial | 5 a 6 min | Gravar |
| `video-d1-limite` | Experiência: sem e com o limite, a faixa fora da tela e a ordem na regra | Cena nova | 75 a 95 s | Gravar |
| `video-d1-borda` | Borda no jogo, limite, testes e entrega | Mesmo projeto | 150 a 190 s | Gravar (se houver mídia antiga no Admin, substituir) |

## Continuidade

Preservar as seções `apresentacao`, `caderno` e `borda` (agora a última, com a entrega), a chave `materiais-farol`, a chave `projeto` e a cadeia `desafio-primeiro-jogo`. Preservar também `quadro`, `andar` e `limite`. Retirar somente `tanto` e `velocidade`, com seus blocos aposentados explicitamente, sem apagar o progresso anterior. A pessoa programa as regras de movimento, não a arte nem o barco preparado.

Valores ensinados na montagem: controles com as quatro direções, personagem, velocidade 3 e movimento antes do limite de tela. Na avaliação, a magnitude pode variar, desde que respeite a direção pedida; zero não demonstra movimento. O Dia 2 assume esse trabalho enviado; a retomada preparada só é alternativa quando não há envio anterior.

No Admin, a aula antiga `boas-vindas` sai do curso sem apagar progresso nem certificados; ver [Atualização de aulas existentes](../../aulas-interativas-tecnico/modulos-desafio-primeiro-jogo.md#atualização-de-aulas-existentes). Anexar o PDF antes de gravar a seção 2. Os links do Como Fazer abrem na mesma aba e voltam para a aula.

## Revisão de ritmo e entendimento · 10/10/2026

O roteiro tem 8 entradas ao todo. As novas falas abaixo distribuem perguntas, reações e descobertas ao longo da montagem. A fala de entendimento aplica a ideia a um exemplo ou consequência; a comemoração pode ser breve. Preservar os passos e deixar o resultado visível antes da reação.

| Entrada | Depois da professora | Criança | Retomada da professora |
| --- | --- | --- | --- |
| F1P4-R01 | “Para fazer isso, a gente precisa dizer ao jogo o que ele deve fazer. É para isso que servem os comandos, que aqui aparecem como bloquinhos. Olha aqui: neste menu, chamado paleta de comandos, você escolhe os blocos que vai encaixar para montar as regras do seu jogo.” | Debinha: “Primeiro eu preciso pôr as setas na tela!” | “As setas entram quando o jogo começa, na área Ao iniciar. Encontre essa área e deixe à vista o fim dela, depois dos blocos que já estão lá. Se ela não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ela aparecer.” |
| F1P4-R02 | “Agora vamos testar! Segure uma seta da tela, ou, no computador, clique dentro do jogo e use as setas do teclado. Olha só: o personagem anda na direção da seta!” | Debinha: “Foi! Agora ele anda!” | “Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Ativar controles clássicos, com só as quatro direções, está no fim de Ao iniciar. E o bloco de movimento, com o sprite personagem, está dentro de A cada quadro do jogo. Depois de corrigir, teste de novo.” |
| F1P6-R01 | “Agora teste as quatro direções até chegar às beiradas. Olha só: ele para em cada beirada e não sai mais da tela!” | Debinha: “Agora posso segurar a seta que ele não vai embora!” | “Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, o bloco que move o personagem vem antes, e logo abaixo dele está Manter o sprite personagem dentro da tela. Depois de corrigir, teste de novo.” |
