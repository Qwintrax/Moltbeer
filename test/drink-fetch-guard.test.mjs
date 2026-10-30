import test from "node:test";
import assert from "node:assert/strict";
import {isPassiveDrinkRequest} from "../drink-fetch-guard.mjs";
import {fetchApp} from "../server.mjs";

const call=(path,headers={})=>fetchApp(new Request("http://localhost"+path,{headers}));

test("passive browser resources cannot inflate free drink counts",async()=>{
  const before=(await (await call("/api/stats")).json()).drinksServed;
  const cases=[
    ["/api/beer",{"sec-fetch-dest":"image","sec-fetch-mode":"no-cors"}],
    ["/api/drink?name=cache-lager",{"sec-fetch-dest":"script","sec-fetch-mode":"no-cors"}],
    ["/api/beer",{"sec-fetch-mode":"no-cors"}],
    ["/api/drink?name=moltbeer",{"sec-fetch-dest":"iframe","sec-fetch-mode":"navigate"}],
  ];
  for(const [path,headers] of cases){
    const response=await call(path,{"x-real-ip":"203.0.113.246",...headers});
    assert.equal(response.status,403,path);
    assert.match((await response.json()).error,/API request/i);
  }
  assert.equal((await (await call("/api/stats")).json()).drinksServed,before,"blocked embeds must not pour drinks");
  const api=await call("/api/beer",{"x-real-ip":"203.0.113.246","sec-fetch-dest":"empty","sec-fetch-mode":"cors"});
  assert.equal(api.status,200,"ordinary browser fetch API is still allowed");
  const navigation=await call("/api/drink?name=cache-lager",{"x-real-ip":"203.0.113.246","sec-fetch-dest":"document","sec-fetch-mode":"navigate"});
  assert.equal(navigation.status,200,"explicit top-level navigation remains backwards-compatible");
  assert.equal((await (await call("/api/stats")).json()).drinksServed,before+2);
});

test("Fetch Metadata guard keeps non-browser REST clients compatible",()=>{
  for(const headers of [{},{"sec-fetch-dest":"empty","sec-fetch-mode":"cors"},{"sec-fetch-dest":"document","sec-fetch-mode":"navigate"}])
    assert.equal(isPassiveDrinkRequest(new Headers(headers)),false,JSON.stringify(headers));
  for(const destination of ["image","script","style","iframe","font","audio","json"])
    assert.equal(isPassiveDrinkRequest(new Headers({"sec-fetch-dest":destination})),true,destination);
});
