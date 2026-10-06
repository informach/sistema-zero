# Prints a refazer no Como fazer (vocabulário da aventura, 06/10/2026)

Em 06/10/2026 a área Kids trocou o vocabulário da escola pelo da aventura no que a criança lê:
aula virou fase, seção virou parte, curso virou aventura, professor virou guia, Caderno do Aluno
virou Mapa da Aventura e o item Aprender do menu virou Explorar
([Diretrizes pedagógicas](../aulas-interativas/DIRETRIZES-PEDAGOGICAS.md), seção 6). Os textos e
os textos alternativos dos 42 tutoriais já estão com os nomes novos em
[como-fazer.json](como-fazer.json), mas os prints ainda mostram a plataforma antiga. Para refazer,
espere a plataforma nova estar no ar, capture a tela no Kids (num perfil de criança com o progresso
que o passo pede), abra o tutorial no Admin em **Como fazer**, envie a imagem em **Imagem da
interface** no passo com a id indicada abaixo e publique em **Revisar e publicar**. A id do passo é
o que liga a imagem ao texto: não troque ids nem slugs. Staging e produção guardam as mídias de cada
ambiente, então leve as imagens de um para o outro comparando o **Exportar JSON** dos dois, sem
sobrescrever mídia que só existe num deles, e traga o resultado para este arquivo pelo
**Exportar JSON**, para o lote não envelhecer.

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
| Rodapé do menu e página: **Recados do professor** | **Recados do guia** |
| Início: **Meus cursos** | **Minhas aventuras** |
| Mapa: **Cursos da Jornada do Criador** | **Aventuras da Jornada do Criador** |
| Cartão: "N de M aulas"; caminho: "N/M aulas" | "N de M fases"; "N/M fases" |
| Caminho da aventura: **Unidade N** | **Mundo N** |
| Barra de cima da fase: **Seção N de M** | **Parte N de M** |
| **Próxima seção**, **Concluir aula**, **Aula concluída** | **Próxima parte**, **Concluir fase**, **Fase concluída** |
| **Voltar à aula** (ampliação), **Voltar para a aula** (Como fazer) | **Voltar à fase**, **Voltar para a fase** |
| Cartão do Estúdio na fase: **Atividade no Estúdio** | **Seu projeto no Estúdio** |
| **Enviar para o professor**, **Reenviar ao professor**, "Projeto enviado ao professor" | **Enviar para o guia**, **Reenviar para o guia**, "Projeto enviado para o guia" |
| Janela: **Enviar ao professor?**, **Recado para o professor (opcional)** | **Enviar para o guia?**, **Recado para o guia (opcional)** |
| **Verificar esta etapa**, **Objetivos desta etapa**, **Objetivo da etapa cumprido!** | **Verificar esta parte**, **Objetivos desta parte**, **Objetivo cumprido!** |
| Ajuda: **Enviar ao professor** | **Enviar para o guia** |
| Recado: **Voltar à seção: …**, autor "Professor(a)" | **Voltar à parte: …**, autor **Guia** |
| Selo do bloco de materiais: **Materiais** | **Baixe** |
| **Caderno do Aluno: …**, **Seu Caderno do Aluno** | **Mapa da Aventura: …**, **Seu Mapa da Aventura** |
| Quiz: **Nota mínima N%**, revisão **Correção** | **Meta: N% de acertos**, revisão **Respostas** |
| Mural: **Avisar professor** | **Avisar a equipe** |

## Plataforma

### Como abrir uma fase e trocar de parte · `plataforma-abrir-uma-aula`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `jornada` | Item **Aprender** destacado no menu; **Recados do professor** no rodapé do menu; na tela inicial, **Meus cursos** | **Explorar** destacado; **Recados do guia**; **Minhas aventuras** | certo |
| `trilha` | Menu com **Aprender**; no topo do mapa, **Cursos da Jornada do Criador** | **Explorar**; **Aventuras da Jornada do Criador** | certo |
| `curso` | Menu com **Aprender**; cartão com "N de M aulas". Mesma captura de `plataforma-voltar-para-a-aula` / `jornada` | **Explorar**; "N de M fases" | certo |
| `secoes` | **Próxima seção** destacado no rodapé | **Próxima parte** e **Anterior** | certo |
| `trancada` | **Próxima seção** bloqueado; aviso "Para seguir:" com a frase antiga (ex.: "Envie seu projeto para o professor") | **Próxima parte** bloqueado; aviso na frase nova (ex.: "Envie seu projeto para o guia") | certo |
| `concluir` | **Concluir aula** destacado | **Concluir fase** | certo |

