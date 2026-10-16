import {expect,test} from 'bun:test'
import {httpUrlSchema} from '@sistemazero/marketing-contracts'
import {observedResearchUrls,validateResearch} from '../src/main/research-evidence'
test('resultados de busca podem conter texto comum sem quebrar o protocolo',()=>{
 expect(httpUrlSchema.safeParse('search').success).toBe(false)
 expect(observedResearchUrls([{type:'search',query:'pesquisa'},[{title:'Fonte',url:'https://example.com/docs'}]])).toEqual(['https://example.com/docs'])
})
test('pesquisa sem consulta e citação de página não observada são recusadas',()=>{
 const text=JSON.stringify({title:'Pesquisa',summary:'Resumo',findings:[{claim:'Afirmação',classification:'interpretation',sourceUrls:['https://example.com/docs'],quote:null}],sources:[{title:'Fonte',url:'https://example.com/docs'}],hypothesis:'',proposedDirection:''})
 expect(()=>validateResearch(text,[],0)).toThrow('não consultou')
 expect(()=>validateResearch(text,['https://example.com/another'],1)).toThrow('não consta')
 expect(validateResearch(text,['https://example.com/docs/'],1).result.title).toBe('Pesquisa')
})
