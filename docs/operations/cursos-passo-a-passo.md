# Cursos: do cadastro à produção, passo a passo

Guia único para publicar um curso na plataforma e trocar os vídeos depois. Vale para qualquer
computador e para qualquer sessão: comece por aqui antes de pesquisar o código. Os detalhes de
cada mecanismo ficam nos guias citados em cada etapa.

## O fluxo de sempre

1. **Cadastrar no Kids de staging**, com o **vídeo provisório** de 2 segundos e a **capa certa** de
   cada parte. O curso ainda não foi gravado: o cadastro vem primeiro porque é nele que as telas
   do curso são gravadas.
2. **Trocar os vídeos provisórios pelos finais** (gravados e editados), cada um com a sua capa, e
   conferir a base do Zappy (a transcrição do vídeo alimenta o conhecimento dele).
3. **Copiar o Kids de staging para o adulto de staging**, igualzinho.
4. **Levar para produção**: o Kids de staging vai para o Kids de produção e, lá, o Kids de produção
   é copiado para o adulto de produção. O Vimeo tem uma pasta para staging e outra para produção:
   a promoção copia cada vídeo para a pasta de produção.

O conteúdo só vai num sentido: staging manda, produção recebe. Não edite em produção o que vai ser
promovido de novo, porque a próxima promoção substitui.

## Ambientes e serviços

| | Staging | Produção |
| --- | --- | --- |
| Railway (projeto `415d5a1c-5f75-432c-8445-b395d0977ce3`) | ambiente `f634cff6-aafb-4804-8b69-172fad4e946e` | ambiente `19c212a5-85c0-493c-9630-a7a0569e8412` |
| Kids (aluno) | `community-kids-staging.up.railway.app` | `kids.sistemazero.com.br` |
| Adulto (aluno) | o domínio de staging da comunidade | `comunidade.sistemazero.com.br` |
| Admin | o domínio de staging do Admin | `admin.sistemazero.com.br` |
| Pasta do Vimeo | a do Admin de staging (`VIMEO_FOLDER_ID`) | `29469887` "Comunidade Sistema Zero" |
| R2 | `testes` / `testes-privado` | `comunidade-sistema-zero` / `comunidade-sistema-zero-privado` |

- O banco das aulas fica no serviço **`members`**; o token do Vimeo, o do ElevenLabs e as chaves do
  R2 ficam no serviço **`admin`** de cada ambiente. Os scripts leem essas variáveis para a memória
  do processo e nunca as imprimem nem gravam.
- Cada vídeo do Vimeo é privado (`view: disable`), só abre embutido nos domínios da lista do Admin
  daquele ambiente (`embed: whitelist`, `VIMEO_WHITELIST_DOMAINS`) e não deixa baixar.

## Pré-requisitos em qualquer computador

- Bun, Git e o repositório atualizado (`git pull` na `staging`).
- Railway CLI: `npm i -g @railway/cli`, depois `railway login`. O `railway ssh` pede para cadastrar a
  chave SSH na conta na primeira vez.
- Login de admin no Admin de cada ambiente (para os botões citados abaixo).
- Os vídeos finais numa pasta local, com o nome `AulaNN - Parte N.mp4` (o espaço entre "Aula" e o
  número é opcional: `Aula01 - Parte 1.mp4` e `Aula 02 - Parte 4.mp4` funcionam).
- Para regerar capas ou o PDF: Python com `playwright` e o Chrome ou o Edge (ver Etapa 0).

## Etapa 0: os arquivos do curso no repositório

Cada curso tem uma pasta em `docs/aulas-interativas/<app>/<curso>/` (por exemplo
`faisca/o-jardim-secreto/`). O que cada arquivo é e onde ele entra no cadastro:

| Arquivo | O que é | Onde entra |
| --- | --- | --- |
| `modulos.md` | o cadastro do curso e dos módulos, sempre no mesmo padrão (abaixo) | formulário do curso e de cada módulo no Admin |
| `blocos.json` | todos os blocos usados no curso (2D e 3D) | "Ferramentas que este curso libera no Estúdio": os blocos que a criança ganha ao concluir o curso. Use a união das listas |
| `aula-N.manifesto.json` | a aula inteira: partes, textos, quiz, cenas, Estúdio, vídeos planejados | "Importar roteiro com partes" de cada aula |
| `aula-N.roteiro.md`, `aula-N.md` | roteiro de gravação e texto da aula | fonte do manifesto; não sobe |
| `*.elevenlabs.txt` | falas da professora e dos personagens **nos vídeos** | gravação; não é a voz do Zappy |
| `capas-das-aulas/aula-0N-parte-0M.png` | a capa de cada parte (1672×941) | capa do vídeo da parte no Vimeo e capa da parte na aula |
| `passo-a-passo-do-projeto.pdf` | o caderno do aluno, **sempre** | anexo PDF da aula, sempre marcado como caderno para o Zappy |
| `*.szproject.json` | projetos do Estúdio (inicial e pronto) | já vão dentro do manifesto |
| `publicacao-<ambiente>.json` | o registro do que foi publicado (ids, revisões, pendências) | escreva ao terminar cada etapa |

