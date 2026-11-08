import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from 'lucide-react';
import { useApp } from './context';
import { Empty, Panel, TrendChart, WeeklyChart } from './components';
import { displayDate, formatDuration, insightsFor, latestWith, recentDaily, topLevel, weeklySeries } from './analytics';
import type { DashboardData, Daily } from './types';

type Kind = 'training' | 'activities' | 'sleep' | 'hrv' | 'resting_hr' | 'body_battery_high' | 'insights';
type Widget = { id: string; kind: Kind; width: 1 | 2; days: 14 | 28 | 90 };
type Layout = { version: 1; widgets: Widget[] };
const labels: Record<Kind,string> = {training:'Training volume',activities:'Recent activities',sleep:'Sleep',hrv:'Overnight HRV',resting_hr:'Resting heart rate',body_battery_high:'Body Battery high',insights:'Patterns worth a look'};
const kinds = Object.keys(labels) as Kind[];
const defaults: Layout = {version:1, widgets:[
  {id:'training',kind:'training',width:2,days:90},{id:'sleep',kind:'sleep',width:1,days:28},
  {id:'hrv',kind:'hrv',width:1,days:28},{id:'activities',kind:'activities',width:1,days:14},
  {id:'insights',kind:'insights',width:1,days:28}
]};
function readLayout(key:string): Layout {
  try {
    const value=JSON.parse(localStorage.getItem(key)||'null');
    if(value?.version===1 && Array.isArray(value.widgets) && value.widgets.length<=30 && value.widgets.every((w:Widget)=>typeof w.id==='string' && kinds.includes(w.kind) && [1,2].includes(w.width) && [14,28,90].includes(w.days))) return value;
  } catch { /* use defaults */ }
  return defaults;
}
function WidgetBody({widget,data}:{widget:Widget;data:DashboardData}) {
  const {kind,days}=widget;
  if(kind==='training') {
    const rows=weeklySeries(data,Math.max(4,Math.ceil(days/7)),'all');
    return rows.some(r=>r.minutes>0)?<WeeklyChart series={rows} unit="minutes"/>:<Empty title="No training yet">Sync Garmin or import activities to see your trend.</Empty>;
  }
  if(kind==='activities') {
    const rows=topLevel(data.activities).slice(0,5);
    return rows.length?<div className="widget-list">{rows.map(a=><Link key={a.id} to={`/activities/${a.id}`}><span>{a.name}<small>{displayDate(a.date)} · {a.device||'Garmin'}</small></span><strong>{formatDuration(a.duration,true)}</strong></Link>)}</div>:<Empty title="No activities yet">Your recent sessions will appear here.</Empty>;
  }
  if(kind==='insights') {
    const rows=insightsFor(data).slice(0,3);
    return rows.length?<div className="widget-list">{rows.map(i=><Link key={i.id} to="/insights"><span>{i.title}<small>{i.body}</small></span></Link>)}</div>:<Empty title="Not enough history yet">Insights appear when there is enough evidence to compare.</Empty>;
  }
  const key=kind==='sleep'?'sleep_seconds':kind;
  const rows=recentDaily(data,days);
  const latest=latestWith(rows,key as keyof Daily);
  const unit=kind==='sleep'?'h':kind==='hrv'?'ms':kind==='resting_hr'?'bpm':'points';
  const chart=rows.map(d=>({date:d.date,value:kind==='sleep' && d.sleep_seconds!=null?d.sleep_seconds/3600:d[key as keyof Daily] as number|null|undefined}));
  const value=latest?.[key as keyof Daily] as number|null|undefined;
  return <>{value!=null?<div className="widget-value">{kind==='sleep'?(value/3600).toFixed(1):Math.round(value)} <small>{unit}</small><span>Latest available · {displayDate(latest!.date)}</span></div>:<p className="muted">This measurement is not available in your imported data.</p>}
    {chart.some(d=>d.value!=null)&&<TrendChart rows={chart} dataKey="value" label={labels[kind]} unit={unit} height={170}/>}
    <p className="footnote">Garmin device data · {chart.filter(d=>d.value!=null).length} of {days} days recorded</p></>;
}
export function DashboardPage() {
  const {data,demo,sync,connect}=useApp();
  const key=`og_dashboard_v1_${demo?'demo':data.user.email||'local'}`;
  const [layout,setLayout]=useState<Layout>(()=>readLayout(key));
  const [editing,setEditing]=useState(false);
  useEffect(()=>setLayout(readLayout(key)),[key]);
  const update=(widgets:Widget[])=>{const next={version:1 as const,widgets};setLayout(next);localStorage.setItem(key,JSON.stringify(next));};
  const move=(index:number,delta:number)=>{const next=[...layout.widgets];const target=index+delta;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];update(next);};
  return <><div className="page-heading"><div><div className="eyebrow">YOUR PERSPECTIVE</div><h1>Your dashboard</h1><p>Arrange the signals that matter to you. Every metric keeps its source and coverage.</p></div><div className="page-heading-actions"><button className="button subtle" onClick={()=>demo?connect():sync()}>{demo?'Connect Garmin':'Sync Garmin'}</button><button className="button" onClick={()=>setEditing(!editing)}><Settings2 size={15}/>{editing?'Done':'Customize'}</button></div></div>
    {editing&&<div className="widget-picker"><label>Add a widget <select id="widget-kind" defaultValue="training">{kinds.map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></label><button className="button primary" onClick={()=>{const kind=(document.getElementById('widget-kind') as HTMLSelectElement).value as Kind;update([...layout.widgets,{id:crypto.randomUUID(),kind,width:1,days:28}]);}}><Plus size={15}/> Add widget</button><button className="text-button" onClick={()=>update(defaults.widgets)}>Restore default</button></div>}
    <div className="widget-grid">{layout.widgets.map((widget,index)=><section className={`widget widget-${widget.width}`} key={widget.id}><Panel title={labels[widget.kind]} kicker={widget.kind==='insights'?'APP CALCULATION':'YOUR DATA'}>{editing&&<div className="widget-controls"><button aria-label={`Move ${labels[widget.kind]} up`} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={15}/></button><button aria-label={`Move ${labels[widget.kind]} down`} disabled={index===layout.widgets.length-1} onClick={()=>move(index,1)}><ArrowDown size={15}/></button><label>Width <select value={widget.width} onChange={e=>update(layout.widgets.map(w=>w.id===widget.id?{...w,width:Number(e.target.value) as 1|2}:w))}><option value="1">Half</option><option value="2">Full</option></select></label><label>Period <select value={widget.days} onChange={e=>update(layout.widgets.map(w=>w.id===widget.id?{...w,days:Number(e.target.value) as 14|28|90}:w))}><option value="14">14 days</option><option value="28">28 days</option><option value="90">90 days</option></select></label><button aria-label={`Remove ${labels[widget.kind]}`} onClick={()=>update(layout.widgets.filter(w=>w.id!==widget.id))}><Trash2 size={15}/></button></div>}<WidgetBody widget={widget} data={data}/></Panel></section>)}</div>
    {!layout.widgets.length&&<Empty title="A blank canvas">Choose a widget to build your dashboard.</Empty>}
  </>;
}
