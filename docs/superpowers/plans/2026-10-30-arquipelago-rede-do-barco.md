# L10: rede do barco pela borda

Base: `f7bee3d3a`, com os cinco portos de `080b6a3d2`. Execução autorizada pela dona no
programa de entrega integral e na continuação dos lotes. Não altera GLB, salvamento ou serviço.

## Decisões

- A proposta original diz que, depois do Recife, o barco liga ilhas vizinhas pela borda.
  Conservar o desbloqueio no Recife e a ligação central a Recife. Acrescentar as seis
  ligações do anel, incluindo a volta entre Bosque e Nuvens. Destino fechado na jornada
  não pode ser selecionado. Nenhum passeio concede posto ou marca visita sozinho.
- Um painel no cais oferece os destinos, com os nomes das ilhas. E e Usar abrem
  o mesmo painel. Escolher confere novamente origem, distância, chão, jornada e pausas.
  Fechar não inicia viagem. Textos, botões, foco e rolagem usam os componentes visuais do jogo.
- Extrair âncoras dos sete GLBs em um arquivo pequeno e determinístico, conferido no build,
  no playground e nos testes. O navegador não baixa seis ilhas para descobrir os cais.
  Nas Nuvens, somar a altura de 7 m da ilha às âncoras, deixando o barco na água, y=0.
- Preparar curvas somente quando necessário e guardar o resultado por ligação. As entradas
  dos cinco portos novos seguem a proa por 25 m, conforme a arte. Central conserva seu canal
  de saída e Recife conserva a entrada pelo setor -70 graus, fora das áreas de mergulho. A conexão pela borda
  usa um arco externo a 150 m, além do Recife com suas áreas de mergulho. Testar contra
  pontes, terreno, barcos atracados, rodas de outras ilhas e colisores dos GLBs reais.
- Uma travessia transitória e um único modo de movimento, com origem e destino genéricos,
  prontidão dos dois cais e o mesmo controlador físico. O passo fixo não aloca. Só montar
  barcos atracados próximos e com chão pronto; não carregar seis ilhas completas.
- A prontidão vem do ciclo compartilhado da ilha, não de um componente específico do Recife.
  Esperar a 29 m, dentro da ativação a 30 m e fora dos novos deques. Após 20 segundos sem
  destino, voltar à origem pela rota inversa. Se o cais de retorno também falhar, continuar
  em segurança no barco, sem alternar destinos nem largar a pessoa no mar. Reabrir o jogo
  conserva a posição segura anterior, como já acontece no modo barco.
- Abrir visualmente as boias apenas nos corredores das ligações disponíveis. A correnteza
  dos nadadores não muda. Manter o teto atual de uma ilha completa na memória.

## Etapas

- [x] Âncoras geradas, validação e entrada de build sem novas leituras de ilhas no navegador.
- [x] Rede pura de vizinhança, curvas, dois cais genéricos, espera e retorno.
- [x] Prontidão no ciclo da ilha, barcos próximos, painel e corredores de boias.
- [x] Testes de geometria e Rapier em todos os portos, jornada e comandos antigos.
- [x] Navegador computador/celular: escolher, cancelar, ida/volta, pausa, carga lenta/falha,
  Nuvens, descarte e negativas de jornada. Capturas e relatório com limites.
- [x] Suíte do jogo, tipagem, lint, revisão completa e atualização de regras e CLAUDE.

Verificação: 1.283 testes, tipagem com 8 GB, lint de 577 arquivos e build aprovados.
Relatório e capturas: `docs/qa/2026-10-30-rede-barco/README.md`. A base recebeu o lote
de primeiros passos e dicas do Zappy (`08f9a6629`), preservado na composição testada.

O fantasma familiar é outro recorte de L10. Este plano não fecha os lotes L11 a L14 nem
representa implantação. Nenhuma escrita em banco remoto, `.env` ou workflow de CI.
