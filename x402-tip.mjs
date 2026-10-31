// Optional x402 v2 EXACT USDC tips. Does not gate any existing free route.
// Faciltator does cryptographic verification and on-chain settlement; never
// store private keys, sign on behalf of clients or assert success before settlement.
import {createHash} from "node:crypto";

const FACILITATOR="https://facilitator.payai.network";
const BASE_NETWORK="eip155:8453", SOL_NETWORK="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const BASE_WALLET="0xf1c2581CBEdF9020B6269eefAaB1Dc4F1e9261F2";
const SOL_WALLET="Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z";
const BASE_USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SOL_USDC="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PRICE_SET=new Set(["0.01","0.05","0.10","0.50","1.00"]);
const SUCCESS=new Map(), PENDING=new Map();
let supportCache=null, supportUntil=0;

const response=(value,status,headers={})=>new Response(JSON.stringify(value),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
  "access-control-allow-origin":"*","access-control-expose-headers":"PAYMENT-REQUIRED, PAYMENT-RESPONSE",
  "vary":"PAYMENT-SIGNATURE",...headers}
});
const b64=data=>Buffer.from(JSON.stringify(data),"utf8").toString("base64");
function exactDecimal(price){
  if(!PRICE_SET.has(price))throw new Error("Unsupported tip amount; choose 0.01, 0.05, 0.10, 0.50 or 1.00 USDC.");
  const [whole,fraction=""]=price.split(".");
  return String(BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,"0")));
}
function chosenNetwork(query){
  if(query!=="base"&&query!=="solana")throw new Error("Unsupported tip network.");
  return query==="base"?BASE_NETWORK:SOL_NETWORK;
}
async function provider(path,payload,fetcher){
  const controller=new AbortController();
  const stop=setTimeout(()=>controller.abort(),7000);
  try {
    const result=await fetcher(FACILITATOR+path,{
      method:payload?"POST":"GET",headers:payload?{"content-type":"application/json"}:undefined,
      body:payload?JSON.stringify(payload):undefined,signal:controller.signal,
      redirect:"error"
    });
    if(!result.ok)throw new Error("Facilitator unavailable");
    const data=await result.json();
    if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Facilitator malformed response");
    return data;
  } finally {clearTimeout(stop)}
}
async function support(network,fetcher,clock){
  const now=clock();
  if(!supportCache||now>=supportUntil){
    const list=await provider("/supported",null,fetcher);
    if(!Array.isArray(list.kinds))throw new Error("Facilitator missing supported kinds");
    supportCache=list.kinds; supportUntil=now+30_000;
  }
  const kind=supportCache.find(k=>k.x402Version===2&&k.scheme==="exact"&&k.network===network);
  if(!kind)throw new Error("Facilitator does not support x402 v2 exact on requested mainnet");
  if(network===SOL_NETWORK && (typeof kind.extra?.feePayer!=="string"||kind.extra.feePayer.length<32))
    throw new Error("Solana facilitator fee payer missing");
  return kind;
}
function terms(chain,amount,kind){
  return {
    scheme:"exact",network:chain,amount,asset:chain===BASE_NETWORK?BASE_USDC:SOL_USDC,
    payTo:chain===BASE_NETWORK?BASE_WALLET:SOL_WALLET,maxTimeoutSeconds:300,
    extra:chain===BASE_NETWORK?{name:"USD Coin",version:"2"}:{feePayer:kind.extra.feePayer}
  };
}
function isPlainObject(o){return o!==null&&typeof o==="object"&&!Array.isArray(o)}
function exactMatch(a,b){return isPlainObject(a)&&Object.keys(b).every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]))
  &&Object.keys(a).every(k=>Object.hasOwn(b,k));}
