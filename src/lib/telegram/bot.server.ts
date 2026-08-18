import {
  appUrl,
  BOT_NAME,
  images,
  PLATFORMS,
  type Lang,
  type PlatformKey,
} from "./config";
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

const sendPhoto = (
  chat_id: number,
  photo: string,
  caption: string,
  keyboard?: Btn[][],
) =>
  call("sendPhoto", {
    chat_id,
    photo,
    caption,
    parse_mode: "HTML",
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });

const sendMessage = (chat_id: number, text: string, keyboard?: Btn[][]) =>
  call("sendMessage", {
    chat_id,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });

const answerCallback = (id: string, text?: string) =>
  call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });

/* --------------------------------- design -------------------------------- */

const RULE = "━━━━━━━━━━━━━━━━━━";
const TOP = "╔══════════════╗";
const BOT_ = "╚══════════════╝";

/** Neon progress bar: ▰▰▱▱▱ */
function bar(step: number, total = 5) {
  return "▰".repeat(step) + "▱".repeat(total - step);
}

function card(step: number, label: string, body: string) {
  return (
    `${TOP}\n` +
    `   <b>${label}</b>\n` +
    `${BOT_}\n` +
    `${bar(step)}  <b>${step}/5</b>\n` +
    `${RULE}\n` +
    `${body}`
  );
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------------------------------- copy --------------------------------- */

function welcomeCaption(name: string, lang: Lang = "ar") {
  const safe = escape(name);
  return lang === "en"
    ? `👑 <b>WELCOME TO ${BOT_NAME}</b> 👑\n${RULE}\nHello <b>${safe}</b>!\n\n⚡ Premium AI signals\n🎯 Elite accuracy\n💎 VIP members only\n${RULE}\n<i>Your journey starts now.</i>`
    : `👑 <b>مرحبًا بك في ${BOT_NAME}</b> 👑\n${RULE}\nأهلاً <b>${safe}</b>!\n\n⚡ إشارات ذكية احترافية\n🎯 دقة نخبوية\n💎 حصري لأعضاء VIP\n${RULE}\n<i>رحلتك تبدأ الآن.</i>`;
}

const LANG_CAPTION = `🌐 <b>SELECT YOUR LANGUAGE</b>\n${RULE}\n🇬🇧 English  •  🇸🇦 العربية\n${RULE}\n🌐 <b>اختر لغتك</b>`;

function copy(lang: Lang, promoCode: string) {
  const base = T[lang];
  return {
    step3: card(
      3,
      lang === "en" ? "PROMO CODE" : "البروموكود",
      lang === "en"
        ? `🎁 <b>Create your account with the promo code</b>\n\n┌──────────────┐\n│  <code>${escape(promoCode)}</code>\n└──────────────┘\n\n<i>Tap the code to copy it instantly.</i>`
        : `🎁 <b>إنشاء حساب باستخدام البروموكود</b>\n\n┌──────────────┐\n│  <code>${escape(promoCode)}</code>\n└──────────────┘\n\n<i>اضغط على الكود لنسخه فورًا.</i>`,
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
    platform: `🎰 <b>CHOOSE YOUR PLATFORM</b>\n${RULE}\nSelect the platform you want to activate with <b>${BOT_NAME}</b>.\n${RULE}`,
    step1: (p: string) =>
      card(
        1,
        "DOWNLOAD",
        `📲 <b>Install the ${p} app</b>\n\n• Use the official app only\n• Keep it installed to receive signals\n\n<i>Tap the button below.</i>`,
      ),
    dl: (p: string) => `⬇️ Download ${p}`,
    step2: card(
      2,
      "JOIN CHANNEL",
      `📢 <b>Join our Telegram channel</b>\n\n• All VIP signals are posted there\n• Never miss an update\n\n<i>Membership is checked at verification.</i>`,
    ),
    join: "🔔 Join the channel",
    step4: card(
      4,
      "DEPOSIT",
      `💰 <b>Fund your account</b>\n\n• Minimum <b>300 EGP</b>\n• or <b>6 USD</b>\n\n<i>Required to unlock VIP signals.</i>`,
    ),
    step5: card(
      5,
      "YOUR ID",
      `🆔 <b>Send your platform account ID</b>\n\n• Digits only\n• Between <b>10</b> and <b>14</b> numbers\n\n<i>Example: 1234567890</i>`,
    ),
    badId: `⚠️ <b>Invalid ID</b>\n${RULE}\nSend <b>digits only</b>, between <b>10</b> and <b>14</b> numbers.`,
    idOk: (id: string) =>
      `✅ <b>ID RECEIVED</b>\n${RULE}\n🆔 <code>${id}</code>\n${RULE}\n${bar(5)}  <b>5/5</b>\nAll steps completed — tap below.`,
    needId: "Send your account ID first (10-14 digits).",
    verify: "🔎 VERIFY NOW",
    verified: `✅ <b>VERIFICATION SUCCESSFUL</b>\n${RULE}\nWelcome to <b>${BOT_NAME}</b> 👑\nYour access is now active.\n${RULE}\n<i>Good luck and play responsibly.</i>`,
    open: "🚀 Open the app now",
    support: "🛠 Contact support",
    channel: "📢 Join Telegram",
    hint: `Send /start to begin.`,
  },
  ar: {
    platform: `🎰 <b>اختر المنصة</b>\n${RULE}\nاختر المنصة التي تريد تفعيلها مع <b>${BOT_NAME}</b>.\n${RULE}`,
    step1: (p: string) =>
      card(
        1,
        "التحميل",
        `📲 <b>تحميل منصة ${p}</b>\n\n• استخدم التطبيق الرسمي فقط\n• خليه مثبّت لاستقبال الإشارات\n\n<i>اضغط الزر بالأسفل.</i>`,
      ),
    dl: (p: string) => `⬇️ تحميل ${p}`,
    step2: card(
      2,
      "قناة التلجرام",
      `📢 <b>الانضمام لقناة التلجرام</b>\n\n• كل إشارات VIP تُنشر هناك\n• متفوّتش أي تحديث\n\n<i>يتم التأكد من الانضمام عند التحقق.</i>`,
    ),
    join: "🔔 انضم للقناة",
    step4: card(
      4,
      "الإيداع",
      `💰 <b>إيداع مبلغ في حسابك</b>\n\n• الحد الأدنى <b>300 جنيه مصري</b>\n• أو <b>6 دولار أمريكي</b>\n\n<i>مطلوب لفتح إشارات VIP.</i>`,
    ),
    step5: card(
      5,
      "الـ ID",
      `🆔 <b>أرسل ID حسابك في المنصة</b>\n\n• أرقام فقط\n• من <b>10</b> إلى <b>14</b> رقم\n\n<i>مثال: 1234567890</i>`,
    ),
    badId: `⚠️ <b>ID غير صحيح</b>\n${RULE}\nأرسل <b>أرقام فقط</b> من <b>10</b> إلى <b>14</b> رقم.`,
    idOk: (id: string) =>
      `✅ <b>تم استلام الـ ID</b>\n${RULE}\n🆔 <code>${id}</code>\n${RULE}\n${bar(5)}  <b>5/5</b>\nتم إكمال كل الشروط — اضغط بالأسفل.`,
    needId: "ابعت الـ ID الأول (من 10 لـ 14 رقم).",
    verify: "🔎 التحقق الآن",
    verified: `✅ <b>تم التحقق بنجاح</b>\n${RULE}\nمرحبًا بك في <b>${BOT_NAME}</b> 👑\nتم تفعيل وصولك الآن.\n${RULE}\n<i>حظًا موفقًا واللعب بمسؤولية.</i>`,
    open: "🚀 فتح التطبيق الآن",
    support: "🛠 التواصل مع الدعم",
    channel: "📢 الاشتراك في التلجرام",
    hint: `أرسل /start للبدء.`,
  },
} as const;

/* --------------------------------- flows --------------------------------- */

async function sendSteps(chatId: number, lang: Lang, pk: PlatformKey, settings: BotSettings) {
  const t = T[lang];
  const p = PLATFORMS[pk];
  const localized = copy(lang, settings.promoCode);
  const downloadUrl = pk === "p1" ? settings.platform1Url : settings.platform2Url;
  const img = images();
  await sendPhoto(chatId, img.steps, t.step1(p.name), [
    [{ text: t.dl(p.name), url: downloadUrl }],
  ]);
  await sendMessage(chatId, t.step2, [[{ text: t.join, url: settings.channelUrl }]]);
  await sendMessage(chatId, localized.step3, [
    [{ text: localized.copy, callback_data: `copy:${lang}` }],
  ]);
  await sendMessage(chatId, t.step4);
  await sendMessage(chatId, t.step5, [
    [{ text: t.verify, callback_data: `verify:${lang}` }],
  ]);
}

async function sendVerified(chatId: number, lang: Lang, settings: BotSettings, id?: string, name?: string) {
  const t = T[lang];
  await sendPhoto(chatId, images().verified, t.verified, [
    [{ text: t.open, url: appUrl(lang, id, name, settings.appBaseUrl) }],
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
    const name = cb.from?.first_name as string | undefined;

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
      await sendPhoto(chatId, images().steps, T[lang].platform, [
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
    await sendPhoto(chatId, images().welcome, welcomeCaption(name));
    await sendPhoto(chatId, images().language, LANG_CAPTION, [
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