### Como continuar uma fase · `plataforma-voltar-para-a-aula`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `perfil` | **Recados do professor** logo acima do nome e do avatar, no rodapé do menu | **Recados do guia** | provável |
| `jornada` | Mesma captura de `plataforma-abrir-uma-aula` / `curso` | Refazer uma vez só | certo |
| `aula` | Caminho da aventura com a faixa **Unidade N** e "N/M aulas" | **Mundo N** e "N/M fases" | provável |
| `trabalho` | Cartão do Estúdio na fase com **Atividade no Estúdio** e **Reenviar ao professor** acima do menu Mais opções. Mesma captura de `estudio-recuperar-atividade-enviada` / `trazer` | **Seu projeto no Estúdio** e **Reenviar para o guia** | provável |

### Como mostrar o menu e a lista de fases · `plataforma-mostrar-o-menu`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `menu` | Página da fase com **Seção N de M** na barra de cima e **Próxima seção** no rodapé | **Parte N de M** e **Próxima parte** | provável |
| `lista` | A mesma página. A alça da borda direita não tem texto: o nome **Mostrar lista de fases** é só para o leitor de tela | **Parte N de M** e **Próxima parte** | provável |
| `ampliada` | **Voltar à aula** destacado | **Voltar à fase** | certo |

### Como pedir ajuda ao seu guia · `plataforma-pedir-ajuda`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | **Preciso de ajuda** destacado e, no mesmo rodapé, **Próxima seção** (ou **Concluir aula**) | **Próxima parte** (ou **Concluir fase**) | provável |
| `escrever` | Caixa "Em qual parte você ficou com dúvida?" com o botão **Enviar ao professor** | **Enviar para o guia** | certo |
| `enviar` | **Enviar ao professor** destacado | **Enviar para o guia** | certo |
| `resposta` | Aviso "Pedido enviado…" com **Ver conversa**; acima dele, a caixa da dúvida com **Enviar ao professor** | **Enviar para o guia** | provável |

### Como mudar a cor da plataforma · `plataforma-escolher-a-minha-cor`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `perfil` | Menu com **Aprender** e **Recados do professor** | **Explorar** e **Recados do guia** | certo |
| `cor` | Menu com **Aprender** e **Recados do professor** ao lado da parte Cor do seu perfil | **Explorar** e **Recados do guia** | certo |
| `guardar` | Menu com **Aprender** e **Recados do professor** | **Explorar** e **Recados do guia** | certo |

### Como montar seu avatar · `plataforma-montar-o-avatar`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | Menu com **Aprender** e **Recados do professor**, grupo Meu espaço aberto | **Explorar** e **Recados do guia** | certo |

### Como publicar seu jogo no mural · `plataforma-publicar-no-mural`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `preparar` | Estúdio da Fase 2 do Cadê Todo Mundo? com **Enviar para o professor** (ou **Reenviar ao professor**) destacado, o título **Atividade no Estúdio** e **Seção N de M** no alto | **Enviar para o guia** (ou **Reenviar para o guia**), **Seu projeto no Estúdio**, **Parte N de M** | certo |
| `compartilhar` | Cartão do Estúdio com **Reenviar ao professor** e "Projeto enviado ao professor" perto do **Compartilhar** | **Reenviar para o guia** e "Projeto enviado para o guia" | provável |

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
| `editor` | **Expandir** destacado ao lado de **Enviar para o professor**, no cartão **Atividade no Estúdio** | **Enviar para o guia** e **Seu projeto no Estúdio** | provável |
| `celular` | Fase no celular com **Seção N de M** na barra de cima | **Parte N de M** | provável |

