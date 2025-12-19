import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

async function resolveUrl(url: string) {
  try {
    // Facebook Share Link များအား ဗီဒီယိုလင့်ခ်အစစ် ဖြစ်အောင် ပြောင်းလဲပေးခြင်း
    const response = await fetch(url, { method: "GET", redirect: "follow" });
    return response.url;
  } catch {
    return url;
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
            body { font-family: sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: #1e293b; padding: 25px; border-radius: 15px; width: 90%; max-width: 400px; text-align: center; }
            input { width: 100%; padding: 12px; margin: 15px 0; border-radius: 8px; border: none; background: #334155; color: white; box-sizing: border-box; }
            button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; }
            #result { margin-top: 20px; display: none; padding: 10px; background: #059669; border-radius: 8px; word-break: break-all; }
            a { color: white; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>FB & TikTok Downloader</h2>
            <input type="text" id="videoUrl" placeholder="Paste link here...">
            <button onclick="downloadVideo()" id="dlBtn">Download Now</button>
            <div id="result"></div>
          </div>

          <script>
            async function downloadVideo() {
              const videoUrl = document.getElementById('videoUrl').value;
              const btn = document.getElementById('dlBtn');
              const resDiv = document.getElementById('result');
              
              if (!videoUrl) return alert("Link ထည့်ပါ");
              btn.innerText = "Finding Video...";
              btn.disabled = true;

              try {
                const response = await fetch('/api/download', {
                  method: 'POST',
                  body: JSON.stringify({ url: videoUrl })
                });
                const data = await response.json();
                
                if (data.url) {
                  resDiv.style.display = "block";
                  resDiv.innerHTML = '<a href="' + data.url + '" target="_blank">ဗီဒီယိုဒေါင်းရန် ဤနေရာကိုနှိပ်ပါ</a>';
                } else {
                  alert("Error: " + (data.message || "ဒေါင်းလို့မရပါ။ Facebook လင့်ခ်အစစ် (Reels/Video) ကို သုံးကြည့်ပါ"));
                }
              } catch (e) {
                alert("Server Error ဖြစ်သွားပါသည်။");
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

  if (req.method === "POST" && url.pathname === "/api/download") {
    const body = await req.json();
    
    // ၁။ Share Link ကို လင့်ခ်အစစ်ဖြစ်အောင် အရင်ပြောင်းသည်
    const finalUrl = await resolveUrl(body.url);

    try {
      // ၂။ Cobalt API ကို လင့်ခ်အစစ်ဖြင့် ပို့သည်
      const res = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          url: finalUrl,
          videoQuality: "720"
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
