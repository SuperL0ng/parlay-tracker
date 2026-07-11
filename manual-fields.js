/* MANUAL_LEG_FIELDS_V26 */
(() => {
  'use strict';

  const numberOrText=value=>{
    const text=String(value??'').trim();
    if(text==='')return '';
    const number=Number(text);
    return Number.isFinite(number)?number:text;
  };

  function ensureManualFields(leg){
    if(!leg)return;
    let box=leg.querySelector('.manualProgressBox');
    if(!box){
      box=document.createElement('div');
      box.className='manualProgressBox full hide';
      box.innerHTML=`<div class="grid2"><div><label>Current</label><input class="manualCurrent" inputmode="decimal" value="0"></div><div><label>Target</label><input class="manualTarget" inputmode="decimal" value="1"></div></div>`;
      const labelBox=leg.querySelector('.labelBox');
      if(labelBox)labelBox.parentNode.insertBefore(box,labelBox);
      else leg.appendChild(box);
      box.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>window.preview?.()));
    }
    const manual=leg.querySelector('.ltype')?.value==='manual';
    box.classList.toggle('hide',!manual);
    if(manual){
      const current=box.querySelector('.manualCurrent');
      const target=box.querySelector('.manualTarget');
      if(current&&!String(current.value).trim())current.value='0';
      if(target&&!String(target.value).trim())target.value='1';
    }
  }

  function ensureAll(){document.querySelectorAll('#legs > .leg').forEach(ensureManualFields)}

  const originalRawTicket=window.rawTicket;
  if(typeof originalRawTicket==='function'){
    window.rawTicket=function(){
      const ticket=originalRawTicket();
      const elements=typeof window.includedLegElements==='function'?window.includedLegElements():[...document.querySelectorAll('#legs > .leg')];
      ticket.legs.forEach((leg,index)=>{
        if(leg.type!=='manual')return;
        const element=elements[index];
        ensureManualFields(element);
        const current=numberOrText(element?.querySelector('.manualCurrent')?.value);
        const target=numberOrText(element?.querySelector('.manualTarget')?.value);
        leg.current=current===''?0:current;
        leg.target=target===''?1:target;
      });
      return ticket;
    };
  }

  const originalCanonicalTicket=window.canonicalTicket;
  if(typeof originalCanonicalTicket==='function'){
    window.canonicalTicket=function(){
      const output=originalCanonicalTicket();
      const raw=window.rawTicket();
      raw.legs.forEach((leg,index)=>{
        if(leg.type==='manual'&&output.legs[index]){
          output.legs[index].current=leg.current;
          output.legs[index].target=leg.target;
        }
      });
      return output;
    };
  }

  const originalPreview=window.preview;
  if(typeof originalPreview==='function'){
    window.preview=function(){
      originalPreview();
      const raw=window.rawTicket();
      const rows=[...document.querySelectorAll('#preview .pline')];
      raw.legs.forEach((leg,index)=>{
        if(leg.type!=='manual'||!rows[index])return;
        const value=rows[index].lastElementChild;
        if(value)value.textContent=`${leg.current} / ${leg.target}`;
      });
    };
  }

  const originalLoadRecord=window.loadRecordIntoBuilder;
  if(typeof originalLoadRecord==='function'){
    window.loadRecordIntoBuilder=function(record){
      originalLoadRecord(record);
      ensureAll();
      const legs=[...document.querySelectorAll('#legs > .leg')];
      (record?.ticket?.legs||[]).forEach((saved,index)=>{
        if(saved.type!=='manual'||!legs[index])return;
        ensureManualFields(legs[index]);
        legs[index].querySelector('.manualCurrent').value=saved.current??0;
        legs[index].querySelector('.manualTarget').value=saved.target??1;
      });
      window.preview?.();
    };
  }

  document.addEventListener('change',event=>{
    if(event.target.matches('.ltype')){
      ensureManualFields(event.target.closest('.leg'));
      window.preview?.();
    }
  });

  const observer=new MutationObserver(ensureAll);
  function start(){
    ensureAll();
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
