# Como fazer: a biblioteca de ajuda do Kids

> O que é, como o conteúdo entra na plataforma e como manter os tutoriais vivos quando a
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
   `packages/pinta/src/core/copy.ts`, em `packages/pensa/src/components/{PensaApp,TaskPlan}.tsx`
   e no Molda (`core/copy.ts`, `core/sceneFirstStepsCopy.ts`). Confira também o componente que
   renderiza o botão: um rótulo antigo pode continuar no dicionário sem aparecer na tela.
   O código da versão publicada é a fonte principal; a referência escrita é apoio.
2. **Nada comercial dirigido à criança.** A revisão editorial do core sinaliza "compre", "assine", "peça para
   seus pais", "Comunidade dos Criadores" e afins (`helpEditorialWarnings`), e a página do Kids
   nunca mostra o `KidsLockedProduct` aqui.
3. **Palavras alternativas** (`keywords`) são as que a criança diria: "prévia", "olhinho",
   "cadê o menu", "bloquinhos". A busca pesa título > palavras > resumo > passos, sem acento.
4. **Título é a tarefa**: "Como ver meu jogo na Pré-visualização", não "Pré-visualização".
5. Imagem só com texto alternativo. Vídeo só Vimeo ou YouTube. O lote textual não inclui
   imagens novas: o admin pode acrescentá-las por upload. Ao atualizar um lote textual,
   preserve as mídias do ambiente, relacionando imagens pelo ID do passo.

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

O lote revisado em **27/09/2026** tem **5 coleções e 39 tutoriais**: Plataforma (17),
Estúdio (7), Pinta (6), Pensa (5) e Molda (4). Foram revisados os 24 tutoriais originais
e acrescentados 15. Veja os fluxos conferidos e a publicação em
[REVISAO-2026-09-27.md](REVISAO-2026-09-27.md).
`bun docs/como-fazer/validar.ts` roda o **mesmo validador do members** sobre o arquivo e confere
os slugs cruzados (`related` e links no corpo). Rode antes de importar.

## Como implantar (staging e produção)

1. Exporte o conteúdo atual de cada ambiente e guarde uma cópia antes de atualizar.
   Compare os rascunhos por slug e preserve mídias ou edições feitas no Admin.
2. Admin → **Como fazer** → aba **Importar** → escolha o lote reconciliado →
   confira a prévia → **Aplicar**.
3. Aba **Tutoriais**: abra cada um, **Pré-visualizar**, **Revisar e publicar**.
4. No Kids, `/como-fazer`: busque "prévia" e "camada"; abra um tutorial de Pinta num perfil sem
   Pinta e confira que `/pinta` segue trancado.
5. Para levar o texto de staging a produção, compare o **Exportar JSON** de ambos antes de
   importar: o slug atualiza no lugar, mas uma mídia de teste de staging não deve entrar em
   produção por acidente. Confira os publicados e a busca depois de publicar em cada ambiente.

O import substitui o rascunho inteiro. Importar este arquivo diretamente sobre um tutorial
com vídeo ou imagens remove essas mídias do rascunho. Na publicação operacional de 27/09,
o lote foi reconciliado por ambiente, com backup, conferência do estado anterior e chamadas
ao `HelpService` dentro de uma transação. Os aplicativos não precisam de redeploy para
mostrar atualizações de tutoriais.

## Quando a interface mudar

Quem muda um rótulo de botão no Estúdio, no Pinta, no Pensa, no Molda ou no Kids procura o rótulo antigo aqui
(`git grep -n "Nome antigo" docs/como-fazer`) e no admin (busca por título). Corrija o tutorial no
admin, publique de novo, e traga a mudança para este arquivo pelo **Exportar JSON**, para o lote
não envelhecer. Atualize também a `REFERENCIA-PLATAFORMA.md` quando o caminho mudar.
