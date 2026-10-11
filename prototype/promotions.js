// Demo-only academic progression. All records and uploads remain in this tab's memory.
const academicStudents = [
  {id:'STU-2026-001',name:'Aarav Sharma',course:'B.Tech · CSE',studyYear:1,duration:4,academicYear:'2026–27',email:'student@example.edu',phone:'Demo student contact',guardian:'Demo guardian contact',mess:'North Campus Mess',allocation:{hostel:'Maple House',room:'A-204',bed:'02'},marksheet:null,documents:[],history:[]},
  {id:'STU-2026-002',name:'Rohan Mehta',course:'B.Tech · ECE',studyYear:2,duration:4,academicYear:'2026–27',email:'rohan@example.edu',phone:'Demo student contact',guardian:'Demo guardian contact',mess:'Central Mess',allocation:{hostel:'Maple House',room:'A-112',bed:'01'},marksheet:null,documents:[],history:[]},
  {id:'STU-2026-003',name:'Aditya Kumar',course:'B.Sc · Physics',studyYear:2,duration:3,academicYear:'2026–27',email:'aditya@example.edu',phone:'Demo student contact',guardian:'Demo guardian contact',mess:'Central Mess',allocation:{hostel:'Cedar House',room:'B-306',bed:'01'},marksheet:null,documents:[],history:[]},
  ...generatedStudents
];
const promotionAudit = [];
const currentStudent = () => academicStudents[0];
const studentById = id => academicStudents.find(s=>s.id===id);
function nextAcademicYear(year) { const start = Number(year.slice(0,4))+1; return start+'–'+String(start+1).slice(-2); }
function hostelInventory() {
  return [{name:'Maple House',total:280,otherOccupied:223,maintenance:8},{name:'Cedar House',total:240,otherOccupied:185,maintenance:4},{name:'Oak House',total:200,otherOccupied:136,maintenance:2}].map(h=>{
    const occupied=h.otherOccupied+academicStudents.filter(s=>s.allocation?.hostel===h.name).length;
    return {...h,occupied,available:h.total-occupied-h.maintenance};
  });
}
function roomInventory() {
  return [{hostel:'Maple House',room:'A-204',total:2,otherOccupied:0},{hostel:'Maple House',room:'A-112',total:2,otherOccupied:1},{hostel:'Cedar House',room:'B-306',total:2,otherOccupied:0}].map(r=>{
    const occupants=academicStudents.filter(s=>s.allocation?.hostel===r.hostel&&s.allocation?.room===r.room);
    const occupied=r.otherOccupied+occupants.length;
    return {...r,occupied,available:r.total-occupied,occupants};
  });
}
function roomCapacityTable() {
  return `<p class="muted">Sample room inventory. Promotion releases only the selected student's bed; other residents keep their allocation.</p>${table(['Hostel / Room','Capacity','Occupied','Available / empty','Room status'],roomInventory().map(r=>[r.hostel+' / '+r.room,r.total,r.occupied,r.available,badge(r.occupied===0?'Empty':r.available?'Partially occupied':'Occupied')]))}`;
}