### Como encontrar uma ajuda no Como fazer · `plataforma-usar-o-como-fazer`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | **Recados do professor** logo abaixo do atalho **Como fazer** | **Recados do guia** | provável |
| `buscar` | Menu com **Aprender**; nos resultados e nas coleções, títulos e descrições antigos (ex.: "O menu, as aulas, o seu perfil…") | **Explorar**; títulos e descrições novos | certo |
| `ler` | Menu com **Aprender**; títulos antigos nos resultados | **Explorar**; títulos novos | certo |
| `voltar` | **Voltar para a aula** destacado; menu com **Aprender** | **Voltar para a fase**; **Explorar** | certo |

### Como escolher ou trocar seu perfil · `plataforma-trocar-de-perfil`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `trocar` | **Recados do professor** logo acima do nome e do avatar | **Recados do guia** | provável |

### Como abrir o Mapa da Aventura e os materiais · `plataforma-baixar-materiais`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `encontrar` | Selo **Materiais** e o material **Caderno do Aluno: …** | Selo **Baixe** e **Mapa da Aventura: …** | certo |
| `livro` | PDF do Caderno do Aluno aberto como livro | PDF novo do Mapa da Aventura (os PDFs estão sendo gerados de novo junto com as aventuras) | certo |
| `paginas` | PDF do Caderno do Aluno no modo **Ler por páginas** | PDF novo do Mapa da Aventura | certo |
| `baixar` | Nome do arquivo **Caderno do Aluno: …** (ou "Material da aula") ao lado de **Baixar** | **Mapa da Aventura: …** (ou "Material da fase") | provável |
| `opcional` | Parte **Seu Caderno do Aluno** | **Seu Mapa da Aventura** | certo |

### Como responder o quiz da fase · `plataforma-responder-o-quiz`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `rever` | Revisão com o título **Correção** | **Respostas** | certo |
| `tentar` | Tela "Quase lá!" com a revisão **Correção** acima de **Tentar de novo!** | **Respostas** | provável |
| `seguir` | **Próxima seção** destacado no rodapé; abaixo de "Quiz concluído", a revisão **Correção** | **Próxima parte**; **Respostas** | certo |

### Como enviar para o guia um projeto feito na fase · `plataforma-enviar-atividade`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `preparar` | **Verificar esta etapa** destacado; lista **Objetivos desta etapa**; título **Atividade no Estúdio** | **Verificar esta parte**, **Objetivos desta parte**, **Seu projeto no Estúdio**; se der, já com **Objetivo cumprido!** | certo |
| `abrir` | **Enviar para o professor** destacado | **Enviar para o guia** | certo |
| `confirmar` | Janela **Enviar ao professor?**, campo **Recado para o professor (opcional)** e "O professor vai receber…" | **Enviar para o guia?**, **Recado para o guia (opcional)**, "O seu guia vai receber…" | certo |
| `nova` | **Reenviar ao professor** destacado e "Projeto enviado ao professor" | **Reenviar para o guia** e "Projeto enviado para o guia" | certo |
| `acompanhar` | **Recados do professor** destacado no menu | **Recados do guia** | certo |

### Como ler e responder aos recados do guia · `plataforma-ler-recados`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `sino` | **Recados do professor** destacado no rodapé do menu | **Recados do guia** | certo |
| `conversa` | Página **Recados do professor**; menu com **Aprender** | **Recados do guia**; **Explorar** | certo |
| `responder` | Conversa com o autor "Professor(a)" e, sem título próprio, "Conversa com o professor" | Autor **Guia**; "Conversa com o guia" | provável |
| `aula` | Link **Voltar à seção: …** destacado | **Voltar à parte: …** | certo |

### Como jogar os jogos do mural · `plataforma-jogar-no-mural`

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
| `abrir` | Caminho da Nave Contra Asteroides com a faixa **Unidade N** e "N/M aulas" | **Mundo N** e "N/M fases" | provável |
| `concluir` | **Concluir aula** destacado | **Concluir fase** | certo |

## Estúdio

### Como ver seu jogo funcionando · `estudio-pre-visualizacao`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `pequena` | Estúdio estreito na fase com o cartão **Atividade no Estúdio** e **Enviar para o professor** | **Seu projeto no Estúdio** e **Enviar para o guia** | provável |

