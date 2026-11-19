export const CONFIG = {
  ADMIN_ID: 7566522940, // عدد (Number)
  BOT_USERNAME: 'SimSportBot',
  APP_SHORT_NAME: 'watch', // باید دقیقاً همان Short Name مینی‌اپ در BotFather باشد
  CHANNEL_USERNAME: '@SimSportlive',
  CHANNEL_ID: '@SimSportlive', // یا '-1004402889429'

  // کانال‌های ثابت یوتیوب (جهانی/عمومی). کانال‌های بیشتر را با /addchannel از داخل ربات اضافه کنید
  YOUTUBE_CHANNELS: [
    'UCqnbDFdMemN41sl5f7bLmgw',
    'UCvy57vY__a4Lp237iWk0f-Q',
    'UCV3awZSj_1nJvgD_z4a4e9A',
    'UCX_YpI2mSiy2T_v7a2eA44w',
  ],

  // رسانه‌های معتبر افغانی: یک بار به‌صورت خودکار پیدا و ذخیره می‌شوند (handle، لینک کانال یا لینک یک ویدیوی آن کانال)
  // بعد از ذخیره، با /removechannel می‌توانید حذفشان کنید و دوباره اضافه نمی‌شوند
  SEED_CHANNELS: [
    'https://youtube.com/@arianasport',
    'https://www.youtube.com/live/idmEKSsNijc',
    'https://youtube.com/@rtasport',
    'https://youtube.com/@tolotv',
    'https://youtube.com/@solh_sports',
    'https://youtube.com/@aif_news',
  ],

  // آستانه‌های اطمینان هوش مصنوعی
  AUTO_PUBLISH_CONFIDENCE: 85, // بالاتر از این: انتشار خودکار
  REVIEW_CONFIDENCE: 50, // بین این و بالا: ارسال برای تایید ادمین

  // ورزش‌هایی که پردازش می‌شوند
  ENABLED_SPORTS: ['mma', 'football', 'futsal', 'cricket', 'other'],

  // فقط لایوهایی که یوتیوب اجازه پخش داخل تلگرام (embed) را داده منتشر شوند
  REQUIRE_EMBEDDABLE: true,
  NOTIFY_ADMIN_NOT_EMBEDDABLE: true, // خبر دادن به ادمین (یک‌بار) برای لایو افغانی غیرقابل‌پخش

  // انتشار فقط وقتی مسابقه واقعاً شروع شده (نه صفحه انتظار)
  START_GATE: {
    ENABLED: true,
    USE_VISION: true, // بررسی فریم زنده با Gemini برای تشخیص «صفحه انتظار» از «مسابقه»
    EARLY_TOLERANCE_MIN: 2, // چند دقیقه زودتر از زمان برنامه‌ریزی‌شده مجاز است
    UNKNOWN_GRACE_MIN: 10, // اگر تصویر قابل تشخیص نبود، چند دقیقه بعد از زمان شروع منتشر شود
    FORCE_AFTER_MIN: 60, // اگر تا این مدت بعد از شروع هنوز «انتظار» تشخیص داده شد، بالاخره منتشر شود
  },
  
    // تقویم مسابقات (KV: MATCH_CALENDAR)
  CALENDAR: {
    TIMEZONE_OFFSET_MIN: 270, // وقت کابل (UTC+4:30)
    REMIND_BEFORE_MIN: 60, // یادآوری در کانال، چند دقیقه قبل از شروع
    EXPIRE_AFTER_MIN: 90, // اگر تا این مدت بعد از شروع لایو پیدا نشد، مسابقه بسته می‌شود
    AUTO_WINDOW_HOURS: 36, // لایوهای زمان‌بندی‌شده تا چند ساعت آینده خودکار به تقویم اضافه شوند
    MAX_AUTO_ANALYSES_PER_RUN: 4, // سقف تحلیل Gemini برای کشف خودکار در هر اجرا
  },
  
  // بعد از پایان لایو، چند دقیقه صبر شود و بعد پست کانال ویرایش و لینک منقضی شود
  END_GRACE_MIN: 5,
  // مدل‌ها به ترتیب امتحان می‌شوند (اگر اولی وجود نداشت/بازنشسته شد، بعدی)
  GEMINI_MODEL_FALLBACKS: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'],
};

// نام نمایشی، ایموجی و هشتگ هر ورزش
export const SPORTS = {
  mma: { label: 'ورزش‌های رزمی', emoji: '🥊', tag: '#رزمی' },
  football: { label: 'فوتبال', emoji: '⚽', tag: '#فوتبال' },
  futsal: { label: 'فوتسال', emoji: '🥅', tag: '#فوتسال' },
  cricket: { label: 'کرکت', emoji: '🏏', tag: '#کرکت' },
  other: { label: 'ورزش', emoji: '🏆', tag: '#ورزش' },
};

// زبان گزارش/پخش (مقدار خالی = نمایش داده نمی‌شود)
export const LANGUAGES = {
  dari: 'دری',
  pashto: 'پشتو',
  english: 'انگلیسی',
  arabic: 'عربی',
  urdu: 'اردو',
  hindi: 'هندی',
  turkish: 'ترکی',
  uzbek: 'ازبکی',
  other: '',
  unknown: '',
};

export const WOMEN_TAG = '#ورزش_بانوان';