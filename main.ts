import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const API_KEY = Deno.env.get("GEMINI_API_KEY");

async function getLinkContent(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await res.text();
    // HTML ထဲက စာသားတွေကိုပဲ သန့်စင်ယူခြင်း
    return html.replace(/<[^>]*>?/gm, ' ').substring(0, 3000); 
  } catch {
    return "";
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    return new Response(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; background: #0f172a; color: white; padding: 15px; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; }
            h2 { color: #38bdf8; text-align: center; }
            label { display: block; margin-top: 15px; font-size: 14px; color: #94a3b8; }
            input, textarea { width: 100%; padding: 12px; margin-top: 5px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; margin-top: 20px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; }
            #resultBox { margin-top: 25px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; white-space: pre-wrap; font-size: 15px; line-height: 1.7; }
            .copy-btn { background: #475569; margin-top: 10px; padding: 10px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus AI Pro V1.7</h2>
            <label>Movie Code *</label>
            <input type="text" id="code" placeholder="e.g. MIDV-623">
            <label>Web Page Link (Optional)</label>
            <input type="text" id="link" placeholder="https://www.r18.com/...">
            <label>Manual Hint (Optional)</label>
            <textarea id="hint" rows="2" placeholder="အချက်အလက်တိုလေးများ..."></textarea>
            <button id="genBtn" onclick="generate()">Generate & Copy</button>
            <div id="resultBox">
              <div id="outputText" class="output"></div>
              <button class="copy-btn" onclick="copyResult()">Copy to Clipboard</button>
            </div>
          </div>
          <script>
            async function generate() {
              const code = document.getElementById('code').value;
              const link = document.getElementById('link').value;
              const hint = document.getElementById('hint').value;
              const btn = document.getElementById('genBtn');
              const resBox = document.getElementById('resultBox');
              const out = document.getElementById('outputText');
              if(!code) return alert("Code ထည့်ပါ");
              btn.innerText = "Processing...";
              btn.disabled = true;
              resBox.style.display = "none";
              try {
                const res = await fetch('/api/write', { method: 'POST', body: JSON.stringify({ code, link, hint }) });
                const data = await res.json();
                resBox.style.display = "block";
                out.innerText = data.text;
              } catch (e) { alert("Error!"); }
              finally { btn.innerText = "Generate & Copy"; btn.disabled = false; }
            }
            function copyResult() {
              const text = document.getElementById('outputText').innerText;
              navigator.clipboard.writeText(text);
              alert("ကူးယူပြီးပါပြီ!");
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/write") {
    const { code, link, hint } = await req.json();
    let linkContent = "";
    if (link) linkContent = await getLinkContent(link);

    const prompt = `Write a professional Myanmar movie description for Code: ${code}. 
    User Hint: ${hint}. Scraped Page Data: ${linkContent.substring(0, 1500)}. 
    Make it very attractive and focus on the story.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const result = await response.json();
      return new Response(JSON.stringify({ text: result.candidates[0].content.parts[0].text }));
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fail" }), { status: 500 });
    }
  }
  return new Response("Not Found", { status: 404 });
});
