"use client";
// AHM 3D Studio — draw a building in 2D/3D with the finger, or tell the AI in Kurdish what to change.
// Preview for the owner only (the button shows only for the owner; the AI route checks it too).
import { useEffect, useRef, useState } from "react";
import { PROPS, CAR_COLORS } from "../lib/props3d";
import { Studio3D, emptyModel, applyOps, addRoom, buildRoom, findSpot, roomFits, snapRoom, planToModel, boq, wallLen, uid, ROOM_TYPES, WALL_COLORS, DEFAULT_PRICES, MATERIALS } from "../lib/studio3d";

const T = {
  title: ["AHM 3D Studio", "AHM 3D Studio", "AHM 3D Studio", "AHM 3D Studio"],
  beta: ["تاقیکردنەوە · تەنها تۆ دەیبینیت", "Preview · only you can see it", "تاقیکرن · تنێ تو دبینی", "تجريبي · أنت فقط تراه"],
  back: ["گەڕانەوە", "Back", "زڤڕین", "رجوع"],
  v3d: ["3D", "3D", "3D", "3D"], vplan: ["نەخشە", "Plan", "نەخشە", "مخطط"], vwalk: ["🚶 پیاسە", "🚶 Walk", "🚶 گەڕیان", "🚶 تجوّل"],
  select: ["دیاریکردن", "Select", "هەلبژارتن", "تحديد"], wall: ["دیوار", "Wall", "دیوار", "جدار"], room: ["ژوور", "Room", "ژوور", "غرفة"], door: ["دەرگا", "Door", "دەرگەه", "باب"], window: ["پەنجەرە", "Window", "پەنجەرە", "نافذة"],
  measure: ["پێوانە", "Measure", "پیڤان", "قياس"], erase: ["سڕینەوە", "Erase", "ژێبرن", "حذف"], undo: ["گەڕانەوە", "Undo", "زڤڕین", "تراجع"], redo: ["دووبارە", "Redo", "دووبارە", "إعادة"],
  ai: ["🤖 AI", "🤖 AI", "🤖 AI", "🤖 AI"], cost: ["💰 تێچوون", "💰 Cost", "💰 تێچوون", "💰 التكلفة"], file: ["📁 فایل", "📁 File", "📁 فایل", "📁 ملف"], props: ["⚙️ تایبەتمەندی", "⚙️ Properties", "⚙️ تایبەتمەندی", "⚙️ الخصائص"],
  h_wall: ["خاڵی یەکەم دابگرە، پاشان خاڵی دووەم. بۆ وەستان هەمان خاڵ دووبارە دابگرە یان «✓ تەواو».", "Tap the first point, then the next. Tap the same point again or «✓ Done» to stop.", "خالا ئێکێ بکە، پاشان خالا دووێ. بۆ ڕاوەستانێ هەمان خالێ دووبارە بکە یان «✓ تەمام».", "اضغط النقطة الأولى ثم التالية. اضغط النقطة نفسها مرة أخرى أو «✓ تم» للتوقف."],
  h_room: ["جۆر و قەبارەی ژوورەکە هەڵبژێرە، پاشان شوێنێکی بەتاڵ دابگرە.", "Pick the room type and size, then tap an empty spot.", "جۆر و قەبارێ ژوورێ هەلبژێرە، پاشان جهەکێ ڤالا بکە.", "اختر نوع الغرفة ومقاسها، ثم اضغط مكاناً فارغاً."],
  rbType: ["جۆری ژوور", "Room type", "جۆرێ ژوورێ", "نوع الغرفة"], depth: ["درێژی (م)", "Length (m)", "درێژی (م)", "الطول (م)"],
  rbDoor: ["دەرگا", "Door", "دەرگەه", "باب"], rbWin: ["پەنجەرە", "Windows", "پەنجەرە", "نوافذ"], rbAuto: ["دیوارەکان خۆی بیانکات", "Build the walls too", "دیوار ب خۆ چێ ببن", "يبني الجدران أيضاً"],
  rbFind: ["📍 خۆی شوێنی بەتاڵ بدۆزێتەوە", "📍 Find an empty spot for me", "📍 ب خۆ جهێ ڤالا ببینیت", "📍 ابحث لي عن مكان فارغ"],
  rbTap: ["👆 شوێنێکی بەتاڵ لەسەر زەوییەکە دابگرە — ژوورەکە لەوێ دەردەکەوێت.", "👆 Tap an empty spot on the ground — the room appears there.", "👆 جهەکێ ڤالا ل سەر ئەردی بکە — ژوور ل وێرێ دیار دبیت.", "👆 اضغط مكاناً فارغاً على الأرض — تظهر الغرفة هناك."],
  rbOk: ["✅ ئەم شوێنە بەتاڵە. دەتوانیت بیجوڵێنیت یان دروستی بکەیت.", "✅ This spot is free. Move it or build it.", "✅ ئەڤ جهە ڤالایە. دشێی بلڤینی یان چێ بکەی.", "✅ هذا المكان فارغ. حرّكه أو ابنِه."],
  rbBad: ["⛔ ئەم شوێنە بەتاڵ نییە (ژوور یان دیوار هەیە، یان لە دەرەوەی زەوییەکەیە). شوێنێکی تر دابگرە.", "⛔ This spot is taken (a room or wall is there, or it is outside the plot). Tap another spot.", "⛔ ئەڤ جهە ڤالا نینە. جهەکێ دی بکە.", "⛔ هذا المكان مشغول. اضغط مكاناً آخر."],
  rbBuild: ["🏗️ لێرە دروستی بکە", "🏗️ Build it here", "🏗️ ل ڤێرێ چێ بکە", "🏗️ ابنِها هنا"], rbTurn: ["⟳ سوڕاندن", "⟳ Turn", "⟳ زڤڕاندن", "⟳ تدوير"],
  rbNoSpot: ["شوێنی بەتاڵ بەم قەبارەیە نییە. قەبارەکە بچووکتر بکە یان زەوییەکە گەورەتر بکە.", "No empty spot fits this size. Make it smaller or the plot bigger.", "جهێ ڤالا ب ڤێ قەبارێ نینە.", "لا يوجد مكان فارغ بهذا المقاس."],
  roomDone: ["✅ ژوورەکە دروست کرا — دەرگا و پەنجەرەکانیشی دانران.", "✅ The room is built — with its door and windows.", "✅ ژوور هاتە چێکرن — دگەل دەرگەه و پەنجەران.", "✅ بُنيت الغرفة — مع بابها ونوافذها."],
  h_door: ["لەسەر دیوارێک دابگرە بۆ دانانی دەرگا.", "Tap a wall to put a door.", "ل سەر دیوارەکی بکە بۆ دانانا دەرگەهی.", "اضغط على جدار لوضع باب."],
  h_window: ["لەسەر دیوارێک دابگرە بۆ دانانی پەنجەرە.", "Tap a wall to put a window.", "ل سەر دیوارەکی بکە بۆ دانانا پەنجەرێ.", "اضغط على جدار لوضع نافذة."],
  h_measure: ["دوو خاڵ دابگرە بۆ پێوانە.", "Tap two points to measure.", "دوو خالان بکە بۆ پیڤانێ.", "اضغط نقطتين للقياس."],
  h_erase: ["لەسەر هەر شتێک دابگرە بۆ سڕینەوەی.", "Tap anything to delete it.", "ل سەر هەر تشتەکی بکە بۆ ژێبرنێ.", "اضغط على أي شيء لحذفه."],
  h_select: ["لەسەر دیوار، دەرگا، پەنجەرە یان ژوور دابگرە بۆ گۆڕینی.", "Tap a wall, door, window or room to edit it.", "ل سەر دیوار، دەرگەه، پەنجەرە یان ژوورێ بکە بۆ گوهۆڕینێ.", "اضغط على جدار أو باب أو نافذة أو غرفة لتعديلها."],
  h_walk: ["پەنجە ڕابکێشە بۆ سەیرکردن، دوگمەکان بۆ ڕۆیشتن.", "Drag to look around, buttons to move.", "تبلێ ڕاکێشە بۆ سەحکرنێ، دوگمە بۆ چوونێ.", "اسحب للنظر حولك، والأزرار للمشي."],
  done: ["✓ تەواو", "✓ Done", "✓ تەمام", "✓ تم"], len: ["درێژی (م)", "Length (m)", "درێژی (م)", "الطول (م)"], size: ["قەبارە (وەک 4×5)", "Size (like 4×5)", "قەبارە (وەک 4×5)", "المقاس (مثل 4×5)"],
  empty1: ["دەست پێبکە", "Get started", "دەست پێ بکە", "ابدأ"],
  empty2: ["بە پەنجە بیکێشە، نەخشەیەک بنێرە، یان بە کوردی بە AI بڵێ چی دروست بکات.", "Draw with your finger, send a floor plan, or tell the AI in Kurdish what to build.", "ب تبلێ بکێشە، نەخشەکێ بهنێرە، یان ب کوردی بێژە AI چ دروست بکەت.", "ارسم بإصبعك، أو أرسل مخططاً، أو أخبر الذكاء الاصطناعي بما تريد بناءه."],
  sample: ["🏠 خانوویەکی نموونە", "🏠 Sample house", "🏠 خانیەکێ نموونە", "🏠 منزل نموذجي"], fromPlan: ["📐 نەخشە ← 3D", "📐 Plan → 3D", "📐 نەخشە ← 3D", "📐 مخطط ← 3D"], askAi: ["🤖 بە AI بڵێ", "🤖 Ask the AI", "🤖 بێژە AI", "🤖 اطلب من AI"],
  aiPh: ["بۆ نموونە: ژوورێکی نوستنی ٤×٤ لە لای ڕاستی هۆڵەکە زیاد بکە", "e.g. add a 4×4 bedroom to the right of the living room", "بۆ نموونە: ژوورەکا نڤستنێ یا ٤×٤ ل لایێ ڕاستێ هۆلێ زێدە بکە", "مثلاً: أضف غرفة نوم 4×4 يمين الصالة"],
  send: ["ناردن", "Send", "هنارتن", "إرسال"], thinking: ["AI بیر دەکاتەوە…", "The AI is thinking…", "AI هزر دکەت…", "الذكاء الاصطناعي يفكر…"],
  sug1: ["دیوارە دەرەکییەکان ٣٠ سم ئەستوور بکە", "Make the outside walls 30 cm thick", "دیوارێن دەرڤە ٣٠ سم ستویر بکە", "اجعل الجدران الخارجية بسماكة 30 سم"],
  sug2: ["پەنجەرە بخەرە سەر هەموو دیوارە دەرەکییەکان", "Put windows on all outside walls", "پەنجەران دانە سەر هەمی دیوارێن دەرڤە", "ضع نوافذ على كل الجدران الخارجية"],
  sug3: ["چێشتخانەیەکی ٣×٤ لە خوارەوەی هۆڵەکە زیاد بکە", "Add a 3×4 kitchen below the living room", "مەتبەخەکا ٣×٤ ل خوارێ هۆلێ زێدە بکە", "أضف مطبخاً 3×4 أسفل الصالة"],
  sug4: ["بەرزی هەموو دیوارەکان بکە ٣.٢ م", "Make all walls 3.2 m high", "بلندیا هەمی دیواران بکە ٣.٢ م", "اجعل ارتفاع كل الجدران 3.2 م"],
  thick: ["ئەستووری (م)", "Thickness (m)", "ستویراتی (م)", "السماكة (م)"], height: ["بەرزی (م)", "Height (m)", "بلندی (م)", "الارتفاع (م)"], length: ["درێژی", "Length", "درێژی", "الطول"], color: ["ڕەنگ", "Colour", "ڕەنگ", "اللون"],
  width: ["پانی (م)", "Width (m)", "پانی (م)", "العرض (م)"], sill: ["بەرزی لە زەوی (م)", "Sill (m)", "بلندی ژ ئەردی (م)", "الارتفاع عن الأرض (م)"], name: ["ناو", "Name", "ناڤ", "الاسم"], type: ["جۆر", "Type", "جۆر", "النوع"],
  addDoor: ["+ دەرگا", "+ Door", "+ دەرگەه", "+ باب"], addWin: ["+ پەنجەرە", "+ Window", "+ پەنجەرە", "+ نافذة"], del: ["🗑️ سڕینەوە", "🗑️ Delete", "🗑️ ژێبرن", "🗑️ حذف"],
  nothingSel: ["هیچ شتێک دیاری نەکراوە. ئامرازی «دیاریکردن» بەکاربهێنە.", "Nothing selected. Use the Select tool.", "چو تشت نەهاتیە هەلبژارتن. ئامرازێ «هەلبژارتن» بکاربینە.", "لم يُحدَّد شيء. استخدم أداة «تحديد»."],
  costNote: ["خەمڵاندنێکی سەرەتاییە. نرخەکان نموونەن بە دینار، بیانگۆڕە بۆ نرخی بازاڕی ناوچەکەت.", "A rough estimate. Prices are examples in IQD — change them to your local prices.", "خەملاندنەکا سەرەتاییە. بها نموونەنە ب دینار، بگوهۆڕە بۆ بهایێ بازارا دەڤەرا خۆ.", "تقدير أولي. الأسعار أمثلة بالدينار، غيّرها إلى أسعار سوقك."],
  total: ["کۆی گشتی", "Total", "کۆمێ گشتی", "المجموع"], floorA: ["ڕووبەری زەوی", "Floor area", "ڕووبەرێ ئەردی", "مساحة الأرض"], wallA: ["ڕووبەری دیوار", "Wall area", "ڕووبەرێ دیواری", "مساحة الجدران"],
  c_block: ["بلۆک", "Blocks", "بلۆک", "بلوك"], c_plaster: ["گەچ و سمنت", "Plaster", "گەچ و چیمەنتۆ", "لياسة"], c_paint: ["بۆیە", "Paint", "بۆیاخ", "دهان"], c_tile: ["کاشی", "Floor tiles", "کاشی", "بلاط"],
  c_concrete: ["کۆنکرێتی سەقف", "Roof concrete", "کۆنکرێتێ سەقفی", "خرسانة السقف"], c_door: ["دەرگا", "Doors", "دەرگەه", "أبواب"], c_window: ["پەنجەرە", "Windows", "پەنجەرە", "نوافذ"],
  newM: ["🆕 نوێ", "🆕 New", "🆕 نوو", "🆕 جديد"], saveJ: ["💾 پاشەکەوت (فایل)", "💾 Save (file)", "💾 پاشەکەفت (فایل)", "💾 حفظ (ملف)"], openJ: ["📂 کردنەوەی فایل", "📂 Open file", "📂 ڤەکرنا فایلێ", "📂 فتح ملف"],
  png: ["🖼️ وێنەی 4K", "🖼️ 4K picture", "🖼️ وێنەیێ 4K", "🖼️ صورة 4K"], glb: ["🧊 مۆدێلی 3D (GLB)", "🧊 3D model (GLB)", "🧊 مۆدێلێ 3D (GLB)", "🧊 نموذج 3D (GLB)"], sunT: ["☀️ کاتی خۆر", "☀️ Sun time", "☀️ دەمێ ڕۆژێ", "☀️ وقت الشمس"],
  reading: ["نەخشەکە دەخوێنرێتەوە…", "Reading the plan…", "نەخشە دهێتە خواندن…", "جارٍ قراءة المخطط…"], planDone: ["نەخشەکە کرا بە 3D ✅ ئێستا دەتوانیت دەستکاری بکەیت.", "The plan is now 3D ✅ You can edit it.", "نەخشە بوو 3D ✅ نوکە دشێی دەستکاری بکەی.", "تحوّل المخطط إلى 3D ✅ يمكنك تعديله الآن."],
  planFail: ["نەتوانرا نەخشەکە بخوێنرێتەوە. وێنەیەکی ڕوونتر تاقی بکەرەوە.", "Couldn't read the plan. Try a clearer picture.", "نەشیا نەخشە بهێتە خواندن. وێنەکێ ڕوونتر تاقی بکە.", "تعذّرت قراءة المخطط. جرّب صورة أوضح."],
  confirmNew: ["مۆدێلەکە بسڕدرێتەوە و لە سەرەتاوە دەست پێبکەیت؟", "Clear the model and start again?", "مۆدێل بهێتە ژێبرن و ژ سەری دەست پێ بکەی؟", "حذف النموذج والبدء من جديد؟"],
  aiFail: ["AI وەڵامی نەدایەوە. دووبارە هەوڵ بدەرەوە.", "The AI didn't answer. Try again.", "AI بەرسڤ نەدا. دووبارە تاقی بکە.", "لم يرد الذكاء الاصطناعي. حاول مجدداً."], saved: ["پاشەکەوت کرا", "Saved", "هاتە پاشەکەفتکرن", "تم الحفظ"],
  floorN: ["نهۆمی", "Floor", "قات", "الطابق"], measured: ["دووری", "Distance", "دووراتی", "المسافة"],
  paint: ["ڕەنگ", "Paint", "ڕەنگ", "طلاء"], items: ["🛋️ کەلوپەل", "🛋️ Furniture", "🛋️ کەلوپەل", "🛋️ أثاث"],
  h_paint: ["ڕەنگ و کەرەستە هەڵبژێرە، پاشان لەسەر هەر لایەکی دیوار یان زەویی ژوورێک دابگرە.", "Pick a colour and material, then tap any side of a wall or a room's floor.", "ڕەنگ و کەرەستەی هەلبژێرە، پاشان ل سەر هەر لایەکێ دیواری یان ئەردێ ژوورەکێ بکە.", "اختر لوناً ومادة ثم اضغط على أي وجه من الجدار أو أرضية غرفة."],
  pickColor: ["هەموو ڕەنگەکان", "All colours", "هەمی ڕەنگ", "كل الألوان"], wallMat: ["کەرەستەی دیوار", "Wall material", "کەرەستێ دیواری", "مادة الجدار"], floorMat: ["کەرەستەی زەوی", "Floor material", "کەرەستێ ئەردی", "مادة الأرضية"],
  bothSides: ["هەردوو لای دیوار", "Both sides of the wall", "هەردوو لایێن دیواری", "وجها الجدار"], allWalls: ["🖌️ هەموو دیوارەکان", "🖌️ All walls", "🖌️ هەمی دیوار", "🖌️ كل الجدران"],
  m_paint: ["بۆیە", "Paint", "بۆیاخ", "دهان"], m_brick: ["خشت", "Brick", "خشت", "طابوق"], m_stone: ["بەرد", "Stone", "بەر", "حجر"], m_tile: ["کاشی", "Tile", "کاشی", "بلاط"], m_wood: ["دار", "Wood", "دار", "خشب"], m_marble: ["مەڕمەڕ", "Marble", "مەڕمەڕ", "رخام"], m_concrete: ["کۆنکرێت", "Concrete", "کۆنکرێت", "خرسانة"], m_carpet: ["فەرش", "Carpet", "فەرش", "سجاد"],
  searchPh: ["بگەڕێ: قەنەفە، جێگا، مێز، گڵۆپ، دار…", "Search: sofa, bed, table, lamp, tree…", "لێ بگەڕە: قەنەفە، جهێ نڤستنێ، مێز، گلۆپ، دار…", "ابحث: كنبة، سرير، طاولة، مصباح، شجرة…"], all: ["هەموو", "All", "هەمی", "الكل"],
  libOff: ["کتێبخانەی 3D ئێستا ناگات. دواتر هەوڵ بدەرەوە.", "The 3D library isn't reachable now. Try later.", "پەرتووکخانەیا 3D نوکە ناگەهیت. پاشان تاقی بکە.", "مكتبة 3D غير متاحة الآن. حاول لاحقاً."],
  added: ["زیاد کرا ✅ بە پەنجە ڕایبکێشە بۆ شوێنی خۆی.", "Added ✅ Drag it into place with your finger.", "هاتە زێدەکرن ✅ ب تبلێ ڕاکێشە بۆ جهێ وی.", "أُضيف ✅ اسحبه بإصبعك إلى مكانه."],
  rotate: ["سووڕاندن", "Rotate", "زڤڕاندن", "تدوير"], sizeL: ["قەبارە", "Size", "قەبارە", "الحجم"], lift: ["بەرزی لە زەوی", "Height from floor", "بلندی ژ ئەردی", "الارتفاع عن الأرض"], dup: ["📄 دووبارەکردنەوە", "📄 Duplicate", "📄 دووبارەکرن", "📄 تكرار"],
  libNote: ["مۆدێلی 3D ی ڕاستەقینە لە Poly Haven (بەخۆڕایی، CC0)، بە قەبارەی ڕاستی.", "Real 3D models from Poly Haven (free, CC0), real size.", "مۆدێلێن 3D یێن ڕاستەقینە ژ Poly Haven (بێ بەرامبەر، CC0)، ب قەبارێ ڕاستی.", "نماذج 3D حقيقية من Poly Haven (مجانية، CC0) بالحجم الحقيقي."],
  more: ["📁 زیاتر", "📁 More", "📁 پتر", "📁 المزيد"], realism: ["ڕاستەقینەیی", "Realism", "ڕاستەقینەیی", "الواقعية"], roofT: ["🏠 سەقفی خانوو", "🏠 Roof", "🏠 سەقفێ خانیی", "🏠 السقف"], ceilT: ["💡 سەقفی ناوەوە", "💡 Ceilings", "💡 سەقفێ ناڤخۆ", "💡 الأسقف الداخلية"],
  render: ["✨ وێنەی ڕاستەقینە بە AI", "✨ Photo-real picture (AI)", "✨ وێنەیێ ڕاستەقینە ب AI", "✨ صورة واقعية بالذكاء الاصطناعي"], renderSub: ["ئەم دیمەنە دەکاتە وێنەیەکی وەک فۆتۆی ڕاستەقینە (١ وێنە حیساب دەکرێت).", "Turns this exact view into a real-looking photo (counts as 1 picture).", "ئەڤ دیمەنە دکەتە وێنەیەکێ وەک فۆتۆیەکا ڕاستەقینە (١ وێنە دهێتە هژمارتن).", "يحوّل هذا المشهد إلى صورة تشبه الصورة الحقيقية (تُحسب صورة واحدة)."],
  rendering: ["AI وێنەی ڕاستەقینە دروست دەکات… (١٠–٤٠ چرکە)", "The AI is making the photo… (10–40 s)", "AI وێنەیێ ڕاستەقینە دروست دکەت… (١٠–٤٠ چرکە)", "يصنع الذكاء الاصطناعي الصورة… (10–40 ثانية)"], renderFail: ["وێنەکە دروست نەبوو. دووبارە هەوڵ بدەرەوە.", "The picture failed. Try again.", "وێنە دروست نەبوو. دووبارە تاقی بکە.", "فشلت الصورة. حاول مجدداً."],
  dl: ["⬇️ داگرتن", "⬇️ Download", "⬇️ داگرتن", "⬇️ تنزيل"], close: ["داخستن", "Close", "گرتن", "إغلاق"],
  real: ["🏗️ ڕاستەقینە", "🏗️ Realistic", "🏗️ ڕاستەقینە", "🏗️ واقعي"],
  realSub: ["زەوییەک هەڵبژێرە، خانووەکەت بلۆک بە بلۆک دروست بکە، پاشان بچۆ ناوی", "Pick a plot, build your house block by block, then walk inside", "ئەردەکی هەلبژێرە، خانیێ خۆ بلۆک ب بلۆک ئاڤا بکە، پاشان بچە د ناڤدا", "اختر أرضاً، ابنِ منزلك بلوكاً بلوكاً، ثم ادخل إليه"],
  plotT: ["قەبارەی زەوییەکەت", "Your plot size", "قەبارێ ئەردێ تە", "مساحة أرضك"],
  plotW: ["پانی (م)", "Width (m)", "پانی (م)", "العرض (م)"],
  plotD: ["درێژی (م)", "Depth (m)", "درێژی (م)", "العمق (م)"],
  streetNote: ["شەقام لە بەردەمی زەوییەکەیە (لای خوارەوە).", "The street is in front of the plot (bottom side).", "جادە ل بەرامبەر ئەردییە (لایێ خوارێ).", "الشارع أمام الأرض (الجهة السفلى)."],
  start: ["🚀 دەستپێکردن", "🚀 Start", "🚀 دەستپێکرن", "🚀 ابدأ"],
  s1: ["ژوورەکان", "Rooms", "ژوور", "الغرف"],
  s2: ["بلۆک", "Blocks", "بلۆک", "البلوك"],
  s3: ["دەرگا و پەنجەرە", "Doors & windows", "دەرگەه و پەنجەرە", "أبواب ونوافذ"],
  s4: ["ڕەنگ", "Paint", "ڕەنگ", "الطلاء"],
  s5: ["سوورە", "Fence", "سوور", "السور"],
  s6: ["کەلوپەل", "Furniture", "کەلوپەل", "الأثاث"],
  s7: ["بچۆ ژوورەوە", "Go inside", "بچە ژوورڤە", "ادخل"],
  h_s1: ["ژوورەکانت دابنێ: جۆر و قەبارە هەڵبژێرە، پاشان شوێنێکی بەتاڵ دابگرە یان «📍 خۆی شوێن بدۆزێتەوە».", "Add your rooms: pick a type and size, then tap an empty spot or “📍 Find a spot”.", "ژوورێن خۆ دانە: جۆر و قەبارێ هەلبژێرە، پاشان جهەکێ ڤالا بکە.", "أضف غرفك: اختر النوع والمقاس، ثم اضغط مكاناً فارغاً أو «📍 ابحث عن مكان»."],
  buildWith: ["دیوارەکان بە چی دروست بکرێن؟", "What should the walls be built with?", "دیوار ب چ بهێنە ئاڤاکرن؟", "بماذا تُبنى الجدران؟"],
  buildGo: ["🧱 دروستی بکە", "🧱 Build it", "🧱 ئاڤا بکە", "🧱 ابنِه"],
  building: ["دیوارەکان ڕیز بە ڕیز بەرز دەبنەوە…", "The walls are rising course by course…", "دیوار ڕیز ب ڕیز بلند دبن…", "الجدران ترتفع صفاً بعد صف…"],
  built: ["دیوارەکان تەواو بوون ✅ ئێستا دەرگا و پەنجەرە دابنێ.", "Walls are up ✅ Now add doors and windows.", "دیوار تەمام بوون ✅ نوکە دەرگەه و پەنجەران دانە.", "اكتملت الجدران ✅ أضف الآن الأبواب والنوافذ."],
  needRooms: ["سەرەتا ژوورێک دابنێ.", "Lay out a room first.", "دەستپێکێ ژوورەکێ دانە.", "ضع غرفة أولاً."],
  fenceT: ["🧱 سوورە لە دەوری زەوییەکە", "🧱 Fence around the plot", "🧱 سوور ل دۆر ئەردی", "🧱 سور حول الأرض"],
  fenceDone: ["سوورە دروست کرا، لەگەڵ دەرگای ئۆتۆمبێل و دەرگای پیاوان ✅", "Fence built, with a car gate and a front door ✅", "سوور هاتە ئاڤاکرن، دگەل دەرگەهێ ترومبێلێ و دەرگەهێ پیادەیان ✅", "بُني السور مع بوابة سيارة وباب أمامي ✅"],
  goIn: ["🚶 لە شەقامەوە بچۆ ناو خانووەکە", "🚶 Walk in from the street", "🚶 ژ جادێ بچە د ناڤ خانیی دا", "🚶 ادخل من الشارع"],
  google: ["🌐 Google", "🌐 Google", "🌐 Google", "🌐 Google"],
  gHint: ["لە Google بگەڕێ — هەر وێنەیەک هەڵبژێریت دەبێتە شتێک لە ناو خانووەکەت", "Search Google — any picture you pick becomes an object in your house", "ل Google بگەڕە — هەر وێنەکێ هەلبژێری دبیتە تشتەک د ناڤ خانیێ تە دا", "ابحث في Google — أي صورة تختارها تصبح قطعة داخل منزلك"],
  models3d: ["🧊 مۆدێلی 3D", "🧊 3D models", "🧊 مۆدێلێن 3D", "🧊 نماذج 3D"],
  picH: ["بەرزی (م)", "Height (m)", "بلندی (م)", "الارتفاع (م)"],
  m_block: ["بلۆک", "Block", "بلۆک", "بلوك"],
  gQuick: ["🚗 ئۆتۆمبێل|🛋️ قەنەفە|🛏️ جێگا|🍽️ مێزی نانخواردن|🌳 دار|🌷 گوڵ|💡 گڵۆپ|📺 تەلەفزیۆن|🚿 حەمام|🏊 مەلەوانگە", "🚗 car|🛋️ sofa|🛏️ bed|🍽️ dining table|🌳 tree|🌷 flowers|💡 lamp|📺 TV|🚿 bathroom|🏊 pool",
    "🚗 ترومبێل|🛋️ قەنەفە|🛏️ جهێ نڤستنێ|🍽️ مێزا خوارنێ|🌳 دار|🌷 گول|💡 گلۆپ|📺 تەلەفزیۆن|🚿 حەمام|🏊 مەلەڤانگە", "🚗 سيارة|🛋️ كنبة|🛏️ سرير|🍽️ طاولة طعام|🌳 شجرة|🌷 زهور|💡 مصباح|📺 تلفاز|🚿 حمام|🏊 مسبح"],
  lay: ["دانانی بلۆک", "Lay blocks", "دانانا بلۆکان", "وضع البلوك"],
  pourT: ["ڕێژانی سەقف", "Pour roof", "ڕێژتنا سەقفی", "صبّ السقف"],
  garden: ["باخچە", "Garden", "باخچە", "حديقة"],
  h_lay: ["لەسەر دیوارێک دابگرە، هەر جارێک ڕیزێکی بلۆک دادەنرێت (٢٠ سم).", "Tap a wall: each tap lays one course of blocks (20 cm).", "ل سەر دیوارەکی بکە، هەر جارەکێ ڕیزەکا بلۆکان دادنیت (٢٠ سم).", "اضغط على جدار: كل ضغطة تضع صفاً من البلوك (20 سم)."],
  h_pour: ["لەسەر ژوورێک دابگرە بۆ ڕێژانی کۆنکرێتی سەقفەکەی.", "Tap a room to pour its concrete roof slab.", "ل سەر ژوورەکێ بکە بۆ ڕێژتنا کۆنکرێتا سەقفێ وێ.", "اضغط على غرفة لصبّ سقفها الخرساني."],
  h_garden: ["جۆرێک هەڵبژێرە، پاشان دوو گۆشە لەسەر زەوییەکە دابگرە.", "Pick a type, then tap two corners on the ground.", "جۆرەکی هەلبژێرە، پاشان دوو گۆشان ل سەر ئەردی بکە.", "اختر النوع ثم اضغط زاويتين على الأرض."],
  rowAll: ["+ ڕیزێک بۆ هەموو دیوارەکان", "+ One course on all walls", "+ ڕیزەک بۆ هەمی دیواران", "+ صف على كل الجدران"],
  fullAll: ["⚡ هەموو دیوارەکان تەواو بکە", "⚡ Finish all walls", "⚡ هەمی دیواران تەمام بکە", "⚡ أكمل كل الجدران"],
  pourAll: ["🏗️ سەقفی هەموو ژوورەکان", "🏗️ Pour every roof", "🏗️ سەقفێ هەمی ژووران", "🏗️ صبّ كل الأسقف"],
  laid: ["دانراوە", "laid", "دانایە", "مُنجز"],
  pouring: ["کۆنکرێت دەڕێژرێت…", "Pouring concrete…", "کۆنکرێت دهێتە ڕێژتن…", "يُصبّ الخرسانة…"],
  wallsFirst: ["سەرەتا دیوارەکانی ئەم ژوورە تەواو بکە.", "Finish this room's walls first.", "دەستپێکێ دیوارێن ڤی ژووری تەمام بکە.", "أكمل جدران هذه الغرفة أولاً."],
  g_grass: ["🌱 چیمەن", "🌱 Lawn", "🌱 چیمەن", "🌱 عشب"],
  g_paving: ["کاشی حەوشە", "Paving", "کاشیێ حەوشێ", "بلاط"],
  g_gravel: ["چەو", "Gravel", "چەو", "حصى"],
  g_soil: ["خۆڵ", "Soil", "ئاخ", "تراب"],
  planUp: ["📐 نەخشەکەم بنێرە", "📐 Send my plan", "📐 نەخشا من بهنێرە", "📐 أرسل مخططي"],
  planUpSub: ["ژوورەکانی نەخشەکەت لەسەر زەوییەکە دادەنرێن، دیوارەکان خۆت بلۆک بە بلۆک دادەنێیت", "Your plan's rooms go on the plot; you lay the walls block by block yourself", "ژوورێن نەخشا تە ل سەر ئەردی دهێنە دانان، دیواران تو ب خۆ بلۆک ب بلۆک دادنێی", "تُوضع غرف مخططك على الأرض، وأنت تبني الجدران بلوكاً بلوكاً"],
  orT: ["یان", "or", "یان", "أو"],
  r2: ["بلۆک دابنێ", "Lay blocks", "بلۆکان دانە", "ضع البلوك"],
  r4: ["سەقف بڕێژە", "Pour roof", "سەقفی بڕێژە", "صبّ السقف"],
  r5: ["سواخ و ڕەنگ", "Plaster & paint", "سواخ و ڕەنگ", "لياسة ودهان"],
  r7: ["باخچە و چیمەن", "Garden & lawn", "باخچە و چیمەن", "حديقة وعشب"],
  r9: ["🚗 ئۆتۆمبێل", "🚗 Car", "🚗 ترومبێل", "🚗 سيارة"],
  carQ: ["ئۆتۆمبێل", "car", "ترومبێل", "سيارة"],
  myPhoto: ["📷 وێنەی خۆم", "📷 My photo", "📷 وێنێ من", "📷 صورتي"],
  myPhotoSub: ["وێنەی هەر شتێک بنێرە، پاشبنەماکەی لادەبرێت و دەیخەیتە ناو خانووەکەت", "Upload a photo of anything: its background is removed and it goes into your house", "وێنێ هەر تشتەکی بهنێرە، پاشبنەما وێ دهێتە لابرن و دچیتە د ناڤ خانیێ تە دا", "ارفع صورة لأي شيء: تُزال خلفيتها وتوضع داخل منزلك"],
  gwhy_quota: ["Google وەڵام نادات: گەڕانە بەخۆڕاییەکانی کلیلی Serper تەواو بوون. لە serper.dev کلیلێکی نوێ وەربگرە و لە Vercel دایبنێ.", "Google isn't answering: the Serper key's free searches are used up. Get a new key at serper.dev and put it in Vercel.", "Google بەرسڤێ نادەت: لێگەڕیانێن بێ بەرامبەر یێن کلیلا Serper ب دوماهی هاتن. ل serper.dev کلیلەکا نوو وەربگرە و ل Vercel دانە.", "لا يستجيب Google: انتهت عمليات البحث المجانية لمفتاح Serper. احصل على مفتاح جديد من serper.dev وضعه في Vercel."],
  gwhy_key: ["کلیلی Serper لە Vercel هەڵەیە یان کار ناکات.", "The Serper key in Vercel is wrong or not working.", "کلیلا Serper ل Vercel خەلەتە یان کار ناکەت.", "مفتاح Serper في Vercel خاطئ أو لا يعمل."],
  gwhy_no_key: ["کلیلی Serper لە Vercel دانەنراوە.", "No Serper key is set in Vercel.", "کلیلا Serper ل Vercel نەهاتیە دانان.", "لم يُضبط مفتاح Serper في Vercel."],
  gwhy_other: ["Google ئێستا وەڵامی نەدایەوە، دووبارە هەوڵ بدەرەوە. وێنەی سەرچاوەکانی تر لە خوارەوەن.", "Google didn't answer now — try again. Pictures from other sources are below.", "Google نوکە بەرسڤ نەدا، دووبارە تاقی بکە. وێنێن ژێدەرێن دی ل خوارێنە.", "لم يستجب Google الآن، حاول مجدداً. صور من مصادر أخرى بالأسفل."],
  restart: ["↺ سەرەتا", "↺ Start over", "↺ دەستپێک", "↺ من البداية"],
  saveP: ["💾 پاشەکەوت", "💾 Save", "💾 پاشەکەفت", "💾 حفظ"],
  savedP: ["پاشەکەوت کرا ✅ لە «📁 زیاتر ← پرۆژەکانم» دەیدۆزیتەوە.", "Saved ✅ Find it in «📁 More → My projects».", "هاتە پاشەکەفتکرن ✅ ل «📁 پتر ← پرۆژێن من» دبینی.", "تم الحفظ ✅ تجده في «📁 المزيد ← مشاريعي»."],
  myProjects: ["پرۆژەکانم", "My projects", "پرۆژێن من", "مشاريعي"],
  noSaves: ["هێشتا هیچ پرۆژەیەکت پاشەکەوت نەکردووە.", "No saved projects yet.", "هێشتا چو پرۆژە نەهاتینە پاشەکەفتکرن.", "لا توجد مشاريع محفوظة بعد."],
  openP: ["کردنەوە", "Open", "ڤەکرن", "فتح"],
  fullStore: ["جێگا پڕە. هەندێک پرۆژەی کۆن بسڕەوە یان وەک فایل دایبگرە.", "Storage is full. Delete old projects or download them as a file.", "جه تژی یە. هندەک پرۆژێن کەڤن ژێببە یان وەک فایل داگرە.", "المساحة ممتلئة. احذف مشاريع قديمة أو نزّلها كملف."],
  projN: ["پرۆژەی", "Project", "پرۆژەیا", "مشروع"],
  photoFail: ["نەتوانرا وێنەکە بخوێنرێتەوە.", "Couldn't read the photo.", "نەشیا وێنە بهێتە خواندن.", "تعذّرت قراءة الصورة."],
  autoSave: ["هەموو گۆڕانکارییەک خۆکارانە پاشەکەوت دەبێت.", "Every change is saved automatically.", "هەر گوهۆڕینەک ب خۆکاری پاشەکەفت دبیت.", "يُحفظ كل تغيير تلقائياً."],
  propsTab: ["🚗 3D ی ڕاستەقینە", "🚗 Real 3D", "🚗 3D یێ ڕاستەقینە", "🚗 3D حقيقي"],
  propsNote: ["ئەمانە مۆدێلی 3D ی تەواون: لە هەموو لایەکەوە دەبینرێن، بە قەبارەی ڕاستی.", "These are full 3D models: seen from every side, at real size.", "ئەڤە مۆدێلێن 3D یێن تەمامن: ژ هەمی لایان دهێنە دیتن، ب قەبارێ ڕاستی.", "هذه نماذج ثلاثية الأبعاد كاملة: تُرى من كل الجهات وبالحجم الحقيقي."],
  carColor: ["ڕەنگی ئۆتۆمبێل", "Car colour", "ڕەنگێ ترومبێلێ", "لون السيارة"],
  moveT: ["جووڵاندن", "Move", "لڤاندن", "تحريك"],
  builtQ: ["خانووەکەت ئێستا چەندی دروستکراوە؟", "How much of your house is built now?", "خانیێ تە نوکە چەند هاتیە ئاڤاکرن؟", "كم بُني من منزلك الآن؟"],
  builtHint: ["ئەگەر خانووەکەت نیوەی دروستکراوە، ڕێژەکەی هەڵبژێرە، پاشان خۆت تەواوی بکە.", "If your house is half built, pick how much — then finish it yourself.", "ئەگەر خانیێ تە نیڤەکا وی هاتیە ئاڤاکرن، ڕێژەیێ هەلبژێرە، پاشان ب خۆ تەمام بکە.", "إذا كان منزلك نصف مبني، اختر النسبة ثم أكمله بنفسك."],
  g_pool: ["🏊 مەلەوانگە", "🏊 Pool", "🏊 مەلەڤانگە", "🏊 مسبح"],
  picNote: ["ئەمە وێنەیە (2D). بۆ شتی 3D ی تەواو «🚗 3D ی ڕاستەقینە» بەکاربهێنە.", "This is a picture (2D). For full 3D use «🚗 Real 3D».", "ئەڤە وێنەیە (2D). بۆ تشتێن 3D یێن تەمام «🚗 3D یێ ڕاستەقینە» بکاربینە.", "هذه صورة (2D). للأجسام ثلاثية الأبعاد استخدم «🚗 3D حقيقي»."],
  ofPlot: ["ی زەوی", "of plot", "یێ ئەردی", "من الأرض"]
};
const MAT_WALL = ["paint", "brick", "stone", "tile", "wood", "marble", "concrete"], MAT_FLOOR = ["tile", "wood", "marble", "carpet", "stone", "concrete"];
const PALETTE = ["#ffffff", "#f4efe6", "#ebe4d6", "#e2d5bf", "#d6c3a3", "#c9a77c", "#a8865c", "#7b5b3a", "#4b3621", "#f3e1dc", "#e8c3b7", "#d39c8a", "#b5654f", "#8e3b2e",
  "#f6e7b5", "#ead27a", "#d8b23f", "#e3eadf", "#bfd3b6", "#8fae86", "#5a7d55", "#2f4a32", "#dbe8ef", "#a9c6d8", "#6d9ab8", "#2f5f86", "#1d3550",
  "#e6e0ef", "#bfb1d6", "#7f6aa6", "#f0f0f0", "#cfcfcf", "#9e9e9e", "#6b6b6b", "#3d3d3d", "#1e1e1e"];
