"use client";
import { useEffect, useId, useRef, useState } from "react";

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
type Scene=ReturnType<typeof import("./basket-renderer").mountBasket>;

export default function LakouBasket({locale}:{locale:string}) {
  const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLElement>(null);
  const hintId=useId();
  const [ready,setReady]=useState(false);
  const copy=locale==="ht"?{hint:"Glise panyen an pou eksplore l",label:"Panyen 3D entèraktif. Glise pou vire l, oswa sèvi ak flèch klavye yo. Home remete l nan pozisyon li.",note:"Panyen ak objè dekoratif. Sa yo pa pwodwi pou vann."}:locale==="fr"?{hint:"Faites glisser le panier pour l’explorer",label:"Panier 3D interactif. Faites glisser ou utilisez les flèches du clavier. Début réinitialise la vue.",note:"Panier et objets décoratifs. Ces objets ne sont pas des produits en vente."}:{hint:"Drag the basket to explore",label:"Interactive 3D basket. Drag or use the arrow keys to turn it. Home resets the view.",note:"Basket and decorative objects. These are not products offered for sale."};

  useEffect(()=>{
    const node=canvas.current,root=host.current;
    if(!node||!root||typeof IntersectionObserver==="undefined"||typeof ResizeObserver==="undefined")return;
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
    if(connection?.saveData||["slow-2g","2g"].includes(connection?.effectiveType||""))return;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    let scene:Scene|null=null,cancelled=false,loading=false,visible=false,frame=0,lastTime=0;
    let baseYaw=.18,basePitch=.36,yaw=.18,pitch=.36,reveal=0,hoverYaw=0,hoverPitch=0,hovered=false,velocity=0,scrollGoal=0;
    let press:{id:number;x:number;y:number;time:number;type:string}|null=null;

    // Render while a spring, drag or scroll is changing. No perpetual idle render loop.
    function tick(time:number){
      frame=0;
      if(!scene||!visible||document.hidden)return;
      const dt=Math.min(.033,Math.max(.001,(time-(lastTime||time-16))/1000));lastTime=time;
      if(!press&&!reduced.matches){baseYaw+=velocity*dt;velocity*=Math.exp(-7*dt);}
      const targetYaw=baseYaw+hoverYaw+(reduced.matches?0:scrollGoal*.48);
      const targetPitch=clamp(basePitch+hoverPitch,.16,.72);
      const targetReveal=reduced.matches?0:Math.max(scrollGoal,press ? .55 : hovered ? .18 : 0);
      const ease=reduced.matches?1:1-Math.exp(-14*dt);
      yaw+=(targetYaw-yaw)*ease;pitch+=(targetPitch-pitch)*ease;reveal+=(targetReveal-reveal)*ease;
      scene.render(yaw,pitch,reveal);
      node!.dataset.yaw=yaw.toFixed(3); // Observable scene state for browser verification.
      if(!reduced.matches&&(Math.abs(targetYaw-yaw)>.0005||Math.abs(targetPitch-pitch)>.0005||Math.abs(targetReveal-reveal)>.0005||Math.abs(velocity)>.004))wake();
    }
    function wake(){if(!frame&&visible&&!document.hidden){frame=requestAnimationFrame(tick);}}
    function updateScroll(){
      const hero=root!.closest("section");
      if(hero){const rect=hero.getBoundingClientRect();scrollGoal=clamp(-rect.top/Math.max(1,rect.height*.85),0,1);}
      wake();
    }
    const observer=new IntersectionObserver(async entries=>{
      visible=entries[0].isIntersecting;
      if(!visible){cancelAnimationFrame(frame);frame=0;return;}
      if(!scene&&!loading){loading=true;try{const {mountBasket}=await import("./basket-renderer");if(cancelled)return;scene=mountBasket(node);setReady(true);}catch{return;}}
      updateScroll();
    },{rootMargin:"80px"});
    observer.observe(root);
    const resize=new ResizeObserver(wake);resize.observe(node);

    function down(event:PointerEvent){
      if(!scene?.hitTest(event.clientX,event.clientY))return;
      press={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),type:event.pointerType};
      node!.dataset.input="pointer";
      velocity=0;hoverYaw=0;hoverPitch=0;node!.setPointerCapture(event.pointerId);node!.style.cursor="grabbing";node!.dataset.dragging="true";node!.focus({preventScroll:true});
      if(event.pointerType==="mouse")event.preventDefault();
      wake();
    }
    function move(event:PointerEvent){
      if(press&&press.id===event.pointerId){
        const now=performance.now(),dx=event.clientX-press.x,dy=event.clientY-press.y;
        baseYaw-=dx*.011;
        if(press.type==="mouse")basePitch=clamp(basePitch+dy*.004,.16,.72);
        velocity=reduced.matches?0:clamp(-dx*.011/Math.max(.008,(now-press.time)/1000),-3.5,3.5);
        press={...press,x:event.clientX,y:event.clientY,time:now};wake();return;
      }
      if(event.pointerType!=="mouse")return;
      hovered=Boolean(scene?.hitTest(event.clientX,event.clientY));node!.style.cursor=hovered?"grab":"default";
      if(!reduced.matches&&hovered){const rect=node!.getBoundingClientRect();hoverYaw=(event.clientX-rect.left-rect.width/2)/rect.width*.18;hoverPitch=(event.clientY-rect.top-rect.height/2)/rect.height*.07;}else{hoverYaw=0;hoverPitch=0;}
      wake();
    }
    function release(event:PointerEvent){
      if(!press||press.id!==event.pointerId)return;
      if(event.type==="pointercancel"||performance.now()-press.time>90)velocity=0;
      press=null;node!.dataset.dragging="false";node!.style.cursor="grab";
      if(node!.hasPointerCapture(event.pointerId))node!.releasePointerCapture(event.pointerId);
      wake();
    }
    function leave(){if(!press){hovered=false;hoverYaw=0;hoverPitch=0;wake();}}
    function key(event:KeyboardEvent){
      node!.dataset.input="keyboard";
      if(event.key==="ArrowLeft")baseYaw-=.3;
      else if(event.key==="ArrowRight")baseYaw+=.3;
      else if(event.key==="ArrowUp")basePitch=clamp(basePitch-.08,.16,.72);
      else if(event.key==="ArrowDown")basePitch=clamp(basePitch+.08,.16,.72);
      else if(event.key==="Home"){baseYaw=.18;basePitch=.36;}
      else return;
      event.preventDefault();velocity=0;hoverYaw=0;hoverPitch=0;wake();
    }
    function preference(){hoverYaw=0;hoverPitch=0;velocity=0;wake();}
    function blur(){node!.dataset.input="";}
    function visibility(){lastTime=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;press=null;velocity=0;node!.dataset.dragging="false";node!.style.cursor="default";}else wake();}
    function lost(event:Event){event.preventDefault();cancelAnimationFrame(frame);frame=0;scene?.dispose();scene=null;setReady(false);}
    node.addEventListener("pointerdown",down);node.addEventListener("pointermove",move);node.addEventListener("pointerup",release);node.addEventListener("pointercancel",release);node.addEventListener("pointerleave",leave);node.addEventListener("keydown",key);node.addEventListener("blur",blur);node.addEventListener("webglcontextlost",lost);
    window.addEventListener("scroll",updateScroll,{passive:true});document.addEventListener("visibilitychange",visibility);reduced.addEventListener("change",preference);
    return()=>{cancelled=true;observer.disconnect();resize.disconnect();cancelAnimationFrame(frame);scene?.dispose();node.removeEventListener("pointerdown",down);node.removeEventListener("pointermove",move);node.removeEventListener("pointerup",release);node.removeEventListener("pointercancel",release);node.removeEventListener("pointerleave",leave);node.removeEventListener("keydown",key);node.removeEventListener("blur",blur);node.removeEventListener("webglcontextlost",lost);window.removeEventListener("scroll",updateScroll);document.removeEventListener("visibilitychange",visibility);reduced.removeEventListener("change",preference);};
  },[]);
  return <figure ref={host} className="lakou-basket">
    <div className="basket-ground" aria-hidden="true" />
    {!ready&&<svg className="basket-fallback" viewBox="0 0 400 300" fill="none" aria-hidden="true"><path d="M95 125c0-130 210-130 210 0M65 130l40 115q95 35 190 0l40-115M65 130q135 65 270 0M85 160q115 55 230 0M95 190q105 48 210 0M105 220q95 40 190 0M110 145l25 110M155 157l10 105M200 163v105M245 157l-10 105M290 145l-25 110" stroke="currentColor" strokeWidth="3"/></svg>}
    <canvas ref={canvas} tabIndex={ready?0:-1} role="img" aria-label={ready?copy.label:copy.note} aria-describedby={hintId} className={ready?"basket-canvas is-ready":"basket-canvas"}/>
    <figcaption id={hintId} className="basket-instruction">{ready?copy.hint:""}<span className="sr-only"> {copy.note}</span></figcaption>
  </figure>;
}