**O padrão do `modulos.md`** (igual em todos os cursos; `qa/modulos-padrao.test.ts` reprova o que
foge dele):

```markdown
# <Título do curso>

**Título do curso:** <título>            → título do curso no Admin
**Descrição curta:** <uma frase>          → subtítulo
**Descrição longa:** <um parágrafo>       → descrição

## Módulo 1 · <título do módulo>          → um por módulo, na ordem, com " · "

**Resumo:** <resumo do módulo>            → resumo do módulo

### Aula 1. <título da aula>              → a lista de aulas e partes do módulo
```

Cada campo fica num parágrafo próprio. Depois das aulas vêm as notas de produção (posto, o que
preservar do seed, entregas). `scripts/cursos/conferir-curso.ts` compara esses campos com o curso
publicado.

Geradores ficam em `docs/aulas-interativas-tecnico/`:

- **Manifestos:** `qa/gerar-<curso>.ts` (molde em `qa/poder-gerador.ts`). Ele valida o manifesto e o
  teto de 2 MiB da importação.
- **Capas:** `recursos/<curso>/capas-das-aulas/gerar-capas.ts` e depois `renderizar-capas.py`.
- **PDF:** `recursos/<curso>/gerar-caderno.ts` e depois `renderizar-caderno.mjs`.
- **Vídeo provisório (o mesmo para todos os cursos):** `recursos/video-provisorio/video-provisorio-2s.mp4`.

## Etapa 1: cadastrar no Kids de staging

Tudo pelo Admin de staging, na lente **Kids**, em Conteúdo → Cursos.

1. **Curso.** Criar o curso (ou abrir o que já existe: os cursos da Jornada do Criador nascem do
   seed `packages/members/scripts/seed-creator-journey.ts`, com módulo e aulas reservados).
   - Preencher com o `modulos.md`: título, subtítulo, descrição, capa, nível e trilha.
   - Em "Ferramentas que este curso libera no Estúdio", marcar os blocos do `blocos.json`.
2. **Módulos e aulas.** No editor do curso, um módulo por linha do `modulos.md`, com o resumo, e as
   aulas na ordem.
   - **Animação do módulo (ediSVG):** todo módulo tem a sua animação, mostrada na página do curso
     no Kids (a comunidade adulta ainda não mostra). `conferir-curso.ts` reprova módulo sem ela.
     - **Arte:** as artes vetoriais do projeto do curso (os SVGs do `.szproject.json`). Num curso 3D,
       uma versão 2D parecida com os "gêmeos" em SVG dos modelos, que estão no projeto do curso 2D
       correspondente (a Ilha usa os da Chave do Farol), simulando a profundidade: o chão com
       espessura, o personagem que diminui ao ir para o fundo, o objeto que gira pela largura.
     - **Receita:** `docs/aulas-interativas-tecnico/recursos/<curso>/animacao-dos-modulos.ts` diz o
       curso, o título de cada módulo (igual ao `modulos.md`), as camadas e as trilhas do clipe
       (loop de 4 a 5 s a 30 quadros/s). Modelos: a do Jardim (2D) e a da Ilha (3D).
     - **Montar, exportar e cadastrar** (precisa do `informach-apps` ao lado do `sistema-zero`, com
       `pnpm install`, ou `EDISVG_APP` apontando para `apps/edisvg`):

       ```bash
       R=docs/aulas-interativas-tecnico/recursos/<curso>/animacao-dos-modulos.ts
       bun scripts/cursos/animacao-do-modulo.ts --receita $R --passo montar      # art/edisvg/sources/<chave>.edisvg
       bun scripts/cursos/animacao-do-modulo.ts --receita $R --passo exportar    # art/edisvg/exports + imagens de conferência
       bun scripts/cursos/animacao-do-modulo.ts --receita $R --passo cadastrar --ambiente staging
       bun scripts/cursos/animacao-do-modulo.ts --receita $R --passo conferir --ambiente staging
       ```

       - `montar` usa o próprio código do ediSVG (o importador de SVG e a validação do projeto). O
         `.edisvg` abre no ediSVG para retocar à mão, mas o próximo `montar` sobrescreve os retoques.
       - `exportar` roda o exportador do ediSVG num Chromium de verdade. Ele reprova o quadro em 61%
         do clipe se for igual ao primeiro. As imagens de conferência ficam em `.cache/cursos/animacoes/`:
         olhe antes de cadastrar.
       - `cadastrar` guarda o arquivo e o pôster no R2 pelo código do Admin e põe no módulo (título e
         resumo continuam os mesmos). Rodar de novo não refaz o que já está igual.
     - Sem o script, à mão: no Admin, "Editar módulo" → enviar o `.edi-animation.json`.
     - O acervo fica em `art/edisvg/` (`exports/manifest.json`); o teste
       `scripts/cursos/animacao-do-modulo.test.ts` reprova exportação desatualizada.
     - A cópia para o adulto e a promoção levam a animação junto. Animação posta depois da cópia ou
       da promoção só chega lá na próxima.
