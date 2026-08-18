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




const answerCallback = (id: string, text?: string, alert = false) =>
  call("answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text, show_alert: alert } : {}),
  });

/* --------------------------------- design -------------------------------- */

/** Hairline divider — reads cleanly in both RTL and LTR. */
const RULE = "━━━━━━━━━━━━━━━━━━━";
const SOFT = "──────────────────";
const DOT = "•";

/** Progress bar: ●●●○○ */
function bar(step: number, total = 5) {
  return "●".repeat(step) + "○".repeat(total - step);
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal, modern header block used by every message. */
function head(title: string, subtitle?: string) {
  return (
    `<b>${title}</b>\n` +
    `${RULE}\n` +
    (subtitle ? `<i>${subtitle}</i>\n\n` : "\n")
  );
}

function card(step: number, label: string, body: string, lang: Lang) {
  const progress = lang === "en" ? `Step ${step} / 5` : `الخطوة ${step} من 5`;
  return `${head(label)}${bar(step)}   <b>${progress}</b>\n\n${body}`;
}

/* ---------------------------------- copy --------------------------------- */

function welcomeCaption(name: string, lang: Lang = "ar") {
  const safe = escape(name);
  return lang === "en"
    ? `${head(`✦ ${BOT_NAME}`, "Private signals club")}` +
        `Welcome, <b>${safe}</b>\n\n` +
        `${DOT} Instant AI signals\n` +
        `${DOT} Verified accuracy\n` +
        `${DOT} Members only access\n\n` +
        `${SOFT}\n<i>Select your language to continue.</i>`
    : `${head(`✦ ${BOT_NAME}`, "نادي الإشارات الخاص")}` +
        `أهلاً بك يا <b>${safe}</b>\n\n` +
        `${DOT} إشارات لحظية بالذكاء الاصطناعي\n` +
        `${DOT} دقة موثوقة\n` +
        `${DOT} وصول حصري للأعضاء\n\n` +
        `${SOFT}\n<i>اختر لغتك للمتابعة.</i>`;
}

const LANG_CAPTION =
  `<b>Language · اللغة</b>\n${RULE}\n` +
  `Choose your preferred language.\n` +
  `اختر لغتك المفضّلة.`;

function copy(lang: Lang, promoCode: string) {
  const base = T[lang];
  return {
    step3: card(
      3,
      lang === "en" ? "PROMO CODE" : "البروموكود",
      lang === "en"
        ? `Register a <b>new</b> account with this code:\n\n<code>${escape(promoCode)}</code>\n\n<i>Tap the code to copy it.</i>`
        : `سجّل حساب <b>جديد</b> بالكود التالي:\n\n<code>${escape(promoCode)}</code>\n\n<i>اضغط على الكود لنسخه.</i>`,
      lang,
    ),
    copy: lang === "en" ? `Copy code · ${promoCode}` : `نسخ الكود · ${promoCode}`,
    copied:
      lang === "en" ? `Promo code ${promoCode} copied ✓` : `تم نسخ البروموكود ${promoCode} ✓`,
    base,
  };
}

const T = {
  en: {
    platform: `${head("CHOOSE YOUR PLATFORM", "Four partners — pick one to activate")}${DOT} Megapari\n${DOT} PariPulse\n${DOT} GoooBet\n${DOT} WinWin\n\n${SOFT}\n<i>Select a platform below.</i>`,
    step1: (p: string) =>
      card(1, "DOWNLOAD", `Install the <b>${p}</b> app\n\n${DOT} Official app only\n${DOT} Keep it installed to receive signals`, "en"),
    dl: (p: string) => `Download · ${p}`,
    step2: card(
      2,
      "JOIN CHANNEL",
      `Join our official Telegram channel\n\n${DOT} All signals are posted there\n${DOT} Membership is checked at verification`,
      "en",
    ),
    join: "Join the channel",
    step4: card(4, "DEPOSIT", `Fund your account\n\n${DOT} Minimum <b>300 EGP</b>\n${DOT} or <b>6 USD</b>`, "en"),
    step5: card(
      5,
      "YOUR ID",
      `Send your platform account ID\n\n${DOT} Digits only\n${DOT} Between <b>10</b> and <b>14</b> numbers\n\n<i>Example: 1234567890</i>`,
      "en",
    ),
    badId: `<b>Invalid ID</b>\n${SOFT}\nSend <b>digits only</b>, between <b>10</b> and <b>14</b> numbers.`,
    idOk: (id: string) =>
      `${head("ID RECEIVED")}<code>${id}</code>\n\n${bar(5)}   <b>5 / 5</b>\n<i>All steps completed — tap Verify below.</i>`,
    needId: "Send your account ID first (10-14 digits).",
    verify: "✓ Verify now",
    verified: `${head("✦ VERIFICATION SUCCESSFUL", "Your access is active")}Welcome to <b>${BOT_NAME}</b>.\n\n${DOT} Open the app anytime from the button below\n${DOT} Support is one tap away\n\n${SOFT}\n<i>Good luck — play responsibly.</i>`,
    open: "Open the app",
    support: "Support",
    channel: "Telegram channel",
    hint: `Send /start to begin.`,
    needJoin: "Join the channel first",
    needJoinMsg: `<b>Channel membership required</b>\n${SOFT}\nYou must join our official channel before verification.\n\n${DOT} Tap <b>Join the channel</b>\n${DOT} Then tap <b>Verify now</b> again.`,
    membershipUnavailable: "Membership check is temporarily unavailable",
    membershipUnavailableMsg: `<b>Membership check unavailable</b>\n${SOFT}\nThe bot needs to be an administrator in the official channel to verify members.\n\n<i>Please contact support and try again shortly.</i>`,
  },
  ar: {
    platform: `${head("اختر المنصة", "أربع منصات — اختر واحدة للتفعيل")}${DOT} Megapari\n${DOT} PariPulse\n${DOT} GoooBet\n${DOT} WinWin\n\n${SOFT}\n<i>اختر منصتك من الأزرار بالأسفل.</i>`,
    step1: (p: string) =>
      card(1, "التحميل", `حمّل تطبيق <b>${p}</b>\n\n${DOT} استخدم التطبيق الرسمي فقط\n${DOT} احتفظ به لاستقبال الإشارات`, "ar"),
    dl: (p: string) => `تحميل · ${p}`,
    step2: card(
      2,
      "قناة التليجرام",
      `اشترك في القناة الرسمية\n\n${DOT} كل الإشارات تُنشر داخل القناة\n${DOT} يتم التأكد من اشتراكك عند التحقق`,
      "ar",
    ),
    join: "الاشتراك في القناة",
    step4: card(4, "الإيداع", `قم بتمويل حسابك\n\n${DOT} الحد الأدنى <b>300 جنيه</b>\n${DOT} أو <b>6 دولار</b>`, "ar"),
    step5: card(
      5,
      "الـ ID",
      `أرسل ID حسابك في المنصة\n\n${DOT} أرقام فقط بدون حروف\n${DOT} من <b>10</b> إلى <b>14</b> رقم\n\n<i>مثال: 1234567890</i>`,
      "ar",
    ),
    badId: `<b>الـ ID غير صحيح</b>\n${SOFT}\nأرسل <b>أرقام فقط</b> من <b>10</b> إلى <b>14</b> رقم.`,
    idOk: (id: string) =>
      `${head("تم استلام الـ ID")}<code>${id}</code>\n\n${bar(5)}   <b>5 / 5</b>\n<i>تم إكمال كل الخطوات — اضغط «التحقق الآن».</i>`,
    needId: "ابعت الـ ID الأول (من 10 لـ 14 رقم).",
    verify: "✓ التحقق الآن",
    verified: `${head("✦ تم التحقق بنجاح", "تم تفعيل وصولك")}مرحبًا بك في <b>${BOT_NAME}</b>.\n\n${DOT} افتح التطبيق في أي وقت من الزر بالأسفل\n${DOT} الدعم متاح بضغطة واحدة\n\n${SOFT}\n<i>حظًا موفقًا — العب بمسؤولية.</i>`,
    open: "فتح التطبيق",
    support: "الدعم",
    channel: "قناة التليجرام",
    hint: `أرسل /start للبدء.`,
    needJoin: "لازم تشترك في القناة الأول",
    needJoinMsg: `<b>الاشتراك في القناة إجباري</b>\n${SOFT}\nلازم تشترك في قناتنا الرسمية قبل التحقق.\n\n${DOT} اضغط <b>الاشتراك في القناة</b>\n${DOT} وبعدين اضغط <b>التحقق الآن</b> تاني.`,
    membershipUnavailable: "تعذر فحص الاشتراك مؤقتًا",
    membershipUnavailableMsg: `<b>تعذر فحص عضوية القناة</b>\n${SOFT}\nلازم يكون البوت مشرفًا في القناة الرسمية علشان يقدر يتأكد من اشتراك الأعضاء.\n\n<i>تواصل مع الدعم وحاول مرة تانية.</i>`,
  },
} as const;

/* --------------------------------- flows --------------------------------- */

/** All activation conditions, in ONE elegant message. */
function termsCaption(lang: Lang, platform: string, promo: string) {
  const code = escape(promo);
  const p = escape(platform);
  if (lang === "en") {
    return (
      `${head(`✦ ${BOT_NAME} · ACTIVATION`, `Platform: ${p}`)}` +
      `${bar(5)}   <b>5 steps</b>\n${SOFT}\n\n` +
      `<b>01 · DOWNLOAD</b>\nInstall <b>${p}</b> from the button below.\n\n` +
      `<b>02 · CHANNEL</b>\nJoin our official Telegram channel.\n\n` +
      `<b>03 · PROMO CODE</b>\nRegister a <b>new</b> account with\n<code>${code}</code>  <i>(tap to copy)</i>\n\n` +
      `<b>04 · DEPOSIT</b>\nMinimum <b>300 EGP</b> or <b>6 USD</b>.\n\n` +
      `<b>05 · YOUR ID</b>\nSend your account ID here (10–14 digits).\n\n` +
      `${SOFT}\n<i>Follow the steps in order, then tap Verify.</i>`
    );
  }
  return (
    `${head(`✦ ${BOT_NAME} · شروط التفعيل`, `المنصة: ${p}`)}` +
    `${bar(5)}   <b>5 خطوات</b>\n${SOFT}\n\n` +
    `<b>01 · التحميل</b>\nحمّل تطبيق <b>${p}</b> من الزر بالأسفل.\n\n` +
    `<b>02 · القناة</b>\nاشترك في قناة التليجرام الرسمية.\n\n` +
    `<b>03 · البروموكود</b>\nسجّل حساب <b>جديد</b> بالكود\n<code>${code}</code>  <i>(اضغط للنسخ)</i>\n\n` +
    `<b>04 · الإيداع</b>\nالحد الأدنى <b>300 جنيه</b> أو <b>6 دولار</b>.\n\n` +
    `<b>05 · الـ ID</b>\nابعت ID حسابك هنا (من 10 لـ 14 رقم).\n\n` +
    `${SOFT}\n<i>نفّذ الخطوات بالترتيب ثم اضغط «التحقق الآن».</i>`
  );
}

function platformUrl(pk: PlatformKey, settings: BotSettings) {
  const map: Record<PlatformKey, string> = {
    p1: settings.platform1Url,
    p2: settings.platform2Url,
    p3: settings.platform3Url,
    p4: settings.platform4Url,
  };
  return map[pk] || PLATFORMS[pk].download;
}

async function sendSteps(chatId: number, lang: Lang, pk: PlatformKey, settings: BotSettings) {
  const t = T[lang];
  const p = PLATFORMS[pk];
  const localized = copy(lang, settings.promoCode);
  await sendPhoto(chatId, "steps", termsCaption(lang, p.name, settings.promoCode), [
    [{ text: t.dl(p.name), url: platformUrl(pk, settings) }],
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
  ], true);
}


/* --------------------------------- admin --------------------------------- */

type EditableField =
  | "channel_url"
  | "support_url"
  | "platform_1_url"
  | "platform_2_url"
  | "platform_3_url"
  | "platform_4_url"
  | "app_base_url"
  | "promo_code"
  | "add_admin"
  | "remove_admin";

const FIELD_LABEL: Record<EditableField, string> = {
  channel_url: "رابط قناة التليجرام",
  support_url: "رابط الدعم",
  platform_1_url: `رابط تحميل ${PLATFORMS.p1.name}`,
  platform_2_url: `رابط تحميل ${PLATFORMS.p2.name}`,
  platform_3_url: `رابط تحميل ${PLATFORMS.p3.name}`,
  platform_4_url: `رابط تحميل ${PLATFORMS.p4.name}`,
  app_base_url: "رابط التطبيق (الموقع)",
  promo_code: "البروموكود",
  add_admin: "إضافة أدمن (ID تليجرام)",
  remove_admin: "حذف أدمن (ID تليجرام)",
};

function adminPanel(settings: BotSettings, admins: { id: number; label: string | null }[]) {
  const status = settings.enabled ? "🟢 يعمل" : "🔴 متوقف";
  return (
    `👑 <b>لوحة تحكم ${BOT_NAME}</b>\n${RULE}\n` +
    `الحالة: <b>${status}</b>\n\n` +
    `📢 القناة: ${escape(settings.channelUrl)}\n` +
    `🛠 الدعم: ${escape(settings.supportUrl)}\n` +
    `🎁 البروموكود: <code>${escape(settings.promoCode)}</code>\n` +
    `🌐 التطبيق: ${escape(settings.appBaseUrl ?? "الافتراضي")}\n\n` +
    `${PLATFORMS.p1.name}: ${escape(settings.platform1Url)}\n` +
    `${PLATFORMS.p2.name}: ${escape(settings.platform2Url)}\n` +
    `${PLATFORMS.p3.name}: ${escape(settings.platform3Url)}\n` +
    `${PLATFORMS.p4.name}: ${escape(settings.platform4Url)}\n\n` +
    `👥 الأدمن: ${admins.map((a) => `<code>${a.id}</code>`).join(" · ")}\n` +
    `${RULE}\nاختر ما تريد تعديله:`
  );
}

async function sendAdminPanel(chatId: number, settings: BotSettings) {
  const admins = await listAdmins();
  await sendMessage(
    chatId,
    adminPanel(settings, admins),
    [
      [
        { text: "▶️ تشغيل", callback_data: "admin:on" },
        { text: "⏸ إيقاف", callback_data: "admin:off" },
      ],
      [
        { text: "📢 القناة", callback_data: "admin:edit:channel_url" },
        { text: "🛠 الدعم", callback_data: "admin:edit:support_url" },
      ],
      [
        { text: "🎁 البروموكود", callback_data: "admin:edit:promo_code" },
        { text: "🌐 التطبيق", callback_data: "admin:edit:app_base_url" },
      ],
      [
        { text: PLATFORMS.p1.name, callback_data: "admin:edit:platform_1_url" },
        { text: PLATFORMS.p2.name, callback_data: "admin:edit:platform_2_url" },
      ],
      [
        { text: PLATFORMS.p3.name, callback_data: "admin:edit:platform_3_url" },
        { text: PLATFORMS.p4.name, callback_data: "admin:edit:platform_4_url" },
      ],
      [
        { text: "➕ إضافة أدمن", callback_data: "admin:edit:add_admin" },
        { text: "➖ حذف أدمن", callback_data: "admin:edit:remove_admin" },
      ],
      [{ text: "🔄 تحديث اللوحة", callback_data: "admin:panel" }],
    ],
    true,
  );
}

/** Ask for a value with ForceReply — the field is encoded in the prompt text. */
async function askForValue(chatId: number, field: EditableField) {
  await call("sendMessage", {
    chat_id: chatId,
    text: `✏️ <b>${FIELD_LABEL[field]}</b>\n${SOFT}\nابعت القيمة الجديدة في رد على هذه الرسالة.\n\n<code>#${field}</code>`,
    parse_mode: "HTML",
    reply_markup: { force_reply: true, input_field_placeholder: FIELD_LABEL[field] },
  });
}

function fieldFromPrompt(text?: string): EditableField | null {
  const m = /#([a-z_0-9]+)/.exec(text ?? "");
  const key = m?.[1] as EditableField | undefined;
  return key && key in FIELD_LABEL ? key : null;
}

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Applies a new value for a field. Returns the message to show the admin. */
async function applyFieldValue(field: EditableField, value: string): Promise<string> {
  if (field === "add_admin" || field === "remove_admin") {
    const id = Number(value.replace(/\D/g, ""));
    if (!id || String(id).length < 5) return "⚠️ ابعت ID تليجرام صحيح (أرقام فقط).";
    if (field === "add_admin") {
      await addAdmin(id);
      return `✅ تمت إضافة الأدمن <code>${id}</code>.`;
    }
    if (id === OWNER_TELEGRAM_ID) return "⚠️ لا يمكن حذف المالك.";
    await removeAdmin(id);
    return `✅ تم حذف الأدمن <code>${id}</code>.`;
  }
  if (field === "promo_code") {
    if (!value || value.length > 32) return "⚠️ البروموكود مطلوب وبحد أقصى 32 حرفًا.";
    await updateBotSettings({ promo_code: value });
    return "✅ تم تغيير البروموكود.";
  }
  if (!validHttpUrl(value)) return "⚠️ ابعت رابط كامل يبدأ بـ https://";
  await updateBotSettings({ [field]: value } as any);
  return "✅ تم حفظ الرابط بنجاح.";
}

const COMMAND_FIELDS: Record<string, EditableField> = {
  "/set_channel": "channel_url",
  "/set_support": "support_url",
  "/set_platform1": "platform_1_url",
  "/set_platform2": "platform_2_url",
  "/set_platform3": "platform_3_url",
  "/set_platform4": "platform_4_url",
  "/set_app": "app_base_url",
  "/set_promo": "promo_code",
  "/add_admin": "add_admin",
  "/remove_admin": "remove_admin",
};

const ADMIN_HELP =
  `⚙️ <b>أوامر التحكم</b>\n${RULE}\n` +
  Object.keys(COMMAND_FIELDS)
    .map((c) => `<code>${c} &lt;القيمة&gt;</code>`)
    .join("\n") +
  `\n<code>/admins</code> — عرض الأدمن\n<code>/bot_on</code> · <code>/bot_off</code>\n\nكل تعديل يُحفظ فورًا ويظهر للمستخدمين.`;

async function handleAdminCommand(chatId: number, text: string) {
  const space = text.indexOf(" ");
  const command = (space === -1 ? text : text.slice(0, space)).split("@")[0] ?? "";
  const value = space === -1 ? "" : text.slice(space + 1).trim();

  if (command === "/help" || command === "/commands") {
    await sendMessage(chatId, ADMIN_HELP, undefined, true);
    return true;
  }
  if (command === "/admins") {
    const admins = await listAdmins();
    await sendMessage(
      chatId,
      `👥 <b>الأدمن</b>\n${SOFT}\n` +
        admins.map((a) => `<code>${a.id}</code>${a.label ? ` — ${escape(a.label)}` : ""}`).join("\n"),
      undefined,
      true,
    );
    return true;
  }

  const field = COMMAND_FIELDS[command];
  if (!field) return false;
  if (!value) {
    await askForValue(chatId, field);
    return true;
  }
  const result = await applyFieldValue(field, value);
  await sendMessage(chatId, result, undefined, true);
  await sendAdminPanel(chatId, await getBotSettings());
  return true;
}

/** Resolve @channel from a t.me URL. */
function channelChatId(channelUrl: string): string | null {
  const m = /t\.me\/(?:s\/)?([A-Za-z0-9_]{4,})/.exec(channelUrl ?? "");
  return m?.[1] ? `@${m[1]}` : null;
}

type MembershipResult = "member" | "not_member" | "unavailable";

/** Check membership without treating Telegram permission failures as non-membership. */
async function channelMembership(channelUrl: string, userId?: number): Promise<MembershipResult> {
  const chat = channelChatId(channelUrl);
  if (!chat || !userId) return "unavailable";
  const res = (await call("getChatMember", { chat_id: chat, user_id: userId })) as
    | { ok: boolean; result?: { status?: string; is_member?: boolean } }
    | null;
  if (!res?.ok) return "unavailable";
  const status = res?.result?.status;
  if (
    status === "member" ||
    status === "administrator" ||
    status === "creator" ||
    (status === "restricted" && res.result?.is_member === true)
  ) {
    return "member";
  }
  return "not_member";
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
    // Show the account NAME (first + last), not the @username.
    const name = ([cb.from?.first_name, cb.from?.last_name].filter(Boolean).join(" ") ||
      cb.from?.username) as string | undefined;


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
      await clearFlow(chatId);
      await sendPhoto(chatId, "platforms", T[lang].platform, [
        [
          { text: `${PLATFORMS.p1.emoji} ${PLATFORMS.p1.name}`, callback_data: `plat:${lang}:p1` },
          { text: `${PLATFORMS.p2.emoji} ${PLATFORMS.p2.name}`, callback_data: `plat:${lang}:p2` },
        ],
        [
          { text: `${PLATFORMS.p3.emoji} ${PLATFORMS.p3.name}`, callback_data: `plat:${lang}:p3` },
          { text: `${PLATFORMS.p4.emoji} ${PLATFORMS.p4.name}`, callback_data: `plat:${lang}:p4` },
        ],
      ]);
      return;
    }
    if (action === "plat") {
      const raw = parts[2] ?? "p1";
      const pk = (raw in PLATFORMS ? raw : "p1") as PlatformKey;
      await answerCallback(cb.id);
      await clearFlow(chatId);
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
      const membership = await channelMembership(settings.channelUrl, cb.from?.id);
      if (membership === "unavailable") {
        await answerCallback(cb.id, T[lang].membershipUnavailable, true);
        await sendMessage(chatId, T[lang].membershipUnavailableMsg, [
          [{ text: T[lang].support, url: settings.supportUrl }],
          [{ text: T[lang].verify, callback_data: `verify:${lang}:${id}` }],
        ]);
        return;
      }
      if (membership === "not_member") {
        await answerCallback(cb.id, T[lang].needJoin, true);
        await sendMessage(chatId, T[lang].needJoinMsg, [
          [{ text: T[lang].channel, url: settings.channelUrl }],
          [{ text: T[lang].verify, callback_data: `verify:${lang}:${id}` }],
        ]);
        return;
      }
      await answerCallback(cb.id);
      // Wipe every previous flow message — only the verified card stays.
      await clearFlow(chatId);
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
    flowMessages.delete(chatId);
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
