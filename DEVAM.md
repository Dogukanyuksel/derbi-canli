# Devam notu (27.11.2026)

Bu dal (`yeni-kurallar`) yarım kalmış bir geliştirmedir. **`main` dalı çalışan ilk prototiptir.** Yeni oturumda Claude'a şunu söyleyin: "DEVAM.md'yi oku ve kaldığın yerden devam et."

## Durum
- [x] `server.js` yeni kurallara göre yeniden yazıldı. Henüz test edilmedi.
- [ ] `public/cards.js`: maç sonu kadro kartı çizicisi. Yazılmadı.
- [ ] `public/game.js`: yeni sunucuya uyarlanmadı. Sunucunun `/api/next-match` cevabı değişti (`current`, `snap`, `hidden`), bu yüzden **oyun ekranı şu an bu dalda çalışmaz**.
- [ ] `public/panel.html`: uyarlanmadı.
- [ ] README güncellenmedi.

## Kararlaştırılan kurallar
- **Takımlar (4):**

  | Ad | Kod | Çağrıştırdığı |
  |---|---|---|
  | Sarı-Kırmızı İstanbul | SKR | GS |
  | Sarı-Lacivert İstanbul | SLV | FB |
  | Siyah-Beyaz İstanbul | SYB | BJK |
  | Bordo-Mavi Karadeniz | BMK | TS |

  Kulüp adı, arması, kuruluş yılı ve marşı kullanılmaz. Takma adlar (gs, cimbom, fb, fener, bjk, kartal, ts, trabzon…) yalnızca yorumdan takım seçmeye yarar. Ekrana yazılmaz, spiker okumaz. Yorumda `1` ev sahibi, `2` deplasman demektir.
- **Sezon:**
  - Çift devreli lig: 12 maç, her akşam 1 maç.
  - 13. akşam ilk iki takım arasında Süper Final. Beraberlikte ligde üstte olan takım şampiyon olur.
  - Ertesi gün yeni sezon otomatik başlar.
  - Yayının açılmadığı bir akşam olursa kalan maçlar birer gün kayar.
- **Program:**

  | Saat | Ne olur |
  |---|---|
  | 19:00 | Takım toplama (10 dk) |
  | 19:10 | 1. yarı (20 dk) |
  | 19:30 | Devre arası (10 dk) |
  | 19:40 | 2. yarı (20 dk) |
  | 2. yarının sonu | En fazla 5 dk uzatma |
  | Sonra | Maç sonu kartları (120 sn) |

  - Fazlar duvar saatine bağlı. Ekran yenilenirse sunucudaki anlık kayıttan (`/api/snapshot`) kaldığı yerden devam eder.
  - Panelden "test maçı" başlatılabilir (kısa süreler, puana sayılmaz). Bugünün maçı programı beklemeden de başlatılabilir.
- **Oran:**
  - Son 60 saniyedeki destek, halat çekme gibi sürekli inip çıkar.
  - Formül: (taban + A) / (2·taban + A + B). Taban yaklaşık 40 beğeni.
  - Oran %20–80 arasında kalır. Takım kırmızı kart görürse gücü ×0,9 olur.
  - 1 coin = 10 beğeni. 100 coin üstü hediyelerde etki azalır: 100 + √(coin − 100) × 10.
  - Maç başında oran %50 / %50'dir. Takım toplamada gelen destek orana yazılmaz, sadece Teknik Direktör sıralamasına sayılır.
- **Gol hiçbir zaman kesin değil:**
  - Oran sadece atak ve şut sıklığını belirler. Şut aralığı yaklaşık `yarıSüre/8 × (0,5/oran)`.
  - Gol ihtimali şut başına yaklaşık %4–17. Hedef ortalama 2–4 gol.
  - Golden başka sonuçlar: kurtarış, dışarı, üstten, direk (dönüşte tekrar şut şansı), bloke, ofsayttan iptal edilen gol.
  - 3 fark açılınca gol ihtimali ×0,55, 5 fark açılınca bir kez daha ×0,5. Bir takım en fazla 10 gol atabilir.
- **Hediyeler:**
  - 99 coin: süper atak. Gol ihtimali ~%36, rakibin son 8 sn'deki beğenisi kaleciyi güçlendirir (%13'e kadar düşer). Takım başına 20 sn bekleme süresi var.
  - 500 coin: +30 sn uzatma. Sadece 2. yarının son 5 dakikasında, en fazla 5 dk. Bu pencerenin dışında süper atak sayılır.
  - 1000 coin: penaltı şansı, ~%75.