const CATS = [["all", "all"], ["sofa", "قەنەفە|Sofas|قەنەفە|كنب", "sofa couch armchair ottoman pouf"], ["chair", "کورسی|Chairs|کورسی|كراسي", "chair stool bench"], ["table", "مێز|Tables|مێز|طاولات", "table desk"],
  ["bed", "نوستن و حەمام|Bed & bath|نڤستن و حەمام|نوم وحمام", "bed bathtub toilet sink basin"], ["storage", "دۆڵاب|Storage|دۆلاب|خزائن", "shelf cabinet drawer wardrobe dresser bookcase"],
  ["light", "گڵۆپ|Lights|گلۆپ|إضاءة", "lamp chandelier lantern light"], ["plant", "ڕووەک|Plants|ڕووەک|نباتات", "plant potted flower fern cactus"],
  ["decor", "ڕازاندنەوە|Decor|خەملاندن|ديكور", "vase frame painting mirror rug clock"], ["outdoor", "دەرەوە|Outdoor|دەرڤە|خارجي", "tree bush shrub outdoor garden fence barrel"]];
const TYPE_NAMES = { living: ["هۆڵ", "Living", "هۆل", "الصالة"], guest: ["دیوەخان", "Guest", "دیوەخان", "الضيوف"], bedroom: ["ژووری نوستن", "Bedroom", "ژوورا نڤستنێ", "غرفة نوم"], kitchen: ["چێشتخانە", "Kitchen", "مەتبەخ", "مطبخ"], dining: ["نانخواردن", "Dining", "خوارن", "طعام"],
  bath: ["حەمام / ئاودەست", "Bath", "حەمام / ئاڤدەست", "حمام"], hall: ["ڕاڕەو", "Hall", "ڕێڕەو", "ممر"], stairs: ["پەیژە", "Stairs", "پەیژە", "درج"], garage: ["گەراج", "Garage", "گەراج", "كراج"], office: ["ئۆفیس", "Office", "ئۆفیس", "مكتب"], storage: ["کۆگا", "Storage", "کۆگەه", "مخزن"], balcony: ["باڵکۆن", "Balcony", "بالکۆن", "بلكونة"], other: ["تر", "Other", "دی", "أخرى"] };

