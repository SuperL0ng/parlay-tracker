const fs = require('fs');

const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

// Remove the previous always-on drag patch while preserving its corrected label logic below.
s = s.replace(/\n?\/\* BUILDER_FIXES_V6 \*\/\.grip\{[^\n]*\n?/g, '\n');
s = s.replace(/\/\* BUILDER_FIXES_V6 \*\/[\s\S]*?(?=<\/script>)/g, '');

const css = String.raw`
/* BUILDER_REORDER_MODE_V7 */
.legsTitleRow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}
.reorderToggle{display:none;width:auto;min-width:126px;padding:9px 11px;font-size:11px}
.reorderToggle.visible{display:inline-flex;align-items:center;justify-content:center}
.reorderToggle.active{background:linear-gradient(180deg,#f8fbff,#d7dee8 48%,#7e8a99);border-color:rgba(105,116,130,.65);color:#111820}
.leg .headControls{display:none}
body.reorderMode .leg{margin-top:10px;padding:11px 10px;border:1px solid rgba(255,255,255,.72);border-radius:10px;background:linear-gradient(180deg,rgba(250,252,255,.86),rgba(197,206,218,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.88),0 3px 8px rgba(0,0,0,.12);touch-action:none;-webkit-user-select:none;user-select:none;cursor:grab}
body.reorderMode .leg.straightInactive{opacity:1;filter:none}
body.reorderMode .leg > :not(.legHead){display:none!important}
body.reorderMode .legHead{margin:0;min-height:38px}
body.reorderMode .leg .headControls{display:flex}
body.reorderMode .leg .miniRemove,body.reorderMode .leg .grip{display:inline-flex!important}
body.reorderMode .leg .grip{cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
body.reorderMode .straightPick{display:none!important}
.reorderSummary{max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#66717f;font-size:11px;font-weight:750;letter-spacing:0;text-transform:none}
.leg.reorderDragging{opacity:.82!important;filter:none!important;position:relative;z-index:30;transform:scale(1.015);box-shadow:0 12px 24px rgba(0,0,0,.24)!important;cursor:grabbing}
.leg.reorderBefore{box-shadow:0 -4px 0 #c89232,inset 0 1px 0 rgba(255,255,255,.88),0 3px 8px rgba(0,0,0,.12)!important}
.reorderHint{display:none;margin:8px 0 2px;text-align:center;color:#596372;font-size:11px;font-weight:750;letter-spacing:.04em}
body.reorderMode .reorderHint{display:block}
`;

const js = String.raw`
/* BUILDER_REORDER_MODE_V7 */
let reorderMode = false;
let reorderLeg = null;
let reorderPointerId = null;

function legsArray(){return [...document.querySelectorAll('#legs > .leg')]}

function ensureReorderToolbar(){
  const legs = document.getElementById('legs');
  if(!legs) return;
  const card = legs.closest('.card');
  if(!card || document.getElementById('reorderLegsBtn')) return;
  const heading = card.querySelector(':scope > strong');
  const row = document.createElement('div');
  row.className = 'legsTitleRow';
  if(heading){heading.parentNode.insertBefore(row,heading);row.appendChild(heading)}
  else{row.innerHTML='<strong>LEGS</strong>';card.insertBefore(row,card.firstChild)}
  const btn = document.createElement('button');
  btn.id = 'reorderLegsBtn';
  btn.className = 'ghost reorderToggle';
  btn.type = 'button';
  btn.textContent = 'Reorder Legs';
  btn.addEventListener('click',()=>setReorderMode(!reorderMode));
  row.appendChild(btn);
  const hint = document.createElement('div');
  hint.className = 'reorderHint';
  hint.textContent = 'Drag a leg to move it. Use − to remove it.';
  row.insertAdjacentElement('afterend',hint);
}

function updateReorderSummaries(){
  legsArray().forEach((leg,i)=>{
    let summary = leg.querySelector('.reorderSummary');
    if(!summary){
      summary=document.createElement('span');
      summary.className='reorderSummary';
      leg.querySelector('.legHeadLeft')?.appendChild(summary);
    }
    const lbl=clean(leg.querySelector('.lbl')?.value);
    summary.textContent=lbl||('Leg '+(i+1));
  });
}

function applyReorderState(){
  ensureReorderToolbar();
  const legs=legsArray();
  const btn=document.getElementById('reorderLegsBtn');
  if(reorderMode&&legs.length<2) reorderMode=false;
  document.body.classList.toggle('reorderMode',reorderMode);
  if(btn){
    btn.classList.toggle('visible',legs.length>=2);
    btn.classList.toggle('active',reorderMode);
    btn.textContent=reorderMode?'Done':'Reorder Legs';
  }
  updateReorderSummaries();
  legs.forEach(leg=>{
    const remove=leg.querySelector('.miniRemove');
    const grip=leg.querySelector('.grip');
    if(remove) remove.classList.toggle('hide',!reorderMode||legs.length<2);
    if(grip) grip.classList.toggle('hide',!reorderMode||legs.length<2);
    leg.querySelectorAll('input,select,textarea,button').forEach(el=>{
      if(el.classList.contains('miniRemove')){el.disabled=!reorderMode;return}
      el.disabled=reorderMode;
    });
  });
  if(!reorderMode&&typeof updateStraightStates==='function') updateStraightStates();
}

function setReorderMode(on){
  reorderMode=Boolean(on)&&legsArray().length>=2;
  clearReorderDrag();
  applyReorderState();
}

function clearReorderTargets(){
  document.querySelectorAll('.leg.reorderBefore').forEach(x=>x.classList.remove('reorderBefore'));
}

function clearReorderDrag(){
  clearReorderTargets();
  if(reorderLeg) reorderLeg.classList.remove('reorderDragging');
  reorderLeg=null;
  reorderPointerId=null;
}

function startReorderDrag(e){
  if(!reorderMode) return;
  if(e.target.closest('.miniRemove')||e.target.closest('#reorderLegsBtn')) return;
  const leg=e.target.closest('#legs > .leg');
  if(!leg) return;
  e.preventDefault();
  reorderLeg=leg;
  reorderPointerId=e.pointerId;
  leg.classList.add('reorderDragging');
  leg.setPointerCapture?.(e.pointerId);
}

function continueReorderDrag(e){
  if(!reorderMode||!reorderLeg||e.pointerId!==reorderPointerId) return;
  e.preventDefault();
  const siblings=legsArray().filter(x=>x!==reorderLeg);
  clearReorderTargets();
  let before=null;
  for(const item of siblings){
    const r=item.getBoundingClientRect();
    if(before===null&&e.clientY<r.top+r.height/2) before=item;
  }
  if(before){
    before.classList.add('reorderBefore');
    document.getElementById('legs').insertBefore(reorderLeg,before);
  }else{
    document.getElementById('legs').appendChild(reorderLeg);
  }
}

function finishReorderDrag(e){
  if(!reorderLeg||e.pointerId!==reorderPointerId) return;
  e.preventDefault();
  clearReorderDrag();
  renumber();
  updateReorderSummaries();
  preview();
}

const originalAddLegV7=window.addLeg;
window.addLeg=function(){
  originalAddLegV7();
  requestAnimationFrame(()=>applyReorderState());
};
const originalRemoveLegV7=window.removeLeg;
window.removeLeg=function(btn){
  originalRemoveLegV7(btn);
  requestAnimationFrame(()=>applyReorderState());
};

const reorderObserver=new MutationObserver(()=>requestAnimationFrame(applyReorderState));
window.addEventListener('load',()=>{
  ensureReorderToolbar();
  applyReorderState();
  const legs=document.getElementById('legs');
  if(legs) reorderObserver.observe(legs,{childList:true});
});
document.addEventListener('pointerdown',startReorderDrag,{passive:false,capture:true});
document.addEventListener('pointermove',continueReorderDrag,{passive:false});
document.addEventListener('pointerup',finishReorderDrag,{passive:false});
document.addEventListener('pointercancel',finishReorderDrag,{passive:false});
`;

s = s.replace('</style>', css + '\n</style>');
s = s.replace('</script>', js + '\n</script>');
fs.writeFileSync(path, s);
