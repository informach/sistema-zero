# Módulo Python: repetição no checkout integrado

O [índice](index.json) registra cada recibo e seus hashes. O candidato foi
reconstruído em `d5bf4f215` com Bun 1.4.3; os 129 arquivos foram lidos novamente e
conferidos por tamanho e SHA-256. O manifesto
`842f92c7b82db61441765d963f6d7a4b5d436438e27e54ec1e507ac90cf38d0e` coincide
com o da [prova do módulo fornecido](../modulo-python-cenarios-2026-11-22/).
Nenhuma release ou opção pública foi ativada.

| Percurso repetido | Resultado |
| --- | --- |
| Chrome: Pygame-ce regional 1×/2× e módulo adulterado | Três aprovados; SHA diferente recusa a sessão antes do código autoral |
| Chrome: Pygame Zero, Raylib 2D, PNG comum e controle exclusivamente 3D | Quatro aprovados |
| Chrome e Chromium: nove jogos, física e mundos legados | 32 aprovados, incluindo PyDew Valley com entrada e pixels |
| Studio: módulo exportado nas três bibliotecas nativas, seleção de versão, arquivo autoral, sessão, remoção de extensão e exportadores | 84 testes, 503 asserções, zero falhas |
| Core: manifesto/release, ausência e tamanho dos três módulos, SHA adulterado e controles anteriores | 16 testes, 102 asserções, zero falhas |

O programa de teste importa o módulo efetivamente fornecido e conserva o PNG
original nos materiais. A verificação de bytes acontece antes de montar os
arquivos autorais. O módulo histórico `pygame/pinta.py` permanece idêntico.
As bibliotecas nativas usadas foram CPython 3.12.10, pygame-ce 2.5.8, pgzero 1.2.1
e raylib 6.0.1.0, nesta máquina. No navegador, Pygame Zero e Raylib usam os bridges
da distribuição; isso é distinto dos respectivos motores nativos.

O typecheck completo novo **não passou**: três diagnósticos `TS2339` apontaram
`packages/molda-cenarios-motor/src/compilar/imagens.ts`. O índice registra o SHA
do arquivo recebido da staging; ele não foi alterado nesta rodada. Esse recibo
não substitui um gate verde e está separado dos testes funcionais aprovados.

Os blocos candidatos, a admissão de materiais nos projetos, sua atualização,
o preview Clássico/Pro, publicação, rollout autenticado e a homologação integral
da Vila e Floresta têm critérios próprios ainda abertos. Um harness com PNG
admitido não qualifica automaticamente a importação do projeto pelo produto.
Toque emulado, crianças e aparelhos físicos adicionais não foram ensaiados aqui.

Os comandos de reprodução estão no relatório do módulo fornecido. Use o
manifesto acima, `PYTHON_PROBE_PINTA_SCENES=1`, porta de loopback e as dependências
nativas indicadas. Esta rodada também executou os três arquivos legados da
configuração `playwright.python-pygame.config.ts`, nos projetos Chrome e Chromium.
O servidor de QA foi encerrado e sua porta 5569 ficou livre.
