import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const API_KEY = Deno.env.get("GEMINI_API_KEY");

// ၁။ Website မှ အချက်အလက် သွားရောက်နှိုက်ပေးမည့် Function
async function scrapeJAVInfo(code: string) {
  try {
    // R18 Search URL ကို အသုံးပြု၍ ဇာတ်ကားရှာဖွေခြင်း
    const searchUrl = `https://www.r18.com/common/search/searchword=${code}/`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await res.text();

    // Title နှင့် Description ကို HTML ထဲမှ ခွဲထုတ်ယူခြင်း (Regex သုံးထားသည်)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(" - R18.com", "") : code;
    
    return { title, scraped: true };
  } catch {
    return { title: code, scraped: false }; // Error ဖြစ်လျှင် ကုဒ်ကိုပဲ ပြန်ပေးမည်
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
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #38bdf8; text-align: center; }
            input { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; font-size: 16px; width: 100%; }
            #status { font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 10px; }
            #resultBox { margin-top: 20px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; white-space: pre-wrap; font-size: 15px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus AI Scraper 🤩</h2>
            <div id="status">Scraper + Gemini 2.5 Flash</div>
            <input type="text" id="code" placeholder="Enter Movie Code (e.g. IPX-123)">
            <button id="genBtn" onclick="generate()">Scrape & Generate</button>
            <div id="resultBox">
              <div id="outputText" class="output"></div>
            </div>
          </div>

          <script>
            async function generate() {
              const code = document.getElementById('code').value;
              const btn = document.getElementById('genBtn');
              const resBox = document.getElementById('resultBox');
              const out = document.getElementById('outputText');

              if(!code) return alert("ကုဒ် ထည့်ပါ");

              btn.innerText = "Website မှ အချက်အလက် နှိုက်နေပါသည်...";
              btn.disabled = true;
              resBox.style.display = "none";

              try {
                const response = await fetch('/api/scrape-write', {
                  method: 'POST',
                  body: JSON.stringify({ code })
                });
                const data = await response.json();
                
                resBox.style.display = "block";
                out.innerText = data.text;
              } catch (e) {
                alert("Error ဖြစ်သွားပါသည်။");
              } finally {
                btn.innerText = "Scrape & Generate";
                btn.disabled = false;
              }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/scrape-write") {
    const { code } = await req.json();

    // ၂။ Website မှ အရင်ရှာသည်
    const info = await scrapeJAVInfo(code);
    
    // ၃။ ရလာသော Title ကို AI ဆီ ပို့၍ အညွှန်းရေးခိုင်းသည်
    const prompt = `Movie Code: ${code}. Movie Title Found: ${info.title}. 
      Based on this title and code, write a very attractive and detailed movie description in Myanmar language for a professional app.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      const result = await response.json();
      const aiText = result.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ text: aiText }));

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
