/* JR CellCity: piezas compartidas (menú, video de cabecera, luz que sigue el dedo, enchufe a WhatsApp) */
(function(){
'use strict';
var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
var NUMEROS={a:'573228579370',b:'573045921558'};
window.JR={
  wa:function(texto,num){return 'https://wa.me/'+(num||NUMEROS.a)+'?text='+encodeURIComponent(texto)},
  abrir:function(url){try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}var w=null;try{w=window.open(url,'_blank','noopener')}catch(e){}if(!w)location.href=url},
  clamp:clamp
};


/* ventana grande de producto: JR.detalle({img,alt,titulo,meta,precio,msg}) */
(function(){
var dlg=null,lastFocus=null,cur={};
function build(){
  dlg=document.createElement('dialog');dlg.className='detalle';dlg.setAttribute('aria-label','Producto');
  dlg.innerHTML='<div class="dt-box"><button type="button" class="dt-x" aria-label="Cerrar">&times;</button><div class="dt-foto"><img alt=""><button type="button" class="dt-nav dt-prev" aria-label="Producto anterior">&#8249;</button><button type="button" class="dt-nav dt-next" aria-label="Producto siguiente">&#8250;</button></div><div class="dt-info"><p class="dt-meta"></p><h2 class="dt-tit"></h2><p class="dt-precio"></p><a class="pedir dt-pedir" target="_blank" rel="noopener"><span>Lo quiero</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3v5M15 3v5"/><path d="M7 8h10v4a5 5 0 0 1-10 0z"/><path d="M12 17v4"/></svg></a></div></div>';
  document.body.appendChild(dlg);
  dlg.querySelector('.dt-x').addEventListener('click',function(){dlg.close()});
  dlg.querySelector('.dt-prev').addEventListener('click',function(){if(cur.nav&&cur.nav.prev)cur.nav.prev()});
  dlg.querySelector('.dt-next').addEventListener('click',function(){if(cur.nav&&cur.nav.next)cur.nav.next()});
  dlg.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'&&cur.nav&&cur.nav.prev){e.preventDefault();cur.nav.prev()}else if(e.key==='ArrowRight'&&cur.nav&&cur.nav.next){e.preventDefault();cur.nav.next()}});
  var sx=null;
  dlg.addEventListener('touchstart',function(e){sx=e.touches.length===1?e.touches[0].clientX:null},{passive:true});
  dlg.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)<60)return;if(dx<0&&cur.nav&&cur.nav.next)cur.nav.next();else if(dx>0&&cur.nav&&cur.nav.prev)cur.nav.prev()},{passive:true});
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
  dlg.addEventListener('close',function(){document.documentElement.classList.remove('dt-open');if(lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true})}catch(_){}});
}
JR.detalle=function(d){
  if(!dlg)build();
  cur=d;
  if(!dlg.open)lastFocus=document.activeElement;
  dlg.querySelector('.dt-prev').hidden=!(d.nav&&d.nav.prev);dlg.querySelector('.dt-next').hidden=!(d.nav&&d.nav.next);
  var im=dlg.querySelector('.dt-foto img');
  if(d.img){im.src=d.img;im.alt=d.alt||d.titulo;im.style.display=''}else{im.removeAttribute('src');im.style.display='none'}
  dlg.querySelector('.dt-meta').textContent=d.meta||'';
  dlg.querySelector('.dt-tit').textContent=d.titulo;
  dlg.querySelector('.dt-precio').textContent=d.precio||'Consultar precio';
  dlg.querySelector('.dt-pedir').href=JR.wa(d.msg);
  document.documentElement.classList.add('dt-open');
  var box=dlg.querySelector('.dt-box');box.classList.remove('swap');void box.offsetWidth;box.classList.add('swap');
  if(!dlg.open)dlg.showModal();
  try{navigator.vibrate&&navigator.vibrate(6)}catch(_){}
};
JR.tocable=function(card,fn,nombre){
  var f=card.querySelector('.foto');if(f){f.setAttribute('role','button');f.tabIndex=0;f.setAttribute('aria-label','Ver '+nombre)}
  card.style.cursor='pointer';
  card.addEventListener('click',function(e){if(e.target.closest('.pedir'))return;fn()});
  if(f)f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}});
};
})();

/* menú móvil */
var burger=document.getElementById('burger');
if(burger)burger.addEventListener('click',function(){
  var o=document.body.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded',o?'true':'false');
  burger.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú');
});

/* menú: oscuro sobre el video, blanco al pasar la cabecera */
var navEl=document.getElementById('nav'),hdEl=document.querySelector('.head');
if(navEl&&hdEl){var solid=false;var refEl=hdEl.hasAttribute('data-home')?(document.querySelector('.banner')||document.getElementById('catalogo')):null;var onS=function(){var lim=refEl?refEl.offsetTop-160:hdEl.offsetHeight-navEl.offsetHeight-10;var v=scrollY>lim;if(v!==solid){solid=v;navEl.classList.toggle('solid',v)}};addEventListener('scroll',onS,{passive:true});onS()}

