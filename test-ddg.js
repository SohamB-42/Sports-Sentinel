const fetch = require('node-fetch');
async function test() {
  const ddcUrl = `https://html.duckduckgo.com/html/?q=test`;
  const res = await fetch(ddcUrl, { headers: { "User-Agent": "Mozilla/5.0" }});
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 200));
}
test();