3. **Manifesto de cada aula.** Editor da aula → Dados da aula → "Importar roteiro com partes", com
   o `aula-N.manifesto.json`, no modo "Atualizar pelo manifesto". A importação cria as partes, os
   blocos e os vídeos planejados.
4. **Vídeo provisório e capa de cada parte.** Em cada bloco de vídeo, enviar o
   `video-provisorio-2s.mp4` e, no mesmo editor, a capa da parte (`capas-das-aulas/aula-0N-parte-0M.png`).
   - É **um vídeo do Vimeo por parte**, mesmo sendo o mesmo arquivo, porque a capa pertence ao
     vídeo, e é essa capa que aparece na gravação.
   - O Admin põe o vídeo na pasta e na lista de domínios do ambiente.
5. **Caderno do aluno.** Na aula indicada no `modulos.md`, anexar o `passo-a-passo-do-projeto.pdf`
   e marcar "Passo a passo do projeto para o Zappy". Pôr o anexo no bloco de materiais da parte
   indicada.
   - O passo a passo do projeto é **sempre** o caderno do aluno e fica **sempre** disponível para o
     Zappy, diga o `modulos.md` o que disser (decisão da Helena, 24/11/2026).
   - Sem o Admin: `bun scripts/cursos/base-do-zappy.ts caderno @curso` marca todo PDF do curso e
     publica as aulas que mudaram.
   - O texto do PDF entra na base do Zappy (fonte `student-notebook`) ao publicar pelo Admin ou com
     `base-do-zappy.ts atualizar` (Etapa 2, passo 5).
6. **Voz do Zappy.** Em cada aula, o botão "Gerar a voz do Zappy" ao lado de "Revisar para
   publicar". Ele gera as falas que faltam e reaproveita as que já existem. Detalhes:
   `docs/voz-do-zappy.md`.
7. **Publicar.** Em cada aula, "Revisar para publicar" e publicar; depois, publicar o curso.
   Publicar pelo Admin também manda as transcrições e o caderno para a base do Zappy.
8. **Registrar** em `publicacao-staging.json`: os ids do curso, do módulo e das aulas, as partes, os
   vídeos e o que ficou pendente (normalmente, "vídeos finais no lugar dos provisórios").

Cursos grandes já foram cadastrados por scripts que falam direto com o `members` pelo `railway ssh`
(importação, vídeos provisórios, ligação de vídeo e capa, anexo, vozes). Esses scripts ainda não
estão no repositório: são de um curso só e ficam na pasta local `.cache/` de quem os rodou.
Publicar direto no `members` pula a sincronização do Zappy: depois de usá-los, rode
`bun scripts/cursos/base-do-zappy.ts atualizar @curso` (Etapa 2, passo 5).

## Etapa 2: trocar os vídeos provisórios pelos finais

A troca mantém o mesmo vídeo do Vimeo (uma **versão nova** do arquivo), então o endereço, a
privacidade, os domínios, a capa da aula e o progresso dos alunos ficam como estavam. Vale também
para atualizar um vídeo final que já estava no ar. Ferramenta: `scripts/cursos/trocar-videos.ts`.
Ela é retomável: o estado fica em `.cache/cursos/trocar-videos/<público>-<curso>-<ambiente>/`.

Defina uma vez (PowerShell):

