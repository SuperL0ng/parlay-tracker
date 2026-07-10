const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

for (const v of ['V7','V8','V9','V10','V11']) {
  s = s.replace(new RegExp('/\\* BUILDER_REORDER_MODE_' + v + ' \\*/[\\s\\S]*?(?=<\\/style>)','g'), '');
  s = s.replace(new RegExp('/\\* BUILDER_REORDER_MODE_' + v + ' \\*/[\\s\\S]*?(?=<\\/script>)','g'), '');
}

const css = String.raw`
/* BUILDER_REORDER_MODE_V11 */
.legsTitleRow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}
.reorderToggle{display:none;width:auto;min-width:126px;padding:9px 11px;font-size:11px}
.reorderToggle.visible{display:inline-flex;align-items:center;justify-content:center}
.reorderToggle.active{background:linear-gradient(180deg,#f8fbff,#d7dee8 48%,#7e8a99);border-color:rgba(105,116,130,.65);color:#111820}
.leg .headControls{display:flex;align-items:center;justify-content:flex-end;gap:14px}
.leg .grip{display:none}
.leg .miniRemove{display:none;width:42px;height:34px;padding:0}
.leg .miniRemove.preReorderVisible{display:inline-flex}
body:not(.reorderMode) #legs>.leg{margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.8);border-radius:10px;background:linear-gradient(180deg,rgba(252,253,255,.78),rgba(181,192,207,.64));box-shadow:inset 0 1px 0 rgba(255,255,255,.92),0 3px 9px rgba(0,0,0,.14)}
body:not(.reorderMode) #legs>.leg+.leg{margin-top:14px}
body.reorderMode .leg{margin-top:10px;padding:11px 10px;border:1px solid rgba(255,255,255,.72);border-radius:10px;background:linear-gradient(180deg,rgba(250,252,255,.86),rgba(197,206,218,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.88),0 3px 8px rgba(0,0,0,.12);touch-action:pan-y;-webkit-user-select:none;user-select:none}
body.reorderMode .leg.straightInactive{opacity:1;filter:none}
body.reorderMode .leg > :not(.legHead){display:none!important}
body.reorderMode .legHead{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr);align-items:center;gap:0;margin:0;min-height:44px}
body.reorderMode .legHeadLeft{grid-column:1;min-width:0;padding-right:8px}
body.reorderMode .leg .headControls{display:contents}
body.reorderMode .leg .grip{display:inline-flex!important;grid-column:2;justify-self:center;width:84px;height:38px;cursor:grab;touch-action:pan-y;-webkit-user-select:none;user-select:none}
body.reorderMode .leg .miniRemove{display:inline-flex!important;position:absolute;right:0;top:50%;transform:translateY(-50%);width:65px;height:38px;padding:0 6px;font-size:9px}
body.reorderMode .straightPick{display:none!important}
.reorderSummary{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#66717f;font-size:11px;font-weight:750;letter-spacing:0;text-transform:none}
.leg.reorderDragging{opacity:.84!important;filter:none!important;position:relative;z-index:30;transform:scale(1.015);box-shadow:0 12px 24px rgba(0,0,0,.24)!important}
body.reorderDraggingActive{overflow:hidden!important;overscroll-behavior:none;touch-action:none}
body.reorderDraggingActive .leg{touch-action:none!important}
body.reorderDraggingActive .grip{cursor:grabbing!important;touch-action:none!important}
.leg.reorderBefore{box-shadow:0 -4px 0 #c89232,inset 0 1px 0 rgba(255,255,255,.88),0 3px 8px rgba(0,0,0,.12)!important}
.reorderHint{display:none;margin:8px 0 2px;text-align:center;color:#596372;font-size:11px;font-weight:750;letter-spacing:.04em}
body.reorderMode .reorderHint{display:block}
`;

