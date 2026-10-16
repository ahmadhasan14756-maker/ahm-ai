// Quick guesses for obvious requests, so most messages don't need the extra AI call.
export function quickGuess(text) {
  const s = text.toLowerCase();
  // House plans, building costs, construction materials → the construction studio.
  if (/(بیناسازی|نەخشەی خانوو|نەخشەی ماڵ|خانوو دروست|تێچووی دروستکردن|کەرەستەی بینا|چیمەنتۆ|بلۆک|کۆنکریت|house plan|floor plan|construction|building cost|مخطط منزل|بناء|تكلفة البناء|مواد البناء)/.test(s)) return "construct";
  // Making pictures/logos is not available: such requests go to chat, which explains it kindly.
  if (/(لۆگۆ|logo|شعار|wallpaper|پۆستەر|poster|ملصق|فلایەر|flyer)/.test(s)) return "chat";
  if (/(وێنە|وێنەیەک|صورة|صور|image|picture|photo)/.test(s) && /(دروست|بکێشە|بکيشە|بکێشه|تێکەڵ|draw|generate|create|make|merge|combine|edit|ارسم|اصنع|أنشئ|صمم|ادمج|عدّل|design)/.test(s)) return "chat";
  if (/(وێبسایت|ویبسایت|website|web site|موقع|landing page|ئەپ|ئەپڵیکەیشن|app\b|application|تطبيق|game|یاری|لعبة)/.test(s) &&
      /(دروست|بکە|بنووسە|build|create|make|اصنع|أنشئ|ابن|اعمل|صمم|design)/.test(s)) return "build";
  return null;
}

