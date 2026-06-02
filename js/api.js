function post(data){ return fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }

document.addEventListener('click', function(){ 
  try{ var ctx=new(window.AudioContext||window.webkitAudioContext)(); snd=function(){var o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.setValueAtTime(0.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}; }catch(e){}
}, {once:true});

function post(data){ return fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }

async function loadInbox(silent){
  try{
    var res=await fetch(NB+'/inbox-data');
    var data=await res.json();
    // Map Supabase user_id to userId for compatibility
    if(data.conversations){
      data.conversations=data.conversations.map(function(c){
        c.userId=c.user_id;
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
          if(snd)snd();
          // Auto send check
          if(globalAuto){
            var newMsgs=(n.messages||[]).slice(prevLen);
            newMsgs.forEach(function(m){
              if(m.role==='customer'){
                checkAndAutoSend(n,m);
              }
            });
          }
        }
      });
    }
    lastCnt=nc.length;
    nc.forEach(function(n){
      var ex=allC.find(function(c){return c.userId===n.userId;});
      if(ex){n.human_active=ex.human_active;n.notes=ex.notes!==undefined?ex.notes:n.notes;if(ex.id_tag!==undefined)n.id_tag=ex.id_tag;}
    });
    allC=nc;
    if(data.suggestions)suggestions=data.suggestions;
    if(data.global_ai!==undefined){
      globalAI=data.global_ai;
      document.getElementById('gai').checked=globalAI;
      document.getElementById('gaibg').style.background=globalAI?'#4caf50':'#e53935';
      document.getElementById('gaiknob').style.transform=globalAI?'translateX(0)':'translateX(14px)';
      document.getElementById('gailbl').textContent=globalAI?'ON':'OFF';
    }
    if(data.global_id!==undefined){
      globalID=data.global_id;
      document.getElementById('gid').checked=globalID;
      document.getElementById('gidbg').style.background=globalID?'#1877f2':'#ccc';
      document.getElementById('gidknob').style.transform=globalID?'translateX(14px)':'translateX(0)';
      document.getElementById('gidlbl').textContent=globalID?'ON':'OFF';
    }
    if(data.global_auto!==undefined){
      globalAuto=data.global_auto;
      document.getElementById('gauto').checked=globalAuto;
      document.getElementById('gautobg').style.background=globalAuto?'#4caf50':'#ccc';
      document.getElementById('gautoknob').style.transform=globalAuto?'translateX(14px)':'translateX(0)';
      document.getElementById('gautolbl').textContent=globalAuto?'ON':'OFF';
    }
    allC.forEach(function(c){(c.tags||[]).forEach(function(t){allTags.add(t);});});
    buildFilters(); applyFilters(); updateStats();
    if(!silent){document.getElementById('rfbtn').textContent='✅ Fetched';setTimeout(function(){document.getElementById('rfbtn').textContent='🔄 Refresh';},2000);}
    if(selC){
      var upd=allC.find(function(c){return c.userId===selC.userId;});
      if(upd){var pl=(selC.messages||[]).length;selC=upd;if((upd.messages||[]).length>pl){renderMsgs(upd.messages||[]);renderSB(upd);}}
    }
  }catch(e){
    if(!silent){document.getElementById('rfbtn').textContent='❌ Failed';setTimeout(function(){document.getElementById('rfbtn').textContent='🔄 Refresh';},2000);}
  }
}

function manualRefresh(){document.getElementById('rfbtn').textContent='⏳...';loadInbox(false);}

function updateStats(){
  var u=allC.filter(function(c){return c.unread;}).length;
  var a=allC.filter(function(c){return isUnan(c);}).length;
  var h=allC.filter(function(c){return c.human_active;}).length;
  document.getElementById('stats').textContent=allC.length+' | '+u+' unread | '+a+' unan | '+h+' H';
}