function openBulk(){var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;document.getElementById('binfo').textContent=tgts.length+' জন কে message যাবে';document.getElementById('bulkmodal').classList.add('open');}
function closeBulk(){document.getElementById('bulkmodal').classList.remove('open');}
async function sendBulk(){
  var txt=document.getElementById('bta').value.trim();if(!txt)return;
  var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;
  var btn=document.querySelector('.bsend');btn.disabled=true;btn.textContent='Sending...';
  var sent=0;
  for(var i=0;i<tgts.length;i++){try{await post({action:'reply',sender_id:tgts[i].sender_id,page_id:tgts[i].page_id,type:'text',message:txt});sent++;}catch(e){}await new Promise(function(r){setTimeout(r,300);});}
  btn.disabled=false;btn.textContent='Send All';closeBulk();document.getElementById('bta').value='';
  showToast('✓ '+sent+'/'+tgts.length+' sent','success');
}