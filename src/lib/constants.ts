// Shared dropdown values per اللجنة الوطنية specification.

export const REQUEST_TYPES = [
  "طلب مصارفة وتحويل خارجي",
  "طلب مصارفة آجلة - تسميح جمركي",
  "طلب فتح اعتماد",
] as const;

export const COVERAGE_TYPES = ["حوالة", "اعتماد", "تحصيل مستندي"] as const;

export const FX_SOURCES = ["التاجر", "تمويل من البنك"] as const;

export const PAYMENT_TERMS = ["كلي", "جزئي"] as const;

export const REQUEST_CURRENCIES = ["دولار أمريكي", "ريال سعودي"] as const;

export const INVOICE_TYPES = [
  "عقد",
  "فاتورة أولية",
  "فاتورة تجارية",
  "فاتورة تصديرية",
  "فاتورة ضريبية",
  "فاتورة مبيعات",
  "فاتورة نهائية",
  "أخرى",
] as const;

export const INVOICE_CURRENCIES = [
  "USD",
  "SAR",
  "EUR",
  "AED",
  "GBP",
  "CNY",
  "TRY",
] as const;

export const GOODS_CATEGORIES = [
  "مواد غذائية",
  "أدوية ومستلزمات طبية",
  "مشتقات نفطية",
  "قطع غيار",
  "مواد بناء",
  "إلكترونيات",
  "ملابس وأقمشة",
  "كيماويات",
  "أخرى",
] as const;

export const COUNTRIES = [
  "المملكة العربية السعودية",
  "الإمارات العربية المتحدة",
  "مصر",
  "تركيا",
  "الصين",
  "الهند",
  "ألمانيا",
  "الولايات المتحدة الأمريكية",
  "المملكة المتحدة",
  "ماليزيا",
  "إندونيسيا",
  "البرازيل",
  "كينيا",
] as const;

export const ARRIVAL_PORTS = [
  "ميناء عدن (المنطقة الحرة)",
  "ميناء عدن (المعلا)",
  "ميناء عدن (ميناء الزيت)",
  "مطار عدن",
  "ميناء المكلا",
  "ميناء سقطرى",
  "منفذ الوديعة",
  "منفذ شحن",
  "منفذ حوف",
  "منفذ الطوال",
  "منفذ نشطون",
  "منفذ صرفيت",
  "ميناء الحديدة",
  "مطار سيئون",
  "ميناء رأس عيسى",
  "ميناء الصليف",
] as const;

export const INCOTERMS = [
  "CIF",
  "CNF",
  "C&F",
  "FOB",
  "CFR",
  "EXW",
  "CPT",
  "CIP",
  "DAP",
  "FCA",
  "DDP",
  "DPU",
  "FAS",
] as const;

export const UNITS = [
  "كجم",
  "طن",
  "علبة",
  "كرتون",
  "قطعة",
  "لتر",
  "متر",
  "حاوية 20 قدم",
  "حاوية 40 قدم",
] as const;

// 14 documents per spec — required flag based on the spec table.
export type DocSpec = { key: string; label: string; required: boolean };
export const REQUEST_DOCS: DocSpec[] = [
  { key: "stmt_yer_legit", label: "كشف حساب بالريال اليمني (مناطق الشرعية)", required: true },
  { key: "stmt_sar_legit", label: "كشف حساب بالريال السعودي (مناطق الشرعية)", required: true },
  { key: "stmt_usd_legit", label: "كشف حساب بالدولار الأمريكي (مناطق الشرعية)", required: true },
  { key: "stmt_opt1", label: "كشف اختياري 1", required: false },
  { key: "stmt_opt2", label: "كشف اختياري 2", required: false },
  { key: "stmt_yer_other", label: "كشف حساب بالريال اليمني (منطقة أخرى)", required: false },
  { key: "stmt_sar_other", label: "كشف حساب بالريال السعودي (منطقة أخرى)", required: false },
  { key: "stmt_usd_other", label: "كشف حساب بالدولار الأمريكي (منطقة أخرى)", required: false },
  { key: "stmt_other_opt1", label: "كشف اختياري (منطقة أخرى) 1", required: false },
  { key: "stmt_other_opt2", label: "كشف اختياري (منطقة أخرى) 2", required: false },
  { key: "tax_cr_card", label: "البطاقة الضريبية والسجل التجاري", required: true },
  { key: "invoice_doc", label: "الفاتورة", required: true },
  { key: "licenses", label: "التراخيص المطلوبة لبعض السلع", required: false },
  { key: "extras", label: "مستندات إضافية", required: false },
];

// Sectors for linked-companies repeater.
export const COMPANY_SECTORS = [...GOODS_CATEGORIES, "خدمات", "تجارة عامة"] as const;