/* videos: bucle; si el aparato los frena (ahorro de batería) se reintenta; los que no se ven se detienen */
var mobileMQ=matchMedia('(hover:none),(max-width:900px)').matches;
var vids=[].slice.call(document.querySelectorAll('video[data-src]'));
vids.forEach(function(v){
  var host=v.closest('.head,.catbg,.shero,.pagebg'),vis=true,cargado=false;
  var fuente=(mobileMQ&&v.dataset.cel)?v.dataset.cel:v.dataset.src;
  function carga(){if(cargado)return;cargado=true;v.src=fuente}
  v.__go=function(){if(!vis||document.hidden)return;carga();var p=v.play();if(p&&p.catch)p.catch(function(){})};
  v.addEventListener('canplay',function(){if(host)host.classList.add('video-ready');v.__go()});
  v.addEventListener('pause',function(){if(vis&&!document.hidden&&!v.ended)setTimeout(v.__go,400)});
  /* los videos de la parte de abajo solo se descargan cuando están por verse */
  new IntersectionObserver(function(e){vis=e[0].isIntersecting;if(vis)v.__go();else v.pause()},{rootMargin:'200px'}).observe(host||v);
  if(host&&host.classList.contains('home')||(host&&host.classList.contains('head')))carga();
});
function goAll(){vids.forEach(function(v){v.__go()})}
['pointerdown','touchstart','keydown','scroll','wheel','click'].forEach(function(ev){addEventListener(ev,goAll,{passive:true})});
document.addEventListener('visibilitychange',function(){if(!document.hidden)goAll()});
setInterval(function(){vids.forEach(function(v){if(v.paused)v.__go()})},2500);

/* luz que sigue el dedo o el mouse, dentro de la cabecera */
var head=document.querySelector('.head');
var glow=head&&head.querySelector('.glow');
if(glow){
  var gx=0,gy=0,tx=0,ty=0,gRaf=null,gOn=false,gT=null;
  var gtick=function(){gx+=(tx-gx)*.18;gy+=(ty-gy)*.18;glow.style.transform='translate3d('+gx.toFixed(1)+'px,'+gy.toFixed(1)+'px,0)';
    if(Math.abs(tx-gx)<.3&&Math.abs(ty-gy)<.3)gRaf=null;else gRaf=requestAnimationFrame(gtick)};
  var mg=function(e){var r=head.getBoundingClientRect();tx=e.clientX-r.left;ty=e.clientY-r.top;
    if(!gOn){gOn=true;glow.classList.add('on');gx=tx;gy=ty}
    clearTimeout(gT);gT=setTimeout(function(){glow.classList.remove('on');gOn=false},2200);
    if(gRaf===null)gRaf=requestAnimationFrame(gtick)};
  head.addEventListener('pointermove',mg,{passive:true});
  head.addEventListener('pointerdown',mg,{passive:true});
  head.addEventListener('pointerleave',function(){glow.classList.remove('on');gOn=false});
}

/* enchufe a WhatsApp: [data-plug] con data-msg y data-num ("a" o "b") */
document.querySelectorAll('.rail[data-msg]').forEach(function(rail){
  var plug=rail.querySelector('.plug');
  var url=JR.wa(rail.dataset.msg,NUMEROS[rail.dataset.num||'a']);
  var maxX=0,px=0,tpx=0,dragging=false,sp=0,spx=0,pRaf=null,connected=false;
  function measure(){maxX=Math.max(1,rail.clientWidth-plug.offsetWidth-12-8)}
  function paint(){
    var prog=clamp(px/maxX,0,1);
    plug.style.setProperty('--x',px.toFixed(1));rail.style.setProperty('--p',prog.toFixed(3));
    var v=Math.round(prog*100);
    if(String(v)!==plug.getAttribute('aria-valuenow')){plug.setAttribute('aria-valuenow',v);plug.setAttribute('aria-valuetext',connected?'Conectado':v>0?v+' por ciento':'Desconectado')}
  }
  function loop(){
    var goal=dragging?tpx:(connected?maxX:0);
    px+=(goal-px)*(dragging?.5:.2);paint();
    if(Math.abs(goal-px)<.4){px=goal;paint();pRaf=null}else pRaf=requestAnimationFrame(loop);
  }
  function kick(){if(pRaf===null)pRaf=requestAnimationFrame(loop)}
  function connect(){
    if(connected)return;measure();connected=true;rail.classList.add('done');plug.setAttribute('aria-valuetext','Conectado');
    kick();JR.abrir(url);
    setTimeout(function(){connected=false;rail.classList.remove('done');kick()},3200);
  }
  function end(){if(!dragging)return;dragging=false;if(px/maxX>=.9)connect();else kick()}
  plug.addEventListener('pointerdown',function(e){
    if(e.button!==undefined&&e.button!==0)return;
    measure();dragging=true;sp=e.clientX;spx=px;tpx=px;
    try{plug.setPointerCapture(e.pointerId)}catch(_){}
    kick();e.preventDefault();
  });
  plug.addEventListener('pointermove',function(e){
    if(!dragging)return;
    if(e.pointerType==='mouse'&&e.buttons===0){end();return}
    tpx=clamp(spx+(e.clientX-sp),0,maxX);kick();
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(function(t){plug.addEventListener(t,end)});
  addEventListener('blur',end);addEventListener('pointerup',end);
  plug.addEventListener('keydown',function(e){
    measure();
    if(e.key==='ArrowRight'||e.key==='ArrowUp'){tpx=clamp(px+maxX*.12,0,maxX);dragging=true;kick();setTimeout(function(){dragging=false;if(px/maxX>=.9)connect()},260);e.preventDefault()}
    else if(e.key==='ArrowLeft'||e.key==='ArrowDown'){tpx=clamp(px-maxX*.12,0,maxX);dragging=true;kick();setTimeout(function(){dragging=false;kick()},260);e.preventDefault()}
    else if(e.key==='Home'){connected=false;px=0;paint();e.preventDefault()}
    else if(e.key==='End'||e.key==='Enter'||e.key===' '){px=maxX;paint();connect();e.preventDefault()}
  });
  addEventListener('resize',function(){measure();px=clamp(px,0,maxX);paint()});
  measure();paint();
});
})();
