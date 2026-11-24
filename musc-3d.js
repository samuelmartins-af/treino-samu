/* Boneco 3D masculino com músculos visíveis (three.js r128). Usa MSKEL (musc-skel.js) para a pose. */
(function(){
var T3=window.THREE,S=window.MSKEL,K=S.K;
var C={base:0xd3d6da,rest:0xc2c6cc,pri:0xd3222a,sec:0xee8a86,shoe:0xc9ccd1,sole:0xaeb2b8,hair:0xb9bdc3,skin:0xd3d6da,shorts:0x1f3556,lip:0xa9adb3};
var V={};window.Viewer=V;V.onPhase=null;
var ren,scn,cam,root,inner,el,cur=null,yaw=-.32,pitch=.1,t0=0,camY=.85,lastPh=-1,built=false,frozen=null;
var M={},MUS=[],eqG,benchG,shadow;
var m4=new T3.Matrix4(),va=new T3.Vector3(),vb=new T3.Vector3(),vc=new T3.Vector3();
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]}
function mul(a,k){return [a[0]*k,a[1]*k,a[2]*k]}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function len(a){return Math.hypot(a[0],a[1],a[2])}
function norm(a){var l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l]}
function basis(A,B,hint){
  var d=sub(B,A),L=len(d),y=norm(d),x=sub(hint,mul(y,dot(hint,y)));
  if(len(x)<1e-4){x=sub([0,0,1],mul(y,y[2]));if(len(x)<1e-4)x=[1,0,0]}
  x=norm(x);return {o:A,x:x,y:y,z:cross(x,y),L:L};
}
function place(m,o,X,Y,Z,sx,sy,sz){
  va.set(X[0]*sx,X[1]*sx,X[2]*sx);vb.set(Y[0]*sy,Y[1]*sy,Y[2]*sy);vc.set(Z[0]*sz,Z[1]*sz,Z[2]*sz);
  m4.makeBasis(va,vb,vc);m4.setPosition(o[0],o[1],o[2]);m.matrix.copy(m4);m.matrixWorldNeedsUpdate=true;
}
function mat(c,rough){return new T3.MeshStandardMaterial({color:c,roughness:rough==null?.62:rough,metalness:0})}
function mk(geo,c,rough){var m=new T3.Mesh(geo,mat(c,rough));m.matrixAutoUpdate=false;inner.add(m);return m}
var SPH=null,CYL={};
function sph(c,rough){return mk(SPH,c,rough)}
function cyl(rd,rp,c){var k=rd+"_"+rp;return mk(CYL[k]||(CYL[k]=new T3.CylinderGeometry(rd,rp,1,20,1)),c)}
// ---------- tronco (loft) ----------
var RING=[[-.30,.11,.085,-.01],[-.12,.15,.105,-.01],[.06,.152,.105,-.005],[.20,.138,.096,0],[.33,.128,.09,0],[.48,.148,.10,.01],[.66,.17,.11,.018],[.80,.185,.108,.01],[.92,.19,.092,-.002],[1.02,.13,.072,-.01],[1.10,.06,.055,-.01]];
function ringAt(t){
  var n=RING.length,i=0;
  if(t<=RING[0][0])i=0;else if(t>=RING[n-1][0])i=n-2;else{while(RING[i+1][0]<t)i++}
  var a=RING[i],b=RING[i+1],u=(t-a[0])/(b[0]-a[0]);u=Math.max(0,Math.min(1,u));
  var p0=RING[Math.max(0,i-1)],p3=RING[Math.min(n-1,i+2)],o=[];
  for(var j=1;j<4;j++){
    var m1=(b[j]-p0[j])*.5*(b[0]-a[0])/Math.max(1e-6,(b[0]-p0[0])*.5),m2=(p3[j]-a[j])*.5*(b[0]-a[0])/Math.max(1e-6,(p3[0]-a[0])*.5);
    var u2=u*u,u3=u2*u;
    o.push((2*u3-3*u2+1)*a[j]+(u3-2*u2+u)*m1+(-2*u3+3*u2)*b[j]+(u3-u2)*m2);
  }
  return {w:o[0],d:o[1],f:o[2]};
}
function torsoGeo(ta,tb,k,caps){
  var N=44,Mm=30,pos=[],idx=[],t0=ta==null?RING[0][0]:ta,t1=tb==null?RING[RING.length-1][0]:tb,rows=[];k=k||1;
  function ring(t,sc){var r=ringAt(t),row=[];sc=sc*k;
    for(var j=0;j<=Mm;j++){var th=j/Mm*Math.PI*2,c=Math.cos(th),s=Math.sin(th),e=2/2.6;
      var x=r.f+r.d*sc*Math.sign(c)*Math.pow(Math.abs(c),e),z=r.w*sc*Math.sign(s)*Math.pow(Math.abs(s),e);
      row.push(pos.length/3);pos.push(x,t,z)}
    rows.push(row)}
  if(caps!==false)ring(t0,.02);for(var i=0;i<=N;i++)ring(t0+(t1-t0)*i/N,1);if(caps!==false)ring(t1,.02);
  for(var r=0;r<rows.length-1;r++)for(var j=0;j<Mm;j++){
    var a=rows[r][j],b=rows[r][j+1],c=rows[r+1][j],d=rows[r+1][j+1];idx.push(a,c,b,b,c,d)}
  var g=new T3.BufferGeometry();g.setAttribute("position",new T3.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
// ---------- músculos ----------
// torso: t (0=anca,1=ombros), l lateral, face f/b/s ; limbos: seg, t, phi (0 anterior,90 lateral), rr, a b c = semieixos (ao longo, frente, lado)
var TM=[
 {face:"f",t:.78,l:.09,a:.068,b:.05,c:.088,key:"peit",both:1},
 {face:"f",t:.16,l:.032,a:.043,b:.024,c:.03,key:"core",both:1},{face:"f",t:.28,l:.032,a:.043,b:.024,c:.03,key:"core",both:1},
 {face:"f",t:.40,l:.032,a:.043,b:.024,c:.03,key:"core",both:1},{face:"f",t:.52,l:.034,a:.04,b:.024,c:.03,key:"core",both:1},
 {face:"s",t:.30,l:.118,a:.1,b:.05,c:.032,key:"core",both:1},
 {face:"b",t:.62,l:.108,a:.15,b:.036,c:.07,key:"cost",both:1},
 {face:"b",t:.93,l:0,a:.085,b:.034,c:.14,key:"cost"},
 {face:"b",t:.27,l:.042,a:.14,b:.032,c:.03,key:"lomb",both:1},
 {face:"b",t:-.01,l:.078,a:.085,b:.07,c:.088,key:"glu",both:1}
];
var LM=[
 {seg:"th",t:.5,phi:0,rr:.5,a:.19,b:.048,c:.042,key:"quad"},{seg:"th",t:.5,phi:62,rr:.62,a:.17,b:.046,c:.036,key:"quad"},{seg:"th",t:.78,phi:-58,rr:.55,a:.1,b:.042,c:.034,key:"quad"},
 {seg:"th",t:.5,phi:150,rr:.55,a:.19,b:.04,c:.036,key:"isq"},{seg:"th",t:.5,phi:-150,rr:.55,a:.19,b:.04,c:.036,key:"isq"},
 {seg:"th",t:.35,phi:-100,rr:.5,a:.14,b:.03,c:.034},
 {seg:"sh",t:.3,phi:-150,rr:.6,a:.13,b:.042,c:.032,key:"gem"},{seg:"sh",t:.3,phi:150,rr:.6,a:.13,b:.042,c:.032,key:"gem"},
 {seg:"sh",t:.4,phi:20,rr:.5,a:.13,b:.022,c:.02},
 {seg:"ua",t:.14,phi:40,rr:.8,a:.075,b:.042,c:.04,key:"omb"},{seg:"ua",t:.14,phi:95,rr:.8,a:.08,b:.042,c:.042,key:"omb"},{seg:"ua",t:.14,phi:145,rr:.8,a:.075,b:.042,c:.04,key:"omb"},
 {seg:"ua",t:.5,phi:0,rr:.62,a:.125,b:.037,c:.032,key:"bic"},{seg:"ua",t:.5,phi:180,rr:.58,a:.13,b:.038,c:.034,key:"tri"},{seg:"ua",t:.45,phi:120,rr:.55,a:.1,b:.03,c:.03,key:"tri"},
 {seg:"fa",t:.22,phi:-10,rr:.62,a:.1,b:.03,c:.03,key:"ant"},{seg:"fa",t:.25,phi:170,rr:.6,a:.1,b:.028,c:.028,key:"ant"},{seg:"fa",t:.15,phi:85,rr:.68,a:.09,b:.026,c:.026,key:"ant"}
];
var RAD={th:[.078,.055],sh:[.052,.034],ua:[.047,.036],fa:[.037,.026]};// [proximal, distal]
function rad(seg,t){return RAD[seg][0]+(RAD[seg][1]-RAD[seg][0])*t}
function build(){
  SPH=new T3.SphereGeometry(1,18,14);
  M.torso=mk(torsoGeo(),C.base);
  M.srT=mk(torsoGeo(-.30,.13,1.05,false),C.shorts,.8);
  M.srT.visible=false;
  ["N","F"].forEach(function(n){
    ["th","sh","ua","fa"].forEach(function(s){M[s+n]=cyl(RAD[s][1],RAD[s][0],C.base)});
    M["jk"+n]=sph(C.base);M["je"+n]=sph(C.base);M["js"+n]=sph(C.base);M["jw"+n]=sph(C.skin);M["ja"+n]=sph(C.base);
    M["shoe"+n]=sph(C.shoe,.5);M["sole"+n]=sph(C.sole,.7);
    M["hand"+n]=sph(C.skin);M["thumb"+n]=sph(C.skin);
    M["sr"+n]=cyl(.082,.097,C.shorts);M["sr"+n].visible=false;
  });
  M.neck=cyl(.05,.056,C.skin);M.head=sph(C.skin);M.nose=sph(C.skin);M.chin=sph(C.skin);M.hair=mk(new T3.SphereGeometry(1,18,10,0,Math.PI*2,0,1.32),C.hair,.9);
  M.eyeA=sph(0x222222,.3);M.eyeB=sph(0x222222,.3);M.earA=sph(C.skin);M.earB=sph(C.skin);M.browA=sph(C.hair,.9);M.browB=sph(C.hair,.9);M.mouth=sph(C.lip,.6);
  TM.forEach(function(s){var n=s.both?2:1;s.m=[];for(var i=0;i<n;i++)s.m.push(sph(C.rest,.55))});
  LM.forEach(function(s){s.m=[sph(C.rest,.55),sph(C.rest,.55)]});
  var fl=new T3.Mesh(new T3.CircleGeometry(2.6,60),new T3.MeshStandardMaterial({color:0xe9ebee,roughness:1}));fl.rotation.x=-Math.PI/2;fl.position.y=-.003;root.add(fl);
  var gr=new T3.GridHelper(5,25,0xd5d8dd,0xdfe2e6);root.add(gr);
  shadow=new T3.Mesh(new T3.CircleGeometry(1,32),new T3.MeshBasicMaterial({color:0,transparent:true,opacity:.12}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;inner.add(shadow);
  eqG=new T3.Group();inner.add(eqG);benchG=new T3.Group();inner.add(benchG);
  built=true;
}
// ---------- equipamento ----------
var STEEL=new T3.MeshStandardMaterial({color:0xa4abb3,metalness:.75,roughness:.3}),PLATE=new T3.MeshStandardMaterial({color:0x1b1f24,roughness:.5}),PLATE2=new T3.MeshStandardMaterial({color:0x2a3037,roughness:.5});
function cylZ(r,l,mat,z){var m=new T3.Mesh(new T3.CylinderGeometry(r,r,l,24),mat);m.rotation.x=Math.PI/2;m.position.z=z||0;return m}
function setEq(ex){
  while(eqG.children.length)eqG.remove(eqG.children[0]);eqG.userData={};
  var kind=ex.eq;
  if(kind==="bar"){
    var g=new T3.Group();g.add(cylZ(.0145,1.7,STEEL));
    [1,-1].forEach(function(s){g.add(cylZ(.022,.3,STEEL,s*.7));g.add(cylZ(.15,.036,PLATE,s*.6));g.add(cylZ(.15,.036,PLATE2,s*.64));g.add(cylZ(.045,.008,STEEL,s*.82))});
    eqG.add(g);eqG.userData.bar=g;
  } else if(kind==="db"||kind==="dbN"||kind==="db1"){
    eqG.userData.db=[];
    var n=kind==="db"?2:1;
    for(var i=0;i<n;i++){
      var d=new T3.Group();d.add(cylZ(.016,.15,STEEL));
      [1,-1].forEach(function(s){d.add(cylZ(.085,.045,PLATE,s*.09));d.add(cylZ(.05,.03,PLATE2,s*.125))});
      var w=new T3.Group();w.add(d);
      var ax=ex.dba||"z";if(ax==="x")d.rotation.y=Math.PI/2;else if(ax==="y")d.rotation.x=Math.PI/2;
      eqG.add(w);eqG.userData.db.push(w);
    }
  }
  while(benchG.children.length)benchG.remove(benchG.children[0]);
  var b=ex.bench;
  if(b){
    var pad=new T3.MeshStandardMaterial({color:0x2b3139,roughness:.8}),fr=new T3.MeshStandardMaterial({color:0x59626d,roughness:.5,metalness:.4});
    var bz=b.rot==="z",L=bz?1.2:(b.x1-b.x0),W=bz?(b.x1-b.x0):.28,cx=(b.x0+b.x1)/2,cz=bz?0:(b.zc||0);
    var top=b.top,p1=new T3.Mesh(new T3.BoxGeometry(bz?W:L,.07,bz?L:W),pad);p1.position.set(cx,top-.035,cz);benchG.add(p1);
    var p2=new T3.Mesh(new T3.BoxGeometry(bz?W*.9:L*.98,.03,bz?L*.98:W*.9),fr);p2.position.set(cx,top-.085,cz);benchG.add(p2);
    var ends=bz?[[cx,cz-.46],[cx,cz+.46]]:[[b.x0+.14,cz],[b.x1-.14,cz]];
    ends.forEach(function(e){
      var hh=top-.1,bar=new T3.Mesh(new T3.BoxGeometry(bz?.05:.05,hh,bz?.05:.2),fr);
      if(bz){bar=new T3.Mesh(new T3.BoxGeometry(.2,hh,.05),fr)}
      bar.position.set(e[0],hh/2,e[1]);benchG.add(bar);
      var ft=new T3.Mesh(new T3.BoxGeometry(bz?.34:.06,.03,bz?.06:.34),fr);ft.position.set(e[0],.015,e[1]);benchG.add(ft);
    });
  }
}
function recolor(ex){
  var P={},Sx={};(ex.p||[]).forEach(function(k){P[k]=1});(ex.s||[]).forEach(function(k){Sx[k]=1});
  function col(key){return key&&P[key]?C.pri:key&&Sx[key]?C.sec:null}
  function apply(m,key){var c=col(key);m.material.color.setHex(c||C.rest);m.material.emissive.setHex(c?(c===C.pri?0x3a0000:0x2a0a08):0);m.userData.act=c?1:0;m.userData.pri=c===C.pri?1:0}
  TM.forEach(function(s){s.m.forEach(function(m){apply(m,s.key)})});
  LM.forEach(function(s){s.m.forEach(function(m){apply(m,s.key)})});
}
// ---------- atualização ----------
function updateBody(P){
  var h=P.hints,T=basis(P.H,P.S,P.A);
  place(M.torso,P.H,T.x,T.y,T.z,1,K.TO,1);place(M.srT,P.H,T.x,T.y,T.z,1,K.TO,1);
  var F={T:T};
  ["N","F"].forEach(function(n){
    F["th"+n]=basis(P["hip"+n],P["k"+n],h["th"+n]);F["sh"+n]=basis(P["k"+n],P["a"+n],h["sh"+n]);
    F["ua"+n]=basis(P["s"+n],P["e"+n],h["ua"+n]);F["fa"+n]=basis(P["e"+n],P["w"+n],h["fa"+n]);
    ["th","sh","ua","fa"].forEach(function(s){var f=F[s+n],mid=add(f.o,mul(f.y,f.L/2));place(M[s+n],mid,f.x,f.y,f.z,1,f.L,1)});
    var ft=F["th"+n];place(M["sr"+n],add(ft.o,mul(ft.y,ft.L*.22)),ft.x,ft.y,ft.z,1,ft.L*.44,1);
    var I=[1,0,0],J=[0,1,0],Kz=[0,0,1];
    place(M["jk"+n],P["k"+n],I,J,Kz,.056,.056,.056);place(M["je"+n],P["e"+n],I,J,Kz,.04,.04,.04);
    place(M["js"+n],P["s"+n],I,J,Kz,.056,.056,.056);place(M["jw"+n],P["w"+n],I,J,Kz,.03,.03,.03);place(M["ja"+n],P["a"+n],I,J,Kz,.04,.04,.04);
    // pé
    var a=P["a"+n],t=P["t"+n],fd=norm(sub(t,a)),fb=basis(a,t,h["ft"+n]),dors=fb.x;
    var cen=add(add(mul(add(a,t),.5),mul(fd,-.015)),mul(dors,-.012));
    place(M["shoe"+n],cen,fb.x,fb.y,fb.z,.045,.15,.05);
    place(M["sole"+n],add(cen,mul(dors,-.04)),fb.x,fb.y,fb.z,.012,.155,.052);
    // mão
    var hd=P["hd"+n],w=P["w"+n],hb=basis(w,add(w,hd),h["fa"+n]);
    if(len(sub(hd,[1,0,0]))<1e-6&&Math.abs(hd[1])<1e-6)hb=basis(w,add(w,hd),[0,1,0]);
    var hc=add(w,mul(hd,.05));place(M["hand"+n],hc,hb.x,hb.y,hb.z,.024,.058,.044);
    place(M["thumb"+n],add(add(w,mul(hd,.025)),mul(hb.z,(n==="N"?1:-1)*.0)),hb.x,hb.y,hb.z,.012,.03,.02);
    M["thumb"+n].visible=false;
  });
  // cabeça e pescoço
  var hb2=basis(P.head,add(P.head,P.HU),P.HA);
  var nb=sub(P.head,mul(P.HU,.095)),nbasis=basis(P.S,nb,P.HA);place(M.neck,mul(add(P.S,nb),.5),nbasis.x,nbasis.y,nbasis.z,1,nbasis.L,1);
  place(M.head,P.head,hb2.x,hb2.y,hb2.z,.1,.117,.077);
  place(M.nose,add(P.head,add(mul(hb2.x,.1),mul(hb2.y,-.012))),hb2.x,hb2.y,hb2.z,.022,.03,.014);
  place(M.chin,add(P.head,add(mul(hb2.x,.05),mul(hb2.y,-.085))),hb2.x,hb2.y,hb2.z,.045,.04,.052);
  place(M.hair,add(P.head,add(mul(hb2.x,-.012),mul(hb2.y,.012))),hb2.x,hb2.y,hb2.z,.108,.124,.082);
  [1,-1].forEach(function(s,i){
    place(i?M.earB:M.earA,add(P.head,add(mul(hb2.x,-.006),mul(hb2.z,s*.077))),hb2.x,hb2.y,hb2.z,.012,.027,.01);
    place(i?M.browB:M.browA,add(P.head,add(add(mul(hb2.x,.087),mul(hb2.y,.048)),mul(hb2.z,s*.032))),hb2.x,hb2.y,hb2.z,.008,.006,.022);
  });
  place(M.mouth,add(P.head,add(mul(hb2.x,.088),mul(hb2.y,-.05))),hb2.x,hb2.y,hb2.z,.006,.007,.021);
  [1,-1].forEach(function(s,i){place(i?M.eyeB:M.eyeA,add(P.head,add(add(mul(hb2.x,.088),mul(hb2.y,.022)),mul(hb2.z,s*.032))),hb2.x,hb2.y,hb2.z,.01,.01,.01)});
  // músculos do tronco
  TM.forEach(function(s){
    var r=ringAt(s.t);
    (s.both?[1,-1]:[1]).forEach(function(sg,i){
      var l=s.l*sg,k=Math.max(0,1-(l/r.w)*(l/r.w)),sq=Math.sqrt(k),x;
      if(s.face==="f")x=r.f+r.d*sq-s.b*.55;else if(s.face==="b")x=r.f-r.d*sq+s.b*.55;else x=r.f;
      if(s.face==="s"){l=sg*(r.w*.985-s.c*.5);x=r.f}
      var o=add(add(add(T.o,mul(T.y,s.t*K.TO)),mul(T.x,x)),mul(T.z,l));
      place(s.m[i],o,T.x,T.y,T.z,s.b,s.a,s.c);
    });
  });
  LM.forEach(function(s){
    ["N","F"].forEach(function(n,i){
      var f=F[s.seg+n],sg=n==="N"?1:-1,R=rad(s.seg,s.t)*s.rr,ph=s.phi*Math.PI/180;
      var dir=add(mul(f.x,Math.cos(ph)),mul(f.z,Math.sin(ph)*sg));
      var o=add(add(f.o,mul(f.y,s.t*f.L)),mul(dir,R));
      place(s.m[i],o,f.x,f.y,f.z,s.b,s.a,s.c);
    });
  });
  // equipamento
  var pN=add(P.wN,mul(P.hdN,.05)),pF=add(P.wF,mul(P.hdF,.05));
  if(eqG.userData.bar){var bm=mul(add(pN,pF),.5);eqG.userData.bar.position.set(bm[0],bm[1],0)}
  if(eqG.userData.db){
    var D=eqG.userData.db;
    if(cur.eq==="db"){D[0].position.set(pN[0],pN[1],pN[2]);D[1].position.set(pF[0],pF[1],pF[2])}
    else if(cur.eq==="dbN"){D[0].position.set(pN[0],pN[1],pN[2])}
    else{var mm=mul(add(pN,pF),.5);D[0].position.set(mm[0],mm[1],mm[2])}
  }
  var xs=[P.H[0],P.S[0],P.aN[0],P.tN[0],P.wN[0],P.aF[0],P.wF[0],P.tF[0],P.head[0]],mn=Math.min.apply(null,xs),mx=Math.max.apply(null,xs);
  shadow.position.x=(mn+mx)/2;shadow.scale.set((mx-mn)/2+.25,.4,1);
}
var PH=0;
function pulse(now){
  var v=.55+.45*Math.sin(now*.005),vs=.5+.5*Math.sin(now*.005);
  function f(s){s.m.forEach(function(m){if(m.userData.act){var base=m.userData.pri?.35:.2;m.material.emissiveIntensity=base*(.55+.9*v)}})}
  TM.forEach(f);LM.forEach(f);
}
function size(){
  if(!el||!ren)return;var w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
  ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();applyCam();
}
V.init=function(container){
  el=container;
  ren=new T3.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:false});
  ren.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  var cv=ren.domElement;cv.style.width="100%";cv.style.height="100%";cv.style.display="block";cv.style.touchAction="none";cv.style.cursor="grab";
  el.appendChild(cv);
  scn=new T3.Scene();cam=new T3.PerspectiveCamera(30,1,.1,50);
  scn.add(new T3.HemisphereLight(0xffffff,0x9aa0a8,.95));
  var dl=new T3.DirectionalLight(0xffffff,.95);dl.position.set(2.5,4,3.5);scn.add(dl);
  var dl2=new T3.DirectionalLight(0xa9c8ff,.4);dl2.position.set(-3,2.2,-2.5);scn.add(dl2);
  var dl3=new T3.DirectionalLight(0xffe2cc,.3);dl3.position.set(-2,1,3);scn.add(dl3);
  root=new T3.Group();scn.add(root);inner=new T3.Group();root.add(inner);
  build();size();
  var down=false,lx=0,ly=0;
  cv.addEventListener("pointerdown",function(e){down=true;lx=e.clientX;ly=e.clientY;cv.setPointerCapture(e.pointerId);cv.style.cursor="grabbing"});
  cv.addEventListener("pointerup",function(){down=false;cv.style.cursor="grab"});
  cv.addEventListener("pointermove",function(e){if(!down)return;yaw+=(e.clientX-lx)*.01;pitch=Math.max(-.15,Math.min(.7,pitch+(e.clientY-ly)*.005));lx=e.clientX;ly=e.clientY});
  window.addEventListener("resize",size);
  requestAnimationFrame(loop);
};
V.setView=function(n){yaw=n==="frente"?-Math.PI/2:n==="3/4"?-.85:-.32};
function fitEx(ex){
  var xs=[],ys=[];
  [0,.5,1].forEach(function(k){
    var P=S.skel(S.mix(ex.poses[0],ex.poses[1],k));
    ["H","S","head","aN","aF","tN","tF","wN","wF","eN","eF","kN","kF"].forEach(function(n){xs.push(P[n][0]);ys.push(P[n][1])});
    ys.push(P.head[1]+.13);
  });
  if(ex.bench){xs.push(ex.bench.x0,ex.bench.x1)}
  var mn=Math.min.apply(null,xs),mx=Math.max.apply(null,xs),yt=Math.max.apply(null,ys)+.1;
  var front=(ex.view==="frente");
  ex._f={cx:(mn+mx)/2,cy:yt/2,w:front?2.0:(mx-mn)+.5,h:yt+.1};
}
function applyCam(){
  if(!cur||!cur._f||!cam)return;
  var f=cur._f,asp=cam.aspect||1.3,dist=Math.max(f.h*1.12,f.w/asp*1.05)/(2*Math.tan(15*Math.PI/180))/(cur.zoom||1);
  camY=f.cy;cam.position.set(0,camY+dist*.06,dist);cam.lookAt(0,camY,0);
}
V.show=function(ex){
  cur=ex;t0=performance.now();lastPh=-1;frozen=null;
  if(!ex._f)fitEx(ex);
  setEq(ex);recolor(ex);inner.position.x=-ex._f.cx;
  V.setView(ex.view||"lado");size();applyCam();
};
function ease(k){return .5-.5*Math.cos(Math.PI*k)}
function pose(k){return S.mix(cur.poses[0],cur.poses[1],k)}
V.snap=function(ex,k,view,pit){ // para testes: imagem fixa
  V.show(ex);V.setView(view||ex.view||"lado");frozen=k;pitch=pit==null?.1:pit;
  updateBody(S.skel(pose(k)));pulse(0);root.rotation.y=yaw;root.rotation.x=pitch;ren.render(scn,cam);
  return ren.domElement.toDataURL("image/jpeg",.82);
};
function loop(now){
  requestAnimationFrame(loop);
  if(!cur||!ren||!el.offsetParent||frozen!=null)return;
  if(Math.abs(el.clientWidth*ren.getPixelRatio()-ren.domElement.width)>2)size();
  var tp=cur.tempo||[2,.4,2.5,.4],Tt=tp[0]+tp[1]+tp[2]+tp[3],tt=((now-t0)/1000)%Tt,k,ph;
  if(tt<tp[0]){ph=0;k=ease(tt/tp[0])}
  else if(tt<tp[0]+tp[1]){ph=1;k=1}
  else if(tt<tp[0]+tp[1]+tp[2]){ph=2;k=1-ease((tt-tp[0]-tp[1])/tp[2])}
  else{ph=3;k=0}
  if(ph!==lastPh){lastPh=ph;if(V.onPhase)V.onPhase((cur.fz||[])[ph]||"",ph)}
  updateBody(S.skel(pose(k)));pulse(now);
  root.rotation.y=yaw;root.rotation.x=pitch;
  ren.render(scn,cam);
}
})();
