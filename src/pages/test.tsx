import React, { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TestModePage(){
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const simulate = async ()=>{
    setLoading(true);
    try {
      await Api.testMessage({});
      toast.success('Simulated successfully');
    } catch(e:any){ toast.error(e.message||'Simulation failed'); }
    setLoading(false);
  };
  const doPreview = async ()=>{
    setLoading(true);
    try {
      const r = await Api.previewMessage({ listing: { address:'', price:'', bedrooms:0, ownerName:'', link:'#', type:'rent' } as any });
      setPreview(r.message || '');
    } catch(e:any){ toast.error(e.message||'Preview failed'); }
    setLoading(false);
  };
  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-2">Test Mode</h1>
      <div className="flex gap-2 mb-3">
        <button className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50" onClick={simulate} disabled={loading}>Simulate Message Flow</button>
        <button className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50" onClick={doPreview} disabled={loading}>Preview Generated Message</button>
      </div>
      {preview && <pre className="p-3 rounded border border-white/10 bg-white/5 whitespace-pre-wrap">{preview}</pre>}
    </Shell>
  );
}


