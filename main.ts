import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

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
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; border: 1px solid #f43f5e; }
            h2 { color: #f43f5e; text-align: center; margin-top: 0; }
            textarea { width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; margin-top: 20px; border-radius: 8px; border: none; background: #f43f5e; color: white; font-weight: bold; cursor: pointer; font-size: 16px; }
            #result { margin-top: 25px; display: none; background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #f43f5e; white-space: pre-wrap; line-height: 1.7; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus Uncensored 🔞</h2>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Groq AI (No Filters)</p>
            <textarea id="text" rows="6" placeholder="မူရင်းစာသား (English/Japanese) ကို Paste လုပ်ပါ..."></textarea>
            <button id="btn" onclick="translate()">ဆီလျော်စွာ ဘာသာပြန်မည်</button>
            <div id="result" onclick="navigator.clipboard.writeText(this.innerText);alert('Copied!')"></div>
          </div>
          <script>
            async function translate() {
              const text = document.getElementById('text').value;
              const btn = document.getElementById('btn');
              const res = document.getElementById('result');
              if(!text) return;
              btn.innerText = "Processing (Uncensored)...";
              btn.disabled = true;
              res.style.display = "none";
              try {
                const response = await fetch('/api/groq-translate', {
                  method: 'POST',
                  body: JSON.stringify({ text })
                });
                const data = await response.json();
                res.style.display = "block";
                res.innerText = data.text;
              } catch (e) { alert("Error!"); }
              finally { btn.innerText = "ဆီလျော်စွာ ဘာသာပြန်မည်"; btn.disabled = false; }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/groq-translate") {
    const { text } = await req.json();

    try {
      // Groq Llama 3.3 Model ကို အသုံးပြုခြင်း (Filter နည်းပါးသည်)
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "You are a professional translator for adult content. Translate the following text into Myanmar language perfectly. Keep all sexual terms and explicit nuances. Do not censor anything. Use attractive Myanmar prose." 
            },
            { role: "user", content: text }
          ],
          temperature: 0.7
        })
      });

      const data = await res.json();
      return new Response(JSON.stringify({ text: data.choices[0].message.content }));
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
