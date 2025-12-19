import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Groq API Key ကို ဖတ်ယူခြင်း
const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

async function getLinkContent(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await res.text();
    // HTML ထဲမှ စာသားများကို သန့်စင်ယူခြင်း
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
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #f43f5e; }
            h2 { color: #f43f5e; text-align: center; margin-top: 0; }
            label { display: block; margin-top: 15px; margin-bottom: 5px; font-size: 14px; color: #94a3b8; }
            input, textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
            button { width: 100%; padding: 15px; margin-top: 20px; border-radius: 8px; border: none; background: #f43f5e; color: white; font-weight: bold; cursor: pointer; font-size: 16px; }
            #resultBox { margin-top: 25px; display: none; }
            .output { background: #0f172a; padding: 15px; border-radius: 10px; border-left: 4px solid #f43f5e; white-space: pre-wrap; font-size: 15px; line-height: 1.7; color: #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>MoviPlus Uncensored 🔞</h2>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Powered by Groq Llama 3 (No Filters)</p>
            
            <label>ဇာတ်ကားကုဒ် (Code) *</label>
            <input type="text" id="code" placeholder="e.g. SSIS-881">
            
            <label>Trailer Link (ကားသစ်များအတွက်)</label>
            <input type="text" id="link" placeholder="Paste link here...">
            
            <label>အညွှန်းအတို (Manual Hint)</label>
            <textarea id="hint" rows="2" placeholder="ဥပမာ- ဆရာမနဲ့ ကျောင်းသား..."></textarea>
            
            <button id="genBtn" onclick="generate()">Generate Uncensored Desc</button>
            
            <div id="resultBox">
              <label>AI Result:</label>
              <div id="outputText" class="output" onclick="navigator.clipboard.writeText(this.innerText);alert('Copied!')"></div>
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

              if(!code) return alert("Code ထည့်ပါ");

              btn.innerText = "Groq AI က ရေးသားနေပါသည်...";
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
                alert("ချိတ်ဆက်မှု မရပါ");
              } finally {
                btn.innerText = "Generate Uncensored Desc";
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
    let linkContent = "";
    if (link) { linkContent = await getLinkContent(link); }

    try {
      // Groq API သို့ Chat Completion Request ပို့ဆောင်ခြင်း
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Groq ရှိ အကောင်းဆုံး Model တစ်ခု
          messages: [
            { 
              role: "system", 
              content: "You are a professional uncensored adult movie description writer. Translate or write movie summaries in Myanmar language. Use explicit, attractive, and seductive prose. Do not censor sexual terms or themes. Focus on the physical attraction and the heat of the scenes." 
            },
            { 
              role: "user", 
              content: `Write a detailed Myanmar description for Movie Code: ${code}. 
              Manual Hint: ${hint}. 
              Scraped Link Content: ${linkContent.substring(0, 1500)}` 
            }
          ],
          temperature: 0.8
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0].message) {
        return new Response(JSON.stringify({ text: data.choices[0].message.content }));
      } else {
        return new Response(JSON.stringify({ error: data.error?.message || "Groq Error" }), { status: 400 });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
