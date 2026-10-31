import test from "node:test";
import assert from "node:assert/strict";
import {handleX402Tip,X402_PUBLIC_INFO} from "../x402-tip.mjs";
import {fetchApp} from "../server.mjs";

const BASE="http://localhost";
const MAINNETS=["eip155:8453","solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"];
const GET=(p,h={})=>new Request(BASE+p,{headers:h});
function mockFacilitator({invalid=false,networkUnsupported=false,settleUnconfirmed=false,failVerify=false,failSettle=false}={}){
 const calls={supported:0,verify:0,settle:0,envelopes:[]};
 const fetcher=async(url,options)=>{
   const path=new URL(url).pathname;
   if(path==="/supported"){
     calls.supported++;
     const kinds=networkUnsupported?[]:MAINNETS.map(network=>({x402Version:2,scheme:"exact",network,...(network.startsWith("solana:")?{extra:{feePayer:"CjNFTjvBhbJJd2B5ePPMHRLx1ELZpa8dwQgGL727eKww"}}:{})}));
     return new Response(JSON.stringify({kinds}),{status:200});
   }
   const body=JSON.parse(options.body);
   calls.envelopes.push(body);
   if(path==="/verify"){
     calls.verify++;
     if(failVerify)throw Error("network down");
     return Response.json({isValid:!invalid,payer:"0x1234567890123456789012345678901234567890"});
   }
   if(path==="/settle"){
     calls.settle++;
     if(failSettle)throw Error("connection dropped");
     return Response.json({success:!settleUnconfirmed,
       network:body.paymentRequirements.network,
       transaction:body.paymentRequirements.network.startsWith("eip155:")?"0x"+"1".repeat(64):"4".repeat(64),
       payer:"0x1234567890123456789012345678901234567890"});
   }
   throw Error("Unexpected facilitator URL: "+url);
 };
 return {calls,fetcher};
}
const decode=header=>JSON.parse(Buffer.from(header,"base64").toString("utf8"));
async function challenge(network,amount,fac,clock=()=>1000000){
 const req=GET("/api/tipjar/x402?network="+network+"&amount="+amount);
 const response=await handleX402Tip(req,{fetcher:fac.fetcher,clock,enabled:true});
 assert.equal(response.status,402);
 const terms=decode(response.headers.get("payment-required"));
 return {terms,req,response};
}
function signature(terms){
 const payload={x402Version:2,resource:terms.resource,accepted:terms.accepts[0],
   payload:{signature:"0x"+"f".repeat(130),authorization:{from:"0x1234567890123456789012345678901234567890"}}};
 return Buffer.from(JSON.stringify(payload),"utf8").toString("base64");
}

test("x402 never gates existing free bar, and is disabled without explicit activation",async()=>{
 assert.equal((await fetchApp(GET("/api/beer"))).status,200);
 assert.equal((await fetchApp(GET("/api/menu"))).status,200);
 assert.equal((await fetchApp(GET("/api/tipjar"))).status,200);
 const info=await (await fetchApp(GET("/api/tipjar/x402/info"))).json();
 assert.equal(info.optional,true);assert.equal(info.freeBar,true);
 assert.equal(X402_PUBLIC_INFO.version,2);
 const off=await handleX402Tip(GET("/api/tipjar/x402"),{enabled:false});
 assert.equal(off.status,503);assert.equal((await off.json()).freeBar,true);
});

