// Execute reviewed source with in-memory dependencies. No live service/model calls.
// bun .audits/tui-review-v2-2026-10-15/repro.ts <research-clones-directory>
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = process.argv[2];
if (!root) throw new Error('Supply the research clones directory');
const expected = {nightcode:'255883f130d350541e806f2431e7df32369f24bf','browser-automation-app':'7b7ae9755f239c60f33d1edcefbde0a251a3fb02','ai-teammates':'de32f461cc9e0ddf4c5087af07c65cf06df7d683',sendkit:'e4f47cb77bcd4dddcb1af483ec014e654740ee74'};
for (const [repo,sha] of Object.entries(expected)) assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:path.join(root,repo),encoding:'utf8'}).trim(),sha);
function compile(repo:string, file:string) {
  const source = readFileSync(path.join(root,repo,file),'utf8');
  // Reviewed TS imports can span lines. Remove import declarations before injection.
  return new Bun.Transpiler({loader:'ts'}).transformSync(source.replace(/^import\s[\s\S]*?\sfrom\s+["'][^"']+["'];?\s*$/gm,'').replace(/^export /gm,''));
}
const results:Record<string,unknown> = {};
let content = 'hello WORLD';
let readBytes = 0;
const schemas = new Proxy({}, {get:()=>({parse:(x:unknown)=>x})});
const tools = new Function('readFile','writeFile','mkdir','readdir','stat','dirname','isAbsolute','join','relative','resolve','toolInputSchemas','Mode', compile('nightcode','packages/cli/src/lib/local-tools.ts')+'\nreturn executeLocalTool;')(
  async()=>{readBytes=Buffer.byteLength(content);return content}, async(_p:string,c:string)=>{content=c},async()=>{},async()=>[],async()=>({}),path.dirname,path.isAbsolute,path.join,path.relative,path.resolve,schemas,{PLAN:'plan'});
await tools('editFile',{path:'fixture.txt',oldString:'WORLD',newString:'$&'},'build');
assert.equal(content,'hello WORLD');
results.nightcodeLiteralReplacement={requested:'hello $&',actual:content};
content='x'.repeat(2_000_000);
const read=await tools('readFile',{path:'fixture.txt'},'build');
assert.equal(read.content.length,10000);
assert.equal(readBytes,2_000_000);
results.nightcodeReadBound={bytesDeliveredByFsBeforeTruncation:readBytes,returnedCharacters:read.content.length};
const interpolate=new Function(compile('browser-automation-app','features/workflows/lib/interpolate.ts')+'\nreturn interpolate;')();
const missing=interpolate({text:'recipient={{ lookup.email }}',outputs:{}});
assert.equal(missing,'recipient=');
results.browserMissingReference={actual:missing,throws:false};
const agent=new Function(compile('browser-automation-app','features/workflows/nodes/agent.ts')+'\nreturn agent;')();
const fakeStagehand={agent:()=>({execute:async()=>({success:false,completed:false,message:'blocked in fixture'})})};
const workflow={name:'fixture',graph:{nodes:[{id:'start',data:{type:'start',title:'Start',values:{}}},{id:'agent',data:{type:'agent',title:'Agent',values:{instruction:'fixture'}}}],edges:[{source:'start',target:'agent'}]}};
const task=new Function('toposort','logger','metadata','task','Stagehand','nodeExecutors','interpolate','getWorkflow',compile('browser-automation-app','features/workflows/tasks/run-workflow.ts')+'\nreturn runWorkflowTask;')(
  {array:(ids:string[])=>ids},{log:()=>{}},{set:()=>{},flush:async()=>{}},(v:unknown)=>v,class {},{agent:async()=>agent({stagehand:fakeStagehand,instruction:'fixture'})},interpolate,async()=>workflow);
const outcome=await task.run({workflowId:'fixture',orgId:'fixture'});
assert.equal(outcome.steps[1].status,'done');
assert.equal(outcome.steps[1].output.success,false);
results.browserFalseSuccess={step:outcome.steps[1],limitation:'Original runner/executor; topological order and external SDK replaced. Does not test Trigger.dev or Stagehand itself.'};
const schema:any=new Proxy(()=>schema,{get:()=>schema});
const memory='x'.repeat(20000)+'\n- NOVA_DECISAO';
const sandboxTools=new Function('tool','z','getBotSandbox','MEMORY_FILE','readBotMemory',compile('ai-teammates','lib/sandbox-tools.ts')+'\nreturn createSandboxTools;')((v:unknown)=>v,schema,async()=>({}),'MEMORY.md',async()=>memory)(()=> 'fixture');
const recall=await sandboxTools.recall.execute({});
assert.equal(recall.memory.includes('NOVA_DECISAO'),false);
results.teammatesRecall={storedCharacters:memory.length,newNoteVisible:false,returnedCharacters:recall.memory.length};
let requestOptions:any;
const parsed={parse:(v:unknown)=>v};
const send=new Function('fetch','telegramMessageOutputSchema','telegramMessageOptionsSchema','telegramSendMessageRequestSchema','telegramSendMessageResponseSchema',compile('sendkit','packages/core/src/operations.ts')+'\nreturn sendTelegramMessage;')(
  async(_url:string,options:unknown)=>{requestOptions=options;return {ok:true,json:async()=>({ok:true,result:{message_id:1}})}},parsed,parsed,parsed,parsed);
await send({botToken:'SYNTHETIC',chatId:'fixture',message:'never sent'});
assert.equal(requestOptions.signal,undefined);
results.sendkitCancellation={abortSignalProvided:false,externalMessagesSent:0};
const evidence={date:'2026-10-15',commits:expected,scope:'Original source functions with injected in-memory adapters. Schemas stubbed: these probes test execution semantics, not schema validation.',results};
writeFileSync(path.join(import.meta.dir,'repro.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
