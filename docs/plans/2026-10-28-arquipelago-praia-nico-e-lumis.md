# Nico e Lumis da praia

## Escopo e decisões

Ligar os GLBs existentes dos cartões `arte-falta-01` e `arte-falta-02`, sem regenerar arte.
Referências: `docs/arquipelago.md`, proposta original (seções Ilhas e Lumis),
`packages/arquipelago/CLAUDE.md`, `arte/lumis/README.md`, `mundo/capi.tsx` e `mundo/animado.ts`.

- Nico é o carteiro da praia da ilha central. A proposta não define seu ponto exato nem uma
  conversa. Fica em `(0, 25)`, de frente para o interior da ilha, com animação de descanso.
  Acena ao chegar a menos de quatro metros, uma vez por aproximação, com intervalo mínimo
  de oito segundos. Não recebe interação, fala, carta ou recompensa nova.
- Estrelinha, comum, fica em `(2, 25)`. Búzio, raro, fica em `(3, 26)`, afastado do acesso à
  ponte. Ambos usam escala 0,3 e o clipe `parado`, começando em momentos diferentes.
- A proposta descreve captura com lanterna e rotinas para uma etapa futura. Na data desta
  integração, os outros Lumis existem como arte e cartões do caderno, sem componente de
  personagem no mundo para reaproveitar. A decisão mínima é presença visual animada na praia.
  As identidades de procurar conchas e escutar o mar continuam como descrições dos Lumis.
  Não há coleta automática, chance de raridade, captura ou concessão ao inventário nesta entrega.
- Os clipes dos arquivos ficam intactos. Nico usa `parado` e `acenar`; `andar`, `falar` e `feliz`
  continuam disponíveis. Os Lumis mantêm `parado`, `andar`, `pular`, `trabalhar` e `feliz`.
- Um cilindro arredondado por corpo, menor que o desenho e sem colisão com a câmera. Os Lumis
  mantêm o tamanho pequeno real, sem parede invisível alta. Pinças, pontas e brilho ficam livres.
- Cada modelo tem sua própria reserva de carregamento. Falha de um arquivo não derruba a cena
  nem deixa um colisor invisível. Animações pausam com o jogo e respeitam movimento reduzido.

## Execução e conferência

- [x] Integração na cena com `useCopiaAnimada` e `trocarClipe`.
- [x] Regras puras do aceno e colisores simples.
- [x] Testes carregando os três GLBs reais e conferindo os clipes, medidas e posições.
- [x] Conferência no playground, revisão do diff, testes do pacote, typecheck e lint.
- [x] Entrega em commit próprio no staging local, sem push.

### Resultado da conferência

- `bun test` no pacote: 483 passaram, nenhum falhou; um teste de Postgres ficou ignorado pelo
  próprio teste. Nenhum banco foi acessado para esta entrega.
- Typecheck com o TypeScript instalado no pacote e `NODE_OPTIONS=--max-old-space-size=8192`:
  sem erros. `bunx biome ci packages/arquipelago --diagnostic-level=error`: sem erros.
- Playground com `bun run dev` na porta 4599, pois 4520 já estava ocupada. Chrome: os três
  modelos carregaram, animaram, pausaram no menu e retomaram ao fechar. A aproximação disparou
  o aceno; o corpo do Nico desviou o personagem em vez de permitir atravessá-lo. Console sem
  erros na conferência final.
- Conferência visual de dia em 1280 × 800 e de noite em 390 × 844 com movimento reduzido.
  É uma janela estreita no computador, não uma medição em celular físico. O medidor registrou
  60 quadros por segundo na amostra diurna do desktop.
- Na revisão, o colisor da Estrelinha foi reduzido para caber na espessura do modelo. O Búzio
  foi afastado da entrada da ponte. Os GLBs, os arquivos protegidos e o salvamento não mudaram.
- Para repetir a visita: `/?novo=1&persistir=0&em=1,22`. Com o medidor ligado, usar
  `__arquipelagoLevar(1, 2, 22, Math.PI)` para olhar para a praia. Para a noite, abrir um contexto
  novo do navegador com `&adiantar=13`, sem reaproveitar o salvamento da visita anterior.

## Acompanhamento

A dona atualizará a página. Ao concluir, informar:

- `arte-falta-01`: Nico ligado à praia central, animado, com aceno de proximidade e colisor.
- `arte-falta-02`: Estrelinha e Búzio ligados à praia, com animações e colisores no tamanho dos
  modelos. Mecânicas futuras dos Lumis não fazem parte desta integração visual.

Não há modelo para regenerar.
