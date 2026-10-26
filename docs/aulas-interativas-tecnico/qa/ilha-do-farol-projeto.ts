import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { normalizeSZIR } from '../../../packages/studio/src/ir'
import { parseJS } from '../../../packages/studio/src/parsers/js'
import { ILHA_ASSETS, ILHA_MODELS } from './ilha-do-farol-assets'
import { gameThreeDManifest } from '../../../packages/studio/src/official-extensions/game-3d/manifest'

export const ILHA_CURSO = 'jornada-faisca-base-3d'
export const ILHA_PARTES = [
  'inicio',
  'movimento',
  'posicao',
  'recolher',
  'memoria',
  'aviso',
  'sem-chave',
  'decisao',
  'personalizar',
] as const
export type IlhaParte = (typeof ILHA_PARTES)[number]
const placed = (
  name: keyof typeof ILHA_MODELS,
  position: [number, number, number],
  centered = false,
) => {
  const model = ILHA_MODELS[name],
    p = position.map((v, i) => v + (centered ? 0 : model.center[i]))
  return `const ${name}=SZGame3D.createModelFile(cena,${JSON.stringify(model.asset.name)},${model.size});\nSZGame3D.setPosition(${name},${p.join(',')});`
}
/** Every rule is represented by extension/programming blocks; no raw JS blocks or page markup. */
export function ilhaSource(parte: IlhaParte): string {
  const n = ILHA_PARTES.indexOf(parte)
  return `
const cena=SZGame3D.createFullscreenScene("#94d5f5");
SZGame3D.setCameraPosition(cena,0,12,21);
SZGame3D.setFOV(cena,48);
SZGame3D.addAmbientLight(cena,"#ffffff",0.65);
${placed('mar', [0, 0, 0])}
${placed('terreno', [0, 0, 0])}
${placed('ponte', [0, 0, 0])}
${placed('coqueiroTras', [-7, 0, -4.2])}
${placed('coqueiroFrente', [-6.6, 0, 4.5])}
${placed('vegetacao', [0, 0, 0])}
${placed('farol', [5.2, 0, 0.1])}
${placed('farolAceso', [5.2, 0, 0.1])}
SZGame3D.setVisible(farolAceso,"hide");
${placed('barco', [8.5, -0.1, 4.5])}
${placed('pedra', [-2, 0, -1])}
${placed('personagem', [-6.5, 0.8, 0.75], true)}
${placed('chave', n >= 2 ? [-3, 1, -2] : [-2, 1, -3], true)}
const centro=SZGame3D.createModel(cena);
SZGame3D.setPosition(centro,-1,0,0);
SZGame3D.cameraLookAt(cena,centro);
const chaves=SZGame3D.createGroup();
chaves.push(chave);
const portas=SZGame3D.createGroup();
portas.push(farol);
const jogadores=SZGame3D.createGroup();
jogadores.push(personagem);
let ganhou=false;
let aviso="Encontre a chave e leve o personagem até o farol.";
${n >= 4 ? 'let temChave=false;' : ''}
let antesX=-6.5;
let antesZ=0.75;
SZGame3D.hudText("bottom-center","Setas ou WASD: andar. R: recomeçar.");
SZGame3D.onKey("KeyR",()=>{SZGame3D.restart();});
${
  n >= 3
    ? `SZGame3D.onTouchGroup(personagem,chaves,(item)=>{
  SZGame3D.setVisible(chave,"hide");
  ${n >= 4 ? 'temChave=true;' : ''}
  ${n >= 5 ? 'aviso="Você pegou a chave! Agora vá ao farol.";' : ''}
});`
    : ''
}
${
  n >= 6
    ? `SZGame3D.onTouchGroup(personagem,portas,(item)=>{
  if(temChave){
    ${
      n >= 7
        ? `SZGame3D.setVisible(farol,"hide");
    SZGame3D.setVisible(farolAceso,"show");
    ganhou=true;
    aviso="Você acendeu o farol! O barco pode chegar.";`
        : ''
    }
  }else{aviso="Falta a chave. Procure na ilha antes de voltar.";}
});`
    : ''
}
SZGame3D.animate(cena,()=>{
  ${n >= 1 ? 'SZGame3D.controlWithKeys(personagem,4);' : ''}
  SZGame3D.updateGroupNoGravity(jogadores);
  if(!((SZGame3D.objectValue(personagem,"x")>=-11 && SZGame3D.objectValue(personagem,"x")<=0.6 && SZGame3D.objectValue(personagem,"z")>=-5 && SZGame3D.objectValue(personagem,"z")<=5) || (SZGame3D.objectValue(personagem,"x")>=0.6 && SZGame3D.objectValue(personagem,"x")<=4 && SZGame3D.objectValue(personagem,"z")>=0.4 && SZGame3D.objectValue(personagem,"z")<=1.1) || (SZGame3D.objectValue(personagem,"x")>=4 && SZGame3D.objectValue(personagem,"x")<=6.1 && SZGame3D.objectValue(personagem,"z")>=-0.5 && SZGame3D.objectValue(personagem,"z")<=1.7))){
    SZGame3D.setPosition(personagem,antesX,0.8,antesZ);
    SZGame3D.setVelocity(personagem,0,0,0);
  }else{
    antesX=SZGame3D.objectValue(personagem,"x");
    antesZ=SZGame3D.objectValue(personagem,"z");
  }
  SZGame3D.hudText("top-center",aviso);
  if(ganhou){SZGame3D.moveTowards(barco,6.6,-0.1,4.5,1.8);}
});`.trim()
}
export function montarProjetoIlha(parte: IlhaParte = 'inicio'): Project {
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(ilhaSource(parte)),
    extensions: [{ extensionId: 'game-3d' }],
  })
  return {
    ...createEmptyProject('manifest-ilha-farol', 'A Ilha do Farol'),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: 'A Ilha do Farol' }),
    assets: ILHA_ASSETS,
    installedExtensions: [{ id: 'game-3d', version: gameThreeDManifest.version, installedAt: 0 }],
  }
}
