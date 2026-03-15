/**
 * COWORK.ARMY — Agent Karakter Profilleri
 * Her agent'ın skill/role'üne göre 3D görünüm, renk, ikon ve animasyon tipi
 */

export type AnimationType =
  | "typing"       // Klavye başında yazıyor (yazılım, analiz)
  | "analyzing"    // Ekrana bakıp düşünüyor (trader, data)
  | "coordinating" // Sağa sola bakıyor (yönetici, cargo)
  | "treating"     // Öne eğilip işlem yapıyor (medical)
  | "serving"      // Karşılama pozu (hotel, concierge)
  | "scanning"     // Etrafı tarıyor (bot, scraper)
  | "commanding"   // Dik duruyor, kollar açık (CEO, director)
  | "flying";      // Havada süzülüyor (cargo drone)

export type TierType = "CEO" | "DIRECTOR" | "WORKER";

export interface AgentProfile {
  id: string;
  name: string;
  dept: string;
  tier: TierType;
  color: string;           // Departman rengi
  accentColor: string;     // Kişisel vurgu rengi
  glbModel: string;        // /models/*.glb
  animationType: AnimationType;
  skills: string[];
  roleLabel: string;       // Kısa rol açıklaması (3D üzerinde gösterilir)
  roleIcon: string;        // Emoji ikon
  workingEmoji: string;    // Çalışırken düşünce balonunda gösterilir
  idleEmoji: string;       // Beklerken
  scale: number;           // GLB model boyutu (tier'a göre)
  glowRadius: number;      // Aktifken ışık yarıçapı
  // Ofis içindeki masanın özelliği
  deskEquipment: "monitors" | "medical" | "reception" | "server" | "drone_pad" | "throne";
}

// ─── Tüm Agent Profilleri ─────────────────────────────────────────────────────

