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
            body { font-family: sans-serif; background: #0f172a; color: white; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #38bdf8; text-align: center; }
            input, textarea { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; font-size: 16px; }
            #result { margin-top: 20px; padding: 15px; background: #0f172a; border-radius: 10px; border-left: 4px solid #38bdf8; white-space: pre-wrap; display: none; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>JAV AI Writer (Fix) 🤩</h2>
            <input type="text" id="code" placeholder="Movie Code (e.g. SSIS-881)">
            <textarea id="desc" rows="4" placeholder="Trailer description..."></textarea>
            <button id="genBtn" onclick="generate()">Generate Story</button>
            <div id="result"></div>
          </div>

          <script>
            async function generate() {
              const code = document.getElementById('code').value;
              const desc = document.getElementById('desc').value;
              const btn = document.getElementById('genBtn');
              const res = document.getElementById('result');

              if(!code || !desc) return alert("အကုန်ဖြည့်ပါ");

              btn.innerText = "AI က နည်းလမ်းပေါင်းစုံဖြင့် စမ်းနေပါသည်...";
              btn.disabled = true;
              res.style.display = "none";

              try {
                const response = await fetch('/api/write', {
                  method: 'POST',
                  body: JSON.stringify({ code, desc })
                });
                const data = await response.json();
                
                if (data.text) {
                  res.style.display = "block";
                  res.innerText = data.text;
                } else {
                  alert("Error: " + data.error);
                }
              } catch (e) {
                alert("ချိတ်ဆက်မှု မအောင်မြင်ပါ။");
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
    const prompt = `ဇာတ်ကားကုဒ်: ${code}၊ အကြောင်းအရာ: ${desc}။ ၎င်းတို့ကို အခြေခံ၍ ဆွဲဆောင်မှုရှိသော မြန်မာလို ဇာတ်လမ်းအညွှန်း ရေးပေးပါ။`;

    // စမ်းသပ်မည့် Model နာမည်များနှင့် API Version များ စာရင်း
    const attempts = [
      { ver: "v1beta", model: "gemini-1.5-flash-latest" },
      { ver: "v1beta", model: "gemini-1.5-flash" },
      { ver: "v1", model: "gemini-1.5-flash" },
      { ver: "v1beta", model: "gemini-pro" }
    ];

    for (const attempt of attempts) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/${attempt.ver}/models/${attempt.model}:generateContent?key=${API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            // JAV ကားများအတွက် Safety Filter ကြောင့် ပိတ်မသွားစေရန်
            safetySettings: [
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          })
        });

        const result = await response.json();

        if (result.candidates && result.candidates[0].content) {
          const text = result.candidates[0].content.parts[0].text;
          return new Response(JSON.stringify({ text }));
        }
      } catch (err) {
        console.log(`${attempt.model} failed, trying next...`);
      }
    }

    return new Response(JSON.stringify({ error: "ဘယ် Model နဲ့မှ ချိတ်ဆက်၍ မရပါ။ API Key ကို ပြန်စစ်ပေးပါ။" }), { status: 400 });
  }

  return new Response("Not Found", { status: 404 });
});
