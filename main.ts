import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    return new Response(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 15px; }
            .container { background: #1e293b; padding: 30px; border-radius: 20px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
            input { width: 100%; padding: 15px; margin: 15px 0; border-radius: 10px; border: 2px solid #334155; background: #0f172a; color: white; outline: none; box-sizing: border-box; }
            input:focus { border-color: #38bdf8; }
            button { width: 100%; padding: 15px; border-radius: 10px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; transition: 0.3s; }
            button:active { transform: scale(0.95); }
            #loading { display: none; margin: 15px 0; color: #38bdf8; font-weight: bold; }
            #result { margin-top: 20px; display: none; padding: 15px; background: #059669; border-radius: 10px; }
            a { color: white; text-decoration: none; font-weight: bold; display: block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="margin-top:0;">Video Downloader</h2>
            <p style="color: #94a3b8; font-size: 14px;">Facebook Reels, TikTok, YouTube</p>
            <input type="text" id="videoUrl" placeholder="Paste Video Link Here...">
            <button onclick="downloadVideo()" id="dlBtn">Download Video</button>
            <div id="loading">ခဏစောင့်ပါ (Processing)...</div>
            <div id="result"></div>
          </div>

          <script>
            async function downloadVideo() {
              const videoUrl = document.getElementById('videoUrl').value;
              const btn = document.getElementById('dlBtn');
              const loading = document.getElementById('loading');
              const resDiv = document.getElementById('result');
              
              if (!videoUrl) return alert("Link အရင်ထည့်ပါ");
              
              btn.style.display = "none";
              loading.style.display = "block";
              resDiv.style.display = "none";

              try {
                const response = await fetch('/api/download', {
                  method: 'POST',
                  body: JSON.stringify({ url: videoUrl })
                });
                const data = await response.json();
                
                if (data.url) {
                  resDiv.style.display = "block";
                  resDiv.innerHTML = '<a href="' + data.url + '" target="_blank">Download ကိုနှိပ်ပါ (သို့) ဖိထားပါ</a>';
                } else {
                  alert("ဒေါင်းလုပ်ဆွဲ၍ မရပါ။ Facebook မှာ Private လုပ်ထားတဲ့ ဗီဒီယို ဖြစ်နိုင်ပါတယ်။");
                }
              } catch (e) {
                alert("Server နှင့် ချိတ်ဆက်မှု အခက်အခဲရှိနေပါသည်။");
              } finally {
                btn.style.display = "block";
                loading.style.display = "none";
              }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (req.method === "POST" && url.pathname === "/api/download") {
    const body = await req.json();
    const videoUrl = body.url;

    try {
      // ၁။ Facebook အတွက် ပိုမိုအစွမ်းထက်သော အရန် API ကို အသုံးပြုခြင်း
      const res = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          url: videoUrl,
          videoQuality: "720",
          filenameStyle: "pretty"
        })
      });

      const data = await res.json();
      
      // ၂။ အကယ်၍ Cobalt နဲ့ မရခဲ့လျှင် တခြား Free API တစ်ခုကို ထပ်စမ်းခြင်း
      if (!data.url) {
        // ဤနေရာတွင် Tikwm API (TikTok & More) ကို စမ်းသပ်ခြင်း
        const altRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`);
        const altData = await altRes.json();
        if (altData.data && altData.data.play) {
           return new Response(JSON.stringify({ url: altData.data.play }), { headers: { "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fail" }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