export const AGENT_PROFILES: Record<string, AgentProfile> = {

  // ═══ CEO ═══
  "ceo": {
    id: "ceo",
    name: "CEO Agent",
    dept: "management",
    tier: "CEO",
    color: "#ffd700",
    accentColor: "#ffaa00",
    glbModel: "/models/ceo.glb",
    animationType: "commanding",
    skills: ["strategic_planning", "system_analysis", "task_generation", "performance_monitoring"],
    roleLabel: "Genel Müdür",
    roleIcon: "👑",
    workingEmoji: "📊",
    idleEmoji: "👑",
    scale: 0.34,   // CEO daha büyük
    glowRadius: 4.5,
    deskEquipment: "throne",
  },

  // ═══ TRADE ═══
  "school-game": {
    id: "school-game",
    name: "SchoolGame",
    dept: "trade",
    tier: "WORKER",
    color: "#00ff88",
    accentColor: "#00cc66",
    glbModel: "/models/school-game.glb",
    animationType: "analyzing",
    skills: ["elliott_wave", "smc_theory", "game_design", "interactive_education"],
    roleLabel: "Eğitim Tasarımcısı",
    roleIcon: "🎓",
    workingEmoji: "📚",
    idleEmoji: "🎮",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "monitors",
  },
  "indicator": {
    id: "indicator",
    name: "Indicator",
    dept: "trade",
    tier: "WORKER",
    color: "#00ff88",
    accentColor: "#00ffcc",
    glbModel: "/models/indicator.glb",
    animationType: "analyzing",
    skills: ["elliott_wave_analysis", "smc_analysis", "funding_rate", "signal_generation"],
    roleLabel: "Teknik Analist",
    roleIcon: "📈",
    workingEmoji: "📈",
    idleEmoji: "🔍",
    scale: 0.24,
    glowRadius: 2.2,
    deskEquipment: "monitors",
  },
  "algo-bot": {
    id: "algo-bot",
    name: "AlgoBot",
    dept: "trade",
    tier: "WORKER",
    color: "#00ff88",
    accentColor: "#44ffaa",
    glbModel: "/models/algo-bot.glb",
    animationType: "typing",
    skills: ["algorithm_design", "backtesting", "bot_deployment", "strategy_optimization"],
    roleLabel: "Algo Geliştirici",
    roleIcon: "🤖",
    workingEmoji: "⚙️",
    idleEmoji: "🤖",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "monitors",
  },

  // ═══ MEDICAL ═══
  "clinic": {
    id: "clinic",
    name: "Clinic",
    dept: "medical",
    tier: "WORKER",
    color: "#00ccff",
    accentColor: "#00eeff",
    glbModel: "/models/clinic.glb",
    animationType: "treating",
    skills: ["patient_management", "room_scheduling", "staff_coordination", "medical_records"],
    roleLabel: "Klinik Yöneticisi",
    roleIcon: "🏥",
    workingEmoji: "🩺",
    idleEmoji: "💊",
    scale: 0.24,
    glowRadius: 2.2,
    deskEquipment: "medical",
  },
  "health-tourism": {
    id: "health-tourism",
    name: "HealthTourism",
    dept: "medical",
    tier: "WORKER",
    color: "#00ccff",
    accentColor: "#66ddff",
    glbModel: "/models/health-tourism.glb",
    animationType: "coordinating",
    skills: ["patient_routing", "medical_travel", "translation", "aftercare_coordination"],
    roleLabel: "Sağlık Turizmi",
    roleIcon: "✈️",
    workingEmoji: "🌍",
    idleEmoji: "✈️",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "medical",
  },
  "manufacturing": {
    id: "manufacturing",
    name: "Manufacturing",
    dept: "medical",
    tier: "WORKER",
    color: "#00ccff",
    accentColor: "#0099cc",
    glbModel: "/models/manufacturing.glb",
    animationType: "analyzing",
    skills: ["manufacturing_analysis", "investment_incentives", "supply_chain", "regulatory_compliance"],
    roleLabel: "Üretim Analisti",
    roleIcon: "🏭",
    workingEmoji: "📦",
    idleEmoji: "🏭",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "medical",
  },

  // ═══ HOTEL ═══
  "hotel": {
    id: "hotel",
    name: "Hotel",
    dept: "hotel",
    tier: "WORKER",
    color: "#ffaa00",
    accentColor: "#ffcc44",
    glbModel: "/models/hotel.glb",
    animationType: "serving",
    skills: ["room_pricing", "booking_management", "guest_experience", "revenue_optimization"],
    roleLabel: "Otel Yöneticisi",
    roleIcon: "🏨",
    workingEmoji: "🛎️",
    idleEmoji: "🏨",
    scale: 0.24,
    glowRadius: 2.2,
    deskEquipment: "reception",
  },
  "flight": {
    id: "flight",
    name: "Flight",
    dept: "hotel",
    tier: "WORKER",
    color: "#ffaa00",
    accentColor: "#ff8800",
    glbModel: "/models/flight.glb",
    animationType: "coordinating",
    skills: ["flight_search", "price_comparison", "booking", "itinerary_planning"],
    roleLabel: "Uçuş Uzmanı",
    roleIcon: "✈️",
    workingEmoji: "🛫",
    idleEmoji: "✈️",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "reception",
  },
  "rental": {
    id: "rental",
    name: "Rental",
    dept: "hotel",
    tier: "WORKER",
    color: "#ffaa00",
    accentColor: "#ffdd88",
    glbModel: "/models/rental.glb",
    animationType: "serving",
    skills: ["fleet_management", "pricing", "insurance", "customer_service"],
    roleLabel: "Araç Kiralama",
    roleIcon: "🚗",
    workingEmoji: "🔑",
    idleEmoji: "🚗",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "reception",
  },

  // ═══ SOFTWARE ═══
  "fullstack": {
    id: "fullstack",
    name: "Fullstack",
    dept: "software",
    tier: "WORKER",
    color: "#cc44ff",
    accentColor: "#ee66ff",
    glbModel: "/models/fullstack.glb",
    animationType: "typing",
    skills: ["react", "nextjs", "fastapi", "postgresql", "typescript", "python"],
    roleLabel: "Fullstack Dev",
    roleIcon: "💻",
    workingEmoji: "⌨️",
    idleEmoji: "💻",
    scale: 0.24,
    glowRadius: 2.2,
    deskEquipment: "server",
  },
  "app-builder": {
    id: "app-builder",
    name: "AppBuilder",
    dept: "software",
    tier: "WORKER",
    color: "#cc44ff",
    accentColor: "#aa22dd",
    glbModel: "/models/app-builder.glb",
    animationType: "typing",
    skills: ["react_native", "electron", "flutter", "game_development", "ui_design"],
    roleLabel: "App Geliştirici",
    roleIcon: "📱",
    workingEmoji: "🎨",
    idleEmoji: "📱",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "server",
  },
  "prompt-engineer": {
    id: "prompt-engineer",
    name: "PromptEngineer",
    dept: "software",
    tier: "WORKER",
    color: "#cc44ff",
    accentColor: "#ff88ff",
    glbModel: "/models/prompt-engineer.glb",
    animationType: "analyzing",
    skills: ["prompt_engineering", "agent_training", "skill_design", "evaluation"],
    roleLabel: "Prompt Mühendisi",
    roleIcon: "🧠",
    workingEmoji: "🤔",
    idleEmoji: "🧠",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "server",
  },

  // ═══ BOTS ═══
  "social-media-manager": {
    id: "social-media-manager",
    name: "SocialMedia",
    dept: "bots",
    tier: "WORKER",
    color: "#ff4466",
    accentColor: "#ff6688",
    glbModel: "/models/social-media-manager.glb",
    animationType: "scanning",
    skills: ["social_media", "content_creation", "crypto_trends", "scheduling", "hashtag_strategy"],
    roleLabel: "Sosyal Medya",
    roleIcon: "📱",
    workingEmoji: "📢",
    idleEmoji: "📱",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "drone_pad",
  },
  "u2algo-manager": {
    id: "u2algo-manager",
    name: "U2AlgoManager",
    dept: "bots",
    tier: "DIRECTOR",
    color: "#ff4466",
    accentColor: "#ff2244",
    glbModel: "/models/u2algo-manager.glb",
    animationType: "coordinating",
    skills: ["platform_management", "seo", "content_strategy", "algo_trading", "user_analytics"],
    roleLabel: "Platform Direktörü",
    roleIcon: "🎯",
    workingEmoji: "📊",
    idleEmoji: "🎯",
    scale: 0.28,   // Director daha büyük
    glowRadius: 2.5,
    deskEquipment: "drone_pad",
  },
  "data-pipeline": {
    id: "data-pipeline",
    name: "DataPipeline",
    dept: "bots",
    tier: "WORKER",
    color: "#ff4466",
    accentColor: "#ea580c",
    glbModel: "/models/data-pipeline.glb",
    animationType: "typing",
    skills: ["etl", "web_scraping", "api_integration", "data_quality", "automation"],
    roleLabel: "Veri Pipeline",
    roleIcon: "🔄",
    workingEmoji: "🔄",
    idleEmoji: "🔄",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "drone_pad",
  },

  // ═══ CARGO ═══
  "cargo": {
    id: "cargo",
    name: "CargoAgent",
    dept: "cargo",
    tier: "DIRECTOR",
    color: "#f472b6",
    accentColor: "#ff88cc",
    glbModel: "/models/cargo.glb",
    animationType: "flying",
    skills: ["file_analysis", "content_routing", "prompt_generation", "department_matching"],
    roleLabel: "Orkestratör",
    roleIcon: "📦",
    workingEmoji: "📦",
    idleEmoji: "📦",
    scale: 0.28,
    glowRadius: 2.5,
    deskEquipment: "drone_pad",
  },
};

