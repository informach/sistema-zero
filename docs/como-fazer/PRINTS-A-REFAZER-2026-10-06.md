# Prints a refazer no Como fazer (vocabulário da aventura, 06/10/2026)

Em 06/10/2026 a área Kids trocou o vocabulário da escola pelo da aventura no que a criança lê:
aula virou fase, seção virou parte, curso virou aventura, professor virou equipe, Caderno do Aluno
virou Mapa da Aventura e o item Aprender do menu virou Explorar
([Diretrizes pedagógicas](../aulas-interativas/DIRETRIZES-PEDAGOGICAS.md), seção 6). No fim do
mesmo dia, a grade de perfis passou a perguntar **Quem vai criar hoje?**, e o tutorial do
certificado passou a mostrar a fase **Seu certificado** do Cadê Todo Mundo?. Os textos e
os textos alternativos dos 42 tutoriais já estão com os nomes novos em
[como-fazer.json](como-fazer.json), mas os prints ainda mostram a plataforma antiga. Para refazer,
espere a plataforma nova estar no ar, capture a tela no Kids (num perfil de criança com o progresso
que o passo pede), abra o tutorial no Admin em **Como fazer**, envie a imagem em **Imagem da
interface** no passo com a id indicada abaixo e publique em **Revisar e publicar**. A id do passo é
o que liga a imagem ao texto: não troque ids nem slugs. Staging e produção guardam as mídias de cada
ambiente, então leve as imagens de um para o outro comparando o **Exportar JSON** dos dois, sem
sobrescrever mídia que só existe num deles, e traga o resultado para este arquivo pelo
**Exportar JSON**, para o lote não envelhecer.

**Na noite de 06/10/2026** o "guia" saiu da tela da criança: "Enviar para o guia" soava estranho.
O botão de envio passou a dizer o que a criança envia (**Enviar meu projeto**, **Enviar meu
desenho**, **Enviar (1)**), e quem recebe e responde os recados passou a ser **a equipe**
(**Recados da equipe**, **Enviar para a equipe** no pedido de ajuda, autor **Equipe** na conversa).
Nenhum print chegou a mostrar "guia": todos são da plataforma com "professor". Por isso a lista do
que refazer continua a mesma; mudou o que cada print precisa mostrar, e cinco tutoriais mudaram de
título (**Como pedir ajuda à equipe**, **Como enviar um projeto feito na fase**, **Como enviar uma
criação da galeria**, **Como ler e responder aos recados da equipe** e **Como trazer o projeto que
você enviou**; os slugs não mudaram). A galeria, que não tinha print nenhum, ganhou três prints
novos a capturar (seção "Prints novos").

## Como ler a lista

- **Certo**: o rótulo antigo é o elemento destacado no print, ou o print foi capturado com o menu da
  esquerda à vista (a recaptura de 03/10/2026, commits `aea89aeb` e `71103cae`, pôs o item Aprender
  em 19 prints).
- **Provável**: o rótulo antigo fica na mesma região da tela (rodapé da fase, cartão do Estúdio,
  rodapé do menu). Confira o quadro antes de refazer.
- O levantamento foi feito sem abrir as imagens (o CDN não estava acessível na sessão que montou a
  lista): ele saiu do texto alternativo de cada passo, do código das telas e do histórico dos prints.
- Dois pares de passos usam a mesma captura e podem ser refeitos uma vez só (marcados abaixo).
- Ao capturar, olhe o quadro inteiro. Qualquer rótulo da tabela abaixo no fundo da tela também
  denuncia o print.

