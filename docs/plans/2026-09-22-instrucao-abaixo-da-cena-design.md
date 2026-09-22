# Design — instrução junto dos controles nas experiências

## Objetivo

Organizar todas as experiências interativas na ordem em que a criança compreende e age: primeiro ela reconhece a cena; depois lê uma instrução curta; por fim encontra os controles que executam essa instrução.

## Regra pedagógica

O palpite conserva a sequência já aprovada:

1. contexto;
2. cena parada;
3. pergunta;
4. alternativas.

Nenhum controle aparece durante o palpite.

Depois do palpite, ou desde o início quando ele não existe, a experiência usa esta ordem:

1. HUD e nome da cena;
2. cena interativa;
3. uma instrução curta do Zappy;
4. pista, somente quando a criança a solicitar;
5. controles da experiência;
6. retorno da atividade, como palpite anterior, conclusão e situação alcançada.

A instrução indica a próxima ação sem repetir explicações, nomes de todos os controles ou o conteúdo do vídeo. Os controles ficam imediatamente depois dela. Essa proximidade deve existir na ordem real do documento, portanto vale igualmente no computador, no celular, na navegação por teclado e em leitores de tela.

Os avisos que respondem a um gesto imediato — por exemplo, uma descoberta recém-feita — permanecem sobre a cena. Eles pertencem ao resultado visual da ação e não interrompem a sequência entre instrução e controles.

## Solução técnica

`SceneActivity`, no pacote compartilhado `member-shell`, continuará responsável pela composição. O ramo da experiência será reordenado uma vez, sem alterar cada tipo de cena:

```text
SceneConsole
├── SceneReadoutBand (HUD e nome)
├── ConsoleMundo (cena e avisos imediatos)
├── ConsoleFala (instrução)
├── pista solicitada
├── ConsolePrancha (controles)
└── retorno da atividade
    ├── palpite congelado, quando existir
    ├── conclusão, quando liberada
    └── situação atual
```

Essa solução preserva a API atual do console e distribui a regra para Community e Community Kids. Criar uma nova API de slots aumentaria o escopo sem benefício para esta mudança. Reordenar apenas com CSS deixaria a leitura assistiva diferente da ordem visual e não será usado.

## Estados e comportamento

- A escolha do palpite continua liberando a experiência sem mostrar controles antecipadamente.
- A cena continua ativa depois da conclusão.
- A pista continua próxima da instrução e desaparece quando a experiência conclui.
- Os controles continuam disponíveis depois da conclusão, salvo bloqueios que já existiam.
- O retorno da atividade aparece depois da área de ação e não separa a instrução dos controles.
- A mesma árvore de elementos atende desktop e celular; não haverá ordem paralela por breakpoint.

## Documentação

O briefing e a especificação do manifesto registrarão a nova ordem. Assim, novos roteiros e novas cenas não voltarão a posicionar a instrução antes do contexto visual.

## Verificação

Um teste de estrutura protegerá as duas sequências:

- palpite: contexto → cena parada → pergunta → alternativas, sem controles;
- experiência: HUD → cena → instrução → controles → retorno.

Também serão executados os testes, a checagem de tipos e o Biome do `member-shell`, além dos testes relacionados do Community Kids. A revisão final confirmará que nenhuma alteração local alheia entrou no conjunto preparado.
