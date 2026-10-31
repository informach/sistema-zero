# Publicações do Mural no fliperama

Conferência local da composição baseada em `6461f19c0`, com alterações ainda sem commit.
Não houve escrita em staging ou produção. Os testes de serviço usam repositório em memória;
o teste da fila de tempo usa o Postgres descartável local já identificado para a entrega.

## O que passou

- `r5-kids` e `r5-adulto`: computador 1280 × 844 e celular emulado 390 × 844, usando os
  `globals.css` dos apps. O cenário monta o jogo real, abre o fliperama e o player público real.
- Lista própria, abertura de uma publicação JavaScript, canvas visível e clique na largada,
  Voltar, nenhum iframe após fechar, reabertura recusada quando a publicação retorna 404,
  fechamento por Escape. Os quatro casos terminaram sem erro de página ou rede externa.
- Diálogo com largura 1152 no computador e 374,39 no celular; altura 810,23, dentro da janela.
  Prints de lista, player e recusa ficam em cada diretório; recibos em `resultado.json`.
- Hub: 49 testes, 204 asserções, incluindo as publicações existentes dos dois públicos e os
  novos casos de autoria, comunidade, conteúdo oculto, retirada, limite e sessão obrigatória.
- Member-shell: 70 testes, 450 asserções, incluindo as guardas da publicação Python e Pro,
  repasse validado sem cache e portas existentes do jogo. Não são provas gráficas de Python/Pro.
- Gateway: 3 testes, 45 asserções; autenticação ativa e limite por identidade.
- Jogo: 1149 passaram, 1 teste condicionado a Postgres ficou separado, 0 falhas,
  133739 asserções em 134 arquivos. O teste separado passou no banco local: 1 teste, 3 asserções.
- Tipagem do Hub, jogo, member-shell e gateway passou. A revisão apontou inferência genérica na geração das
  rotas de profissões de L07; o `map<Route>` agora confere o contrato real sem cast ou supressão.
- Biome: 20 arquivos deste trecho conferidos sem correções pendentes.

## Tentativas preservadas

- A primeira invocação compilou o verificador na raiz, onde `playwright-core` não resolve.
  Não abriu navegador. O executável de QA passou para a cache do pacote que possui a dependência.
- `r2`: o cenário antigo recriava revisão zero em cada GET do salvamento, mesmo após PUT.
  O conflito legítimo impediu abrir o fliperama. A semente agora passa uma vez pelo PUT do
  próprio serviço em memória. Nenhuma proteção do produto foi desativada.
- `r3`: computador passou; no celular o verificador tocava o rótulo da ação, sem handler,
  em vez do botão real Usar. O seletor foi corrigido, preservando a tentativa e seus prints.
- `r4`: fluxo passou nos dois tamanhos com CSS do playground. `r5` repetiu com CSS dos apps,
  acrescentando a comunidade adulta, sem usar a prova anterior como aceite visual final.

## Reproduzir e limites

No pacote `arquipelago`, compile `playground/verificar-mural-browser.ts` com
`bun build --target=node --external playwright-core --outfile=.cache/mural-browser.mjs`.
Execute com Node, `ARQUIPELAGO_PRINTS` apontando para pasta nova. `ARQUIPELAGO_PUBLICO=adulto`
seleciona o adulto. Chrome é o padrão; `ARQUIPELAGO_CHROMIUM` permite outro binário.
O script inicia servidor próprio em porta local aleatória e fecha servidor/navegador ao sair.

A lista e a publicação são respostas locais controladas. Não é uma prova de login, R2,
publicação remota, projeto Python/Pro no navegador, GPU física ou sessão familiar real.
A página completa do host e os fluxos remotos seguem no aceite integrado L14. A listagem
mostra publicações recentes, não o acervo inteiro. A publicação retirada é recusada na
próxima abertura; não se afirma interrupção remota instantânea de uma partida já carregada.