| Hoje (antigo) | Depois (novo) |
| --- | --- |
| Menu: **Aprender** | **Explorar** |
| Menu, grupo Criar: **Meus trabalhos** | **Minhas criações** |
| Rodapé do menu e página: **Recados do professor** | **Recados da equipe** (no sino do celular, "1 recado novo da equipe") |
| Início: **Meus cursos** | **Minhas aventuras** |
| Mapa: **Cursos da Jornada do Criador** | **Aventuras da Jornada do Criador** |
| Cartão: "N de M aulas"; caminho: "N/M aulas" | "N de M fases"; "N/M fases" |
| Caminho da aventura: **Unidade N** | **Mundo N** |
| Barra de cima da fase: **Seção N de M** | **Parte N de M** |
| **Próxima seção**, **Concluir aula**, **Aula concluída** | **Próxima parte**, **Concluir fase**, **Fase concluída** |
| **Voltar à aula** (ampliação), **Voltar para a aula** (Como fazer) | **Voltar à fase**, **Voltar para a fase** |
| Cartão do Estúdio na fase: **Atividade no Estúdio** | **Seu projeto no Estúdio** |
| **Enviar para o professor**, **Reenviar ao professor**, "Projeto enviado ao professor" | **Enviar meu projeto**, **Enviar de novo**, "Projeto enviado!" e "A equipe já viu o seu projeto." |
| Janela: **Enviar ao professor?**, **Recado para o professor (opcional)** | **Enviar o seu projeto?** (no reenvio, **Enviar o seu projeto de novo?**, confirmado em **Reenviar**), **Recado (opcional)**, "A equipe vai receber…" |
| Pinta na fase: **Enviar para o professor**, **Enviar o desenho?**, "Desenho enviado ao professor" | **Enviar meu desenho**, **Enviar o seu desenho?**, "Desenho enviado!" |
| Galeria da fase: **Enviar ao professor (1)**, **Recado para o professor (opcional)**, "Trabalho recebido pelo professor." | **Enviar (1)**, **Recado (opcional)**, **Recebido!** |
| **Verificar esta etapa**, **Objetivos desta etapa**, **Objetivo da etapa cumprido!** | **Verificar esta parte**, **Objetivos desta parte**, **Objetivo cumprido!** |
| Ajuda: **Enviar ao professor** | **Enviar para a equipe** |
| Recado: **Voltar à seção: …**, autor "Professor(a)" | **Voltar à parte: …**, autor **Equipe**, título "Conversa com a equipe" |
| Selo do bloco de materiais: **Materiais** | **Baixe** |
| **Caderno do Aluno: …**, **Seu Caderno do Aluno** | **Mapa da Aventura: …**, **Seu Mapa da Aventura** |
| Quiz: **Nota mínima N%**, revisão **Correção** | **Meta: N% de acertos**, revisão **Respostas** |
| Mural: **Avisar professor** | **Avisar a equipe** |
| Grade de perfis: **Quem vai aprender hoje?** | **Quem vai criar hoje?** |
| Bloco do certificado: **Certificado de Conclusão** | **Certificado de Criador** (depois de reimportar os manifestos) |

## Plataforma

### Como abrir uma fase e trocar de parte · `plataforma-abrir-uma-aula`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `jornada` | Item **Aprender** destacado no menu; **Recados do professor** no rodapé do menu; na tela inicial, **Meus cursos** | **Explorar** destacado; **Recados da equipe**; **Minhas aventuras** | certo |
| `trilha` | Menu com **Aprender**; no topo do mapa, **Cursos da Jornada do Criador** | **Explorar**; **Aventuras da Jornada do Criador** | certo |
| `curso` | Menu com **Aprender**; cartão com "N de M aulas". Mesma captura de `plataforma-voltar-para-a-aula` / `jornada` | **Explorar**; "N de M fases" | certo |
| `secoes` | **Próxima seção** destacado no rodapé | **Próxima parte** e **Anterior** | certo |
| `trancada` | **Próxima seção** bloqueado; aviso "Para seguir:" com a frase antiga (ex.: "Envie seu projeto para o professor") | **Próxima parte** bloqueado; aviso na frase nova (ex.: "Envie o seu projeto") | certo |
| `concluir` | **Concluir aula** destacado | **Concluir fase** | certo |

### Como continuar uma fase · `plataforma-voltar-para-a-aula`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `perfil` | **Recados do professor** logo acima do nome e do avatar, no rodapé do menu | **Recados da equipe** | provável |
| `jornada` | Mesma captura de `plataforma-abrir-uma-aula` / `curso` | Refazer uma vez só | certo |
| `aula` | Caminho da aventura com a faixa **Unidade N** e "N/M aulas" | **Mundo N** e "N/M fases" | provável |
| `trabalho` | Cartão do Estúdio na fase com **Atividade no Estúdio** e **Reenviar ao professor** acima do menu Mais opções. Mesma captura de `estudio-recuperar-atividade-enviada` / `trazer` | **Seu projeto no Estúdio** e **Enviar de novo** | provável |

### Como mostrar o menu e a lista de fases · `plataforma-mostrar-o-menu`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `menu` | Página da fase com **Seção N de M** na barra de cima e **Próxima seção** no rodapé | **Parte N de M** e **Próxima parte** | provável |
| `lista` | A mesma página. A alça da borda direita não tem texto: o nome **Mostrar lista de fases** é só para o leitor de tela | **Parte N de M** e **Próxima parte** | provável |
| `ampliada` | **Voltar à aula** destacado | **Voltar à fase** | certo |

