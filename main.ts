import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  // ညီကို့ Key နဲ့ သုံးလို့ရတဲ့ Model စာရင်းကို Google ဆီက တောင်းကြည့်မယ်
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await res.json();
    
    if (data.error) {
      return new Response(`API Key Error: ${data.error.message}`, { status: 400 });
    }

    // ရလာတဲ့ Model စာရင်းကို ပြမယ်
    const modelNames = data.models.map((m: any) => m.name).join("\n");
    return new Response(`ညီကို့ Key နဲ့ သုံးလို့ရတဲ့ Model များ:\n\n${modelNames}`, {
      headers: { "content-type": "text/plain; charset=UTF-8" }
    });
  } catch (err) {
    return new Response("Connection Error: " + err.message);
  }
});