```powershell
$curso = '--ambiente', 'staging', '--publico', 'kids', '--curso', 'jornada-faisca-missao'
$arquivos = '--videos', 'C:/Users/<você>/Downloads/O Jardim Secreto/Finalizadas', '--capas', 'docs/aulas-interativas/faisca/o-jardim-secreto/capas-das-aulas'
```

1. **Inspecionar** (só leitura): o curso pelo slug, as aulas na ordem da grade e o vídeo de cada
   parte. Avisa se alguma aula tem rascunho não publicado; resolva antes de seguir.

   ```powershell
   bun scripts/cursos/trocar-videos.ts inspecionar @curso
   ```

2. **Checar** (sem tocar em nada): cada arquivo tem a sua parte, a duração de cada vídeo e a capa da
   pasta igual à gravada na aula (o nome da capa no R2 é o sha256 dela). Para trocar só algumas
   partes, use `--partes 1-2,2-3`.

   ```powershell
   bun scripts/cursos/trocar-videos.ts checar @curso @arquivos
   ```

3. **Enviar**: versão nova de cada vídeo no Vimeo, envio do arquivo, três de cada vez. Depois
   espera o Vimeo processar cada versão, confere a duração com a do arquivo, renomeia o vídeo e
   aplica de novo a capa da parte. Pode levar vários minutos; se cair, rode de novo e ele retoma.
   Se uma versão ficar mais de meia hora em "processando" (aconteceu com a Parte 5 da Aula 1 do
   Jardim, com um arquivo igual aos outros), apague só ela e envie de novo:

   ```powershell
   bun scripts/cursos/trocar-videos.ts descartar @curso @arquivos --partes 1-5
   bun scripts/cursos/trocar-videos.ts enviar @curso @arquivos --partes 1-5
   ```

   O `descartar` recusa a versão que já está ativa: o aluno continua vendo a anterior até a nova
   ficar pronta.

   ```powershell
   bun scripts/cursos/trocar-videos.ts enviar @curso @arquivos
   ```

4. **Duração**: grava a duração nova em cada bloco de vídeo, valida e publica só as aulas que
   mudaram. Recusa aula com rascunho não publicado.

   ```powershell
   bun scripts/cursos/trocar-videos.ts duracao @curso @arquivos
   ```

5. **Zappy**: a transcrição de cada vídeo vem da legenda automática que o Vimeo gera para a versão
   nova (alguns minutos depois do envio), e é ela que alimenta a base de conhecimento do Zappy.
   Primeiro confira as legendas; depois atualize a base, sem navegador.

   ```powershell
   bun scripts/cursos/trocar-videos.ts zappy @curso
   bun scripts/cursos/base-do-zappy.ts atualizar @curso
   ```

   - O passo `zappy` mostra a legenda de cada vídeo no Vimeo. Se faltar alguma, espere e rode de
     novo.
   - O `atualizar` faz o mesmo que o botão "Atualizar a base do Zappy" do Admin (`/admin/ia`):
     1. o `members` aponta o que falta neste curso;
     2. o texto é extraído com o código do próprio Admin, rodando no seu computador com as
        variáveis do Admin do ambiente (só na memória);
     3. o texto é entregue ao `members`.

     No fim ele mostra o relatório; o esperado é "Base do Zappy em dia para este curso". Conferir
     de novo depois: `bun scripts/cursos/base-do-zappy.ts conferir @curso`.
   - Pelo navegador, o mesmo é o botão "Atualizar a base do Zappy" em `/admin/ia`, repetido até
     terminar.
6. **Verificar** no Vimeo: versão nova ativa, duração, capa ativa, privacidade e domínios.

   ```powershell
   bun scripts/cursos/trocar-videos.ts verificar @curso @arquivos
   ```

7. **Conferir no navegador**: abrir uma aula no Kids do ambiente, com uma conta de aluno, e
   assistir a um pedaço de um vídeo trocado. A capa aparece antes do play.
8. **Registrar** no `publicacao-<ambiente>.json` do curso: a data, os vídeos trocados e o que saiu
   das pendências.

**O adulto usa os mesmos vídeos do Kids do mesmo ambiente** (a cópia aponta para os mesmos ids do
Vimeo e os mesmos PDFs, sem reenviar). Trocar um vídeo no Kids troca também o do adulto, mas a
duração fica gravada em cada aula e a base do Zappy é preparada por curso. Se o curso já tinha sido
copiado para o adulto, depois da troca rode a cópia de novo (Etapa 3). Só a promoção para produção
cria vídeos novos, com ids próprios.

