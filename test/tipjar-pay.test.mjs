import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";
import { renderPage } from "../web.mjs";
import { TIPJAR_QR_PAY_URI, tipJarQrSvg } from "../tipjar-qr.mjs";

const BASE = "http://localhost";
const WALLET = "Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z";
const BASE_WALLET = "0xf1c2581CBEdF9020B6269eefAaB1Dc4F1e9261F2";
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
  assert.equal((panel.match(/<button\b/g)||[]).length,1);
  assert.doesNotMatch(panel,/<a\b|Open wallet|QR code|Solscan/);
  assert.doesNotMatch(panel,/counter-tip-icon/);
  assert.match(html,/counterJar.hidden=select.value!=="counter"/);
});

test("Tip Jar exposes Base mainnet recipient without changing default Solana behavior",async()=>{
  const defaultValue=await (await req("/api/tipjar")).json();
  assert.equal(defaultValue.network,"solana");
  assert.equal(defaultValue.address,WALLET);
  assert.deepEqual(defaultValue.networks.map(n=>n.network),["solana","base"]);
  assert.deepEqual(defaultValue.networks.map(n=>n.address),[WALLET,BASE_WALLET]);
  const result=await req("/api/tipjar?network=base");
  assert.equal(result.status,200);
  const base=await result.json();
  assert.equal(base.network,"base");
  assert.equal(base.chainId,8453);
  assert.equal(base.address,BASE_WALLET);
  assert.equal(base.accepted,"ETH");
  assert.equal(base.autoTip,false);
  assert.equal(base.walletApprovalRequired,true);
  assert.equal(base.paymentUrl,null,"A Solana Pay request must never be used on Base");
  assert.equal(base.usdc,"supported");
  assert.match(base.note,/Base mainnet/);
  assert.match(base.note,/No signing, automatic transfer/);
  const solExplicit=await (await req("/api/tipjar?network=solana")).json();
  assert.equal(solExplicit.paymentUrl,TIPJAR_QR_PAY_URI);
});

test("Tip Jar rejects unsupported networks and Base amount-to-URI requests",async()=>{
  for(const value of ["","ethereum","polygon","arbitrum","Base","0x","solana,base"]){
    const response=await req("/api/tipjar?network="+encodeURIComponent(value));
    assert.equal(response.status,400,value);
    assert.match((await response.json()).error,/Invalid network/);
  }
  const invalid=await req("/api/tipjar?network=base&amount=0.01");
  assert.equal(invalid.status,400);
  assert.match((await invalid.json()).error,/supported only for Solana/);
});

test("MCP Tip Jar reports confirmed Base chain, rejects unconfirmed chains",async()=>{
  const list=await mcp(20,"tools/list");
  const tip=list.data.result.tools.find(x=>x.name==="moltbeer_get_tipjar");
  assert.deepEqual(tip.inputSchema.properties.network.enum,["solana","base"]);
  const value=await mcp(21,"tools/call",{name:"moltbeer_get_tipjar",arguments:{network:"base"}});
  assert.equal(value.http,200);
  assert.equal(value.data.result.isError,false);
  const result=JSON.parse(value.data.result.content[0].text);
  assert.equal(result.address,BASE_WALLET);
  assert.equal(result.chainId,8453);
  assert.equal(result.paymentUrl,null);
  const denied=await mcp(22,"tools/call",{name:"moltbeer_get_tipjar",arguments:{network:"ethereum"}});
  assert.equal(denied.data.result.isError,true);
  assert.match(denied.data.result.content[0].text,/Invalid network/);
  const amount=await mcp(23,"tools/call",{name:"moltbeer_get_tipjar",arguments:{network:"base",amount:"0.01"}});
  assert.equal(amount.data.result.isError,true);
});

test("Counter offers a compact Solana/Base network selector and still only Copy wallet",()=>{
  const html=renderPage("/bar-room");
  const start=html.indexOf('<div id="counter-tip-jar"'),end=html.indexOf('<p id="bar-scene-summary"',start);
  const panel=html.slice(start,end);
  assert.match(panel,/<select id="counter-tip-network"/);
  assert.match(panel,/value="solana">Solana/);
  assert.match(panel,/value="base">Base/);
  assert.match(panel,/<select id="counter-tip-asset"/);
  assert.match(panel,/value="SOL">SOL/);
  assert.match(panel,/value="USDC">USDC \(native\)/);
  assert.match(html,/tipAddresses=\{solana:"Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z",base:"0xf1c2581CBEdF9020B6269eefAaB1Dc4F1e9261F2"\}/);
  assert.match(html,/navigator.clipboard.writeText\(tipAddress.textContent\)/);
  assert.equal((panel.match(/<button\b/g)||[]).length,1);
  assert.doesNotMatch(panel,/<a\b|Open wallet|QR code|Solscan/);
  assert.doesNotMatch(html,/counter-tip-icon/);
});

