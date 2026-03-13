# COWORK.ARMY Real-Time AI Upgrade Design

**Goal:** To transform COWORK.ARMY from a mock-up into a fully functional, reliable, and intelligent AI agent orchestration platform that executes real tasks in a 3D environment, as per the user's vision.

**Architecture:** The existing FastAPI backend and Next.js frontend will be significantly enhanced. The core change is a shift from a simple request-response LLM pattern to a sophisticated, tool-calling agent architecture. A new `bots` department will be added, and the entire system will be made robust through a new testing infrastructure.

**Tech Stack:** FastAPI, Next.js, PostgreSQL, Docker, Anthropic Claude 3, Google Gemini, `pytest`, `jest`, `ccxt`.

---

### Bölüm 1: Agent Beyin Nakli — Gerçek Araç Kullanımı (Tool-Use)

**Sorun:** Mevcut agent'lar, `runner.py` içinde, sadece LLM'e metin tabanlı sorular sorarak çalışmaktadır. `tools.py` dosyasındaki araç tanımları (`read_file`, `write_file` vb.) hiçbir zaman gerçekten çağrılmamaktadır. Bu durum, agent'ların görevleri sadece yapıyor gibi görünmesine (halüsinasyon) neden olmaktadır.

**Çözüm:**

1.  **Gelişmiş Agent Runner:** `COWORK/backend/agents/runner.py` dosyası, modern LLM'lerin **araç kullanma (tool-calling)** yeteneklerini destekleyecek şekilde sıfırdan tasarlanacaktır. Bu yeni `runner`, şu adımları izleyen bir döngüde çalışacaktır:
    *   Agent, LLM'e görevi ve mevcut araçları sunar.
    *   LLM, bir metin cevabı yerine, kullanmak istediği bir aracın adını ve parametrelerini (`{"tool_name": "read_file", "parameters": {"path": "report.md"}}`) döndürür.
    *   `runner.py`, bu aracı **gerçekten** çalıştırır (örneğin, `tools.py` içindeki `read_file` fonksiyonunu çağırır).
    *   Aracın çıktısı (dosyanın içeriği veya bir hata mesajı) tekrar LLM'e gönderilir.
    *   LLM, bu yeni bilgiyle bir sonraki adımı planlar (belki başka bir araç çağrısı veya son cevabı oluşturma).
    *   Bu döngü, görev tamamlanana kadar devam eder.

2.  **Multi-LLM Desteği:** `COWORK/backend/` içine, `cowork-army` projesindeki gibi, bir `llm_providers.py` katmanı eklenecektir. Bu katman, hem Anthropic Claude 3 hem de Google Gemini için araç kullanma mantığını soyutlayacaktır. `settings.py` ve API üzerinden, hangi LLM'in kullanılacağı kolayca değiştirilebilecektir.

**Sonuç:** Bu bölümün tamamlanmasıyla, agent'lar artık görevleri "yapar gibi" görünmeyecek, `read_file`, `write_file`, `run_command` gibi araçları gerçekten kullanarak somut çıktılar üretecektir. Bu, halüsinasyon sorununu kökünden çözecektir.

### Bölüm 2: Dinamik Yönetici Atama Sistemi

**Sorun:** Mevcut sistemde, tüm görevler önceden tanımlanmış 13 agent'tan birine atanmaktadır. Karmaşık ve yeni bir proje geldiğinde, o projeyi yönetecek özel bir yönetici yoktur.

**Çözüm:**

1.  **Commander Agent'ın Evrimi:** `COWORK/backend/agents/commander.py`'daki görev yönlendirme mantığı geliştirilecektir. `Commander`, bir görevin basit bir iş mi yoksa karmaşık bir proje mi olduğunu ayırt etme yeteneği kazanacaktır.

2.  **Dinamik Yönetici Oluşturma:** Eğer görev karmaşık bir proje ise (örn: "u2algo.com için bir trade botu geliştir"), `Commander` mevcut bir agent'a atama yapmak yerine, veritabanında (`agents` tablosu) o projeye özel yeni bir **Yönetici (Director) Agent** oluşturacaktır.