### Como pedir ajuda à equipe · `plataforma-pedir-ajuda`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | **Preciso de ajuda** destacado e, no mesmo rodapé, **Próxima seção** (ou **Concluir aula**) | **Próxima parte** (ou **Concluir fase**) | provável |
| `escrever` | Caixa "Em qual parte você ficou com dúvida?" com o botão **Enviar ao professor** | Caixa "Em que ponto desta parte você ficou com dúvida?" com **Enviar para a equipe** | certo |
| `enviar` | **Enviar ao professor** destacado | **Enviar para a equipe** | certo |
| `resposta` | Aviso "Pedido enviado…" com **Ver conversa**; acima dele, a caixa da dúvida com **Enviar ao professor** | **Enviar para a equipe** | provável |

### Como mudar a cor da plataforma · `plataforma-escolher-a-minha-cor`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `perfil` | Menu com **Aprender** e **Recados do professor** | **Explorar** e **Recados da equipe** | certo |
| `cor` | Menu com **Aprender** e **Recados do professor** ao lado da parte Cor do seu perfil | **Explorar** e **Recados da equipe** | certo |
| `guardar` | Menu com **Aprender** e **Recados do professor** | **Explorar** e **Recados da equipe** | certo |

### Como montar seu avatar · `plataforma-montar-o-avatar`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | Menu com **Aprender** e **Recados do professor**, grupo Meu espaço aberto | **Explorar** e **Recados da equipe** | certo |

### Como publicar seu jogo no Mural · `plataforma-publicar-no-mural`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `preparar` | Estúdio da Fase 2 do Cadê Todo Mundo? com **Enviar para o professor** (ou **Reenviar ao professor**) destacado, o título **Atividade no Estúdio** e **Seção N de M** no alto | **Enviar meu projeto** (ou **Enviar de novo**), **Seu projeto no Estúdio**, **Parte N de M** | certo |
| `compartilhar` | Cartão do Estúdio com **Reenviar ao professor** e "Projeto enviado ao professor" perto do **Compartilhar** | **Enviar de novo** e "Projeto enviado!" | provável |

### Como ver suas trilhas e seu progresso · `plataforma-ver-a-minha-jornada`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `mapa` | Item **Aprender** destacado; título **Cursos da Jornada do Criador** | **Explorar**; **Aventuras da Jornada do Criador** | certo |
| `trilha` | Menu com **Aprender**; título e frase do mapa falando em cursos | **Explorar**; **Aventuras da Jornada do Criador** | certo |
| `curso` | Menu com **Aprender**; cartões com "N de M aulas" e o recado do cartão bloqueado falando em curso | **Explorar**; "N de M fases"; recado novo | certo |
| `progresso` | Menu com **Aprender**; faixa **Unidade N** e "N/M aulas" no caminho | **Explorar**; **Mundo N** e "N/M fases" | certo |

### Como dar mais espaço ao jogo e à experiência · `plataforma-ampliar-a-atividade`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `dividir` | Fase dividida com **Seção N de M** no alto e **Próxima seção** no rodapé | **Parte N de M** e **Próxima parte** | provável |
| `ampliar` | **Ampliar experiência** destacado (não mudou) na página da fase com **Seção N de M** | **Parte N de M** | provável |
| `editor` | **Expandir** destacado ao lado de **Enviar para o professor**, no cartão **Atividade no Estúdio** | **Enviar meu projeto** e **Seu projeto no Estúdio** | provável |
| `celular` | Fase no celular com **Seção N de M** na barra de cima | **Parte N de M** | provável |

### Como encontrar uma ajuda no Como fazer · `plataforma-usar-o-como-fazer`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | **Recados do professor** logo abaixo do atalho **Como fazer** | **Recados da equipe** | provável |
| `buscar` | Menu com **Aprender**; nos resultados e nas coleções, títulos e descrições antigos (ex.: "O menu, as aulas, o seu perfil…") | **Explorar**; títulos e descrições novos | certo |
| `ler` | Menu com **Aprender**; títulos antigos nos resultados | **Explorar**; títulos novos | certo |
| `voltar` | **Voltar para a aula** destacado; menu com **Aprender** | **Voltar para a fase**; **Explorar** | certo |

### Como escolher ou trocar seu perfil · `plataforma-trocar-de-perfil`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `escolher` | Título **Quem vai aprender hoje?** na grade de perfis | **Quem vai criar hoje?** (decisão de 06/10/2026; o texto e o texto alternativo do passo já dizem assim) | certo |
| `trocar` | **Recados do professor** logo acima do nome e do avatar | **Recados da equipe** | provável |

