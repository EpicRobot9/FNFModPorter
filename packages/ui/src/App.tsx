import React, { useEffect, useMemo, useState } from 'react';

declare global { interface Window { porter: any } }

const sections = ['Queue', 'Ported Mods', 'Settings', 'Toolchain'];

export const App = () => {
  const [active, setActive] = useState('Queue');
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('info');
  const [toolchain, setToolchain] = useState<any[]>([]);
  const [publishTarget, setPublishTarget] = useState<'local' | 'http' | 'epicrobo'>('local');
  const [allowExternal, setAllowExternal] = useState(false);
  const [allowRuntimeDownloads, setAllowRuntimeDownloads] = useState(false);

  const refresh = async () => setItems(await window.porter.list());
  useEffect(() => { refresh(); window.porter.onLog((e: any) => setLogs((l: any[]) => [...l.slice(-300), e])); }, []);
  useEffect(() => { if (active === 'Toolchain') window.porter.toolchain().then(setToolchain); }, [active]);

  const doPort = async (paths: string[]) => {
    await window.porter.port({ inputs: paths, contract: { allowExternal, allowRuntimeDownloads } });
    refresh();
  };
  const filteredLogs = useMemo(() => logs.filter((l) => filter === 'all' || l.level === filter), [logs, filter]);

  return <div className="app">
    <aside>{sections.map((s) => <button key={s} className={active===s?'on':''} onClick={() => setActive(s)}>{s}</button>)}</aside>
    <main>
      <header onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); doPort([...e.dataTransfer.files].map((f) => f.path)); }}>
        <div>
          <h2>Drop folders or .zip files</h2>
          <label><input type='checkbox' checked={allowExternal} onChange={(e)=>setAllowExternal(e.target.checked)} /> Allow external</label>
          <label style={{marginLeft:8}}><input type='checkbox' checked={allowRuntimeDownloads} onChange={(e)=>setAllowRuntimeDownloads(e.target.checked)} /> Allow runtime downloads</label>
        </div>
        <button onClick={async()=>doPort(await window.porter.pickInputs())}>Select Inputs</button>
      </header>
      <section>
        {active === 'Toolchain' ? <ul>{toolchain.map((c)=><li key={c.command}>{c.ok?'✅':'❌'} {c.command} - {c.output}</li>)}</ul>
          : active === 'Settings' ? <div>
            <h3>Hosting Contract</h3>
            <label><input type='checkbox' checked={allowExternal} onChange={(e)=>setAllowExternal(e.target.checked)} /> Allow external URLs (CDN/http/file)</label><br/>
            <label><input type='checkbox' checked={allowRuntimeDownloads} onChange={(e)=>setAllowRuntimeDownloads(e.target.checked)} /> Allow runtime downloads (fetch/xhr/dynamic import)</label>
          </div>
          : <table><thead><tr><th>Name</th><th>Engine</th><th>Status</th><th>BuildId</th><th>Updated</th><th>Output</th><th>Actions</th></tr></thead>
          <tbody>{items.map((i)=><tr key={i.id}><td>{i.name}</td><td>{i.engine}</td><td>{i.status}</td><td>{i.buildId}</td><td>{i.updatedAt || i.lastBuildTime}</td><td>{i.outputPath}</td><td>
            <button onClick={()=>window.porter.openPath(i.outputPath)}>Open output</button> <button onClick={()=>window.porter.openPath(i.logPath)}>Open logs</button> <button onClick={()=>window.porter.openPath(i.zipPath)}>Export ZIP</button>
            <button onClick={async()=>{await window.porter.port({inputs:[i.sourcePath], selectedProfile:i.engine, contract: { allowExternal, allowRuntimeDownloads }}); refresh();}}>Rebuild</button> <button onClick={async()=>{await window.porter.deleteBuild(i.id); refresh();}}>Delete build</button>
            <select value={publishTarget} onChange={(e)=>setPublishTarget(e.target.value as any)}><option value='local'>local</option><option value='http'>http</option><option value='epicrobo'>epicrobo</option></select>
            <button onClick={async()=>{await window.porter.publish({id:i.id,target:publishTarget,options:{dest:'./site/games'}});}}>Publish</button>
          </td></tr>)}</tbody></table>}
      </section>
      <footer>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value='all'>all</option><option value='info'>info</option><option value='warn'>warn</option><option value='error'>error</option></select>
        <div className='logs'>{filteredLogs.map((l,idx)=><div key={idx} className={l.level}>[{l.level}] {l.message}</div>)}</div>
      </footer>
    </main>
  </div>;
};
