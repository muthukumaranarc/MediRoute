import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { mockApi } from '../mockApi';
import { AdminOverview } from '../types';
import { LayoutDashboard, RotateCcw, Building2, BedDouble, Activity, CheckCircle2, Clock3, RefreshCw, ArrowUpRight, Siren, Hospital } from 'lucide-react';

interface Props { refresh: () => void; flash: (msg: string) => void; demoMode: boolean; }
export const AdminView: React.FC<Props> = ({ refresh, flash, demoMode }) => {
  const [data, setData] = useState<AdminOverview | null>(() => {
    try {
      const s = mockApi.getInitialState();
      return {
        totalHospitals: s.hospitals.length,
        openHospitals: s.hospitals.filter(h => h.operationalStatus === 'OPEN').length,
        intakeEnabled: s.hospitals.filter(h => h.emergencyIntakeEnabled).length,
        activeCases: s.cases.filter(c => ['SEARCHING', 'REQUEST_PENDING'].includes(c.status)).length,
        pendingRequests: s.requests.filter(r => r.status === 'PENDING').length,
        acceptedRequests: s.requests.filter(r => r.status === 'ACCEPTED').length,
        events: s.events.map(({ id, type, summary, timestamp }) => ({ id, type, summary, timestamp })),
        requests: s.requests
      };
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getOverview();
      setData(res);
      setError('');
    } catch {
      try {
        setData(await mockApi.getOverview());
      } catch (err) {
        setError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(()=>{loadData();const timer=setInterval(()=>{if(!document.hidden)loadData();},6000);return()=>clearInterval(timer);},[]);
  const handleReset=async()=>{if(!window.confirm('Reset all synthetic demo cases, requests, and hospital availability to the starting sample?'))return;setIsResetting(true);try{await api.resetDemoData();await refresh();await loadData();flash('Synthetic demo data restored to the starting sample.');}catch(err){flash((err as Error).message);}finally{setIsResetting(false);}};
  if(isLoading&&!data)return <div className="workspace-loading"><span/><strong>Loading operations overview</strong><small>Gathering the latest network status…</small></div>;
  const metrics=data?[{label:'Network hospitals',value:data.totalHospitals,detail:'Registered facilities',icon:Building2,tone:'slate'},{label:'Open facilities',value:data.openHospitals,detail:'Ready for intake',icon:Hospital,tone:'green'},{label:'Accepting arrivals',value:data.intakeEnabled,detail:'Emergency intake on',icon:Activity,tone:'blue'},{label:'Active cases',value:data.activeCases,detail:'Ambulances in progress',icon:Siren,tone:'rose'},{label:'Needs response',value:data.pendingRequests,detail:'Awaiting hospital action',icon:Clock3,tone:'amber'},{label:'Beds confirmed',value:data.acceptedRequests,detail:'Admissions reserved',icon:CheckCircle2,tone:'green'}]:[];
  return <div className="workspace-page admin-workspace">
    <section className="workspace-hero admin-hero"><div className="hero-copy"><div className="eyebrow"><LayoutDashboard/> OPERATIONS CENTER <span className="eyebrow-dot"/> NAMAKKAL · TIRUCHENGODE · KUMARAPALAYAM</div><h1>Network overview</h1><p>Monitor emergency capacity, active cases, and hospital responses across the district.</p></div><div className="admin-actions"><span className="auto-refresh"><i/>{demoMode?'Local demo refresh · 6 sec':'Auto-refresh · 6 sec'}</span><button className="refresh-data" onClick={loadData}><RefreshCw/> Refresh</button>{demoMode&&<button className="reset-data" onClick={handleReset} disabled={isResetting}><RotateCcw/>{isResetting?'Resetting…':'Reset demo data'}</button>}</div></section>
    {error&&<div className="workspace-error">{error}</div>}
    {data&&<>
      <section className="admin-metrics" aria-label="Network metrics">{metrics.map(({label,value,detail,icon:Icon,tone})=><article className="admin-metric" key={label}><div className={`admin-metric-icon ${tone}`}><Icon/></div><div className="admin-metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><ArrowUpRight className="metric-arrow"/></article>)}</section>
      <div className="admin-logs"><section className="workspace-card log-card"><header className="section-heading"><div className="section-heading-icon blue"><Clock3/></div><div><h2>Facility activity</h2><p>Recent changes to hospital availability and capacity.</p></div><span className="log-count">{data.events.length} events</span></header>{data.events.length===0?<div className="log-empty">No facility changes have been recorded yet.</div>:<div className="log-list">{data.events.slice(-8).reverse().map(event=><article className="log-row" key={event.id}><span className="timeline-mark"/><div className="log-content"><strong>{event.type.replaceAll('_',' ')}</strong><p>{event.summary}</p></div><time>{new Date(event.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></article>)}</div>}</section>
      <section className="workspace-card log-card"><header className="section-heading"><div className="section-heading-icon rose"><Activity/></div><div><h2>Ambulance coordination</h2><p>Recent hospital responses to incoming cases.</p></div><span className="log-count">{data.requests.length} requests</span></header>{data.requests.length===0?<div className="log-empty">No ambulance coordination requests have been sent yet.</div>:<div className="coordination-list">{data.requests.slice(-8).reverse().map(req=><article className="coordination-row" key={req.id}><div className="coordination-symbol"><Siren/></div><div className="coordination-copy"><strong>{req.caseId.slice(0,12)} <span>→</span> {req.hospitalId.replaceAll('-',' ')}</strong><small>{req.distanceKm.toFixed(1)} km · {new Date(req.createdAt).toLocaleString([], {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div><span className={`coordination-status ${req.status.toLowerCase()}`}>{req.status==='PENDING'?'Awaiting response':req.status==='ACCEPTED'?'Accepted':'Declined'}</span></article>)}</div>}</section></div>
    </>}
  </div>;
};
