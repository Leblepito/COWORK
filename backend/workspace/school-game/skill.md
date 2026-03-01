# SchoolGame Agent — Skill Dokumani

## Genel Bilgiler

| Alan | Deger |
|---|---|
| **Agent ID** | `school-game` |
| **Departman** | Trade (Borsa) |
| **Rol** | Elliott Wave + SMC Interaktif Egitim Oyunu |
| **Tier** | WORKER |
| **Dil** | Turkce / Ingilizce |

---

## Temel Yetenekler

### 1. Elliott Wave Theory Egitimi

Elliott Wave teorisini sifirdan ileri seviyeye kadar interaktif formatta ogretir.

**Kapsam:**
- 5 impulse dalgasi (Wave 1-5) yapisi ve kurallari
- 3 correction dalgasi (Wave A-B-C) yapisi ve varyasyonlari
- Dalga kurallari: Wave 2 asla Wave 1'in basini gecemez, Wave 3 asla en kisa dalga olamaz, Wave 4 Wave 1'in alanina giremez
- Fibonacci iliskileri: Wave 3 genelde Wave 1'in %161.8'i, Wave 5 genelde Wave 1'in %100'u
- Alt dalga yapilari: Motive (impulse, diagonal) ve Corrective (zigzag, flat, triangle)
- Alternasyon kurali: Wave 2 basit ise Wave 4 kompleks olur (veya tersi)
- Dalga sayim pratigi: Gercek chart uzerinde dalga etiketleme alistirmalari

**Kullanim Ornegi:**

```
INPUT:  "Elliott Wave impulse dalgalarini ogret, seviye: beginner"
OUTPUT: {
  "status": "completed",
  "lesson": {
    "topic": "Elliott Wave - Impulse Dalgalari",
    "level": "beginner",
    "content": "Impulse dalgalari 5 alt dalgadan olusur. Wave 1, 3, 5 trend yonunde hareket ederken, Wave 2 ve 4 duzelme hareketleridir...",
    "quiz": [
      {
        "question": "Impulse yapisinda kac adet dalga vardir?",
        "options": ["3", "5", "8", "13"],
        "correct": 1,
        "explanation": "Impulse yapisi 5 dalgadan olusur: 3 motive dalga (1,3,5) ve 2 corrective dalga (2,4)."
      },
      {
        "question": "Wave 3 hakkinda hangisi DOGRUDUR?",
        "options": [
          "En kisa dalga olabilir",
          "Asla en kisa dalga olamaz",
          "Her zaman en uzun dalgadir",
          "Wave 1'den kisa olmalidir"
        ],
        "correct": 1,
        "explanation": "Elliott Wave kurali: Wave 3 asla en kisa impulse dalgasi olamaz. Genelde en uzundur ama kural sadece en kisa olamayacagidir."
      }
    ]
  },
  "summary": "Impulse dalga yapisi temel dersi tamamlandi. 2 quiz sorusu olusturuldu."
}
```

### 2. Smart Money Concepts (SMC) Egitimi

Kurumsal trader stratejilerini oyunlastirarak ogretir.

**Kapsam:**
- Break of Structure (BOS): Trend devam sinyali, onceki swing high/low'un kirilmasi
- Change of Character (CHoCH): Trend degisim sinyali, trend yonunun tersi kirilma
- Order Blocks (OB): Kurumsal alim/satim bolgesi, son dusus mumu (bullish OB) veya son yukselis mumu (bearish OB)
- Fair Value Gaps (FVG): Uclu mum formasyonunda ortanca mumun govdesinin onceki ve sonraki mumlarin fitilleriyle olusturduğu bosluk
- Liquidity Sweeps: Stop-loss avlama bolgesi, equal highs/lows altinda/ustunde biriken emirler
- Premium ve Discount bolgesi: Fibonacci %50 ustu premium, alti discount
- Institutional Order Flow: Buyuk hacimli islem analizi

**Kullanim Ornegi:**

```
INPUT:  "SMC Order Block konusunda quiz olustur, zorluk: intermediate, 3 soru"
OUTPUT: {
  "status": "completed",
  "lesson": {
    "topic": "Smart Money Concepts - Order Blocks",
    "level": "intermediate",
    "content": "Order Block, buyuk bir fiyat hareketinden onceki son karsi-trend mumudur...",
    "quiz": [
      {
        "question": "Bullish Order Block nasil tanimlanir?",
        "options": [
          "Guclu bir yukselis oncesindeki son dusus mumu",
          "Guclu bir dusus oncesindeki son yukselis mumu",
          "En yuksek hacimli mum",
          "Doji mum formasyonu"
        ],
        "correct": 0,
        "explanation": "Bullish OB, guclu yukari hareket baslamadan onceki son bearish (dusus) mumudur. Bu bolge, kurumsallarin alim yaptigi seviyeyi temsil eder."
      },
      {
        "question": "Bir Order Block'un gecerli sayilmasi icin ne olmalidir?",
        "options": [
          "Fiyat OB'ye 5 kez dokunmalidir",
          "OB sonrasinda guclu bir impulsive hareket olmalidir",
          "OB icinde en az 3 mum olmalidir",
          "OB hacmi ortalamanin altinda olmalidir"
        ],
        "correct": 1,
        "explanation": "Gecerli bir OB, ardindan guclu bir tek yonlu (impulsive) hareket gerektirir. Bu, kurumsal oyuncularin bu seviyede buyuk pozisyon aldigini dogrular."
      },
      {
        "question": "Mitigated Order Block ne anlama gelir?",
        "options": [
          "OB henuz test edilmemistir",
          "Fiyat OB'ye donmus ve bu bolgeyi doldumustur",
          "OB baska bir OB ile cakismaktadir",
          "OB zamanasimina ugramistir"
        ],
        "correct": 1,
        "explanation": "Mitigated OB, fiyatin geri donup bu bolgeyi test ettigi (doldurdugu) anlamina gelir. Mitigate olmus OB'ler genelde artik gecerli degildir."
      }
    ]
  },
  "summary": "SMC Order Block intermediate quiz tamamlandi. 3 soru uretildi."
}
```

