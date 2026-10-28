/** CSS do jogo, injetado pela entrada dentro do próprio elemento (prefixo `arq-`). */
export const ESTILOS = `
.arq-raiz{position:relative;width:100%;height:100%;overflow:hidden;background:#0e1638;color:#1d2340;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none}
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
.arq-botao{border:0;cursor:pointer;font:800 14px system-ui,sans-serif;border-radius:12px;min-height:44px;padding:10px 16px;background:#ffc93c;color:#4a3200;box-shadow:0 3px 0 rgba(0,0,0,.15)}
.arq-botao:disabled{opacity:.55;cursor:default}
.arq-botao.leve{background:rgba(255,255,255,.92);color:#1d2340}
.arq-botao:focus-visible{outline:3px solid #2f6df6;outline-offset:2px}
.arq-baixo{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;max-width:calc(100% - 28px)}
.arq-acao{padding:8px 16px;font-weight:800;border-radius:999px;background:#141a3a;color:#fff;display:flex;gap:10px;align-items:center}
.arq-tecla{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:6px;background:#ffc93c;color:#4a3200;font-size:13px;white-space:nowrap}
.arq-inventario{display:flex;gap:6px;padding:6px;background:rgba(20,26,58,.82);border-radius:14px;flex-wrap:wrap;justify-content:center}
.arq-item{position:relative;width:46px;height:46px;border-radius:10px;border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);font-size:22px;display:grid;place-items:center;color:#fff;cursor:default}
.arq-item.comida{cursor:pointer;border-color:#ffc93c}
.arq-item b{position:absolute;right:3px;bottom:1px;font-size:11px}
.arq-dica{position:absolute;left:14px;bottom:90px;max-width:min(380px,calc(100% - 28px));display:flex;gap:10px;align-items:flex-start;padding:12px 14px;background:rgba(20,26,58,.92);color:#fff;border-radius:16px;font-weight:700;animation:arq-entra .35s ease}
.arq-zappy{width:22px;height:22px;flex:none;border-radius:50%;background:radial-gradient(circle,#fff8c4 0 30%,#ffc93c 31% 58%,transparent 60%);box-shadow:0 0 14px #ffd84f}
@keyframes arq-entra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.arq-tela{position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:radial-gradient(900px 500px at 50% 0%,#2a3a86,transparent 60%),#0e1638;color:#eef0fb;text-align:center}
.arq-tela h1{font-size:30px;margin:14px 0 8px}
.arq-tela p{max-width:440px;margin:0 auto 18px;color:#c9cdf0;font-size:16px}
.arq-tela .arq-zappy{width:46px;height:46px;margin:0 auto}
.arq-sobre{position:absolute;inset:0;display:grid;place-items:center;background:rgba(14,22,56,.6);padding:20px}
.arq-menu{padding:22px;max-width:420px;width:100%;display:grid;gap:10px;text-align:left}
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
@media (prefers-reduced-motion:reduce){.arq-ferramenta{transition:none}.arq-ferramenta:hover:not(:disabled){transform:none}}
.arq-menu h2{margin:0 0 4px;font-size:22px}
.arq-menu ul{margin:0;padding-left:18px;color:#4a5070}
.arq-toque{position:absolute;inset:auto 0 0 0;height:0}
.arq-joystick{position:absolute;left:22px;bottom:110px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);touch-action:none}
.arq-joystick i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px;border-radius:50%;background:rgba(255,255,255,.75)}
.arq-botoes-toque{position:absolute;right:22px;bottom:120px;display:flex;flex-direction:column;gap:12px}
.arq-botoes-toque button{width:74px;height:74px;border-radius:50%;font-size:14px}
.arq-quadro{max-width:560px;max-height:calc(100dvh - 40px);overflow:auto}.arq-quadro-sub{margin:0;color:#4a5070;font-weight:600}.arq-quadro-lista{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:8px}.arq-quadro-cartao{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;padding:10px 12px;border:2px solid #e7e3d6;border-radius:14px;background:#fff}.arq-quadro-cartao.feito{border-color:#9ad9c2;background:#f1fbf6}.arq-quadro-cartao.disponivel{border-color:#ffc93c}.arq-quadro-cartao.trancado,.arq-quadro-cartao.vazio{background:#f6f5f1;color:#5a6080}.arq-quadro-numero{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#e7e3d6;color:#1d2340;font-weight:900}.arq-quadro-cartao.feito .arq-quadro-numero{background:#2fb39a;color:#fff}.arq-quadro-cartao.disponivel .arq-quadro-numero{background:#ffc93c;color:#4a3200}.arq-quadro-corpo{display:grid;gap:2px;min-width:0}.arq-quadro-corpo b{font-size:15px;color:#1d2340}.arq-quadro-estado{font-size:13px;font-weight:700;color:#5a6080}.arq-quadro-premio{margin:2px 0 0;font-size:12px;color:#5a6080}.arq-quadro-erro{display:grid;gap:8px}@media (max-width:480px){.arq-quadro-cartao{grid-template-columns:36px 1fr}.arq-quadro-cartao .arq-botao{grid-column:1/-1}}
.arq-capi{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:min(620px,calc(100% - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:16px 18px;display:grid;gap:10px;background:#fffaf0;border:3px solid #7a5232;border-radius:20px;box-shadow:0 6px 0 #5b3b22,0 10px 30px rgba(0,0,0,.25);animation:arq-entra .3s ease}.arq-capi-topo{display:flex;align-items:center;justify-content:space-between;gap:10px}.arq-capi h2{margin:0;padding:3px 14px;font-size:17px;border-radius:999px;background:#7a5232;color:#fff8e6}.arq-capi-coracoes{display:flex;gap:2px;font-size:20px;line-height:1}.arq-capi-coracoes span{background:linear-gradient(90deg,#e2475f var(--cheio),#e0d6c4 var(--cheio));-webkit-background-clip:text;background-clip:text;color:transparent}.arq-capi-fala{margin:0;font-size:17px;font-weight:600;color:#2a2018;min-height:2.8em}.arq-capi-pedido{display:grid;gap:2px;padding:10px 12px;border-radius:14px;background:#fff;border:2px dashed #e0c48c;font-size:14px}.arq-capi-pedido.feito{border-style:solid;border-color:#9ad9c2;background:#f1fbf6}.arq-capi-falta{color:#6b4a00;font-weight:700;font-size:13px}.arq-capi-itens{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}.arq-capi-itens .arq-botao{width:100%;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.arq-capi-qtd{color:#5a6080;font-size:12px}.arq-capi .arq-menu-acoes{grid-auto-flow:column;grid-auto-columns:1fr}@media (max-width:480px){.arq-capi .arq-menu-acoes{grid-auto-flow:row}}@media (prefers-reduced-motion:reduce){.arq-capi{animation:none}}
.arq-cronometro{position:absolute;left:50%;top:14px;transform:translateX(-50%);display:flex;gap:6px;align-items:center}
.arq-cronometro .arq-botao{min-height:36px;padding:6px 12px;border-radius:999px}
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
@media (max-width:640px){.arq-necessidades{min-width:130px;padding:8px}.arq-nec{font-size:0}.arq-dica{bottom:200px}.arq-cronometro{top:112px}.arq-acao{flex-wrap:wrap;justify-content:center;border-radius:18px}}
`