### Como criar um projeto no Estúdio · `estudio-criar-um-projeto`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | Menu com **Aprender** e o grupo Criar aberto com **Meus trabalhos** em primeiro | **Explorar** e **Minhas criações** | certo |

### Como instalar os blocos de Jogo 2D · `estudio-instalar-jogo-2d`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `aula` | Estúdio na fase com o cartão **Atividade no Estúdio** e **Enviar para o professor** | **Seu projeto no Estúdio** e **Enviar para o guia** | provável |

### Como salvar e reabrir seu jogo · `estudio-salvar-e-reabrir`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `aula` | **Enviar para o professor** destacado no alto do cartão **Atividade no Estúdio** | **Enviar para o guia** e **Seu projeto no Estúdio** | certo |

### Como trazer o projeto que você enviou para o guia · `estudio-recuperar-atividade-enviada`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `aula` | Cartão **Atividade no Estúdio** destacado, com "Projeto enviado ao professor" e **Reenviar ao professor** | **Seu projeto no Estúdio**, "Projeto enviado para o guia" e **Reenviar para o guia** | certo |
| `copia` | Cartão do Estúdio na fase com o título e o botão antigos acima do menu Mais opções | **Seu projeto no Estúdio** e **Reenviar para o guia** | provável |
| `trazer` | Mesma captura de `plataforma-voltar-para-a-aula` / `trabalho` | Refazer uma vez só | provável |
| `confirmar` | Janela **Trazer o que você enviou?** com "…o último projeto que você enviou ao professor…" | "…o último projeto que você enviou para o guia…" | certo |
| `conferir` | Cartão do Estúdio na fase com o título e o botão antigos | **Seu projeto no Estúdio** e **Reenviar para o guia** | provável |

## Pensa

### Como criar um plano no Pensa · `pensa-criar-um-plano`

| Passo | Hoje mostra | Precisa mostrar | Certeza |
| --- | --- | --- | --- |
| `abrir` | Menu com **Aprender** e o grupo Criar aberto com **Meus trabalhos** em primeiro | **Explorar** e **Minhas criações** | certo |

## Conferir ao refazer (provavelmente não muda)

Estes prints mostram uma parte da tela em que o rótulo antigo só aparece se o recorte pegou o fundo.

| Tutorial | Passos | O que conferir |
| --- | --- | --- |
| `plataforma-trocar-de-perfil` | `escolher` | O título **Quem vai aprender hoje?** não está no glossário de 06/10/2026. Se a tela de perfis mudar de nome, refazer e atualizar o tutorial |
| `plataforma-trocar-de-perfil` | `selecionar` | O menu da conta abre sobre o rodapé do menu, onde fica **Recados do professor** |
| `plataforma-responder-o-quiz` | `responder`, `enviar` | **Seção N de M** na barra de cima, se ela estiver no quadro |
| `plataforma-pausar-e-rever-video` | `controles`, `pausar`, `voltar`, `continuar` | A página da fase em volta do vídeo (**Seção N de M**, **Próxima seção**) |
| `plataforma-jogar-exemplo-da-aula` | `recomecar` | A página da fase em volta do jogo |
| `plataforma-publicar-no-mural` | `texto`, `capa`, `publicar`, `copia`, `link`, `opcional` | O cartão do Estúdio ou a barra da fase atrás da janela ou da comemoração |
| `plataforma-pegar-certificado` | `novamente` | O título do bloco (hoje "Certificado de Conclusão") muda se o manifesto da aventura definir outro, como "Certificado de Criador" |
| `pinta-usar-no-estudio` | `aula` | O cartão **Atividade no Estúdio** atrás da janela Materiais do jogo |

## Contagem

- 182 prints no lote, em 176 capturas distintas.
- 71 prints a refazer (69 capturas, porque dois pares repetem a mesma imagem): 44 certos e 27 prováveis.
- 17 prints para conferir na hora de refazer.
- Os outros 94 mostram só telas das ferramentas (Estúdio completo, Pinta, Pensa, Molda, avatar e
  Mural) e não têm rótulo antigo.