### 3. Interaktif Oyun ve Quiz Sistemi

Ogrenme surecini oyunlastirarak motive edici bir deneyim sunar.

**Kapsam:**
- Coktan secmeli quiz olusturma (4 secenek, aciklamali)
- Gorsel chart analiz alistirmasi: "Bu chartda Wave 3 nerede?" turu sorular
- Seviye sistemi: Beginner (0-100 XP), Intermediate (101-500 XP), Advanced (501-1500 XP), Expert (1501+ XP)
- Skor ve ilerleme takibi: Dogru cevap +20 XP, yanlis cevap +5 XP (aciklama okuma puani)
- Streak bonusu: Art arda 3 dogru = 2x XP, 5 dogru = 3x XP
- Konu bazli ilerleme yuzdesi
- Zorluk adaptasyonu: Basarili ogrenciye otomatik zorluk artisi

**Kullanim Ornegi:**

```
INPUT:  "Beginner icin Elliott Wave + SMC karisik 5 soruluk quiz olustur"
OUTPUT: {
  "status": "completed",
  "lesson": {
    "topic": "Elliott Wave + SMC Karisik Quiz",
    "level": "beginner",
    "content": "Bu quiz hem Elliott Wave hem de SMC temellerini test eder.",
    "quiz": [
      {
        "question": "Elliott Wave teorisinde toplam kac dalga vardir (impulse + correction)?",
        "options": ["5", "8", "3", "13"],
        "correct": 1,
        "explanation": "5 impulse + 3 correction = toplam 8 dalga bir tam dongu olusturur."
      },
      {
        "question": "SMC'de CHoCH ne anlama gelir?",
        "options": [
          "Trend devam sinyali",
          "Trend degisim sinyali",
          "Hacim artisi",
          "Fiyat boslugu"
        ],
        "correct": 1,
        "explanation": "Change of Character (CHoCH), mevcut trend yonunun degistigini gosteren bir yapisal kirilmadir."
      }
    ]
  },
  "summary": "Karisik quiz olusturuldu. 5 soru (3 EW + 2 SMC)."
}
```

### 4. Ders Plani ve Mufredat Olusturma

Sistematik egitim planlari uretir.

**Kapsam:**
- Haftalik/aylik ders planlari
- Konu siralama: Temelden ileriye dogru progressif yapi
- Onkosul kontrolu: Bir konuya gecmeden once gereken bilgi seviyesi
- Tekrar planlama: Spaced repetition mantigi ile bilgi pekistirme

**Kullanim Ornegi:**

```
INPUT:  "4 haftalik Elliott Wave egitim plani olustur"
OUTPUT: {
  "status": "completed",
  "curriculum": {
    "title": "Elliott Wave Mastery - 4 Hafta",
    "weeks": [
      {
        "week": 1,
        "topic": "Temeller",
        "lessons": ["Dalga Teorisi Giris", "Impulse Yapisi", "Corrective Yapisi"],
        "quiz_count": 3,
        "target_xp": 100
      },
      {
        "week": 2,
        "topic": "Kurallar ve Kilavuzlar",
        "lessons": ["3 Temel Kural", "Fibonacci Iliskileri", "Alternasyon"],
        "quiz_count": 4,
        "target_xp": 200
      },
      {
        "week": 3,
        "topic": "Pratik Uygulama",
        "lessons": ["Gercek Chart Analizi", "Dalga Sayim Pratigi", "Hata Tespiti"],
        "quiz_count": 5,
        "target_xp": 350
      },
      {
        "week": 4,
        "topic": "Ileri Seviye",
        "lessons": ["Alt Dalga Yapilari", "Coklu Timeframe", "Elliott + SMC Entegrasyonu"],
        "quiz_count": 5,
        "target_xp": 500
      }
    ]
  },
  "summary": "4 haftalik mufredat olusturuldu. Toplam 12 ders, 17 quiz, hedef 500 XP."
}
```

---

## Sinirlamalar

1. **Finansal tavsiye vermez.** Egitim amaclidir; "su coini al/sat" gibi yonlendirmeler yapmaz.
2. **Gercek zamanli piyasa verisi kullanmaz.** Chart analiz alistirmalari tarihsel veya sentetik veriye dayanir.
3. **Otomatik islem gerceklestirmez.** Sadece egitim icerigi uretir.
4. **Sinyal uretmez.** Sinyal ihtiyaci icin `indicator` agentina yonlendirir.
5. **Kod yazmaz.** Bot gelistirme ihtiyaci icin `algo-bot` agentina yonlendirir.
6. **Maksimum quiz boyutu:** Tek seferde en fazla 20 soru uretir.
7. **Desteklenen diller:** Turkce ve Ingilizce. Diger dillerde icerik uretmez.
8. **XP ve skor verileri oturum bazlidir;** kalici kullanici profili tutmaz, ancak JSON formatinda disari aktarilabilir.
9. **Gorsel chart gostermez.** Metin tabanli aciklamalar yapar; gorsel materyal frontend tarafindan render edilir.
