# L06: visitas de moradores e festas em casa

A proposta pede que o aconchego chame moradores e permita festas. Os limites já publicados são
12 e 22 pontos por cômodo. A implementação usa esses mesmos limites, sem somar cômodos.

- Uma visita automática, escolhida de forma estável por perfil e dia entre moradores já conhecidos
  de ilhas liberadas. A festa reúne até três desses moradores, por escolha no menu.
- A presença é temporária e não concede moedas ou amizade extra. Conversa, presentes e pedidos
  continuam com seus limites diários existentes. Não há versão nova de salvamento.
- O lugar vem da planta real, com móveis e objetos ocupando suas células. A busca parte da porta
  principal, respeita paredes e portas e só aceita espaço que não interrompe a circulação.
- Sem lugar, a interface explica a necessidade de espaço. Não desloca móveis nem o avatar.
- Ao construir, visitar outra pessoa, perder acesso ou sair da ilha central, os convidados saem.
  O morador original fica oculto enquanto está em casa, evitando duas presenças simultâneas.
- Computador e celular usam o menu e o mesmo painel responsivo, sem exigir precisão no mundo.
- Modelos e conversas são os mesmos do jogo. Sem arte nova, serviço ou alteração no banco.

## Verificação

- [x] Regra pura de elegibilidade, seleção estável e circulação, incluindo casa cheia e portas.
- [x] Estado de festa por montagem, recusa durante suporte, visita, conflito e tempo bloqueado.
- [x] Integração visual, conversa e limpeza ao sair, computador e celular emulado, dois públicos.
- [x] Revisão do diff e tipagem do pacote.

Provas locais em `docs/qa/2026-10-29-convidados/README.md`. A composição do programa completo,
celular físico, desempenho e implantação continuam no aceite final, não estão cobertos aqui.
