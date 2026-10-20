# Diretrizes da versão adulta dos cursos

Decisão de 20/10/2026: os cursos são os mesmos para crianças e adultos. O adulto faz o mesmo jogo, com as mesmas aulas, seções, blocos e verificações. Muda a conversa: a linguagem, os exemplos e as analogias são de adulto. O tom continua de conversa, simples e objetivo.

A versão adulta não é escrita do zero nem mantida à mão nos arquivos finais. Ela é gerada a partir dos arquivos kids e de uma tradução por trecho. Veja [Como gerar](#como-gerar) no fim.

## Para quem escrevemos

Adulto de 18 anos ou mais que cresceu jogando, sem formação em programação e com pouco tempo. Faz isso por hobby, não por carreira. Diz coisas como "sempre quis fazer um jogo", "abri a Unity e fechei no mesmo dia", "começo e não termino", "não sou programador". Tem medo de curso de criança, de promessa de carreira e de pagar e largar. Quer terminar um jogo, mesmo pequeno, e mandar o link para os amigos.

Fonte: `docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/quiz-dados.json`, chave `voz.adulto`.

## O tom

- Conversa direta, de você para você, como um amigo que entende do assunto mostrando na tela. Nada de professor de escola, nada de palestra.
- Frases curtas e ligadas umas às outras ("por isso", "mas", "agora que", "ou seja"). Cada resultado vem com o porquê.
- Continua chamando a atenção para a tela: "Olha aqui", "Repare", "Veja", "Percebe?". Pode trocar o "Tá vendo?" infantil por "Percebe?" ou "Viu?".
- Sem infantilizar: nada de "que conquista!", "você arrasou", "uhu", diminutivos ("bloquinho", "pouquinho", "bichinho"), exclamação a cada frase ou elogio exagerado. Um reconhecimento curto e sincero no fim de uma etapa grande basta ("Pronto, seu jogo já reage ao toque.").
- Sem formalidade nem jargão: não use "o usuário", "o aluno", "o desenvolvedor", "lúdico", "gamificação", "jornada de aprendizagem", "portfólio". Termos técnicos do próprio curso (variável, sprite, evento) continuam, explicados na primeira vez como já são no kids.
- Mesma simplicidade e objetividade do kids. Se uma frase do kids já serve para um adulto, mantenha. A versão adulta não fica mais longa.

## Exemplos e analogias

Mantenha a analogia do kids sempre que ela já serve para um adulto: placar de futebol, jogo de tabuleiro, desenho animado, álbum de figurinhas, corrida com sinal de largada, freio da bicicleta, campainha, termômetro, cronômetro, porta com chave. Troque só o que é do mundo da criança (brinquedo, escola, brincadeira infantil) e tire os diminutivos, mesmo quando a analogia fica ("anotar num bloquinho" vira "anotar num papel"). A comparação nova precisa ensinar a mesma ideia e ter o mesmo tamanho.

| Kids (trocar) | Adulto |
| --- | --- |
| fila do escorregador | fila do caixa, carros entrando numa rodovia |
| brincar de pega-pega com bambolê | carrinhos de bate-bate: o para-choque encosta antes da lataria |
| pular na cama elástica | arremessar uma bola de basquete |
| mochila de passeio com o brinquedo que não se usa | carteira com a nota que não se usa |
| livro de colorir | mapa com a fronteira em linha e o país pintado |
| brincar de esconde-esconde com os amigos | jogo de achar objetos escondidos, como os que você jogava no celular |
| mostrar para a família, com ajuda de um adulto | mandar o link para os amigos, para o grupo, para quem você quiser |

Prefira referências de jogos que um adulto conhece (fliperama, videogame da infância, jogos de celular), sem citar marcas registradas como se fossem nossas. Os memes ilustrados continuam desenhados por nós, sem foto de pessoa real e sem meme da internet; quando a analogia muda, o meme muda junto, e sem o Zappy.

## Os nomes da plataforma adulta

A plataforma adulta mostra outros nomes de botões e partes. O texto precisa dizer exatamente o que está na tela (`packages/member-shell/src/lib/lesson-copy.ts`, `ADULT_LESSON_COPY`).

| Kids | Adulto |
| --- | --- |
| aventura | curso |
| fase (a aula) | aula |
| parte | seção |
| Próxima parte | Próxima seção |
| Partes da fase | Índice da aula |
| Verificar esta parte | Verificar esta etapa |
| Objetivos desta parte | Objetivos desta etapa |
| Objetivo cumprido! | Objetivo da etapa cumprido! |
| Ainda falta um objetivo | Ainda falta cumprir um objetivo desta etapa |
| Enviar meu projeto | Enviar para o professor |
| Enviar o seu projeto? (confirmação) | Enviar ao professor? (o botão da confirmação continua Enviar) |
| Enviar de novo | Reenviar ao professor |
| Projeto enviado! | Projeto enviado ao professor |
| Guardado na sua conta (selo do rascunho dentro da aula) | Salvo na sua conta (o selo do Estúdio e do Pinta completos continua Guardado na sua conta nas duas plataformas) |
| Concluir fase | Concluir aula |
| Pegar meu certificado | Emitir meu certificado |
| Recado (opcional), no envio | Recado para o professor |
| Seu projeto no Estúdio (cabeçalho do bloco) | Atividade no Estúdio |
| Minhas criações do Estúdio/Pinta, Recebido! (galeria) | Meus trabalhos do Estúdio/Pinta, Trabalho recebido pelo professor |
| Mostrar menu | não existe no adulto (o Estúdio abre sem o menu do alto) |
| Responder! / Próxima (quiz, uma pergunta por vez) | Enviar quiz (o quiz adulto mostra todas as perguntas numa página só) |
| Tentar de novo! (quiz) | troque a resposta errada e clique em Enviar quiz de novo |
| Mapa da Aventura | caderno do curso (o bloco de materiais tem o título "Caderno do curso: <curso>"; o PDF se chama Caderno do Aluno) |
| a equipe (quem recebe o projeto) | o professor |
| Enviar para a equipe (pedido de ajuda) | Enviar ao professor |
| Parte concluída! | Etapa concluída! |

"Fase" continua valendo quando é a fase do JOGO (nível), escrita "fase do jogo". Nunca para falar da aula. Exceção: a experiência copy-vs-original mostra os rótulos "O jogo da fase" e "Cor da nave na fase" nos dois públicos, e a fala cita o que está na tela.

Nome de ferramenta que aparece na tela fica como está, mesmo com diminutivo ("quadradinhos" no Pinta, a peça "Mover o Dino um pouquinho").

### O Zappy e os avatares

- Na plataforma adulta não há mascote. O diálogo da página aparece como um recado destacado, sem personagem. Nos roteiros, troque o rótulo "Zappy na página (não gravar)" por **"Recado na página (não gravar)"**, e não escreva o recado como fala de personagem.
- Não existem avatares infantis nos vídeos adultos. Retire as participações da Debinha e do Dedé e as orientações de edição sobre elas. Junte a fala da professora num texto contínuo que faça sentido sem a interrupção. Se a pergunta do avatar trazia uma informação útil, a professora a diz com as próprias palavras.
- As notas sobre gravação e edição do kids (vídeos já gravados, inserções, cortes, datas de produção) não valem para o adulto. A versão adulta ainda não foi gravada: diga isso uma vez no topo do roteiro, de forma curta, e escreva a direção de tela sem os avatares.

### Publicar no Mural

Na plataforma adulta, depois de Publicar, aparece a tela do próprio Estúdio: "Publicado!", "Seu projeto já está no Mural dos Criadores.", com os botões Ver no Mural, Abrir o jogo e Copiar link. Não há a comemoração do Zappy nem o botão Copiar link de jogar. Também não se pede ajuda a um adulto para mandar o link.

### Links do Como fazer

A biblioteca de ajuda adulta tem outros endereços (`docs/como-fazer-adulto/como-fazer.json`). Troque os links no texto. Nos campos `url` dos materiais o gerador troca sozinho, pela mesma tabela (`COMO_FAZER_ADULTO` em `qa/adulto/versao-adulta.ts`), e para se encontrar um link sem par:

| Kids | Adulto |
| --- | --- |
| `/como-fazer/plataforma-abrir-uma-aula` | `/como-fazer/aula-abrir-e-passar-de-secao` |
| `/como-fazer/plataforma-ampliar-a-atividade` | `/como-fazer/estudio-usar-na-aula` |
| `/como-fazer/plataforma-baixar-materiais` | `/como-fazer/aula-baixar-materiais` |
| `/como-fazer/plataforma-mostrar-o-menu` | `/como-fazer/primeiros-menu-do-alto` |
| `/como-fazer/plataforma-pedir-ajuda` | `/como-fazer/aula-pedir-ajuda` |
| `/como-fazer/plataforma-publicar-no-mural` | `/como-fazer/comunidade-publicar-no-mural` |
| `/como-fazer/plataforma-voltar-para-a-aula` | `/como-fazer/primeiros-continuar-o-curso` |
| `/como-fazer/como-fazer` | `/como-fazer/primeiros-achar-um-passo-a-passo` |

## O que nunca muda

- Nomes de blocos, categorias, campos, valores, coordenadas, teclas e nomes de botões do Estúdio. O adulto monta o mesmo jogo, e a fala precisa bater com a tela.
- Nomes dos jogos e dos cursos (Corre, Dino!, Cadê Todo Mundo?, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito).
- Textos que aparecem dentro do próprio jogo (o que o jogo escreve na tela).
- A ordem das seções, dos passos e dos testes, e as regras pedagógicas: experiência antes da montagem, demonstração na primeira pessoa, "Agora é a sua vez" só no fim, conferência depois do teste.
- Marcação Markdown: títulos (`#`, `##`, `###`), negrito, tabelas, citações com `>` e as chaves dos clipes entre crases (`` `video-abertura` ``).
- Anotações técnicas para a equipe (estimativas, notas de tela, chaves de blocos) continuam, ajustadas ao adulto quando falam da criança.

## Como gerar

A estrutura vem sempre de `docs/aulas-interativas/kids/`. O texto adulto fica em `qa/adulto/traducoes/<curso>/<grupo>.json`: um arquivo por aula (o conteúdo, o roteiro e o manifesto da aula juntos) e `_curso.json` para o README e os módulos. Cada trecho é um par:

```json
{ "onde": "corre-dino-aula-01.roteiro.md", "kids": "texto kids", "adulto": "texto adulto" }
```

- `adulto: null` é trecho ainda sem versão adulta; a geração para.
- `adulto: ""` tira o trecho da versão adulta (por exemplo, a fala de um avatar).
- Se o trecho não precisa de mudança, repita o texto kids.
- Nos trechos de roteiro, a fala inteira entre aspas é um trecho só. Mantenha o `>` no começo de cada linha e as aspas curvas.

Comandos, da raiz do repositório:

```powershell
bun docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts --preparar   # trechos novos do kids viram null
bun docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts              # grava docs/aulas-interativas/adulto
bun test docs/aulas-interativas-tecnico/qa/adulto                          # confere sincronia, manifestos e vocabulário
```

Quando o kids muda, rode `--preparar`: o trecho alterado volta como `null` e precisa de nova versão adulta. Assim a versão adulta nunca fica com uma frase antiga sem ninguém perceber. O curso adulto é outro curso no Admin, com público Adulto e o slug do kids seguido de `-adulto`.
