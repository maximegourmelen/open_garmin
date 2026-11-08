import { createContext, useContext } from 'react';
import type { Activity, DashboardData, Prefs } from './types';
export interface AppContextValue {
  data: DashboardData; loading: boolean; online: boolean; demo: boolean;
  connect: () => void; refresh: () => Promise<void>; sync: (days?:number)=>Promise<void>;
  toast: (message:string)=>void; savePreferences:(prefs:Prefs)=>Promise<void>;
  saveNote:(id:string,note:Activity['note'])=>Promise<void>; exploreDemo:()=>void;
  useLive:()=>void; logout:()=>Promise<void>;
}
export const AppContext=createContext<AppContextValue|null>(null);
export function useApp(){const value=useContext(AppContext);if(!value)throw new Error('App context missing');return value;}