// Departman bazli fallback modelleri (bireysel model yoksa kullanilir)
const DEPT_FALLBACK_MODEL: Record<string, string> = {
  management: "/models/trade_agent.glb",
  trade: "/models/trade_agent.glb",
  medical: "/models/medical_agent.glb",
  hotel: "/models/hotel_agent.glb",
  software: "/models/software_agent.glb",
  bots: "/models/bots_agent.glb",
  cargo: "/models/bots_agent.glb",
};

// Runtime cache: hangi bireysel modeller mevcut
const _modelAvailability = new Map<string, boolean>();

/** Bireysel model var mi kontrol et (client-side cache) */
export function checkModelAvailability(agentId: string): Promise<boolean> {
  if (_modelAvailability.has(agentId)) return Promise.resolve(_modelAvailability.get(agentId)!);
  return fetch(`/models/${agentId}.glb`, { method: "HEAD" })
    .then(r => { _modelAvailability.set(agentId, r.ok); return r.ok; })
    .catch(() => { _modelAvailability.set(agentId, false); return false; });
}

/** Sync versiyon: cache'te varsa dondur, yoksa fallback */
export function getModelPath(agentId: string, dept: string): string {
  if (_modelAvailability.get(agentId) === true) return `/models/${agentId}.glb`;
  return DEPT_FALLBACK_MODEL[dept] || "/models/software_agent.glb";
}

/** Agent ID'den profil getir, bulunamazsa varsayilan doner */
export function getAgentProfile(agentId: string): AgentProfile {
  if (AGENT_PROFILES[agentId]) return AGENT_PROFILES[agentId];
  // Kismi eslestirme dene
  const lower = agentId.toLowerCase();
  for (const [key, profile] of Object.entries(AGENT_PROFILES)) {
    if (lower.includes(key) || key.includes(lower)) return profile;
  }
  // Varsayilan
  return {
    id: agentId,
    name: agentId,
    dept: "software",
    tier: "WORKER",
    color: "#818cf8",
    accentColor: "#a5b4fc",
    glbModel: "/models/software_agent.glb",
    animationType: "typing",
    skills: [],
    roleLabel: "Agent",
    roleIcon: "🤖",
    workingEmoji: "⚡",
    idleEmoji: "○",
    scale: 0.24,
    glowRadius: 2.0,
    deskEquipment: "monitors",
  };
}

/** Animasyon tipine göre çalışma pozu açıklaması */
export const ANIMATION_DESCRIPTIONS: Record<AnimationType, string> = {
  typing:       "Klavyede yazıyor",
  analyzing:    "Ekranı analiz ediyor",
  coordinating: "Koordinasyon yapıyor",
  treating:     "İşlem uyguluyor",
  serving:      "Müşteri karşılıyor",
  scanning:     "Veri tarıyor",
  commanding:   "Yönetiyor",
  flying:       "Görev taşıyor",
};
