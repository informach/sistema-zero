# Revisão integrada e preparação do rollout — 20/11/2026

O remoto publicado foi integrado preservando os commits do Pinta e a correção
de formatação da fixture de linguagem. Nenhuma fonte funcional 3D foi editada
por esta revisão; os três gerados autorizados foram resolvidos pelos geradores
oficiais e ficaram idênticos aos publicados. O Pinta mantém os mesmos bytes
de fonte do commit 4c4a819fd, qualificado com 2.266 testes e três perfis
nativos do minimapa; não houve mudança visual adicional neste lote.

## Verificações locais

Comando oficial do Estúdio: `bun --no-env-file run test`, com 906 arquivos em
164 processos isolados. Fonte 774677566: 11.919 aprovados, nenhuma falha,
364.431 verificações, quatro casos condicionalmente ignorados porque o
caminho padrão de Chromium da imagem Linux não existe nesta máquina. Esses
quatro casos foram depois executados com o Chrome real instalado, pela
variável oficial `SZ_CHECK_CHROMIUM`: quatro aprovados, 21 verificações,
22,90 s, sem omissões. São execuções distintas, não uma suíte única de 11.923.

A tentativa anterior com `bun test src` não usava o isolamento oficial;
observou timeout ao iniciar um processo Bun e foi interrompida para executar
o comando contratado, sem mudar testes ou prazos. Não é contada como gate verde.

Depois, os deltas remotos foram verificados separadamente: 596 testes/11.517
verificações (exemplos, preservação de HTML, codec e variante); 56 testes/174
verificações de Monaco; dez testes/26 verificações de visibilidade/orçamento.
Tipos completos do Estúdio após cada delta: saída 0. Biome final: saída 0,
16.551 arquivos. Core 3D: 373 aprovados; motor 3D: 267 aprovados. Geradores
e perfil do runtime: verificadores oficiais aprovados. Os testes de orçamento
locais usam o compressor Windows; a qualificação Linux cabe ao CI.

## Staging: base confirmada, rollout ainda pendente

Consultas readonly por conector e SSH com nonce confirmaram Members/Auth
ativos no commit c7e9c70a4de5ea889c1af4819283887a33add461. Preflight canônico
aprovado e verificação canônica da jornada: publicada, versão 3. Members
ainda usa a política 022e5b54…; a política preparada não foi ativada.

A aba legada permanece aberta com 21 scripts públicos, espelho antigo e sem
autoridade local. A API autenticada confirmou somente o mapa de homologação
próprio, revisão 1/formato 1. O leitor controlado foi compilado e conferido
por hash; abriu em realm novo sem carregar o documento de autoria. Essa rota
existe apenas no navegador de QA e não prova cold start HTTP offline do app.
Não houve reprodução autenticada da sobrescrita nesta preparação ainda.

CI de qualificação fixado no commit e8c77ab8d: 44734103403, em andamento no
registro. A branch fica estável para não ser cancelada por pushes de outras
sessões. Os aplicativos leitores, a distribuição Python e o gravador mais
recente continuam pendentes. Nenhuma operação em produção. A missão, o ciclo
Vila/Floresta e a homologação de publicação completa não estão concluídos.
