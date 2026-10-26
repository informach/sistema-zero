# Como fazer: a biblioteca de ajuda da comunidade adulta

`como-fazer.json` é o conteúdo da biblioteca **Como fazer** da comunidade adulta
(`packages/community`, páginas `/ajuda` e `/como-fazer`): **8 coleções e 64 tutoriais** curtos, por
tarefa, em português do Brasil. O lote segue a prancha aprovada (Canvas "Comunidade adulta · direção
de arte", quadros Como fazer e Tutorial). **Nada deste arquivo está publicado.**

| Posição | Coleção | Tutoriais |
| --- | --- | --- |
| 0 | `primeiros-passos` · Primeiros passos | 6 |
| 1 | `aulas` · Aulas e cursos | 9 |
| 2 | `estudio` · Estúdio | 10 |
| 3 | `pinta` · Pinta | 7 |
| 4 | `pensa` · Pensa | 8 |
| 5 | `molda` · Molda | 6 |
| 6 | `comunidade` · Comunidade e oficinas | 7 |
| 7 | `conta` · Conta e acesso | 11 |

## O formato

É o mesmo `HelpImportBody` do members (`POST /members/admin/adult/help/tutorials/import`), o
formato do **Importar** e do **Exportar JSON** do admin, igual ao do Kids (`docs/como-fazer/`):
`collections` (slug, título, descrição, ícone, tom, posição) e `tutorials` (slug, coleção, posição
e o `draft`, um `HelpTutorialDocument`). Ícones, tons e `toolRef` vêm das allowlists do core
(`packages/core/src/help`). Links entre tutoriais usam `[texto](/como-fazer/<slug>)`.

## As regras da escrita

- Voz de "você", direta e calorosa, para adultos iniciantes. A régua de leitura é a de quem tem de
  50 a 70 anos e está chegando à tecnologia, sem nunca tratar a pessoa como idosa.
- **Os mesmos nomes das duas comunidades** (desde 21/10/2026; Diretrizes Pedagógicas, seção 6,
  "Mesmos nomes nas duas comunidades"): curso → módulo → aula → parte, com os rótulos **Próxima
  parte**, **Partes da aula**, **Verificar projeto**, **Objetivos do projeto**, **Enviar meu
  projeto**, **Enviar de novo**, **Concluir aula** e **Baixar meu certificado**, e o material
  **Passo a passo do projeto**. Quem recebe e responde é **a equipe** (Recados), nunca "o
  professor"; numa oficina ao vivo, quem conduz não tem gênero fixo ("quem conduz", ou o nome).
  "Aventura" só descreve a história de um curso e "fase", um nível real de jogo. "Seção" só quando
  a tela escreve assim (o contador da aula ainda diz **Seção 2 de 5**), e "missão" só onde ela é o
  nome da tela (**Missões** em Seu progresso, as missões do Pensa). "Mural", nunca "Mostra".
- O recurso tem nome, sem "IA" solta: **o Zappy** (o tutor do Estúdio), **o Pensa**,
  **créditos** e **assistente virtual** (o vocabulário da comunidade adulta,
  `packages/community/CLAUDE.md`).
- O menu: no computador é o **menu da esquerda** (os seis destinos, Recados e, no pé, o cartão com
  a foto que abre o menu do perfil); no celular são as **abas de baixo** (Início, Cursos, Criar,
  Comunidade e **Mais**). Escreva "no menu" e, quando o caminho no celular for outro, diga qual.
- Nome de botão, campo ou mensagem **em negrito, do jeito que está na tela**, conferido no código
  atual (`packages/community`, `member-shell`, `studio` em pt-BR, Pinta, Pensa e Molda). Rótulo
  que só existe para o leitor de tela (`aria-label`, como a alça da lista de aulas) não vai em
  negrito: descreva o que a pessoa vê. Botão e controle é "clique em", nunca "toque" ou "aperte".
- De 3 a 6 passos por tutorial, sem travessão, sem números, prazos ou preços inventados.
- Ainda não há imagens: as capturas das telas adultas entram pelo admin antes de publicar. Cada
  passo que vai ter print já traz o `imageAlt` que descreve a captura combinada; passo sem print
  (atalho de teclado, passo que só aponta para outro tutorial) fica sem `imageAlt`.

## Como validar

```sh
bun docs/como-fazer-adulto/validar.ts
```

Roda o mesmo validador que o members usa ao publicar (`validateHelpCollection`,
`validateHelpTutorial`) e confere o lote inteiro: formato do import, coleções e posições, slugs
únicos, `related` e links que existem, exatamente 64 tutoriais, pelo menos 3 por coleção, de 3 a 6
passos e o vocabulário adulto nos textos que a pessoa lê: os rótulos antigos de navegação e a
concordância errada da troca de nomes (`palavras-da-escola.ts`, a mesma régua das aulas e do Kids),
"professor(a)", "IA" solta, "toque/aperte em" num botão, "Mostra", "senhor", "senhora", "vovó",
"vovô", "idoso" e "criança". As `keywords` ficam de fora, porque a busca precisa achar o que a
pessoa digita ("professor", "seção", "IA"). Sai com código 1 se algo reprovar.

As sugestões do `helpEditorialWarnings` não bloqueiam. Hoje aparecem quatro, e todas são esperadas:
os 64 tutoriais ainda não têm imagem, e três tutoriais citam a assinatura de propósito (o menu, que
lista **Compras e assinatura**, o de compras, com o botão **Cancelar assinatura**, e o de trocar o
cartão): a régua de "texto comercial" foi pensada para o Kids.

## Como importar

1. No admin, abra **Como fazer** e escolha a plataforma **Adultos** no alternador da barra lateral.
2. Aba **Importar** → **Selecionar arquivo JSON** → escolha este `como-fazer.json`, confira a
   prévia e clique em **Aplicar importação**. O import cria ou atualiza pelo slug e só mexe no
   **rascunho**.
3. Aba **Tutoriais**: abra cada tutorial, acrescente as capturas, use **Pré-visualizar** e depois
   **Revisar e publicar**.

**Publicar em staging e em produção é um passo manual da equipe.** Antes de importar sobre um
ambiente que já tem tutoriais, exporte o conteúdo atual (**Exportar JSON**): o import substitui o
rascunho inteiro de cada slug e removeria imagens ou vídeos que já estejam lá.

## Quando a interface mudar

Quem muda um rótulo de botão procura o texto antigo aqui
(`git grep -n "Rótulo antigo" docs/como-fazer-adulto`), corrige o tutorial no admin, publica de novo
e traz a mudança para este arquivo pelo **Exportar JSON**.
