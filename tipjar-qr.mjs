// Fixed, offline-generated QR for the voluntary, amount-unspecified Solana Pay
// transfer request. No third-party QR service, private keys or signing code.
// If the wallet/label/message changes, regenerate the module data and its tests.
export const TIPJAR_QR_PAY_URI = "solana:Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z?label=MOLTBEER+Tip+Jar&message=Optional+SOL+tip";
const MODULES = 41;
const DATA = Buffer.from("/jFTRj/BDle5EG6Iaq+rt08vjGXbpYsXouwUGKGdB/qqqqr+ABbcWgCWjU86UAS3k09i/Md9CkZeHqGrO1z3FxSOGigHNbwrDVysiyZo6u6J6FYDX4BAdCTRULupjqkCpnSRbUHSm3znhBYjrEMu7gWKQdmfzXDSWrM9G1AIzPSI9dXKe6TOINmf4AWPnskBplXrzUKtVLzTPltJ+oDWac3/XEuq95f1/wBvxhzEf49WKmqQUejLEWukcCxvndcyxY/66VCnhzcEIm2Zov7KpsjXAA==","base64");
export function tipJarQrSvg() {
  const quiet = 4, w = MODULES + quiet * 2;
  const cells=[];
  for(let y=0;y<MODULES;y++)for(let x=0;x<MODULES;x++){
    const index=y*MODULES+x;
    if((DATA[index>>>3] & (1<<(7-(index&7))))!==0)cells.push("M"+(x+quiet)+" "+(y+quiet)+"h1v1h-1z");
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MOLTBEER optional SOL tip Solana Pay QR" viewBox="0 0 '+w+' '+w+'" width="294" height="294"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path fill="#111" d="'+cells.join(" ")+'"/></svg>';
}
