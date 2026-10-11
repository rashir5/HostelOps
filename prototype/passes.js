// Frontend-only pass preview. Real credentials and time checks must be issued by a server.
const QUICK_POLICY = { startHour: 5, endHour: 22, ttlMinutes: 10, timeZone: 'Asia/Kolkata' };
let quickPass = null;
let quickHistory = [];
function quickWindow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: QUICK_POLICY.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(p => [p.type, p.value]));
  const seconds = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  const open = seconds >= QUICK_POLICY.startHour * 3600 && seconds < QUICK_POLICY.endHour * 3600;
  return { open, seconds, date: `${parts.year}-${parts.month}-${parts.day}`,
    closesAt: now.getTime() + (QUICK_POLICY.endHour * 3600 - seconds) * 1000 - now.getMilliseconds() };
}
function quickIsValid(now = new Date()) {
  return !!quickPass && quickWindow(now).open && now.getTime() < quickPass.expiresAt;
}
function passClock(ms) {
  return new Intl.DateTimeFormat('en-IN', {timeZone: QUICK_POLICY.timeZone, hour:'numeric', minute:'2-digit'}).format(new Date(ms));
}
function passChoices() {
  const open = quickWindow().open;
  return `<div class="pass-choices"><article class="pass-option quick-option"><div class="pass-option-top"><span class="pass-type-icon">${icon('qr')}</span><span class="badge ${open?'available':'pending'}" data-quick-status>${open?'Window open':'Window closed'}</span></div><span class="eyebrow">EVERYDAY CAMPUS MOVEMENT</span><h3>Quick Pass</h3><p>Heading out or coming back? Generate your entry or exit QR in a few seconds.</p><div class="pass-rule">${icon('clock')} <strong>5:00 AM – 10:00 PM</strong><span>India time</span></div>${btn('Open Quick Pass '+icon('arrow'),'quick-pass','primary')}</article><article class="pass-option long-option"><div class="pass-option-top"><span class="pass-type-icon">${icon('pass')}</span><span class="badge pending">Warden approval</span></div><span class="eyebrow">PLANNED LEAVE & LONGER STAYS</span><h3>Long Pass</h3><p>Going home or staying away longer? Share your leave dates and request approval.</p><div class="pass-rule">${icon('calendar')} <strong>Scheduled departure & return</strong></div>${btn('Request Long Pass '+icon('arrow'),'long-pass')}</article></div>`;
}
function openQuickPass() {
  const state = quickWindow();
  modal('Your everyday gate pass', `<span class="eyebrow">QUICK PASS · ENTRY / EXIT</span><p>Available daily from <strong>5:00 AM to 10:00 PM IST</strong>. No long-leave approval is needed in this demo.</p><div class="quick-window-info" id="quick-window-info">${state.open?'The generation window is open. Choose your movement below.':'The generation window is closed. You can generate a QR again at 5:00 AM IST.'}</div><form data-form="quick-pass"><fieldset class="movement-choice"><legend>What would you like to do?</legend><label><input type="radio" name="movement" value="Exit" checked>${icon('out')} Exit hostel</label><label><input type="radio" name="movement" value="Entry">${icon('home')} Enter hostel</label></fieldset><button id="generate-quick" class="btn primary" type="submit" ${state.open?'':'disabled'}>${icon('qr')} Generate demo QR</button></form><div id="quick-result">${quickIsValid()?quickQRMarkup():''}</div><p class="modal-note">Demo QR only — not valid at a real gate. The QR lasts up to 10 minutes and never beyond 10 PM IST. Refreshing clears it. Actual access requires server verification.</p>`);
  document.querySelector('.modal')?.classList.add('quick-pass-modal');
}
function createQuickPass(movement, now = new Date()) {
  if (role !== 'Student') return { error: 'Quick Pass is only available in the Student workspace.' };
  if(!currentStudent().allocation)return {error:'A new room allocation is required before generating a Quick Pass.'};
  const state = quickWindow(now);
  if (!state.open) return { error: 'Quick Pass generation is available from 5:00 AM to 10:00 PM IST.' };
  if (!['Entry','Exit'].includes(movement)) return { error: 'Choose Entry or Exit.' };
  const pass = {id: crypto.randomUUID(), movement, issuedAt: now.getTime(),
    expiresAt: Math.min(now.getTime() + QUICK_POLICY.ttlMinutes * 60000, state.closesAt)};
  quickPass = pass;
  quickHistory.unshift(pass);
  quickHistory = quickHistory.slice(0, 5);
  return { pass };
}
function quickQRMarkup() {
  if (!quickPass) return '';
  const qr = qrcode(0, 'M');
  qr.addData(JSON.stringify({demo:true,type:'quick-pass',id:quickPass.id,movement:quickPass.movement,expiresAt:quickPass.expiresAt}));
  qr.make();
  return `<div class="qr-ticket"><div class="qr-ticket-heading"><strong>${quickPass.movement} · Quick Pass</strong><span class="badge pending">Demo only</span></div><div id="quick-qr-image" class="qr-image" role="img" aria-label="Demo ${quickPass.movement.toLowerCase()} QR code, not a real gate credential">${qr.createSvgTag({cellSize:4,margin:16,scalable:true})}</div><div class="qr-ticket-details"><span>Issued <strong>${passClock(quickPass.issuedAt)}</strong></span><span>Expires <strong>${passClock(quickPass.expiresAt)} IST</strong></span></div><p id="quick-expiry" role="status">Demo QR ready. Show this preview to explore the flow.</p><small>Creating another QR replaces this preview. Generation does not record a gate movement.</small></div>`;
}
function refreshQuickUI() {
  const longClock=document.getElementById('long-pass-clock');
  if(longClock)longClock.textContent=longPassClock();
  const open = quickWindow().open;
  document.querySelectorAll('[data-quick-status]').forEach(el => {el.textContent = open?'Window open':'Window closed';el.className='badge '+(open?'available':'pending');});
  const generate = document.getElementById('generate-quick');
  if(generate) generate.disabled = !open;
  const info = document.getElementById('quick-window-info');
  if(info) info.textContent = open?'The generation window is open. Choose your movement below.':'The generation window is closed. You can generate a QR again at 5:00 AM IST.';
  const status = document.getElementById('quick-expiry');
  if(!status || !quickPass) return;
  const valid = quickIsValid();
  const seconds = Math.max(0,Math.ceil((quickPass.expiresAt-Date.now())/1000));
  const remaining = Math.ceil(seconds/60);
  status.textContent = valid?`Expires in ${remaining} ${remaining===1?'minute':'minutes'} · Demo only`:'Expired — generate a new Quick Pass during allowed hours.';
  const image = document.getElementById('quick-qr-image');
  if(!valid && image) image.innerHTML = '<div class="expired-qr">'+icon('clock')+'<strong>QR expired</strong><span>Generate a new pass to continue.</span></div>';
}
function openLongPass() {
  const now=new Date(),minimum=localDateTime(new Date(Math.floor(now.getTime()/60000)*60000+60000));
  const suggested=localDateTime(new Date(now.getTime()+30*60000));
  formModal('Plan your time away', 'pass', `<span class="eyebrow">LONG PASS · WARDEN APPROVAL</span><p class="form-description">Use this for planned leave or an overnight stay. Your warden will review the request.</p><div class="quick-window-info"><strong id="long-pass-clock">${esc(longPassClock())}</strong><p class="field-help">Dates use your device timezone. Choose a departure later than now, not the sample dates shown on the dashboard. We suggest 30 minutes from now; you can change it.</p></div>${field('reason','Reason for leave')}${field('destination','Destination')}${field('contact','Contact number during leave','tel')}${field('departure','Departure','datetime-local',`min="${minimum}" value="${suggested}" aria-describedby="long-pass-error"`)}${field('return','Expected return','datetime-local',`min="${localDateTime(new Date(new Date(suggested).getTime()+60000))}" aria-describedby="long-pass-error"`)}<p id="long-pass-error" class="form-error" role="alert" hidden></p>`, 'Send Long Pass request');
}
function localDateTime(date) {
  const pad=n=>String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function longPassClock(now=new Date()) {
  return 'Current device time: '+new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(now)+' · '+Intl.DateTimeFormat().resolvedOptions().timeZone;
}
function validateLongPassDates(departure,expectedReturn,now=new Date()) {
  const start=new Date(departure),end=new Date(expectedReturn);
  if(!Number.isFinite(start.getTime()))return {field:'departure',message:'Choose a complete departure date and time.'};
  if(start<=now)return {field:'departure',message:'Departure must be later than now. '+longPassClock(now)+'. Choose a later time, or check your device clock if this looks wrong.'};
  if(!Number.isFinite(end.getTime()))return {field:'return',message:'Choose a complete expected return date and time.'};
  if(end<=start)return {field:'return',message:'Expected return must be later than your selected departure.'};
  return null;
}
function showLongPassError(error,focus=true) {
  const message=document.getElementById('long-pass-error');
  if(message){message.hidden=false;message.textContent=error.message;}
  const input=document.getElementById('f-'+error.field);
  if(input){input.setAttribute('aria-invalid','true');if(focus)input.focus();}
}
document.addEventListener('input',event=>{
  if(!event.target.closest('form[data-form="pass"]'))return;
  if(!['f-departure','f-return'].includes(event.target.id))return;
  document.getElementById('f-departure')?.removeAttribute('aria-invalid');
  document.getElementById('f-return')?.removeAttribute('aria-invalid');
  const message=document.getElementById('long-pass-error');if(message)message.hidden=true;
  if(event.target.id==='f-departure'&&Number.isFinite(new Date(event.target.value).getTime())){
    document.getElementById('f-return').min=localDateTime(new Date(new Date(event.target.value).getTime()+60000));
  }
});
document.addEventListener('invalid',event=>{
  if(!event.target.closest('form[data-form="pass"]'))return;
  if(!['f-departure','f-return'].includes(event.target.id))return;
  const error=validateLongPassDates(document.getElementById('f-departure').value,document.getElementById('f-return').value);
  if(error)showLongPassError(error,false);
},true);
function studentPassPage() {
  return passChoices()+`<div class="stack">${card('My Long Pass requests',table(['Pass type','Reason','Departure','Expected return','Status'],passes.filter(p=>p.name==='Aarav Sharma').map(p=>['Long Pass',esc(p.reason),esc(p.departure),esc(p.return),badge(p.status)])))}${card('Recent Quick Pass previews',quickHistory.length?table(['Movement','Generated','Expires','Status'],quickHistory.map(p=>[p.movement,passClock(p.issuedAt),passClock(p.expiresAt),badge(p===quickPass&&quickIsValid()?'Available':'Expired')])):'<p class="muted">No Quick Pass generated in this session. Open Quick Pass above to begin.</p>')}<p class="demo-notice">QR generation history is separate from verified gate entry / exit records.</p></div>`;
}
