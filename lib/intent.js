// Quick guesses for obvious requests, so most messages don't need the extra AI call.
export function quickGuess(text) {
  const s = text.toLowerCase();
  // Image creation was removed: such requests go to chat, which explains it kindly.
  if (/(لۆگۆ|logo|شعار|wallpaper|پۆستەر|poster|ملصق)/.test(s)) return "chat";
  if (/(وێنە|وێنەیەک|صورة|image|picture|photo)/.test(s) && /(دروست|بکێشە|بکيشە|draw|generate|create|make|ارسم|اصنع|أنشئ|صمم|design)/.test(s)) return "chat";
  if (/(وێبسایت|ویبسایت|website|web site|موقع|landing page|ئەپ|ئەپڵیکەیشن|app\b|application|تطبيق|game|یاری|لعبة)/.test(s) &&
      /(دروست|بکە|بنووسە|build|create|make|اصنع|أنشئ|ابن|اعمل|صمم|design)/.test(s)) return "build";
  return null;
}

