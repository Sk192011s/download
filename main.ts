import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Deno Settings ထဲက Key ကို ဖတ်ခြင်း
const API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  const url = new URL(req.url);

  // ၁။ UI ပိုင်း (HTML/CSS)
  if (req.method === "GET") {
    return new Response(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>JAV AI Writer - Stable</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: white; padding: 15px; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #38bdf8; margin-bottom: 10px; text-align: center; }
            .status { font-size: 12px; text-align: center; margin-bottom: 20px; color: ${API_KEY ? '#4ade80' : '#fb7185'}; }
            label { display: block; margin-bottom: 5px; font-size: 14px; color: #94a3b8; }
            input, textarea { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            input:focus, textarea:focus { border-color: #38bdf8; }
            button { width: 100%; padding: 15px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; font-size: 16px; transition: 0.3s; }
            button:disabled { background: #475569; cursor: not-allowed; }
            #resultBox { margin-top: 20px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #e2e8f0; }
            .copy-btn { background: #64748b; margin-top: 10px; padding: 8px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>JAV AI Writer 🤩</h2>
            <div class="status">${API_KEY ? '● System Ready' : '● API Key Missing (Check Deno Settings)'}</div>
            
            <label>ဇာတ်ကားကုဒ် (Code)</label>
            <input type="text" id="code" placeholder="ဥပမာ - SSIS-881">
            
            <label>Trailer အညွှန်းတို (Snippet)</label>
            <textarea id="desc" rows="4" placeholder="Trailer web မှ စာသားကို Paste လုပ်ပါ..."></textarea>
            
            <button id="genBtn" onclick="generate()">Generate Myanmar Story</button>

            <div id="resultBox">
              <label>AI ထုတ်ပေးလိုက်သော အညွှန်း</label>
              <div id="outputText" class="output"></div>
              <button class="copy-btn" onclick="copyText()">စာသားကို Copy ကူးမည်</button>
            </div>
          </div>

          <script>
            async function generate() {
              const code = document.getElementById('code').value;
              const desc = document.getElementById('desc').value;
              const btn = document.getElementById('genBtn');
              const resBox = document.getElementById('resultBox');
              const out = document.getElementById('outputText');

              if(!code || !desc) return alert("ကုဒ်နှင့် အညွှန်းကို အရင်ဖြည့်ပါ");

              btn.innerText = "AI က စဉ်းစားနေပါတယ်...";
              btn.disabled = true;
              resBox.style.display = "none";

              try {
                const response = await fetch('/api/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code, desc })
                });
                
                const data = await response.json();
                
                if (data.error) {
                  alert("Error: " + data.error);
                } else {
                  resBox.style.display = "block";
                  out.innerText = data.text;
                }
              } catch (e) {
                alert("ချိတ်ဆက်မှု မအောင်မြင်ပါ။");
              } finally {
                btn.innerText = "Generate Myanmar Story";
                btn.disabled = false;
              }
            }

            function copyText() {
              const text = document.getElementById('outputText').innerText;
              navigator.clipboard.writeText(text);
              alert("Copy ကူးပြီးပါပြီ!");
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  // ၂။ Backend API (Gemini v1 Endpoint)
  if (req.method === "POST" && url.pathname === "/api/generate") {
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API Key မတွေ့ပါ။ Deno တွင် GEMINI_API_KEY ကို ထည့်ပါ။" }), { status: 400 });
    }

    const { code, desc } = await req.json();

    // AI ကို ပိုမိုကောင်းမွန်စွာ ခိုင်းစေခြင်း
    const prompt = `You are a professional movie content creator. 
      Act as an expert reviewer. Using the movie code "${code}" and this raw description "${desc}", 
      write a long, engaging, and attractive movie summary in Myanmar language. 
      Make it sound interesting for a movie app. Don't use too many technical terms, 
      focus on the actress's charm and the plot's excitement.`;

    try {
      // v1 Stable Endpoint ကို အသုံးပြုခြင်း
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const result = await response.json();

      if (result.error) {
        return new Response(JSON.stringify({ error: result.error.message }), { status: 400 });
      }

      const aiResponse = result.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ text: aiResponse }));

    } catch (err) {
      return new Response(JSON.stringify({ error: "Fetch failed: " + err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
