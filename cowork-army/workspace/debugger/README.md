# 🔧 Debugger Agent Workspace

Bu agent, COWORK.ARMY sistemindeki hataları otomatik olarak izler ve analiz eder.

## Görevler
- Otonom mod aktifken agent hatalarını tespit et
- 400/500 API hatalarını analiz et
- Kök neden analizi yap
- Düzeltme önerileri üret
- Hata raporlarını `output/` altına kaydet

## Hata Kategorileri
| Kategori | Açıklama |
|---|---|
| API_KEY_MISSING | API anahtarı eksik |
| RATE_LIMIT | Rate limit aşıldı |
| INVALID_PARAMS | Geçersiz parametreler |
| NETWORK_ERROR | Ağ bağlantı hatası |
| LLM_ERROR | LLM API hatası |
| UNKNOWN | Bilinmeyen hata |
