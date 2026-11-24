/* Interface da app de musculação: treinos, lista, visualizador 3D, músculos, dicas e registo de séries. */
(function(){
var st={},cur={t:"A",id:null},inited=false;
try{st=JSON.parse(localStorage.getItem("plano1marm")||"{}")}catch(e){st={}}
function save(){try{localStorage.setItem("plano1marm",JSON.stringify(st))}catch(e){}}
function $(i){return document.getElementById(i)}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")}
function nsets(e){var m=/^(\d+)/.exec(e.sr);return m?+m[1]:3}
function byId(id){return window.MUSC.filter(function(e){return e.id===id})[0]}
function list(){var O=window.MUSC_ORDER||[];return window.MUSC.filter(function(e){return e.t===cur.t}).sort(function(a,b){return O.indexOf(a.id)-O.indexOf(b.id)})}
function rec(e){
  var r=st[e.id]||(st[e.id]={s:[],kg:""});return r;
}
function renderTreinos(){
  var h="";
  ["A","B","C","D"].forEach(function(k){
    var T=window.MUSC_TREINOS[k],ex=window.MUSC.filter(function(e){return e.t===k}),done=0,tot=0;
    ex.forEach(function(e){var r=st[e.id]||{s:[]};tot+=nsets(e);for(var i=0;i<nsets(e);i++)if(r.s[i])done++});
    h+='<button class="mt'+(k===cur.t?" on":"")+'" data-t="'+k+'" aria-pressed="'+(k===cur.t)+'"><b>'+T.nome+'</b><span>'+esc(T.sub)+'</span><i>'+done+'/'+tot+' séries</i></button>';
  });
  $("m-treinos").innerHTML=h;
}
function renderList(){
  var h="",lastG=null;
  list().forEach(function(e,i){
    var r=st[e.id]||{s:[]},d=0,n=nsets(e);for(var j=0;j<n;j++)if(r.s[j])d++;
    if(e.g&&e.g!==lastG){h+='<div class="grp">'+esc(e.g)+'</div>';lastG=e.g}
    h+='<button class="mx'+(e.id===cur.id?" on":"")+(d===n?" ok":"")+'" data-id="'+e.id+'"><span class="n">'+(i+1)+'</span><span class="tt"><b>'+esc(e.nome)+'</b><em>'+esc(e.sr)+'</em></span><span class="dn">'+d+'/'+n+'</span></button>';
  });
  $("m-list").innerHTML=h;
}
function chips(arr,cls){
  return arr.map(function(k){return '<span class="chip '+cls+'">'+window.MUSC_LABELS[k]+'</span>'}).join("");
}
function renderDetail(){
  var e=byId(cur.id);if(!e)return;
  var r=rec(e),n=nsets(e),h='';
  h+='<h3>'+esc(e.nome)+'</h3><p class="sub">'+esc(e.sr)+(e.nota?' · '+esc(e.nota):'')+'</p>';
  h+='<div class="mus"><div><div class="lbl">Principais</div>'+chips(e.p,"p")+'</div><div><div class="lbl">Secundários</div>'+(e.s&&e.s.length?chips(e.s,"s"):'<span class="sub">–</span>')+'</div></div>';
  h+='<ul class="tips">'+e.tips.map(function(t){return"<li>"+esc(t)+"</li>"}).join("")+'</ul>';
  if(e.en)h+='<p><a class="vid mw" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q='+encodeURIComponent('musclewiki '+e.en)+'">Ver ilustração anatómica animada (MuscleWiki)</a></p>';
  h+='<p><a class="vid" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query='+encodeURIComponent(e.nome.replace(/\s*\(.*?\)/g,'')+' técnica correta')+'">▶ Ver uma pessoa real a fazer (vídeos)</a></p>';
  h+='<div class="trk"><div class="lbl">'+(e.hold?"Séries (mantém a posição)":"Séries feitas")+'</div><div class="sets">';
  for(var i=0;i<n;i++)h+='<button class="set'+(r.s[i]?" on":"")+'" data-s="'+i+'" aria-pressed="'+(!!r.s[i])+'" aria-label="Série '+(i+1)+'">'+(i+1)+'</button>';
  h+='</div><label class="kg">Carga (kg) <input id="m-kg" type="number" inputmode="decimal" min="0" step="0.5" value="'+esc(r.kg)+'" placeholder="–"></label></div>';
  $("m-detail").innerHTML=h;
  $("m-name").textContent=e.nome;
}
function show(id,noview){
  cur.id=id;var e=byId(id);
  renderList();renderDetail();
  if(window.Viewer&&window.THREE&&inited)window.Viewer.show(e);
}
function start(){
  if(inited)return;
  if(!window.THREE){$("m-stage").innerHTML='<p class="sub" style="padding:16px">Não foi possível carregar o modelo 3D. Verifica a ligação e recarrega a página.</p>';return}
  window.Viewer.onPhase=function(t){var p=$("m-phase");if(p&&t)p.textContent=t};
  window.Viewer.init($("m-stage"));inited=true;
  window.Viewer.show(byId(cur.id));
}
window.openMusc=function(t){
  if(t){cur.t=t;cur.id=list()[0].id}
  window.showView("musc");
  renderTreinos();show(cur.id);
};
window.initMusc=function(){
  if(!cur.id)cur.id=list()[0].id;
  renderTreinos();show(cur.id);start();
  if(inited)window.Viewer.show(byId(cur.id));
};
document.addEventListener("click",function(ev){
  var t=ev.target.closest("button");if(!t)return;
  if(t.classList.contains("mt")){cur.t=t.dataset.t;cur.id=list()[0].id;renderTreinos();show(cur.id);return}
  if(t.classList.contains("mx")){show(t.dataset.id);return}
  if(t.classList.contains("set")){
    var e=byId(cur.id),r=rec(e),i=+t.dataset.s;r.s[i]=!r.s[i];save();renderDetail();renderList();renderTreinos();return}
  if(t.dataset.v){window.Viewer&&window.Viewer.setView(t.dataset.v);
    document.querySelectorAll("[data-v]").forEach(function(b){b.setAttribute("aria-pressed",b===t)});return}
  if(t.id==="m-reset"){
    list().forEach(function(e){delete st[e.id]});save();renderTreinos();renderList();renderDetail()}
});
document.addEventListener("input",function(ev){
  if(ev.target&&ev.target.id==="m-kg"){var r=rec(byId(cur.id));r.kg=ev.target.value;save()}
});
})();
