// نام فارسی تیم‌ها. کلید = نامی که ESPN می‌دهد. اگر تیمی اینجا نبود، نام انگلیسی نشان داده می‌شود.
// برای افزودن تیم، یک خط تازه بنویسید.
export const TEAMS_FA = {
  // انگلیس
  'Arsenal': 'آرسنال', 'Aston Villa': 'استون‌ویلا', 'AFC Bournemouth': 'بورنموث', 'Bournemouth': 'بورنموث',
  'Brentford': 'برنتفورد', 'Brighton & Hove Albion': 'برایتون', 'Burnley': 'برنلی', 'Chelsea': 'چلسی',
  'Crystal Palace': 'کریستال‌پالاس', 'Everton': 'اورتون', 'Fulham': 'فولام', 'Leeds United': 'لیدزیونایتد',
  'Liverpool': 'لیورپول', 'Manchester City': 'منچسترسیتی', 'Manchester United': 'منچستریونایتد',
  'Newcastle United': 'نیوکاسل', 'Nottingham Forest': 'ناتینگهام‌فارست', 'Sunderland': 'ساندرلند',
  'Tottenham Hotspur': 'تاتنهام', 'West Ham United': 'وستهام', 'Wolverhampton Wanderers': 'ولوزهمپتون',
  // اسپانیا
  'Real Madrid': 'رئال‌مادرید', 'Barcelona': 'بارسلونا', 'Atlético Madrid': 'اتلتیکومادرید', 'Atletico Madrid': 'اتلتیکومادرید',
  'Sevilla': 'سویا', 'Valencia': 'والنسیا', 'Villarreal': 'ویارئال', 'Real Betis': 'رئال‌بتیس',
  'Real Sociedad': 'رئال‌سوسیداد', 'Athletic Club': 'اتلتیک‌بیلبائو', 'Girona': 'خیرونا', 'Celta Vigo': 'سلتاویگو',
  'Osasuna': 'اوساسونا', 'Getafe': 'ختافه', 'Rayo Vallecano': 'رایووایکانو', 'Mallorca': 'مایورکا',
  'Espanyol': 'اسپانیول', 'Alavés': 'آلاوس', 'Elche': 'التچه', 'Levante': 'لوانته', 'Real Oviedo': 'اوویدو',
  // آلمان
  'Bayern Munich': 'بایرن‌مونیخ', 'Borussia Dortmund': 'دورتموند', 'RB Leipzig': 'لایپزیگ',
  'Bayer Leverkusen': 'لورکوزن', 'Eintracht Frankfurt': 'آینتراخت‌فرانکفورت', 'VfB Stuttgart': 'اشتوتگارت',
  'Borussia Mönchengladbach': 'مونشن‌گلادباخ', 'VfL Wolfsburg': 'ولفسبورگ', 'SC Freiburg': 'فرایبورگ',
  'Werder Bremen': 'وردربرمن', 'Union Berlin': 'اونیون‌برلین', 'TSG Hoffenheim': 'هوفنهایم', 'Mainz': 'مینز',
  'FC Augsburg': 'آگسبورگ', '1. FC Köln': 'کلن', 'Hamburg SV': 'هامبورگ', 'St. Pauli': 'سنت‌پائولی', 'Heidenheim': 'هایدنهایم',
  // ایتالیا
  'Juventus': 'یوونتوس', 'AC Milan': 'میلان', 'Inter Milan': 'اینتر', 'Internazionale': 'اینتر', 'Napoli': 'ناپولی',
  'AS Roma': 'رم', 'Roma': 'رم', 'Lazio': 'لاتزیو', 'Atalanta': 'آتالانتا', 'Fiorentina': 'فیورنتینا',
  'Bologna': 'بولونیا', 'Torino': 'تورینو', 'Genoa': 'جنوا', 'Udinese': 'اودینزه', 'Cagliari': 'کالیاری',
  'Parma': 'پارما', 'Como': 'کومو', 'Lecce': 'لچه', 'Sassuolo': 'ساسوئولو', 'Hellas Verona': 'ورونا',
  'Cremonese': 'کرمونزه', 'Pisa': 'پیزا',
  // فرانسه
  'Paris Saint-Germain': 'پاری‌سن‌ژرمن', 'Marseille': 'مارسی', 'Lyon': 'لیون', 'AS Monaco': 'موناکو', 'Monaco': 'موناکو',
  'Lille': 'لیل', 'Nice': 'نیس', 'Lens': 'لنس', 'Rennes': 'رن', 'Strasbourg': 'استراسبورگ', 'Nantes': 'نانت',
  'Toulouse': 'تولوز', 'Brest': 'برست', 'Reims': 'رمس', 'Auxerre': 'اوسر', 'Angers': 'آنژه', 'Le Havre': 'لوهاور',
  'Lorient': 'لوریان', 'Metz': 'متز', 'Paris FC': 'پاریس‌اف‌سی',
  // اروپا
  'Benfica': 'بنفیکا', 'Porto': 'پورتو', 'Sporting CP': 'اسپورتینگ', 'Ajax': 'آژاکس', 'PSV Eindhoven': 'پی‌اس‌وی',
  'Celtic': 'سلتیک', 'Galatasaray': 'گالاتاسرای', 'Fenerbahçe': 'فنرباغچه', 'Club Brugge': 'کلوب‌بروژ',
  'Olympiacos': 'المپیاکوس', 'Shakhtar Donetsk': 'شاختار', 'Slavia Prague': 'اسلاویا‌پراگ',
  'Red Bull Salzburg': 'ردبول‌سالزبورگ', 'Bodø/Glimt': 'بودو‌گلیمت', 'Union Saint-Gilloise': 'یونیون‌سن‌ژیلواز',
  'Copenhagen': 'کپنهاگ', 'Qarabağ': 'قاراباغ', 'Pafos': 'پافوس', 'Kairat Almaty': 'کایرات',
};
