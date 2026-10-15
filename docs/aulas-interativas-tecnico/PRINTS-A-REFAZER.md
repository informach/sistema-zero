# Prints a refazer nos cadernos e no mapa dos pais

> Levantado em 20/09/2026, junto com a atualização da copy dos quatro materiais.
> A copy já está na plataforma atual. **Os prints não**: todos são anteriores às mudanças de
> 17 a 20/09/2026, e boa parte mostra rótulo de bloco que não existe mais.
>
> A régua usada aqui: um print entra na lista quando o que ele mostra **mudou de nome, de lugar
> ou de desenho**. Print do jogo rodando não entra, porque o jogo é o mesmo.

## O que mudou na plataforma e atinge print

| Mudança | Data | Quem atinge |
|---|---|---|
| Paleta do Jogo 2D reorganizada em 14 famílias e 44 seções | antes de 20/09 | todo print com a coluna da esquerda aberta, e todo print de blocos montados |
| `Ir para a tela` → `Mudar o estado do jogo para`, `a tela atual é` → `o estado do jogo é __ ?` | antes de 20/09 | prints de blocos das telas e estados |
| `Tocar som de pulo` deixou de existir, virou `Tocar efeito` com a opção `pulo` | antes de 20/09 | prints de bloco de som do Corre, Dino! |
| Menu ⋯ do Estúdio: seis grupos novos, e `Exportar para o Estúdio` virou `Baixar o projeto` | 18/09 | prints do menu ⋯ |
| Cor do perfil substituiu o tema claro/escuro; não existe mais tema Rosa | 17/09 | prints de perfil e de personalização |
| Aula imersiva: menu esquerdo e lista de aulas recolhem sozinhos, título e índice saem do corpo, rodapé fixo com Anterior, Preciso de ajuda e Próxima seção | 19/09 | todo print da página de aula |
| A coluna da esquerda do Estúdio ganhou **Blocos deste jogo** | antes de 20/09 | prints do Estúdio com a coluna à vista |
| Cenas interativas passam a ser só experimentação; o modo "Agora é sua vez" saiu | 20/09 | prints de experiência |
| **Carreira do Criador virou Jornada do Criador**: o item do menu chama **Jornada**, o título de `/cursos` é **Cursos da Jornada do Criador** e o `/perfil` diz **Minha jornada** | 22/09 | todo print com o menu da esquerda à vista, e os de `/cursos`, `/perfil` e mapa |

## Aproveitáveis: já existem prints novos no `sistema-zero`

Estes são de **17/09/2026** e já mostram a interface nova. Servem de fonte para vários itens
abaixo, com recorte:

```
packages/funnel/public/img/desafio-primeiro-jogo/plataforma-estudio.webp
packages/funnel/public/img/desafio-primeiro-jogo/plataforma-aula.webp
packages/funnel/public/img/desafio-primeiro-jogo/plataforma-experimento.webp
packages/funnel/public/img/desafio-primeiro-jogo/plataforma-materiais.webp
packages/funnel/public/img/desafio-primeiro-jogo/plataforma-trilha.webp
packages/funnel/public/img/comunidade-dos-criadores/print-aula.webp
packages/funnel/public/img/comunidade-dos-criadores/print-jornada.webp
packages/funnel/public/img/comunidade-dos-criadores/print-clube.webp
packages/funnel/public/img/comunidade-dos-criadores/print-espaco.webp
packages/funnel/public/img/comunidade-dos-criadores/print-mural.webp
packages/funnel/public/img/comunidade-dos-criadores/print-recados.webp
```

⚠️ Dois deles já nascem parcialmente vencidos: o `plataforma-aula.webp` ainda mostra o
**Índice da aula**, que a aula imersiva de 19/09 retirou, e o `plataforma-experimento.webp` mostra
uma cena no formato de demonstração, que a decisão de 20/09 removeu.

---

## Caderno do Aluno · Desafio do Primeiro Jogo

`meus-produtos/desafio-primeiro-jogo/entregas/produto/assets-caderno/`

