const API_BASE = "https://chat-uzfs.vercel.app"; // 你的后端域名（https）
const chat = document.getElementById('chat'), q=document.getElementById('q');
document.getElementById('send').onclick = async ()=>{
  const text=q.value.trim(); if(!text) return; chat.textContent+=`你: ${text}\n`; q.value='';
  try{
    const r = await fetch(API_BASE + '/chat', {
      method:'POST',
      headers:{ 'Content-Type':'text/plain' }, // 避免预检
      body: JSON.stringify({ messages:[{role:'user',content:text}], stream:false })
    });
    const data = await r.json();
    if(!r.ok){ chat.textContent+=`系统: 错误 ${JSON.stringify(data)}\n`; return; }
    const out = data.choices?.[0]?.message?.content || JSON.stringify(data);
    chat.textContent+=`AI: ${out}\n`;
  }catch(e){ chat.textContent+=`系统: 请求失败 ${e.message}\n`; }
};
document.getElementById('sendSSE').onclick = async ()=>{
  const text=q.value.trim(); if(!text) return; chat.textContent+=`你(流式): ${text}\n`; q.value='';
  try{
    const r = await fetch(API_BASE + '/chat', { method:'POST', body: JSON.stringify({ messages:[{role:'user',content:text}], stream:true }) });
    if(!r.ok || !(r.headers.get('content-type')||'').includes('text/event-stream')){
      document.getElementById('send').click(); return;
    }
    const reader = r.body.getReader(); let buf='', acc=''; chat.textContent+=`AI: `;
    while(true){
      const {value,done}=await reader.read(); if(done) break;
      buf += new TextDecoder().decode(value,{stream:true});
      const parts = buf.split('\n\n');
      for(let i=0;i<parts.length-1;i++){
        const line=parts[i].trim(); if(line.startsWith('data: ')){
          const p=line.slice(6); if(p==='[DONE]') continue;
          try{ const o=JSON.parse(p); const d=o.choices?.[0]?.delta?.content||''; acc+=d; }catch{}
        }
      }
      buf = parts[parts.length-1];
      chat.textContent = chat.textContent.replace(/AI:.*$/s, 'AI: ' + acc + '\n');
    }
  }catch{ document.getElementById('send').click(); }
};
