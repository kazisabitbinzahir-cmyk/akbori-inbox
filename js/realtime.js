// ============================================================
// realtime.js — Supabase realtime subscriptions
// Future: WebSocket or SSE from VPS backend
// ============================================================


// Supabase Realtime
// SUPABASE_URL defined in config.js
// SUPABASE_KEY defined in config.js

// Mobile controls toggle
function toggleMobileControls(){
  var panel=document.getElementById('mobilecontrols');
  if(!panel)return;
  var isOpen=panel.style.display==='flex';
  panel.style.display=isOpen?'none':'flex';
}

document.addEventListener('click',function(e){
  var panel=document.getElementById('mobilecontrols');
  if(!panel)return;
  if(!e.target.closest('.mobile-ctrl-btn')&&!e.target.closest('#mobilecontrols')){
    panel.style.display='none';
  }
});

initMobile();loadInbox(true);

function handleNewMessage(payload){
function handleNewMessage(payload){
  var msg=payload.new;
  if(!msg||!msg.user_id)return;
  var conv=allC.find(function(c){return c.user_id===msg.user_id;});
  if(!conv)return;
  if(msg.role==='agent'){var exists=(conv.messages||[]).some(function(m){return m.mid&&m.mid===msg.mid;});if(exists)return;}
  conv.messages=conv.messages||[];
  var exists=conv.messages.some(function(m){return m.id===msg.id;});
  if(exists)return;
  conv.messages.push(msg);
  conv.last_message=msg.text||conv.last_message;
  conv.last_time=msg.time||conv.last_time;
  if(msg.role==='customer'&&msg.tag!=='reaction'){
    conv.unread=true;
    if(snd)snd();
    if(globalAuto)checkAndAutoSend(conv,msg);
  }
  applyFilters();updateStats();
  if(selC&&selC.user_id===msg.user_id){selC=conv;renderMsgs(conv.messages);renderSB(conv);}
}

if(window.supabase){
  var sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  sb.channel('inbox-changes')
    .on('postgres_changes',{event:'*',schema:'public',table:'conversations'},function(payload){handleConvChange(payload);})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},handleNewMessage)
    .subscribe();
}else{
  setInterval(function(){loadInbox(true);},10000);
}
function handleConvChange(payload){
  var updated=payload.new;
  if(!updated||!updated.user_id)return;
  var i=allC.findIndex(function(c){return c.user_id===updated.user_id;});
  if(i>=0){
    var existing=allC[i];
    updated.userId=updated.user_id;
    updated.messages=existing.messages||[];
    updated.tags=existing.tags||[];
    updated.contact=existing.contact||{};
    updated._msgsLoaded=existing._msgsLoaded||false;
    allC[i]=updated;
    if(selC&&selC.userId===updated.user_id)selC=updated;
  }else{
    updated.userId=updated.user_id;
    updated.messages=[];
    updated.tags=[];
    updated.contact={};
    allC.unshift(updated);
  }
  applyFilters();updateStats();
}
