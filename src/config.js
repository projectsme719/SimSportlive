export const CONFIG = {
  ADMIN_ID: 7566522940, // عدد (Number)
  BOT_USERNAME: 'SimSportBot',
  APP_SHORT_NAME: 'watch', // باید دقیقاً همان Short Name مینی‌اپ در BotFather باشد
  CHANNEL_USERNAME: '@SimSportlive',
  CHANNEL_ID: '@SimSportlive', // یا '-1004402889429'

  YOUTUBE_CHANNELS: [
    'UCqnbDFdMemN41sl5f7bLmgw',
    'UCvy57vY__a4Lp237iWk0f-Q',
    'UCV3awZSj_1nJvgD_z4a4e9A',
    'UCX_YpI2mSiy2T_v7a2eA44w',
  ],

  // آستانه‌های اطمینان هوش مصنوعی
  AUTO_PUBLISH_CONFIDENCE: 85, // بالاتر از این: انتشار خودکار
  REVIEW_CONFIDENCE: 50, // بین این و بالا: ارسال برای تایید ادمین

  // مدل‌ها به ترتیب امتحان می‌شوند (اگر اولی وجود نداشت/بازنشسته شد، بعدی)
  GEMINI_MODEL_FALLBACKS: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'],
};

