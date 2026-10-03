# Desafio do Primeiro Jogo: aplicar o formato do Cadê Todo Mundo

**Objetivo autorizado:** aplicar ao Desafio a aprendizagem acumulada no Cadê Todo Mundo, incluindo a experiência de aula, a autoria e os materiais locais. Execução nesta sessão, sem importação no admin ou publicação.

## Decisões

- Orientação adicional do usuário: toda seção começa com contexto pertinente. Na abertura, anunciar o jogo e sua situação antes do convite para jogar. Nas demais, conectar o estado atual à necessidade da tarefa, sem agenda longa ou ordem solta.
- Correção do usuário sobre o caderno: acompanhar o conteúdo das aulas. Visão geral, navegação, publicação e certificado podem estar presentes; não inventar um mapa como material adicional. Não acrescentar mapa para responsáveis na aula.

- O jogo continua sendo **A Chave do Farol**, em três dias. Arte, cadeia de projetos, identificadores das aulas e regras comerciais permanecem os existentes.
- Introdução: jogar a versão pronta, com conclusão por participação; depois conhecer o Caderno do Aluno opcional. Tours de interface viram ajuda contextual no Como Fazer, na mesma aba e com retorno à aula.
- Dia 1: uma seção de montagem completa. As duas apresentações sem prática são incorporadas ao vídeo principal. A introdução já apresenta o jogo; não é necessário assistir a outra demonstração da solução.
- Dia 2: explicar a necessidade de guardar a coleta; construir a variável e o evento, com testes concretos.
- Dia 3: comparar a porta com e sem chave na experiência existente; programar a condição; publicar o mesmo projeto no Mural. Publicação ensinada como tarefa, sem inventar um critério técnico de conclusão por publicação.
- Toda entrega: testar, **Verificar esta etapa**, conferir **Objetivo da etapa cumprido!**, esperar **Salvo**, **Enviar para o professor**, confirmar **Enviar** e avançar.
- Certificado: uma celebração curta e emissão existente. Retirar a seção comercial obrigatória para a criança. Os links de continuidade já disponíveis na plataforma permanecem fora da tarefa infantil.
- Preservar blocos de projeto, certificado e caderno. Declarar aposentadoria dos blocos removidos. Os arquivos com `plannedVideo` são fontes de autoria; a reconciliação com vídeos/anexos já publicados precisa ocorrer no admin.

## Execução

1. [x] Conferir BRIEFING, ESPEC, Cadê atual, geradores, progressão, paleta, Mural e código da experiência. Baseline: 9 testes passaram.
2. [x] Atualizar `docs/aulas-interativas/qa/gerar-desafio-farol.ts`, testes de manifesto e os cinco roteiros em `docs/aulas-interativas/aulas/desafio-*.roteiro.md`; regenerar os manifestos.
3. [x] Reescrever as cinco propostas e `docs/aulas-interativas/modulos-desafio-primeiro-jogo.md`, incluindo reconciliar mídia, anexos e progresso antes de importar.
4. [x] Atualizar `docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py`; produzir e inspecionar o PDF único do caderno em `output/pdf/`, preservando o mapa antigo apenas como arquivo histórico.
5. [x] Rodar testes de projeto/manifestos, validadores de roteiro/manifestos, conferir links do Como Fazer, regeneração determinística e diff. Registrar limites: gravação, anexação, ensaio infantil e publicação ainda pendentes.

## Critérios de revisão

Instruções completas e rótulos reais; nenhum resultado da experiência antecipado; nenhum Play inventado; nenhum tour obrigatório; publicação usa o projeto da criança; jogo pronto não contamina a cadeia; leitura/impressão do caderno não bloqueiam; certificado preserva emissão; a montagem preparada e a autoria da criança são distinguidas.

## Validação final

- 15 testes de projeto e manifestos passaram, com 226 verificações: jogo real, continuidade, participação sem vitória obrigatória, conclusão opcional do caderno, publicação no mesmo Estúdio e emissão do certificado.
- Cinco manifestos válidos, sem cenas ausentes ou avisos de convenção; nove vídeos cobertos pelos cinco roteiros, na ordem correta.
- O lote Como Fazer passou no validador; os oito links usados nos manifestos foram conferidos contra os tutoriais existentes e não viraram critérios de conclusão.
- Biome passou nos dois arquivos TypeScript alterados; `git diff --check` sem erros. Regenerar os cinco manifestos produziu os mesmos hashes.
- PDF único com dez páginas, renderizadas e inspecionadas. Texto dentro dos limites das páginas; aberturas, montagem, testes, publicação, certificado e ajuda acompanham as aulas. Sem mapa adicional.
- Rótulos e valores conferidos no código: velocidade inicial 3, verdadeiro como padrão do bloco lógico, botão específico + senão, confirmação de envio e fluxo de publicação. Roteiros e PDF orientam manter os valores já corretos.

O Bun emitiu o diagnóstico de ambiente `Cannot read file C:\\Users\\tocha\\: EPERM`, também observado em execuções anteriores; os comandos de validação concluíram com código 0 e os resultados acima. O Como Fazer mantém uma sugestão editorial preexistente sobre falta de imagem em `plataforma-enviar-trabalho-da-galeria`, que não é um dos links usados neste curso.

Revisão local não equivale a ensaio com crianças nem à atualização do curso publicado. Permanecem para produção: gravar/vincular os nove vídeos, anexar o caderno, reconciliar os registros existentes e ensaiar a experiência completa no navegador com crianças. Não houve importação no admin ou publicação nesta sessão.

## Review posterior do curso inteiro

O usuário solicitou uma nova revisão pedagógica de todo o Desafio, corrigindo a referência acidental a “número 8”. O [relatório de 03/10/2026](../../aulas-interativas/qa/review-pedagogico-desafio-2026-10-03.md) registra os achados, as correções e o ensaio ainda necessário.

A estrutura segue com cinco aulas e nove seções. Foram corrigidas aprovações indevidas na coleta e nos avisos da porta, aproximadas as definições da montagem, completadas instruções e atualizados a triagem das propostas, o inventário de blocos e o caderno. A ajuda opcional agora tem nove links, incluindo o leitor de materiais.

Validação desta revisão: 20 testes passaram, com 238 verificações; cinco manifestos e nove vídeos validados; Biome aprovado; regeneração dos cinco manifestos e do inventário com os mesmos hashes; PDF de dez páginas novamente renderizado e inspecionado. Os números anteriores descrevem a verificação da adaptação inicial, antes deste review.
