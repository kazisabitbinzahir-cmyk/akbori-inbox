function setMode(m){
  rmode=m;
  document.getElementById('ttab').classList.toggle('active',m==='text');
  document.getElementById('itab').classList.toggle('active',m==='image');
  document.getElementById('rinput').style.display=m==='text'?'block':'none';
  var ia=document.getElementById('imgarea');
  if(m==='image'){ia.classList.add('amode');document.getElementById('fiinput').click();}else ia.classList.remove('amode');
}

function handleFile(e){
  var f=e.target.files[0];if(!f)return;selFile=f;
  var r=new FileReader();r.onload=function(ev){var p=document.getElementById('iprev');p.src=ev.target.result;p.style.display='block';};r.readAsDataURL(f);
}
var ia=document.getElementById('imgarea');
ia.addEventListener('dragover',function(e){e.preventDefault();ia.classList.add('dov');});
ia.addEventListener('dragleave',function(){ia.classList.remove('dov');});
ia.addEventListener('drop',function(e){e.preventDefault();ia.classList.remove('dov');var f=e.dataTransfer.files[0];if(f){selFile=f;var r=new FileReader();r.onload=function(ev){var p=document.getElementById('iprev');p.src=ev.target.result;p.style.display='block';};r.readAsDataURL(f);}});

function f2b64(f){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result.split(',')[1]);};r.onerror=rej;r.readAsDataURL(f);});}

async function sendReply(){
  if(!selC)return;
  var sendConv=selC;
  var sendConvId=selC.userId;
  var showID=document.getElementById('idtog').checked;
  var payload={action:'reply',sender_id:sendConv.sender_id,page_id:sendConv.page_id};
  if(rmode==='text'){
    var txt=document.getElementById('rinput').value.trim();if(!txt)return;
    if(showID)txt=txt+'\n\nID: '+sendConv.sender_id;
    payload.type='text';payload.message=txt;
  }else{
    if(!selFile)return;
    var b64=await f2b64(selFile);payload.type='image';payload.image_data=b64;payload.image_name=selFile.name;payload.image_type=selFile.type;
  }
  var now=new Date();
  var me={role:'agent',text:payload.message||'(ছবি)',image_url:'',has_image:rmode==='image',time:now.toISOString(),tag:'Human',sending:true};
  // Local update immediately
  sendConv.messages=sendConv.messages||[];sendConv.messages.push(me);
  sendConv.last_message=me.text;sendConv.last_time=now.toISOString();
  var ci=allC.findIndex(function(c){return c.userId===sendConvId;});
  if(ci>=0){allC[ci]=sendConv;if(ci>0){var upd=allC.splice(ci,1)[0];allC.unshift(upd);}}
  if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
  var ri=document.getElementById('rinput');if(ri)ri.value='';
  selFile=null;
  var ip=document.getElementById('iprev');if(ip)ip.style.display='none';
  var fi=document.getElementById('fiinput');if(fi)fi.value='';
  setMode('text');
  applyFilters();
  // Send to server in background
  fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(res){return res.json();})
    .then(function(data){
      me.sending=false;
      if(rmode==='image'&&data.image_url)me.image_url=data.image_url;
      if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
    })
    .catch(function(e){
      me.failed=true;
      if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
      showToast('❌ Send failed','error');
    });
}