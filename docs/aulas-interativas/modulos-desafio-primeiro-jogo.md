# Módulos do Desafio do Primeiro Jogo

**Título do curso:** Desafio do Primeiro Jogo · A Chave do Farol

**Descrição curta:** Programe sua primeira aventura: encontre a chave e acenda o farol para guiar um barco.

**Descrição:** Conheça a aventura jogando uma versão pronta. Depois, em três dias, programe as regras do seu jogo: faça o personagem andar pelo mapa, recolher a chave e abrir a porta do farol quando estiver com ela. O cenário, os desenhos e o movimento do barco já vêm preparados. Você constrói as regras que ligam esses momentos, testa cada parte e aprende a publicar seu jogo no Mural. O Estúdio aparece dentro das aulas. Não é preciso usar o Pinta nem o Estúdio completo.

Revisão de 03/10/2026: aplicação do formato testado no Cadê Todo Mundo. Contexto pertinente antes de cada tarefa, instruções completas, menos navegação obrigatória, verificação antes do envio e publicação orientada.

O [review pedagógico do curso](qa/review-pedagogico-desafio-2026-10-03.md) registra os achados e as correções seguintes: conceitos explicados no momento do uso, critérios vinculados ao encontro e ramo corretos, instruções completas e caderno alinhado às aulas. As propostas por aula incluem a triagem dos conceitos exigida no briefing.

A [revisão de 04/10/2026](qa/revisao-pedagogica-desafio-2026-10-04.md) foi aplicada aos materiais locais: comparação de velocidades no Dia 1, experiência de memória no Dia 2, porta em duas etapas no Dia 3 e pergunta final de diagnóstico. As gravações, a atualização remota e o ensaio com crianças ainda são etapas de produção.

**Revisão de linguagem de 05/10/2026**, com o Cadê Todo Mundo? como referência de voz. Roteiros, pontes do Zappy, instruções das experiências e do jogo pronto, fala do quiz e caderno passaram a seguir o mesmo jeito de falar:

- a tarefa vem na primeira frase;
- uma ação por parágrafo;
- o caminho da paleta completo ("Abra Jogo 2D, depois Movimento e depois Movimentos prontos");
- "Confira:" depois de cada montagem;
- teste com o resultado esperado e uma correção curta;
- a mesma fórmula de verificação e envio do Cadê;
- "clique em" para botões.

Os rótulos foram conferidos no código. Correções:

- o bloco de valor lógico aparece como **verdadeiro**, com menu, e não como "Verdadeiro ou falso";
- o senão é acrescentado pelo **+** ao lado de **senão**, na linha abaixo do Se;
- o bloco se chama **A cada quadro do jogo**;
- o bloco **texto** vem com Olá, que precisa ser apagado;
- **Atualizar** fica logo acima do jogo, e **Compartilhar** fica no alto do Estúdio.

Também em 05/10, cada montagem que aplica uma experiência passou a começar pela **retomada no próprio jogo**: lembra o que a experiência mostrou, pede um teste que mostra o que ainda falta e diz o que será montado. Exemplo: "Leve o personagem até a chave. Ele passa por ela e nada acontece, porque nenhuma ação está ligada a esse encontro." As oito montagens e os subtítulos do caderno seguem essa ordem.

Ainda em 05/10, a pedido do responsável, toda montagem passou a seguir **primeiro o destino, depois a peça**. A fala manda deixar à vista a área, o bloco vizinho ou o espaço vazio. Só então a criança abre a paleta, pega o bloco e arrasta até lá. Antes, o roteiro mandava pegar o bloco e depois procurar a área, o que é difícil com o bloco preso no mouse. A regra entrou nas Diretrizes e na especificação do roteiro, e o caderno segue a mesma ordem.

A revisão de linguagem não mudou seções nem critérios. A divisão em seções, descrita abaixo, veio depois, no mesmo dia, e criou as seções, a experiência e os critérios intermediários novos. As gravações e o ensaio com crianças continuam pendentes.

## Módulo 1 · Sua aventura no farol

**Resumo do módulo:** Conheça a aventura A Chave do Farol e programe as regras que fazem o jogo acontecer. Você vai fazer o personagem andar, recolher a chave e abrir a porta do farol para guiar o barco. Teste cada construção, aprenda a publicar seu jogo no Mural e guarde seu certificado.

| Aula | Seções | Resultado |
| --- | --- | --- |
| [O personagem ganha movimento](aulas/desafio-dia-1.md) | 8 | Jogar a versão pronta e conhecer o caderno. Depois, experimentar e montar, uma ideia por vez: andar a cada quadro, velocidade e limite da tela. |
| [A chave muda a aventura](aulas/desafio-dia-2.md) | 4 | Experimentar a memória e montar a coleta em três partes: recolher, guardar e avisar. |
| [A luz do farol](aulas/desafio-dia-3.md) | 5 | Comparar a condição, montar as duas respostas em etapas, deixar o jogo com a sua cara e publicar o mesmo jogo. |
| [Seu certificado](aulas/desafio-certificado.md) | 2 | Rever as regras no quiz, reconhecer a autoria e guardar a conquista. |