| Arquivo | O que precisa mostrar agora | Prioridade |
|---|---|---|
| `estudio.png` | A tela do Estúdio com a coluna da esquerda mostrando os **cinco** itens de hoje: Pesquisar, Áreas do projeto, **Blocos deste jogo**, Programação e Jogo 2D. Os botões de cima da área do jogo são Parar e Atualizar. Sem Compartilhar à vista | alta |
| `blocos-dia1.png` | A pilha do Dia 1 com os rótulos atuais, com `Desenhar fundo de estrelas (velocidade 1)` entre parênteses e `Mover o sprite nave com as setas <- -> (velocidade 7)` | alta |
| `blocos-dia2.png` | Idem, com `Mover os sprites do grupo tiros usando suas velocidades` e `Tocar efeito tiro` | alta |
| `blocos-dia3.png` | Idem, com `Tocar efeito explosão` e a colisão entre os grupos | alta |
| `blocos-dia4.png` | Idem, com as vidas e o placar | alta |
| `blocos-dia5.png` | Idem, com `Mudar o estado do jogo para` e `o estado do jogo é __ ?` nos quatro momentos | alta |
| `modo-criacao-guiada.png` | **Sai do caderno.** O botão não existe mais: o lado a lado liga sozinho acima de 1080 px de coluna, com divisória arrastável, e o que restou é o Expandir. A seção que usava este print foi reescrita | — |
| `salvo.png` | O alto do Estúdio na sequência real: **Alterações não salvas** virando **Salvo**, ao lado do nome do projeto | alta |
| `quiz.png` | A Hora do Desafio na aula imersiva, sem o título e o índice no corpo | média |
| `enviar.png` | O botão **Enviar para o professor** na barra do Estúdio da aula | média |
| `mural.png` | O Mural dos Criadores atual | baixa |
| `copiar-blocos.png` | O menu de clique direito num bloco, com **Copiar blocos** | baixa |
| `jornada.png` | A tela de Jornada com os **oito** postos, de Faísca a Lenda | alta |

**Novo, que o caderno passou a precisar:** um print da **página de aula** mostrando a barra de
cima com `Seção X de Y`, e o rodapé com **Anterior**, **Preciso de ajuda** e **Próxima seção**.
A fonte mais perto é o `plataforma-aula.webp`, que precisa ser recapturado sem o Índice da aula.

---

## Mapa dos Pais · Desafio do Primeiro Jogo

`meus-produtos/desafio-primeiro-jogo/entregas/produto/assets-mapa/`

| Arquivo | O que precisa mostrar agora | Prioridade |
|---|---|---|
| `trilha-cortada.png` | A trilha do curso com a aula de boas-vindas **Onde fica cada coisa** antes do Dia 1, e os títulos novos dos dias 3, 4 e 5 | alta |
| `perfil-publico.png` | A Área dos pais e a tela de editar perfil, com o rótulo atual do toggle: **Perfil público na comunidade kids** | alta |
| `liga-semana.png` | A liga da semana atual | baixa |

**Novo, que o mapa passou a precisar:** um print de uma **experiência** na tela, para a seção nova
"Ele não só copia blocos. Ele descobre antes". Tem que ser no formato de experimentação, não no de
demonstração.

---

## Caderno do Aluno · Corre, Dino!

`meus-produtos/comunidade-dos-criadores/entregas/cursos/corre-dino/caderno/assets-caderno/`

| Arquivos | O que precisa mostrar agora | Prioridade |
|---|---|---|
| `blocos-aula1.png` a `blocos-aula13.png` (13) | As pilhas com os rótulos atuais. Os que mais mudaram: a **1** (sai o `Descrever o jogo para leitor de tela`, a pilha fica com três blocos), a **4** (`Tocar efeito pulo` no lugar de `Tocar som de pulo`), a **5** e a **6** (`Mover os sprites do grupo cactos usando suas velocidades`), e as **7 a 13** (`Mudar o estado do jogo para` e `o estado do jogo é __ ?`) | alta |
| `aula1-tela.png` a `aula13-tela.png` (13) | São a tela do jogo, e o jogo não mudou. **Só a `aula1-tela.png` precisa de olhada**, porque a pilha do Ao iniciar encolheu | baixa |
| `corre-dino-jogo.png` | O jogo pronto. Serve | — |

