# Como fazer: a biblioteca de ajuda da comunidade adulta

`como-fazer.json` é o conteúdo da biblioteca **Como fazer** da comunidade adulta
(`packages/community`, páginas `/ajuda` e `/como-fazer`): **8 coleções e 50 tutoriais** curtos, por
tarefa, em português do Brasil. O lote segue a prancha aprovada (Canvas "Comunidade adulta · direção
de arte", quadros Como fazer e Tutorial). **Nada deste arquivo está publicado.**

| Posição | Coleção | Tutoriais |
| --- | --- | --- |
| 0 | `primeiros-passos` · Primeiros passos | 6 |
| 1 | `aulas` · Aulas e cursos | 9 |
| 2 | `estudio` · Estúdio | 8 |
| 3 | `pinta` · Pinta | 4 |
| 4 | `pensa` · Pensa | 4 |
| 5 | `molda` · Molda | 4 |
| 6 | `comunidade` · Comunidade e oficinas | 6 |
| 7 | `conta` · Conta e acesso | 9 |

## O formato

É o mesmo `HelpImportBody` do members (`POST /members/admin/adult/help/tutorials/import`), o
formato do **Importar** e do **Exportar JSON** do admin, igual ao do Kids (`docs/como-fazer/`):
`collections` (slug, título, descrição, ícone, tom, posição) e `tutorials` (slug, coleção, posição
e o `draft`, um `HelpTutorialDocument`). Ícones, tons e `toolRef` vêm das allowlists do core
(`packages/core/src/help`). Links entre tutoriais usam `[texto](/como-fazer/<slug>)`.

## As regras da escrita

- Voz de "você", direta e calorosa, para adultos iniciantes. A régua de leitura é a de quem tem de
  50 a 70 anos e está chegando à tecnologia, sem nunca tratar a pessoa como idosa.
- Vocabulário adulto: curso, aula, seção, professor, equipe, Recados, Mural. Nada de aventura,
  fase, missão ou mascote, e "Mural" no lugar de "Mostra".
- Nome de botão, campo ou mensagem **em negrito, do jeito que está na tela**, conferido no código
  atual (`packages/community`, `member-shell`, `studio` em pt-BR, Pinta, Pensa e Molda). As telas
  que estão sendo redesenhadas (Mural, Meu avatar 3D e Meu espaço 3D) citam os rótulos das
  pranchas aprovadas.
- De 3 a 6 passos por tutorial, sem travessão, sem números, prazos ou preços inventados.
- Ainda não há imagens: as capturas das telas adultas entram pelo admin antes de publicar.

## Como validar

```sh
bun docs/como-fazer-adulto/validar.ts
```

Roda o mesmo validador que o members usa ao publicar (`validateHelpCollection`,
`validateHelpTutorial`) e confere o lote inteiro: formato do import, coleções e posições, slugs
únicos, `related` e links que existem, exatamente 50 tutoriais, pelo menos 3 por coleção, de 3 a 6
passos e o vocabulário adulto (palavras do Kids, "Mostra", "senhor", "senhora", "vovó", "vovô",
"idoso" e "criança" nos textos que a pessoa lê; as `keywords` ficam de fora, porque a busca precisa
achar o que a pessoa digita). Sai com código 1 se algo reprovar.

As sugestões do `helpEditorialWarnings` não bloqueiam. Hoje aparecem duas, e as duas são esperadas:
os 50 tutoriais ainda não têm imagem, e o tutorial de compras cita o botão **Cancelar assinatura**
(a régua de "texto comercial" foi pensada para o Kids).

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