São quatro aulas, dezenove seções e dezoito vídeos. **Desde 05/10/2026, cada seção trabalha uma ideia, e cada conceito novo tem uma experiência antes de virar bloco.** O Dia 1 usa a cena nova `lighthouse-walk` em três experiências. As montagens intermediárias verificam sem enviar, e cada dia tem um envio só, na última montagem. **Desde 05/10/2026, não há aula só de introdução:** toda aula termina numa ação prática. Por isso, a versão pronta e o caderno abrem o Dia 1, como na Aula 1 do Cadê Todo Mundo?. A apresentação não é um tour: mostra a aventura antes do convite para jogar. No Dia 1, as explicações ficam nas experiências `quadro`, `tanto` e `limite`. A experiência da porta continua no Dia 3. **Desde 05/10/2026, o mexa e veja é uma seção própria, só com mudanças que ficam no jogo:** no Dia 1, a criança escolhe a velocidade e fica com ela; no Dia 3, depois do envio e antes de publicar, **Deixe o jogo com a sua cara** troca o personagem (todos com a caixa 64 × 64 e a mesma área de contato) e os avisos. Saíram o "troque 3 por 1 e volte para 3" e os textos opcionais dentro das montagens. A seção comercial obrigatória sai do certificado.

O [quiz único antes do certificado](proposta-quizzes-cursos-curtos-2026-10-03.md) integra os materiais locais: quatro perguntas, fala inicial do Zappy e nenhum vídeo na seção. A seção de celebração e os identificadores existentes foram preservados.

## Projeto e conclusão

Identificador do curso e cadeia: `desafio-primeiro-jogo`. Aulas: `dia-1`, `dia-2`, `dia-3`, `certificado`. Preservar esses destinos e a chave `projeto` em cada dia. A antiga aula `boas-vindas` sai do curso na atualização do Admin.

A cadeia prioriza o envio anterior da criança. Os projetos embutidos dos Dias 2 e 3 são retomadas somente quando não há trabalho anterior. O jogo pronto do Dia 1 é uma atividade isolada e nunca deve substituir o projeto da criança.

Cada entrega ensina testar, **Verificar esta etapa**, corrigir pendências, conferir **Objetivo da etapa cumprido!**, esperar **Salvo**, **Enviar para o professor** e confirmar **Enviar**. Testes manuais do comportamento complementam a verificação dos blocos.

No Dia 1, as experiências `quadro`, `tanto` e `limite` antecedem as montagens `andar`, `velocidade` e `borda`; só `borda` envia. No Dia 2, a primeira seção compara a coleta com e sem memória, o afastamento e o reinício. Depois, `recolher` e `guardar` verificam sem enviar, e `programar-chave` monta o aviso e envia. No Dia 3, `sem-chave` constrói e verifica a resposta em senão; `decisao` completa então e recebe a entrega única; `personalizar` (mexa e veja, sem critério) troca o personagem e os avisos antes da publicação. Os critérios são cumulativos:

- Dia 1: dois nas etapas `andar` e `velocidade` e três na entrega; a velocidade é escolha da criança, e nenhum critério exige um número de velocidade;
- Dia 2: quatro em `recolher`, sete em `guardar` e oito na entrega;
- Dia 3: dez na etapa sem chave e quatorze na entrega final. O teste jogado liga os dois ramos na mesma partida e confere o reinício depois da vitória. A verificação não exige copiar literalmente as frases dos avisos.

O inventário [blocos-desafio-primeiro-jogo.json](blocos-desafio-primeiro-jogo.json) é gerado junto dos manifestos e descreve os blocos disponíveis para este Farol, incluindo os preparados. O inventário do jogo antigo de nave permanece no acervo legado.

O projeto preparado e a paleta usam somente **Programação e Jogo 2D**. As áreas Ao iniciar, Quando acontecer e Enquanto estiver rodando organizam esses blocos. A tela é criada pelo facilitador Jogo 2D; não liberar HTML, CSS ou Canvas nem embutir blocos dessas categorias no projeto inicial.

As dezoito seções com vídeo têm uma ponte do Zappy imediatamente após o vídeo, encaminhando a ação da criança. As pontes são texto da página, não novos vídeos ou critérios de conclusão.

No Dia 3, a seção de publicação usa o mesmo Estúdio da montagem. **Compartilhar** fica disponível após o envio. O resumo vem preenchido (na aula, o título vem do curso e não aparece na janela); ensinar gerar capa, publicar e esperar a confirmação. Publicar é a tarefa, mas o vídeo segue como critério técnico daquela seção. Não criar bloqueio novo por acesso expirado ao Mural.