function roomMapData() {
  const roomSet = new Map();
  // seed standard 25 rooms for each hostel
  const hostels = [
    {name:'Maple House', prefix:'A', rooms:25},
    {name:'Cedar House', prefix:'B', rooms:25},
    {name:'Oak House',   prefix:'C', rooms:25}
  ];
  hostels.forEach(h => {
    for (let i = 0; i < h.rooms; i++) {
      const room = `${h.prefix}-${100 * (1 + Math.floor(i / 9)) + 1 + (i % 9) + 10}`;
      roomSet.set(h.name + '|' + room, { hostel: h.name, room });
    }
  });
  // seed from roomInventory hardcoded rooms
  roomInventory().forEach(r => {
    const key = r.hostel + '|' + r.room;
    if (!roomSet.has(key)) roomSet.set(key, { hostel: r.hostel, room: r.room });
  });
  // add every student allocation room
  academicStudents.forEach(s => {
    if (s.allocation) {
      const key = s.allocation.hostel + '|' + s.allocation.room;
      if (!roomSet.has(key)) roomSet.set(key, { hostel: s.allocation.hostel, room: s.allocation.room });
    }
  });
  return Array.from(roomSet.values()).map(({ hostel, room }) => {
    const num = parseInt(room.replace(/[^0-9]/g, ''), 10);
    const floor = Math.floor(num / 100);
    const beds = ['01', '02'].map(bed => {
      const student = academicStudents.find(s =>
        s.allocation && s.allocation.hostel === hostel &&
        s.allocation.room === room && s.allocation.bed === bed
      ) || null;
      return { bed, student };
    });
    return { hostel, room, floor, beds };
  }).sort((a, b) => a.hostel.localeCompare(b.hostel) || a.floor - b.floor || a.room.localeCompare(b.room));
}
function promotionStatus(s) {
  if(s.studyYear>=s.duration)return 'Final year';
  if(s.marksheet)return s.marksheet.status;
  return s.history.length?'Promoted':'Not uploaded';
}
function promotionPage() {
  return `<div class="promotion-banner"><span class="icon-box">${icon('calendar')}</span><div><h3>Progress students. Release their beds.</h3><p>Review the current year's marksheet, verify eligibility, then confirm promotion. Student identity, course, contacts and mess preference stay the same. The previous allocation is archived.</p></div></div>${summary([['Marksheet reviews',academicStudents.filter(s=>s.marksheet?.status==='Pending').length,'Uploaded by students'],['Ready to promote',academicStudents.filter(s=>s.marksheet?.status==='Verified').length,'Admin verification complete'],['Promoted this session',promotionAudit.filter(a=>a.action==='Promoted').length,'Beds released immediately']])}${card('Student year promotion',table(['Student','Course / Year','Academic year','Current allocation','Marksheet','Action'],academicStudents.map(s=>[
    `<strong>${esc(s.name)}</strong><br><small>${s.id}</small>`,`${s.course}<br>Year ${s.studyYear} of ${s.duration}`,s.academicYear,s.allocation?`${s.allocation.hostel}<br>${s.allocation.room} · Bed ${s.allocation.bed}`:'Awaiting allocation',badge(promotionStatus(s)),s.marksheet?btn('Review marksheet','promotion-review:'+s.id,'small'):s.history.length?btn('View history','promotion-history:'+s.id,'small'):'<span class="muted">Awaiting student upload</span>'
  ])),link('Rooms & beds','Rooms & Beds'))}<div class="promotion-help"><strong>How to try it</strong><p>Switch to Student → Documents and upload a sample PDF, JPG or PNG marksheet. Then return to Admin → Year Promotion to review it. Files and changes reset when the page refreshes.</p></div>${card('Room capacity after promotion',roomCapacityTable())}`;
}
function studentDocumentsPage() {
  const s=currentStudent(),d=s.marksheet;
  return `<div class="promotion-banner"><span class="icon-box">${icon('file')}</span><div><h3>Your marksheet, your next step.</h3><p>Upload the marksheet for ${s.academicYear}, Year ${s.studyYear}. Your admin must verify it before promoting you to the next year.</p></div></div>${card('Academic marksheet',`<div class="document-summary"><div><strong>${d?esc(d.name):'No marksheet uploaded for this academic year'}</strong><p>${s.name} · ${s.id} · ${s.academicYear}</p>${d?badge(d.status):badge('Not uploaded')}${d?.note?'<p class="review-note">Admin feedback: '+esc(d.note)+'</p>':''}</div>${d?btn('View marksheet','marksheet-view:'+s.id,'small'):''}</div><form data-form="marksheet-upload" class="marksheet-upload"><div><label for="marksheet-file">${d?'Replace':'Upload'} marksheet for ${s.academicYear}</label><input id="marksheet-file" name="marksheet" type="file" accept=".pdf,.jpg,.jpeg,.png" required aria-describedby="marksheet-hint"><p id="marksheet-hint" class="field-help">PDF, JPG or PNG · Maximum 5 MB. Use a sample document for this demo. A replacement must be verified again.</p></div><button class="btn primary" type="submit">${icon('file')} ${d?'Replace marksheet':'Upload marksheet'}</button></form><p class="modal-note">Local preview only. The file stays in this browser tab and is not uploaded to a server.</p>`)}${s.documents.length?card('Previous academic marksheets',table(['Academic year','Study year','File','Status',''],s.documents.map((d,i)=>[d.academicYear,'Year '+d.studyYear,esc(d.name),badge('Archived'),btn('View','marksheet-archive:'+i,'small')]))):''}<div style="margin-top:20px">${card('Other documents',table(['Document','Verification'],[['College identity card',badge('Approved')],['Hostel application',badge('Pending')]]))}</div>`;
}
async function storeMarksheet(file) {
  if(role!=='Student')return {error:'Only the student can upload their marksheet.'};
  if(!file||!file.size)return {error:'Choose a marksheet file.'};
  if(file.size>5*1024*1024)return {error:'The marksheet must be 5 MB or smaller.'};
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const extension=file.name.split('.').pop().toLowerCase();
  if(!((pdf&&extension==='pdf')||(png&&extension==='png')||(jpg&&['jpg','jpeg'].includes(extension))))return {error:'Choose a valid PDF, JPG or PNG marksheet. The file content must match its extension.'};
  // Recheck role after the asynchronous file read.
  if(role!=='Student')return {error:'Return to the Student workspace to upload.'};
  const s=currentStudent();
  const old=s.marksheet;
  const type=pdf?'application/pdf':png?'image/png':'image/jpeg';
  s.marksheet={id:crypto.randomUUID(),name:file.name,url:URL.createObjectURL(new Blob([file],{type})),type,size:file.size,academicYear:s.academicYear,studyYear:s.studyYear,status:'Pending',viewedBy:null,verifiedBy:null,note:''};
  if(old)URL.revokeObjectURL(old.url);
  return {document:s.marksheet};
}
function documentPreview(d) {
  return `<div class="marksheet-preview">${d.type==='application/pdf'?`<object data="${d.url}" type="application/pdf" aria-label="Uploaded marksheet PDF"><p>Your browser cannot embed this PDF. Open the document below to review it.</p></object>`:`<img src="${d.url}" alt="Uploaded marksheet for academic review">`}</div><a class="btn small" href="${d.url}" target="_blank" rel="noopener">Open document in new tab ${icon('arrow')}</a>`;
}
function viewMarksheet(id) {
  const s=studentById(id);
  if(!s||!s.marksheet||!(role==='Admin'||role==='Student'&&s===currentStudent()))return toast('This marksheet is not available in this workspace.');
  modal('Uploaded marksheet',`<p>${esc(s.marksheet.name)} · ${s.marksheet.academicYear}</p>${documentPreview(s.marksheet)}`);
  document.querySelector('.modal')?.classList.add('promotion-modal');
}
function reviewMarksheet(id) {
  if(role!=='Admin')return toast('Only an admin can review marksheets.');
  const s=studentById(id),d=s?.marksheet;
  if(!d)return toast('The student must upload a marksheet first.');
  d.viewedBy=roles.Admin.name;
  modal('Review marksheet & eligibility',`<p><strong>${esc(s.name)}</strong> · ${s.id}<br>${s.course} · Year ${s.studyYear} · ${s.academicYear}</p><p>${esc(d.name)} ${badge(d.status)}</p>${documentPreview(d)}<p class="modal-note">Check the student's identity, academic year and result in the uploaded document. Verification is a manual admin decision; this demo does not assess marks automatically.</p>${d.status==='Verified'?`<p>Verified by ${esc(d.verifiedBy)}.</p>${btn('Continue to promotion','promotion-confirm:'+s.id,'primary')}`:`<form data-form="marksheet-review" data-student="${s.id}" data-document="${d.id}"><label class="review-checkbox"><input type="checkbox" name="reviewed" required> I have reviewed this marksheet and confirmed eligibility for the next year.</label><button type="submit" class="btn primary">Verify marksheet</button></form>${btn('Request corrected marksheet','marksheet-reject:'+s.id,'small')}`}`);
  document.querySelector('.modal')?.classList.add('promotion-modal');
}
function verifyMarksheet(id,documentId,confirmed) {
  if(role!=='Admin')return {error:'Only an admin can verify a marksheet.'};
  const s=studentById(id),d=s?.marksheet;
  if(!d||d.id!==documentId||d.academicYear!==s.academicYear||d.studyYear!==s.studyYear)return {error:'The marksheet changed. Reopen and review the current document.'};
  if(!confirmed||d.viewedBy!==roles.Admin.name)return {error:'Review the uploaded marksheet and confirm eligibility first.'};
  if(s.studyYear>=s.duration)return {error:'This student is in their final year. Use a separate completion workflow.'};
  d.status='Verified';d.verifiedBy=roles.Admin.name;d.note='';
  promotionAudit.unshift({action:'Marksheet verified',student:s.name,actor:roles.Admin.name,detail:s.academicYear,time:new Date().toLocaleString('en-IN')});
  return {document:d};
}
function confirmPromotion(id) {
  if(role!=='Admin')return toast('Only an admin can promote students.');
  const s=studentById(id),d=s?.marksheet;
  if(!d||d.status!=='Verified')return toast('Verify the uploaded marksheet before promotion.');
  modal('Promote student & release bed?',`<p><strong>${esc(s.name)}</strong> · ${s.id}</p><div class="promotion-comparison"><div><small>Current</small><strong>Year ${s.studyYear} · ${s.academicYear}</strong></div>${icon('arrow')}<div><small>After promotion</small><strong>Year ${s.studyYear+1} · ${nextAcademicYear(s.academicYear)}</strong></div></div><p>${s.allocation?`<strong>${s.allocation.hostel} / ${s.allocation.room} / Bed ${s.allocation.bed}</strong> will become available immediately. The previous allocation will remain in history.`:'This student has no current bed to release.'}</p><p>Student ID, name, course, contacts, guardian information, mess preference and existing records are retained. The student will await a new room allocation.</p><form data-form="promote-student" data-student="${s.id}" data-document="${d.id}"><label class="review-checkbox"><input type="checkbox" name="confirmed" required> Confirm next-year promotion and release the current bed.</label><button class="btn primary" type="submit">Confirm promotion & release bed</button></form><p class="modal-note">Demo changes apply to this tab only. No database is connected.</p>`);
}
function promoteStudent(id,documentId,confirmed) {
  if(role!=='Admin')return {error:'Only an admin can promote students.'};
  const s=studentById(id),d=s?.marksheet;
  if(!s||!confirmed)return {error:'Confirm the promotion before continuing.'};
  if(!d||d.id!==documentId||d.status!=='Verified'||!d.verifiedBy||d.academicYear!==s.academicYear||d.studyYear!==s.studyYear)return {error:'A verified marksheet for the current academic year is required.'};
  if(s.studyYear>=s.duration)return {error:'Final-year students require a completion workflow, not another year promotion.'};
  const entry={academicYear:s.academicYear,studyYear:s.studyYear,allocation:s.allocation?{...s.allocation}:null,marksheetId:d.id,promotedBy:roles.Admin.name,promotedAt:new Date().toISOString()};
  s.history.push(entry);
  s.documents.push({...d,status:'Archived'});
  s.studyYear+=1;s.academicYear=nextAcademicYear(s.academicYear);s.allocation=null;s.marksheet=null;
  if(s===currentStudent())quickPass=null;
  promotionAudit.unshift({action:'Promoted',student:s.name,actor:roles.Admin.name,detail:`Year ${entry.studyYear} → ${s.studyYear}; ${entry.allocation?entry.allocation.room+' / Bed '+entry.allocation.bed+' released':'no allocation to release'}`,time:new Date().toLocaleString('en-IN')});
  return {student:s,released:entry.allocation};
}
function promotionHistoryMarkup(s) {
  return s.history.length?table(['Academic year','Study year','Previous room / bed','Change'],s.history.map(h=>[h.academicYear,'Year '+h.studyYear,h.allocation?h.allocation.hostel+' / '+h.allocation.room+' / '+h.allocation.bed:'Unallocated','Promoted · bed released'])):'<p class="muted">No promotions recorded in this demo session.</p>';
}
function studentRoomPage() {
  const s=currentStudent(),a=s.allocation;
  return card(a?`${a.hostel} · ${a.room}`:'Awaiting new room allocation',`<div class="pass-details">${[['Bed',a?.bed||'Not allocated'],['Academic year',s.academicYear],['Study year','Year '+s.studyYear],['Preferred mess',s.mess]].map(([k,v])=>`<div><small>${k}</small><strong>${esc(v)}</strong></div>`).join('')}</div>${!a?'<p>Your previous bed was released after promotion. Your profile and mess preference are retained. The admin will allocate a bed separately.</p>':''}`,btn('Contact hostel office','office','small'))+`<div style="margin-top:20px">${card('Previous allocations',promotionHistoryMarkup(s))}</div>`;
}
function promotionAuditMarkup() {
  return table(['Action','Student','Details','Admin','Time'],promotionAudit.map(a=>[a.action,esc(a.student),esc(a.detail),esc(a.actor),a.time]));
}
function promotionAction(kind,id) {
  if(kind==='marksheet-view')return viewMarksheet(id);
  if(kind==='promotion-review')return reviewMarksheet(id);
  if(kind==='promotion-confirm')return confirmPromotion(id);
  if(kind==='marksheet-archive'){
    if(role!=='Student')return toast('This document is not available in this workspace.');
    const d=currentStudent().documents[Number(id)];
    if(!d)return;
    modal('Archived marksheet',`<p>${esc(d.name)} · ${d.academicYear}</p>${documentPreview(d)}`);
    document.querySelector('.modal')?.classList.add('promotion-modal');
    return;
  }
  if(kind==='promotion-history'){
    const s=studentById(id);
    if(!s||role!=='Admin')return;
    return modal('Promotion history — '+esc(s.name),promotionHistoryMarkup(s));
  }
  if(kind==='marksheet-reject'){
    const s=studentById(id),d=s?.marksheet;
    if(role!=='Admin'||!d)return;
    modal('Request a corrected marksheet',`<p>${esc(s.name)} · ${s.academicYear}</p><form data-form="marksheet-correction" data-student="${s.id}" data-document="${d.id}"><div><label for="correction-note">What needs correcting?</label><textarea id="correction-note" name="note" required maxlength="500" placeholder="Explain what the student should correct or upload again"></textarea></div><button class="btn primary" type="submit">Send correction request</button></form>`);
  }
}
async function handlePromotionSubmit(form,data) {
  const type=form.dataset.form;
  if(!['marksheet-upload','marksheet-review','marksheet-correction','promote-student'].includes(type))return false;
  if(type==='marksheet-upload'){
    const button=form.querySelector('button[type="submit"]');
    if(button){button.disabled=true;button.textContent='Reading marksheet…';}
    try{
      const result=await storeMarksheet(data.marksheet);
      if(result.error)toast(result.error);
      else{dashboard();toast('Marksheet added to the demo admin review queue.');}
    }catch{toast('The file could not be read. Please choose it again.');}
    finally{if(button){button.disabled=false;button.textContent='Upload marksheet';}}
    return true;
  }
  const id=form.dataset.student,documentId=form.dataset.document;
  if(type==='marksheet-review'){
    const result=verifyMarksheet(id,documentId,!!data.reviewed);
    if(result.error){toast(result.error);return true;}
    close();dashboard();confirmPromotion(id);return true;
  }
  if(type==='marksheet-correction'){
    const s=studentById(id),d=s?.marksheet;
    if(role!=='Admin'||!d||d.id!==documentId){toast('Reopen the current marksheet before requesting a correction.');return true;}
    if(!data.note?.trim()){toast('Explain what needs correcting.');return true;}
    d.status='Correction required';d.note=data.note.trim();d.verifiedBy=null;
    promotionAudit.unshift({action:'Correction requested',student:s.name,actor:roles.Admin.name,detail:s.academicYear,time:new Date().toLocaleString('en-IN')});
    close();dashboard();toast('Correction request is now visible in Student Documents.');return true;
  }
  const result=promoteStudent(id,documentId,!!data.confirmed);
  if(result.error){toast(result.error);return true;}
  close();dashboard();toast('Student promoted. '+(result.released?'Previous bed is now available.':'Student remains awaiting allocation.'));
  return true;
}