### Como abrir o Mapa da Aventura e os materiais · `plataforma-baixar-materiais`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `encontrar` | Selo **Materiais** e o material **Caderno do Aluno: …** | Selo **Baixe** e **Mapa da Aventura: …** | certo |
| `livro` | PDF do Caderno do Aluno aberto como livro | PDF novo do Mapa da Aventura (os PDFs estão sendo gerados de novo junto com os cursos) | certo |
| `paginas` | PDF do Caderno do Aluno no modo **Ler por páginas** | PDF novo do Mapa da Aventura | certo |
| `baixar` | Nome do arquivo **Caderno do Aluno: …** (ou "Material da aula") ao lado de **Baixar** | **Mapa da Aventura: …** (ou "Material da fase") | provável |
| `opcional` | Parte **Seu Caderno do Aluno** | **Seu Mapa da Aventura** | certo |

### Como responder o quiz da fase · `plataforma-responder-o-quiz`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `rever` | Revisão com o título **Correção** | **Respostas** | certo |
| `tentar` | Tela "Quase lá!" com a revisão **Correção** acima de **Tentar de novo!** | **Respostas** | provável |
| `seguir` | **Próxima seção** destacado no rodapé; abaixo de "Quiz concluído", a revisão **Correção** | **Próxima parte**; **Respostas** | certo |

### Como enviar um projeto feito na fase · `plataforma-enviar-atividade`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `preparar` | **Verificar esta etapa** destacado; lista **Objetivos desta etapa**; título **Atividade no Estúdio** | **Verificar esta parte**, **Objetivos desta parte**, **Seu projeto no Estúdio**; se der, já com **Objetivo cumprido!** | certo |
| `abrir` | **Enviar para o professor** destacado | **Enviar meu projeto** | certo |
| `confirmar` | Janela **Enviar ao professor?**, campo **Recado para o professor (opcional)** e "O professor vai receber…" | **Enviar o seu projeto?**, **Recado (opcional)**, "A equipe vai receber…" | certo |
| `nova` | **Reenviar ao professor** destacado e "Projeto enviado ao professor" | **Enviar de novo** e "Projeto enviado!" | certo |
| `acompanhar` | **Recados do professor** destacado no menu | **Recados da equipe** | certo |

### Como ler e responder aos recados da equipe · `plataforma-ler-recados`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `sino` | **Recados do professor** destacado no rodapé do menu | **Recados da equipe** | certo |
| `conversa` | Página **Recados do professor**; menu com **Aprender** | **Recados da equipe**; **Explorar** | certo |
| `responder` | Conversa com o autor "Professor(a)" e, sem título próprio, "Conversa com o professor" | Autor **Equipe**; "Conversa com a equipe" | provável |
| `aula` | Link **Voltar à seção: …** destacado | **Voltar à parte: …** | certo |

### Como jogar os jogos do Mural · `plataforma-jogar-no-mural`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `mural` | Menu com **Aprender**, grupo Comunidade aberto | **Explorar** | certo |
| `link` | **Avisar professor** logo abaixo dos botões do jogo | **Avisar a equipe** | provável |
| `versao` | **Avisar professor** logo abaixo dos botões do jogo | **Avisar a equipe** | provável |

### Como jogar o exemplo pronto da fase · `plataforma-jogar-exemplo-da-aula`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `jogar` | Página da fase com **Seção N de M** no alto | **Parte N de M** | provável |
| `ampliar` | **Ampliar jogo** destacado (não mudou) na página da fase com **Seção N de M** | **Parte N de M** | provável |
| `avancar` | **Próxima seção** destacado | **Próxima parte** | certo |

### Como pegar seu certificado · `plataforma-pegar-certificado`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | Caminho da Nave Contra Asteroides com a fase "Seu certificado e próximos passos", a faixa **Unidade N** e "N/M aulas" | Caminho do **Cadê Todo Mundo?** com a fase **Seu certificado** destacada, **Mundo N** e "N/M fases". O texto alternativo já descreve o Cadê: a Nave não tem fase de certificado | certo |
| `concluir` | **Concluir aula** destacado | **Concluir fase** destacado na parte **Comemore sua criação**, da fase **Seu certificado** do Cadê Todo Mundo? | certo |
| `novamente` | Bloco do certificado com o título **Certificado de Conclusão** | **Certificado de Criador**, o título que os manifestos do Cadê e do Desafio já trazem. Refazer depois de reimportar os manifestos | certo |

## Estúdio

### Como ver seu jogo funcionando · `estudio-pre-visualizacao`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `pequena` | Estúdio estreito na fase com o cartão **Atividade no Estúdio** e **Enviar para o professor** | **Seu projeto no Estúdio** e **Enviar meu projeto** | provável |

### Como criar um projeto no Estúdio · `estudio-criar-um-projeto`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | Menu com **Aprender** e o grupo Criar aberto com **Meus trabalhos** em primeiro | **Explorar** e **Minhas criações** | certo |

