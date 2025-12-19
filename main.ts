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
            body { font-family: sans-serif; padding: 20px; background: #0f172a; color: white; }
            .box { background: #1e293b; padding: 25px; border-radius: 15px; max-width: 500px; margin: auto; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
            input, textarea { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: none; background: #334155; color: white; box-sizing: border-box; }
            button { width: 100%; padding: 15px; background: #38bdf8; color: #0f172a; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; }
            #output { margin-top: 20px; background: #0f172a; padding: 20px; border-radius: 10px; white-space: pre-wrap; display: none; line-height: 1.6; border-left: 5px solid #38bdf8; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2 style="color: #38bdf8;">MoviPlus AI Writer 🤩</h2>
            <p style="font-size: 14px; color: #94a3b8;">JAV Code နှင့် Trailer အညွှန်းမှတစ်ဆင့် မြန်မာစာသားထုတ်ယူရန်</p>
            <input type="text" id="code" placeholder="Movie Code (e.g. SSIS-881)">
            <textarea id="shortDesc" rows="4" placeholder="Trailer Web မှ အညွှန်းတိုလေးကို ဒီမှာ Paste လုပ်ပါ..."></textarea>
            <button onclick="generateStory()" id="genBtn">Generate Story (Gemini 1.5)</button>
            <div id="output"></div>
          </div>

          <script>
            async function generateStory() {
              const code = document.getElementById('code').value;
              const desc = document.getElementById('shortDesc').value;
              const out = document.getElementById('output');
              const btn = document.getElementById('genBtn');

              if(!code || !desc) return alert("အချက်အလက် အကုန်ဖြည့်ပါ");

              btn.innerText = "Gemini က စဉ်းစားနေပါတယ်...";
              btn.disabled = true;

              const response = await fetch('/api/gemini', {
                method: 'POST',
                body: JSON.stringify({ code, desc })
              });
              const data = await response.json();
              
              out.style.display = "block";
              out.innerText = data.text;
              btn.innerText = "Generate Story (Gemini 1.5)";
              btn.disabled = false;
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/gemini") {
    const body = await req.json();
    
    // Gemini ထံ ပို့မည့် ညွှန်ကြားချက် (Prompt)
    const promptText = `ဇာတ်ကားကုဒ်: ${body.code}
မူရင်းအညွှန်းတို: ${body.desc}

အထက်ပါ အချက်အလက်များကို အခြေခံ၍ ရုပ်ရှင်ကြည့်သူများ စိတ်ဝင်စားသွားစေမည့် မြန်မာလို ဇာတ်လမ်းအညွှန်း အရှည်တစ်ခုကို ဆွဲဆောင်မှုရှိရှိ ရေးသားပေးပါ။ ဇာတ်အိမ်အကြောင်းကို အဓိကထား၍ ပရော်ဖက်ရှင်နယ် ဆန်ဆန် ရေးပေးပါ။`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const result = await res.json();
      const aiText = result.candidates[0].content.parts[0].text;
      
      return new Response(JSON.stringify({ text: aiText }), { headers: { "Content-Type": "application/json" } });
    } catch {
      return new Response(JSON.stringify({ text: "Error: AI ချိတ်ဆက်မှု မအောင်မြင်ပါ (Key မှန်မမှန် စစ်ပါ)" }), { status: 500 });
    }
  }

  return new Response("Ready", { status: 200 });
});
