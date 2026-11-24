# Porta com destino real na fixture do CI

A CI 44765924545 aprovou 46 ensaios de cenários e recusou dois, desktop e toque:
a autoria profissional criava uma porta para floresta, mas a fixture só continha
a Vila. O exportador portátil corrigido recusou esse mundo incompleto e não
gerou download. Esse bloqueio não foi removido nem convertido em aviso ignorado.

A fixture exclusiva desse ensaio agora inclui uma floresta construída pelo
construtor oficial, com o mesmo tileset da Vila. O teste conserva a porta para
floresta e também confere a presença do destino no arquivo editável. A seleção
do mapa sob teste usa seu nome, pois o arquivo passa a conter os dois mapas.
O cenário compartilhado dos demais ensaios de biblioteca permanece igual.

Chrome real nesta máquina: os quatro ensaios focados de autoria e mundo editável
passaram em desktop/toque emulado. A suíte completa de cenários e Phaser passou
48 ensaios em 2,9 minutos. São provas locais; a CI anterior continua falha e uma
nova fonte deverá ser qualificada. Nenhuma mudança funcional ou visual no editor,
nenhuma operação em produção e nenhum aparelho físico adicional.
