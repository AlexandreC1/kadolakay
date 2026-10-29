"use client";
import { useEffect, useRef, type ReactNode } from "react";

export default function HomeMotion({children}:{children:ReactNode}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const node=root.current;
    if(!node||typeof IntersectionObserver==="undefined"||!Element.prototype.animate)return;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    let keyboardNavigation=false;
    const seen=new WeakSet<Element>(),pending=new Map<HTMLElement,Animation>(),animations=new Set<Animation>();
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const element=entry.target as HTMLElement;
        const animation=pending.get(element);
        observer.unobserve(element);pending.delete(element);
        if(!animation)return;
        if(reduced.matches){animation.cancel();animations.delete(animation);return;}
        const siblings=element.parentElement?Array.from(element.parentElement.children):[];
        const delay=Math.min(210,Math.max(0,siblings.indexOf(element))*65);
        animation.effect?.updateTiming({delay});animation.play();
        animation.finished.then(()=>{animation.cancel();animations.delete(animation);}).catch(()=>animations.delete(animation));
      });
    },{threshold:.08,rootMargin:"0px 0px -30px 0px"});
    function scan(){
      node!.querySelectorAll<HTMLElement>(".lakou-section-title,.lakou-merchant,.lakou-product-grid article,.lakou-occasions>div>a,.lakou-occasions>h2").forEach(element=>{
        if(seen.has(element))return;seen.add(element);
        if(reduced.matches||element.getBoundingClientRect().top<innerHeight-30)return;
        // WAAPI effects avoid mutating the HTML of server-streamed, not-yet-hydrated children.
        const animation=element.animate([{opacity:0,transform:"translateY(28px)"},{opacity:1,transform:"translateY(0)"}],{duration:650,easing:"cubic-bezier(.22,1,.36,1)",fill:"both"});
        animation.pause();animation.currentTime=0;void animation.finished.catch(()=>undefined);animations.add(animation);pending.set(element,animation);observer.observe(element);
      });
    }
    function revealAll(){animations.forEach(animation=>animation.cancel());animations.clear();pending.forEach((_,element)=>observer.unobserve(element));pending.clear();}
    function preference(){if(reduced.matches)revealAll();}
    function keyboardFocus(){if(keyboardNavigation)revealAll();}
    function key(event:KeyboardEvent){if(event.key==="Tab")keyboardNavigation=true;}
    function pointer(){keyboardNavigation=false;}
    scan();
    // Catalog sections can arrive after the shell through server streaming.
    const mutations=new MutationObserver(scan);mutations.observe(node,{childList:true,subtree:true});
    reduced.addEventListener("change",preference);
    node.addEventListener("focusin",keyboardFocus);
    document.addEventListener("keydown",key,true);document.addEventListener("pointerdown",pointer,true);
    return()=>{observer.disconnect();mutations.disconnect();animations.forEach(animation=>animation.cancel());reduced.removeEventListener("change",preference);node.removeEventListener("focusin",keyboardFocus);document.removeEventListener("keydown",key,true);document.removeEventListener("pointerdown",pointer,true);};
  },[]);
  return <div ref={root} className="lakou-home">{children}</div>;
}
