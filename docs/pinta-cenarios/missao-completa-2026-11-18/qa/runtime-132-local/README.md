# Runtime recompilado após a integração

Distribuição `132db1bdbf9c803d0e58bc76165ddfa8c298a25f816bf35d46366ce16604718e`:
126 arquivos, 26.006.491 bytes. Foi construída com Bun 1.3.11 a partir dos
fontes integrados; os arquivos do fornecedor e a biblioteca padrão foram
conferidos pelos manifestos fixados. O servidor de ensaios usa Bun 1.4.3 no
Windows, conforme sua proteção contra o vazamento de sockets da versão antiga.

Os bytes diferem do C4 anteriormente enviado. São artefatos distintos: o C4
continua intacto e não foi ativado. O plano desta distribuição preserva o catálogo
anterior e usa a release nova `2026-11-19-pinta-cenarios-2`.

## Resultado local

- **16 ensaios Pinta/Pygame** aprovados: contornos, plataformas, escalas 1×/2×,
  portas entre mapas, imagens e nove jogos da galeria, incluindo PyDew Valley.
- **83 ensaios compartilhados**, em uma rodada completa sem retry, aprovados:
  protocolo, CPython, inspeção, captura, interrupção, Turtle, áudio, Raylib 2D/3D,
  modelos e jogos de exemplo.
- Ensaio de carga Pygame aprovado: média estável **52,46 fps**, amostras estáveis
  `[53.2, 54, 51.4, 52, 51.7]`, critério existente de 45 fps. É uma medição nesta
  máquina, sem extrapolação para dispositivos físicos mais simples.
- API de cenários do runtime compartilhado: o compilador/importador canônico
  produziu uma cena própria de teste. O Python/Wasm carregou seus oito recursos,
  quatro nós e quatro registros de colisão, consultou solo e buraco e desenhou
  no canvas real de 480 × 360, sem diagnóstico. Isso não é homologação completa
  da interface Molda nem alteração de seu motor. Os quatro testes de contrato
  do módulo também passaram; o teste unitário usa uma porta Raylib simulada.

O [relatório](qualificacao.json) contém casos, medidas e limites. O manifesto
é identificado por JSON canônico, conforme o contrato de distribuição.

## Falhas conservadas e limites

A primeira rodada ampliada passou em 82 casos e reprovou o teste de
`SystemExit(0.0)`. A expectativa era anterior ao contrato publicado em
`e0a038c5ba`: término sem traceback e mensagem em stderr. Somente o teste foi
corrigido; agora exige a mensagem exata `0.0\n`, resultado concluído e ausência
de traceback. O interpretador e os jogos existentes não foram alterados.

A segunda rodada teve uma falha na preparação do canal Python, antes do
programa. O trace observado continha uma requisição de metadados com status
de rede `-1`; sua causa não foi determinada. O caso passou isoladamente e a
terceira rodada passou nos 83 casos. Isso não é uma declaração de correção
da falha transitória. O trace da segunda rodada foi sobrescrito pela execução
dirigida; seus logs textuais foram preservados. A terceira usa diretório
exclusivo, preservado separadamente.

Ainda faltam o ensaio hospedado, a ativação e o ciclo autenticado de autoria e
publicação. Nenhum desses resultados locais encerra a etapa 0b da missão.
Os logs textuais têm fins de linha e espaços finais normalizados para o Git.
