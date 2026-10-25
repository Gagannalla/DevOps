const $ = id => document.getElementById(id);
const toast = msg => { const el=$('toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); };
async function request(path, options={}) {
  const res = await fetch(path, {headers:{'Content-Type':'application/json'},...options});
  if(!res.ok) { const body=await res.text(); throw new Error(body || `HTTP ${res.status}`); }
  return res.status===204 ? null : res.json();
}
function setStatus(id, ok, label) { const el=$(id); el.textContent=label || (ok?'ONLINE':'OFFLINE'); el.className='status '+(ok?'':'bad'); }
async function refreshHealth() {
  try {
    const [inc, task] = await Promise.all([
      request('/api/health/incidents'),
      request('/api/health/tasks')
    ]);
    const incidentOk = !!inc.service && !!inc.database && !!inc.redis;
    const taskOk = !!task.service && !!task.database;
    setStatus('incidents-status',incidentOk,'API '+(incidentOk?'UP':'DOWN'));
    setStatus('tasks-status',taskOk,'API '+(taskOk?'UP':'DOWN'));
    setStatus('db-status',!!inc.database && !!task.database,'DB '+(inc.database&&task.database?'UP':'DOWN'));
    setStatus('cache-status',!!inc.redis,'CACHE '+(inc.redis?'UP':'DOWN'));
    const ok=incidentOk&&taskOk;
    $('overall').textContent=ok?'ALL SYSTEMS GO':'DEGRADED';
    $('overall').style.color=ok?'var(--cyan)':'#ff8585';
    $('last-check').textContent='Checked '+new Date().toLocaleTimeString();
  } catch(e) {
    ['incidents-status','tasks-status','db-status','cache-status'].forEach(id=>setStatus(id,false,'UNREACHABLE'));
    $('overall').textContent='API OFFLINE'; $('last-check').textContent='Could not reach gateway';
  }
}
async function loadIncidents() {
  try {
    const rows=await request('/api/incidents');
    $('incident-count').textContent=`${rows.length} RECORD${rows.length===1?'':'S'}`;
    $('incidents-list').innerHTML=rows.length?rows.map(x=>`<div class="record"><div class="record-main"><b>${esc(x.title)}</b><small>#${x.id} · ${esc(new Date(x.created_at).toLocaleString())}</small></div><span class="tag ${esc(x.severity)}">${esc(x.severity)}</span><button class="btn secondary" data-delete-incident="${x.id}" aria-label="Delete incident">×</button></div>`).join(''):'<div class="empty">No incidents. That is a good day. Create one to test the API.</div>';
  } catch(e) { $('incidents-list').innerHTML='<div class="empty">Incident API unavailable. Check Docker logs.</div>'; }
}
async function loadTasks() {
  try {
    const rows=await request('/api/tasks');
    $('task-count').textContent=`${rows.length} TASK${rows.length===1?'':'S'}`;
    $('tasks-list').innerHTML=rows.length?rows.map(x=>`<div class="record ${x.done?'done':''}"><input class="check" type="checkbox" data-toggle-task="${x.id}" ${x.done?'checked':''} aria-label="Mark task complete"><div class="record-main"><b>${esc(x.title)}</b><small>#${x.id} · ${x.done?'COMPLETED':'IN PROGRESS'}</small></div><button class="btn secondary" data-delete-task="${x.id}" aria-label="Delete task">×</button></div>`).join(''):'<div class="empty">Your mission list is empty. Add a task to begin.</div>';
  } catch(e) { $('tasks-list').innerHTML='<div class="empty">Task API unavailable. Check Docker logs.</div>'; }
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('incident-form').addEventListener('submit',async e=>{e.preventDefault();try{await request('/api/incidents',{method:'POST',body:JSON.stringify({title:$('incident-title').value.trim(),severity:$('severity').value})});$('incident-title').value='';toast('Incident created');await loadIncidents();refreshHealth();}catch(err){toast('Could not create incident: '+err.message)}});
$('task-form').addEventListener('submit',async e=>{e.preventDefault();try{await request('/api/tasks',{method:'POST',body:JSON.stringify({title:$('task-title').value.trim()})});$('task-title').value='';toast('Task added');await loadTasks();}catch(err){toast('Could not add task: '+err.message)}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-delete-incident],[data-delete-task]');if(!b)return;try{if(b.dataset.deleteIncident){await request('/api/incidents/'+b.dataset.deleteIncident,{method:'DELETE'});await loadIncidents();toast('Incident deleted')}else{await request('/api/tasks/'+b.dataset.deleteTask,{method:'DELETE'});await loadTasks();toast('Task deleted')}}catch(err){toast('Action failed: '+err.message)}});
document.addEventListener('change',async e=>{if(e.target.matches('[data-toggle-task]')){try{await request('/api/tasks/'+e.target.dataset.toggleTask,{method:'PATCH',body:JSON.stringify({done:e.target.checked})});await loadTasks()}catch(err){toast('Could not update task')}}});
$('refresh').addEventListener('click',()=>{refreshHealth();loadIncidents();loadTasks();});
async function boot(){await Promise.all([refreshHealth(),loadIncidents(),loadTasks()]);}
boot();setInterval(refreshHealth,15000);
