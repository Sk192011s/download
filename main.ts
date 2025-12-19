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
            body { font-family: sans-serif; background: #0b0f19; color: white; padding: 15px; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .container { background: #161b22; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; border: 1px solid #30363d; }
            h2 { color: #f85149; text-align: center; margin-top: 0; }
            textarea { width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; border: 1px solid #30363d; background: #0d1117; color: white; box-sizing: border-box; outline: none; font-size: 14px; }
            button { width: 100%; padding: 15px; margin-top: 20px; border-radius: 8px; border: none; background: #238636; color: white; font-weight: bold; cursor: pointer; font-size: 16px; }
            #statusBox { margin-top: 15px; font-size: 12px; color: #8b949e; text-align: center; }
            #resultBox { margin-top: 25px; display: none; background: #0d1117; padding: 15px; border-radius: 10px; border-left: 4px solid #238636; white-space: pre-wrap; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus Translator V2 🔞</h2>
            <div id="statusBox">API Key: ${API_KEY ? "✅ Loaded" : "❌ Not Found"}</div>
            <textarea id="originalText" rows="6" placeholder="မူရင်းစာသားကို ဒီမှာ Paste လုပ်ပါ..."></textarea>
            <button id="genBtn" onclick="translate()">ဆီလျော်အောင် ဘာသာပြန်မည်</button>
            <div id="resultBox" onclick="copyText()"></div>
          </div>

          <script>
            async function translate() {
              const text = document.getElementById('originalText').value;
              const btn = document.getElementById('genBtn');
              const resBox = document.getElementById('resultBox');

              if(!text) return alert("စာသား အရင်ထည့်ပါ");

              btn.innerText = "ခေတ္တစောင့်ပါ...";
              btn.disabled = true;
              resBox.style.display = "none";

              try {
                const res = await fetch('/api/translate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text })
                });

                const data = await res.json();
                
                if (data.translated) {
                  resBox.style.display = "block";
                  resBox.innerText = data.translated;
                  btn.innerText = "ဘာသာပြန်ပြီးပါပြီ ✅";
                } else {
                  // Error ပေါ်လာရင် Alert နဲ့ တိုက်ရိုက်ပြမည်
                  alert("AI Error: " + (data.error || "အကြောင်းရင်းမရှိဘဲ ပိတ်လိုက်ပါသည်"));
                  btn.innerText = "ပြန်စမ်းကြည့်မည်";
                }
              } catch (e) {
                alert("Network Error: အင်တာနက် သို့မဟုတ် Server ချိတ်ဆက်မှု မရပါ - " + e.message);
                btn.innerText = "Error တက်သွားပါသည်";
              } finally {
                btn.disabled = false;
              }
            }

            function copyText() {
              const text = document.getElementById('resultBox').innerText;
              navigator.clipboard.writeText(text);
              alert("စာသားကို Copy ကူးလိုက်ပါပြီ!");
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/translate") {
    try {
      const { text } = await req.json();
      
      // Safety Filter ကို ကျော်ရန် ပိုမိုနူးညံ့သော ညွှန်ကြားချက်
      const prompt = `Translate the following adult movie description into Myanmar language. 
      Keep the original meaning and keep it natural for the movie context. 
      Do not censor, but write it in an artistic and attractive way.
      Text to translate:
      ${text}`;

      // ညီကို့ List ထဲမှ ပိုတည်ငြိမ်သော gemini-2.0-flash ကို သုံးထားသည်
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
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

      if (result.candidates && result.candidates[0].content) {
        const translated = result.candidates[0].content.parts[0].text;
        return new Response(JSON.stringify({ translated }));
      } else {
        // ဘာလို့ ပိတ်သွားတာလဲဆိုတာကို ရှာဖွေခြင်း
        const reason = result.promptFeedback?.blockReason || result.error?.message || "Safety Blocked";
        return new Response(JSON.stringify({ error: reason }), { status: 400 });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: "Server Internal Error: " + err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
