# Corrida das Tartarugas

Exemplo original Python Pro, em código, com `python-turtle@1.0.0`. A criação usa o runtime ativo aprovado pelo host e uma autorização fresca antes de salvar. O exemplo não inclui referência de runtime, conta, publicação ou concessão de acesso.

Escolha uma das quatro favoritas antes de largar. A escolha não influencia o movimento aleatório. São três segundos de contagem. O cronômetro mede tempo simulado ativo, sem a pausa. A primeira tartaruga a cruzar a chegada vence; um acerto é contado somente se for a favorita. Esses contadores pertencem apenas à sessão do jogo, sem relação com conquistas da plataforma.

| Ação | Teclado | Clique/toque |
|---|---|---|
| Escolher favorita, antes da largada | 1–4 | Faixa da tartaruga |
| Largar | Espaço | Começar |
| Pausar ou retomar | P | Pausar / Retomar |
| Preparar outra corrida | R | Reiniciar |
| Fechar a janela nativa | Esc | Fechar a janela |

Reiniciar preserva favorita e placar da sessão; zera posições, cronômetro e resultado. Espaço também retoma uma corrida pausada. As teclas usam `onkey` (soltar a tecla), evitando alternância por repetição automática.

O payload tem exatamente cinco arquivos: `main.py` (eventos e ciclo de vida), `model.py` (regras puras), `timer_loop.py` (uma cadeia de timers, com geração contra callbacks antigos), `view.py` (geometria e texto Turtle) e `requirements.txt` vazio. Não há pacotes pip, áudio, imagens, rede ou arquivos externos. Este README e a proveniência são documentação do catálogo, fora do payload executável.

O alvo é Python 3.14 com Turtle. A versão inicial foi exercitada no host real Chrome/Edge e em Turtle/Tk oficial no CPython 3.14.2, inclusive com fontes exportadas pelo exportador real e extraídas fora do monorepo. Isso não equivale a teste de entrada física no desktop, interface do VS Code ou equivalência com jogos de terceiros. A criação, o salvamento e a reabertura pela galeria têm um gate de integração separado.
