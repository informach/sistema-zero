# Revisão da migração ediSVG

Revisão local concluída antes do commit de integração. A implantação ainda é uma etapa separada.

Foram conferidos o parser declarativo, limites/recursos, SSR, acessibilidade, controles públicos,
cache e cancelamento, isolamento das sessões, voz, premiação, falhas de mídia, persistência,
DTOs, clones, upload, autenticação, anti-SSRF, CORS, integridade do acervo e dependências.

Achados corrigidos:

- A prévia autenticada precisava manter cookies de mesma origem. RED 401 e GREEN preservados.
- A reserva intrínseca aumentava a caixa da trilha. O player preenche a caixa 9/8 em posição
  absoluta; os cinco tamanhos voltaram a passar sem sobreposição ou rolagem lateral.
- O baú fechado não precisa manter o relógio ativo. Ele permanece pausado até a abertura
  autorizada pelo servidor. A boca fecha e pausa ao interromper a voz.
- Um erro no descarte de uma sessão anterior não pode falhar a arte seguinte pelo callback novo.
- O WebP exige exact além de lossless para preservar os pixels transparentes do PNG. A geração
  confere igualdade RGBA após decodificar, sem enfraquecer o teste.
- Mocks globais de outros BFFs interferiam nos testes novos. A fixture HTTP foi isolada conforme
  o padrão do pacote. A suíte completa passou sem alterar as regras de produção.
- Retirados componentes, rotas, guards e dependências Rive. O backend novo não seleciona a coluna
  antiga. A migração 0143 só expande; o DROP será gerado depois de retirar as réplicas antigas.
- O acervo editável e a biblioteca ZIP permanecem no Git e fora do Docker. O build recebe os
  recursos necessários e verifica hashes antes de sincronizar os três aplicativos.

Verificações: Admin 960 testes externos (sete HTTP no processo isolado), Kids 1836, seleção
Members 59, migração canônica Postgres 1/14 asserções, pacote puro Node 22 8, navegador com tema
19 e lifecycle 12. Tipagens de Admin/Kids/Members/player passaram; builds dos três apps passaram.
O exportador e o motor passaram 312 e 193 testes. O exportador está no main local do outro
repositório, incluindo a qualificação nativa revisada. Não houve publicação de instalador.

Limites: seletor nativo do Windows foi controlado pelo ensaio; não é homologação manual desse
widget. Não houve medição em celular físico nem comparação justa de FPS com as artes Rive.
A medição local e seus limites estão no README desta pasta. Não há alegação de deployment
concluído ou de migração remota já aplicada neste registro.
