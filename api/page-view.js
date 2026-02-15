// RunAds - Page Viewer (serves generated page HTML by slug)
// Postgres-first storage via unified storage module
// Injects admin editor widget at serve-time for all pages

export const config = { maxDuration: 15 };

import { getPageBySlug } from '../lib/storage.js';

// Generate the admin widget script inline (same as pipeline.js version)
function getAdminWidgetHtml(slug) {
  const adminKey = process.env.ADMIN_EDIT_KEY || '';
  if (!adminKey) return '';
  return `
<!-- RunAds Admin Editor Widget -->
<script>
(function(){
  var SLUG='${slug}',KEY='${adminKey}',API='https://runads-platform.vercel.app/api/chat';
  var panel=null,open=false;
  function createPanel(){
    if(panel)return;
    var d=document.createElement('div');
    d.id='__ra_editor';
    d.innerHTML=
      '<div style="position:fixed;bottom:0;right:20px;width:380px;height:480px;background:#1a1a2e;border-radius:12px 12px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,0.3);display:flex;flex-direction:column;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;">'+
        '<div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);">'+
          '<span style="font-weight:600;font-size:14px;">\\u2728 RunAds Editor</span>'+
          '<button id="__ra_close" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;padding:0 4px;">\\u2715</button>'+
        '</div>'+
        '<div id="__ra_msgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;">'+
          '<div style="background:rgba(255,255,255,0.08);padding:10px 12px;border-radius:8px;font-size:13px;color:#d1d5db;line-height:1.5;">Hi! Describe any changes you want to make to this page. For example:<br><br>\\u2022 \\"Change the headline to....\\"<br>\\u2022 \\"Make the CTA button red\\"<br>\\u2022 \\"Add a money-back guarantee badge\\"</div>'+
        '</div>'+
        '<div style="padding:12px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:8px;">'+
          '<input id="__ra_input" type="text" placeholder="Describe your change..." style="flex:1;padding:10px 12px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;background:rgba(255,255,255,0.06);color:#fff;outline:none;">'+
          '<button id="__ra_send" style="padding:10px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;">Send</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(d);
    panel=d;
    document.getElementById('__ra_close').onclick=toggle;
    document.getElementById('__ra_send').onclick=send;
    document.getElementById('__ra_input').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  }
  function toggle(){
    if(!panel)createPanel();
    open=!open;
    panel.style.display=open?'block':'none';
    if(open)document.getElementById('__ra_input').focus();
  }
  function addMsg(text,isUser){
    var m=document.getElementById('__ra_msgs');
    var b=document.createElement('div');
    b.style.cssText='padding:10px 12px;border-radius:8px;font-size:13px;line-height:1.5;max-width:85%;word-wrap:break-word;'+(isUser?'background:#6366f1;color:#fff;align-self:flex-end;':'background:rgba(255,255,255,0.08);color:#d1d5db;align-self:flex-start;');
    b.textContent=text;
    m.appendChild(b);
    m.scrollTop=m.scrollHeight;
    return b;
  }
  function send(){
    var inp=document.getElementById('__ra_input');
    var msg=inp.value.trim();
    if(!msg)return;
    inp.value='';
    addMsg(msg,true);
    var loading=addMsg('Working on it...', false);
    var btn=document.getElementById('__ra_send');
    btn.disabled=true;btn.textContent='...';
    fetch(API,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slug:SLUG,message:msg,adminKey:KEY})
    })
    .then(function(r){return r.json();})
    .then(function(d){
      loading.remove();
      if(d.success){
        addMsg(d.response||'Change applied!',false);
        setTimeout(function(){location.reload();},1500);
      }else{
        addMsg('Error: '+(d.error||'Unknown error'),false);
      }
    })
    .catch(function(e){loading.remove();addMsg('Error: '+e.message,false);})
    .finally(function(){btn.disabled=false;btn.textContent='Send';});
  }
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==='E'){e.preventDefault();toggle();}
    if(e.key==='Escape'&&open)toggle();
  });
})();
</script>`;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const slug = pathParts.length > 1 ? pathParts[1] : pathParts[0];

    if (!slug) return res.status(400).send('Page slug required');

    const page = await getPageBySlug(slug);

    if (!page || !page.html_content) {
      return res.status(404).send(`<!DOCTYPE html><html><head><title>Page Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Page Not Found</h1><p>The page "${slug}" could not be found.</p><a href="/">← Back to Dashboard</a></body></html>`);
    }

    let html = page.html_content;

    // Inject admin widget at serve-time if not already present
    if (!html.includes('__ra_editor') && process.env.ADMIN_EDIT_KEY) {
      const widgetHtml = getAdminWidgetHtml(slug);
      if (widgetHtml) {
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${widgetHtml}\n</body>`);
        } else {
          html += widgetHtml;
        }
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Page view error:', err);
    return res.status(500).send('Internal server error');
  }
}