⚠️ **A Aula 1 mudou de conteúdo, não só de nome.** O bloco `Descrever o jogo para leitor de tela`
saiu do curso por decisão de produto de 20/09/2026, e com ele o passo inteiro. Quem refizer o
`blocos-aula1.png` precisa montar a pilha **sem** ele, e a `blocos-aula2.png` idem.

---

## Caderno do Aluno · O Jogo do Meu Jeito

`meus-produtos/comunidade-dos-criadores/entregas/cursos/o-jogo-do-meu-jeito/caderno/assets-caderno/`

Os 42 prints são de **22/08/2026**, anteriores a todas as mudanças de setembro. Este é o caderno
com mais print de interface, porque o curso inteiro é sobre a plataforma.

| Arquivos | O que precisa mostrar agora | Prioridade |
|---|---|---|
| `print-1-1-estudio-vazio.webp` | A tela **Meus Jogos** vazia, com o menu recolhido e a alça **Mostrar menu** na beirada | alta |
| `print-1-2-novo-projeto.webp` | A janela **Novo projeto**, com **Nome do projeto**, **Cancelar** e **Criar e abrir** | média |
| `print-1-3-sem-jogo-2d.webp` | A coluna da esquerda sem o Jogo 2D, **com o item Blocos deste jogo à vista**, e o menu ⋯ aberto nos seis grupos atuais | alta |
| `print-1-4-extensoes.webp` | A janela **Extensões oficiais** com o cartão do Jogo 2D instalado | média |
| `print-1-5-exportar.webp` | O menu ⋯ no grupo **Levar o jogo**, com **Baixar o projeto** e a linha de apoio. O nome antigo `Exportar para o Estúdio` não existe mais | alta |
| `print-1-6` a `print-1-9` (4) | Jogo importado, dois projetos na lista, Mural e remix | média |
| `print-2-*` a `print-5-*` (19) | Telas do **Pinta**: assistente de quatro perguntas, caixa de ferramentas, faixa de quadros, prévia, galeria **Meus desenhos** e o selo **Guardado na sua conta** | alta |
| `print-6-*` e `print-7-*` (8) | Telas do **Estúdio** com os blocos de imagem e animação, na nomenclatura atual | alta |
| `print-8-*` (5) | Publicar no Mural, o cartão publicado e o Clube dos Criadores | média |

**Novos, que o caderno passou a precisar:** um print por experiência seria demais, mas **um** print
de experiência na abertura, mostrando como ela é na tela, ajudaria o aluno a reconhecer a parada.

---

## O Zappy

Os cinco Zappys do caderno do Desafio (`zappy-aponta`, `zappy-console`, `zappy-dica`, `zappy-joia`,
`zappy-trofeu`), os quatro do mapa dos pais e os do Corre, Dino! são da versão **vagalume**, de
12/09/2026. A dona avisou em 20/09 que o personagem mudou de novo e não é mais vagalume nem robô.

**As imagens novas não estão em nenhum repositório local.** O que existe:

- `sistema-zero/docs/design/zappy-vagalume/` — o vagalume, com README, galeria e 19 artes mestras
- `vault-comunidade-sz/20-Projetos/Curso-Logica-Kids/assets/zappy.jpeg` — o robô, versão anterior

Depois de 12/09 os commits que tocam o Zappy são só de voz (ElevenLabs) e animação (`.riv`).
Quando as artes novas aparecerem, são **14 substituições** nos quatro materiais, e vale refazer a
galeria de `docs/design/` junto, para o próximo não medir de novo.

---

## Como conferir depois de trocar um print

1. Abrir o HTML por um servidor local, para as imagens carregarem:
   `python3 -m http.server 8777` na pasta do caderno.
2. No navegador, conferir que nenhuma página estourou e que nenhuma imagem quebrou:
   `document.querySelectorAll('.page--auto').length` tem que dar **0**, e
   `[...document.images].filter(i => !i.naturalWidth)` tem que vir **vazio**.
3. Gerar o PDF em Chrome headless com `--virtual-time-budget=30000` e `--no-pdf-header-footer`.
4. Conferir as fontes embutidas: o PDF tem que trazer `Baloo2-*` e `Nunito*`. Se vier só `ArialMT`,
   as fontes não entraram e a paginação vai divergir do navegador.
