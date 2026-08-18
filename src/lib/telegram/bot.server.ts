import {
  appUrl,
  BOT_NAME,
  images,
  PLATFORMS,
  type Lang,
  type PlatformKey,
} from "./config";
import { imageBytes, type ImageKey } from "./media.server";
import {
  getBotSettings,
  updateBotSettings,
  type BotSettings,
} from "./settings.server";


const API = "https://api.telegram.org";

function token(): string {
  const t = process.env["TELEGRAM_BOT_TOKEN"];
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return t;
}

async function call(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Telegram ${method} failed [${res.status}]: ${text}`);
    return null;
  }
  const json = JSON.parse(text) as { ok: boolean; description?: string };
  if (!json.ok) console.error(`Telegram ${method} error: ${json.description}`);
  return json;
}

type Btn = {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
};

const ADMIN_TELEGRAM_ID = 8358563622;

/** Message ids sent after the welcome message, per chat — cleared on verify. */
const flowMessages = new Map<number, number[]>();

function track(chat_id: number, res: any) {
  const id = res?.result?.message_id;
  if (typeof id !== "number") return res;
  const list = flowMessages.get(chat_id) ?? [];
  list.push(id);
  flowMessages.set(chat_id, list);
  return res;
}

async function clearFlow(chat_id: number, keep?: number) {
  const ids = flowMessages.get(chat_id) ?? [];
  flowMessages.delete(chat_id);
  for (const message_id of ids) {
    if (message_id === keep) continue;
    await call("deleteMessage", { chat_id, message_id });
  }
}

const sendMessage = async (chat_id: number, text: string, keyboard?: Btn[][], noTrack = false) => {
  const res = await call("sendMessage", {
    chat_id,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
  return noTrack ? res : track(chat_id, res);
};


const uploadPhoto = async (
  chat_id: number,
  key: ImageKey,
  caption: string,
  keyboard?: Btn[][],
) => {
  const bytes = imageBytes(key);
  // Upload the bytes directly: Telegram never has to reach our host, so images
  // always arrive (and render inline, no download needed).
  if (bytes) {
    try {
      const form = new FormData();
      form.append("chat_id", String(chat_id));
      if (caption) {
        form.append("caption", caption);
        form.append("parse_mode", "HTML");
      }
      if (keyboard) form.append("reply_markup", JSON.stringify({ inline_keyboard: keyboard }));
      form.append("photo", new Blob([bytes as unknown as BlobPart], { type: "image/jpeg" }), `${key}.jpg`);
      const res = await fetch(`${API}/bot${token()}/sendPhoto`, { method: "POST", body: form });
      const text = await res.text();
      const json = JSON.parse(text) as { ok: boolean; description?: string };
      if (json.ok) return json;
      console.error(`Telegram sendPhoto upload failed: ${text}`);
    } catch (error) {
      console.error("Telegram sendPhoto upload threw", error);
    }
  }
  // Fallback: let Telegram fetch the hosted copy.
  return call("sendPhoto", {
    chat_id,
    photo: images()[key],
    ...(caption ? { caption, parse_mode: "HTML" } : {}),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
};

/** Telegram caption limit is 1024 chars — longer copy goes in its own message. */
const CAPTION_LIMIT = 1000;

const sendPhoto = async (
  chat_id: number,
  key: ImageKey,
  caption: string,
  keyboard?: Btn[][],
  noTrack = false,
) => {
  if (caption.length <= CAPTION_LIMIT) {
    const res = await uploadPhoto(chat_id, key, caption, keyboard);
    if (res && res.ok) return noTrack ? res : track(chat_id, res);
    return sendMessage(chat_id, caption, keyboard, noTrack);
  }
  // Photo first (renders inline), then the full text + buttons underneath.
  const photo = await uploadPhoto(chat_id, key, "");
  if (!noTrack) track(chat_id, photo);
  return sendMessage(chat_id, caption, keyboard, noTrack);
};




const answerCallback = (id: string, text?: string) =>
  call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });

/* --------------------------------- design -------------------------------- */

/** Thin divider — renders cleanly in both RTL and LTR, unlike ASCII boxes. */
const RULE = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬";
const DOT = "◆";

/** Progress bar: ▰▰▱▱▱ */
function bar(step: number, total = 5) {
  return "▰".repeat(step) + "▱".repeat(total - step);
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Elegant header block used by every message. */
function head(title: string, subtitle?: string) {
  return `👑 <b>${title}</b>\n${RULE}` + (subtitle ? `\n<i>${subtitle}</i>\n` : "\n");
}

function card(step: number, label: string, body: string, lang: Lang) {
  const progress = lang === "en" ? `Step ${step} of 5` : `الخطوة ${step} من ٥`;
  return (
    `${head(label)}` +
    `${bar(step)}  <b>${progress}</b>\n\n` +
    `${body}`
  );
}

/* ---------------------------------- copy --------------------------------- */

function welcomeCaption(name: string, lang: Lang = "ar") {
  const safe = escape(name);
  return lang === "en"
    ? `${head(`${BOT_NAME}`, "Premium AI signals club")}` +
        `Welcome, <b>${safe}</b> 🤝\n\n` +
        `${DOT} ⚡ Real-time smart signals\n` +
        `${DOT} 🎯 Elite accuracy\n` +
        `${DOT} 💎 VIP members only\n\n` +
        `${RULE}\n<i>Choose your language to begin.</i>`
    : `${head(`${BOT_NAME}`, "نادي الإشارات الذكية المميزة")}` +
        `أهلاً بك يا <b>${safe}</b> 🤝\n\n` +
        `${DOT} ⚡ إشارات لحظية ذكية\n` +
        `${DOT} 🎯 دقة عالية جدًا\n` +
        `${DOT} 💎 حصري لأعضاء VIP\n\n` +
        `${RULE}\n<i>اختر لغتك للبدء.</i>`;
}

const LANG_CAPTION =
  `🌐 <b>Language • اللغة</b>\n${RULE}\n` +
  `Select your language to continue.\n` +
  `اختر لغتك للمتابعة.`;

function copy(lang: Lang, promoCode: string) {
  const base = T[lang];
  return {
    step3: card(
      3,
      lang === "en" ? "PROMO CODE" : "البروموكود",
      lang === "en"
        ? `🎁 Register a <b>new</b> account with this code:\n\n<code>${escape(promoCode)}</code>\n\n<i>Tap the code to copy it.</i>`
        : `🎁 سجّل حساب <b>جديد</b> بالكود التالي:\n\n<code>${escape(promoCode)}</code>\n\n<i>اضغط على الكود لنسخه.</i>`,
      lang,
    ),
    copy: lang === "en" ? `📋 Copy code ${promoCode}` : `📋 نسخ الكود ${promoCode}`,
    copied:
      lang === "en"
        ? `Promo code ${promoCode} copied ✅`
        : `تم نسخ البروموكود ${promoCode} ✅`,
    base,
  };
}

const T = {
  en: {
    platform: `${head("CHOOSE YOUR PLATFORM", "Pick the platform to activate")}🎰 Select one of the options below.`,
    step1: (p: string) =>
      card(1, "DOWNLOAD", `📲 Install the <b>${p}</b> app\n\n${DOT} Official app only\n${DOT} Keep it installed to receive signals`, "en"),
    dl: (p: string) => `⬇️ Download ${p}`,
    step2: card(
      2,
      "JOIN CHANNEL",
      `📢 Join our official Telegram channel\n\n${DOT} All VIP signals are posted there\n${DOT} Membership is checked at verification`,
      "en",
    ),
    join: "🔔 Join the channel",
    step4: card(
      4,
      "DEPOSIT",
      `💰 Fund your account\n\n${DOT} Minimum <b>300 EGP</b>\n${DOT} or <b>6 USD</b>`,
      "en",
    ),
    step5: card(
      5,
      "YOUR ID",
      `🆔 Send your platform account ID\n\n${DOT} Digits only\n${DOT} Between <b>10</b> and <b>14</b> numbers\n\n<i>Example: 1234567890</i>`,
      "en",
    ),
    badId: `⚠️ <b>Invalid ID</b>\n${RULE}\nSend <b>digits only</b>, between <b>10</b> and <b>14</b> numbers.`,
    idOk: (id: string) =>
      `${head("ID RECEIVED")}🆔 <code>${id}</code>\n\n${bar(5)}  <b>5/5</b>\n<i>All steps completed — tap Verify below.</i>`,
    needId: "Send your account ID first (10-14 digits).",
    verify: "✅ VERIFY NOW",
    verified: `${head("VERIFICATION SUCCESSFUL")}Welcome to <b>${BOT_NAME}</b> 👑\nYour VIP access is now active.\n\n<i>Good luck and play responsibly.</i>`,
    open: "🚀 Open the app now",
    support: "🛠 Contact support",
    channel: "📢 Join Telegram",
    hint: `Send /start to begin.`,
  },
  ar: {
    platform: `${head("اختر المنصة", "اختر المنصة التي تريد تفعيلها")}🎰 اختر واحدة من الخيارات بالأسفل.`,
    step1: (p: string) =>
      card(1, "التحميل", `📲 حمّل تطبيق <b>${p}</b>\n\n${DOT} استخدم التطبيق الرسمي فقط\n${DOT} احتفظ به على هاتفك لاستقبال الإشارات`, "ar"),
    dl: (p: string) => `⬇️ تحميل ${p}`,
    step2: card(
      2,
      "قناة التليجرام",
      `📢 اشترك في القناة الرسمية\n\n${DOT} كل إشارات VIP تُنشر داخل القناة\n${DOT} يتم التأكد من اشتراكك عند التحقق`,
      "ar",
    ),
    join: "🔔 انضم للقناة",
    step4: card(
      4,
      "الإيداع",
      `💰 قم بتمويل حسابك\n\n${DOT} الحد الأدنى <b>٣٠٠ جنيه</b>\n${DOT} أو <b>٦ دولار</b>`,
      "ar",
    ),
    step5: card(
      5,
      "الـ ID",
      `🆔 أرسل ID حسابك في المنصة\n\n${DOT} أرقام فقط بدون حروف\n${DOT} من <b>١٠</b> إلى <b>١٤</b> رقم\n\n<i>مثال: 1234567890</i>`,
      "ar",
    ),
    badId: `⚠️ <b>ID غير صحيح</b>\n${RULE}\nأرسل <b>أرقام فقط</b> من <b>١٠</b> إلى <b>١٤</b> رقم.`,
    idOk: (id: string) =>
      `${head("تم استلام الـ ID")}🆔 <code>${id}</code>\n\n${bar(5)}  <b>٥/٥</b>\n<i>تم إكمال كل الخطوات — اضغط «التحقق الآن».</i>`,
    needId: "ابعت الـ ID الأول (من 10 لـ 14 رقم).",
    verify: "✅ التحقق الآن",
    verified: `${head("تم التحقق بنجاح")}مرحبًا بك في <b>${BOT_NAME}</b> 👑\nتم تفعيل وصولك لـ VIP.\n\n<i>حظًا موفقًا واللعب بمسؤولية.</i>`,
    open: "🚀 فتح التطبيق الآن",
    support: "🛠 التواصل مع الدعم",
    channel: "📢 الاشتراك في التليجرام",
    hint: `أرسل /start للبدء.`,
  },
} as const;

/* --------------------------------- flows --------------------------------- */

/** All activation conditions, in ONE elegant message. */
function termsCaption(lang: Lang, platform: string, promo: string) {
  const code = escape(promo);
  if (lang === "en") {
    return (
      `${head(`${BOT_NAME} — ACTIVATION`, "Complete the 5 steps below")}` +
      `${bar(5)}\n` +
      `${RULE}\n` +
      `<b>1 ${DOT} DOWNLOAD</b>\n📲 Install <b>${escape(platform)}</b> from the button below\n\n` +
      `<b>2 ${DOT} CHANNEL</b>\n📢 Join our official Telegram channel\n\n` +
      `<b>3 ${DOT} PROMO CODE</b>\n🎁 Register a <b>new</b> account with\n<code>${code}</code> <i>(tap to copy)</i>\n\n` +
      `<b>4 ${DOT} DEPOSIT</b>\n💰 Minimum <b>300 EGP</b> or <b>6 USD</b>\n\n` +
      `<b>5 ${DOT} YOUR ID</b>\n🆔 Send your account ID here (10–14 digits)\n` +
      `${RULE}\n` +
      `⚠️ <i>Follow the steps in order, then tap Verify.</i>`
    );
  }
  return (
    `${head(`${BOT_NAME} — شروط التفعيل`, "أكمل الخطوات الخمس بالترتيب")}` +
    `${bar(5)}\n` +
    `${RULE}\n` +
    `<b>١ ${DOT} التحميل</b>\n📲 حمّل تطبيق <b>${escape(platform)}</b> من الزر بالأسفل\n\n` +
    `<b>٢ ${DOT} القناة</b>\n📢 اشترك في قناة التليجرام الرسمية\n\n` +
    `<b>٣ ${DOT} البروموكود</b>\n🎁 سجّل حساب <b>جديد</b> بالكود\n<code>${code}</code> <i>(اضغط للنسخ)</i>\n\n` +
    `<b>٤ ${DOT} الإيداع</b>\n💰 الحد الأدنى <b>٣٠٠ جنيه</b> أو <b>٦ دولار</b>\n\n` +
    `<b>٥ ${DOT} الـ ID</b>\n🆔 ابعت ID حسابك هنا (من ١٠ لـ ١٤ رقم)\n` +
    `${RULE}\n` +
    `⚠️ <i>نفّذ الخطوات بالترتيب ثم اضغط «التحقق الآن».</i>`
  );
}


async function sendSteps(chatId: number, lang: Lang, pk: PlatformKey, settings: BotSettings) {
  const t = T[lang];
  const p = PLATFORMS[pk];
  const localized = copy(lang, settings.promoCode);
  const downloadUrl = pk === "p1" ? settings.platform1Url : settings.platform2Url;
  await sendPhoto(chatId, "steps", termsCaption(lang, p.name, settings.promoCode), [
    [{ text: t.dl(p.name), url: downloadUrl }],
    [{ text: t.join, url: settings.channelUrl }],
    [{ text: localized.copy, callback_data: `copy:${lang}` }],
    [{ text: t.verify, callback_data: `verify:${lang}` }],
  ]);
}

async function sendVerified(chatId: number, lang: Lang, settings: BotSettings, id?: string, name?: string) {
  const t = T[lang];
  await sendPhoto(chatId, "verified", t.verified, [
    [{ text: t.open, web_app: { url: appUrl(lang, id, name, settings.appBaseUrl) } }],
    [{ text: t.support, url: settings.supportUrl }],
    [{ text: t.channel, url: settings.channelUrl }],
  ]);
}


function isAdmin(fromId: unknown) {
  return Number(fromId) === ADMIN_TELEGRAM_ID;
}

function adminPanel(settings: BotSettings) {
  const status = settings.enabled ? "🟢 يعمل" : "🔴 متوقف";
  return `👑 <b>لوحة تحكم ${BOT_NAME}</b>\n${RULE}\nالحالة: <b>${status}</b>\n\n📢 القناة: ${escape(settings.channelUrl)}\n🛠 الدعم: ${escape(settings.supportUrl)}\n🎁 البروموكود: <code>${escape(settings.promoCode)}</code>\n${RULE}\nاختر إجراءً من الأزرار:`;
}

async function sendAdminPanel(chatId: number, settings: BotSettings) {
  await sendMessage(chatId, adminPanel(settings), [
    [
      { text: "▶️ تشغيل", callback_data: "admin:on" },
      { text: "⏸ إيقاف", callback_data: "admin:off" },
    ],
    [{ text: "🔗 تعديل الروابط والكود", callback_data: "admin:help" }],
    [{ text: "🔄 تحديث اللوحة", callback_data: "admin:panel" }],
  ]);
}

const ADMIN_HELP = `⚙️ <b>أوامر تعديل إعدادات البوت</b>\n${RULE}\n<code>/set_channel https://t.me/...</code>\n<code>/set_support https://t.me/...</code>\n<code>/set_platform1 https://...</code>\n<code>/set_platform2 https://...</code>\n<code>/set_promo 1234</code>\n<code>/set_app https://your-domain.com</code>\n\nكل تعديل يُحفظ فورًا ويظهر للمستخدمين.`;

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function handleAdminCommand(chatId: number, text: string) {
  const space = text.indexOf(" ");
  const command = (space === -1 ? text : text.slice(0, space)).split("@")[0] ?? "";
  const value = space === -1 ? "" : text.slice(space + 1).trim();
  const urlFields: Record<string, keyof Pick<NonNullable<Parameters<typeof updateBotSettings>[0]>, "channel_url" | "support_url" | "platform_1_url" | "platform_2_url" | "app_base_url">> = {
    "/set_channel": "channel_url",
    "/set_support": "support_url",
    "/set_platform1": "platform_1_url",
    "/set_platform2": "platform_2_url",
    "/set_app": "app_base_url",
  };
  const field = urlFields[command];
  if (field) {
    if (!validHttpUrl(value)) {
      await sendMessage(chatId, "⚠️ ابعت رابط كامل يبدأ بـ https://");
      return true;
    }
    await updateBotSettings({ [field]: value });
    await sendMessage(chatId, "✅ تم حفظ الرابط بنجاح.");
    await sendAdminPanel(chatId, await getBotSettings());
    return true;
  }
  if (command === "/set_promo") {
    if (!value || value.length > 32) {
      await sendMessage(chatId, "⚠️ البروموكود مطلوب وبحد أقصى 32 حرفًا.");
      return true;
    }
    await updateBotSettings({ promo_code: value });
    await sendMessage(chatId, "✅ تم تغيير البروموكود.");
    await sendAdminPanel(chatId, await getBotSettings());
    return true;
  }
  return false;
}

export async function handleUpdate(update: any) {
  const settings = await getBotSettings();
  const cb = update?.callback_query;
  if (cb) {
    const chatId = cb.message?.chat?.id as number | undefined;
    const data = String(cb.data ?? "");
    if (!chatId) return;
    const parts = data.split(":");
    const action = parts[0];
    const lang: Lang = parts[1] === "en" ? "en" : "ar";
    const name = (cb.from?.username ? `@${cb.from.username}` : cb.from?.first_name) as
      | string
      | undefined;


    if (action === "admin") {
      if (!isAdmin(cb.from?.id)) {
        await answerCallback(cb.id, "غير مصرح");
        return;
      }
      if (parts[1] === "on" || parts[1] === "off") {
        await updateBotSettings({ enabled: parts[1] === "on" });
        await answerCallback(cb.id, parts[1] === "on" ? "تم تشغيل البوت" : "تم إيقاف البوت");
      } else if (parts[1] === "help") {
        await answerCallback(cb.id);
        await sendMessage(chatId, ADMIN_HELP);
        return;
      } else {
        await answerCallback(cb.id);
      }
      await sendAdminPanel(chatId, await getBotSettings());
      return;
    }

    if (!settings.enabled) {
      await answerCallback(cb.id, "البوت متوقف مؤقتًا");
      return;
    }

    if (action === "lang") {
      await answerCallback(cb.id);
      await sendPhoto(chatId, "steps", T[lang].platform, [
        [{ text: `🎯 ${PLATFORMS.p1.name}`, callback_data: `plat:${lang}:p1` }],
        [{ text: `🎯 ${PLATFORMS.p2.name}`, callback_data: `plat:${lang}:p2` }],
      ]);
      return;
    }
    if (action === "plat") {
      const pk = (parts[2] === "p2" ? "p2" : "p1") as PlatformKey;
      await answerCallback(cb.id);
      await sendSteps(chatId, lang, pk, settings);
      return;
    }
    if (action === "copy") {
      const localized = copy(lang, settings.promoCode);
      await answerCallback(cb.id, localized.copied);
      await sendMessage(chatId, `<code>${escape(settings.promoCode)}</code>`);
      return;
    }
    if (action === "verify") {
      const id = parts[2];
      if (!id || !/^\d{10,14}$/.test(id)) {
        await answerCallback(cb.id, T[lang].needId);
        await sendMessage(chatId, T[lang].step5);
        return;
      }
      await answerCallback(cb.id);
      await sendVerified(chatId, lang, settings, id, name);
      return;
    }
    await answerCallback(cb.id);
    return;
  }

  const msg = update?.message ?? update?.edited_message;
  const chatId = msg?.chat?.id as number | undefined;
  if (!chatId) return;
  const text = String(msg.text ?? "").trim();

  if (isAdmin(msg.from?.id)) {
    if (text === "/admin" || text === "/panel") {
      await sendAdminPanel(chatId, settings);
      return;
    }
    if (text === "/bot_on" || text === "/bot_off") {
      await updateBotSettings({ enabled: text === "/bot_on" });
      await sendAdminPanel(chatId, await getBotSettings());
      return;
    }
    if (await handleAdminCommand(chatId, text)) return;
  }

  if (!settings.enabled && !isAdmin(msg.from?.id)) return;

  if (text.startsWith("/start")) {
    const name = msg.from?.first_name ?? "Player";
    await sendPhoto(chatId, "welcome", welcomeCaption(name));
    await sendPhoto(chatId, "language", LANG_CAPTION, [
      [
        { text: "🇬🇧 English", callback_data: "lang:en" },
        { text: "🇸🇦 العربية", callback_data: "lang:ar" },
      ],
    ]);
    if (isAdmin(msg.from?.id)) await sendAdminPanel(chatId, settings);
    return;
  }

  // Account ID submission: digits only, 10-14 characters.
  const digits = text.replace(/\D/g, "");
  if (digits && digits === text.replace(/\s/g, "")) {
    if (digits.length >= 10 && digits.length <= 14) {
      await sendMessage(chatId, T.ar.idOk(digits), [
        [{ text: T.ar.verify, callback_data: `verify:ar:${digits}` }],
      ]);
    } else {
      await sendMessage(chatId, T.ar.badId);
    }
    return;
  }

  await sendMessage(chatId, T.ar.hint);
}
