# Revisão funcional da Morada

Os dez achados recebidos durante a implementação ampliam o aceite anterior. O recibo de verificação anterior registra as execuções daquele estágio; esta revisão exige novas provas nos contratos reais, incluindo diferenças entre plataforma falsa e Members.

| Item | Caso a reproduzir e verificar |
| --- | --- |
| 1 | Members devolve somente troféus em `owned`; peças gratuitas continuam disponíveis para colocar, mover, desfazer e trocar aparência. Plataforma falsa segue o mesmo contrato. |
| 2 | Casa própria e visita têm escopos separados; retorno, rascunhos e respostas atrasadas não podem trocar a casa da criança pela do amigo. |
| 3 | Leitura e CAS usam a mesma identidade de perfil/público; criança com conta de responsável e metadado legado divergente consegue salvar. Prova em Postgres descartável. |
| 4 | Pet canônico é a única fonte doméstica, inclusive `null`; follower, interações e necessidades não ressuscitam o quarto antigo nem duplicam animais. |
| 5 | Importação idempotente das funções antigas independe da revisão da casa e lê também o andar superior. Um marcador canônico distingue a importação de uma retirada posterior. |
| 6 | Sair da casa funciona com falha de rede, recusa e conflito, conservando o rascunho próprio para recuperar depois. |
| 7 | Modos e entrada respeitam os bloqueios anteriores, incluindo progresso inicial e atividade cronometrada. |
| 8 | Colisão de malha acompanha instância, cômodo e parte móvel sem congelar vértices no mundo. Raycasts de Rapier verificam posição, giro e escala autoral. |
| 9 | Leitores reconciliam peças/pets retirados e referências dependentes; migração não aborta por ausência de equivalência. Escrita continua estrita. |
| 10 | Pet dá passagem em locais estreitos e respeita a preferência de menos movimento. Trajetória/física e política visual têm provas próprias. |

As reproduções devem falhar antes do respectivo reparo. As interfaces atuais Kids, adulta e do jogo permanecem preservadas durante as correções.

## Correções verificadas

- **1:** catálogo e autorização distinguem peças gratuitas de troféus conquistados. A plataforma falsa devolve o mesmo contrato do Members. Um teste integra a store real ao `MoradaHouseService` real: `owned:[]`, colocar/mover/salvar e recusar troféu não conquistado.
- **2:** documento próprio e documento visitado têm escopos e rascunhos separados. A mudança de visita invalida respostas de leitura e gravação em voo; só a casa própria pode ser gravada.
- **3:** CAS e leitura usam perfil/público/revisão. A conta autenticada é reparada como metadado. Teste SQL real reproduz o predicado anterior sem correspondência e confirma gravação de criança com conta de responsável, revisão e isolamento entre perfis/públicos.
- **4:** `petDaMorada` é a fonte doméstica única. Um `null` canônico não recupera o pet legado. Seguidores, companhia e interações usam essa mesma seleção.
- **5:** a importação do térreo e do andar não depende mais da revisão 0. `arquipelago-functions-v1` é um marcador canônico preservado pelo Members. Importação incompleta pode ser retomada; retirada posterior permanece retirada.
- **6:** voltar à ilha fecha a cena imediatamente, preserva o rascunho e tenta enviar sem bloquear a saída. Recusa, conflito, ausência de adapter e requisição pendurada têm regressões próprias.
- **7:** botões e operações compartilham a guarda anterior de construção, incluindo porta, corrida, suporte, conciliação e resultado. A abertura pelo portal continua sendo o caminho do jogador novo.
- **8:** cada malha usa coordenadas locais de um corpo cinemático que acompanha sua pose mundial. Também são considerados grupos glTF com várias primitivas. Rapier verifica deslocamento/giro/parte móvel; as 23 peças privadas, com 26 malhas de colisão, foram conferidas após transformação, com desvio máximo de 2,51×10⁻¹⁵ m em relação ao desenho.
- **9:** leitura reconcilia recursos retirados e seus dependentes sem alterar o documento bruto ou a revisão. Escrita permanece estrita. Casa, quarto, perfil e visita têm provas HTTP; equivalência legada ausente não aborta a migração.
- **10:** empurrão e passinho do pet voltam a dar passagem. O teste com Rapier cobre corredor de 1,1 m: o avatar ultrapassa 4 m sem sobrepor o pet. Menos movimento congela o passeio decorativo e o idle, conservando a locomoção essencial.

## Evidências finais

- Suíte completa do jogo após as correções: **1.992 passaram, 0 falhas, 1 integração Postgres pulada** por ausência da variável daquela suíte. Log local em `.cache/morada-game-review-final.log`.
- **3 testes SQL reais passaram** em Postgres 16 descartável, incluindo a identidade infantil e o reembolso/migração. Nenhum banco da aplicação foi modificado.
- Core/Members: **16 testes** de schema, reconciliação, serviço e HTTP passaram.
- Pets e renderer: **32 testes** relevantes passaram, além dos testes de integração e autoridade da casa.
- Nova prova de colisão com parser glTF real e Rapier: **2 testes** passaram. Ensaio com os recursos privados conferiu as 23 peças/26 malhas.
- Navegador com o contrato corrigido: chegar ao portal, entrar, construir, colocar móvel, Pronto e voltar à ilha; sem exceções JavaScript. As interfaces originais permanecem preservadas.

Tipos de core, Members, renderer, contratos, member-shell e jogo passaram. Build final do jogo: `20261114163743`. O último ajuste de atualização de posse após conflito CAS passou em 27 testes focais; Biome e diff check dos arquivos da revisão passaram.

Estado: os dez achados foram corrigidos e verificados. Não houve deploy, upload para R2 nem conversão de contas em produção.
