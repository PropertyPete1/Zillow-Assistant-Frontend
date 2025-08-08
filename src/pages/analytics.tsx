import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { Api } from '@/lib/api';

export default function AnalyticsPage(){
  const [data, setData] = useState<any>(null);
  useEffect(()=>{(async()=>{ try{ const d=await Api.getAnalytics(); setData(d);}catch{}})();},[]);
  return(
    <Shell>
      <h1 className="text-2xl font-semibold mb-2">Analytics</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded border border-white/10 bg-white/5">
          <div className="opacity-70 text-sm">Messages/Day</div>
          <div className="text-xl">{data?.messagesPerDay ?? '—'}</div>
        </div>
        <div className="p-4 rounded border border-white/10 bg-white/5">
          <div className="opacity-70 text-sm">Response Rate</div>
          <div className="text-xl">{data?.responseRate ?? '—'}</div>
        </div>
        <div className="p-4 rounded border border-white/10 bg-white/5">
          <div className="opacity-70 text-sm">Top Zip</div>
          <div className="text-xl">{data?.topZip ?? '—'}</div>
        </div>
      </div>
    </Shell>
  )
}


