import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";
import { renderPage } from "../web.mjs";
import { TIPJAR_QR_PAY_URI, tipJarQrSvg } from "../tipjar-qr.mjs";

const BASE = "http://localhost";
const WALLET = "Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z";
const req=(path,options)=>fetchApp(new Request(BASE+path,options));
const mcp=async (id,method,params={})=> {
  const response=await req("/mcp",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method,params})});
  return {http:response.status, data:await response.json()};
};

test("Tip Jar API creates Solana Pay URL without amount or any transfer",async()=>{
  const r=await req("/api/tipjar");assert.equal(r.status,200);
  const value=await r.json();
  assert.deepEqual({network:value.network,address:value.address,optional:value.optional,autoTip:value.autoTip,accepted:value.accepted,approval:value.walletApprovalRequired,amount:value.amount},
    {network:"solana",address:WALLET,optional:true,autoTip:false,accepted:"SOL",approval:true,amount:null});
  assert.equal(value.paymentUrl,TIPJAR_QR_PAY_URI);
  assert.ok(value.paymentUrl.startsWith("solana:"+WALLET+"?"));
  assert.ok(!value.paymentUrl.includes("amount="),"missing amount means wallet chooser");
  assert.doesNotMatch(JSON.stringify(value),/privateKey|secretKey|signature|signedTransaction/i);
  assert.match(value.note,/No signing, automatic transfer/);
});

test("Tip Jar accepts valid optional SOL amounts and rejects malformed amounts",async()=>{
  for(const amount of ["0.000000001","0.01","1","5.5","100"]){
    const response=await req("/api/tipjar?amount="+encodeURIComponent(amount));assert.equal(response.status,200,amount);
    const value=await response.json();
    assert.equal(value.amount,amount);
    assert.equal(new URLSearchParams(value.paymentUrl.split("?")[1]).get("amount"),amount);
    assert.equal(value.autoTip,false);
  }
  for(const amount of ["","0","-1","+1","101","1e2","0.0000000001","Infinity","1,2","1&memo=hijack"," 1","01"]){
    const response=await req("/api/tipjar?amount="+encodeURIComponent(amount));
    assert.equal(response.status,400,amount);
    assert.match((await response.json()).error,/Invalid amount/);
  }
});

test("Tip Jar is discoverable in OpenAPI and agent skill without implying authorization",async()=>{
  const spec=await (await req("/openapi.json")).json();
  assert.ok(spec.paths["/api/tipjar"]?.get);
  assert.ok(spec.paths["/api/tipjar/qr.svg"]?.get);
  const description=await (await req("/SKILL.md")).text();
  assert.match(description,/moltbeer_get_tipjar/);
  assert.match(description,/wallet owner has explicitly approved/);
});

test("MCP returns read-only Tip Jar and flags invalid requested amounts",async()=>{
  let r=await mcp(1,"tools/list");
  assert.equal(r.http,200);
  const tip=r.data.result.tools.find(x=>x.name==="moltbeer_get_tipjar");
  assert.ok(tip);
  assert.deepEqual(tip.inputSchema.properties.amount.type,"string");
  r=await mcp(2,"tools/call",{name:"moltbeer_get_tipjar",arguments:{}});
  assert.equal(r.http,200);assert.equal(r.data.result.isError,false);
  const value=JSON.parse(r.data.result.content[0].text);
  assert.equal(value.paymentUrl,TIPJAR_QR_PAY_URI);
  assert.equal(value.autoTip,false);assert.equal(value.walletApprovalRequired,true);
  r=await mcp(3,"tools/call",{name:"moltbeer_get_tipjar",arguments:{amount:"0.05"}});
  assert.equal(r.http,200);
  assert.equal(JSON.parse(r.data.result.content[0].text).amount,"0.05");
  r=await mcp(4,"tools/call",{name:"moltbeer_get_tipjar",arguments:{amount:"-3"}});
  assert.equal(r.http,200);assert.equal(r.data.result.isError,true);
  assert.match(r.data.result.content[0].text,/Invalid amount/);
  assert.doesNotMatch(JSON.stringify(tip),/signTransaction|sendTransaction|transferFunds/);
});

test("offline QR SVG matches the amount-free payment request and requires no third party",async()=>{
  const r=await req("/api/tipjar/qr.svg");
  assert.equal(r.status,200);
  assert.match(r.headers.get("content-type"),/image\/svg\+xml/);
  const svg=await r.text();
  assert.equal(svg,tipJarQrSvg());
  assert.match(svg,/<svg/);
  assert.match(svg,/viewBox="0 0 49 49"/);
  assert.match(svg,/d="M[0-9]+ [0-9]+h1v1h-1z/);
  assert.doesNotMatch(svg,/<script|<image|(?:href|src)="https?:\/\//i);
  assert.equal((svg.match(/h1v1h-1z/g)||[]).length,840);
  assert.equal(TIPJAR_QR_PAY_URI, (await (await req("/api/tipjar")).json()).paymentUrl);
});

test("Counter exposes exactly Copy wallet while APIs retain read-only payment details",()=>{
  const html=renderPage("/bar-room");
  const start=html.indexOf('<div id="counter-tip-jar"');
  const end=html.indexOf('<p id="bar-scene-summary"',start);
  assert.ok(start>=0&&end>start);
  const panel=html.slice(start,end);
  assert.match(panel,/id="counter-tip-copy"/);
  assert.match(panel,/Copy wallet/);
  assert.match(panel,/counter-tip-wallet/);
  assert.match(panel,/No tab\. No pressure\. Just good vibes\./);
  assert.equal((panel.match(/<button\\b/g)||[]).length,1);
  assert.doesNotMatch(panel,/<a\\b|Open wallet|QR code|Solscan/);
  assert.doesNotMatch(panel,/counter-tip-icon/);
  assert.match(html,/counterJar.hidden=select.value!=="counter"/);
});
