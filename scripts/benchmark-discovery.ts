import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { db } from "../src/lib/db";
import { discoverGifts } from "../src/services/discovery";

async function main() {
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
  assert(process.env.RUN_DISCOVERY_BENCHMARK === "1" && ["localhost","127.0.0.1"].includes(url.hostname) && url.pathname.endsWith("_test"), "Disposable loopback test database and explicit opt-in required");
  const owner=await db.user.create({data:{email:`${randomUUID()}@example.invalid`,role:"BUSINESS_OWNER"}});
  try {
    const business=await db.business.create({data:{ownerId:owner.id,name:"Disposable benchmark fixture",slug:`benchmark-${randomUUID()}`,category:"home",status:"APPROVED"}});
    await db.product.createMany({data:Array.from({length:2000},(_,i)=>({businessId:business.id,name:`Benchmark fixture ${i}`,category:["home","baby","jewelry","clothing"][i%4],priceUSD:String(i%100+1),stockQuantity:5}))});
    const samples:number[]=[];
    for(let i=0;i<35;i++) {
      const start=performance.now();const result=await discoverGifts({budget:"50.00",currency:"USD",occasion:i%2?"WEDDING":"ANY"});
      assert(result.length<=12);assert(result.every(p=>Number(p.amount)<=50));
      if(i>=5)samples.push(performance.now()-start);
    }
    samples.sort((a,b)=>a-b);
    console.log(JSON.stringify({environment:"local disposable PostgreSQL, warm query only",fixtureProducts:2000,samples:samples.length,p50ms:Number(samples[14].toFixed(2)),p95ms:Number(samples[28].toFixed(2)),maxResults:12}));
  } finally { await db.user.delete({where:{id:owner.id}}); }
}
main().catch(()=>{console.error("Discovery benchmark failed");process.exitCode=1;}).finally(()=>db.$disconnect());