3.  **Dinamik Yetkinlik Atama:** Bu yeni yönetici agent oluşturulurken, `Commander` görevin tanımını bir LLM'e göndererek, o yöneticinin sahip olması gereken `skills` (yetkinlikler) ve `rules` (kurallar) listesini dinamik olarak ürettirecektir. Örneğin:
    *   **Görev:** "u2algo.com için BTC/USDT paritesinde çalışan bir grid botu geliştir."
    *   **Oluşturulan Yönetici:** `u2algo-grid-bot-manager`
    *   **Atanan Yetkinlikler (`skills`):** `["grid-strategy", "risk-management", "backtesting", "ccxt", "binance-api"]`
    *   **Atanan Kurallar (`rules`):** `["Max drawdown %15'i geçemez", "Her zaman 1 saatlik zaman diliminde çalış"]`

4.  **Delegasyon:** Proje yönetimi artık bu dinamik olarak oluşturulan yönetici agent'a aittir. Yönetici, ana projeyi alt görevlere (örn: "veri topla", "stratejiyi kodla", "backtest yap") böler ve bu görevler için uygun **İşçi (Worker) Agent'ları** (`algo-bot`, `data-ops` vb.) çalıştırır.

**Sonuç:** Her proje, kendi özel gereksinimlerine göre eğitilmiş bir sanal yönetici tarafından yönetilir. Bu, projenin daha organize, verimli ve bağlama uygun bir şekilde ilerlemesini sağlar.

### Bölüm 3: Sistem Geneli İyileştirmeler ve Test

**Sorun:** Projenin hiçbir bölümünde otomatik test bulunmamaktadır. Bu durum, yapılan her değişikliğin sistemi bozma riskini artırmaktadır. Ayrıca, kullanıcı tarafından talep edilen `bots` departmanı eksiktir.

**Çözüm:**

1.  **Test Altyapısı Kurulumu:**
    *   **Backend (`COWORK/backend`):** `pytest` ve `pytest-asyncio` kullanılarak bir test ortamı kurulacaktır. Özellikle Bölüm 1'de geliştirilecek olan yeni `runner.py` ve `tools.py` için kapsamlı birim testleri yazılacaktır. Bu testler, bir agent'ın dosya sistemine yetkisiz erişim yapmaya çalışması veya hatalı bir komut çalıştırması gibi senaryoları kontrol ederek sistemin güvenliğini garanti altına alacaktır.
    *   **Frontend (`COWORK/frontend`):** `jest` ve `React Testing Library` kullanılarak temel component testleri yazılacaktır. Bu testler, 3D sahnenin doğru yüklendiğini ve agent'ların durumlarının (örn: `working`, `idle`) arayüzde doğru bir şekilde yansıtıldığını doğrulayacaktır.

2.  **Yeni Departman: `bots`:**
    *   `COWORK/backend/departments/` dizini altına, `trade`, `medical` gibi diğer departmanlarla aynı yapıda, yeni bir `bots` departmanı oluşturulacaktır.
    *   `departments/registry.py` dosyasına bu yeni departman ve ona ait başlangıç agent'ları (örn: `social-media-bot`, `automation-bot`) eklenecektir.
    *   Bu departman, `u2algo.com` sitesinin yönetimi, sosyal medya otomasyonları veya diğer özel bot görevleri için bir merkez olarak hizmet verecektir.

3.  **Otonom Döngü İyileştirmesi:** `COWORK/backend/agents/autonomous.py`'daki mevcut döngü, sadece bekleyen görevleri başlatmaktadır. Bu döngü, agent'ların genel sağlık durumunu (ortalama görev tamamlama süresi, hata oranları vb.) periyodik olarak kontrol eden ve anormal bir durum tespit ettiğinde (örn: bir agent'ın sürekli hata vermesi) sisteme bir uyarı (event) gönderen bir **Sistem Gözlemcisi (System Observer)** olarak geliştirilecektir.

**Genel Sonuç:** Bu üç bölümlük tasarımın tamamlanması, **COWORK.ARMY** projesini, kullanıcının vizyonuna tam olarak uyan, yani 3D bir sanal ofiste otonom olarak çalışan, gerçek görevleri yerine getiren, dinamik olarak yönetilen ve testlerle güvence altına alınmış, sağlam bir AI agent platformuna dönüştürecektir.