const KEY3D = "ahm3d:v1", PKEY = "ahm3d:prices";
// room builder: type → emoji and a usual size (metres)
const RB_TYPES = [["living", "🛋️", 5, 6], ["bedroom", "🛏️", 4, 4], ["guest", "🪑", 4, 5], ["kitchen", "🍳", 3.5, 4], ["bath", "🚿", 2, 2.5], ["office", "💼", 3, 3.5], ["dining", "🍽️", 3.5, 4], ["hall", "🚶", 2, 4], ["stairs", "🪜", 2.5, 4], ["storage", "📦", 2, 2], ["garage", "🚗", 3.5, 6], ["other", "⬜", 4, 4]];
const fa = (s) => String(s).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٫,]/g, ".");
const fmt = (n) => Math.round(n).toLocaleString("en-US");

function sampleHouse() {
  let m = emptyModel();
  m = addRoom(m, { name: "هۆڵ", type: "living", x: 0, z: 0, w: 6, d: 5 });
  m = addRoom(m, { name: "ژووری نوستن", type: "bedroom", x: 6, z: 0, w: 4, d: 4 });
  m = addRoom(m, { name: "چێشتخانە", type: "kitchen", x: 0, z: 5, w: 4, d: 3.5 });
  m = addRoom(m, { name: "حەمام", type: "bath", x: 6, z: 4, w: 2.2, d: 2.5 });
  m = addRoom(m, { name: "ڕاڕەو", type: "hall", x: 4, z: 5, w: 2, d: 3.5 });
  const outer = (pred) => m.walls.find(pred)?.id;
  const top = outer((w) => w.z1 === 0 && w.z2 === 0 && w.x1 === 0);
  const right = outer((w) => w.x1 === 10 && w.x2 === 10);
  const front = outer((w) => w.z1 === 8.5 && w.z2 === 8.5);
  const mid = outer((w) => w.x1 === 6 && w.x2 === 6);
  return applyOps(m, [
    top && { op: "addOpening", wall: top, kind: "window", at: 3, w: 2.2, h: 1.4, sill: 0.9 },
    right && { op: "addOpening", wall: right, kind: "window", at: 2, w: 1.4, h: 1.2, sill: 1 },
    front && { op: "addOpening", wall: front, kind: "door", at: 5, w: 1.1, h: 2.2 },
    front && { op: "addOpening", wall: front, kind: "window", at: 2, w: 1.4, h: 1.2, sill: 1 },
    mid && { op: "addOpening", wall: mid, kind: "door", at: 2.5, w: 0.9, h: 2.1 },
  ].filter(Boolean));
}

