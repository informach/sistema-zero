# Coleções da praia e pesca

Recorte E01 sobre `01b36a7f2`, em worktree próprio. Jogo e modelos reais, plataforma falsa
local. Nenhuma escrita em banco remoto, mudança de V18, Blender, GLB, .env ou CI.

## Entrega

- Cinco conchas coletáveis e estrela-do-mar observável, uma descoberta de cada tipo.
- Pesca no píer, com espera de 3 segundos ativos e janela de 5 segundos para recolher.
- Pausa congela, sair cancela e perder a janela permite repetir sem perder itens ou moeda.
- Cinco espécies novas em ordem fixa, sem sorte ou compra de isca. O peixe volta ao mar.
- Álbum e mochila derivados do mesmo inventário; lembranças não são comida ou presentes.
- Comandos recusados em visita, suporte e conflito; altura e proximidade conferidas de novo
  ao agir. Interação só registrada depois de carregar o modelo. Física e colisores preservados.

## Provas locais

A rodada completa `r2` passou em computador 1280 × 800 com público Kids e celular emulado
390 × 844 com público adulto e movimento reduzido. No celular, as ações foram pelo botão
Usar, sem substituir o gesto pelo teclado. Em ambos: seis descobertas, cinco peixes, pausa
de 8,5 segundos durante a espera, janela perdida sem prêmio, nova tentativa, álbum completo,
reabertura e zero erro de página ou console. Visita adulta confirmou ausência de coleta.
O píer fica fora do raio de visita; não é correto teleportar para lá e continuar afirmando
que o cenário está em visita. A recusa de escrita também é coberta no teste da loja real.

O fechamento combina a prova completa do computador em `r4-compacta` com
[r5-celular/resultado.json](r5-celular/resultado.json), depois de corrigir a intercepção do
joystick. A rodada móvel terminou com zero erros, álbum aberto por toque, reabertura e
recusa durante visita. `r6-miniaturas` confere o acabamento final no jogo com uma descoberta,
o mesmo atalho e as onze imagens decodificadas. É um smoke visual, não outra rodada de pesca.

Resultados estruturados em [r2/resultado.json](r2/resultado.json), com capturas de praia,
pesca e álbum nos dois tamanhos. SwiftShader não é prova de FPS em GPU ou celular físico.
A coleta foi conferida em pontos reais do mundo; não é uma prova de navegação de toda a ilha.

O cenário cheio com todos os itens no catálogo, construção e rotinas no teto tem 63.324 bytes,
com 2.212 bytes de margem. Não houve truncamento, remoção de dados ou aumento de teto.

## Verificação do código final

| Comando no pacote do jogo | Resultado |
| --- | --- |
| `bun test` | 1327 aprovados, 1 ignorado, 0 falhas; 175581 asserções |
| `bun run typecheck`, heap 8192 | aprovado |
| `bun run check` | 611 arquivos, sem erro ou aviso |
| `bun run build` | versão 20261030135106, 158 arquivos, 36,32 MB |

O ignorado é uma prova antiga da fila contra Postgres, que exige banco local configurado.
Não inclui os onze testes novos da praia. Nenhum teste novo foi ignorado ou teve prazo elevado.
A revisão conferiu idempotência, política de escrita, descarte das tentativas transitórias,
colisores reais, propriedade dos materiais, limites UTF-8 e ausência de cópia de persistência.
O passo de pesca só altera o estado recebido e não aloca por quadro. Nenhum estado novo entrou
na física ou no contrato de salvamento. Os textos e a apresentação reutilizam o tema do jogo.

## Negativos preservados e revisão

O primeiro teste encontrou catálogo ausente para as lembranças e a posição inicial da estrela
abaixo da faixa de areia escolhida. O catálogo foi ligado e a posição foi ajustada antes da
conferência visual. Um erro inicial da fixture usou argumento incorreto no construtor do save;
foi corrigido sem alterar o contrato. O teste dirigido passou depois das correções.

