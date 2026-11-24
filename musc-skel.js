/* Esqueleto 3D do boneco (sem three.js): cinemática de pose. Plano sagital XY, face para +x, chão y=0, z>0 = lado direito (câmara). */
(function(g){
var D=Math.PI/180;
var K={LT:.43,LS:.43,TO:.55,UA:.30,FA:.27,SZ:.19,HZ:.09};
function ik(p0,t,L1,L2,sg){
  var dx=t[0]-p0[0],dy=t[1]-p0[1],d=Math.hypot(dx,dy);
  var dd=Math.min(L1+L2-1e-3,Math.max(Math.abs(L1-L2)+1e-3,d));
  var b=Math.atan2(dy,dx),a=Math.acos(Math.max(-1,Math.min(1,(L1*L1+dd*dd-L2*L2)/(2*L1*dd))));
  return [[p0[0]+L1*Math.cos(b+sg*a),p0[1]+L1*Math.sin(b+sg*a)],[p0[0]+dd*Math.cos(b),p0[1]+dd*Math.sin(b)]];
}
var DEF={h:[0,.93],r:0,fn:[0,.08],hn:[0,.9],kb:1,eb:-1,gz:.2,fzn:.105,fzf:.105};
function lerp(a,b,k){return a+(b-a)*k}
var AR=["h","fn","ff","hn","hf","tn","tf"],SC=["r","lat","roll","gz","ez","fzn","fzf","hd"];
function mix(A,B,k){
  var o={},key;
  for(key in A)o[key]=A[key];for(key in B)o[key]=B[key];
  AR.forEach(function(n){
    var a=A[n]||B[n]||DEF[n],b=B[n]||A[n]||DEF[n];if(!a)return;
    o[n]=[lerp(a[0],b[0],k),lerp(a[1],b[1],k)];
  });
  SC.forEach(function(n){
    var a=A[n],b=B[n];if(a==null&&b==null)return;
    a=a==null?(DEF[n]!=null?DEF[n]:b):a;b=b==null?a:b;o[n]=lerp(a,b,k);
  });
  for(key in DEF)if(o[key]==null)o[key]=DEF[key];
  return o;
}
function v3(a,z){return [a[0],a[1],z]}
function cw(d,s){var l=Math.hypot(d[0],d[1])||1;return [-d[1]/l*s,d[0]/l*s,0]}// perpendicular (ccw) * sinal
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]}
function mul(a,k){return [a[0]*k,a[1]*k,a[2]*k]}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function rod(v,ax,c,s){var d=dot(ax,v),x=cross(ax,v);return [v[0]*c+x[0]*s+ax[0]*d*(1-c),v[1]*c+x[1]*s+ax[1]*d*(1-c),v[2]*c+x[2]*s+ax[2]*d*(1-c)]}
function skel(p){
  var r=p.r*D,h=p.h,U=[Math.sin(r),Math.cos(r),0],A=[Math.cos(r),-Math.sin(r),0];
  var s=[h[0]+K.TO*U[0],h[1]+K.TO*U[1]];
  var ha=p.r>0?Math.min(25,p.r*.4):0,hr=(p.hd!=null?p.hd:(p.r-ha))*D;
  var HU=[Math.sin(hr),Math.cos(hr),0],HA=[Math.cos(hr),-Math.sin(hr),0];
  var P={U:U,A:A,HU:HU,HA:HA,H:[h[0],h[1],0],S:[s[0],s[1],0]};
  P.head=[s[0]+.2*HU[0],s[1]+.2*HU[1],0];
  var hints={};
  ["N","F"].forEach(function(n){
    var sg=n==="N"?1:-1,ank=n==="N"?p.fn:(p.ff||p.fn),az=sg*(n==="N"?p.fzn:p.fzf),hz=sg*K.HZ,kz=hz+(az-hz)*.6;
    var L1=Math.sqrt(K.LT*K.LT-(kz-hz)*(kz-hz)),L2=Math.sqrt(K.LS*K.LS-(az-kz)*(az-kz));
    var q=ik(h,ank,L1,L2,p.kb),kn=q[0],a=q[1];
    var tp=n==="N"?p.tn:(p.tf||p.tn);
    var toe=tp?[tp[0],tp[1]]:[a[0]+.17,Math.max(a[1]-.06,.025)];
    P["hip"+n]=[h[0],h[1],hz];P["k"+n]=[kn[0],kn[1],kz];P["a"+n]=[a[0],a[1],az];P["t"+n]=[toe[0],toe[1],az];
    hints["th"+n]=cw([kn[0]-h[0],kn[1]-h[1]],p.kb);
    hints["sh"+n]=cw([a[0]-kn[0],a[1]-kn[1]],p.kb);
    hints["ft"+n]=cw([toe[0]-a[0],toe[1]-a[1]],1);
  });
  P.sN=[s[0],s[1],K.SZ];P.sF=[s[0],s[1],-K.SZ];
  var rolled=p.roll!=null&&Math.abs(p.roll)>.5;
  if(!rolled){
    ["N","F"].forEach(function(n){
      var sg=n==="N"?1:-1,sh=P["s"+n],e,w,hh,wz=sg*p.gz;
      if(p.lat!=null){
        var al=p.lat*D,al2=Math.max(0,p.lat-12)*D,fx=.1;
        var d1=[fx,-Math.cos(al),sg*Math.sin(al)],l1=Math.hypot(d1[0],d1[1],d1[2]);d1=mul(d1,K.UA/l1);
        e=add(sh,d1);
        var d2=[fx*.6,-Math.cos(al2),sg*Math.sin(al2)],l2=Math.hypot(d2[0],d2[1],d2[2]);d2=mul(d2,K.FA/l2);
        w=add(e,d2);
        hints["ua"+n]=[1,0,0];hints["fa"+n]=[1,0,0];
      } else {
        hh=n==="N"?p.hn:(p.hf||p.hn);
        var ez=sg*(p.ez!=null?p.ez:(K.SZ+p.gz)/2+.01);
        var L1=Math.sqrt(Math.max(K.UA*K.UA-(ez-sg*K.SZ)*(ez-sg*K.SZ),1e-4)),L2=Math.sqrt(Math.max(K.FA*K.FA-(wz-ez)*(wz-ez),1e-4));
        var q=ik([sh[0],sh[1]],hh,L1,L2,p.eb);
        e=[q[0][0],q[0][1],ez];w=[q[1][0],q[1][1],wz];
        hints["ua"+n]=cw([e[0]-sh[0],e[1]-sh[1]],-p.eb);
        hints["fa"+n]=cw([w[0]-e[0],w[1]-e[1]],-p.eb);
      }
      P["e"+n]=e;P["w"+n]=w;
      var fd=sub(w,e),fl=Math.hypot(fd[0],fd[1],fd[2])||1;P["hd"+n]=p["fl"+n]?[1,0,0]:mul(fd,1/fl);
    });
  } else {
    // prancha lateral: rodar tudo à volta do eixo da coluna (H->S)
    var th=p.roll*D,c=Math.cos(th),sn=Math.sin(th),Hh=P.H;
    function R(pt){var v=rod(sub(pt,Hh),U,c,sn);return add(Hh,v)}
    function Rv(v){return rod(v,U,c,sn)}
    ["hipN","hipF","kN","kF","aN","aF","tN","tF","sN","sF","head"].forEach(function(k){P[k]=R(P[k])});
    for(var k in hints)hints[k]=Rv(hints[k]);
    P.A=Rv(A);P.HA=Rv(HA);
    // pés: apontam na direção anterior
    ["N","F"].forEach(function(n){
      var a=P["a"+n];P["t"+n]=add(a,mul(P.A,.15));hints["ft"+n]=[-P.U[0],-P.U[1],0];
    });
    var sN=P.sN,sF=P.sF;
    P.eN=[sN[0],sN[1]-K.UA,sN[2]];P.wN=add(P.eN,mul([0,0,-1],K.FA));
    P.eF=[sF[0],sF[1]+K.UA,sF[2]];P.wF=[sF[0],sF[1]+K.UA+K.FA,sF[2]];
    hints.uaN=[1,0,0];hints.faN=[0,1,0];hints.uaF=[1,0,0];hints.faF=[1,0,0];
    P.hdN=[0,0,-1];P.hdF=[0,1,0];
  }
  P.hints=hints;
  return P;
}
var api={K:K,ik:ik,mix:mix,skel:skel,DEF:DEF};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
g.MSKEL=api;
})(typeof window!=="undefined"?window:globalThis);