test("x402 v2 challenge offers exactly two mainnet native USDC options with correct payee",async()=>{
 const m=mockFacilitator();
 const b=await challenge("base","0.01",m);
 assert.equal(b.terms.x402Version,2);
 assert.equal(b.terms.accepts.length,1);
 assert.deepEqual({scheme:b.terms.accepts[0].scheme,network:b.terms.accepts[0].network,asset:b.terms.accepts[0].asset,payTo:b.terms.accepts[0].payTo,amount:b.terms.accepts[0].amount},
 {scheme:"exact",network:"eip155:8453",asset:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",payTo:"0xf1c2581CBEdF9020B6269eefAaB1Dc4F1e9261F2",amount:"10000"});
 assert.equal((await b.response.json()).barAlwaysFree,true);
 const s=await challenge("solana","0.05",m);
 assert.equal(s.terms.accepts[0].network,MAINNETS[1]);
 assert.equal(s.terms.accepts[0].asset,"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
 assert.equal(s.terms.accepts[0].payTo,"Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z");
 assert.equal(s.terms.accepts[0].amount,"50000");
 assert.ok(s.terms.accepts[0].extra.feePayer);
 assert.equal(m.calls.verify,0);assert.equal(m.calls.settle,0);
});

test("signed x402 tip requires facilitator verify then settle before returning success",async()=>{
 const fac=mockFacilitator();
 const {terms}=await challenge("base","0.10",fac);
 const r=await handleX402Tip(GET("/api/tipjar/x402?network=base&amount=0.10",{"PAYMENT-SIGNATURE":signature(terms)}),{fetcher:fac.fetcher,enabled:true});
 assert.equal(r.status,200);
 assert.equal(fac.calls.verify,1);assert.equal(fac.calls.settle,1);
 assert.equal(fac.calls.envelopes[0].x402Version,2);
 assert.deepEqual(fac.calls.envelopes[0].paymentRequirements,terms.accepts[0]);
 const result=await r.json();
 assert.equal(result.received,true);assert.equal(result.amountUSDC,"0.10");
 assert.equal(result.transaction,"0x"+"1".repeat(64));
 assert.ok(r.headers.get("payment-response"));
 assert.equal(decode(r.headers.get("payment-response")).success,true);
});

test("x402 rejects wrong network, price, unsigned and forged payloads without settlement",async()=>{
 const fac=mockFacilitator();
 for(const p of ["?network=polygon","?network=base&amount=100","?network=base&amount=0.000001","?network=base&amount=0.03"]){
   const r=await handleX402Tip(GET("/api/tipjar/x402"+p),{fetcher:fac.fetcher,enabled:true});
   assert.equal(r.status,400,p);
 }
 const {terms}=await challenge("base","0.50",fac);
 const raw=decode(signature(terms));
 raw.accepted.payTo="0x"+"a".repeat(40);
 const bad=Buffer.from(JSON.stringify(raw)).toString("base64");
 const r=await handleX402Tip(GET("/api/tipjar/x402?network=base&amount=0.50",{"PAYMENT-SIGNATURE":bad}),{fetcher:fac.fetcher,enabled:true});
 assert.equal(r.status,402);
 assert.equal(fac.calls.verify,0);assert.equal(fac.calls.settle,0);
});

test("x402 failed verification, provider outage and unconfirmed settlement fail closed",async()=>{
 for(const mode of [{invalid:true,expected:402},{failVerify:true,expected:502},{settleUnconfirmed:true,expected:502},{failSettle:true,expected:502}]){
   const fac=mockFacilitator(mode);
   const {terms}=await challenge("solana","1.00",fac);
   const signed=GET("/api/tipjar/x402?network=solana&amount=1.00",{"PAYMENT-SIGNATURE":signature(terms)});
   const result=await handleX402Tip(signed,{fetcher:fac.fetcher,enabled:true});
   assert.equal(result.status,mode.expected,JSON.stringify(mode));
   assert.notEqual((await result.json()).received,true);
   if(mode.invalid||mode.failVerify)assert.equal(fac.calls.settle,0);
 }
});

test("facilitator missing supported mainnet returns 503 without advertising a payment",async()=>{
 const fac=mockFacilitator({networkUnsupported:true});
 const req=GET("/api/tipjar/x402?network=base&amount=0.05");
 const r=await handleX402Tip(req,{fetcher:fac.fetcher,enabled:true,clock:()=>Date.now()+100000000000});
 assert.equal(r.status,503);assert.equal(r.headers.get("payment-required"),null);
 assert.equal(fac.calls.verify,0);assert.equal(fac.calls.settle,0);
});

test("OpenAPI and generated agent skill describe opt-in x402 only, with free core intact",async()=>{
 const spec=await (await fetchApp(GET("/openapi.json"))).json();
 assert.ok(spec.paths["/api/tipjar/x402"]?.get);
 assert.ok(spec.paths["/api/tipjar/x402/info"]?.get);
 const skill=await (await fetchApp(GET("/SKILL.md"))).text();
 assert.match(skill,/x402\/info/);
 assert.match(skill,/wallet owner has explicitly approved/);
 assert.match(skill,/free bar and all drinks never require payment/);
});
