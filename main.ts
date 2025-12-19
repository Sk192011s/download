import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const API_KEY = Deno.env.get("GEMINI_API_KEY");

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
            h2 { color: #38bdf8; text-align: center; font-size: 22px; }
            label { display: block; margin-bottom: 5px; font-size: 14px; color: #94a3b8; }
            input, textarea { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; font-size: 16px; }
            #resultBox { margin-top: 20px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; white-space: pre-wrap; font-size: 15px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus AI (2.5 Flash) 🤩</h2>
            <label>Movie Code</label>
            <input type="text" id="code" placeholder="e.g. SSIS-881">
            <label>Short Description</label>
            <textarea id="desc" rows="4" placeholder="Trailer text..."></textarea>
            <button id="genBtn" onclick="generate()">Generate Story</button>
            <div id="resultBox">
              <label>AI Result:</label>
              <div id="outputText" class="output"></div>
            </div>
          </div>

          <script>
            async function generate() {
              const code = document.getElementById('code').value;
              const desc = document.getElementById('desc').value;
              const btn = document.getElementById('genBtn');
              const resBox = document.getElementById('resultBox');
              const out = document.getElementById('outputText');

              if(!code || !desc) return alert("အချက်အလက် ပြည့်စုံစွာ ဖြည့်ပါ");

              btn.innerText = "AI 2.5 စဉ်းစားနေပါသည်...";
              btn.disabled = true;
              resBox.style.display = "none";

              try {
                const response = await fetch('/api/write', {
                  method: 'POST',
                  body: JSON.stringify({ code, desc })
                });
                const data = await response.json();
                
                if (data.text) {
                  resBox.style.display = "block";
                  out.innerText = data.text;
                } else {
                  alert("Error: " + data.error);
                }
              } catch (e) {
                alert("ချိတ်ဆက်မှု အခက်အခဲရှိပါသည်။");
              } finally {
                btn.innerText = "Generate Story";
                btn.disabled = false;
              }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/write") {
    const { code, desc } = await req.json();
    const prompt = `Movie Code: ${code}, Context: ${desc}. Write an engaging Myanmar movie description. Focus on the actress and story.`;

    try {
      // ညီကို့ List ထဲတွင် ပါဝင်သော gemini-2.5-flash ကို v1beta endpoint ဖြင့် ခေါ်ယူခြင်း
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      const result = await response.json();

      if (result.error) {
        return new Response(JSON.stringify({ error: result.error.message }), { status: 400 });
      }

      const aiText = result.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ text: aiText }));

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
