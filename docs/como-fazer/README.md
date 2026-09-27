# Como fazer: a biblioteca de ajuda do Kids

> O que é, como o lote inicial entra na plataforma e como manter os tutoriais vivos quando a
> interface mudar. Implantado em 26/09/2026 (core/help, members `0097`, gateway, member-shell,
> studio, community-kids e admin).

## O que é (e o que não é)

**"Como fazer"** é uma biblioteca de tutoriais curtos, por tarefa, separada dos cursos. A criança
chega por três portas: o atalho no rodapé do menu (acima dos Recados), o ícone de interrogação na
barra de cima do celular, e links `/como-fazer/<slug>` dentro das aulas (bloco de materiais e
texto), que abrem em **nova aba** com o botão "Voltar para a aula".

- **Todo perfil infantil vê**, inclusive o gratuito e o do Desafio. Ler um tutorial **nunca libera**
  Pinta, Estúdio, Molda ou Pensa: quando o tutorial fala de uma ferramenta que o perfil não tem, a
  página avisa isso de forma factual, sem oferta, sem "peça para seus pais".
- **Não é curso.** Não há progresso, conclusão, certificado, XP, quiz nem obrigação de assistir.
  Os vídeos têm marca d'água (como na aula), mas ninguém conta o que foi visto.
- **Alimenta o Zappy.** O que está publicado entra na busca do tutor do Estúdio: ele responde ou
  aponta o passo a passo (chip "Passo a passo: … ↗").
- Os cursos continuam ensinando na hora certa (a Aula 1 do "Cadê Todo Mundo?" é a referência).
  A biblioteca é para consultar depois, ou quando o tour da aula envelheceu.

## As regras da escrita

Voz de "você", frases curtas, um passo por cartão. Sem travessão. Sem jargão de IA.

1. **Nome de botão só do jeito que está na tela**, em negrito: **Próxima seção**, **Mais opções**,
   **Usar no Estúdio**. Antes de escrever, confira em
   `docs/aulas-interativas/REFERENCIA-PLATAFORMA.md` (o menu, as ações de plataforma, o menu ⋯ do
   Estúdio, a lista de projetos, o Pinta), em `packages/studio/src/core/i18n/pt-BR.ts`, em
   `packages/pinta/src/core/copy.ts` e em `packages/pensa/src/components/{PensaApp,TaskPlan}.tsx`.
2. **Nada comercial dirigido à criança.** O validador do core recusa "compre", "assine", "peça para
   seus pais", "Comunidade dos Criadores" e afins (`helpEditorialWarnings`), e a página do Kids
   nunca mostra o `KidsLockedProduct` aqui.
3. **Palavras alternativas** (`keywords`) são as que a criança diria: "prévia", "olhinho",
   "cadê o menu", "bloquinhos". A busca pesa título > palavras > resumo > passos, sem acento.
4. **Título é a tarefa**: "Como ver meu jogo na Pré-visualização", não "Pré-visualização".
5. Imagem só com texto alternativo. Vídeo só Vimeo ou YouTube. Sem print no lote inicial (os
   antigos estão vencidos): o admin acrescenta por upload.

## O arquivo `como-fazer.json`

É o formato do **Importar** do admin (`/admin/como-fazer`, aba Importar) e do **Exportar JSON**,
o mesmo `HelpImportBody` do members (`POST /members/admin/help/tutorials/import`):

```jsonc
{
  "collections": [{ "slug", "title", "description", "icon", "tone", "position" }],
  "tutorials": [{ "slug", "collection", "position", "draft": { /* HelpTutorialDocument */ } }]
}
```

- O import cria ou atualiza **pelo slug**, coleções primeiro, e só mexe no **rascunho**. Nada é
  publicado sozinho: depois do import, cada tutorial passa por "Revisar e publicar" no admin.
- `icon` e `tone` vêm das allowlists do core (`HELP_COLLECTION_ICONS`, `HELP_COLLECTION_TONES`);
  `toolRef` de `HELP_TOOL_REFS` (`pinta`, `estudio-completo`, `pensa`, `molda`). Plataforma não
  tem `toolRef`.
- `related` aponta para outros slugs. Links no corpo usam `[texto](/como-fazer/<slug>)`.
- Slugs reservados: `colecao` e `buscar`.

O lote inicial tem 4 coleções e 24 tutoriais: Plataforma (9), Estúdio (6), Pinta (5) e Pensa (4).
`bun docs/como-fazer/validar.ts` roda o **mesmo validador do members** sobre o arquivo e confere
os slugs cruzados (`related` e links no corpo). Rode antes de importar.

## Como implantar (staging e produção)

1. Admin → **Como fazer** → aba **Importar** → escolha `docs/como-fazer/como-fazer.json` →
   confira a prévia → **Aplicar**.
2. Aba **Tutoriais**: abra cada um, **Pré-visualizar**, **Revisar e publicar**.
3. No Kids, `/como-fazer`: busque "prévia" e "camada"; abra um tutorial de Pinta num perfil sem
   Pinta e confira que `/pinta` segue trancado.
4. Para levar de staging a produção, **Exportar JSON** lá e **Importar** aqui: o slug é a chave,
   então o mesmo arquivo atualiza no lugar.

## Quando a interface mudar

Quem muda um rótulo de botão no Estúdio, no Pinta, no Pensa ou no Kids procura o rótulo antigo aqui
(`git grep -n "Nome antigo" docs/como-fazer`) e no admin (busca por título). Corrija o tutorial no
admin, publique de novo, e traga a mudança para este arquivo pelo **Exportar JSON**, para o lote
não envelhecer. A `REFERENCIA-PLATAFORMA.md` continua sendo a fonte dos nomes.