## Materiais de consulta

- **Caderno do Aluno:** [desafio-farol-caderno.pdf](../../output/pdf/desafio-farol-caderno.pdf). PDF único com passos de montagem, testes, entrega, publicação e ajuda. Anexar em `materiais-farol`, com `bookPreview: true`.
- **Como Fazer:** links contextuais no caderno e na primeira montagem do Dia 1 e na publicação. Abrem na mesma aba e permitem voltar à aula. Não exigir consulta, impressão ou download para concluir.

O [gerador do caderno](recursos/desafio-farol/gerar-materiais.py) usa o conteúdo de `caderno-conteudo.json` e a composição de `gerar-caderno.ts`, com o mesmo CSS, fontes locais e blocos desenhados do Cadê Todo Mundo. O PDF tem 20 páginas, incluindo capa, montagens ilustradas, testes, publicação e certificado. O caderno deve ser anexado antes da gravação que o apresenta.

O conteúdo do caderno acompanha as seções reais: visão geral, passos de montagem, testes, publicação, certificado e ajuda. Não existe um mapa como material ou atividade adicional. Por orientação posterior do responsável em 03/10/2026, o PDF do mapa para responsáveis foi retirado do repositório e não será gerado. O único material para anexar é o Caderno do Aluno.

## Atualização de aulas existentes

Os quatro manifestos locais são fontes de autoria, com `plannedVideo`. **Não importar cegamente sobre aulas publicadas.** Antes de aplicar no admin:

1. Registrar o estado atual: IDs das seções/blocos, vídeos vinculados, anexos e alunos com progresso.
2. Conferir o diff preservando as chaves mantidas, a cadeia e o bloco de certificado. Usar a reconciliação de seções para não criar projetos paralelos.
3. Tratar `retireBlockKeys` explicitamente. Retiram-se os dois vídeos sem prática do Dia 1 e o pitch do certificado.
   - A aula `boas-vindas` inteira sai do curso, com seu tour antigo.
   - Importar antes o Dia 1 com as seções `apresentacao` e `caderno` e anexar o caderno.
   - Depois, despublicar ou retirar `boas-vindas` sem apagar o progresso, as entregas nem os certificados já registrados.
   - Se o Admin só permitir apagar, registrar antes quem tem progresso nela. Não apagar mídia apenas porque o molde local contém `plannedVideo`.
4. Conferir os dezessete vídeos planejados. Regravar os existentes e gravar os novos:
   - `video-d1-quadro`, `video-d1-andar`, `video-d1-tanto`, `video-d1-velocidade` e `video-d1-limite`;
   - `video-d2-recolher` e `video-d2-guardar`;
   - `video-d3-sem-chave`. Os roteiros de caderno e publicação precisam corresponder aos materiais e à interface reais. Manter vínculos de mídia até a substituição conferida.
5. Atualizar o caderno, preservando anexos que já existem até a substituição ser conferida. Retirar da aula a referência ao mapa antigo, se houver, sem apagar a mídia armazenada.
6. Conferir o novo bloco `experiencia-memoria`, a seção `sem-chave`, sua verificação sem envio e a pergunta `q-memoria-coleta` (substitui q2 do Farol). Preservar conquistas e certificados anteriores.
7. Ensaiar com conta nova e conta com progresso, inclusive certificado já emitido. Conferir avanço após as seções retiradas, a entrada pelo Dia 1 sem a aula `boas-vindas`, retomada do projeto e retorno do Como Fazer.
8. Publicar somente depois de conferir mídia, conclusão e a experiência completa.

## Escopo comercial e outros cursos

A oferta atual do Desafio concede 30 dias de curso e Mural completo, seguidos de Mural visitante. Ofertas históricas podem ter outros direitos. Esta adaptação editorial não muda preço, prazo, catálogo, funil ou concessões.

O curso antigo de nave está em [Nave Contra Asteroides](modulos-nave-contra-asteroides.md), com outro identificador. Não alterar seus cinco dias.

## Verificações

```powershell
bun docs/aulas-interativas/qa/gerar-desafio-farol.ts
bun test docs/aulas-interativas/qa/desafio-farol-manifestos.test.ts docs/aulas-interativas/qa/desafio-farol-projeto.test.ts docs/aulas-interativas/qa/desafio-farol-regressoes.test.ts
bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-
python docs/aulas-interativas/validar-roteiros.py desafio-
bun docs/como-fazer/validar.ts
python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py
```

Além dos checks locais, ensaiar em navegador por toque e teclado, tela estreita, Estúdio ampliado, retorno de ajuda, duas situações da porta, verificação, envio, publicação e certificado. Fazer novo ensaio com crianças: os ajustes vieram do Cadê Todo Mundo, mas a compreensão deste Desafio ainda precisa ser observada. Estes arquivos não significam que o curso publicado já foi atualizado.
