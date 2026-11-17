/* Catálogo en vivo: pide /api/catalogo (lo que el dueño edita en /admin) y lo convierte al formato del sitio
   (window.CATEGORIAS / window.PRODUCTOS). Si el panel no responde en 2,5 s, el sitio usa productos.js (respaldo). */
(function(){
  var SIG={};
  (window.CATEGORIAS||[]).forEach(function(c){SIG[c.n]=c.s});
  window.FOTO=function(f){return /^\//.test(f)?f:'assets/p/'+f};
  window.CATALOGO_LISTO=new Promise(function(listo){
    var ya=false;
    function fin(){if(!ya){ya=true;listo()}}
    var t=setTimeout(fin,2500);
    fetch('/api/catalogo',{headers:{accept:'application/json'}}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
      if(ya||!d||!d.productos||!d.productos.length||!d.categorias||!d.categorias.length)throw 0;
      var usadas={};Object.keys(SIG).forEach(function(k){usadas[SIG[k]]=1});
      var porId={},cats=[];
      d.categorias.forEach(function(c){
        var s=SIG[c.nombre];
        if(!s){var b=c.nombre.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z]/g,'').toUpperCase()||'XX';s=b.slice(0,2);var i=2;while(usadas[s]&&i<b.length){s=b[0]+b[i++]}var k=0;while(usadas[s]){s=b.slice(0,1)+(++k)}}
        usadas[s]=1;SIG[c.nombre]=s;porId[c.id]=s;cats.push({s:s,n:c.nombre});
      });
      var base=d.fotosBase||'';
      function url(clave,t){return clave?(base||'')+'/'+(base?'':'fotos/')+'p/'+clave.split('p/index.html')[1]+'-'+t+'.webp':null}
      var prods=[];
      d.productos.forEach(function(p){
        var s=porId[p.categoria_id];if(!s)return;
        prods.push({id:'p'+p.id,n:p.nombre,c:s,p:p.precio==null?null:p.precio,f:p.foto_clave?(url(p.foto_clave,'600')):null,g:p.foto_clave?url(p.foto_clave,'1600'):null});
      });
      if(!prods.length)throw 0;
      window.CATEGORIAS=cats;window.PRODUCTOS=prods;fin();
    }).catch(fin).then(function(){clearTimeout(t)});
  });
})();