- **Oyun olayları:**
  - Hakem figürü, yan hakem bayrağı ve ofsayt.
  - Sarı ve kırmızı kart. Kırmızı kart gören takım 10 kişi kalır.
- **Oyuncu değişikliği:**
  - Puan = coin × 10 + beğeni.
  - Yedekteki biri, sahadaki en düşük puanlıyı %10 farkla geçerse girer.
  - Değişiklik sadece top oyun dışındayken yapılır, takım başına dakikada en fazla bir tane.
  - Akıcı çalışmazsa panelden kapatılır (`subs` ayarı).
- **Teknik Direktör ve kartlar:**
  - Takımın en yüksek puanlısı Teknik Direktör olur, sonraki 11 kişi kartta ilk 11 olarak yer alır (4-4-2).
  - Maç sonunda ekranda kartlar sırayla döner: özet → takım 1 kartı → takım 2 kartı. Kartlar panelden 1080×1350 PNG olarak indirilir.
- **`gizle` / `göster` yorumu:** Kişinin adı her yerde "Gizli Taraftar" olarak görünür. Sunucu bunu `db.hidden` içinde saklar.

## Ekran düzeni (1080×1920)
- **TikTok'un kapattığı alanlar:** Üst kısım (0–170) ve alt kısım (1340 sonrası, yorumlar) boş bırakılır.

| Bölüm | Konum (y) |
|---|---|
| Skor tabelası | 175–325 |
| Oran çubuğu ve sayaçlar (beğeni, coin, taraftar) | 335–445 |
| Sarı katılım şeridi: "Takımını seç: yoruma 1 ya da 2 yaz" | 452–500 |
| Saha | 510–1110 |
| Spiker kabini | 1120–1300 |
| Taraftar listeleri | 1310–1340 |

- **Sahanın üstündeki öğeler:**
  - Solda Teknik Direktör kutuları.
  - Sağda hediye menüsü: beğeni, 1 / 99 / 500 / 1000.
  - Altında hediye bildirimleri.
- **Hukuki uyarı:** Skor tabelasının üst satırında durur: "YZ spiker · ödül yok".

## Sıradaki işler
1. `public/cards.js`: `DerbiCards.lineup(ctx, W, H, data)`. Oyun ekranı ve panel aynı fonksiyonu kullanır.
2. `public/game.js`: büyük revizyon. Mevcut ses, robot ve saha çizimi korunur.
   - Duvar saatiyle fazlar: `prep / h1 / ht / h2 / ft`.
   - 60 sn'lik kova oranı, yeni şut ve gol modeli, süper atak ve kaleci gücü.
   - 500 coin uzatma, hakem ve ofsayt, yumuşak oyuncu değişikliği.
   - Anlık kayıt (10 sn'de bir) ve geri yükleme.
   - Gelen olaylarda `pick` (yorumdan seçilen takım kodu) ve `team` (izleyicinin kayıtlı takımı) alanlarını kullan. `hide` olayını işle.
   - Takım toplama ekranı ve spiker döngüsü.
   - Bekleme ekranı: sıradaki maç ve puan durumu.
   - `?sim=50` ile görüntüsüz toplu simülasyon: gol dağılımını kontrol et, ortalama 2–4 olmalı.
3. `public/panel.html`:
   - Sezon fikstürü ve puan durumu.
   - "Test maçı başlat", "Bugünün maçını şimdi başlat" ve "Programa dön" düğmeleri.
   - Ayarlar: başlama saati, süreler, coin eşikleri, `subs`, hesap adı.
   - Takım takma adlarını düzenleme.
   - Instagram: kadro kartları.
   - Test olaylarında yorum metni `1`, `2`, `gs`, `fb`… olmalı.
4. 500 sahte izleyiciyle stres testi. Akıcılık iyi değilse oyuncu değişikliğini kapat.
5. README'yi Mac kurulumuna göre güncelle: Node kurulumu, `npm install`, `node server.js`, TikTok Studio ya da OBS, Türkçe "Yelda" sesi. Ardından `main`'e birleştir.

## Mac'te çalıştırma (şimdilik main dalı)
```
git clone https://github.com/Dogukanyuksel/derbi-canli.git
cd derbi-canli
npm install
node server.js
```
Panel: http://127.0.0.1:3000 · Oyun: http://127.0.0.1:3000/game.html
