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
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; }
            h2 { color: #f43f5e; text-align: center; margin-top: 0; }
            label { display: block; margin-top: 15px; font-size: 14px; color: #94a3b8; }
            input, textarea { width: 100%; padding: 12px; margin-top: 5px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; margin-top: 20px; border-radius: 8px; border: none; background: #f43f5e; color: white; font-weight: bold; cursor: pointer; }
            #resultBox { margin-top: 25px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #f43f5e; white-space: pre-wrap; font-size: 15px; line-height: 1.7; }
            .copy-btn { background: #475569; margin-top: 10px; padding: 10px; font-size: 13px; width: 100%; border: none; color: white; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus AI Translator 🔞</h2>
            
            <label>ဇာတ်ကားကုဒ် (Code)</label>
            <input type="text" id="code" placeholder="e.g. MIDV-623">
            
            <label>မူရင်းအညွှန်း (English/Japanese) *</label>
            <textarea id="originalText" rows="6" placeholder="Trailer web က အညွှန်းစာသားကို ဒီမှာ Paste လုပ်ပါ..."></textarea>
            
            <button id="genBtn" onclick="translate()">ဆီလျော်အောင် ဘာသာပြန်မည်</button>
            
            <div id="resultBox">
              <label>မြန်မာဘာသာပြန် အညွှန်း:</label>
              <div id="outputText" class="output"></div>
              <button class="copy-btn" onclick="copyResult()">Copy စာသားကူးမည်</button>
            </div>
          </div>

          <script>
            async function translate() {
              const code = document.getElementById('code').value;
              const text = document.getElementById('originalText').value;
              const btn = document.getElementById('genBtn');
              const resBox = document.getElementById('resultBox');
              const out = document.getElementById('outputText');

              if(!text) return alert("မူရင်းစာသား ထည့်ပေးပါ");

              btn.innerText = "ဘာသာပြန်နေပါသည်...";
              btn.disabled = true;
              resBox.style.display = "none";

              try {
                const res = await fetch('/api/translate', {
                  method: 'POST',
                  body: JSON.stringify({ code, text })
                });
                const data = await res.json();
                resBox.style.display = "block";
                out.innerText = data.translated;
              } catch (e) { alert("Error ဖြစ်သွားပါသည်။"); }
              finally { btn.innerText = "ဆီလျော်အောင် ဘာသာပြန်မည်"; btn.disabled = false; }
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

  if (req.method === "POST" && url.pathname === "/api/translate") {
    const { code, text } = await req.json();

    // AI ကို ပိုမိုပွင့်လင်းစွာ ဘာသာပြန်ခိုင်းသည့် Prompt
    const prompt = `
      As a professional translator for an adult movie app, translate the following text into Myanmar language.
      Context: This is for the movie code "${code}".
      
      Instructions:
      1. Translate the meaning accurately and naturally (ဆီလျော်အောင်).
      2. Do NOT censor sexual terms. Keep the original explicit meaning and "sex" related nuances.
      3. Use engaging and attractive Myanmar prose that adult movie viewers would like.
      4. If the text is in Japanese, translate directly to Myanmar.
      
      Original Text:
      ${text}
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // Safety Settings အကုန်ပိတ်ထားမှ Explicit စာသားတွေ ထွက်လာမှာပါ
          safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      const result = await response.json();
      const translatedText = result.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ translated: translatedText }));

    } catch (err) {
      return new Response(JSON.stringify({ error: "Fail" }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
