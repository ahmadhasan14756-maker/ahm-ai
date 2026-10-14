// Quick guesses for obvious requests, so most messages don't need the extra AI call.
export function quickGuess(text) {
  const s = text.toLowerCase();
  // Pictures, logos, posters, photo edits and merges go to the design studio.
  if (/(لۆگۆ|logo|شعار|wallpaper|پۆستەر|poster|ملصق|فلایەر|flyer)/.test(s)) return "studio";
  if (/(وێنە|وێنەیەک|صورة|صور|image|picture|photo)/.test(s) && /(دروست|بکێشە|بکيشە|بکێشه|تێکەڵ|draw|generate|create|make|merge|combine|edit|ارسم|اصنع|أنشئ|صمم|ادمج|عدّل|design)/.test(s)) return "studio";
  if (/(وێبسایت|ویبسایت|website|web site|موقع|landing page|ئەپ|ئەپڵیکەیشن|app\b|application|تطبيق|game|یاری|لعبة)/.test(s) &&
      /(دروست|بکە|بنووسە|build|create|make|اصنع|أنشئ|ابن|اعمل|صمم|design)/.test(s)) return "build";
  return null;
}