Em produção, os passos são os mesmos com `--ambiente production --confirmo-producao`. Só troque em
produção um vídeo que já foi trocado e conferido em staging. Para um curso que ainda vai ser
promovido, troque em staging e promova (Etapa 4) em vez de trocar nos dois.

## Etapa 3: copiar o Kids de staging para o adulto de staging

O trabalho prepara as mídias, as vozes e o material do Zappy no próprio ambiente e publica o curso
adulto. Pelo navegador: Admin de staging, lista de cursos Kids, **Mais ações → Publicar e atualizar
no adulto**. Sem navegador, com o mesmo serviço (o operador implantado `publish-course.ts`):

```powershell
bun scripts/cursos/publicar-curso.ts previa --operacao adulto --ambiente staging --curso jornada-faisca-missao
bun scripts/cursos/publicar-curso.ts aprovar --operacao adulto --ambiente staging --curso jornada-faisca-missao
bun scripts/cursos/publicar-curso.ts blocos --operacao adulto --ambiente staging --curso jornada-faisca-missao
```

- **Prévia:** confira o destino (`<slug>-adulto`, se já existe), o número de módulos e aulas, e o que
  sai da grade (arquivado, com o histórico dos alunos).
- **Aprovar:** acompanha até terminar, lendo o estado a cada 30 s.
- **Blocos:** confere as ferramentas que o curso adulto libera no Estúdio.
- A origem precisa estar toda publicada: rascunho diferente do publicado impede a cópia (confira com
  `trocar-videos.ts inspecionar`).
- Cópia que falha com "Confira as mídias" quase sempre é vídeo sem transcrição. O vídeo provisório
  de 2 s não tem, então copie para o adulto **depois** da Etapa 2, com a base do Zappy em dia. Corrigida
  a causa, `retomar` continua o mesmo trabalho; se o conteúdo mudou, faça uma `previa` nova.
- Regras da cópia: `docs/operations/sincronizar-curso-kids-adulto.md`.

## Etapa 4: levar para produção

1. **Kids de staging → Kids de produção** (pelo navegador: Admin de staging, lista de cursos Kids,
   **Mais ações → Promover para produção**):

   ```powershell
   bun scripts/cursos/publicar-curso.ts previa --operacao producao --ambiente staging --curso jornada-faisca-missao --confirmo-producao
   bun scripts/cursos/publicar-curso.ts aprovar --operacao producao --ambiente staging --curso jornada-faisca-missao --confirmo-producao
   ```

   - Confira na prévia o destino e **as aulas que saem da grade**: a grade de produção passa a ser a
     de staging. Na Ilha do Farol a promoção arquivou 3 aulas que estavam a mais em produção.
   - O trabalho copia cada vídeo para a pasta do Vimeo de produção, com a lista de domínios de
     produção, copia os arquivos para o R2 de produção e só então publica o curso Kids de produção.
2. **Kids de produção → adulto de produção** (pelo navegador: Admin de **produção**, lista de cursos
   Kids, **Mais ações → Publicar e atualizar no adulto**). O adulto de produção sempre sai do Kids
   de produção, nunca do Vimeo de staging.

   ```powershell
   bun scripts/cursos/publicar-curso.ts previa --operacao adulto --ambiente production --curso jornada-faisca-missao --confirmo-producao
   bun scripts/cursos/publicar-curso.ts aprovar --operacao adulto --ambiente production --curso jornada-faisca-missao --confirmo-producao
   ```

3. **Conferir em produção:**
   - os blocos liberados nos dois cursos (`publicar-curso.ts blocos` com `--operacao producao` para
     o Kids e `--operacao adulto --ambiente production` para o adulto);
   - os vídeos e as durações (`trocar-videos.ts inspecionar --ambiente production --confirmo-producao`):
     nenhum id de vídeo pode ser o mesmo do staging;
   - um vídeo de cada aula tocando em `kids.sistemazero.com.br`;
   - a página do curso adulto;
   - a base do Zappy (`base-do-zappy.ts conferir --ambiente production --confirmo-producao`).
4. **Registrar** em `publicacao-production.json` (ou numa seção `promocao` do registro de staging).

Os blocos liberados ("Ferramentas que este curso libera no Estúdio") viajam no `metadata` do curso,
na cópia e na promoção. Cadastre-os no Kids de staging **antes** de promover e de copiar. Na Ilha do
Farol eles foram cadastrados depois, e os cursos de produção precisaram ser ajustados à mão. Se
faltar, `publicar-curso.ts blocos ... --blocos docs/aulas-interativas/<app>/<curso>/blocos.json`
grava a união das listas no curso de destino.

