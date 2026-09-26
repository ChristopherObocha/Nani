import type { GameSnapshot } from '../engine/types'
const DB='floor-game-host', VERSION=1
function open(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('sessions'))r.result.createObjectStore('sessions',{keyPath:'id'});if(!r.result.objectStoreNames.contains('images'))r.result.createObjectStore('images')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function transact<T>(store:string,mode:IDBTransactionMode,work:(s:IDBObjectStore)=>IDBRequest<T>){const db=await open();return new Promise<T>((resolve,reject)=>{const tx=db.transaction(store,mode),r=work(tx.objectStore(store));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close()})}
export const saveSession=(game:GameSnapshot)=>transact('sessions','readwrite',s=>s.put(game))
export const loadSession=(id:string)=>transact<GameSnapshot|undefined>('sessions','readonly',s=>s.get(id))
export const loadSessions=()=>transact<GameSnapshot[]>('sessions','readonly',s=>s.getAll())
export const deleteSession=(id:string)=>transact('sessions','readwrite',s=>s.delete(id))
interface StoredImage { data:ArrayBuffer; type:string }
function readBlob(blob:Blob){return new Promise<ArrayBuffer>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as ArrayBuffer);reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(blob)})}
export async function saveImage(id:string,blob:Blob){const data=await readBlob(blob);return transact('images','readwrite',s=>s.put({data,type:blob.type} satisfies StoredImage,id))}
export async function saveImagesBatch(items:Array<{id:string;blob:Blob}>):Promise<void>{
  const stored: Array<{id:string;value:StoredImage}> = []
  for(const item of items){
    if(!(item.blob instanceof Blob))throw new Error(`Failed to save image ${item.id}: invalid blob`)
    try{stored.push({id:item.id,value:{data:await readBlob(item.blob),type:item.blob.type}})}catch(error){throw new Error(`Failed to save image ${item.id}`,{cause:error})}
  }
  const db=await open()
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('images','readwrite')
    let settled=false
    const fail=(error:unknown)=>{if(!settled){settled=true;reject(error)}}
    for(const item of stored){
      const request=tx.objectStore('images').put(item.value,item.id)
      request.onerror=()=>fail(new Error(`Failed to save image ${item.id}`,{cause:request.error}))
    }
    tx.oncomplete=()=>{if(!settled){settled=true;resolve()}}
    tx.onerror=()=>fail(new Error('Failed to save image batch',{cause:tx.error}))
    tx.onabort=()=>fail(new Error('Image batch was aborted',{cause:tx.error}))
  }).finally(()=>db.close())
}
export async function loadImage(id:string){const stored=await transact<StoredImage|undefined>('images','readonly',s=>s.get(id));return stored?new Blob([stored.data],{type:stored.type}):undefined}
export function recoverSession(game:GameSnapshot):GameSnapshot{
  if(!game.duel)return game
  const stored=game.duel as GameSnapshot['duel'] & {categoryId?:string}
  const categoryId=stored.categoryId??game.board.find(c=>c.id===stored.defenderCellId)?.categoryId
  if(!categoryId)return game
  const duel={...stored,categoryId}
  return game.phase==='duel'?{...game,duel:{...duel,running:false,startedAt:undefined}}:{...game,duel}
}
