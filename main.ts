import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Environment Variable ကို ဖတ်ယူခြင်း
const API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  const url = new URL(req.url);

  // ၁။ Frontend UI
  if (req.method === "GET") {
    return new Response(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Debug - Gemini AI Writer</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: #0f172a; color: white; line-height: 1.5; }
            .box { background: #1e293b; padding: 20px; border-radius: 12px; max-width: 500px; margin: auto; }
            input, textarea { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: none; background: #334155; color: white; box-sizing: border-box; }
            button { width: 100%; padding: 15px; background: #38bdf8; color: #0f172a; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; }
            .status { margin-top: 20px; padding: 15px; border-radius: 8px; display: none; }
            #error-box { background: #fca5a5; color: #7f1d1d; border: 2px solid #ef4444; }
            #success-box { background: #059669; color: white; }
          </style>
        </head>
        <body>
          <div class="box">
            <h3>MoviPlus AI Writer (Debug Mode)</h3>
            <p style="font-size: 13px; color: #94a3b8;">API Status: ${API_KEY ? "✅ Key Found" : "❌ Key Not Found in Deno Settings"}</p>
            <input type="text" id="code" placeholder="Movie Code (e.g. SSIS-881)">
            <textarea id="shortDesc" rows="3" placeholder="Trailer description..."></textarea>
            <button onclick="generate()">Generate & Trace Error</button>
            
            <div id="error-box" class="status"></div>
            <div id="success-box" class="status"></div>
          </div>

          <script>
            async function generate() {
              const code = document.getElementById('code').value;
              const desc = document.getElementById('shortDesc').value;
              const errBox = document.getElementById('error-box');
              const succBox = document.getElementById('success-box');

              errBox.style.display = "none";
              succBox.style.display = "none";

              try {
                const res = await fetch('/api/debug-gemini', {
                  method: 'POST',
                  body: JSON.stringify({ code, desc })
                });
                const data = await res.json();
                
                if (data.error) {
                  errBox.style.display = "block";
                  errBox.innerText = "Google API Error: " + data.error;
                } else {
                  succBox.style.display = "block";
                  succBox.innerText = data.text;
                }
              } catch (e) {
                errBox.style.display = "block";
                errBox.innerText = "System Error: ချိတ်ဆက်မှု လုံးဝမရပါ";
              }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  // ၂။ Backend API with Detailed Error Logging
  if (req.method === "POST" && url.pathname === "/api/debug-gemini") {
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Deno Settings ထဲမှာ GEMINI_API_KEY ကို မတွေ့ပါ။" }), { status: 400 });
    }

    const body = await req.json();
    const prompt = `Write a movie review for ${body.code} using this info: ${body.desc}. Language: Myanmar.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const result = await response.json();

      // Google ဘက်က ပို့လိုက်တဲ့ Error အသေးစိတ်ကို ဖမ်းယူခြင်း
      if (result.error) {
        return new Response(JSON.stringify({ 
          error: `${result.error.status} - ${result.error.message}` 
        }), { status: 400 });
      }

      const aiText = result.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ text: aiText }));

    } catch (err) {
      return new Response(JSON.stringify({ error: "Network Fetch Error: " + err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