async function shrinkImage(file, max = 1400) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}

function download(href, name) { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

export default function Studio3DView({ lang, getToken, onBack, mode }) {
  const REAL = mode === "real"; // the separate "Realistic" section: its own project, starts from an empty plot
  const KEY = REAL ? "ahm3d:real" : KEY3D;
  const L = { ckb: 0, en: 1, kmr: 2, ar: 3 }[lang] ?? 0, EN = lang === "en";
  const tx = (k) => T[k]?.[L] ?? T[k]?.[0] ?? k;
  const canvasRef = useRef(null), eng = useRef(null), fileRef = useRef(null), jsonRef = useRef(null);
  const [model, setModelState] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s?.walls) return s; } catch {}
    return emptyModel();
  });
  const modelRef = useRef(model);
  const hist = useRef({ past: [], future: [] });
  const [, force] = useState(0);
  const [view, setView] = useState("3d");
  const [tool, setTool] = useState("select");
  const [sel, setSel] = useState(null);
  const [panel, setPanel] = useState(null);
  const [draft, setDraft] = useState(null); // { start } wall chain · { c1 } room corner · { m1 } measure
  const [lenIn, setLenIn] = useState("");
  const [sizeIn, setSizeIn] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [aiText, setAiText] = useState("");
  const [planFloors, setPlanFloors] = useState(null);
  const [hour, setHour] = useState(15);
  const [prices, setPrices] = useState(() => { try { return { ...DEFAULT_PRICES, ...JSON.parse(localStorage.getItem(PKEY) || "{}") }; } catch { return DEFAULT_PRICES; } });
  const down = useRef(null);
  const [paintC, setPaintC] = useState("#e2d5bf");
  const [paintM, setPaintM] = useState("paint");
  const [floorM, setFloorM] = useState("wood");
  const [both, setBoth] = useState(false);
  const [lib, setLib] = useState(null);
  const [cat, setCat] = useState("all");
  const [libQ, setLibQ] = useState("");
  const [found, setFound] = useState(null);
  const [roof, setRoof] = useState(false);
  const [ceil, setCeil] = useState(false);
  const [rendered, setRendered] = useState(null);
  const drag = useRef(null);
  const realPlan = useRef(false);
  const [setup, setSetup] = useState(() => REAL && !model.plot);
  const [plotW, setPlotW] = useState("10");
  const [plotD, setPlotD] = useState("20");
  const [buildMat, setBuildMat] = useState("block");
  const [libTab, setLibTab] = useState(REAL ? "props" : "3d");
  const [gFound, setGFound] = useState(null);
  const [layMat, setLayMat] = useState("block");
  const [gardenK, setGardenK] = useState("grass");
  const [carCol, setCarCol] = useState(CAR_COLORS[0]);
  const [rb, setRb] = useState({ type: "bedroom", w: "4", d: "4", door: true, win: true, auto: true });
  const [ghost, setGhost] = useState(null); // { x, z, w, d, ok } the room about to be built

  const toastT = useRef(0);
  const say = (s) => { setToast(s); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), 4200); };
  function commit(next, keepFuture) {
    hist.current.past.push(modelRef.current);
    if (hist.current.past.length > 80) hist.current.past.shift();
    if (!keepFuture) hist.current.future = [];
    modelRef.current = next; setModelState(next);
  }
  const edit = (ops) => commit(applyOps(modelRef.current, ops));
  function undo() { const p = hist.current.past.pop(); if (!p) return; hist.current.future.push(modelRef.current); modelRef.current = p; setModelState(p); force((x) => x + 1); }
  function redo() { const f = hist.current.future.pop(); if (!f) return; hist.current.past.push(modelRef.current); modelRef.current = f; setModelState(f); force((x) => x + 1); }

  // the 3D view
  useEffect(() => {
    const e = new Studio3D(canvasRef.current, { real: REAL });
    eng.current = e;
    e.resolvePic = async (url) => {
      if (url.startsWith("data:")) {
        const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
        return { url, ar: im.width / im.height };
      }
      const r = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ action: "grab", url }) });
      if (!r.ok) throw new Error("pic");
      const blobUrl = URL.createObjectURL(await r.blob());
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = blobUrl; });
      const { cutout } = await import("../lib/room3d");
      const c = cutout(im); URL.revokeObjectURL(blobUrl);
      return { url: c.url, ar: im.width / im.height };
    };
    e.onBuilt = () => { say(tx("built")); setTool("door"); };
    e.onRoomBuilt = () => say(tx("roomDone"));
    e.resolve = async (ph) => {
      const r = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ action: "model", id: ph }) });
      if (!r.ok) throw new Error("model");
      return r.json();
    };
    e.setModel(modelRef.current); e.fit();
    const ro = new ResizeObserver(() => e.resize());
    ro.observe(canvasRef.current);
    return () => { ro.disconnect(); e.dispose(); };
  }, []);
  useEffect(() => {
    eng.current?.setModel(model);
    try { localStorage.setItem(KEY, JSON.stringify(model)); } catch {}
  }, [model]);
  useEffect(() => { eng.current?.setSelected(sel); }, [sel]);
  useEffect(() => { eng.current?.setView(view); }, [view]);
  useEffect(() => { eng.current?.placeSun(hour); }, [hour]);
  useEffect(() => { const e = eng.current; if (!e) return; e.roof = roof; e.ceiling = ceil; e.build(); }, [roof, ceil]);
  useEffect(() => { if (["paint", "lay", "pour", "garden", "room"].includes(tool)) setPanel(tool === "paint" ? "paint" : tool); if (tool !== "room") setGhost(null); }, [tool]);
  // the room builder's preview box follows size changes
  const rbW = Math.min(30, Math.max(1, parseFloat(fa(rb.w)) || 0)), rbD = Math.min(30, Math.max(1, parseFloat(fa(rb.d)) || 0));
  useEffect(() => { setGhost((g) => (g ? place(g.x + g.w / 2, g.z + g.d / 2, false) : g)); }, [rbW, rbD]);
  useEffect(() => { eng.current?.setGhost(ghost ? { ...ghost, h: modelRef.current.wallH || 3, name: TYPE_NAMES[rb.type]?.[L] || "" } : null); }, [ghost, rb.type, view]);
  // the 3D furniture library (loaded once when the furniture panel opens)
  useEffect(() => {
    if (panel !== "items" || lib) return;
    (async () => {
      try {
        const r = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ action: "models" }) });
        const j = await r.json(); if (!r.ok) throw new Error();
        setLib(j.models || []);
      } catch { setLib("off"); }
    })();
  }, [panel, lib]);
  useEffect(() => { try { localStorage.setItem(PKEY, JSON.stringify(prices)); } catch {} }, [prices]);
  useEffect(() => { setDraft(null); eng.current?.setPreview([]); }, [tool]);
  // keyboard (computer): Esc stops drawing, Delete removes the selection, Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const k = (ev) => {
      if (/INPUT|TEXTAREA|SELECT/.test(ev.target?.tagName)) return;
      if (ev.key === "Escape") { setDraft(null); eng.current?.setPreview([]); }
      else if ((ev.key === "Delete" || ev.key === "Backspace") && sel) { edit([{ op: "delete", id: sel }]); setSel(null); }
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") { ev.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // ---------- drawing with the finger ----------
  function preview(start, p) {
    const items = [];
    if (start) items.push({ kind: "dot", x: start.x, z: start.z });
    if (start && p) {
      if (tool === "room" || tool === "garden") {
        const x0 = Math.min(start.x, p.x), x1 = Math.max(start.x, p.x), z0 = Math.min(start.z, p.z), z1 = Math.max(start.z, p.z);
        const lab = `${(x1 - x0).toFixed(2)}×${(z1 - z0).toFixed(2)}`;
        items.push({ kind: "line", x1: x0, z1: z0, x2: x1, z2: z0, label: lab }, { kind: "line", x1: x1, z1: z0, x2: x1, z2: z1 }, { kind: "line", x1: x0, z1: z1, x2: x1, z2: z1 }, { kind: "line", x1: x0, z1: z0, x2: x0, z2: z1 });
      } else items.push({ kind: "line", x1: start.x, z1: start.z, x2: p.x, z2: p.z, label: Math.hypot(p.x - start.x, p.z - start.z).toFixed(2) + " م" });
    }
    eng.current?.setPreview(items);
  }
  function addWallTo(p) {
    const s = draft?.start;
    if (!s) return;
    if (Math.hypot(p.x - s.x, p.z - s.z) < 0.05) { setDraft(null); eng.current.setPreview([]); return; }
    const m = modelRef.current;
    commit(unbuilt({ ...m, walls: [...m.walls, { id: uid("w"), x1: s.x, z1: s.z, x2: p.x, z2: p.z, t: 0.2, h: m.wallH || 3, color: WALL_COLORS[0] }] }));
    const closed = draft.first && Math.hypot(p.x - draft.first.x, p.z - draft.first.z) < 0.05;
    if (closed) { setDraft(null); eng.current.setPreview([]); return; }
    setDraft({ start: p, first: draft.first || s }); preview(p);
  }
  const RAWC = { block: "#b9b6ae", brick: "#b5654f", stone: "#c8b89a" };
  const unbuilt = (mm) => (REAL ? { ...mm, walls: mm.walls.map((w) => (w.built === undefined && !w.fence ? { ...w, built: 0, matA: layMat, matB: layMat, colorA: RAWC[layMat], colorB: RAWC[layMat] } : w)) } : mm);
  // put the preview box with its centre at (cx, cz), pulled onto nearby rooms so walls line up
  function place(cx, cz, snap = true) {
    const mm = modelRef.current;
    let r = { x: Math.round((cx - rbW / 2) * 20) / 20, z: Math.round((cz - rbD / 2) * 20) / 20, w: rbW, d: rbD };
    if (snap) r = snapRoom(mm, r);
    return { ...r, ok: roomFits(mm, r) };
  }
  function autoSpot() {
    const r = findSpot(modelRef.current, rbW, rbD);
    if (!r) { setGhost(null); say(tx("rbNoSpot")); return; }
    setGhost({ ...r, ok: true });
  }
  function nudge(dx, dz) { setGhost((g) => { if (!g) return g; const r = { x: Math.round((g.x + dx) * 100) / 100, z: Math.round((g.z + dz) * 100) / 100, w: g.w, d: g.d }; return { ...r, ok: roomFits(modelRef.current, r) }; }); }
  function buildHere() {
    const g = ghost; if (!g?.ok) return;
    const n = modelRef.current.rooms.filter((r) => r.type === rb.type).length + 1;
    const nm = (TYPE_NAMES[rb.type]?.[L] || TYPE_NAMES[rb.type]?.[0] || "") + (n > 1 ? " " + n : "");
    let { model: next, fresh } = buildRoom(modelRef.current, { name: nm, type: rb.type, x: g.x, z: g.z, w: g.w, d: g.d, door: rb.door, windows: rb.win });
    if (REAL) {
      next = unbuilt(next);
      if (rb.auto) next = { ...next, walls: next.walls.map((w) => (fresh.includes(w.id) ? { ...w, built: w.h } : w)) };
    }
    commit(next); setGhost(null);
    if (!REAL || rb.auto) setTimeout(() => eng.current?.animateBuild(REAL ? 4200 : 2600, fresh), 40);
    else say(tx("roomDone"));
  }
  function placeRoom(x, z, w, d) {
    const n = modelRef.current.rooms.length + 1;
    commit(unbuilt(addRoom(modelRef.current, { name: [ "ژووری ", "Room ", "ژوورا ", "غرفة " ][L] + n, type: "other", x, z, w, d })));
  }
  function tap(cx, cy) {
    const e = eng.current; if (!e) return;
    if (tool === "lay") {
      const hit = e.pick(cx, cy);
      if (hit?.type === "wall") edit([{ op: "lay", id: hit.id, n: 1, mat: layMat }]);
      else say(tx("h_lay"));
      return;
    }
    if (tool === "pour") {
      const hit = e.pick(cx, cy);
      const rm = hit?.type === "room" && modelRef.current.rooms.find((r) => r.id === hit.id);
      if (!rm) { say(tx("h_pour")); return; }
      const around = modelRef.current.walls.filter((w) => !w.fence && Math.min(w.x1, w.x2) <= rm.x + rm.w + 0.05 && Math.max(w.x1, w.x2) >= rm.x - 0.05 && Math.min(w.z1, w.z2) <= rm.z + rm.d + 0.05 && Math.max(w.z1, w.z2) >= rm.z - 0.05);
      if (around.some((w) => (w.built ?? w.h) < w.h - 0.01)) { say(tx("wallsFirst")); return; }
      edit([{ op: "pour", id: rm.id }]); say(tx("pouring"));
      setTimeout(() => eng.current?.pour(rm.id), 30);
      return;
    }
    if (tool === "garden") {
      const raw = e.toFloor(cx, cy); if (!raw) return;
      const p = e.snap(raw);
      if (!draft?.c1) { setDraft({ c1: p }); preview(p); return; }
      const a = draft.c1; setDraft(null); e.setPreview([]);
      const w = Math.abs(p.x - a.x), d = Math.abs(p.z - a.z);
      if (w >= 0.3 && d >= 0.3) edit([{ op: "patch", kind: gardenK, x: Math.min(a.x, p.x), z: Math.min(a.z, p.z), w, d }]);
      return;
    }
    if (tool === "paint") {
      const hit = e.pick(cx, cy);
      if (hit?.type === "wall") edit([{ op: "paintWall", id: hit.id, side: both || !hit.side ? "both" : hit.side, color: paintC, mat: paintM }]);
      else if (hit?.type === "room") edit([{ op: "setRoom", id: hit.id, floor: paintC, fmat: floorM }]);
      else say(tx("h_paint"));
      return;
    }
    if (tool === "select" || tool === "erase" || tool === "door" || tool === "window") {
      const hit = e.pick(cx, cy);
      if (tool === "select") { setSel(hit?.id || null); if (hit) setPanel("props"); return; }
      if (tool === "erase") { if (hit) { edit([{ op: "delete", id: hit.id }]); if (sel === hit.id) setSel(null); } return; }
      if (hit?.type === "wall") {
        const kind = tool;
        edit([{ op: "addOpening", wall: hit.id, kind, at: hit.at, w: kind === "door" ? 0.9 : 1.2, h: kind === "door" ? 2.1 : 1.2, sill: kind === "door" ? 0 : 1 }]);
      } else say(tx("h_" + tool));
      return;
    }
    const raw = e.toFloor(cx, cy); if (!raw) return;
    if (tool === "wall") {
      const p = e.snap(raw, draft?.start);
      if (!draft?.start) { setDraft({ start: p, first: p }); preview(p); } else addWallTo(p);
    } else if (tool === "room") {
      setGhost(place(raw.x, raw.z)); if (panel !== "room") setPanel("room");
    } else if (tool === "measure") {
      const p = e.snap(raw, draft?.m1);
      if (!draft?.m1) { setDraft({ m1: p }); preview(p); return; }
      const dist = Math.hypot(p.x - draft.m1.x, p.z - draft.m1.z);
      e.setPreview([{ kind: "line", x1: draft.m1.x, z1: draft.m1.z, x2: p.x, z2: p.z, label: dist.toFixed(2) + " م" }]);
      say(`${tx("measured")}: ${dist.toFixed(2)} م`); setDraft(null);
    }
  }
  const onDown = (ev) => {
    down.current = { x: ev.clientX, y: ev.clientY, n: (down.current?.n || 0) + 1, lx: ev.clientX, ly: ev.clientY };
    // a piece of furniture that is already selected: drag it along the floor
    const it = (modelRef.current.items || []).find((i) => i.id === sel);
    if (tool === "select" && it && view !== "walk") {
      const hit = eng.current.pick(ev.clientX, ev.clientY);
      const p = eng.current.toFloor(ev.clientX, ev.clientY);
      if (hit?.id === sel && p) {
        drag.current = { id: sel, dx: it.x - p.x, dz: it.z - p.z, x: it.x, z: it.z };
        eng.current.controls.enabled = false; eng.current.plan.enabled = false;
        canvasRef.current.setPointerCapture?.(ev.pointerId);
      }
    }
  };
  const endDrag = () => {
    const d = drag.current; if (!d) return false;
    drag.current = null;
    eng.current.controls.enabled = view === "3d"; eng.current.plan.enabled = view === "plan";
    edit([{ op: "setItem", id: d.id, x: Math.round(d.x * 100) / 100, z: Math.round(d.z * 100) / 100 }]);
    return true;
  };
  const onMove = (ev) => {
    if (drag.current) {
      const p = eng.current.toFloor(ev.clientX, ev.clientY); if (!p) return;
      drag.current.x = p.x + drag.current.dx; drag.current.z = p.z + drag.current.dz;
      eng.current.moveItem(drag.current.id, drag.current.x, drag.current.z);
      return;
    }
    if (view === "walk" && down.current && ev.buttons) { eng.current.look(ev.clientX - down.current.lx, ev.clientY - down.current.ly); down.current.lx = ev.clientX; down.current.ly = ev.clientY; return; }
    if (ev.pointerType === "mouse" && !ev.buttons && tool === "room" && (!ghost || ghost.hover)) {
      const raw = eng.current.toFloor(ev.clientX, ev.clientY); if (raw) setGhost({ ...place(raw.x, raw.z), hover: true });
      return;
    }
    if (ev.pointerType === "mouse" && !ev.buttons && (draft?.start || draft?.c1 || draft?.m1)) {
      const raw = eng.current.toFloor(ev.clientX, ev.clientY); if (!raw) return;
      const s = draft.start || draft.c1 || draft.m1;
      preview(s, eng.current.snap(raw, tool === "room" || tool === "garden" ? null : s));
    }
  };
  const onUp = (ev) => {
    const moved = drag.current && Math.hypot(ev.clientX - (down.current?.x || 0), ev.clientY - (down.current?.y || 0)) >= 8;
    if (drag.current) { const dd = drag.current; if (moved) { endDrag(); down.current = null; return; } drag.current = null; eng.current.controls.enabled = view === "3d"; eng.current.plan.enabled = view === "plan"; void dd; }
    const d = down.current; down.current = null;
    if (!d || view === "walk") return;
    if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 8 && d.n === 1) tap(ev.clientX, ev.clientY);
  };
  function wallByLength(dx, dz) {
    const v = parseFloat(fa(lenIn)); const s = draft?.start;
    if (!s || !(v > 0)) return;
    addWallTo({ x: Math.round((s.x + dx * v) * 100) / 100, z: Math.round((s.z + dz * v) * 100) / 100 });
    setLenIn("");
  }

  // ---------- AI, plan, files ----------
  async function askAI(text) {
    const q = (text ?? aiText).trim(); if (!q || busy) return;
    setBusy("ai");
    try {
      const r = await fetch("/api/studio3d", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
        body: JSON.stringify({ action: "command", text: q, lang, model: modelRef.current, selected: sel || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "ai");
      if (j.ops?.length) { edit(j.ops); setTimeout(() => eng.current?.fit(), 50); }
      say(j.say || "✅"); setAiText("");
    } catch { say(tx("aiFail")); }
    setBusy("");
  }
  async function readPlan(file) {
    if (!file) return;
    setBusy("plan"); say(tx("reading"));
    try {
      const image = await shrinkImage(file);
      const r = await fetch("/api/house", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ action: "analyze", image, lang }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.plan) throw new Error(j.error || "plan");
      const floors = [...new Set((j.plan.rooms || []).map((x) => x.floor || 1))].sort();
      let m = planToModel(j.plan, floors[0] || 1);
      if (!m) throw new Error("plan");
      if (realPlan.current) { // put the house on the plot: 2 m side yards, 2 m behind, 6 m front yard (or the size typed)
        realPlan.current = false;
        const xs = m.walls.flatMap((w) => [w.x1, w.x2]), zs = m.walls.flatMap((w) => [w.z1, w.z2]);
        const W = Math.max(...xs) - Math.min(...xs), D = Math.max(...zs) - Math.min(...zs);
        const pw = Math.max(parseFloat(fa(plotW)) || 0, Math.ceil(W + 4)), pd = Math.max(parseFloat(fa(plotD)) || 0, Math.ceil(D + 8));
        const ox = (pw - W) / 2 - Math.min(...xs), oz = 2 - Math.min(...zs);
        const mv = (v) => Math.round(v * 100) / 100;
        m = { ...m, plot: { w: pw, d: pd, ground: "soil" },
          walls: m.walls.map((w) => ({ ...w, x1: mv(w.x1 + ox), x2: mv(w.x2 + ox), z1: mv(w.z1 + oz), z2: mv(w.z2 + oz) })),
          rooms: m.rooms.map((r) => ({ ...r, x: mv(r.x + ox), z: mv(r.z + oz) })) };
        m = unbuilt(m); setSetup(false); setPlotW(String(pw)); setPlotD(String(pd)); setTool("lay"); setView("3d");
        setTimeout(() => say(tx("builtHint")), 1500);
      }
      commit(m); setSel(null); setTimeout(() => eng.current?.fit(), 50);
      setPlanFloors(floors.length > 1 ? { plan: j.plan, floors, cur: floors[0] } : null);
      say(tx("planDone")); setPanel(null);
    } catch { say(tx("planFail")); }
    setBusy("");
  }

  const BUILD_COL = { block: "#b9b6ae", brick: "#b5654f", stone: "#c8b89a", concrete: "#a9a59c" };
  function startPlot() {
    const w = parseFloat(fa(plotW)), d = parseFloat(fa(plotD));
    if (!(w >= 5 && d >= 5)) return;
    commit(applyOps(emptyModel(), [{ op: "setPlot", w, d }]));
    setSetup(false); setSel(null); setView("3d"); setTool("room"); setPanel(null);
    setTimeout(() => eng.current?.fit(), 60); say(tx("h_s1"));
  }
  function buildWalls() {
    if (!modelRef.current.rooms.length) { say(tx("needRooms")); return; }
    const col = BUILD_COL[buildMat] || "#b9b6ae";
    const ids = modelRef.current.walls.filter((w) => !w.fence).map((w) => w.id);
    edit(ids.map((id) => ({ op: "paintWall", id, side: "both", color: col, mat: buildMat })));
    setPanel(null); setView("3d"); setRoof(false);
    setTimeout(() => { eng.current?.fit(); eng.current?.animateBuild(); say(tx("building")); }, 120);
  }
  function makeFence() {
    edit([{ op: "fence", mat: "stone", color: "#c8b89a", h: 2 }]);
    setView("3d"); setTimeout(() => eng.current?.fit(), 60); say(tx("fenceDone"));
  }
  async function searchGoogle(e, over) {
    e?.preventDefault(); const q = (over ?? libQ).trim(); if (!q || busy) return;
    setBusy("search");
    try {
      const r = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ action: "search", q, google: true }) });
      const j = await r.json();
      setGFound([...(j.google || []), ...(j.results || [])].slice(0, 60));
      if (!(j.google || []).length) say(tx(j.googleWhy === "quota" ? "gwhy_quota" : j.googleWhy === "key" ? "gwhy_key" : j.googleWhy === "no_key" ? "gwhy_no_key" : "gwhy_other"));
      if (j.models?.length) setFound(j.models);
    } catch { setGFound([]); }
    setBusy("");
  }
  const photoRef = useRef(null);
  async function addOwnPhoto(file) {
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const { cutout } = await import("../lib/room3d");
      const c = cutout(im, 512); URL.revokeObjectURL(url);
      const p = where();
      const next = applyOps(modelRef.current, [{ op: "addPic", pic: c.url, name: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "📷", x: p.x, z: p.z, h: 1 }]);
      commit(next); setSel(next.items[next.items.length - 1].id); setTool("select"); setPanel("props"); say(tx("added"));
    } catch { say(tx("photoFail")); }
  }
  const SKEY = KEY + ":saves";
  const [saves, setSaves] = useState(() => { try { return JSON.parse(localStorage.getItem(SKEY) || "[]"); } catch { return []; } });
  function saveProject() {
    const d = new Date(), name = `${tx("projN")} ${saves.length + 1} · ${d.toLocaleDateString("en-GB")} ${d.toTimeString().slice(0, 5)}`;
    const list = [{ id: uid("s"), name, at: Date.now(), model: modelRef.current }, ...saves].slice(0, 20);
    try { localStorage.setItem(SKEY, JSON.stringify(list)); setSaves(list); say(tx("savedP")); }
    catch { say(tx("fullStore")); }
  }
  function delSave(id) { const list = saves.filter((x) => x.id !== id); try { localStorage.setItem(SKEY, JSON.stringify(list)); } catch {} setSaves(list); }
  function restart() {
    if (!confirm(tx("confirmNew"))) return;
    commit(emptyModel()); setSel(null); setPlanFloors(null); setPanel(null); setTool("select");
    if (REAL) setSetup(true);
  }

  function addProp(kind) {
    const p = where();
    const next = applyOps(modelRef.current, [{ op: "addProp", prop: kind, name: PROPS[kind].n[L] || PROPS[kind].n[0], color: kind.startsWith("car_") ? carCol : undefined, x: p.x, z: p.z }]);
    commit(next); setSel(next.items[next.items.length - 1].id); setTool("select"); setPanel("props"); say(tx("added"));
  }
  function addPic(pic) {
    const p = where();
    const big = /car|ئۆتۆمبێل|ترومبێل|سيارة/i.test(libQ) ? 1.5 : /tree|دار|شجرة/i.test(libQ) ? 3 : /sofa|bed|table|wardrobe|cabinet|قەنەفە|جێگا|دۆڵاب|كنبة|سرير/i.test(libQ) ? 1.1 : /lamp|plant|vase|گڵۆپ|گوڵ/i.test(libQ) ? 0.9 : 1; // real height in metres
    const next = applyOps(modelRef.current, [{ op: "addPic", pic: pic.thumb, name: pic.title || libQ, x: p.x, z: p.z, h: big }]);
    commit(next); setSel(next.items[next.items.length - 1].id); setTool("select"); setPanel("props"); say(tx("added"));
  }

  function where() { // centre of the selected room, or the middle of the view
    const r = modelRef.current.rooms.find((x) => x.id === sel);
    if (r) return { x: r.x + r.w / 2, z: r.z + r.d / 2 };
    const t = view === "plan" ? eng.current.plan.target : eng.current.controls.target;
    return { x: Math.round(t.x * 100) / 100, z: Math.round(t.z * 100) / 100 };
  }
  function addItem(md) {
    const p = where(), id = uid("i");
    const next = applyOps(modelRef.current, [{ op: "addItem", ph: md.id, name: md.name, x: p.x, z: p.z }]);
    const last = next.items[next.items.length - 1];
    if (last) last.id = id;
    commit(next); setSel(id); setTool("select"); setPanel("props"); say(tx("added"));
  }
  async function searchLib(e) {
    e?.preventDefault(); const q = libQ.trim(); if (!q || busy) return;
    setBusy("search");
    try {
      const r = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ action: "search", q }) });
      const j = await r.json(); setFound(j.models || []);
    } catch { setFound([]); }
    setBusy("");
  }
  async function aiRender() {
    if (busy) return;
    setBusy("render"); setRendered(null);
    try {
      const shot = (long, q) => new Promise((ok) => {
        const im = new Image();
        im.onload = () => { const k = long / Math.max(im.width, im.height), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", q).split(",")[1]); };
        im.src = eng.current.snapshot(1600);
      });
      const [ref, original] = await Promise.all([shot(496, 0.85), shot(1280, 0.88)]);
      const r = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
        body: JSON.stringify({ action: "make", tool: "redesign", style: "modern", keep: true, ref, original,
          ask: "Turn this simple 3D model view into a photorealistic architectural photograph. Keep EXACTLY the same geometry, camera angle, walls, openings, wall colours and materials, floor materials and every piece of furniture in the same place. Add realistic textures, soft natural light, believable shadows" + (view === "walk" ? ", interior details like skirting, light fixtures and curtains" : ", a real sky, landscaping, paving and surroundings") + "." }) });
      if (!r.ok) throw new Error();
      setRendered(URL.createObjectURL(await r.blob()));
    } catch { say(tx("renderFail")); }
    setBusy("");
  }

  const m = model;
  const selItem = (m.items || []).find((i) => i.id === sel);
  const selWall = m.walls.find((w) => w.id === sel), selOpen = m.openings.find((o) => o.id === sel), selRoom = m.rooms.find((r) => r.id === sel);
  const q = boq(m, prices);
  const isEmpty = !m.walls.length && !m.rooms.length;
  const TOOLS = REAL
    ? [["select", "👆"], ["room", "⬜"], ["wall", "📐"], ["lay", "🧱"], ["door", "🚪"], ["window", "🪟"], ["pour", "🏗️"], ["paint", "🎨"], ["garden", "🌱"], ["measure", "📏"], ["erase", "🗑️"]]
    : [["select", "👆"], ["wall", "🧱"], ["room", "⬜"], ["door", "🚪"], ["window", "🪟"], ["paint", "🎨"], ["measure", "📏"], ["erase", "🗑️"]];
  const catLabel = (c) => (c[0] === "all" ? tx("all") : (c[1].split("|")[L] || c[1].split("|")[0]));
  const libShown = Array.isArray(lib) ? (cat === "all" ? lib : lib.filter((md) => {
    const w = (md.id.replace(/_/g, " ") + " " + md.name + " " + (md.tags || []).join(" ") + " " + (md.cats || []).join(" ")).toLowerCase();
    return CATS.find((c) => c[0] === cat)[2].split(" ").some((k) => new RegExp("(^|[^a-z])" + k + "(s|es)?([^a-z]|$)").test(w));
  })).slice(0, 90) : [];
  const num = (v, on, step = 0.05) => (
    <input type="number" inputMode="decimal" step={step} defaultValue={v} key={sel + ":" + v}
      onBlur={(e) => { const x = parseFloat(fa(e.target.value)); if (isFinite(x) && x !== v) on(x); }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
  );

  return (
    <div className="s3d" dir={EN ? "ltr" : "rtl"}>
      <header className="s3d-top">
        <button className="s3d-btn" onClick={onBack} aria-label={tx("back")}>{EN ? "←" : "→"}</button>
        <div className="s3d-title"><b>{REAL ? tx("real") : tx("title")}</b><small>{tx("beta")}</small></div>
        <div className="s3d-seg" role="tablist">
          {[["plan", "vplan"], ["3d", "v3d"], ["walk", "vwalk"]].map(([v, k]) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{tx(k)}</button>
          ))}
        </div>
      </header>

      <div className="s3d-stage">
        <canvas ref={canvasRef} className="s3d-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerCancel={() => (down.current = null)} onContextMenu={(e) => e.preventDefault()} />
        {view !== "walk" && <p className="s3d-hint">{tx("h_" + tool)}</p>}
        {view === "walk" && (
          <div className="s3d-walk">
            <p className="s3d-hint static">{tx("h_walk")}</p>
            {[["▲", 1, 0], ["▼", -1, 0], ["⟲", 0, 1], ["⟳", 0, -1]].map(([s, mv, tn]) => (
              <button key={s} className="s3d-btn big" onPointerDown={() => { eng.current.walk.move = mv; eng.current.walk.turn = tn; }}
                onPointerUp={() => { eng.current.walk.move = 0; eng.current.walk.turn = 0; }} onPointerLeave={() => { eng.current.walk.move = 0; eng.current.walk.turn = 0; }}>{s}</button>
            ))}
          </div>
        )}
        {tool === "wall" && draft?.start && view !== "walk" && (
          <div className="s3d-vcb">
            <input inputMode="decimal" placeholder={tx("len")} value={lenIn} onChange={(e) => setLenIn(e.target.value)} />
            {[["→", 1, 0], ["←", -1, 0], ["↑", 0, -1], ["↓", 0, 1]].map(([s, dx, dz]) => <button key={s} className="s3d-btn" onClick={() => wallByLength(dx, dz)}>{s}</button>)}
            <button className="s3d-btn gold" onClick={() => { setDraft(null); eng.current.setPreview([]); }}>{tx("done")}</button>
          </div>
        )}
        {planFloors && (
          <div className="s3d-floors">
            {planFloors.floors.map((f) => <button key={f} className={"s3d-btn" + (planFloors.cur === f ? " gold" : "")} onClick={() => { const mm = planToModel(planFloors.plan, f); if (mm) { commit(mm); setPlanFloors({ ...planFloors, cur: f }); setTimeout(() => eng.current?.fit(), 50); } }}>{tx("floorN")} {f}</button>)}
          </div>
        )}
        {setup && (
          <div className="s3d-empty s3d-setup">
            <b>{tx("plotT")}</b>
            <div className="s3d-chips center">{[[10, 20], [10, 25], [12, 25], [16, 25], [20, 30]].map(([w, d]) => (
              <button key={w + "x" + d} className={plotW == w && plotD == d ? "on" : ""} onClick={() => { setPlotW(String(w)); setPlotD(String(d)); }}>{w * d} م² · {w}×{d}</button>))}</div>
            <div className="s3d-row">
              <label className="s3d-in">{tx("plotW")}<input inputMode="decimal" value={plotW} onChange={(e) => setPlotW(e.target.value)} /></label>
              <label className="s3d-in">{tx("plotD")}<input inputMode="decimal" value={plotD} onChange={(e) => setPlotD(e.target.value)} /></label>
            </div>
            <p><b>{Math.round((parseFloat(fa(plotW)) || 0) * (parseFloat(fa(plotD)) || 0))} م²</b> · {tx("streetNote")}</p>
            <div className="s3d-row">
              <button className="s3d-btn gold" onClick={startPlot}>{tx("start")}</button>
              <button className="s3d-btn" onClick={() => setSetup(false)}>{tx("close")}</button>
            </div>
            {REAL && (<>
              <p className="s3d-sub">— {tx("orT")} —</p>
              <button className="s3d-btn s3d-wide" disabled={!!busy} onClick={() => { realPlan.current = true; fileRef.current?.click(); }}>{tx("planUp")}<small>{tx("planUpSub")}</small></button>
            </>)}
          </div>
        )}
        {m.plot && !setup && view !== "walk" && REAL && (
          <div className="s3d-steps">
            <button className="act" onClick={saveProject}>{tx("saveP")}</button>
            <button className="act" onClick={restart}>{tx("restart")}</button>
            {[["s1", m.rooms.length > 0, () => { setTool("room"); setView("plan"); setPanel(null); say(tx("h_s1")); }],
              ["r2", m.walls.some((w) => !w.fence) && m.walls.filter((w) => !w.fence).every((w) => (w.built ?? w.h) >= w.h - 0.01), () => { setTool("lay"); setView("3d"); }],
              ["s3", m.openings.some((o) => m.walls.find((w) => w.id === o.wall && !w.fence)), () => { setTool("door"); setView("3d"); }],
              ["r4", m.rooms.length > 0 && m.rooms.every((r) => r.slab), () => { setTool("pour"); setView("3d"); }],
              ["r5", m.walls.some((w) => !w.fence && (w.matA === "paint" || w.matB === "paint")), () => { setTool("paint"); setPaintM("paint"); setView("3d"); }],
              ["s6", (m.items || []).some((i) => i.ph), () => { setLibTab("3d"); setPanel("items"); }],
              ["r7", (m.patches || []).length > 0, () => { setTool("garden"); setView("3d"); }],
              ["s5", m.walls.some((w) => w.fence), makeFence],
              ["r9", (m.items || []).some((i) => i.prop?.startsWith("car_") || i.pic), () => { setLibTab("props"); setPanel("items"); }],
              ["s7", false, () => setView("walk")]].map(([k, ok, go], i) => (
              <button key={k} className={ok ? "ok" : ""} onClick={go}><em>{ok ? "✓" : i + 1}</em>{tx(k)}</button>
            ))}
          </div>
        )}
        {m.plot && !setup && view !== "walk" && !REAL && (
          <div className="s3d-steps">
            {[["s1", m.rooms.length > 0, () => { setTool("room"); setView("plan"); setPanel(null); say(tx("h_s1")); }],
              ["s2", m.walls.some((w) => !w.fence && w.matA), () => setPanel("build")],
              ["s3", m.openings.some((o) => m.walls.find((w) => w.id === o.wall && !w.fence)), () => { setTool("door"); setView("3d"); }],
              ["s4", m.walls.some((w) => !w.fence && w.matA && w.matA !== buildMat && w.matA !== "block"), () => setTool("paint")],
              ["s5", m.walls.some((w) => w.fence), makeFence],
              ["s6", (m.items || []).length > 0, () => setPanel("items")],
              ["s7", false, () => setView("walk")]].map(([k, ok, go], i) => (
              <button key={k} className={ok ? "ok" : ""} onClick={go}><em>{ok ? "✓" : i + 1}</em>{tx(k)}</button>
            ))}
          </div>
        )}
        {isEmpty && !busy && !setup && !m.plot && (
          <div className="s3d-empty">
            <b>{tx("empty1")}</b><p>{tx("empty2")}</p>
            <button className="s3d-btn gold s3d-wide s3d-real" onClick={() => setSetup(true)}>{tx("real")}<small>{tx("realSub")}</small></button>
            <div className="s3d-row">
              <button className="s3d-btn gold" onClick={() => { commit(sampleHouse()); setTimeout(() => eng.current?.fit(), 50); }}>{tx("sample")}</button>
              <button className="s3d-btn" onClick={() => fileRef.current?.click()}>{tx("fromPlan")}</button>
              <button className="s3d-btn" onClick={() => setPanel("ai")}>{tx("askAi")}</button>
            </div>
          </div>
        )}
        {busy && busy !== "search" && <div className="s3d-busy"><span className="mini-spin" /> {tx(busy === "ai" ? "thinking" : busy === "render" ? "rendering" : "reading")}</div>}
        {rendered && (
          <div className="s3d-render">
            <img src={rendered} alt="" />
            <div className="s3d-row">
              <button className="s3d-btn gold" onClick={() => download(rendered, "ahm-3d-ai.jpg")}>{tx("dl")}</button>
              <button className="s3d-btn" onClick={aiRender}>🔄</button>
              <button className="s3d-btn" onClick={() => { URL.revokeObjectURL(rendered); setRendered(null); }}>{tx("close")}</button>
            </div>
          </div>
        )}
        {toast && <div className="s3d-toast" role="status">{toast}</div>}
      </div>

      {panel && (
        <section className="s3d-panel">
          <button className="s3d-x" onClick={() => setPanel(null)} aria-label="close">✕</button>
          {panel === "props" && (
            selItem ? (
              <div className="s3d-form">
                <h4>{selItem.prop ? PROPS[selItem.prop]?.e : "🛋️"} {selItem.name}</h4>
                {selItem.pic && <p className="s3d-sub">{tx("picNote")}</p>}
                {selItem.prop?.startsWith("car_") && <div className="s3d-sw big">{CAR_COLORS.map((c) => <button key={c} style={{ background: c }} className={(selItem.color || PROPS[selItem.prop].color) === c ? "on" : ""} onClick={() => edit([{ op: "setItem", id: sel, color: c }])} aria-label={c} />)}</div>}
                <label>{tx("moveT")} <span className="s3d-row">
                  {[["→", 0.25, 0], ["←", -0.25, 0], ["↑", 0, -0.25], ["↓", 0, 0.25]].map(([a, dx, dz]) => <button key={a} className="s3d-btn" onClick={() => edit([{ op: "setItem", id: sel, x: Math.round((selItem.x + dx) * 100) / 100, z: Math.round((selItem.z + dz) * 100) / 100 }])}>{a}</button>)}</span></label>
                <label>{tx("rotate")} <span className="s3d-row">
                  {[-90, -15, 15, 90].map((d) => <button key={d} className="s3d-btn" onClick={() => edit([{ op: "setItem", id: sel, rot: ((selItem.rot || 0) + d) % 360 }])}>{d > 0 ? "⟳" : "⟲"} {Math.abs(d)}°</button>)}</span></label>
                <label>{tx("sizeL")} · {Math.round((selItem.s || 1) * 100)}% <span className="s3d-row">
                  <button className="s3d-btn" onClick={() => edit([{ op: "setItem", id: sel, s: Math.round((selItem.s || 1) * 0.9 * 100) / 100 }])}>−</button>
                  <button className="s3d-btn" onClick={() => edit([{ op: "setItem", id: sel, s: Math.round((selItem.s || 1) * 1.1 * 100) / 100 }])}>+</button></span></label>
                {selItem.pic && <label>{tx("picH")} {num(Math.round((selItem.h || 1) * (selItem.s || 1) * 100) / 100, (v) => edit([{ op: "setItem", id: sel, s: Math.round((v / (selItem.h || 1)) * 100) / 100 }]))}</label>}
                <label>{tx("lift")} <span className="s3d-row">
                  <button className="s3d-btn" onClick={() => edit([{ op: "setItem", id: sel, y: Math.max(0, Math.round(((selItem.y || 0) - 0.1) * 100) / 100) }])}>▼</button>
                  {num(selItem.y || 0, (v) => edit([{ op: "setItem", id: sel, y: v }]))}
                  <button className="s3d-btn" onClick={() => edit([{ op: "setItem", id: sel, y: Math.round(((selItem.y || 0) + 0.1) * 100) / 100 }])}>▲</button></span></label>
                <div className="s3d-row">
                  <button className="s3d-btn" onClick={() => { const n = applyOps(modelRef.current, [{ op: "addItem", ph: selItem.ph, name: selItem.name, x: selItem.x + 0.6, z: selItem.z + 0.6, rot: selItem.rot, s: selItem.s, y: selItem.y }]); commit(n); setSel(n.items[n.items.length - 1].id); }}>{tx("dup")}</button>
                  <button className="s3d-btn danger" onClick={() => { edit([{ op: "delete", id: sel }]); setSel(null); }}>{tx("del")}</button>
                </div>
              </div>
            ) : selWall ? (
              <div className="s3d-form">
                <h4>🧱 {tx("wall")} · {tx("length")} {wallLen(selWall).toFixed(2)} م</h4>
                <label>{tx("thick")} {num(selWall.t, (v) => edit([{ op: "setWall", id: sel, t: v }]), 0.01)}</label>
                <label>{tx("height")} {num(selWall.h, (v) => edit([{ op: "setWall", id: sel, h: v }]))}</label>
                <div className="s3d-sw">{WALL_COLORS.map((c) => <button key={c} style={{ background: c }} className={selWall.color === c ? "on" : ""} onClick={() => edit([{ op: "setWall", id: sel, color: c }])} aria-label={c} />)}</div>
                <div className="s3d-row">
                  <button className="s3d-btn" onClick={() => edit([{ op: "addOpening", wall: sel, kind: "door", at: wallLen(selWall) / 2 }])}>{tx("addDoor")}</button>
                  <button className="s3d-btn" onClick={() => edit([{ op: "addOpening", wall: sel, kind: "window", at: wallLen(selWall) / 2 }])}>{tx("addWin")}</button>
                  <button className="s3d-btn danger" onClick={() => { edit([{ op: "delete", id: sel }]); setSel(null); }}>{tx("del")}</button>
                </div>
              </div>
            ) : selOpen ? (
              <div className="s3d-form">
                <h4>{selOpen.kind === "door" ? "🚪 " + tx("door") : "🪟 " + tx("window")}</h4>
                <label>{tx("width")} {num(selOpen.w, (v) => edit([{ op: "setOpening", id: sel, w: v }]))}</label>
                <label>{tx("height")} {num(selOpen.h, (v) => edit([{ op: "setOpening", id: sel, h: v }]))}</label>
                {selOpen.kind === "window" && <label>{tx("sill")} {num(selOpen.sill, (v) => edit([{ op: "setOpening", id: sel, sill: v }]))}</label>}
                <button className="s3d-btn danger" onClick={() => { edit([{ op: "delete", id: sel }]); setSel(null); }}>{tx("del")}</button>
              </div>
            ) : selRoom ? (
              <div className="s3d-form">
                <h4>⬜ {selRoom.w}×{selRoom.d} م · {Math.round(selRoom.w * selRoom.d * 10) / 10} م²</h4>
                <label>{tx("name")} <input defaultValue={selRoom.name} key={sel} onBlur={(e) => edit([{ op: "setRoom", id: sel, name: e.target.value }])} /></label>
                <label>{tx("type")} <select value={selRoom.type} onChange={(e) => edit([{ op: "setRoom", id: sel, type: e.target.value }])}>
                  {Object.keys(ROOM_TYPES).map((k) => <option key={k} value={k}>{TYPE_NAMES[k][L] || TYPE_NAMES[k][0]}</option>)}</select></label>
                <div className="s3d-sw">{["#eadcc4", "#d8e3ee", "#c9a77c", "#8f6a4a", "#e9e9e9", "#bdbdbd", "#d6c6a5", "#a9b8a0"].map((c) => <button key={c} style={{ background: c }} onClick={() => edit([{ op: "setRoom", id: sel, floor: c }])} aria-label={c} />)}</div>
                <button className="s3d-btn danger" onClick={() => { edit([{ op: "delete", id: sel }]); setSel(null); }}>{tx("del")}</button>
              </div>
            ) : <p className="muted">{tx("nothingSel")}</p>
          )}
          {panel === "paint" && (
            <div className="s3d-form">
              <div className="s3d-sw big">{PALETTE.map((c) => <button key={c} style={{ background: c }} className={paintC === c ? "on" : ""} onClick={() => setPaintC(c)} aria-label={c} />)}
                <label className="s3d-pick" title={tx("pickColor")}><input type="color" value={paintC} onChange={(e) => setPaintC(e.target.value)} />🌈</label></div>
              <p className="s3d-sub">{tx("wallMat")}</p>
              <div className="s3d-chips">{MAT_WALL.map((k) => <button key={k} className={paintM === k ? "on" : ""} onClick={() => setPaintM(k)}>{tx("m_" + k)}</button>)}</div>
              <p className="s3d-sub">{tx("floorMat")}</p>
              <div className="s3d-chips">{MAT_FLOOR.map((k) => <button key={k} className={floorM === k ? "on" : ""} onClick={() => setFloorM(k)}>{tx("m_" + k)}</button>)}</div>
              <label className="s3d-check"><input type="checkbox" checked={both} onChange={(e) => setBoth(e.target.checked)} /> {tx("bothSides")}</label>
              <button className="s3d-btn" onClick={() => edit([{ op: "paintWall", id: "*", side: "both", color: paintC, mat: paintM }])}>{tx("allWalls")}</button>
            </div>
          )}
          {panel === "items" && (
            <div className="s3d-form">
              <div className="s3d-row start">
                <div className="s3d-seg small">
                  <button className={libTab === "props" ? "on" : ""} onClick={() => setLibTab("props")}>{tx("propsTab")}</button>
                  <button className={libTab === "3d" ? "on" : ""} onClick={() => setLibTab("3d")}>{tx("models3d")}</button>
                  <button className={libTab === "google" ? "on" : ""} onClick={() => setLibTab("google")}>{tx("google")}</button>
                </div>
                <button className="s3d-btn gold" onClick={() => photoRef.current?.click()} title={tx("myPhotoSub")}>{tx("myPhoto")}</button>
              </div>
              {libTab === "props" ? (
                <>
                  <p className="s3d-sub">{tx("carColor")}</p>
                  <div className="s3d-sw big">{CAR_COLORS.map((c) => <button key={c} style={{ background: c }} className={carCol === c ? "on" : ""} onClick={() => setCarCol(c)} aria-label={c} />)}</div>
                  <div className="s3d-lib props">
                    {Object.entries(PROPS).map(([k, v]) => (
                      <button key={k} onClick={() => addProp(k)}><span className="s3d-emo" style={k.startsWith("car_") ? { background: carCol } : undefined}>{v.e}</span><small>{v.n[L] || v.n[0]}</small></button>
                    ))}
                  </div>
                  <p className="cs-note">{tx("propsNote")}</p>
                </>
              ) : libTab === "google" ? (
                <>
                  <form id="s3d-gform" className="s3d-search" onSubmit={searchGoogle}>
                    <input value={libQ} onChange={(e) => setLibQ(e.target.value.slice(0, 80))} placeholder={tx("searchPh")} enterKeyHint="search" />
                    <button className="s3d-btn gold" disabled={!libQ.trim() || !!busy}>{busy === "search" ? <span className="mini-spin" /> : "🔍"}</button>
                  </form>
                  <p className="s3d-sub">{tx("gHint")}</p>
                  <div className="s3d-chips">{(tx("gQuick") || "").split("|").map((q2) => (
                    <button key={q2} disabled={!!busy} onClick={() => { const w = q2.replace(/^\S+\s/, ""); setLibQ(w); searchGoogle(null, w); }}>{q2}</button>))}</div>
                  {gFound && (
                    <div className="s3d-lib">
                      {gFound.map((g2) => <button key={g2.thumb} onClick={() => addPic(g2)} title={g2.title}><img src={g2.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" /><small>{g2.credit || g2.title}</small></button>)}
                      {!gFound.length && <p className="muted">—</p>}
                    </div>
                  )}
                </>
              ) : (<>
              <form className="s3d-search" onSubmit={searchLib}>
                <input value={libQ} onChange={(e) => setLibQ(e.target.value.slice(0, 80))} placeholder={tx("searchPh")} enterKeyHint="search" />
                <button className="s3d-btn gold" disabled={!libQ.trim() || !!busy}>{busy === "search" ? <span className="mini-spin" /> : "🔍"}</button>
              </form>
              {!found && <div className="s3d-chips">{CATS.map((c) => <button key={c[0]} className={cat === c[0] ? "on" : ""} onClick={() => setCat(c[0])}>{catLabel(c)}</button>)}</div>}
              {found && <button className="s3d-btn" onClick={() => { setFound(null); setLibQ(""); }}>✕ {tx("all")}</button>}
              {lib === "off" ? <p className="muted">{tx("libOff")}</p> : !lib ? <p className="muted"><span className="mini-spin" /></p> : (
                <div className="s3d-lib">
                  {(found || libShown).map((md) => (
                    <button key={md.id} onClick={() => addItem(md)} title={md.name}>
                      <img src={md.thumb} alt="" loading="lazy" /><small>{md.name}</small>
                    </button>
                  ))}
                  {found && !found.length && <p className="muted">—</p>}
                </div>
              )}
              <p className="cs-note">{tx("libNote")}</p>
              </>)}
            </div>
          )}
          {panel === "lay" && (() => {
            const hw = m.walls.filter((w) => !w.fence), done = hw.reduce((a, w) => a + (w.built ?? w.h), 0), all = hw.reduce((a, w) => a + w.h, 0);
            return (
              <div className="s3d-form">
                <p className="s3d-sub">{tx("h_lay")}</p>
                <div className="s3d-chips">{["block", "brick", "stone"].map((k) => <button key={k} className={layMat === k ? "on" : ""} onClick={() => setLayMat(k)}>{tx("m_" + k)}</button>)}</div>
                <p className="s3d-sub">{tx("builtQ")}</p>
                <div className="s3d-chips">{[0, 0.25, 0.5, 0.75, 1].map((f) => <button key={f} onClick={() => edit([{ op: "lay", id: "*", frac: f, mat: layMat }])}>{Math.round(f * 100)}%</button>)}</div>
                <div className="s3d-progress"><i style={{ width: (all ? Math.round((done / all) * 100) : 0) + "%" }} /><b>{all ? Math.round((done / all) * 100) : 0}% {tx("laid")}</b></div>
                <div className="s3d-row start">
                  <button className="s3d-btn" disabled={!hw.length} onClick={() => edit([{ op: "lay", id: "*", n: 1, mat: layMat }])}>{tx("rowAll")}</button>
                  <button className="s3d-btn gold" disabled={!hw.length} onClick={() => { edit([{ op: "lay", id: "*", full: true, mat: layMat }]); setTimeout(() => eng.current?.animateBuild(), 60); }}>{tx("fullAll")}</button>
                </div>
              </div>
            );
          })()}
          {panel === "pour" && (
            <div className="s3d-form">
              <p className="s3d-sub">{tx("h_pour")}</p>
              <button className="s3d-btn gold" disabled={!m.rooms.length} onClick={() => {
                const ok = m.walls.filter((w) => !w.fence).every((w) => (w.built ?? w.h) >= w.h - 0.01);
                if (!ok) { say(tx("wallsFirst")); return; }
                edit([{ op: "pour", id: "*" }]); say(tx("pouring"));
                m.rooms.forEach((r, i) => setTimeout(() => eng.current?.pour(r.id), 40 + i * 450));
              }}>{tx("pourAll")}</button>
            </div>
          )}
          {panel === "room" && (
            <div className="s3d-form s3d-rb">
              <div className="s3d-chips">{RB_TYPES.map(([k, e2, w2, d2]) => (
                <button key={k} className={rb.type === k ? "on" : ""} onClick={() => setRb({ ...rb, type: k, w: String(w2), d: String(d2) })}>{e2} {TYPE_NAMES[k]?.[L] || TYPE_NAMES[k]?.[0]}</button>))}</div>
              <div className="s3d-row start s3d-rbsize">
                <label className="s3d-in">{tx("width")}<input inputMode="decimal" value={rb.w} onChange={(e) => setRb({ ...rb, w: e.target.value.slice(0, 5) })} /></label>
                <button className="s3d-btn" onClick={() => setRb({ ...rb, w: rb.d, d: rb.w })} aria-label="swap">⇄</button>
                <label className="s3d-in">{tx("depth")}<input inputMode="decimal" value={rb.d} onChange={(e) => setRb({ ...rb, d: e.target.value.slice(0, 5) })} /></label>
                <b className="s3d-area">{Math.round(rbW * rbD * 10) / 10} م²</b>
              </div>
              <div className="s3d-chips">{["3×3", "3×4", "4×4", "4×5", "5×5", "5×6", "6×8"].map((z2) => { const [a2, b2] = z2.split("×"); return (
                <button key={z2} className={rbW == a2 && rbD == b2 ? "on" : ""} onClick={() => setRb({ ...rb, w: a2, d: b2 })}>{z2}</button>); })}</div>
              <div className="s3d-row start">
                <label className="s3d-check"><input type="checkbox" checked={rb.door} onChange={(e) => setRb({ ...rb, door: e.target.checked })} /> 🚪 {tx("rbDoor")}</label>
                <label className="s3d-check"><input type="checkbox" checked={rb.win} onChange={(e) => setRb({ ...rb, win: e.target.checked })} /> 🪟 {tx("rbWin")}</label>
                {REAL && <label className="s3d-check"><input type="checkbox" checked={rb.auto} onChange={(e) => setRb({ ...rb, auto: e.target.checked })} /> 🧱 {tx("rbAuto")}</label>}
              </div>
              <p className={"s3d-sub" + (ghost && !ghost.ok ? " bad" : "")}>{ghost && !ghost.hover ? (ghost.ok ? tx("rbOk") : tx("rbBad")) : tx("rbTap")}</p>
              {ghost && !ghost.hover ? (
                <div className="s3d-row start">
                  {[["→", 0.25, 0], ["←", -0.25, 0], ["↑", 0, -0.25], ["↓", 0, 0.25]].map(([a2, dx, dz]) => <button key={a2} className="s3d-btn" onClick={() => nudge(dx, dz)}>{a2}</button>)}
                  <button className="s3d-btn" onClick={() => setRb({ ...rb, w: rb.d, d: rb.w })}>{tx("rbTurn")}</button>
                  <button className="s3d-btn gold" disabled={!ghost.ok} onClick={buildHere}>{tx("rbBuild")}</button>
                  <button className="s3d-btn" onClick={() => setGhost(null)} aria-label="cancel">✕</button>
                </div>
              ) : <button className="s3d-btn gold" onClick={autoSpot}>{tx("rbFind")}</button>}
            </div>
          )}
          {panel === "garden" && (
            <div className="s3d-form">
              <p className="s3d-sub">{tx("h_garden")}</p>
              <div className="s3d-chips">{["grass", "paving", "gravel", "soil", "pool"].map((k) => <button key={k} className={gardenK === k ? "on" : ""} onClick={() => setGardenK(k)}>{tx("g_" + k)}</button>)}</div>
            </div>
          )}
          {panel === "build" && (
            <div className="s3d-form">
              <h4>{tx("buildWith")}</h4>
              <div className="s3d-chips">{["block", "brick", "stone", "concrete"].map((k) => <button key={k} className={buildMat === k ? "on" : ""} onClick={() => setBuildMat(k)}>{tx("m_" + k)}</button>)}</div>
              <button className="s3d-btn gold" onClick={buildWalls}>{tx("buildGo")}</button>
            </div>
          )}
          {panel === "ai" && (
            <div className="s3d-form">
              <textarea rows={2} value={aiText} placeholder={tx("aiPh")} onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAI(); } }} />
              <div className="s3d-row">
                <button className="s3d-btn gold" disabled={!!busy || !aiText.trim()} onClick={() => askAI()}>{busy === "ai" ? tx("thinking") : tx("send")}</button>
              </div>
              <div className="s3d-chips">{["sug1", "sug2", "sug3", "sug4"].map((k) => <button key={k} disabled={!!busy} onClick={() => askAI(tx(k))}>{tx(k)}</button>)}</div>
            </div>
          )}
          {panel === "cost" && (
            <div className="s3d-form">
              <p className="muted small">{tx("floorA")}: <b>{q.floor} م²</b> · {tx("wallA")}: <b>{q.net} م²</b></p>
              <table className="s3d-table"><tbody>
                {q.lines.map((l) => (
                  <tr key={l.k}><td>{tx("c_" + l.k)}<small>{l.rule}</small></td><td>{fmt(l.qty)} {l.unit === "pcs" ? "" : l.unit}</td>
                    <td><input type="number" inputMode="numeric" value={prices[l.k]} onChange={(e) => setPrices({ ...prices, [l.k]: Math.max(0, +e.target.value || 0) })} /></td>
                    <td>{fmt(l.cost)}</td></tr>
                ))}
                <tr className="tot"><td colSpan={3}>{tx("total")}</td><td>{fmt(q.total)} IQD</td></tr>
              </tbody></table>
              <p className="cs-note">⚠️ {tx("costNote")}</p>
            </div>
          )}
          {panel === "file" && (
            <div className="s3d-form">
              <button className="s3d-btn gold s3d-wide" disabled={!!busy || isEmpty} onClick={aiRender}>{tx("render")}<small>{tx("renderSub")}</small></button>
              <p className="s3d-sub">{tx("realism")}</p>
              <div className="s3d-row start">
                <label className="s3d-check"><input type="checkbox" checked={roof} onChange={(e) => setRoof(e.target.checked)} /> {tx("roofT")}</label>
                <label className="s3d-check"><input type="checkbox" checked={ceil} onChange={(e) => setCeil(e.target.checked)} /> {tx("ceilT")}</label>
              </div>
              <div className="s3d-grid">
                <button className="s3d-btn" onClick={() => fileRef.current?.click()}>{tx("fromPlan")}</button>
                <button className="s3d-btn" onClick={() => { commit(sampleHouse()); setTimeout(() => eng.current?.fit(), 50); }}>{tx("sample")}</button>
                <button className="s3d-btn" onClick={() => download(eng.current.snapshot(3840), "ahm-3d-4k.png")}>{tx("png")}</button>
                <button className="s3d-btn" onClick={async () => { const b = await eng.current.exportGLB(); const u = URL.createObjectURL(b); download(u, "ahm-3d.glb"); setTimeout(() => URL.revokeObjectURL(u), 4000); }}>{tx("glb")}</button>
                <button className="s3d-btn" onClick={() => { const u = URL.createObjectURL(new Blob([JSON.stringify(modelRef.current)], { type: "application/json" })); download(u, "ahm-3d.json"); setTimeout(() => URL.revokeObjectURL(u), 4000); say(tx("saved")); }}>{tx("saveJ")}</button>
                <button className="s3d-btn" onClick={() => jsonRef.current?.click()}>{tx("openJ")}</button>
                <button className="s3d-btn danger" onClick={() => { if (confirm(tx("confirmNew"))) { commit(emptyModel()); setSel(null); setPlanFloors(null); if (REAL) setSetup(true); } }}>{tx("newM")}</button>
              </div>
              <p className="s3d-sub">{tx("myProjects")} · {tx("autoSave")}</p>
              <button className="s3d-btn gold" onClick={saveProject}>{tx("saveP")}</button>
              {saves.length ? (
                <ul className="s3d-saves">{saves.map((sv) => (
                  <li key={sv.id}><span>{sv.name}</span>
                    <button className="s3d-btn" onClick={() => { commit(applyOps({ ...emptyModel(), ...sv.model }, [])); setSel(null); setSetup(false); setPanel(null); setTimeout(() => eng.current?.fit(), 60); }}>{tx("openP")}</button>
                    <button className="s3d-btn" onClick={() => { const u = URL.createObjectURL(new Blob([JSON.stringify(sv.model)], { type: "application/json" })); download(u, (REAL ? "ahm-realistic" : "ahm-3d") + "-" + sv.at + ".json"); setTimeout(() => URL.revokeObjectURL(u), 4000); }}>⬇️</button>
                    <button className="s3d-btn danger" onClick={() => delSave(sv.id)}>🗑️</button>
                  </li>))}</ul>
              ) : <p className="muted small">{tx("noSaves")}</p>}
              <label className="s3d-sun">{tx("sunT")} · {hour}:00 <input type="range" min={7} max={19} value={hour} onChange={(e) => setHour(+e.target.value)} /></label>
            </div>
          )}
        </section>
      )}

      <nav className="s3d-bar">
        <div className="s3d-tools">
          {TOOLS.map(([k, ic]) => (
            <button key={k} className={tool === k ? "on" : ""} onClick={() => { setTool(k); if (view === "walk") setView("3d"); }} aria-pressed={tool === k}>
              <span aria-hidden="true">{ic}</span><small>{tx(k === "pour" ? "pourT" : k)}</small>
            </button>
          ))}
          <button onClick={undo} disabled={!hist.current.past.length}><span aria-hidden="true">↶</span><small>{tx("undo")}</small></button>
          <button onClick={redo} disabled={!hist.current.future.length}><span aria-hidden="true">↷</span><small>{tx("redo")}</small></button>
        </div>
        <div className="s3d-tabs">
          {[["props", "props"], ["items", "items"], ["ai", "ai"], ["cost", "cost"], ["file", "more"]].map(([p, k]) => (
            <button key={p} className={panel === p ? "on" : ""} onClick={() => setPanel(panel === p ? null : p)}>{tx(k)}</button>
          ))}
        </div>
      </nav>
      <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => { addOwnPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { readPlan(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={jsonRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        try { const j = JSON.parse(await f.text()); if (Array.isArray(j.walls)) { commit(applyOps({ ...emptyModel(), ...j }, [])); setTimeout(() => eng.current?.fit(), 50); } } catch { say(tx("planFail")); }
      }} />
    </div>
  );
}