test("Circle native USDC metadata is correct on Solana and Base",async()=>{
  const sol=await (await req("/api/tipjar?network=solana&asset=USDC")).json();
  assert.equal(sol.asset,"USDC");
  assert.equal(sol.accepted,"USDC");
  assert.equal(sol.address,WALLET);
  assert.equal(sol.token.mint,"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  assert.equal(sol.token.decimals,6);
  assert.equal(sol.token.standard,"SPL");
  assert.equal(sol.usdc,"supported");
  assert.equal(sol.paymentUrl.startsWith("solana:"+WALLET+"?"),true);
  const solParams=new URLSearchParams(sol.paymentUrl.split("?")[1]);
  assert.equal(solParams.get("spl-token"),sol.token.mint);
  assert.equal(solParams.has("amount"),false);
  const base=await (await req("/api/tipjar?network=base&asset=USDC")).json();
  assert.equal(base.network,"base");
  assert.equal(base.chainId,8453);
  assert.equal(base.address,BASE_WALLET);
  assert.equal(base.asset,"USDC");
  assert.equal(base.accepted,"USDC");
  assert.equal(base.usdc,"supported");
  assert.equal(base.token.contract,"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  assert.equal(base.token.standard,"ERC-20");
  assert.equal(base.token.decimals,6);
  assert.equal(base.paymentUrl,null);
  assert.equal(base.autoTip,false);
  assert.equal(base.walletApprovalRequired,true);
  for(const network of [sol,base])assert.deepEqual(network.assets.map(a=>a.symbol),network.network==="solana"?["SOL","USDC"]:["ETH","USDC"]);
});

test("Solana USDC payment request handles six decimals and rejects unsafe combinations",async()=>{
  for(const amount of ["0.000001","1","0.1","100"]){
    const r=await req("/api/tipjar?network=solana&asset=USDC&amount="+encodeURIComponent(amount));
    assert.equal(r.status,200,amount);
    const value=await r.json();
    assert.equal(value.amount,amount);
    const params=new URLSearchParams(value.paymentUrl.split("?")[1]);
    assert.equal(params.get("amount"),amount);
    assert.equal(params.get("spl-token"),"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  }
  for(const amount of ["","0","0.0000001","100.000001","101","1e1","1,2","1&asset=ETH"]){
    const r=await req("/api/tipjar?network=solana&asset=USDC&amount="+encodeURIComponent(amount));
    assert.equal(r.status,400,amount);
    assert.match((await r.json()).error,/Invalid amount/);
  }
  for(const [network,asset] of [["solana","ETH"],["base","SOL"],["base","USDbC"],["solana","usdc"],["base","USDT"],["base",""]]){
    const r=await req("/api/tipjar?network="+encodeURIComponent(network)+"&asset="+encodeURIComponent(asset));
    assert.equal(r.status,400,network+":"+asset);
    assert.match((await r.json()).error,/Invalid asset/);
  }
  const baseAmount=await req("/api/tipjar?network=base&asset=USDC&amount=1");
  assert.equal(baseAmount.status,400);
});

test("MCP correctly discovers native USDC on both networks without transfer capability",async()=>{
  const list=await mcp(71,"tools/list");
  const tool=list.data.result.tools.find(x=>x.name==="moltbeer_get_tipjar");
  assert.ok(tool);
  assert.deepEqual(tool.inputSchema.properties.asset.enum,["SOL","ETH","USDC"]);
  for(const [network,addr] of [["solana",WALLET],["base",BASE_WALLET]]){
    const out=await mcp(72,"tools/call",{name:"moltbeer_get_tipjar",arguments:{network,asset:"USDC"}});
    assert.equal(out.http,200);
    assert.equal(out.data.result.isError,false);
    const value=JSON.parse(out.data.result.content[0].text);
    assert.equal(value.address,addr);
    assert.equal(value.accepted,"USDC");
    assert.equal(value.autoTip,false);
    assert.equal(value.walletApprovalRequired,true);
  }
  const rejected=await mcp(73,"tools/call",{name:"moltbeer_get_tipjar",arguments:{network:"base",asset:"USDbC"}});
  assert.equal(rejected.data.result.isError,true);
});

test("Counter retains only Copy wallet with network and native USDC currency selector",()=>{
  const html=renderPage("/bar-room");
  const from=html.indexOf('<div id="counter-tip-jar"'),to=html.indexOf('<p id="bar-scene-summary"',from),panel=html.slice(from,to);
  assert.match(panel,/id="counter-tip-network"/);
  assert.match(panel,/id="counter-tip-asset"/);
  assert.match(panel,/USDC \(native\)/);
  assert.match(html,/tipAssets=\{solana:\["SOL","USDC"\],base:\["ETH","USDC"\]\}/);
  assert.match(html,/tipAsset\.replaceChildren\(\)/);
  assert.match(html,/tipAsset\.value=choices\.includes\(previous\)\?previous:choices\[0\]/);
  assert.match(html,/navigator\.clipboard\.writeText\(tipAddress\.textContent\)/);
  assert.equal((panel.match(/<button\b/g)||[]).length,1);
  assert.doesNotMatch(panel,/<a\b|Open wallet|QR code|Solscan/);
});