O navegador `r1` recolheu as seis descobertas, mas procurou Voltar ao jogo no menu de pausa.
O rótulo real é Continuar jogando. Falha, página e imagem estão em `r1/`. O verificador foi
corrigido, sem renomear o botão do produto. A revisão também moveu a leitura do GLTF para
antes do registro dos comandos, evitando coletar uma peça que ainda não carregou.

Depois da rodada completa, `r3-ordem` conferiu a prioridade dos insumos. A inspeção dos
prints completos encontrou outro problema: onze lembranças geravam onze espaços na barra,
ocupando grande parte da tela do celular. `itensDaBarra` passou a preservar os insumos e
equipamentos e a reunir apenas essa coleção em um botão para o álbum. O inventário continua
com todas as entradas. O teste puro confere as onze descobertas com somente três insumos
na barra, e o navegador completo foi preparado para exigir quatro espaços e abrir o álbum
pelo novo botão. As rodadas anteriores não qualificam esse último ajuste.

A rodada `r4-compacta` completou o computador, mas no celular o joystick interceptou o toque
no atalho. A falha preservada identifica `arq-zona-joystick` como alvo da intercepção. A causa
era a ordem de pintura: a zona flutuante estava depois da barra visível. `ControlesDeToque`
passou a ser montado antes da barra; os painéis continuam depois dos dois. Não foi aplicado
clique forçado, remoção do joystick ou z-index acima dos painéis. A repetição móvel usa `tap`.

A revisão de distribuição encontrou URLs de PNG relativas à página em vez do módulo. O
verificador `verificar-miniaturas-praia-browser.mjs` compila o módulo real e serve página em
`/aulas/exemplo/` e assets em `/recursos/`. Antes da correção, as onze imagens falharam. Depois
de resolver por `import.meta.url`, como as outras miniaturas do jogo, as onze carregaram.
O verificador do jogo também passou a aguardar a decodificação antes dos prints do álbum.
Resultados preservados em [miniaturas-red.txt](miniaturas-red.txt) e
[miniaturas-green.txt](miniaturas-green.txt). Os hashes das fontes e das provas estão em
[verificacao.json](verificacao.json).

## Reproduzir

No pacote `packages/arquipelago`:

```powershell
bun test
$env:NODE_OPTIONS='--max-old-space-size=8192'
bun run typecheck
bun run check
bun run build
bun build playground/verificar-praia-browser.ts --target=node --external playwright-core --outfile .cache/verificar-praia-browser.mjs
$env:ARQUIPELAGO_PRINTS='CAMINHO_ABSOLUTO_PARA_PASTA_INEDITA'
node .cache/verificar-praia-browser.mjs
```

Criar antes a pasta pai dos prints. O verificador escolhe porta local livre e fecha seu
navegador e servidor no finally. Aceita `ARQUIPELAGO_CHROMIUM` ou usa o canal Chrome.
Para a prova curta de acabamento, definir `ARQUIPELAGO_PRAIA_VISUAL=1`, com outra pasta inédita.
Ela confere somente o atalho compacto, coleta inicial, erros e largura nos dois tamanhos.
Não substitui a rodada completa. Remover a variável para repetir o fluxo integral.
`ARQUIPELAGO_PRAIA_APARELHO=celular` ou `computador` permite rodadas seriais por tamanho;
sem essa variável, os dois são executados. Valor inválido é recusado antes de abrir recursos.

Prova independente da distribuição dos PNGs:

```powershell
bun build src/interface/miniaturas-da-praia.ts --target=browser --outdir .cache/praia-miniaturas --entry-naming miniaturas.mjs
node playground/verificar-miniaturas-praia-browser.mjs
```

Essa prova usa o módulo e os PNGs reais em navegador, sem abrir o mundo 3D e sem importar
uma segunda cópia dos endereços. O primeiro comando com outfile foi recusado pelo Bun por
ter vários assets; a reprodução usa outdir. O negativo funcional é o das onze URLs incorretas.

## Limites

Aceite hospedado, navegação por pessoas reais e aparelhos físicos continuam em Q01/L14.
Não houve publicação, migração, seed ou implantação. O conteúdo Pega-conchas está em C03.
Receita consumível de peixe não pertence a este recorte e não pode gastar as lembranças.
