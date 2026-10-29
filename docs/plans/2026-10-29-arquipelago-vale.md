# Vale dos Dinos e apresentação da Jade (fase4-01)

## Decisões

- Seguir a integração do Pico no commit `fbb5780e0`, sem mudar o ciclo compartilhado de carregar,
  preparar, ativar e soltar a ilha. Usar os 62 colisores do GLB existente.
- Jade fica na âncora `morador`, no chão diante do observatório, olhando para `chegada`. A
  varanda está a y 3,8 e o observatório é fechado, com a cúpula sobre o centro dessa âncora.
  No chão, a apresentação é acessível pelo caminho já conferido no teste de colisores.
- Medidas do `jade.glb`, lido com GLTFLoader e Box3 na pose de repouso: malha de material
  `penas` vai até x ±0,405827 e y 1,5. Cilindro do corpo: raio 0,41 e altura 1,5, sem ampliar
  por causa das asas, da lupa ou do chapéu. Os olhos de material `iris` vão de y 1,045 a
  1,255: câmera a 1,15 dos pés. Os cinco clipes existem; as três malhas de olhos têm os
  morfos `piscar` e `feliz`.
- Manter os parâmetros de interação da Maré: alcance 2,2 m, olhar a 7 m, aceno a cada
  45 segundos e rapidez do giro 3. Sem inventar um comportamento novo para esta apresentação.
- Falas propostas: “Sou Jade. Estudo os fósseis do Vale dos Dinos.” e “Minha lupa ajuda a
  olhar os detalhes dos fósseis.” A lupa e os fósseis estão na arte. Não oferecer escavação,
  ninhos, filhote ou museu interativos: pertencem às fases4-02 e 4-03.
- Manter a V10. A conversa devolve o mesmo salvamento e uma cópia das falas. Nenhuma gravação
  adicional, amizade, presente ou pedido.
- Conferir os limites dos colisores inteiros, incluindo os vértices do terreno, contra o
  contorno da ilha leve. Só ampliar `raioDaEsperaDaIlha` se houver geometria visitável fora dele.
  A conferência encontrou a borda inclinada do terreno além dos 14,4 m da espera atual.
  O vértice mais afastado do terreno está a 15,614 m (saia submersa). Usar espera de 16 m,
  que inclui todo o terreno e o raio de 0,35 m do corpo. Não aumentar a ilha leve nem criar chão.
- No navegador, o observatório será conferido nos degraus da entrada. A torre é fechada;
  esta tarefa não cria acesso ao interior nem uma subida à varanda.

## Execução

- [x] Atualizar staging, ler a referência e conferir clipes, olhos e medidas da Jade.
- [x] Registrar a ilha e integrar a moradora e o painel genérico.
- [x] Testar ciclo, limites, posição, animações, medidas e apresentação sem alterar salvamento.
- [x] Conferir ponte, conversa, observatório, saída e retorno em computador e celular emulado.
- [x] Atualizar regras e CLAUDE, revisar o diff, testar o pacote, conferir tipos e lint.

Entrega no ramo staging, com rebase e push após as validações.

## Resultado da revisão

- A espera pelo chão foi ampliada a partir dos limites do GLB, antes da entrega.
- O teste do navegador passou a esperar a ponte e exigir chegada em terra firme, sem aceitar
  um deslocamento na água como sucesso.
- O teste de visitas já tinha um erro de tipo: sua anotação apagava a informação de que o
  quarto da fixture existe. `satisfies Visita` mantém a checagem do contrato e essa informação,
  sem alterar a regra das visitas nem usar coerção de tipo.
- `bun test`: 848 aprovados, um ignorado (Postgres opcional), zero falhas.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck` e Biome nos 13 arquivos TypeScript
  tocados passaram numa cópia isolada de staging mais este diff. Outras sessões estavam
  alterando o mergulho e o contrato no diretório compartilhado; essas alterações não entram
  nesta entrega. A bateria completa também passou na cópia isolada.
- Relatório e capturas: `docs/qa/2026-10-29-vale/README.md`.

Nenhum pedido de Blender necessário. Nenhum GLB ou gerador foi alterado.
