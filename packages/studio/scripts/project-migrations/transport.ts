/** Evaluated by both remote runtimes. Decode only after collecting all input bytes. */
export const REMOTE_EVALUATE_SOURCE =
  'const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const source=new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks));await eval("(async()=>{"+source+"})()")'
