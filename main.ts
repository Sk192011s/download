import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const API_KEY = Deno.env.get("GEMINI_API_KEY");

// Website link ထဲက စာသားတွေကို ဆွဲထုတ်ပေးမည့် function
async function getLinkContent(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await res.text();
    // HTML tags တွေကို ဖျက်ပြီး စာသားချည်းပဲ ယူခြင်း
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
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #38bdf8; text-align: center; margin-top: 0; }
            label { display: block; margin-top: 15px; margin-bottom: 5px; font-size: 14px; color: #94a3b8; }
            input, textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; margin-top: 20px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; font-size: 16px; }
            #resultBox { margin-top: 25px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; white-space: pre-wrap; font-size: 15px; line-height: 1.7; color: #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus AI Pro 🤩</h2>
            
            <label>ဇာတ်ကားကုဒ် (Code) *မဖြစ်မနေ</label>
            <input type="text" id="code" placeholder="e.g. SSIS-881">
            
            <label>Trailer Link (ကားသစ်များအတွက်)</label>
            <input type="text" id="link" placeholder="Paste R18/Fanza Link here...">
            
            <label>အညွှန်းအတို (Manual Hint - Optional)</label>
            <textarea id="hint" rows="2" placeholder="ဥပမာ- စော်က အပေးကြမ်းတယ်..."></textarea>
            
            <button id="genBtn" onclick="generate()">Generate Masterpiece</button>
            
            <div id="resultBox">
              <label>AI Generated Description:</label>
              <div id="outputText" class="output"></div>
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

              if(!code) return alert("ဇာတ်ကားကုဒ် အရင်ထည့်ပါ");

              btn.innerText = "အချက်အလက်များကို AI က ဖတ်နေပါသည်...";
              btn.disabled = true;
              resBox.style.display = "none";

              try {
                const response = await fetch('/api/pro-write', {
                  method: 'POST',
                  body: JSON.stringify({ code, link, hint })
                });
                const data = await response.json();
                
                if (data.text) {
                  resBox.style.display = "block";
                  out.innerText = data.text;
                } else {
                  alert("Error: " + data.error);
                }
              } catch (e) {
                alert("ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်။");
              } finally {
                btn.innerText = "Generate Masterpiece";
                btn.disabled = false;
              }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/pro-write") {
    const { code, link, hint } = await req.json();
    
    let contextFromLink = "";
    if (link) {
      contextFromLink = await getLinkContent(link);
    }

    // AI ကို ပေးမည့် ညွှန်ကြားချက်အပြည့်အစုံ
    const prompt = `
      You are a professional movie reviewer.
      Movie Code: ${code}
      User's Manual Hint: ${hint || "None"}
      Scraped Link Content: ${contextFromLink ? "Data extracted from provided link" : "No link provided"}
      
      Instructions:
      1. If Link Content is available, use it to understand the plot of this new movie.
      2. If no link is provided, use your internal knowledge about the code "${code}".
      3. Always consider the User's Manual Hint if provided.
      4. Write a very attractive, long, and engaging movie description in Myanmar language.
      5. Make the tone professional yet exciting for a movie app.
      6. Mention the actress if you know her.
      
      Link Data Snippet (if any): ${contextFromLink.substring(0, 1500)}
    `;

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