function decodePayload(header){
  if(typeof header!=="string"||header.length<20||header.length>12000||!/^[A-Za-z0-9+/]+={0,2}$/.test(header))
    throw new Error("Invalid payment signature header");
  const raw=Buffer.from(header,"base64");
  if(raw.length>8500||raw.toString("base64")!==header)throw new Error("Noncanonical payment signature");
  const payload=JSON.parse(raw.toString("utf8"));
  if(!isPlainObject(payload)||payload.x402Version!==2||!isPlainObject(payload.accepted)
      ||!isPlainObject(payload.payload)||Object.keys(payload.payload).length===0)throw new Error("Invalid x402 v2 payload");
  return payload;
}
function validatedSettlement(value,network){
  return value?.success===true && value?.network===network &&
    typeof value.transaction==="string" && value.transaction.length>=40 &&
    typeof value.payer==="string" && value.payer.length>20;
}
function storeSuccessful(hash,result){
  if(SUCCESS.size>=1500)SUCCESS.delete(SUCCESS.keys().next().value);
  SUCCESS.set(hash,result);
}
/** Supports injected fetch and clock for deterministic tests; no real money in tests. */
export async function handleX402Tip(req,{fetcher=fetch,clock=Date.now,origin=new URL(req.url).origin,enabled=process.env.MOLTBEER_X402_TIPS_ENABLED==="1"}={}){
  if(!enabled)return response({enabled:false,optional:true,freeBar:true,
    message:"x402 settlement is not activated; use the read-only /api/tipjar wallet API."},503);
  const url=new URL(req.url);
  const networkParam=url.searchParams.get("network")||"base";
  const amountParam=url.searchParams.get("amount")||"0.01";
  let network,atomic;
  try {network=chosenNetwork(networkParam);atomic=exactDecimal(amountParam)}
  catch(e){return response({error:e.message},400)}
  let kind;
  try {kind=await support(network,fetcher,clock)}
  catch(e){return response({enabled:false,optional:true,freeBar:true,error:"x402 facilitator support unavailable"},503)}
  const requirements=terms(network,atomic,kind);
  const resourceUrl=new URL(origin).origin+url.pathname+"?network="+networkParam+"&amount="+amountParam;
  const required={x402Version:2,error:"This optional USDC tip requires an explicit signed wallet authorization.",
    resource:{url:resourceUrl,description:"Optional MOLTBEER Tip Jar donation (bar access remains free)",mimeType:"application/json"},
    accepts:[requirements],extensions:{}};
  const challenge=(message)=>response({error:message,optional:true,barAlwaysFree:true,
    x402Version:2,resource:required.resource,accepts:required.accepts},
    402,{"payment-required":b64({...required,error:message})});
  const header=req.headers.get("payment-signature");
  if(!header)return challenge(required.error);
  let payload;
  try {payload=decodePayload(header)}
  catch(e){return challenge("Invalid x402 payment signature")}
  if(!exactMatch(payload.accepted,requirements)
      ||!isPlainObject(payload.resource)||payload.resource.url!==resourceUrl)
    return challenge("Signed payment does not match the requested tip.");
  const key=createHash("sha256").update(header+"|"+resourceUrl).digest("hex");
  if(SUCCESS.has(key))return response(SUCCESS.get(key).body,200,{"payment-response":b64(SUCCESS.get(key).receipt)});
  if(PENDING.has(key))return response({error:"This signed payment is already being processed; check settlement before retrying."},409);
  PENDING.set(key,true);
  try {
    const envelope={x402Version:2,paymentPayload:payload,paymentRequirements:requirements};
    let verified;
    try {verified=await provider("/verify",envelope,fetcher)}
    catch(e){return response({error:"Payment verification temporarily unavailable; no settlement confirmed."},502)}
    if(verified.isValid!==true)return challenge("Signed payment was not verified.");
    let settled;
    try {settled=await provider("/settle",envelope,fetcher)}
    catch(e){return response({error:"Settlement status unknown; do not create a second payment until checked on-chain."},502)}
    if(!validatedSettlement(settled,network))return response({error:"Payment not confirmed by facilitator; do not assume tip succeeded."},502);
    const body={received:true,amountUSDC:amountParam,network:networkParam,asset:"USDC",
      transaction:settled.transaction,freeBar:true,thankYou:"Cheers from MOLTBEER!"};
    const result={body,receipt:settled};
    storeSuccessful(key,result);
    return response(body,200,{"payment-response":b64(settled)});
  } finally {PENDING.delete(key)}
}
export const X402_PUBLIC_INFO=Object.freeze({
  availableOnlyWhenConfigured:true,optional:true,freeBar:true,version:2,scheme:"exact",
  networks:["base","solana"],asset:"native USDC",amountOptions:[...PRICE_SET],
  endpoint:"/api/tipjar/x402",facilitator:"PayAI",
  note:"A real tip occurs only after the sender signs and a facilitator verifies and settles. An unsigned visit cannot pay."
});
