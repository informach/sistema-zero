# Implementação — remediação integral do Zappy

## 1. Contexto enviado ao modelo

1. Adicionar regressões em `studio/tutor.test.ts` para arquivos sensíveis e credenciais.
2. Adicionar regressões em `member-shell/studio-zappy.test.ts` para whitespace de código e segredos que escapem do cliente.
3. Restringir caminhos no Studio e aplicar redação autoritativa de credenciais no member-shell sem normalizar whitespace.
4. Rodar as duas suites direcionadas.

## 2. Segurança infantil

1. Adicionar casos para “quero morrer”, “não quero mais viver” e variações normalizadas.
2. Separar risco de autoagressão dos demais conteúdos impróprios.
3. Persistir resposta local acolhedora antes de busca, quota e provider.
4. Rodar a suite do BFF e confirmar zero chamadas externas nesses casos.

## 3. Fronteira BFF → gateway → members

1. Criar um cliente HMAC no member-shell usando a mensagem canônica de `@sistemazero/core/security`.
2. Registrar o consumer `member-shell` no gateway e restringir reserve/complete a `hmac`.
3. Enviar a identidade do perfil no corpo coberto pelo HMAC e validar `x-consumer-id=member-shell`; o gateway continuará removendo headers de identidade fornecidos pelo cliente.
4. Atualizar schemas de ambiente, exemplos e boot checks de Community e Community Kids.
5. Adicionar testes do gateway que rejeitem JWT e aceitem HMAC válido.

## 4. Consistência do histórico e do RAG

1. Criar regressão de reindexação com hash igual e `blockRevision` diferente.
2. Atualizar os campos autoritativos antes de qualquer retorno no-op.
3. Substituir `reconcileBlockSources(sourceRefs)` por reconciliação DB-side contra os blocos atuais.
4. Derivar “curso com caderno” do ebook autoritativo marcado, não do status da fonte.
5. Manter falhas e pendências na seção de saúde da fonte.
6. Rodar testes unitários de `members` e testes estruturais do repositório.

## 5. PDF e orçamento de ingestão

1. Criar teste Node que execute a extração de um PDF real sem globals de navegador.
2. Declarar `@napi-rs/canvas` como dependência direta e externalizar `pdfjs-dist`/canvas no Next standalone.
3. Definir um orçamento compartilhado em bytes para fontes e aplicá-lo antes do gateway.
4. Alinhar DTO e `maxBodyBytes` ao mesmo contrato, rejeitando oversize antes de alocar trabalho excessivo.
5. Inspecionar o standalone para confirmar os binários nativos.

## 6. Recuperação de transcrições Vimeo

1. Criar trabalhos tipados para vídeo com caption estável ou vídeo Vimeo sem caption persistida.
2. Adicionar regressão em que o backfill recebe somente `provider/src` e recupera um text track pela API.
3. Reusar a seleção de trilha e o re-hosting R2 existentes sem esconder falhas.
4. Indexar o VTT recuperado sem exigir que o professor reabra e salve cada bloco.
5. Informar “Vimeo ainda não disponibilizou transcrição” quando a API não devolver tracks.

## 7. Concorrência da interface

1. Adicionar testes com promises controladas para troca de projeto durante pergunta e paginação.
2. Vincular operações a uma geração/AbortController e ignorar resultados obsoletos.
3. Invalidar operações ao trocar projeto, fechar o painel ou excluir o histórico.
4. Rodar unitários do painel e Playwright do Zappy.

## 8. Resultado do backfill no Admin

1. Tipar o resultado com `indexed`, `deleted`, `extracted` e detalhes de falha.
2. Retornar estado parcial quando qualquer fonte falhar.
3. Exibir toast de aviso com contagem; usar sucesso apenas quando `failed === 0`.
4. Adicionar regressões do servidor e do painel.

## 9. Verificação e operação

1. Rodar Biome e typecheck dos pacotes afetados.
2. Rodar suites completas de Studio, member-shell, members, Admin e Community Kids.
3. Rodar Playwright do Zappy e builds de Admin e Community Kids.
4. Executar `git diff --check` e revisar somente os arquivos do escopo.
5. Documentar as novas variáveis HMAC e o backfill pós-deploy para staging e produção.