const js = String.raw`
/* BUILDER_REORDER_MODE_V11 */
let reorderMode=false;
let reorderLeg=null;
let reorderPointerId=null;
let reorderHoldTimer=null;
let reorderPending=null;
let reorderLockedScrollY=0;
const REORDER_HOLD_MS=280;
const REORDER_MOVE_TOLERANCE=10;
function legsArray(){return [...document.querySelectorAll('#legs > .leg')]}
function ensureReorderToolbar(){const legs=document.getElementById('legs');if(!legs)return;const card=legs.closest('.card');if(!card||document.getElementById('reorderLegsBtn'))return;const heading=card.querySelector(':scope > strong');const row=document.createElement('div');row.className='legsTitleRow';if(heading){heading.parentNode.insertBefore(row,heading);row.appendChild(heading)}else{row.innerHTML='<strong>LEGS</strong>';card.insertBefore(row,card.firstChild)}const btn=document.createElement('button');btn.id='reorderLegsBtn';btn.className='ghost reorderToggle';btn.type='button';btn.textContent='Reorder Legs';btn.addEventListener('click',()=>setReorderMode(!reorderMode));row.appendChild(btn);const hint=document.createElement('div');hint.className='reorderHint';hint.textContent='Hold any leg briefly, then drag. Use Remove to delete a leg.';row.insertAdjacentElement('afterend',hint)}
function updateReorderSummaries(){legsArray().forEach((leg,i)=>{let summary=leg.querySelector('.reorderSummary');if(!summary){summary=document.createElement('span');summary.className='reorderSummary';leg.querySelector('.legHeadLeft')?.appendChild(summary)}const lbl=clean(leg.querySelector('.lbl')?.value);summary.textContent=lbl||('Leg '+(i+1))})}
function applyReorderState(){ensureReorderToolbar();const legs=legsArray();const btn=document.getElementById('reorderLegsBtn');if(reorderMode&&legs.length<2)reorderMode=false;document.body.classList.toggle('reorderMode',reorderMode);if(btn){btn.classList.toggle('visible',legs.length>=2);btn.classList.toggle('active',reorderMode);btn.textContent=reorderMode?'Done':'Reorder Legs'}updateReorderSummaries();legs.forEach(leg=>{const remove=leg.querySelector('.miniRemove');const grip=leg.querySelector('.grip');if(remove){remove.classList.remove('hide');remove.classList.toggle('preReorderVisible',!reorderMode&&legs.length>=2);remove.disabled=false;remove.textContent=reorderMode?'Remove':'−';remove.setAttribute('aria-label','Remove leg')}if(grip){grip.classList.toggle('hide',!reorderMode||legs.length<2);grip.textContent='≡';grip.setAttribute('aria-label','Reorder leg')}leg.querySelectorAll('input,select,textarea,button').forEach(el=>{if(el.classList.contains('miniRemove'))return;el.disabled=reorderMode})});if(!reorderMode&&typeof updateStraightStates==='function')updateStraightStates()}
function setReorderMode(on){reorderMode=Boolean(on)&&legsArray().length>=2;cancelPendingReorder();clearReorderDrag();applyReorderState()}
function clearReorderTargets(){document.querySelectorAll('.leg.reorderBefore').forEach(x=>x.classList.remove('reorderBefore'))}
function cancelPendingReorder(){if(reorderHoldTimer)clearTimeout(reorderHoldTimer);reorderHoldTimer=null;reorderPending=null}
function lockReorderScroll(){reorderLockedScrollY=window.scrollY||document.documentElement.scrollTop||0;document.body.style.position='fixed';document.body.style.top=(-reorderLockedScrollY)+'px';document.body.style.left='0';document.body.style.right='0';document.body.style.width='100%';document.body.classList.add('reorderDraggingActive')}
function unlockReorderScroll(){document.body.classList.remove('reorderDraggingActive');document.body.style.position='';document.body.style.top='';document.body.style.left='';document.body.style.right='';document.body.style.width='';window.scrollTo(0,reorderLockedScrollY)}
function clearReorderDrag(){clearReorderTargets();if(reorderLeg)reorderLeg.classList.remove('reorderDragging');if(document.body.classList.contains('reorderDraggingActive'))unlockReorderScroll();reorderLeg=null;reorderPointerId=null}
function startReorderDrag(e){if(!reorderMode||(e.pointerType==='mouse'&&e.button!==0))return;if(e.target.closest('.miniRemove'))return;const leg=e.target.closest('#legs > .leg');if(!leg)return;cancelPendingReorder();reorderPending={leg,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY};reorderHoldTimer=setTimeout(()=>{if(!reorderPending)return;reorderLeg=reorderPending.leg;reorderPointerId=reorderPending.pointerId;lockReorderScroll();reorderLeg.classList.add('reorderDragging');reorderLeg.setPointerCapture?.(reorderPointerId);reorderPending=null;reorderHoldTimer=null},REORDER_HOLD_MS)}
function continueReorderDrag(e){if(reorderPending&&e.pointerId===reorderPending.pointerId){const dx=e.clientX-reorderPending.startX,dy=e.clientY-reorderPending.startY;if(Math.hypot(dx,dy)>REORDER_MOVE_TOLERANCE)cancelPendingReorder();return}if(!reorderMode||!reorderLeg||e.pointerId!==reorderPointerId)return;e.preventDefault();const siblings=legsArray().filter(x=>x!==reorderLeg);clearReorderTargets();let before=null;for(const item of siblings){const r=item.getBoundingClientRect();if(before===null&&e.clientY<r.top+r.height/2)before=item}if(before){before.classList.add('reorderBefore');document.getElementById('legs').insertBefore(reorderLeg,before)}else document.getElementById('legs').appendChild(reorderLeg)}
function finishReorderDrag(e){if(reorderPending&&e.pointerId===reorderPending.pointerId){cancelPendingReorder();return}if(!reorderLeg||e.pointerId!==reorderPointerId)return;e.preventDefault();clearReorderDrag();renumber();updateReorderSummaries();preview()}
function blockTouchScrollWhileDragging(e){if(reorderLeg)e.preventDefault()}
const originalAddLegV11=window.addLeg;window.addLeg=function(){originalAddLegV11();requestAnimationFrame(()=>applyReorderState())};
const originalRemoveLegV11=window.removeLeg;window.removeLeg=function(btn){originalRemoveLegV11(btn);requestAnimationFrame(()=>applyReorderState())};
const reorderObserverV11=new MutationObserver(()=>requestAnimationFrame(applyReorderState));
window.addEventListener('load',()=>{ensureReorderToolbar();applyReorderState();const legs=document.getElementById('legs');if(legs)reorderObserverV11.observe(legs,{childList:true})});
document.addEventListener('pointerdown',startReorderDrag,{passive:true,capture:true});
document.addEventListener('pointermove',continueReorderDrag,{passive:false});
document.addEventListener('pointerup',finishReorderDrag,{passive:false});
document.addEventListener('pointercancel',finishReorderDrag,{passive:false});
document.addEventListener('touchmove',blockTouchScrollWhileDragging,{passive:false});
`;

s = s.replace('</style>', css + '\n</style>');
s = s.replace('</script>', js + '\n</script>');
if(!s.includes('BUILDER_REORDER_MODE_V11')) throw new Error('V11 patch was not applied');
fs.writeFileSync(path, s);