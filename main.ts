import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);

  // ၁။ UI (Frontend) ပိုင်း - ဖုန်းနဲ့ကြည့်ရင် လှပစေရန် ရေးသားထားသည်
  if (req.method === "GET") {
    return new Response(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>MoviPlus Downloader</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            input { width: 100%; padding: 12px; margin: 15px 0; border-radius: 8px; border: none; background: #334155; color: white; box-sizing: border-box; }
            button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; font-size: 16px; }
            .result { margin-top: 20px; display: none; padding: 10px; background: #059669; border-radius: 8px; }
            .result a { color: white; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Video Downloader</h2>
            <p style="font-size: 14px; color: #94a3b8;">YouTube, TikTok, Facebook, Instagram</p>
            <input type="text" id="videoUrl" placeholder="Paste link here...">
            <button onclick="downloadVideo()" id="dlBtn">Download Now</button>
            <div id="result" class="result"></div>
          </div>

          <script>
            async function downloadVideo() {
              const videoUrl = document.getElementById('videoUrl').value;
              const btn = document.getElementById('dlBtn');
              const resDiv = document.getElementById('result');
              
              if (!videoUrl) return alert("Link ထည့်ပေးပါဦး");
              
              btn.innerText = "Processing...";
              btn.disabled = true;

              try {
                const response = await fetch('/api/download', {
                  method: 'POST',
                  body: JSON.stringify({ url: videoUrl })
                });
                const data = await response.json();
                
                if (data.url) {
                  resDiv.style.display = "block";
                  resDiv.innerHTML = '<a href="' + data.url + '" target="_blank">Download Link ရပါပြီ (နှိပ်ပါ)</a>';
                } else {
                  alert("ဒေါင်းလုပ်ဆွဲ၍ မရပါ။ လင့်ခ်မှန်၊ မမှန် ပြန်စစ်ပါ");
                }
              } catch (e) {
                alert("Error ဖြစ်သွားပါတယ်။ ခဏနေမှ ပြန်စမ်းကြည့်ပါ");
              } finally {
                btn.innerText = "Download Now";
                btn.disabled = false;
              }
            }
          </script>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  // ၂။ Backend ပိုင်း - Cobalt API ကို သုံးပြီး ဗီဒီယိုကို Processing လုပ်ခြင်း
  if (req.method === "POST" && url.pathname === "/api/download") {
    const body = await req.json();
    
    try {
      // Cobalt API သည် တိုက်ရိုက် ဒေါင်းလုဒ်လင့်ခ်ကို ပြန်ပေးသော အခမဲ့ API ဖြစ်သည်
      const res = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: body.url,
          videoQuality: "720", // အရည်အသွေး သတ်မှတ်ခြင်း
        })
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "API Error" }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
