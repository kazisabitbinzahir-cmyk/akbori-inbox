// main.js — app init, data loading, event listeners

// Sound init
document.addEventListener('click', function(){
  try{ var ctx=new(window.AudioContext||window.webkitAudioContext)(); snd=function(){var o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.setValueAtTime(0.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}; }catch(e){}
}, {once:true});

async function loadInbox(silent){
  try{
    var params=[];
    if(convOffset>0)params.push('offset='+convOffset);
    if(aPF&&aPF!=='all')params.push('page='+encodeURIComponent(aPF));
    if(aOSF!==null&&aOSF!==undefined)params.push('order_status='+encodeURIComponent(aOSF));
    if(aSF.has('unread'))params.push('unread=true');
    if(aSF.has('unanswered'))params.push('unanswered=true');
    var dfv=document.getElementById('dfrom').value,dtv=document.getElementById('dto').value;
    if(dfv)params.push('date_from='+dfv);
    if(dtv)params.push('date_to='+dtv);
    var sv=document.getElementById('sinput').value.trim();
    if(sv)params.push('search='+encodeURIComponent(sv));
    if(aTF.size===1)params.push('tag='+encodeURIComponent([...aTF][0]));
    var url=NB+'/inbox-data'+(params.length>0?'?'+params.join('&'):'');
    var res=await fetch(url);
    var data=await res.json();
    if(data.conversations){
      data.conversations=data.conversations.map(function(c){
        c.userId=c.user_id;
        if(c.messages&&c.messages.length>0)c._msgsLoaded=true;
        return c;
      });
    }
    var nc=data.conversations||[];
    if(lastCnt>0&&nc.length>0){
      nc.forEach(function(n){
        var o=allC.find(function(c){return c.userId===n.userId;});
        var prevLen=o?(o.messages||[]).length:0;
        var newLen=(n.messages||[]).length;
        if(newLen>prevLen){
          var newMsgs=(n.messages||[]).slice(prevLen);
          var hasRealCustomerMsg=newMsgs.some(function(m){ return m.role==='customer'&&m.tag!=='reaction'; });
          if(hasRealCustomerMsg&&snd)snd();
          if(globalAuto){ newMsgs.forEach(function(m){ if(m.role==='customer'&&m.tag!=='reaction') checkAndAutoSend(n,m); }); }
        }
      });
    }
    lastCnt=nc.length;
    nc.forEach(function(n){
      var ex=allC.find(function(c){return c.userId===n.userId;});
      if(ex){n.human_active=ex.human_active;n.notes=ex.notes!==undefined?ex.notes:n.notes;if(ex.id_tag!==undefined)n.id_tag=ex.id_tag;}
    });
    if(convOffset===0){allC=nc;}else{nc.forEach(function(n){if(!allC.find(function(c){return c.userId===n.userId;}))allC.push(n);});if(nc.length<convLimit)convTotal=allC.length;}
    if(data.suggestions)suggestions=data.suggestions;
    if(data.tag_categories){
      tagCategories=data.tag_categories;
      allTagCategories=data.tag_categories;
    }
    if(data.global_tags){
      globalTags=data.global_tags;
      allTags=new Set(globalTags.map(function(t){return t.tag;}));
    }
    if(data.saved_messages)savedMessages=data.saved_messages;
    if(data.contact_fields)contactFields=data.contact_fields;
    if(data.order_statuses)orderStatuses=data.order_statuses;
    if(data.limit)convLimit=data.limit;
    if(data.global_ai!==undefined){ globalAI=data.global_ai; document.getElementById('gai').checked=globalAI; document.getElementById('gaibg').style.background=globalAI?'#4caf50':'#e53935'; document.getElementById('gaiknob').style.transform=globalAI?'translateX(0)':'translateX(14px)'; document.getElementById('gailbl').textContent=globalAI?'ON':'OFF'; var gailbl_m=document.getElementById('gailbl_m');if(gailbl_m)gailbl_m.textContent=globalAI?'ON':'OFF'; }
    if(data.global_id!==undefined){ globalID=data.global_id; document.getElementById('gid').checked=globalID; document.getElementById('gidbg').style.background=globalID?'#1877f2':'#ccc'; document.getElementById('gidknob').style.transform=globalID?'translateX(14px)':'translateX(0)'; document.getElementById('gidlbl').textContent=globalID?'ON':'OFF'; var gidlbl_m=document.getElementById('gidlbl_m');if(gidlbl_m)gidlbl_m.textContent=globalID?'ON':'OFF'; }
    if(data.global_auto!==undefined){ globalAuto=data.global_auto; document.getElementById('gauto').checked=globalAuto; document.getElementById('gautobg').style.background=globalAuto?'#4caf50':'#ccc'; document.getElementById('gautoknob').style.transform=globalAuto?'translateX(14px)':'translateX(0)'; document.getElementById('gautolbl').textContent=globalAuto?'ON':'OFF'; var gautolbl_m=document.getElementById('gautolbl_m');if(gautolbl_m)gautolbl_m.textContent=globalAuto?'ON':'OFF'; }
    allC.forEach(function(c){(c.tags||[]).forEach(function(t){allTags.add(t);});});
    buildFilters(); applyFilters(); updateStats();
    if(!silent){document.getElementById('rfbtn').textContent='Fetched';setTimeout(function(){document.getElementById('rfbtn').textContent='Refresh';},2000);}
  }catch(e){
    if(!silent){document.getElementById('rfbtn').textContent='Failed';setTimeout(function(){document.getElementById('rfbtn').textContent='Refresh';},2000);}
  }
}

function manualRefresh(){convOffset=0;convTotal=null;document.getElementById('rfbtn').textContent='...';var lm=document.getElementById('loadmorebtn');if(lm)lm.style.display='';loadInbox(false);}

async function loadMore(){
  var prevLen=allC.length;
  convOffset+=convLimit;
  var btn=document.getElementById('loadmorebtn');if(btn)btn.textContent='Loading...';
  await loadInbox(true);
  if(allC.length===prevLen){
    showToast('No more conversations','info');
    convTotal=allC.length;
    var lm=document.getElementById('loadmorebtn');if(lm)lm.style.display='none';
  } else {
    if(btn)btn.textContent='Load More';
  }
}

function toggleChatPanel(){
  var panel=document.getElementById('chatpanel');
  if(!panel)return;
  var isOpen=panel.style.display==='flex';
  panel.style.display=isOpen?'none':'flex';
}

function goBack(){
  document.getElementById('chatarea').classList.remove('active');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('topbar').style.display='';
  selC=null;
  document.getElementById('estate').style.display='flex';
  document.getElementById('chatview').style.display='none';
}

function toggleFP(){var p=document.getElementById('fpanel'),i=document.getElementById('fticon');var col=p.classList.contains('collapsed');p.classList.toggle('collapsed',!col);i.textContent=col?'▲':'▼';}

function initMobile(){if(window.innerWidth<=700){document.getElementById('fpanel').classList.add('collapsed');document.getElementById('ftbar').style.display='flex';}}

function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type;t.style.display='block';setTimeout(function(){t.style.display='none';},3000);}

function toggleMobileControls(){
  var panel=document.getElementById('mobilecontrols');
  if(!panel)return;
  var isOpen=panel.style.display==='flex';
  panel.style.display=isOpen?'none':'flex';
}


document.getElementById('rinput').addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey){
    if(window.innerWidth>700){e.preventDefault();sendReply();}
  }
});

document.addEventListener('click',function(e){if(!e.target.closest('.twrap'))document.getElementById('tsugg').style.display='none';if(!e.target.closest('#savedbar')&&!e.target.closest('#savedtab')){var sb=document.getElementById('savedbar');if(sb){sb.style.display='none';sb.classList.remove('vis');}}});

window.addEventListener('popstate',function(){if(selC)goBack();});

document.addEventListener('click',function(e){
  var panel=document.getElementById('mobilecontrols');
  if(!panel)return;
  if(!e.target.closest('.mobile-ctrl-btn')&&!e.target.closest('#mobilecontrols')){
    panel.style.display='none';
  }
});

// Startup
initMobile();
loadInbox(true);
