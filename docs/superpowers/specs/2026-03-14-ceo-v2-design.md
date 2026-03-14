# CEO Agent v2 — Tasarım Dokümanı

**Yazar:** Manus AI
**Tarih:** 14 Mart 2026

---

## 1. Amaç

Mevcut CEO agent, sadece genel sistem durumunu analiz edip görev delege edebiliyor. Bu tasarım, CEO'yu tüm departmanlarda uzman, proaktif olarak iyileştirme önerileri sunan ve bu önerileri hayata geçiren tam kapsamlı bir yöneticiye dönüştürmeyi amaçlamaktadır.

## 2. Mevcut Durum vs. Hedeflenen Durum

| Özellik | Mevcut Durum (v1) | Hedeflenen Durum (v2) |
|---|---|---|
| **Uzmanlık Alanı** | Genel sistem analizi (`get_system_overview`) | Tüm 5 departmanın (Trade, Medical, Hotel, Software, Bots) araçlarına tam erişim |
| **Operasyon Döngüsü** | Her 60 saniyede bir basit görev üretimi | Her 1 saatte bir tam **brainstorming** ve stratejik geliştirme döngüsü |
| **Karar Kalitesi** | Yüzeysel verilere dayalı reaktif görevler | Derinlemesine departman verisi analizi, proaktif iyileştirme önerileri ve önceliklendirme |
| **Hafıza ve Öğrenme** | Durum bilgisi tutulmuyor | Her brainstorming döngüsünün sonuçları `workspace/ceo/` altına kaydedilir, gelecekteki kararlar için referans oluşturur |

## 3. Önerilen Mimari

CEO'nun yeteneklerini genişletmek için yeni araçlar ve güncellenmiş bir operasyonel döngü sunulacaktır.

### 3.1. Yeni CEO Araçları (Tools)

CEO'ya üç yeni temel araç eklenecektir:

| Araç | Açıklama | Çıktı |
|---|---|---|
| `get_dept_deep_dive(dept: str)` | Belirtilen departmana özel derinlemesine veri analizi yapar. (Örn: Trade için son sinyaller, Medical için doluluk oranı) | İlgili departmanın anlık kritik metriklerini içeren bir metin raporu. |
| `brainstorm_improvements(dept: str, context: str)` | LLM'i kullanarak belirli bir departman için 3 adet somut iyileştirme önerisi geliştirir. `get_dept_deep_dive` çıktısı bağlam olarak kullanılır. | Önerileri içeren bir JSON nesnesi. Bu nesne, `workspace/ceo/brainstorm_YYYY-MM-DD.json` dosyasına kaydedilir. |
| `prioritize_and_delegate(improvements: list)` | `brainstorm_improvements` çıktısını alır, önerileri aciliyet ve etki bazında önceliklendirir ve en kritik 2-3 görevi `cargo.delegate_task` aracılığıyla ilgili agent'a atar. | Delege edilen görevlerin bir listesi. |

### 3.2. Güncellenmiş Operasyonel Döngü

CEO'nun otonom döngüsü 60 saniyeden **1 saate (360 tick)** çıkarılacaktır. Her saat başında aşağıdaki adımlar otomatik olarak çalıştırılır:

1.  **Genel Bakış:** `get_system_overview()` ile tüm sistemin genel sağlığı kontrol edilir.
2.  **Derinlemesine Analiz:** Her bir departman için `get_dept_deep_dive()` çalıştırılarak departman özelinde veriler toplanır.
3.  **Brainstorming:** Toplanan veriler bağlam olarak kullanılarak her departman için `brainstorm_improvements()` ile 3 adet iyileştirme önerisi geliştirilir.
4.  **Önceliklendirme ve Delege Etme:** Tüm departmanlardan gelen öneriler `prioritize_and_delegate()` ile tek bir havuzda toplanır, en kritik 2-3 tanesi seçilerek ilgili agent'lara delege edilir.
5.  **Kayıt:** Tüm süreç (analiz, öneriler, delege edilen görevler) `workspace/ceo/` altındaki log dosyasına ve ana sayfada gösterilmek üzere veritabanına kaydedilir.

### 3.3. System Prompt Güncellemesi

CEO'nun `system_prompt`'u, onu tüm departmanlarda (Trade, Medical, Hotel, Software, Bots) yetkin bir uzman olarak konumlandıracak şekilde güncellenecektir. CEO, her departmanın terminolojisine hakim olacak ve o departmanın araçlarını kullanarak analiz yapabilecektir.

## 4. Frontend Entegrasyonu

Kullanıcının isteği doğrultusunda, CEO'nun analiz ve brainstorming sonuçları hem backend log'larında hem de ana sayfada görüntülenecektir.

-   **Ana Sayfa CEO Widget'ı:** Mevcut CEO widget'ına "Son Analiz" adında yeni bir sekme eklenecektir. Bu sekme, son brainstorming döngüsünde üretilen önerileri ve delege edilen görevleri gösterecektir.
-   **Veritabanı:** CEO'nun analiz sonuçları, frontend tarafından kolayca çekilebilmesi için veritabanında özel bir tabloda saklanacaktır.

## 5. Sonuç

Bu tasarımla birlikte CEO agent, basit bir görev üreticiden, organizasyonun tamamını anlayan, proaktif olarak gelişim fırsatları arayan ve bu fırsatları somut görevlere dönüştüren stratejik bir yöneticiye evrilecektir.
