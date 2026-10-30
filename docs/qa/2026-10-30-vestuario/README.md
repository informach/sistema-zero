# Vestuário sazonal na ferramenta de avatar

Conferência local de 30/10/2026. O configurador, os modelos do avatar e os estilos das duas
comunidades são os arquivos reais do repositório. O servidor da conferência simula somente as
respostas da conta/carteira em memória. Não há autenticação real, banco ou rede de serviços.

## Prova visual final

`r6/resultado.json` registra quatro fluxos em Chrome com SwiftShader:

| Público | Tela | Ação | Resultado |
| --- | --- | --- | --- |
| Kids | 1280 × 800 | Prévia e cancelar | Sem compra, sem save, saldo 80 e roupa original |
| Kids | 390 × 844 | Confirmar e salvar | Uma compra, um save, saldo 70 e máscara equipada |
| Adulto | 1280 × 800 | Confirmar e salvar | Uma compra, um save, saldo 70 e máscara equipada |
| Adulto | 390 × 844 | Prévia e cancelar | Sem compra, sem save, saldo 80 e roupa original |

Os oito PNGs mostram prévia e retorno. A compra exige a confirmação existente do configurador.
O runner confere preço/saldo da fixture, ausência de compra no primeiro clique, espaço útil da
prévia 3D, diálogo fechado, zero canvases após retornar e ausência de erros de página/console.
Não é uma prova financeira do Members: essa autoridade continua no serviço e nos testes de banco.

## Achados corrigidos durante a execução

- R1/R2: favicon ausente no servidor de QA. Passou a responder 204; nenhum erro foi filtrado.
- R3: o botão Salvar do Kids estreito tinha só ícone e texto oculto, sem nome acessível.
  Agora recebe `aria-label`. A faixa de sugestões também ficou recolhível; escolher uma peça
  a recolhe e mantém a prévia com altura útil, em vez de ocupar o espaço do personagem.
- R4: a sugestão como irmã do cabeçalho quebrava as áreas da grade adulta. Foi movida para
  dentro do painel existente, com rolagem e sem sobrepor os botões.
- R5: o runner esperava o texto de compra do Kids também no adulto. Corrigido para o nome real
  da ação adulta. R6 passou nos quatro fluxos sem forçar cliques ou esconder erros.

## Provas complementares

O molde V1 é estrito e só contém a festa. Catálogo e modelo: dois testes/34 asserções.
Sugestões e regressões dos cosméticos: 22 testes/1116 asserções. O componente só apresenta
peças presentes no catálogo autenticado, usa o preço recebido e não presume posse.
As rotas de acesso passaram em processos isolados nos dois apps: sessão ausente é recusada,
suporte não edita e avatar não depende de comprar outro produto. As respostas são sem cache.
O host mantém a exclusão mútua das ferramentas e confere o perfil antes de abrir e ao voltar.
Resultados assíncronos de uma montagem já encerrada não resolvem uma ferramenta nova.

## Reproduzir

1. Em `packages/member-shell`, executar `bun playground/vestuario-server.mjs`. O servidor
   compila a entrada real com Bun e processa os CSS reais pelo mesmo plugin PostCSS/Tailwind
   instalado nas comunidades. Usa porta livre em `127.0.0.1` e imprime `READY` com a origem.
2. Em `packages/arquipelago`, definir por processo `ARQUIPELAGO_VESTUARIO_URL` com essa origem
   local e `ARQUIPELAGO_PRINTS` com um diretório novo. Executar
   `node playground/verificar-vestuario-browser.mjs`.
3. O runner encerra os contextos e o navegador. Encerrar também o servidor iniciado no passo 1.
   Nesta execução, o PID e a linha de comando foram conferidos antes do encerramento e a porta
   ficou livre. Nenhum programa alheio foi encerrado. Não editar `.env`.

## Limites

O teste usa a fixture do diálogo, sem montar simultaneamente o mundo completo nem o host
autenticado do Next. Não prova troca de sessão entre abas durante uma gravação, carteira real,
GPU física, fonte carregada pelo Next, celular físico ou ciclos prolongados de memória.
A confirmação financeira do avatar continua no Members; o jogo só relê o avatar persistido.
Esses limites ficam no aceite integrado de L14. Nenhum deploy foi feito nesta conferência.