Promoção, retomada, concorrência e as variáveis dos serviços: `docs/operations/publicar-cursos.md`.

## Cuidados que já custaram retrabalho

- **Rascunho diferente do publicado bloqueia** a cópia, a promoção e o passo `duracao`.
  - Até um `zappyStudentNotebook: false` gravado no rascunho conta como diferença do campo ausente
    no publicado.
  - Publique ou descarte antes, e confira com o passo `inspecionar`.
- **Vimeo 503 num POST (criar vídeo ou versão):** não repita às cegas. Ele pode ter criado o vídeo
  ou a versão; confira na conta (ou no estado da ferramenta) antes de pedir de novo. A ferramenta só
  repete sozinha leituras e atualizações.
- **A capa às vezes desativa depois do processamento:** a ferramenta reativa e confere; o passo
  `verificar` mostra.
- **Legenda velha na base do Zappy:** depois de uma versão nova, o Vimeo guarda a legenda antiga
  como inativa. O Admin escolhe a primeira legenda em português da lista, ativa ou não
  (`pickTranscriptTrack`, `packages/admin/src/lib/vimeo-helpers.ts`). Se a resposta do Zappy
  parecer do vídeo antigo, confira as legendas do vídeo no Vimeo e apague a inativa da versão
  velha. Na troca do Jardim (24/11/2026), as inativas tinham o mesmo texto das ativas.
- **ElevenLabs 429:** limite de pedidos simultâneos na geração de voz; espere e repita.
- **Publicar direto no `members`** (scripts) pula a sincronização do Zappy. Rode
  `base-do-zappy.ts atualizar` depois.
- **Versão travada no Vimeo:** se uma versão ficar mais de meia hora processando, use o passo
  `descartar` da troca e envie de novo (Etapa 2, passo 3).
- **Promoção é de mão única:** o que for editado em produção some na próxima promoção.

## Ferramentas no repositório

| O quê | Onde |
| --- | --- |
| Trocar vídeos (versão nova no Vimeo, capa, duração, legendas, conferência) | `scripts/cursos/trocar-videos.ts` |
| Base do Zappy sem navegador (caderno do aluno, atualizar, conferir) | `scripts/cursos/base-do-zappy.ts` |
| Extração com o código do Admin (legenda do Vimeo, texto do PDF) | `scripts/cursos/lib/extrair-no-admin.ts` |
| Railway: CLI, variáveis de um serviço e código rodado dentro dele | `scripts/cursos/lib/railway.ts` |
| Duração de MP4 sem ffmpeg | `scripts/cursos/lib/mp4.ts` |
| Leitura das aulas, duração, caderno, blocos e base do Zappy, dentro do `members` | `scripts/cursos/remoto/aulas-do-curso.mjs` |
| O operador de publicação implantado, chamado dentro do `members` | `scripts/cursos/remoto/operador.mjs` |
| Copiar Kids → adulto e promover para produção (prévia, aprovar, acompanhar, blocos) | `scripts/cursos/publicar-curso.ts` |
| Conferir o curso publicado contra a pasta (aulas, manifestos, PDF, blocos, vídeos, animações, modulos.md) | `scripts/cursos/conferir-curso.ts` |
| Animação de cada módulo: montar com as artes do curso, exportar no ediSVG, cadastrar e conferir | `scripts/cursos/animacao-do-modulo.ts` (receitas em `docs/aulas-interativas-tecnico/recursos/<curso>/animacao-dos-modulos.ts`) |
| Montar um projeto do ediSVG com o código do próprio ediSVG | `scripts/cursos/lib/edisvg.ts` |
| Guardar a animação no R2 com o código do Admin | `scripts/cursos/lib/guardar-animacao-no-admin.ts` |
| Listar e gravar as animações dos módulos, dentro do `members` | `scripts/cursos/remoto/animacoes.mjs` |
| Copiar Kids → adulto por linha de comando (com recibos e backup) | `scripts/release/sync-course-audiences.ts` |
| Promover e copiar pelo mesmo serviço do Admin | `packages/members/scripts/publish-course.ts` |

Ainda **fora** do repositório (scripts de um curso só, na `.cache/` local): a importação dos
manifestos por script, a criação dos vídeos provisórios com capa, a ligação vídeo e capa nos blocos,
o anexo do PDF e as vozes aplicadas direto no `members`. Pelo Admin (Etapa 1), nada disso é
necessário.