### Como instalar os blocos de Jogo 2D · `estudio-instalar-jogo-2d`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `aula` | Estúdio na fase com o cartão **Atividade no Estúdio** e **Enviar para o professor** | **Seu projeto no Estúdio** e **Enviar meu projeto** | provável |

### Como salvar e reabrir seu jogo · `estudio-salvar-e-reabrir`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `aula` | **Enviar para o professor** destacado no alto do cartão **Atividade no Estúdio** | **Enviar meu projeto** e **Seu projeto no Estúdio** | certo |

### Como trazer o projeto que você enviou · `estudio-recuperar-atividade-enviada`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `aula` | Cartão **Atividade no Estúdio** destacado, com "Projeto enviado ao professor" e **Reenviar ao professor** | **Seu projeto no Estúdio**, "Projeto enviado!" e **Enviar de novo** | certo |
| `copia` | Cartão do Estúdio na fase com o título e o botão antigos acima do menu Mais opções | **Seu projeto no Estúdio** e **Enviar de novo** | provável |
| `trazer` | Mesma captura de `plataforma-voltar-para-a-aula` / `trabalho` | Refazer uma vez só | provável |
| `confirmar` | Janela **Trazer o que você enviou?** com "…o último projeto que você enviou ao professor…" | "…pelo último projeto que você enviou…" | certo |
| `conferir` | Cartão do Estúdio na fase com o título e o botão antigos | **Seu projeto no Estúdio** e **Enviar de novo** | provável |

## Pensa

### Como criar um plano no Pensa · `pensa-criar-um-plano`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | Menu com **Aprender** e o grupo Criar aberto com **Meus trabalhos** em primeiro | **Explorar** e **Minhas criações** | certo |

## Prints novos (galeria da fase, 06/10/2026, à noite)

O tutorial `plataforma-enviar-trabalho-da-galeria` não tem imagem nenhuma (o validador sugere um
print). Capture numa fase do O Jogo do Meu Jeito, que envia pela galeria, e acrescente a imagem e o
texto alternativo no passo indicado.

| Passo | Precisa mostrar |
| --- | --- |
| `abrir` | A parte da fase com o botão **Escolher no Estúdio** (ou **Escolher no Pinta**) destacado |
| `enviar` | A janela **Minhas criações do Estúdio** com um cartão marcado, o campo **Recado (opcional)** e o botão **Enviar (1)** destacado |
| `outra` | A parte da fase depois do envio, com **Recebido!** e o botão **Enviar outra versão** destacado |

## Conferir ao refazer (provavelmente não muda)

Estes prints mostram uma parte da tela em que o rótulo antigo só aparece se o recorte pegou o fundo.

| Tutorial | Passos | O que conferir |
| --- | --- | --- |
| `plataforma-trocar-de-perfil` | `selecionar` | O menu da conta abre sobre o rodapé do menu, onde fica **Recados do professor** |
| `plataforma-responder-o-quiz` | `responder`, `enviar` | **Seção N de M** na barra de cima, se ela estiver no quadro |
| `plataforma-pausar-e-rever-video` | `controles`, `pausar`, `voltar`, `continuar` | A página da fase em volta do vídeo (**Seção N de M**, **Próxima seção**) |
| `plataforma-jogar-exemplo-da-aula` | `recomecar` | A página da fase em volta do jogo |
| `plataforma-publicar-no-mural` | `texto`, `capa`, `publicar`, `copia`, `link`, `opcional` | O cartão do Estúdio ou a barra da fase atrás da janela ou da comemoração |
| `pinta-usar-no-estudio` | `aula` | O cartão **Atividade no Estúdio** atrás da janela Materiais do jogo |

## Contagem

- 182 prints no lote, em 176 capturas distintas.
- 73 prints a refazer (71 capturas, porque dois pares repetem a mesma imagem): 47 certos e 26 prováveis.
  Na revisão do fim do dia 06/10/2026, entraram `plataforma-trocar-de-perfil/escolher` ("Quem vai
  criar hoje?") e `plataforma-pegar-certificado/novamente` ("Certificado de Criador"), que estavam
  em "conferir", e `plataforma-pegar-certificado/abrir` passou de provável a certo (agora mostra o
  Cadê Todo Mundo?).
- 15 prints para conferir na hora de refazer.
- 3 prints novos da galeria, que ainda não existem no lote (seção "Prints novos").
- Os outros 94 mostram só telas das ferramentas (Estúdio completo, Pinta, Pensa, Molda, avatar e
  Mural) e não têm rótulo antigo.
