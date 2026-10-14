# Fontes da revisão final

Esta pasta contém dados e ferramentas da revisão de 12/10/2026. A copy publicável está em `docs/marketing/kids/comunidade-dos-criadores/instagram/postagens/`.

- `final-posts.json`: fonte final das 30 postagens e seis extras.
- `final-stories.json`: fonte final das 60 telas.
- `aplicar.py`: gera os documentos de copy e a extração para lint.
- `montar-p01-cotidiano.mjs`: gera o P01 vigente após a revisão de cotidiano; normaliza as quebras de linha e verifica seis slides antes de renderizar.
- `verificar.py` e `verificacao-final.json`: contagem, cópias, fontes, links, dimensões, layout e lint.
- `producao/postagens/p01-nao-consigo/apoio/prompts-cotidiano.txt`, dentro do Instagram: prompts e origem das duas ilustrações novas. Os prompts desta pasta e `montar-p01.mjs` correspondem à versão anterior.

`revisao-integral.py`, `revisao-11-20.py`, `revisao-21-36.py` e `revisao-stories.py` registram a reescrita aplicada. `sincronizar-revisao.py` sincronizou calendário, guias e entregas do direct. `preparar-arte-revisada.py` preservou a arte anterior e preparou a montagem nova. São ferramentas desta operação; não executá-las para sobrescrever futuras alterações manuais na fonte. O retrato anterior da copy está em `antes-revisao-de-clareza/`.

Os arquivos `posts-01.json`, `posts-02.json`, `posts-03.json`, `posts.json` e `final-01.json` a `final-03.json` são etapas intermediárias, preservadas como registro. **Não são fonte de publicação.** A direção foi corrigida pelo usuário durante o trabalho e os dados finais incluem a revisão posterior de texto e salvamento.

`atualizar-guias.py`, `consolidar.py`, `refinar.py` e `fechar-entrega.py` registram operações pontuais já aplicadas; não são um pipeline idempotente para executar novamente. Não rodar os validadores de 11/10 para sobrescrever a copy nova.

ManyChat apenas planejado. Nenhuma publicação, mensagem, configuração remota ou alteração de produto foi executada.

## Última revisão: situações reconhecíveis e exemplos variados

`revisao-cotidiano.py` e `revisao-cotidiano-complementos.py` registram a reescrita aplicada. `sincronizar-cotidiano.py` fez o ajuste final e sincronizou os documentos. São registros da operação; não executar sobre futuras alterações manuais.

`exemplos-editoriais.json` guarda o mapa de 11 bases do Estúdio. `antes-revisao-cotidiano/` preserva o texto anterior. O histórico de imagens está dentro da pasta Instagram. `montar-p01-revisado.mjs` e os scripts anteriores de sincronização não correspondem à produção atual.

Para gerar a partir da fonte atual: executar `aplicar.py`, atualizar o calendário se títulos ou durações mudarem, executar `montar-p01-cotidiano.mjs` e depois `verificar.py`. Não rodar as ferramentas anteriores de reescrita para reproduzir a entrega.

