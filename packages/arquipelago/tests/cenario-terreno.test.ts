import { expect,test } from 'bun:test'
import { cenarioInicialDaFaisca } from '../src/sistemas/cenario-inicial'
import { alturaComRelevo,criarTerrenoDeCenario } from '../src/cenarios/terreno'
import { ARQUIPELAGO } from '../src/sistemas/geografia-do-arquipelago'
import { assentarInstancias } from '../src/cenarios/apoio'
import type { ModeloDeCatalogo } from '@sistemazero/molda-cenarios-core'

const documento=()=>{const d=cenarioInicialDaFaisca('a'.repeat(64));d.instancias=[];d.aguas=[];d.caminhos=[];return d}
test('pincéis sucessivos têm avaliação estável, sem árvore exponencial de suavização',()=>{
  const d=documento();d.relevo=Array.from({length:256},(_,i)=>({id:`p${i}`,tipo:i%2?'suavizar':'elevar',centro:{x:0,z:0},raio:8,valor:.1,intensidade:.3}))
  const altura=alturaComRelevo(d,(x,z)=>x*x+z*z)
  const h=altura(0,0);expect(Number.isFinite(h)).toBe(true);expect(altura(0,0)).toBe(h);expect(altura(40,40)).toBe(3200)
})
test('relevo modifica a mesma malha dos dois lados da fronteira de setor',()=>{
  const d=documento();d.relevo=[{id:'subida',tipo:'elevar',centro:{x:80,z:140},raio:12,valor:3,intensidade:1}]
  const t=criarTerrenoDeCenario(d),a=t.setor(ARQUIPELAGO[0]!,0,1),b=t.setor(ARQUIPELAGO[0]!,1,1)
  const borda=(m:typeof a)=>{const ps=new Map<number,number>();for(let i=0;i<m.vertices.length;i+=3)if(Math.abs(m.vertices[i]!-80)<1e-5)ps.set(m.vertices[i+2]!,m.vertices[i+1]!);return ps}
  const aa=borda(a),bb=borda(b);expect(aa.size).toBeGreaterThan(10);for(const [z,y]of aa)expect(bb.get(z)).toBe(y)
  expect(t.exata(80,140)).toBeCloseTo(t.altura(80,140),4)
})
test('recorte do lago cruza setores sem deixar chão invisível dentro da água',()=>{
  const d=documento(),agua=cenarioInicialDaFaisca('a'.repeat(64)).aguas[0]!
  d.aguas=[{...agua,centro:{x:80,z:140},giro:.4,escala:1.4}]
  const t=criarTerrenoDeCenario(d)
  const contem=(m:ReturnType<typeof t.setor>,x:number,z:number)=>{
    for(let n=0;n<m.indices.length;n+=3){const ids=[m.indices[n]!,m.indices[n+1]!,m.indices[n+2]!],ps=ids.map(i=>({x:m.vertices[i*3]!,z:m.vertices[i*3+2]!}));const sinais=ps.map((a,i)=>{const b=ps[(i+1)%3]!;return(b.x-a.x)*(z-a.z)-(b.z-a.z)*(x-a.x)});if(sinais.every(v=>v>=-1e-6)||sinais.every(v=>v<=1e-6))return true}return false
  }
  expect(contem(t.setor(ARQUIPELAGO[0]!,0,1),79.8,140)).toBe(false)
  expect(contem(t.setor(ARQUIPELAGO[0]!,1,1),80.2,140)).toBe(false)
  expect(contem(t.setor(ARQUIPELAGO[0]!,0,1),40,140)).toBe(true)
})
test('apoio usa volume transformado e resolve dependentes mesmo antes do objeto base',()=>{
  const d=documento(),modelo:ModeloDeCatalogo={id:'m',nome:'Pedra',origem:'teste',caminho:'pedra.glb',commit:'a'.repeat(40),digest:'b'.repeat(64),arquivo:'pedra.glb',dimensoes:[2,2,2],min:[-1,0,-1],max:[1,2,1],bytes:1,triangulos:12,categoria:'natureza'}
  const base={id:'base',nome:'Base',grupo:null,bloqueado:false,oculto:false,modelo:'m',fisica:'caixa' as const,transformacao:{posicao:{x:10,y:0,z:0},rotacao:{x:0,y:0,z:0},escala:2},apoio:{tipo:'terreno' as const,deslocamento:0,inclinar:false}}
  d.instancias=[{...base,id:'cima',apoio:{tipo:'objeto',objeto:'base',deslocamento:4}},base]
  const resultado=assentarInstancias(d,new Map([['m',modelo]]),(x,z)=>x/10+z/10)
  expect(resultado[1]!.transformacao.posicao.y).toBeCloseTo(1.4)
  expect(resultado[0]!.transformacao.posicao.y).toBeCloseTo(5.4)
})
