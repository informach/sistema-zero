# Operação do Zappy

## Deploy

1. Gere um segredo aleatório com pelo menos 32 caracteres por ambiente.
2. Configure o mesmo `MEMBER_SHELL_HMAC_SECRET` no API Gateway, Community e Community Kids.
3. No gateway, configure `MEMBER_SHELL_ALLOWED_CIDRS` com a rede dos dois BFFs.
4. Faça um deploy coordenado de `members`, API Gateway, Admin, Community e Community Kids; a mudança das rotas de persistência é incompatível com versões antigas do BFF durante a janela.
5. Confirme que as migrations `0057_zappy_reliability_schema`, `0058_zappy_reliability_backfill` e `0059_amused_retro_girl` foram aplicadas no `members`.
6. Confirme que `/readyz` está saudável antes de iniciar a sincronização.

Nunca reutilize o segredo de staging em produção. A ausência do segredo impede o boot em produção para não reabrir as mutações do Zappy via JWT público.

## Sincronização da base

Depois de cada deploy que altere blocos publicados, abra **Admin → Uso de IA** e clique em **Sincronizar base**. Execute primeiro em staging e depois em produção.

A migration `0059` invalida os chunks antigos porque eles não carregavam a revisão esperada durante a extração. Portanto, a sincronização é obrigatória logo após esse deploy. Enquanto ela não terminar, essas fontes ficam pendentes e não participam das respostas do tutor.

O Admin processa lotes pequenos e salva o cursor no navegador. Se a aba fechar ou uma chamada falhar, clicar novamente retoma do último lote concluído; reiniciar desde o começo também é seguro e idempotente.

- Sucesso significa que todas as fontes foram indexadas ou reconciliadas.
- Resultado parcial informa quantas fontes falharam; elas permanecem em **Fontes que precisam de correção** com o erro real.
- Marcar um ebook publicado como **Caderno do Aluno** conta como presença editorial mesmo que a extração do PDF falhe. A falha do PDF continua visível separadamente.
- Uma aula só deixa a lista de transcrições ausentes quando todos os seus blocos de vídeo publicados têm uma fonte pronta.

## Transcrições Vimeo

O backfill usa `GET /videos/{video_id}/texttracks` com `VIMEO_ACCESS_TOKEN`, escolhe preferencialmente uma trilha em português, baixa o VTT temporário e o re-hospeda no R2 antes de indexar. Isso recupera legendas/transcrições que já existem no Vimeo mesmo quando o bloco ainda não salvou `captions`.

Se o vídeo não tiver text track, a fonte fica com o erro **Vimeo ainda não disponibilizou transcrição**. Criar uma transcrição nova pela API de IA do Vimeo exige recursos Enterprise e escopo `ai`; esse fluxo não é requisito do Zappy. Nesse caso, gere ou envie a legenda no Vimeo e execute **Sincronizar base** novamente.

O token precisa conseguir ler os vídeos privados da conta. O Admin também precisa das credenciais R2 usuais para persistir os VTTs e ler os PDFs privados.
