# Zappy do Estúdio — remediação integral e recuperação da base didática

**Data:** 2026-08-02
**Escopo:** `studio`, `community-kids`, `member-shell`, `api-gateway`, `members` e `admin`

## Objetivo

Corrigir os nove achados do full review do Zappy e recuperar a indexação de cadernos e transcrições em produção e staging sem contornar as fronteiras de segurança existentes.

## Decisões aprovadas

- O Vimeo será consultado pela API padrão para recuperar text tracks já existentes. A solução não dependerá da API de IA Enterprise.
- Links temporários do Vimeo serão baixados pelo Admin, validados e re-hospedados no R2 antes da indexação.
- Um vídeo sem text track terá estado explícito de transcrição indisponível; não será tratado como sucesso.
- A presença do Caderno do Aluno será derivada do bloco autoritativo marcado pelo professor. A prontidão da indexação será mostrada separadamente.
- O PDF continuará sendo extraído no Admin, com as dependências nativas declaradas e incluídas no runtime standalone do Next.js.
- As rotas de reserva e conclusão do Zappy serão exclusivas do BFF. Um JWT comum não poderá gravar perguntas ou respostas diretamente.
- Sanitização de código preservará whitespace e removerá credenciais, em defesa em profundidade no Studio e no member-shell.

## Arquitetura

### Pergunta do tutor

O Studio monta somente contexto pedagógico permitido. Antes de sair do navegador, arquivos sensíveis e credenciais conhecidas são excluídos ou redigidos. O member-shell repete a validação de forma autoritativa, preservando quebras de linha do código, aplica segurança infantil e só então reserva a pergunta por uma rota BFF autenticada internamente.

Respostas determinísticas continuam antes da quota. Quando houver provider, o fluxo mantém uma única chamada, valida referências contra catálogo/aulas autorizadas e persiste somente a resposta validada.

### Segurança infantil

Autoagressão terá classificador e resposta determinísticos próprios, antes de quota e provider. A resposta acolherá sem diagnosticar, orientará a procurar imediatamente um adulto de confiança e não redirecionará de modo genérico para programação.

### Base didática

O `members` continuará sendo a autoridade sobre curso, aula, bloco e revisão. O backfill devolverá trabalhos tipados:

- texto rico, processado no próprio `members`;
- ebook marcado como caderno, com referência privada do PDF;
- vídeo com URL estável de caption quando existente ou identificação Vimeo derivada do bloco.

O Admin executará os trabalhos externos. Para Vimeo, consultará `/videos/{id}/texttracks`, escolherá a trilha preferencial, baixará o VTT temporário e o re-hospedará no R2. Para PDF, extrairá texto usando `pdfjs-dist` com o backend nativo incluído no standalone.

O transporte usará um orçamento comum em bytes. Conteúdo maior será enviado em partes explicitamente ordenadas ou limitado na origem por uma política documentada; não haverá limites incompatíveis entre Admin, gateway e DTO.

### Consistência

- Upserts sempre atualizarão os campos autoritativos, inclusive `blockRevision`, mesmo quando o texto extraído não mudar.
- A reconciliação removerá fontes por anti-join com os blocos autoritativos atuais no banco, não por snapshot passado pelo Admin.
- Backfills com falhas retornarão resultado parcial explícito e o Admin exibirá aviso com contagem.

### Interface

Toda operação assíncrona do painel será vinculada a uma geração de projeto. Troca de projeto, fechamento ou exclusão invalidará respostas e páginas pendentes.

No painel de IA:

- “curso sem caderno” significará ausência do bloco opt-in;
- caderno configurado mas não indexado aparecerá apenas na lista de fontes com erro/pending;
- vídeos sem text track terão motivo específico;
- backfill parcial nunca produzirá toast de sucesso total.

## Estratégia de testes

Cada causa raiz receberá uma regressão falhando antes da correção:

- credenciais e arquivos sensíveis não atravessam o contexto;
- redação preserva quebras de linha;
- expressões comuns de autoagressão entram no fluxo dedicado;
- JWT comum não acessa reserve/complete;
- upsert atualiza revisão sem mudança de hash;
- resposta antiga não atravessa troca de projeto;
- payloads respeitam o mesmo orçamento em bytes;
- reconciliação concorrente não remove bloco existente;
- backfill parcial aparece como parcial;
- PDF é extraído no runtime Node standalone;
- curso marcado não aparece como sem caderno quando a extração falha;
- vídeo sem caption persistida é recuperado pela API Vimeo.

Depois das regressões serão executados lint, typecheck, suites completas dos cinco pacotes, Playwright do Zappy, builds do Admin e Community Kids e inspeção do standalone.

## Operação após deploy

Após publicar Admin, gateway e members compatíveis, executar uma sincronização completa pelo painel de IA em staging e depois em produção. O resultado deve informar quantos textos foram indexados, quantas transcrições Vimeo foram recuperadas, quantos PDFs foram processados e quais fontes realmente continuam sem material disponível.
