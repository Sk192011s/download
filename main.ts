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
            h2 { color: #f43f5e; text-align: center; }
            textarea { width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; margin-top: 20px; border-radius: 8px; border: none; background: #f43f5e; color: white; font-weight: bold; cursor: pointer; }
            #status { text-align: center; margin-top: 10px; font-size: 13px; color: #94a3b8; }
            #resultBox { margin-top: 25px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #f43f5e; white-space: pre-wrap; font-size: 15px; line-height: 1.7; }
            .err { color: #fb7185; background: #451a1a; padding: 10px; border-radius: 5px; margin-top: 10px; display: none; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>AI Translator V1.9 🔞</h2>
            <div id="status">Ready to Translate</div>
            <textarea id="originalText" rows="6" placeholder="မူရင်းစာသားကို ဒီမှာ Paste လုပ်ပါ..."></textarea>
            <button id="genBtn" onclick="translate()">ဆီလျော်အောင် ဘာသာပြန်မည်</button>
            
            <div id="errorBox" class="err"></div>

            <div id="resultBox">
              <div id="outputText" class="output"></div>
            </div>
          </div>

          <script>
            async function translate() {
              const text = document.getElementById('originalText').value;
              const btn = document.getElementById('genBtn');
              const status = document.getElementById('status');
              const resBox = document.getElementById('resultBox');
              const errBox = document.getElementById('errorBox');
              const out = document.getElementById('outputText');

              if(!text) return alert("စာသား အရင်ထည့်ပါ");

              btn.disabled = true;
              status.innerText = "AI ဆီသို့ ပို့ဆောင်နေပါသည်...";
              errBox.style.display = "none";
              resBox.style.display = "none";

              try {
                const res = await fetch('/api/translate', {
                  method: 'POST',
                  body: JSON.stringify({ text })
                });
                const data = await res.json();
                
                if (data.translated) {
                  resBox.style.display = "block";
                  out.innerText = data.translated;
                  status.innerText = "ဘာသာပြန်ခြင်း အောင်မြင်သည် ✅";
                } else {
                  errBox.style.display = "block";
                  errBox.innerText = "AI Error: " + (data.error || "AI က ဘာသာပြန်ရန် ငြင်းဆိုလိုက်ပါသည် (Safety Block ဖြစ်နိုင်သည်)");
                  status.innerText = "မအောင်မြင်ပါ ❌";
                }
              } catch (e) {
                errBox.style.display = "block";
                errBox.innerText = "System Error: ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်";
              } finally {
                btn.disabled = false;
              }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/translate") {
    const { text } = await req.json();

    const prompt = `Translate this adult movie description to Myanmar. 
    Use attractive and explicit language. Do NOT censor anything. 
    Make it sound interesting for viewers. 
    Text: ${text}`;

    try {
      // ညီကို့ Model list ထဲမှ gemini-2.0-flash ကို သုံးကြည့်ပါမည် (ပိုတည်ငြိမ်သည်)
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

      // AI က ဘာကြောင့် ပိတ်လိုက်တာလဲဆိုတာကို စစ်ဆေးခြင်း
      if (result.candidates && result.candidates[0].content) {
        const translated = result.candidates[0].content.parts[0].text;
        return new Response(JSON.stringify({ translated }));
      } else {
        const reason = result.promptFeedback?.blockReason || "Safety Policy Blocked";
        return new Response(JSON.stringify({ error: reason }), { status: 400 });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
