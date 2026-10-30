/** CSS do jogo, injetado pela entrada dentro do próprio elemento (prefixo `arq-`). */
export const ESTILOS = `
.arq-aconchego{padding:12px;border:1px solid #ead6a3;border-radius:14px;background:#fff8e8;color:#303651}
.arq-aconchego-topo{display:flex;justify-content:space-between;align-items:center;gap:8px}.arq-aconchego-topo label{display:flex;align-items:center;gap:8px;min-width:0;font-weight:800}.arq-aconchego select{font:inherit;min-width:0;max-width:170px;min-height:44px;border:1px solid #c6b889;border-radius:10px;padding:4px;background:#fff;color:#303651}.arq-aconchego select:focus-visible{outline:3px solid #2a7de1;outline-offset:2px}
.arq-aconchego-nivel{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:8px 0}.arq-aconchego-nivel>span{color:#946200;font-size:22px;letter-spacing:2px}.arq-aconchego-nivel small{margin-left:auto}.arq-aconchego dl{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.arq-aconchego dl div{display:flex;gap:6px;padding:4px 8px;border-radius:8px;background:#fff}.arq-aconchego dt{font-size:13px}.arq-aconchego dd{margin:0;font-weight:800}.arq-aconchego-dica{margin:8px 0 0;font-size:14px}.arq-obra:has(.arq-aconchego){max-height:calc(100% - 90px);overflow-y:auto}.arq-aconchego-topo .arq-botao{min-height:44px;padding:6px 10px}@media(max-width:560px){.arq-aconchego-topo label{gap:6px;font-size:14px}.arq-aconchego select{max-width:140px}.arq-aconchego{padding:10px}.arq-aconchego-nivel{margin:6px 0}.arq-aconchego-nivel>span{font-size:18px}.arq-aconchego dl{gap:4px;margin:6px 0}.arq-aconchego dl div{padding:3px 6px}.arq-aconchego-dica{font-size:13px}}
.arq-luneta{position:absolute;inset:0;box-sizing:border-box;background:radial-gradient(circle closest-side,transparent 82%,rgba(8,12,32,.4) 89.5%,#e2b552 90%,#b07f2a 92.5%,#6e4c14 94%,#0b1028 94.6%)}
.arq-luneta-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px}
.arq-luneta-fala{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:12px;width:min(520px,calc(100% - 48px));box-sizing:border-box;padding:16px;background:rgba(20,26,58,.94);color:#fff;border-radius:16px}
.arq-luneta-fala p{margin:0}.arq-mirante-mira{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border:2px solid rgba(255,236,170,.85);border-radius:50%;box-shadow:0 0 0 1px rgba(11,16,40,.5);pointer-events:none}.arq-mirante-setas{position:absolute;right:16px;bottom:150px;display:grid;grid-template-areas:". cima ." "esq . dir" ". baixo .";grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:4px}.arq-mirante-setas .arq-botao{min-width:0;width:52px;height:52px;padding:0;font-size:20px;touch-action:none}.arq-mirante-cima{grid-area:cima}.arq-mirante-esq{grid-area:esq}.arq-mirante-dir{grid-area:dir}.arq-mirante-baixo{grid-area:baixo}
.arq-raiz{position:relative;width:100%;height:100%;overflow:hidden;background:#0e1638;color:#1d2340;font:15px/1.4 var(--font-nunito,Nunito),system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--arq-titulo:var(--font-baloo,"Baloo 2"),var(--font-nunito,Nunito),system-ui,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none}
.arq-canvas{position:absolute!important;inset:0}
.arq-hud{position:absolute;inset:0;pointer-events:none}
.arq-hud > *{pointer-events:auto}
.arq-cartao{background:rgba(255,255,255,.92);border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.16)}
.arq-necessidades{position:absolute;left:14px;top:14px;padding:10px 12px;display:grid;gap:6px;min-width:170px}
.arq-nec{display:grid;grid-template-columns:22px 1fr;align-items:center;gap:8px;font-weight:700;font-size:13px}
.arq-barra{height:9px;border-radius:9px;background:#e7e3d6;overflow:hidden}
.arq-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.arq-barra i{display:block;height:100%;border-radius:9px;transition:width .6s}
.arq-topo-dir{position:absolute;right:14px;top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:60%}
.arq-pilula{padding:7px 13px;font-weight:800;font-size:14px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 4px 18px rgba(0,0,0,.16);white-space:nowrap}
.arq-botao{border:0;cursor:pointer;font:800 15px/1.2 var(--arq-titulo);border-radius:12px;min-height:44px;padding:10px 16px;background:#ffc93c;color:#4a3200;box-shadow:0 4px 0 #c98f00}
.arq-botao:disabled{opacity:.55;cursor:default}
.arq-botao.leve{background:rgba(255,255,255,.94);color:#1d2340;box-shadow:0 4px 0 rgba(20,26,58,.22)}
.arq-botao:focus-visible{outline:3px solid #2f6df6;outline-offset:2px}
.arq-baixo{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;max-width:calc(100% - 28px)}
.arq-acao{padding:8px 16px;font-weight:800;border-radius:999px;background:#141a3a;color:#fff;display:flex;gap:10px;align-items:center}
.arq-soneca{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(10,14,40,.15) 35%,rgba(10,14,40,.62) 100%);animation:arq-soneca-entra 1.2s ease}.arq-soneca-cartao{position:absolute;left:50%;top:18%;transform:translateX(-50%);display:grid;gap:6px;justify-items:center;padding:10px 18px;min-width:180px}.arq-soneca-cartao b{font-size:15px;color:#1d2340}.arq-soneca-barra{width:160px;height:10px;border-radius:99px;background:#e7e3d6;overflow:hidden}.arq-soneca-barra i{display:block;height:100%;border-radius:99px;background:#ffc93c;transition:width 1.8s linear}@keyframes arq-soneca-entra{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.arq-soneca{animation:none}.arq-soneca-barra i{transition:none}}
.arq-tecla{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:6px;background:#ffc93c;color:#4a3200;font-size:13px;white-space:nowrap}
.arq-inventario{display:flex;gap:6px;padding:6px;background:rgba(20,26,58,.82);border-radius:14px;flex-wrap:wrap;justify-content:center}
.arq-item{position:relative;width:46px;height:46px;border-radius:10px;border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);font-size:22px;display:grid;place-items:center;color:#fff;cursor:default}
.arq-item.comida{cursor:pointer;border-color:#ffc93c}
.arq-item[aria-pressed]{cursor:pointer;border-color:#7fd6ff}
.arq-item[aria-pressed="true"]{background:rgba(127,214,255,.32);box-shadow:0 0 0 2px #7fd6ff inset}
.arq-item b{position:absolute;right:3px;bottom:1px;font-size:11px}
.arq-dica{position:absolute;left:14px;bottom:90px;max-width:min(380px,calc(100% - 28px));display:flex;gap:10px;align-items:flex-start;padding:12px 14px;background:rgba(20,26,58,.92);color:#fff;border-radius:16px;font-weight:700;animation:arq-entra .35s ease}
.arq-zappy{width:22px;height:22px;flex:none;border-radius:50%;background:radial-gradient(circle,#fff8c4 0 30%,#ffc93c 31% 58%,transparent 60%);box-shadow:0 0 14px #ffd84f}
@keyframes arq-entra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.arq-tela{position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:radial-gradient(900px 500px at 50% 0%,#2a3a86,transparent 60%),#0e1638;color:#eef0fb;text-align:center}
.arq-tela h1{font-size:30px;margin:14px 0 8px}
.arq-tela p{max-width:440px;margin:0 auto 18px;color:#c9cdf0;font-size:16px}
.arq-tela .arq-zappy{width:46px;height:46px;margin:0 auto}
.arq-modal-salvamento{position:fixed;width:min(620px,calc(100vw - 24px));height:fit-content;max-width:none;max-height:calc(100dvh - 24px);margin:auto;border:1px solid #6675ae;border-radius:20px;box-sizing:border-box;overflow:auto;overscroll-behavior:contain}
.arq-modal-salvamento::backdrop{background:rgba(14,22,56,.75)}
.arq-sobre{position:absolute;inset:0;display:grid;place-items:center;background:rgba(14,22,56,.6);padding:20px;overflow:hidden}
.arq-menu{padding:22px;max-width:420px;width:100%;max-height:calc(100dvh - 40px);overflow:auto;overscroll-behavior:contain;display:grid;gap:10px;text-align:left}
.arq-menu-titulo{margin:6px 0 0;font-size:15px}
.arq-ferramentas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.arq-ferramenta{display:grid;justify-items:center;gap:2px;min-height:88px;padding:10px 6px;border:2px solid #e7e3d6;border-radius:14px;background:#fff;color:#1d2340;cursor:pointer;font:inherit;box-shadow:0 3px 0 #e7e3d6;transition:transform .12s,border-color .12s}
.arq-ferramenta:hover:not(:disabled){border-color:#ffc93c;transform:translateY(-1px)}
.arq-ferramenta:focus-visible{outline:3px solid #2f6df6;outline-offset:2px}
.arq-ferramenta:disabled{opacity:.55;cursor:default}
.arq-ferramenta-icone{font-size:26px;line-height:1.1}
.arq-ferramenta b{font-size:15px}
.arq-ferramenta small{font-size:12px;color:#5a6080;font-weight:600}
.arq-aviso{margin:0;padding:10px 12px;border-radius:12px;font-weight:700;font-size:14px}
.arq-aviso.ok{background:#e3f6ef;color:#0f5a46}
.arq-aviso.atencao{background:#fff3d1;color:#6b4a00}
.arq-menu-acoes{display:grid;gap:8px;margin-top:4px}
@media (prefers-reduced-motion:reduce){.arq-ferramenta,.arq-obra-escolha{transition:none}.arq-ferramenta:hover:not(:disabled),.arq-obra-escolha:hover{transform:none}}
.arq-menu h2{margin:0 0 4px;font-size:22px}
.arq-menu ul{margin:0;padding-left:18px;color:#4a5070}
.arq-toque{position:absolute;inset:auto 0 0 0;height:0}
.arq-conforto{display:grid;gap:8px;margin-top:6px}.arq-escolha{display:flex;flex-wrap:wrap;align-items:center;gap:6px;border:0;margin:0;padding:0;min-width:0}.arq-escolha legend{float:left;width:100%;margin-bottom:4px;font-size:13px;font-weight:800;color:#4a5070}.arq-escolha .arq-botao{min-height:44px;padding:8px 14px}.arq-escolha .arq-botao[aria-pressed=true]{background:#ffe7a3;outline:3px solid #ffc93c}.arq-marcar{display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px;font-weight:700;color:#1d2340}.arq-marcar input{width:22px;height:22px;accent-color:#2f6df6}
.arq-zona-joystick{position:absolute;left:0;bottom:0;width:50%;height:55%;touch-action:none}
.arq-joystick{position:absolute;left:82px;top:calc(100% - 170px);width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);pointer-events:none;opacity:.7}.arq-joystick[data-ativo]{opacity:1}
.arq-joystick i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px;border-radius:50%;background:rgba(255,255,255,.75)}
.arq-botoes-toque{position:absolute;right:22px;bottom:120px;display:flex;flex-direction:column;gap:12px}
.arq-botoes-toque button{width:74px;height:74px;border-radius:50%;font-size:14px}
.arq-quadro{max-width:560px;max-height:calc(100dvh - 40px);overflow:auto}.arq-quadro-sub{margin:0;color:#4a5070;font-weight:600}.arq-quadro-lista{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:8px}.arq-quadro-cartao{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;padding:10px 12px;border:2px solid #e7e3d6;border-radius:14px;background:#fff}.arq-quadro-cartao.feito{border-color:#9ad9c2;background:#f1fbf6}.arq-quadro-cartao.disponivel{border-color:#ffc93c}.arq-quadro-cartao.trancado,.arq-quadro-cartao.vazio{background:#f6f5f1;color:#5a6080}.arq-quadro-numero{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#e7e3d6;color:#1d2340;font-weight:900}.arq-quadro-cartao.feito .arq-quadro-numero{background:#2fb39a;color:#fff}.arq-quadro-cartao.disponivel .arq-quadro-numero{background:#ffc93c;color:#4a3200}.arq-quadro-corpo{display:grid;gap:2px;min-width:0}.arq-quadro-corpo b{font-size:15px;color:#1d2340}.arq-quadro-estado{font-size:13px;font-weight:700;color:#5a6080}.arq-quadro-premio{margin:2px 0 0;font-size:12px;color:#5a6080}.arq-quadro-erro{display:grid;gap:8px}.arq-quadro-hoje{margin-top:4px;border-color:#b9a6ff;background:#f6f3ff}.arq-quadro-hoje .arq-quadro-numero{background:#7b61ff;color:#fff}.arq-quadro-hoje.feito{border-color:#9ad9c2;background:#f1fbf6}.arq-quadro-hoje.feito .arq-quadro-numero{background:#2fb39a}.arq-quadro-hoje.nenhum{border-style:dashed;border-color:#e7e3d6;background:#f6f5f1}.arq-quadro-hoje.nenhum .arq-quadro-numero{background:#e7e3d6;color:#5a6080}.arq-quadro-hoje-selo{font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5b45d6}@media (max-width:480px){.arq-quadro-cartao{grid-template-columns:36px 1fr}.arq-quadro-cartao .arq-botao{grid-column:1/-1}}
.arq-hud:has(.arq-obra) .arq-dica{bottom:auto;top:118px}.arq-modos,.arq-obra fieldset{border:0;margin:0;min-width:0}.arq-modos{position:absolute;left:50%;top:14px;transform:translateX(-50%);display:flex;gap:6px;padding:4px;border-radius:16px;background:rgba(255,255,255,.85);box-shadow:0 4px 18px rgba(0,0,0,.16)}.arq-modos .arq-botao{min-height:40px;padding:8px 14px}.arq-modos .arq-botao[aria-pressed=true]{background:#ffc93c;color:#4a3200}.arq-obra{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);width:min(760px,calc(100% - 24px));box-sizing:border-box;display:grid;gap:8px;padding:12px;border-radius:18px;background:rgba(255,255,255,.94);box-shadow:0 6px 24px rgba(0,0,0,.2)}.arq-obra-dica{margin:0;font-size:14px;font-weight:700;color:#3a4060}.arq-obra-ferramentas{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:6px}.arq-obra-ferramentas .arq-ferramenta{padding:6px 2px;min-height:58px;min-width:0}.arq-obra-ferramentas .arq-ferramenta b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.arq-obra-ferramentas .arq-ferramenta[aria-pressed=true],.arq-obra-escolhas .arq-botao[aria-pressed=true]{background:#ffe7a3;outline:3px solid #ffc93c}.arq-obra-escolhas{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.arq-obra-escolhas .arq-botao{min-height:40px;padding:6px 12px}.arq-obra-escolhas.rolar{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:4px}.arq-obra-escolhas.rolar .arq-obra-escolha{flex:0 0 auto}.arq-obra-girar{margin-left:auto}.arq-obra-escolha{display:grid;justify-items:center;align-content:start;gap:2px;width:92px;padding:6px 4px 7px;border:2px solid #e7e3d6;border-radius:14px;background:#fff;color:#1d2340;cursor:pointer;font:inherit;box-shadow:0 3px 0 #e7e3d6;transition:transform .12s,border-color .12s}.arq-obra-escolha:hover{transform:translateY(-2px)}.arq-obra-escolha:focus-visible{outline:3px solid #2a7de1;outline-offset:2px}.arq-obra-escolha img{display:block;width:68px;height:68px;object-fit:contain;border-radius:10px;background:#f4f1ea;pointer-events:none;user-select:none}.arq-obra-escolha b{font-size:13px;line-height:1.2;text-align:center}.arq-obra-escolha small{font-size:11px;line-height:1.1;color:#5a6080;font-weight:700}.arq-obra-escolha[aria-pressed=true]{background:#ffe7a3;border-color:#ffc93c;box-shadow:0 3px 0 #e0a91c}.arq-obra-escolha[aria-pressed=true] img{background:#fff7dc}.arq-obra-acoes{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.arq-obra-acoes .arq-botao{min-height:40px;padding:6px 12px}@media (max-width:560px){.arq-obra-ferramentas{grid-template-columns:repeat(6,1fr)}.arq-obra-categorias{flex-wrap:nowrap;gap:6px}.arq-obra-categorias .arq-botao{padding:6px 9px;font-size:14px}.arq-obra-escolha{width:76px}.arq-obra-escolha img{width:54px;height:54px}.arq-obra-escolha b{font-size:12px}.arq-obra-ferramentas .arq-ferramenta b{font-size:11px}.arq-modos{top:106px;bottom:auto;left:14px;transform:none;padding:3px;gap:4px}.arq-modos .arq-botao{min-height:40px;padding:6px 10px;font-size:14px}.arq-hud:has(.arq-obra) .arq-dica{top:164px;max-width:calc(100% - 56px)}.arq-cronometro{top:162px}}
.arq-objeto{max-width:560px;box-sizing:border-box}.arq-objeto-selo{margin:0;justify-self:start;padding:4px 12px;border-radius:999px;background:#dff0ff;color:#1d5a9a;font-weight:800;font-size:13px}.arq-objeto-itens,.arq-menu .arq-objeto-itens{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}.arq-objeto-itens .arq-botao{min-height:40px;padding:6px 12px}.arq-objeto-aparencia{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.arq-galeria{cursor:default;align-content:start;text-align:center}.arq-galeria:hover:not(:disabled){transform:none;border-color:#e7e3d6}.arq-galeria img{display:block;width:56px;height:56px;object-fit:contain;border-radius:10px;background:#f4f1ea}.arq-galeria .arq-botao{min-height:40px;padding:6px 12px;margin-top:4px}.arq-galeria .arq-galeria-saldo{color:#1d2340}.arq-galeria-uso{margin-top:4px;padding:2px 10px;border-radius:999px;background:#dff5e3;color:#1f6b33!important}.arq-galeria-confirma{display:grid;gap:4px;margin:4px 0 0;padding:0;border:0;min-width:0}.arq-galeria-confirma legend{padding:0;font-size:13px;font-weight:800;color:#1d2340}.arq-galeria-acoes{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.arq-objeto-suas{display:grid;gap:6px}.arq-objeto-suas .arq-botao[aria-pressed=true]{background:#ffe7a3;outline:3px solid #ffc93c}.arq-objeto-geladeira{display:grid;gap:6px}.arq-receitas{display:grid;gap:6px}.arq-receitas .arq-objeto-itens{flex-direction:column;align-items:stretch}.arq-receitas li{display:grid;gap:2px}.arq-receitas .arq-botao{text-align:left}.arq-receitas-falta{font-size:13px;color:#8a5a00}.arq-turno{max-width:560px;box-sizing:border-box}.arq-turno-info{margin:0;font-size:14px;color:#5a6080}.arq-turno-pedido{display:grid;gap:2px;padding:10px 12px;border-radius:14px;background:#fff8e7;border:2px solid #efdcae}.arq-turno-pedido b{color:#a77d22;font-size:13px;letter-spacing:.04em;text-transform:uppercase}.arq-turno-pedido span{font-size:17px;font-weight:700;color:#2a2018}.arq-turno-resposta{margin:0;font-size:14px;font-weight:700;color:#3a4060}.arq-turno .arq-turno-produtos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.arq-turno-produtos .arq-botao{width:100%;text-align:left}.arq-turno-bandeja{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:14px;min-height:40px}.arq-turno .arq-turno-bandeja ul{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0}.arq-turno-tirar{border:2px solid #e0c48c;background:#fff;border-radius:999px;padding:4px 12px;min-height:40px;font:800 15px system-ui,sans-serif;cursor:pointer;color:#2a2018}.arq-turno-tirar small{font-size:12px;color:#8a5a00}.arq-turno-tirar:focus-visible{outline:3px solid #2f6df6;outline-offset:2px}.arq-turno-estrelas{margin:0;font-size:34px;line-height:1.1;color:#e8a317;letter-spacing:4px}.arq-turno .arq-turno-falas{margin:0;padding-left:18px;display:grid;gap:4px}
.arq-caderno{max-width:620px;box-sizing:border-box}.arq-caderno-secao{display:grid;gap:4px}.arq-caderno-explica{margin:0;font-size:13px;color:#5a6080}.arq-caderno .arq-quadro-lista{padding:0;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr))}.arq-caderno-carta{display:grid;grid-template-columns:36px 1fr;align-items:start;gap:10px;padding:10px 12px;border:2px solid #9ad9c2;border-radius:14px;background:#f1fbf6}.arq-caderno-carta.trancada{border-color:#e7e3d6;border-style:dashed;background:#f6f5f1}.arq-caderno-carta.trancada b{color:#5a6080}.arq-caderno-icone{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#fff;font-size:20px}.arq-caderno-efeito{font-size:13px;color:#3a4060}.arq-caderno-carta.pronta .arq-quadro-estado{color:#0f5a46}
.arq-diario-paginas{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(min(170px,100%),1fr))}.arq-diario-pagina{display:grid;gap:2px;padding:10px 12px;border:2px dashed #e7e3d6;border-radius:14px;background:#f6f5f1;font-size:13px;color:#5a6080}.arq-diario-pagina b{font-size:14px;color:#3a4060}.arq-diario-pagina.aberta{grid-column:1/-1;position:relative;border:1px solid #efdcae;border-radius:6px 18px 18px 18px;background:#fff8e7;color:#4a3a1c;padding:12px 16px 26px}.arq-diario-pagina.aberta b{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#a77d22}.arq-diario-pagina.aberta p{margin:0;font-size:16px;line-height:1.5}.arq-diario-assinatura{position:absolute;right:16px;bottom:6px;font-weight:800;font-size:18px;color:#c79a3a}.arq-diario .arq-diario-bichos{grid-template-columns:1fr}.arq-diario-bicho{display:grid;grid-template-columns:36px 1fr 56px;align-items:center;gap:10px;padding:10px 12px;border:2px solid #9ad9c2;border-radius:14px;background:#f1fbf6}.arq-diario-bicho.escondido{grid-template-columns:36px 1fr;border-color:#e7e3d6;border-style:dashed;background:#f6f5f1}.arq-diario-bicho svg{background:#f3e7cf;border-radius:12px}
.arq-album .arq-album-item{grid-template-columns:48px 1fr}.arq-album .arq-album-grade{grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))}.arq-album .arq-album-percurso{grid-template-columns:1fr}.arq-album-miniatura{display:block;width:48px;height:48px;object-fit:contain;border-radius:10px;background:#fff;user-select:none}.arq-album-miniatura.silhueta{background:transparent;filter:brightness(0);opacity:.28}.arq-album-lumi{justify-self:center;width:36px;height:36px;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 50% 64%,#fff6b0 0 15%,transparent 17%),var(--cor,#ccc);box-shadow:inset 0 -4px 0 rgba(0,0,0,.12),0 0 0 2px rgba(29,35,64,.14)}.arq-album-lumi.raro{box-shadow:inset 0 -4px 0 rgba(0,0,0,.12),0 0 0 2px rgba(29,35,64,.14),0 0 10px 3px var(--cor,#ccc)}.arq-album-lumi.silhueta{background:#1d2340;opacity:.2;box-shadow:none}
.arq-album-lumi.foto{background:none;box-shadow:none;border-radius:0;object-fit:contain;width:48px;height:48px}
.arq-album-lumi.foto.raro{box-shadow:none;filter:drop-shadow(0 0 5px var(--cor,#ccc))}
.arq-album-lumi.foto.silhueta{filter:brightness(0);opacity:.22}
.arq-rotina-lumis .arq-album-lumi.foto{width:32px;height:32px}.arq-album .arq-album-estrelas{list-style:none;margin:2px 0;padding:0;display:grid;gap:1px;font-size:13px;color:#5a6080}.arq-album-estrelas li.ganhou{color:#1d2340;font-weight:700}.arq-album-estrelas li.ganhou>span[aria-hidden]{color:#d99a00}.arq-album-completa{color:#1f8a6e}
.arq-resultado .arq-recordes{display:grid;gap:4px;text-align:left}.arq-resultado .arq-recordes h3{margin:0;text-align:center}.arq-resultado .arq-recordes ol{list-style:none;margin:0;padding:0;display:grid;gap:4px}.arq-recordes li{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:6px 10px;border-radius:10px;background:#f6f5f1;font-size:14px;color:#3a4060}.arq-recordes li.voce{background:#fff2c8}.arq-recordes li b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1d2340}.arq-recordes-estrelas{color:#d99a00;letter-spacing:1px}.arq-recordes-tempo{font-variant-numeric:tabular-nums;font-weight:700;color:#1d2340;text-align:right}.arq-recordes-recado{margin:0;font-size:13px;color:#5a6080}.arq-visitas{max-width:560px}.arq-caderno.arq-visitas .arq-quadro-lista{grid-template-columns:1fr}.arq-visita-faixa{position:absolute;left:50%;top:68px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;max-width:min(620px,calc(100% - 28px))}.arq-visita-faixa .arq-pilula{white-space:normal}.arq-visita-faixa .arq-botao{min-height:40px;padding:8px 14px;white-space:nowrap}@media (max-width:560px){.arq-visita-faixa{left:10px;right:10px;top:106px;transform:none;flex-wrap:wrap;max-width:none}.arq-visita-faixa .arq-pilula{font-size:13px}}
.arq-rotina{max-width:680px}.arq-rotina-lumis{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}.arq-rotina-lumis legend{padding:0;margin-bottom:4px}.arq-rotina-lumis .arq-botao{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:6px 12px}.arq-rotina-lumis .arq-botao[aria-pressed=true]{background:#ffe7a3;outline:3px solid #ffc93c}.arq-rotina-lumis .arq-album-lumi{width:24px;height:24px}.arq-rotina-lista{display:grid;gap:6px;padding:6px;border-radius:12px}.arq-rotina-lista.alvo{background:#fff7dc;outline:2px dashed #e0a91c}.arq-rotina .arq-rotina-lista ol{list-style:none;margin:0;padding:0;display:grid;gap:6px}.arq-rotina-cartao{display:grid;gap:6px;padding:8px 10px;border:2px solid #e7e3d6;border-radius:12px;background:#fff;min-width:0}.arq-rotina-cartao.quando{border-color:#b9a6ff;background:#f6f3ff}.arq-rotina-cartao.controle{border-color:#9ad9c2;background:#f1fbf6}.arq-rotina-linha{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}.arq-rotina-linha select{font:inherit;font-size:14px;min-height:36px;max-width:100%;border-radius:8px;border:2px solid #e7e3d6;background:#fff;color:#1d2340}.arq-rotina-botoes{margin-left:auto;display:flex;gap:4px}.arq-rotina-botoes button{min-width:36px;min-height:36px;border-radius:8px;border:2px solid #e7e3d6;background:#fff;color:#1d2340;font:inherit;cursor:pointer}.arq-rotina-botoes button:disabled{opacity:.4;cursor:default}.arq-rotina-aqui{justify-self:start;font:inherit;font-size:13px;font-weight:700;min-height:36px;padding:4px 10px;border-radius:999px;border:2px dashed #c9b27a;background:#fffaf0;color:#4a3200;cursor:pointer}.arq-rotina-aqui[aria-pressed=true]{border-style:solid;border-color:#e0a91c;background:#ffe7a3}.arq-rotina-vazia{margin:0;font-size:13px;color:#5a6080}.arq-rotina-paleta{display:flex;flex-wrap:wrap;gap:6px}.arq-rotina-carta{font:inherit;font-weight:700;min-height:44px;padding:6px 12px;border-radius:12px;border:2px solid #e7e3d6;background:#fff;color:#1d2340;cursor:pointer;box-shadow:0 3px 0 #e7e3d6}.arq-rotina-carta.quando{border-color:#b9a6ff}.arq-rotina-carta.controle{border-color:#9ad9c2}.arq-rotina-carta:focus-visible,.arq-rotina-aqui:focus-visible,.arq-rotina-botoes button:focus-visible,.arq-rotina-linha select:focus-visible{outline:3px solid #2a7de1;outline-offset:2px}.arq-rotina-ultima summary{cursor:pointer;font-weight:700}.arq-rotina .arq-rotina-ultima ol{margin:6px 0 0;padding-left:20px;font-size:13px}.arq-rotina .arq-rotina-acoes{display:flex;flex-wrap:wrap;gap:8px}.arq-rotina-andando{position:absolute;right:14px;top:64px;display:flex;gap:6px;align-items:center;max-width:calc(100% - 28px)}.arq-rotina-andando .arq-pilula{white-space:normal}.arq-rotina-andando .arq-botao{min-height:36px;padding:6px 12px;border-radius:999px}@media (max-width:560px){.arq-rotina-andando{top:154px;right:10px;max-width:calc(100% - 20px)}.arq-rotina-andando .arq-pilula{font-size:13px}}
.arq-foto{position:absolute;inset:0;pointer-events:none;animation:arq-entra .3s ease}.arq-foto.sem-entrada{animation:none}.arq-foto-topo{position:absolute;top:12px;left:12px;right:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;pointer-events:none}.arq-foto-topo>*,.arq-foto-tirar{pointer-events:auto}.arq-foto-titulo{display:grid;gap:2px;max-width:min(380px,calc(100% - 100px));box-sizing:border-box;padding:10px 14px;font-size:14px;color:#3a4060}.arq-foto-titulo b{color:#1d2340;font-size:15px}.arq-foto-titulo a{color:#2a5bd7;font-weight:800}.arq-foto-tirar{position:absolute;right:16px;bottom:16px;min-height:56px;padding:12px 22px;font-size:17px}@media (prefers-reduced-motion:reduce){.arq-foto{animation:none}}@media (max-width:560px){.arq-foto-topo{top:10px;left:10px;right:10px}.arq-foto-titulo{padding:8px 12px;font-size:13px}.arq-foto-tirar{right:12px;bottom:20px}}
.arq-capi{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:min(620px,calc(100% - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:16px 18px;display:grid;gap:10px;background:#fffaf0;border:3px solid #7a5232;border-radius:20px;box-shadow:0 6px 0 #5b3b22,0 10px 30px rgba(0,0,0,.25);animation:arq-entra .3s ease}.arq-capi-topo{display:flex;align-items:center;justify-content:space-between;gap:10px}.arq-capi h2{margin:0;padding:3px 14px;font-size:17px;border-radius:999px;background:#7a5232;color:#fff8e6}.arq-capi-coracoes{display:flex;gap:2px;font-size:20px;line-height:1}.arq-capi-coracoes span{background:linear-gradient(90deg,#e2475f var(--cheio),#e0d6c4 var(--cheio));-webkit-background-clip:text;background-clip:text;color:transparent}.arq-capi-fala{margin:0;font-size:17px;font-weight:600;color:#2a2018;min-height:2.8em}.arq-capi-pedido{display:grid;gap:2px;padding:10px 12px;border-radius:14px;background:#fff;border:2px dashed #e0c48c;font-size:14px}.arq-capi-pedido.feito{border-style:solid;border-color:#9ad9c2;background:#f1fbf6}.arq-capi-falta{color:#6b4a00;font-weight:700;font-size:13px}.arq-capi-itens{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}.arq-capi-itens .arq-botao{width:100%;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.arq-capi-qtd{color:#5a6080;font-size:12px}.arq-capi-adotar{display:grid;gap:10px}.arq-capi-escolha{border:0;margin:0;padding:0;min-width:0}.arq-capi-itens .arq-botao[aria-pressed=true]{background:#ffe7a3;outline:3px solid #ffc93c}.arq-capi-nome{display:grid;gap:4px;font-weight:800;font-size:14px;color:#2a2018}.arq-capi-nome input{font:600 16px system-ui,sans-serif;padding:10px 12px;border-radius:12px;border:2px solid #e0c48c;background:#fff;color:#1d2340;min-height:44px}.arq-capi-nome input:focus-visible{outline:3px solid #2f6df6;outline-offset:2px}.arq-capi .arq-menu-acoes{grid-auto-flow:column;grid-auto-columns:1fr}@media (max-width:480px){.arq-capi .arq-menu-acoes{grid-auto-flow:row}}@media (prefers-reduced-motion:reduce){.arq-capi{animation:none}}
.arq-bicho-fase{font-size:13px;font-weight:700;color:#6b5a48}.arq-bicho-medidas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0}.arq-bicho-medidas dt{font-size:12px;font-weight:800;color:#6b5a48}.arq-bicho-medidas dd{margin:3px 0 0}.arq-bicho-medidas .arq-barra{display:block}.arq-bicho .arq-menu-acoes.arq-bicho-acoes{grid-auto-flow:row;grid-template-columns:repeat(2,1fr)}.arq-bicho-rodape{display:flex;align-items:center;justify-content:space-between;gap:10px}@media (max-width:480px){.arq-bicho-medidas{grid-template-columns:1fr}.arq-bicho .arq-menu-acoes.arq-bicho-acoes{grid-template-columns:1fr}}
.arq-cronometro{position:absolute;left:50%;top:14px;transform:translateX(-50%);display:flex;gap:6px;align-items:center}
.arq-cronometro .arq-botao{min-height:36px;padding:6px 12px;border-radius:999px}
.arq-chegada{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;width:min(620px,calc(100% - 32px));box-sizing:border-box}.arq-chegada-legenda{flex:1;margin:0;padding:12px 16px;border-radius:16px;font-weight:800;font-size:17px;line-height:1.3}.arq-chegada-pular{min-height:44px;padding:8px 16px;border-radius:999px}
.arq-cronometro .arq-pilula{font-variant-numeric:tabular-nums}
.arq-resultado{padding:22px;max-width:380px;width:100%;display:grid;gap:12px;text-align:center}
.arq-resultado h2{margin:0;font-size:22px}
.arq-estrelas{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.arq-estrelas li{display:grid;justify-items:center;gap:4px;color:#9aa0b8}
.arq-estrelas li > span[aria-hidden]{font-size:40px;line-height:1}
.arq-estrelas li small{font-size:12px;font-weight:700}
.arq-estrelas li.ganhou{color:#1d2340}
.arq-estrelas li.ganhou > span[aria-hidden]{color:#ffb800;text-shadow:0 2px 0 #d99500;animation:arq-estrela .5s ease both}
@keyframes arq-estrela{0%{transform:scale(.2);opacity:0}70%{transform:scale(1.2);opacity:1}100%{transform:scale(1)}}
.arq-tempos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0}
.arq-tempos div{background:#f5f2e8;border-radius:12px;padding:8px 4px}
.arq-tempos dt{font-size:12px;color:#5a6080;font-weight:700}
.arq-tempos dd{margin:0;font-weight:800;font-size:16px;font-variant-numeric:tabular-nums;display:grid;justify-items:center}
.arq-recorde{font-size:11px;color:#0f5a46;background:#e3f6ef;border-radius:999px;padding:1px 8px;margin-top:2px}
.arq-corte{position:absolute;inset:0;background:#0e1638;pointer-events:none;opacity:0;animation:arq-corte linear both}
@keyframes arq-corte{0%{opacity:0}43%{opacity:1}57%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.arq-estrelas li.ganhou > span[aria-hidden]{animation:none}}
.arq-mapa{max-width:520px;box-sizing:border-box}.arq-mapa-papel{display:block;width:min(100%,260px);margin:4px auto}.arq-mapa-mar{fill:#bfe6f2}.arq-mapa-rota{fill:none;stroke:#7fb7cc;stroke-width:.6;stroke-dasharray:2 2}.arq-mapa-aqui{stroke:#1d2340;stroke-width:1}.arq-mapa-marca{fill:none;stroke:#e0584f;stroke-width:1.2}.arq-mapa-lista{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr));gap:6px}.arq-mapa-lista li{display:grid;grid-template-columns:16px 1fr;column-gap:8px;align-items:center;padding:6px 10px;border-radius:10px;background:#f6f5f1}.arq-mapa-lista small{grid-column:2;font-size:13px;color:#4a5070}.arq-mapa-cor{width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2)}
.arq-aquario ul{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}.arq-aquario li{display:flex;gap:8px;align-items:center;padding:6px 10px;border-radius:10px;background:#eef6fb;color:#3a4060;font-size:14px}.arq-aquario li.veio{background:#e3f6ef;color:#0f5a46;font-weight:700}
.arq-filhote-hoje{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}.arq-filhote-hoje li{display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:12px;background:#fff;border:2px dashed #e0c48c;font-size:14px;font-weight:700;color:#5a4630}.arq-filhote-hoje li.feito{border-style:solid;border-color:#9ad9c2;background:#f1fbf6;color:#0f5a46}@media (max-width:480px){.arq-filhote-hoje{grid-template-columns:1fr}}
.arq-museu ul{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}.arq-museu li{display:grid;gap:2px;padding:6px 10px;border-radius:10px;background:#f6f1e8;color:#3a4060;font-size:14px}.arq-museu li.veio{background:#fdf0d8;color:#5b3b22}.arq-museu li strong{display:flex;gap:8px;align-items:center}
@media (max-width:640px){.arq-necessidades{min-width:130px;padding:8px}.arq-nec{font-size:0}.arq-dica{bottom:236px;max-width:calc(100% - 152px)}.arq-cronometro{top:112px}.arq-acao{flex-wrap:wrap;justify-content:center;border-radius:18px}}
.arq-galeria-farol{max-width:560px;max-height:82dvh;overflow:auto;box-sizing:border-box}.arq-galeria-farol-exposta{display:grid;gap:6px;padding:10px 12px;border-radius:14px;background:#fff8e7;border:2px solid #efdcae}.arq-galeria-farol-exposta p{margin:0}.arq-galeria-farol .arq-galeria-farol-lista{list-style:none;margin:0;padding:0;display:grid;gap:6px}.arq-galeria-farol-lista li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;border-radius:12px;background:#f6f1e8;color:#3a4060}.arq-galeria-farol-lista li span{display:grid;gap:2px;min-width:0;overflow-wrap:anywhere}.arq-galeria-farol-lista small{font-size:13px;color:#8a5a00}.arq-galeria-farol-lista .arq-botao{min-height:40px;padding:6px 12px;flex-shrink:0}
.arq-farol-orientacao{display:contents}.arq-farol-voltar{position:absolute;top:74px;right:16px;pointer-events:auto}.arq-final-farol{max-height:65dvh;overflow:auto;box-sizing:border-box}
@media (max-width:640px){.arq-farol-orientacao{position:absolute;top:96px;left:10px;right:10px;display:flex;flex-direction:column;align-items:flex-end;gap:8px}.arq-farol-orientacao .arq-agora{position:static;max-width:100%;box-sizing:border-box}.arq-farol-orientacao .arq-agora h2{flex-shrink:0}.arq-farol-orientacao .arq-agora li{white-space:normal}.arq-farol-orientacao .arq-farol-voltar{position:static}}
.arq-raiz :is(h1,h2,h3,h4){font-family:var(--arq-titulo)}
@media (prefers-reduced-motion:no-preference){.arq-botao:active:not(:disabled){transform:translateY(2px);box-shadow:0 2px 0 #c98f00}.arq-botao.leve:active:not(:disabled){box-shadow:0 2px 0 rgba(20,26,58,.22)}}
.arq-vidro{background:rgba(20,26,58,.86);border:1px solid rgba(255,255,255,.14);box-shadow:0 10px 30px rgba(8,10,30,.35);color:#fff8e7;border-radius:18px;box-sizing:border-box}
.arq-icone{flex:none;display:block}
.arq-quem{position:absolute;left:16px;top:16px;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"retrato nec" "marco moedas";column-gap:14px;row-gap:8px;align-items:center;padding:10px 16px 10px 10px;min-width:236px}
.arq-quem-retrato{grid-area:retrato;justify-self:center;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#ffe7a3,#ffc93c 55%,#e0a91c);box-shadow:0 0 0 3px rgba(255,201,60,.32),0 0 20px rgba(255,201,60,.35);color:#4a3200;font:800 27px/1 var(--arq-titulo)}
.arq-quem-retrato{overflow:hidden}
.arq-quem-retrato img{width:100%;height:100%;object-fit:cover;display:block}
.arq-quem-marco{grid-area:marco;justify-self:start;white-space:nowrap;max-width:170px;overflow:hidden;text-overflow:ellipsis;padding:2px 8px;border-radius:999px;background:#5fd3c4;color:#0d2a2a;font:800 11px/1.35 var(--arq-titulo)}
.arq-quem .arq-necessidades{grid-area:nec;position:static;display:grid;gap:6px;min-width:0;padding:0;background:none;box-shadow:none}
.arq-nec{display:grid;grid-template-columns:16px minmax(0,1fr);align-items:center;gap:8px}
.arq-nec.fome{color:#ff8a65}.arq-nec.energia{color:#ffd54f}.arq-nec.diversao{color:#c79bff}
.arq-quem .arq-barra{height:8px;border-radius:8px;background:rgba(255,255,255,.14)}
.arq-quem .arq-barra i{background:currentColor}
.arq-nec.baixa .arq-barra{box-shadow:0 0 0 1px currentColor}
@media (prefers-reduced-motion:no-preference){.arq-nec.baixa .arq-icone{animation:arq-nec-pulsa 1.2s ease-in-out infinite}}
@keyframes arq-nec-pulsa{50%{transform:scale(1.25)}}
.arq-moedas{grid-area:moedas;justify-self:start;display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 6px;border-radius:999px;background:rgba(255,201,60,.16);color:#ffc93c;font:800 15px/1.2 var(--arq-titulo)}
.arq-moedas b{color:#fff8e7;font-variant-numeric:tabular-nums}
.arq-ilha-agora{position:absolute;left:50%;top:16px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 20px 10px;text-align:center;max-width:calc(100% - 640px);min-width:180px}
.arq-ilha-agora b{font:800 18px/1.15 var(--arq-titulo);white-space:nowrap}
.arq-ilha-quadro{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#c9d1e6;white-space:nowrap}
.arq-ilha-pontos{display:flex;gap:4px}
.arq-ilha-pontos i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.22)}
.arq-ilha-pontos i.aceso{background:#ffc93c;box-shadow:0 0 8px #ffc93c}
.arq-topo-dir{top:16px;right:16px;align-items:stretch}
.arq-relogio{display:flex;align-items:center;gap:10px;padding:7px 14px 7px 12px}
.arq-relogio .arq-icone{color:#ffc93c}
.arq-relogio span{display:grid;line-height:1.15}
.arq-relogio b{font:800 20px/1 var(--arq-titulo);font-variant-numeric:tabular-nums}
.arq-relogio small{font-size:12px;font-weight:700;color:#c9d1e6;white-space:nowrap}
.arq-tempo-livre{display:inline-flex;align-items:center;gap:6px;padding:0 12px;font-weight:800;font-size:13px;white-space:nowrap}
.arq-tempo-livre .arq-icone{color:#5fd3c4}
.arq-botao-icone{display:grid;place-items:center;width:50px;min-height:50px;padding:0;border-radius:16px;cursor:pointer;color:#fff8e7;font:inherit}
.arq-botao-icone:hover:not(:disabled){border-color:#ffc93c;color:#ffc93c}
.arq-botao-icone:disabled{opacity:.5;cursor:default}
.arq-botao-icone:focus-visible{outline:3px solid #5fd3c4;outline-offset:2px}
@media (min-width:641px){.arq-rotina-andando{top:78px}}
.arq-agora{position:absolute;left:16px;top:136px;width:252px;padding:10px 14px 12px}
.arq-agora h2{margin:0 0 7px;font:800 12px/1 var(--arq-titulo);letter-spacing:.08em;text-transform:uppercase;color:#ffc93c}
.arq-agora ul{list-style:none;margin:0;padding:0;display:grid;gap:7px;min-width:0}
.arq-agora li{display:flex;gap:9px;align-items:flex-start;font-size:14px;font-weight:700;line-height:1.3;min-width:0}
.arq-agora-marca{flex:none;width:11px;height:11px;margin-top:3px;border-radius:50%;border:2px solid #5fd3c4}
.arq-dica{background:rgba(20,26,58,.92);border:1px solid rgba(255,201,60,.35);border-radius:18px;padding:12px 16px 12px 12px;box-shadow:0 10px 30px rgba(8,10,30,.35);align-items:center}
.arq-dica-texto{display:grid;gap:3px}
.arq-dica-quem{font:800 12px/1 var(--arq-titulo);letter-spacing:.08em;text-transform:uppercase;color:#ffc93c}
.arq-dica .arq-zappy{width:32px;height:32px}
.arq-baixo{bottom:16px}
.arq-acao{background:rgba(20,26,58,.92);border:1px solid rgba(255,255,255,.14);box-shadow:0 10px 30px rgba(8,10,30,.35);padding:7px 16px 7px 8px;font-size:15px}
.arq-tecla{min-width:28px;height:28px;border-radius:8px;box-shadow:0 2px 0 #c98f00;font:800 14px/1 var(--arq-titulo)}
.arq-inventario.arq-vidro{gap:6px;padding:6px;border-radius:18px}
.arq-item{width:50px;height:50px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);font:inherit;font-size:22px}
button.arq-item{cursor:pointer}
button.arq-item:hover{border-color:#ffc93c}
button.arq-item:focus-visible{outline:3px solid #5fd3c4;outline-offset:2px}
.arq-item.comida{border-color:rgba(255,201,60,.7)}
.arq-inventario .arq-item[aria-pressed=true]{background:rgba(255,201,60,.28);border-color:#ffc93c}
.arq-item b{font-size:11px;color:#fff8e7}
.arq-item-tecla{position:absolute;left:5px;top:3px;font:800 10px/1 var(--arq-titulo);color:#c9d1e6}
.arq-cantinho{position:absolute;right:16px;bottom:16px;display:flex;align-items:center;gap:8px}
.arq-cantinho .arq-modos{position:static;transform:none;left:auto;top:auto;padding:4px;gap:4px;border-radius:16px;background:rgba(20,26,58,.86);border:1px solid rgba(255,255,255,.14);box-shadow:0 10px 30px rgba(8,10,30,.35)}
.arq-cantinho .arq-modos .arq-botao{display:inline-flex;align-items:center;gap:6px;min-height:42px;padding:6px 14px;background:transparent;color:#fff8e7;box-shadow:none}
.arq-cantinho .arq-modos .arq-botao[aria-pressed=true]{background:#ffc93c;color:#4a3200;box-shadow:0 3px 0 #c98f00}
.arq-hud:has(.arq-obra) .arq-cantinho{bottom:auto;top:78px}
.arq-cronometro.arq-vidro{top:16px;gap:16px;padding:6px 6px 6px 16px;border-radius:18px}
.arq-cronometro-tempo{display:grid;line-height:1.05}
.arq-cronometro small{font-size:11px;font-weight:800;color:#c9d1e6;letter-spacing:.04em;white-space:nowrap}
.arq-cronometro-tempo>span{font:800 26px/1 var(--arq-titulo);font-variant-numeric:tabular-nums}
.arq-cronometro-pegas{display:grid;gap:4px;justify-items:start}
.arq-cronometro-pontos{display:flex;gap:5px}
.arq-cronometro-pontos i{width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,.35);box-sizing:border-box}
.arq-cronometro-pontos i.pego{background:#ffc93c;border-color:#ffc93c;box-shadow:0 0 8px #ffc93c}
.arq-altura{position:absolute;right:16px;top:50%;transform:translateY(-50%);display:grid;justify-items:center;gap:8px;padding:10px 8px}
.arq-altura small{font-size:11px;font-weight:800;color:#c9d1e6}
.arq-altura-trilho{position:relative;width:12px;height:160px;border-radius:12px;background:rgba(255,255,255,.14);overflow:hidden}
.arq-altura-trilho i{position:absolute;left:0;right:0;bottom:0;height:0;border-radius:12px;background:linear-gradient(#5fd3c4,#ffc93c)}
.arq-altura-fogo{color:rgba(255,255,255,.35)}
.arq-altura-fogo[data-aceso]{color:#ff8a65;filter:drop-shadow(0 0 6px #ff8a65)}
.arq-hud.em-atividade :is(.arq-agora,.arq-ilha-agora,.arq-cantinho,.arq-inventario,.arq-moedas,.arq-quem-marco,.arq-tempo-livre){display:none}
.arq-hud.em-atividade .arq-quem{min-width:0;grid-template-areas:"retrato nec";padding:8px 14px 8px 8px}
.arq-hud.em-atividade .arq-quem-retrato{width:40px;height:40px;font-size:19px}
.arq-hud.em-atividade .arq-necessidades{width:110px}
.arq-hud.entrando>*{animation:arq-hud-entra 1.2s ease both}
@keyframes arq-hud-entra{from{opacity:0}}
.arq-botoes-toque .arq-toque-usar{font-size:16px}
.arq-toque-usar[data-pronto]{box-shadow:0 0 0 5px rgba(255,201,60,.4),0 4px 0 #c98f00}
@media (min-width:641px){.arq-dica{left:16px;bottom:24px;max-width:min(360px,calc(50% - 170px))}.arq-hud.toque .arq-dica{bottom:auto;top:260px}}
@media (max-width:1100px) and (min-width:641px){.arq-ilha-agora{top:86px;max-width:none}.arq-hud.em-atividade .arq-cronometro{top:86px}}
@media (max-width:640px){
.arq-quem{left:10px;top:10px;min-width:0;grid-template-areas:"retrato nec" "retrato moedas";padding:6px 10px 6px 6px;column-gap:8px;row-gap:3px}
.arq-quem-retrato{width:40px;height:40px;font-size:19px}
.arq-quem-marco{display:none}
.arq-quem .arq-necessidades{width:92px;gap:3px}
.arq-nec{grid-template-columns:12px minmax(0,1fr);gap:5px}
.arq-nec .arq-icone{width:12px;height:12px}
.arq-quem .arq-barra{height:6px}
.arq-moedas{font-size:13px;padding:0 8px 0 4px}
.arq-moedas .arq-icone{width:14px;height:14px}
.arq-ilha-agora{display:none}
.arq-topo-dir{right:10px;top:10px;gap:6px;max-width:calc(100% - 190px);align-items:center}
.arq-topo-dir .arq-tempo-livre{order:3}
.arq-relogio{padding:5px 10px 5px 8px;gap:6px}
.arq-relogio b{font-size:17px}
.arq-relogio small{font-size:11px}
.arq-tempo-livre{min-height:30px;padding:0 10px;font-size:12px}
.arq-botao-icone{width:46px;min-height:46px;border-radius:14px}
.arq-agora{left:10px;top:96px;width:auto;max-width:calc(100% - 20px);display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px}
.arq-agora h2{margin:0}
.arq-agora li{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.arq-agora-marca{display:inline-block;vertical-align:-1px;margin:0 6px 0 0}
.arq-agora li:not(:first-child){display:none}
.arq-cantinho{left:10px;right:auto;bottom:auto;top:134px}
.arq-hud:has(.arq-obra) .arq-cantinho{top:134px}
.arq-hud:has(.arq-obra) .arq-dica{top:186px}
.arq-rotina-andando{top:186px}
.arq-cantinho .arq-modos .arq-botao{min-height:40px;padding:6px 10px;font-size:14px}
.arq-cantinho .arq-botao-icone{width:44px;min-height:44px}
.arq-cronometro.arq-vidro{top:74px;gap:10px;padding:5px 5px 5px 12px}
.arq-cronometro-tempo>span{font-size:21px}
.arq-hud.em-atividade .arq-quem{padding:6px 10px 6px 6px}
.arq-hud.em-atividade .arq-necessidades{width:80px}
}
.arq-pausa-fundo{background:rgba(8,10,30,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.arq-pausa{display:grid;grid-template-columns:232px minmax(0,1fr) 250px;grid-template-rows:minmax(0,1fr);width:min(1080px,100%);height:min(660px,calc(100dvh - 40px));border-radius:24px;overflow:hidden;background:rgba(20,26,58,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 60px rgba(5,6,20,.5);color:#fff8e7;text-align:left;box-sizing:border-box}
.arq-pausa-nav{display:flex;flex-direction:column;gap:4px;padding:20px 12px;background:rgba(255,255,255,.04);border-right:1px solid rgba(255,255,255,.08);overflow:auto;min-height:0}
.arq-pausa-titulo{margin:0 10px 14px;font:800 20px/1.15 var(--arq-titulo);color:#ffc93c}
.arq-pausa-lugar{display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 12px;border:0;border-radius:12px;background:transparent;color:#fff8e7;font-family:inherit;font-size:15px;font-weight:700;line-height:1.2;cursor:pointer;text-align:left}
.arq-pausa-lugar .arq-icone{color:#c9d1e6}
.arq-pausa-lugar:hover:not(:disabled):not([aria-current]){background:rgba(255,255,255,.08)}
.arq-pausa-lugar[aria-current=page]{background:#ffc93c;color:#4a3200}
.arq-pausa-lugar[aria-current=page] .arq-icone{color:#4a3200}
.arq-pausa-lugar:disabled{opacity:.45;cursor:default}
.arq-pausa-lugar:focus-visible{outline:3px solid #5fd3c4;outline-offset:2px}
.arq-pausa-sair{margin-top:auto;color:#c9d1e6}
.arq-pausa-corpo{padding:24px;overflow:auto;overscroll-behavior:contain;min-height:0}
.arq-pausa-secao{display:grid;gap:14px}
.arq-pausa-secao h3{margin:0}
.arq-pausa-heroi{padding:18px 20px;border-radius:18px;background:linear-gradient(135deg,#2c3c80,#1c2350);border:1px solid rgba(255,255,255,.12)}
.arq-pausa-heroi small{color:#c9d1e6;font-weight:700;font-size:13px}
.arq-pausa-heroi h3{margin:2px 0 14px;font:800 28px/1.1 var(--arq-titulo)}
.arq-pausa-acoes{display:flex;gap:10px;flex-wrap:wrap}
.arq-pausa-acoes .arq-botao{display:inline-flex;align-items:center;gap:8px}
.arq-pausa-cartoes{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.arq-pausa-cartao{display:grid;gap:8px;align-content:start;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff8e7;font:inherit;text-align:left;cursor:pointer}
.arq-pausa-cartao:hover:not(:disabled){border-color:#ffc93c}
.arq-pausa-cartao:focus-visible{outline:3px solid #5fd3c4;outline-offset:2px}
.arq-pausa-cartao:disabled{opacity:.5;cursor:default}
.arq-pausa-diario{background:#fff8e7;color:#3a2a1a;border-color:#efdcae}
.arq-pausa-rotulo{display:flex;gap:8px;align-items:center;font:800 12px/1 var(--arq-titulo);letter-spacing:.06em;text-transform:uppercase;color:#ffc93c}
.arq-pausa-diario .arq-pausa-rotulo{color:#a77d22}
.arq-pausa-cartao b{font:800 20px/1.15 var(--arq-titulo)}
.arq-pausa-barra{height:8px;border-radius:8px;background:rgba(58,42,26,.15);overflow:hidden}
.arq-pausa-barra i{display:block;height:100%;border-radius:8px;background:#ffc93c}
.arq-pausa-cartao dl{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin:0}
.arq-pausa-cartao dl div{display:flex;justify-content:space-between;gap:6px;font-size:14px}
.arq-pausa-cartao dt{color:#c9d1e6}
.arq-pausa-cartao dd{margin:0;font-weight:800;white-space:nowrap}
.arq-pausa .arq-menu-titulo{margin:4px 0 0;font:800 13px/1.2 var(--arq-titulo);letter-spacing:.06em;text-transform:uppercase;color:#c9d1e6}
.arq-pausa .arq-ferramenta{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);box-shadow:0 3px 0 rgba(0,0,0,.25);color:#fff8e7}
.arq-pausa .arq-ferramenta:hover:not(:disabled){border-color:#ffc93c}
.arq-pausa .arq-ferramenta small{color:#c9d1e6}
.arq-pausa .arq-ferramenta-icone{color:#ffc93c}
.arq-pausa :is(.arq-escolha legend,.arq-marcar){color:#c9d1e6}
.arq-pausa .arq-conforto{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
.arq-pausa-controles{margin:0;padding-left:18px;display:grid;gap:4px;color:#c9d1e6;font-size:14px}
.arq-pausa .arq-menu-acoes{display:flex;gap:10px}
.arq-pausa-mapa{display:grid;align-content:start;gap:8px;padding:24px 18px;border-left:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)}
.arq-mapa-pequeno{display:grid;gap:8px;justify-items:center;text-align:center}
.arq-mapa-pequeno .arq-mapa-papel{width:100%;max-width:210px}
.arq-mapa-pequeno small{color:#c9d1e6;font-weight:700}
@media (max-width:900px){.arq-pausa{grid-template-columns:200px minmax(0,1fr)}.arq-pausa-mapa{display:none}}
@media (max-width:640px){.arq-pausa{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);height:calc(100dvh - 40px)}.arq-pausa-nav{flex-direction:row;overflow-x:auto;padding:8px;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.arq-pausa-titulo{display:none}.arq-pausa-lugar{flex:none;white-space:nowrap}.arq-pausa-sair{margin-top:0}.arq-pausa-corpo{padding:14px}.arq-pausa-cartoes{grid-template-columns:minmax(0,1fr)}.arq-pausa-heroi h3{font-size:22px}}
.arq-diario-abertura{justify-self:start}
.arq-abertura{position:absolute;inset:0;z-index:5;overflow:hidden;background:#0b0e22;color:#fff;pointer-events:auto;animation:arq-ab-cena .6s ease both}
.arq-abertura-palco{position:absolute;inset:0;width:100%;height:100%;display:block;padding:0;border:0;background:transparent;cursor:pointer}
.arq-abertura-palco:focus-visible{outline:3px solid #ffc93c;outline-offset:-6px}
.arq-abertura-pintura{position:absolute;inset:0;width:100%;height:100%;transform-origin:58% 50%;animation:arq-ab-cena .7s ease both,arq-ab-zoom var(--arq-ab-duracao) linear both}
.arq-ab-fundo{animation:arq-ab-fundo var(--arq-ab-duracao) linear both}
.arq-ab-frente{animation:arq-ab-frente var(--arq-ab-duracao) linear both}
.arq-ab-pulsa{animation:arq-ab-pulsa 2.4s ease-in-out infinite}
.arq-ab-cai{animation:arq-ab-cai 10s ease-in both}
.arq-ab-cai.devagar{animation-duration:14s}
.arq-ab-nevoa{animation:arq-ab-nevoa 8s ease-out both}
.arq-ab-raio{animation:arq-ab-raio 8s linear both}
.arq-ab-chuva{animation:arq-ab-chuva .6s linear infinite}
.arq-ab-balanca{transform-origin:480px 380px;animation:arq-ab-balanca 3s ease-in-out infinite}
.arq-ab-sobe{animation:arq-ab-sobe 1.6s ease-out both}
.arq-ab-vagalume{animation:arq-ab-voa 3.2s ease-in-out infinite}
.arq-ab-pisca{animation:arq-ab-pisca 1.6s ease-in-out infinite}
.arq-ab-letra{font-family:"Caveat","Segoe Print","Bradley Hand","Comic Sans MS",cursive;font-weight:700}
.arq-ab-carta{fill:#fff8e7;stroke:rgba(30,24,16,.6);stroke-width:7px;paint-order:stroke;stroke-linejoin:round}
@keyframes arq-ab-cena{from{opacity:0}}
@keyframes arq-ab-zoom{from{transform:scale(1)}to{transform:scale(1.06)}}
@keyframes arq-ab-fundo{from{transform:translateX(-14px)}to{transform:translateX(14px)}}
@keyframes arq-ab-frente{from{transform:translateX(22px)}to{transform:translateX(-22px)}}
@keyframes arq-ab-pulsa{50%{opacity:.7}}
@keyframes arq-ab-cai{from{transform:translateY(-40px)}to{transform:translateY(36px)}}
@keyframes arq-ab-nevoa{from{transform:translateX(420px)}to{transform:translateX(0)}}
@keyframes arq-ab-raio{0%,18%{opacity:0}20%{opacity:1}25%{opacity:0}28%{opacity:1}34%,100%{opacity:0}}
@keyframes arq-ab-chuva{from{transform:translateY(-20px)}to{transform:translateY(20px)}}
@keyframes arq-ab-balanca{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes arq-ab-sobe{from{opacity:0;transform:translateY(70px)}}
@keyframes arq-ab-voa{50%{transform:translateY(-8px)}}
@keyframes arq-ab-pisca{50%{opacity:.5}}
.arq-abertura-faixa{position:absolute;left:0;right:0;height:max(28px,8%);background:#000;pointer-events:none}
.arq-abertura-faixa.cima{top:0}.arq-abertura-faixa.baixo{bottom:0}
.arq-abertura-legenda{position:absolute;left:50%;bottom:calc(max(16px,3%) + 112px);transform:translateX(-50%);width:min(880px,calc(100% - 32px));display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;pointer-events:none}
.arq-abertura-legenda p{margin:0;padding:8px 16px;border-radius:14px;background:rgba(5,6,20,.74);font-size:clamp(17px,2.3vw,26px);font-weight:800;line-height:1.35;text-shadow:0 2px 6px rgba(0,0,0,.6);animation:arq-ab-cena .5s ease both}
.arq-abertura-quem{padding:3px 12px;border-radius:999px;background:#ffc93c;color:#2a1b00;font:800 14px/1.35 var(--arq-titulo)}
.arq-abertura-controles{position:absolute;bottom:max(16px,3%);left:50%;transform:translateX(-50%);width:min(420px,calc(100% - 32px));min-width:0;margin:0;padding:0;border:0;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px 12px;text-align:center}
.arq-abertura-controles .arq-botao{min-height:44px;justify-content:center;padding:8px 12px}
.arq-abertura-controles span{font-weight:800;font-size:14px;text-shadow:0 1px 4px #000}
.arq-abertura-auto{grid-column:1/-1;justify-self:center}
.arq-abertura-progresso{position:absolute;left:50%;top:calc(max(28px,8%) + 16px);transform:translateX(-50%);display:flex;gap:6px;pointer-events:none}
.arq-abertura-progresso i{width:22px;height:4px;border-radius:4px;background:rgba(255,255,255,.3)}
.arq-abertura-progresso i.vista{background:rgba(255,255,255,.8)}
.arq-abertura-progresso i.agora{background:#ffc93c}
.arq-abertura-pular{position:absolute;right:20px;top:calc(max(28px,8%) + 8px);display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:6px 14px 6px 8px;border:1px solid rgba(255,255,255,.25);border-radius:999px;background:rgba(5,6,20,.6);color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
.arq-abertura-pular:focus-visible{outline:3px solid #ffc93c;outline-offset:2px}
.arq-abertura-anel{position:relative;width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.7);box-sizing:border-box}
.arq-abertura-anel::after{content:"";position:absolute;inset:2px;border-radius:50%;background:#ffc93c;transform:scale(0)}
.arq-abertura-pular.segurando .arq-abertura-anel::after{animation:arq-ab-segura var(--arq-ab-segurar) linear forwards}
@keyframes arq-ab-segura{to{transform:scale(1)}}
.arq-abertura.saindo{animation:arq-ab-sai var(--arq-ab-saida) ease-in forwards;pointer-events:none}
.arq-abertura.saindo .arq-abertura-pintura{animation:arq-ab-mergulha var(--arq-ab-saida) ease-in forwards}
.arq-abertura.saindo :is(.arq-abertura-legenda,.arq-abertura-progresso,.arq-abertura-pular,.arq-abertura-controles){opacity:0;transition:opacity .3s}
@keyframes arq-ab-sai{60%{opacity:1}to{opacity:0}}
@keyframes arq-ab-mergulha{from{transform:scale(1.06)}to{transform:scale(2.2)}}
.arq-abertura.parada :is(.arq-ab-fundo,.arq-ab-frente,.arq-ab-pulsa,.arq-ab-cai,.arq-ab-nevoa,.arq-ab-raio,.arq-ab-chuva,.arq-ab-balanca,.arq-ab-sobe,.arq-ab-vagalume,.arq-ab-pisca){animation:none}
.arq-abertura.parada .arq-abertura-pintura,.arq-abertura.parada.saindo .arq-abertura-pintura{animation:arq-ab-cena .7s ease both}
.arq-abertura.parada .arq-ab-raio{opacity:.6}
@media (max-width:640px){.arq-abertura-pular{right:10px;font-size:13px}.arq-abertura-progresso{top:calc(max(28px,8%) + 62px)}}

/* Convites usam toda a largura do cartão, inclusive no celular. */
.arq-convidados{box-sizing:border-box;max-width:560px;width:100%}
.arq-convidados .arq-quadro-lista{grid-template-columns:1fr}
.arq-convidados .arq-quadro-cartao{grid-template-columns:minmax(0,1fr);align-items:start}
.arq-convidados .arq-quadro-cartao h3{margin:0 0 6px;font-size:16px}
.arq-convidados .arq-quadro-cartao p{margin:0;font-size:14px;line-height:1.5}
.arq-convidados .arq-quadro-cartao .arq-botao{justify-self:stretch}

.arq-tema-semana{padding:14px;border:1px solid #d9cfe8;border-radius:12px;background:#f7f3fc;gap:8px}
.arq-tema-semana p{margin:0;font-size:14px;line-height:1.5}
.arq-tema-semana label{font-size:13px;font-weight:700}
.arq-tema-semana select{box-sizing:border-box;width:100%;min-width:0;max-width:100%;min-height:44px;border:1px solid #8b80a0;border-radius:8px;background:#fff;color:#1d2340;padding:8px;font:inherit}
.arq-tema-semana select:focus-visible{outline:3px solid var(--arq-acento,#ffc93c);outline-offset:2px}

.arq-feira{box-sizing:border-box;max-width:680px;width:100%}
.arq-feira-itens{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:12px;margin-top:8px}
.arq-feira-item{min-width:0;border:1px solid #ddd7e6;border-radius:12px;padding:12px;background:#fff}
.arq-feira-item h4{margin:0 0 8px;font-size:16px}
.arq-feira-item>img{width:100%;height:100px;object-fit:contain}
.arq-feira-item p{font-size:14px;line-height:1.5}
.arq-feira summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:700}
.arq-feira summary:focus-visible{outline:3px solid var(--arq-acento,#ffc93c);outline-offset:2px}
.arq-insumos-campos{display:grid;grid-template-columns:minmax(0,2fr) minmax(90px,1fr);gap:12px}.arq-insumos-campos label{display:grid;gap:6px;font-weight:700;min-width:0}.arq-insumos-campos select{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:8px;border:2px solid #e0c48c;border-radius:12px;background:#fff;color:#1d2340;font:inherit}.arq-insumos-campos select:focus-visible{outline:3px solid var(--arq-acento,#ffc93c);outline-offset:2px}
/* Primeiros passos com o Zappy e dicas de primeira vez (30/10/2026). O cartão fica no lugar da
   fala do Zappy (em cima dos painéis: a dica do Quadro aparece com ele aberto) e o anel acende na
   parte da HUD que a fala mostra ("data-anel" na raiz da HUD). */
.arq-guia{position:absolute;left:14px;bottom:90px;z-index:4;box-sizing:border-box;width:min(448px,calc(100% - 28px));display:grid;gap:10px;padding:14px 14px 12px;border-radius:20px;background:rgba(20,26,58,.96);border:1.5px solid rgba(255,201,60,.55);box-shadow:0 14px 36px rgba(8,10,30,.5),0 0 0 4px rgba(255,201,60,.1);color:#fff8e7;text-align:left;pointer-events:auto;animation:arq-entra .35s ease}
.arq-guia.dica{border-color:rgba(127,214,198,.75);box-shadow:0 14px 36px rgba(8,10,30,.5),0 0 0 4px rgba(127,214,198,.14)}
.arq-guia.no-menu{position:static;width:auto;max-width:560px;animation:none}
.arq-guia-topo{display:flex;gap:12px;align-items:flex-start}
.arq-guia-rosto{--d:56px;position:relative;flex:none;display:block;width:var(--d);height:var(--d);box-sizing:border-box;border-radius:50%;overflow:hidden;border:2px solid #ffc93c;box-shadow:0 0 18px rgba(255,216,79,.55);background:#3b2f3a}
.arq-guia-rosto img{position:absolute;width:calc(var(--d) * 7.111);max-width:none;left:calc(var(--d) * -3.056);top:calc(var(--d) * -1.456);pointer-events:none;user-select:none}
.arq-guia-rosto.mini{--d:24px;border-width:1.5px;box-shadow:none}
.arq-guia-rosto.grande{--d:64px}
.arq-guia-meio{flex:1;min-width:0}
.arq-guia-quem{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.arq-guia-quem b{font:800 13px/1 var(--arq-titulo);letter-spacing:.1em;text-transform:uppercase;color:#ffc93c}
.arq-guia-capitulos{display:flex;gap:4px;align-items:center}
.arq-guia-capitulos i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.22)}
.arq-guia-capitulos i.feito{background:#5fd39a}
.arq-guia-capitulos i.agora{width:18px;border-radius:4px;background:#ffc93c}
.arq-guia-capitulos.largos i{width:22px;height:7px;border-radius:4px}
.arq-guia-selo{padding:3px 8px;border-radius:999px;background:#7fd6c6;color:#0d3a33;font:800 11px/1.2 var(--arq-titulo);letter-spacing:.04em;text-transform:uppercase}
.arq-guia-fala{margin:6px 0 0;font-size:18px;line-height:1.35;font-weight:800}
.arq-guia-x{flex:none;display:grid;place-items:center;width:44px;height:44px;margin:-6px -6px 0 0;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#fff8e7;cursor:pointer}
.arq-guia-x:hover{background:rgba(255,255,255,.2)}
.arq-guia-x:focus-visible,.arq-guia-link:focus-visible,.arq-agora-passos button:focus-visible{outline:3px solid #5fd3c4;outline-offset:2px}
.arq-guia-tarefa{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.06)}
.arq-guia-tarefa kbd{display:inline-grid;place-items:center;min-width:30px;height:30px;padding:0 8px;box-sizing:border-box;border-radius:8px;background:#fff8e7;color:#1d2340;font:800 14px/1 var(--arq-titulo);box-shadow:0 3px 0 #aeb5d6}
.arq-guia-extra{font-size:14px;font-weight:700;color:#c9d1e6}
.arq-guia-tarefa b{margin-left:auto;font-size:13px;font-weight:800;color:#ffd866}
.arq-guia-isso{margin:0;display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:12px;background:rgba(95,211,154,.16);color:#9ff0c6;font-size:15px;font-weight:800}
.arq-guia-isso::before{content:"✓";font-size:18px;color:#5fd39a}
.arq-guia-isso.lembrete{background:rgba(127,214,198,.14);color:#c7f2ea}
.arq-guia-botoes{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.arq-guia-botoes .arq-botao{min-height:44px}
.arq-guia-rodape{display:flex;align-items:center;justify-content:space-between;gap:10px}
.arq-guia-rodape small{font-size:12px;font-weight:700;color:#8f98c6}
.arq-guia-link{min-height:32px;padding:4px 2px;border:0;background:none;color:#c9d1e6;font-family:inherit;font-size:14px;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.arq-guia-conta{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:#b9c0e0}
.arq-guia-pontos{display:flex;gap:4px}
.arq-guia-pontos i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.25)}
.arq-guia-pontos i.vista{background:rgba(127,214,198,.55)}
.arq-guia-pontos i.agora{width:16px;border-radius:3px;background:#7fd6c6}
.arq-guia-recado{margin:0;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.08);font-size:14px;font-weight:700;line-height:1.35;color:#e6e9f8}
.arq-agora li.arq-agora-passos{display:block}
.arq-agora-passos button{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:4px 8px 4px 4px;box-sizing:border-box;border:1.5px solid rgba(255,201,60,.6);border-radius:12px;background:rgba(255,201,60,.12);color:#fff8e7;font-family:inherit;font-size:14px;font-weight:800;line-height:1.25;text-align:left;cursor:pointer}
.arq-hud{--arq-anel:rgba(255,201,60,.95)}
.arq-hud[data-anel-cor=dica]{--arq-anel:rgba(127,214,198,.95)}
.arq-hud[data-anel=necessidades] .arq-quem .arq-necessidades,.arq-hud[data-anel=mochila] .arq-inventario,.arq-hud[data-anel=menu] .arq-botao-menu,.arq-hud[data-anel=acao] .arq-acao,.arq-hud[data-anel=acao] .arq-toque-usar,.arq-hud[data-anel=pular] .arq-toque-pular,.arq-hud[data-anel=construir] [data-modo=construir],.arq-hud[data-anel=parede] [data-ferramenta=parede],.arq-hud[data-anel=porta] [data-ferramenta=porta],.arq-hud[data-anel=objetos] [data-ferramenta=objeto],.arq-hud[data-anel=pronto] .arq-obra-pronto,.arq-hud[data-anel=relogio] .arq-relogio,.arq-hud[data-anel=quadro] .arq-ilha-quadro,.arq-hud[data-anel=desafio-de-hoje] .arq-quadro-hoje,.arq-hud[data-anel=mapa] .arq-pausa-mapa .arq-mapa-papel,.arq-hud[data-anel=mapa] .arq-pausa-lugar[data-lugar=mapa]{outline:4px solid var(--arq-anel);outline-offset:3px}
@media (prefers-reduced-motion:no-preference){.arq-hud[data-anel=necessidades] .arq-quem .arq-necessidades,.arq-hud[data-anel=mochila] .arq-inventario,.arq-hud[data-anel=menu] .arq-botao-menu,.arq-hud[data-anel=acao] .arq-acao,.arq-hud[data-anel=acao] .arq-toque-usar,.arq-hud[data-anel=pular] .arq-toque-pular,.arq-hud[data-anel=construir] [data-modo=construir],.arq-hud[data-anel=parede] [data-ferramenta=parede],.arq-hud[data-anel=porta] [data-ferramenta=porta],.arq-hud[data-anel=objetos] [data-ferramenta=objeto],.arq-hud[data-anel=pronto] .arq-obra-pronto,.arq-hud[data-anel=relogio] .arq-relogio,.arq-hud[data-anel=quadro] .arq-ilha-quadro,.arq-hud[data-anel=desafio-de-hoje] .arq-quadro-hoje,.arq-hud[data-anel=mapa] .arq-pausa-mapa .arq-mapa-papel,.arq-hud[data-anel=mapa] .arq-pausa-lugar[data-lugar=mapa]{animation:arq-anel 1.4s ease-in-out infinite}}
@keyframes arq-anel{50%{outline-offset:7px}}
.arq-passos-fim{position:absolute;inset:0;z-index:3;display:grid;place-items:center;padding:20px;background:rgba(12,15,40,.55);pointer-events:none}
.arq-passos-fim-cartao{display:grid;justify-items:center;gap:10px;width:min(560px,100%);box-sizing:border-box;margin-bottom:180px;padding:26px 28px;border-radius:26px;background:rgba(20,26,58,.97);border:1.5px solid rgba(255,201,60,.6);box-shadow:0 20px 60px rgba(0,0,0,.5);color:#fff8e7;text-align:center}
.arq-passos-fim-cartao small{font:800 13px/1 var(--arq-titulo);letter-spacing:.12em;text-transform:uppercase;color:#ffc93c}
.arq-passos-fim-cartao h2{margin:0;font:800 30px/1.1 var(--arq-titulo)}
.arq-passos-fim-cartao ul{list-style:none;margin:6px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;width:100%}
.arq-passos-fim-cartao li{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:14px;background:rgba(95,211,154,.12);border:1px solid rgba(95,211,154,.35);font-size:15px;font-weight:800;text-align:left}
.arq-passos-fim-cartao li svg{flex:none;color:#5fd39a}
.arq-passos-fim-cartao p{margin:4px 0 0;font-size:15px;line-height:1.5;font-weight:700;color:#c9d1e6}
.arq-passos-menu{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;background:rgba(255,201,60,.08);border:1.5px solid rgba(255,201,60,.45)}
.arq-passos-menu-texto{display:grid;gap:6px;min-width:0}
.arq-passos-menu-texto b{font:800 19px/1.15 var(--arq-titulo)}
.arq-passos-menu-acoes{display:flex;flex-direction:column;gap:8px}
.arq-passos-menu-dicas{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12)}
.arq-passos-menu-dicas>span{margin-right:4px;font-size:13px;font-weight:800;color:#c9d1e6}
.arq-passos-menu-dicas .arq-botao{min-height:36px;padding:4px 12px;font-size:14px}
.arq-visitas-adultas section,.arq-visitas-adultas form,.arq-convite-codigo{display:grid;gap:10px;min-width:0}.arq-visitas-adultas section,.arq-visitas-adultas form{padding:14px 0;border-top:1px solid #d1d6e5}.arq-visitas-adultas h3,.arq-visitas-adultas p{margin:0}.arq-visitas-adultas input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:10px 12px;border:2px solid #a6aec7;border-radius:10px;background:#fff;color:#1d2340;font:inherit}.arq-visitas-adultas input:focus-visible{outline:3px solid #2f6df6;outline-offset:2px}.arq-convite-codigo input{font-family:monospace;font-size:14px}.arq-visitas-adultas label{font-weight:700}.arq-visitas-adultas small{overflow-wrap:anywhere}.arq-visitas-adultas .arq-menu-acoes{flex-wrap:wrap}
@media (min-width:641px){.arq-guia{left:16px;bottom:24px}.arq-hud.toque .arq-guia{bottom:auto;top:260px}.arq-hud:has(.arq-obra) .arq-dica{top:136px}}
.arq-hud:has(.arq-obra) .arq-guia{bottom:auto;top:136px}
@media (max-width:640px){
.arq-guia{left:10px;bottom:236px;width:calc(100% - 112px);gap:8px;padding:11px 10px 9px 11px;border-radius:18px}
.arq-guia-rosto{--d:42px}
.arq-guia-fala{font-size:16px;line-height:1.3}
.arq-guia-quem b{font-size:11px}
.arq-guia-capitulos i{width:6px;height:6px}
.arq-guia-capitulos i.agora{width:14px}
.arq-guia-rodape small{display:none}
.arq-guia-tarefa{padding:6px 8px}
.arq-guia-tarefa kbd{min-width:26px;height:26px;font-size:12px}
.arq-hud:has(.arq-obra) .arq-guia{top:186px;width:calc(100% - 20px)}
.arq-agora-passos button{min-height:28px;padding:2px 8px 2px 2px;font-size:13px}
.arq-passos-fim{place-items:start center;padding-top:70px}
.arq-passos-fim-cartao{margin-bottom:0;padding:18px}
.arq-passos-fim-cartao h2{font-size:24px}
.arq-passos-menu{grid-template-columns:auto minmax(0,1fr)}
.arq-passos-menu-acoes{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}
}
`
