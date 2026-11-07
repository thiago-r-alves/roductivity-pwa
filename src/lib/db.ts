import { openDB } from 'idb'; import type { AppData } from '../types';
const DB_NAME='momentum-db';const DB_VERSION=1;
const initial:AppData={tasks:[],habits:[],logs:[],activities:[],settings:{notifications:false,quietHours:false}};
const database=openDB(DB_NAME,DB_VERSION,{upgrade(db){for(const store of ['tasks','habits','logs','activities','settings'])if(!db.objectStoreNames.contains(store))db.createObjectStore(store,{keyPath:'id'});}});
export async function loadData():Promise<AppData>{const db=await database;const [tasks,habits,logs,activities,settings]=await Promise.all([db.getAll('tasks'),db.getAll('habits'),db.getAll('logs'),db.getAll('activities'),db.get('settings','main')]);return {tasks,habits,logs,activities,settings:settings??initial.settings};}
export async function saveData(data:AppData){const db=await database;const tx=db.transaction(['tasks','habits','logs','activities','settings'],'readwrite');for(const store of ['tasks','habits','logs','activities'] as const){await tx.objectStore(store).clear();for(const item of data[store])await tx.objectStore(store).put(item);}await tx.objectStore('settings').put({...data.settings,id:'main'});await tx.done;}
export async function replaceData(data:AppData){await saveData(data);}
