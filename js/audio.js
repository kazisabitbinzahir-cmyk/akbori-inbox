// ============================================================
// audio.js — voice message recording
// Note: Facebook audio format issues — webm not fully supported
// Future: add server-side conversion (ffmpeg) or use mp3
// ============================================================

function stopRecordingCleanup(){
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){
    mediaRecorder.stop();
  }
  isRecording=false;
  audioBlob=null;
  audioChunks=[];
  var recbtn=document.getElementById('recbtn');
  var recstatus=document.getElementById('recstatus');
  var audioprev=document.getElementById('audioprev');
  if(recbtn){recbtn.style.background='#e53935';recbtn.textContent='🎤';}
  if(recstatus)recstatus.textContent='Tap to record';
  if(audioprev)audioprev.style.display='none';
}

async function toggleRecording(){
  if(isRecording){
    mediaRecorder.stop();
    isRecording=false;
    document.getElementById('recbtn').style.background='#e53935';
    document.getElementById('recbtn').textContent='🎤';
    document.getElementById('recstatus').textContent='Processing...';
  } else {
    try{
      var stream=await navigator.mediaDevices.getUserMedia({audio:true});
      audioChunks=[];
      mediaRecorder=new MediaRecorder(stream);
      mediaRecorder.ondataavailable=function(e){if(e.data.size>0)audioChunks.push(e.data);};
      mediaRecorder.onstop=function(){
        audioBlob=new Blob(audioChunks,{type:'audio/webm'});
        var url=URL.createObjectURL(audioBlob);
        var ap=document.getElementById('audioplayback');
        ap.src=url;
        document.getElementById('audioprev').style.display='flex';
        document.getElementById('recstatus').textContent='Ready to send';
        stream.getTracks().forEach(function(t){t.stop();});
      };
      mediaRecorder.start();
      isRecording=true;
      document.getElementById('recbtn').style.background='#888';
      document.getElementById('recbtn').textContent='⏹';
      document.getElementById('recstatus').textContent='Recording...';
      document.getElementById('audioprev').style.display='none';
    }catch(e){
      showToast('Microphone access denied','error');
    }
  }
}

function discardAudio(){
  stopRecordingCleanup();
}

async function sendAudio(){
  if(!audioBlob||!selC)return;
  var sendConv=selC;
  var sendConvId=selC.userId;
  var btn=document.querySelector('#audioarea button:last-child');
  if(btn)btn.textContent='Sending...';
  try{
    var arrayBuffer=await audioBlob.arrayBuffer();
    var uint8=new Uint8Array(arrayBuffer);
    var binary='';
    for(var i=0;i<uint8.length;i++)binary+=String.fromCharCode(uint8[i]);
    var base64=btoa(binary);
    var res=await fetch(NB+'/action',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        action:'reply',
        sender_id:sendConv.sender_id,
        page_id:sendConv.page_id,
        type:'audio',
        audio_data:base64,
        audio_type:'audio/webm'
      })
    });
    var data=await res.json();
    if(data.success){
      var now=new Date();
      var me={role:'agent',text:'(voice message)',has_audio:true,audio_url:'',time:now.toISOString(),tag:'Human',sending:false};
      sendConv.messages=sendConv.messages||[];sendConv.messages.push(me);
      sendConv.last_message='(voice message)';sendConv.last_time=now.toISOString();
      if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
      setMode('text');
      showToast('Voice sent','success');
    } else {
      showToast('Send failed','error');
      if(btn)btn.textContent='Send ✓';
    }
  }catch(e){
    showToast('Send failed','error');
    if(btn)btn.textContent='Send ✓';
  }
}
