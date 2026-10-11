# AHM AI

ئەپی چاتی زیرەکی دەستکرد (PWA) بە کوردی، عەرەبی و ئینگلیزی.

- چوونەژوورەوە بە ئیمەیڵ (Supabase)، ٣ زمان (کوردی، عەرەبی، English)
- چات: وەڵامی خێرا بە دووبارە هەوڵدانەوەی خۆکار و گۆڕینی مۆدێل
- ناردنی وێنە و PDF (بۆ هەمووان)، فایلی کۆد (Pro)
- 🎤 پەیامی دەنگی و 🔊 خوێندنەوەی وەڵام بە دەنگ (Gemini TTS)
- 🎨 دروستکردنی وێنە (Pollinations، بەخۆڕایی) بە ٥ شێواز و ٣ قەبارە
- 💻 شوێنی کاری کۆد وەک VS Code: فایلەکان، دەستکاریکردن، پێشبینینی مۆبایل، ZIP، README بۆ کارپێکردن
- بەخۆڕایی: ٣٠ پرسیار لە مانگێکدا · Pro: $5 = ٤٠٠، $10 = ٧٠٠، $25 = ٢٠٠٠
- بۆتی تەلەگرام بۆ فرۆشتنی Pro بە دوگمەی یەک-کرتە
- گەڕان لە ئینتەرنێت: `ENABLE_SEARCH=1` لە Vercel (پارەی Google دەوێت، تەنها بۆ Pro)

## Environment variables (Vercel → Settings → Environment Variables)

| Name | چییە |
|---|---|
| `GEMINI_API_KEY` | کلیلی Gemini (aistudio.google.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret key (نهێنی) |
| `TELEGRAM_BOT_TOKEN` | لە @BotFather |
| `NEXT_PUBLIC_TELEGRAM_BOT` | ناوی بۆتەکە، بۆ نموونە `ahm_ai_bot` |
| `ADMIN_TELEGRAM_ID` | ID ی تەلەگرامی خاوەن (بە `/myid` لە بۆتەکە وەریدەگریت) |
| `TELEGRAM_WEBHOOK_SECRET` | وشەیەکی نهێنی هەڕەمەکی (تەنها پیت و ژمارە) |
| `PAYMENT_INFO` | نرخ و ژمارەی FIB، بۆ نموونە: `FIB: 07xx xxx xxxx` |
| `GEMINI_MODEL` / `GEMINI_MODEL_PRO` | (ئارەزوومەندانە) مۆدێل، بنەڕەت `gemini-3.8-flash` |

## یەکجار

1. ناوەڕۆکی `supabase/schema.sql` لە Supabase → SQL Editor ڕابکە.
2. دوای دامەزراندن لەسەر Vercel، بۆتەکە ببەستەوە:
   `https://YOUR-SITE.vercel.app/api/telegram/setup?key=TELEGRAM_WEBHOOK_SECRET`
3. لە Supabase → Authentication → URL Configuration، **Site URL** بکە بە لینکی Vercel ـەکەت.
