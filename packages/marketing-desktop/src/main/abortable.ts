/** Native APIs may leave their Promise pending after their WebContents is destroyed. */
export function abortable<T>(operation:Promise<T>,signal:AbortSignal):Promise<T>{
 return new Promise<T>((resolve,reject)=>{
  const abort=()=>reject(signal.reason)
  signal.addEventListener('abort',abort,{once:true})
  if(signal.aborted)abort()
  operation.then(value=>{signal.removeEventListener('abort',abort);resolve(value)},error=>{signal.removeEventListener('abort',abort);reject(error)})
 })
}
