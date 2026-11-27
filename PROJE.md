# Derbi Canlı: proje belgesi

Bu belge projenin tamamını anlatır: amacı, kuralları, ekranı, hukuki sınırları, teknik yapısı ve sıradaki işler. Bu projede çalışacak bir yapay zekâ (veya geliştirici) **önce bu belgeyi, sonra `DEVAM.md`'yi okumalıdır.**

---

## 1. Proje nedir?

TikTok'ta her akşam canlı yayınlanan, izleyicilerin **beğeni ve hediyeleriyle** yönlendirdiği bir futbol derbisi oyunu.

- **Ekran:** Dikey 1080×1920. OBS veya TikTok Studio'ya "tarayıcı kaynağı" olarak eklenir.
- **İzleyici ne yapar:**
  - Yoruma yazarak takımını seçer.
  - Beğeni ve hediyeyle takımının baskısını artırır.
  - En çok destek verenler sahada formayı giyer, maç sonunda kadro kartında görünür.
- **Spiker:** Kodla çizilmiş bir robot spiker ("Kayra"), maçı Türkçe sesle anlatır. Altyazısı ekranda durur.
- **Sonuçlar:** Fikstüre ve puan durumuna otomatik işlenir. Instagram için hazır görseller üretilir.
- **Esin kaynağı:** TikTok'taki "hediye at, halaya katıl" türü etkileşimli yayınlar. Bu proje aynı mantığı futbol derbisine uyarlar.

### Platform
- **Ana platform TikTok.** Hediye ekonomisi ve Türk kitlesi burada.
- **Kick önerilmez.** Türkiye'de bahisle anılıyor, "derbi + para" bahis şüphesi doğurur.
- YouTube ve Twitch ileride ikinci kanal olabilir.

### Yayın nereden açılacak?
- Her akşam evdeki Mac'ten.
- Ofis ağı TikTok'u engelledi (403), ev ağında denenecek.

---

## 2. Proje sahibiyle çalışma kuralları

Bu projede çalışan yapay zekâ bunlara uymalıdır:

1. **Önce plan, sonra kod.** Proje sahibi onaylamadan kod yazılmaz. Yeni bir özellik veya kural değişikliğinde önce kısa bir plan sunulur, onay beklenir.
2. **Açıklamalar kısa ve Türkçe olur.** Teknik ayrıntıyla boğmadan, "bir arkadaşa anlatır gibi" anlatılır.
3. **Dışarıya bir şey gönderilmez:** Paylaşım, yayın veya mesaj. Proje sahibine sormadan yapılmaz.
4. **Gizli bilgiler diske ve GitHub'a yazılmaz:** API anahtarı, şifre ve yayın anahtarı yalnız bellekte veya ortam değişkeninde tutulur.
5. **Bu belgede gerekçesi yazan kararlar korunur.** Sırf "iyileştirme" diye değiştirilmez. Değiştirmek gerekiyorsa önce sorulur.
6. Başka bir yapay zekânın örnek kodu (örn. Gemini'nin `9_16_dikey...html` dosyası) **sadece fikir** için kullanılır, doğrudan kopyalanmaz.

---

## 3. Oyunun kuralları (izleyiciye anlatılan hali)

> Akşam 19.00'da yayın açılır. Yoruma **1** yazan ev sahibine, **2** yazan deplasmana geçer. 19.10'da maç başlar. Beğeniler ve hediyeler takımının baskısını artırır, ekrandaki yüzde çubuğu bunu gösterir. Baskısı yüksek olan daha çok atak yapar ama gol hiçbir zaman garanti değil. En çok destek veren **Teknik Direktör** olur, sonraki 11 kişi kadroya girer. Maç bitince kadro kartı ekrana gelir, ekran görüntüsü alıp paylaşabilirsin.

### 3.1 Takımlar

| Ekrandaki ad | Kısa ad | Kod | Renkler | Çağrıştırdığı |
|---|---|---|---|---|
| Sarı-Kırmızı İstanbul | Sarı-Kırmızı | SKR | kırmızı `#d4252d` + sarı `#f8c51c` | Galatasaray |
| Sarı-Lacivert İstanbul | Sarı-Lacivert | SLV | lacivert `#16295e` + sarı `#f6d21a` | Fenerbahçe |
| Siyah-Beyaz İstanbul | Siyah-Beyaz | SYB | siyah `#161616` + beyaz `#f2f2f2` | Beşiktaş |
| Bordo-Mavi Karadeniz | Bordo-Mavi | BMK | bordo `#7b1d33` + mavi `#62b5e5` | Trabzonspor |

**Neden 4 takım?** Taraftar anketlerinde (ADA Araştırma 2025, Twentify 2021, Socios) GS, FB, BJK ve TS açık ara önde. 5. veya 6. bir takımın taraftarı az olur, onun oynadığı akşam katılım düşer. 4 takımla her maç büyük maç olur.

**Neden bu adlar?** İnsanlar hangi takımın kastedildiğini anlamalı ama marka hakkı ihlali olmamalı. Renk + şehir adları basında da genel tanım olarak kullanılıyor. Renk tonları gerçek kulüp renkleriyle birebir aynı değil, formalar düz (gerçek forma deseni yok).

**Kesinlikle kullanılmayacaklar:**
- Kulüp adları (Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor).
- Armalar, logolar, kuruluş yılları (1905, 1907, 1903, 1967).
- Hayvan figürleri (aslan, kanarya, kartal).
- Stadyum adları, marşlar, gerçek oyuncu adları.

### 3.2 Takım seçimi (yorumdan)
- **`1` veya `2`:** O akşamki maçta ev sahibi veya deplasman. Ekranda sadece bu yöntem yazılır.
- **Takma adlar:** Sessizce kabul edilir. **Ekrana yazılmaz, spiker okumaz:**
  - SKR: gs, galatasaray, cimbom, galata, aslan, sarı kırmızı, kırmızı
  - SLV: fb, fenerbahçe, fener, kanarya, sarı lacivert, lacivert
  - SYB: bjk, beşiktaş, kartal, çarşı, siyah beyaz, siyah
  - BMK: ts, trabzonspor, trabzon, bordo mavi, bordo, karadeniz
- **Takımı hatırlama:** Seçilen takım sunucuda hatırlanır. Aynı kişi takımı oynadığı başka bir akşam yorum yazmadan beğenirse otomatik o tarafa geçer.
- **Takım seçmeden hediye atan:** O an baskısı düşük olan tarafa yazılır, ekranda "değiştirmek için yorum yaz" notu çıkar.
- **Yorum metni ekranda hiç gösterilmez,** sadece takım seçimi için okunur.

### 3.3 Program (her akşam)

| Saat | Faz | Ne olur |
|---|---|---|
| 19:00–19:10 | Takım toplama | Geri sayım, taraftar listeleri dolar, spiker ısındırır. Destek orana yazılmaz, sadece Teknik Direktör sıralamasına sayılır. |
| 19:10–19:30 | 1. yarı | Ekranda 45 dakika olarak akar. 0–2 dakika doğal uzatma olur. |
| 19:30–19:40 | Devre arası | İstatistikler, spiker yorumu. |
| 19:40–20:00 | 2. yarı | Son 5 dakikada uzatma hediyesi açılır. |
| 20:00–20:05 | Uzatma | Sadece hediyeyle, en fazla 5 dakika. |
| Sonra | Maç sonu | Kartlar 120 sn ekranda döner, sonuç kaydedilir. |

- **Fazlar duvar saatine bağlıdır.** İzleyici olsa da olmasa da maç 19:10'da **%50 / %50** başlar.
- **Ekran yenilenirse** sunucudaki anlık kayıttan kaldığı yerden devam eder.
- **Panelden yapılabilenler:**
  - Bugünün maçını programı beklemeden başlatmak (puana sayılır).
  - Kısa süreli test maçı (puana sayılmaz).
- **Saat ve süreler** panelden değiştirilebilir.

### 3.4 Sezon
- 4 takım çift devreli lig oynar: 12 maç, her akşam 1 maç (yaklaşık 2 hafta).
- **13. akşam: SÜPER FİNAL.** Ligin ilk iki takımı oynar. Beraberlikte ligde üstte olan takım şampiyon olur.
- Final oynandıktan sonraki gün yeni sezon otomatik başlar.
- **Kaçırılan akşam:** Yayın açılmazsa kalan maçlar birer gün ileri kayar, fikstürde boşluk kalmaz.
- **Puanlama:** Galibiyet 3, beraberlik 1. Sıralama: puan, sonra averaj, sonra atılan gol.

### 3.5 Baskı oranı (yüzde çubuğu)
- **Hesap:** Son **60 saniyedeki** destek. Formül: `oran = (taban + A) / (2·taban + A + B)`. Taban yaklaşık 40 beğenidir; az izleyiciyle oran aşırı oynamasın diye vardır.
- **Halat çekme gibi çalışır:** Kim o an daha çok destekliyorsa ibre ona kayar. Destek kesilince 60 saniye içinde etkisi biter, oran %50'ye döner.
- **Eşit destek eşit oran verir:** 100 beğeniye karşı 100 beğeni = %50 / %50.
- **Sınır:** Oran her zaman **%20–80** arasında kalır. Kimse tek başına maçı tamamen ele geçiremez.
- **1 coin = 10 beğeni gücü.** Hediye büyüdükçe etkisi azalır: 100 coin üstü için `100 + √(coin − 100) × 10`. Örnek: 1000 coin ≈ 400 coin etkisi.
- **Kırmızı kart:** Kırmızı kart gören takımın baskısı ×0,9 olur.
- **Ekranda görünenler:** İki takımın yüzdesi, maç boyu toplam beğeni ve coin sayısı, taraftar sayısı.

**Neden böyle?** Para vermeyen izleyici beğeniyle karşılık verebilmeli. "Para kimdeyse o kazanır" oyunu sıkıcıdır ve izleyiciyi kaçırır.

### 3.6 Gol modeli (hiçbir şey kesin gol değil)
- **Oran gol getirmez, atak getirir.** Baskısı yüksek takım daha sık şut çeker.
- **Şut sıklığı:** Takım başına yaklaşık `yarıSüresi/8 × (0,5/oran)` saniyede bir. 20 dakikalık yarıda oran %50 ise yaklaşık 150 sn'de bir.
- **Gol ihtimali:** Şut başına yaklaşık **%4–17** (orana ve pozisyona göre).
- **Golle bitmeyen şutların dağılımı:**

  | Sonuç | Pay |
  |---|---|
  | Kaleci kurtarır | %42 |
  | Dışarı gider | %22 |
  | Bloke edilir | %16 |
  | Üstten gider | %12 |
  | Direkten döner | %8 (%35 ihtimalle dönen topa ikinci şut) |

- **Ofsayt:** Golün yaklaşık %5'i ofsayttan iptal edilir. Penaltı gollerinde iptal olmaz.
- **Kurtarış ve blok sonrası:** Korner gelebilir, kornerde kafa vuruşu olur.
- **Faul:** Ceza sahası önünde frikik olur. Faul ceza sahası içindeyse penaltı çıkabilir.
- **Fark freni:** 3 farkla önde olan takımın gol ihtimali ×0,55, 5 farkla öndeyse bir kez daha ×0,5. Spiker "rehavet" yorumu yapar.
- **Kesin sınır:** Bir takım en fazla **10 gol** atabilir. Hedef ortalama maç başına **2–4 gol.**
- **Ayar kontrolü:** Bu değerler `?sim=50` simülasyonuyla kontrol edilip ayarlanır.

### 3.7 Hediyeler

| Hediye | Etkisi | Gol olma ihtimali |
|---|---|---|
| ❤️ Beğeni | Oranı iter | Sadece atak sıklığını artırır |
| 1 coin (Gül vb.) | 10 beğeni gücü | Sadece atak sıklığını artırır |
| 99+ coin | ⚡ **Süper atak**: top bu takıma geçer, ceza sahasında şut çekilir | ~%36. Rakip son 8 saniyede beğeni yağdırırsa kaleci güçlenir, %13'e kadar düşer. |
| 500+ coin | ⏱ **Uzatma +30 sn** | Yok. Sadece 2. yarının son 5 dakikasında, en fazla 5 dk. Bu pencerenin dışında süper atak sayılır. |
| 1000+ coin | 🎯 **Penaltı şansı** | ~%75. Rakibin beğenisi kaleciyi biraz güçlendirir. |

- **Süper atak sırası:** Takım başına 20 saniyede bir süper atak olur. Fazla gelen hediyeler sadece orana yazılır.
- **Seri hediyeler:** Gül ×15 gibi seriler, seri bitince tek sefer sayılır.
- **Rakip de karşılık verebilir:** Süper atak sırasında ekranda "Rakip: beğen, kaleciyi güçlendir!" yazar. Para vermeyen de karşılık verebilir.
- **Spiker hediye istemez,** sadece nazikçe hatırlatır. Ekranda "20 saniye içinde hediye atmazsan gol olur" gibi bir **baskı sayacı yoktur.** Bu TikTok kurallarına ve etiğe aykırı.

### 3.8 Hakem, kartlar, oyuncu değişikliği
- **Hakemler:** Hakem figürü topu takip eder. Yan hakemler ofsaytta bayrak kaldırır.
- **Kartlar:**
  - Fauldan sarı kart çıkar. İkinci sarı kırmızı karttır. Nadiren direkt kırmızı olur.
  - Kırmızı kart gören oyuncu sahadan çıkar, takım 10 kişi kalır.
  - Ekranda kart animasyonu oynar, spiker anlatır.
- **Sahadaki 11 isim:**
  - Takımı seçen izleyiciler önce boş yerlere yerleşir (forvetten kaleciye doğru).
  - Puan = `coin × 10 + beğeni`.
- **Oyuncu değişikliği:**
  - Yedekteki biri, sahadaki en düşük puanlı oyuncuyu **%10 farkla** geçerse değişiklik hakkı kazanır.
  - Değişiklik **sadece top oyun dışındayken** yapılır (faul, taç, gol sonrası, kart). Takım başına **dakikada en fazla 1** değişiklik olur.
  - 2 saniyelik animasyon oynar, maç durmaz.
- **Akıcılık şartı:** Değişiklik akıcı çalışmazsa panelden kapatılır (`subs` ayarı). O zaman isimler sadece maç sonu kartında görünür. Proje sahibinin şartı: "akıcı çalışmazsa hiç yapmayalım".

### 3.9 Teknik Direktör ve maç sonu kartları
- **Teknik Direktör:** Her takımın o maçtaki en yüksek puanlı izleyicisi. Maç boyunca ekranda canlı olarak görünür.
- **Maç sonu kadro kartı (her takım için bir tane):**
  - **Üstte:** "MAÇIN KADROSU", takım adı, skor, rakip, tarih, sezon/maç no. Sonuç rozeti: GALİBİYET, BERABERLİK veya MAĞLUBİYET.
  - **Teknik Direktör kutusu:** İsim, coin ve beğeni.
  - **Mini saha (4-4-2):** Puan sırasıyla 2.–12. kişiler yerleşir.

    | Puan sırası | Mevki | Forma no |
    |---|---|---|
    | 1–2 | Forvet | 9, 10 |
    | 3–6 | Orta saha | 7, 8, 6, 11 |
    | 7–10 | Defans | 2, 4, 5, 3 |
    | 11 | Kaleci | 1 |

    Boş kalan yer soluk "—" olarak gösterilir.
  - **Altta:** "TikTok'ta her akşam 19.10 · @hesap · kurgusal takımlar · YZ spiker".
- **Ekranda:** Kartlar 120 sn boyunca sırayla döner: özet → ev sahibi kartı → deplasman kartı, her biri 15 sn. Spiker "ekran görüntüsü alıp paylaşabilirsiniz" der.
- **Instagram:** Aynı kartlar panelde 1080×1350 PNG olarak indirilir. Her iki ekranda da aynı çizim kodu (`public/cards.js`) kullanılır.
- **Maçın oyuncusu:** Kazanan takımın Teknik Direktörü. Beraberlikte en yüksek puanlı izleyici.

### 3.10 Gizlilik (`gizle`)
- Yoruma `gizle` yazan kişinin adı her yerde (saha, listeler, kartlar) **"Gizli Taraftar"** olarak görünür.
- `göster` yazarak bunu geri alabilir.
- Küfürlü veya uygunsuz kullanıcı adları ekrana yazılmaz ve okunmaz, yerine "Taraftar" yazılır.

---

## 4. Ekran düzeni (1080×1920)

TikTok canlı yayınında üst kısımda yayıncı bilgisi ve izleyiciler, alt üçte birde yorumlar ve yorum kutusu görünür. Bu alanlara önemli bir şey konmaz.

| Konum (y) | Ne var |
|---|---|
| 0–170 | Boş (TikTok üst bilgisi). Sadece stadyum arka planı. |
| 175–325 | **Skor tabelası:** takım adları ve renkleri, skor, dakika (45+2', 90+3'). Üst satırda sezon/maç no ve "YZ spiker · ödül yok". |
| 335–445 | **Yüzde çubuğu** (%58 / %42). Altında her takım için ❤️ beğeni · 🪙 coin · 👥 taraftar. |
| 452–500 | **Sarı şerit:** "Takımını seç: yoruma 1 ya da 2 yaz · Beğen = baskı" |
| 510–1110 | **Saha** (perspektifli). Üstüne binen öğeler aşağıda. |
| 1120–1300 | **Spiker kabini:** robot spiker ve konuşma balonu (altyazı). |
| 1310–1340 | Taraftar listeleri (son katılanlar). |
| 1340–1920 | TikTok yorum alanı. Burada sadece süs (tribün) var. |

**Sahanın üstüne binen öğeler:**
- **Sol üst:** İki takımın Teknik Direktör kutuları.
- **Sağ üst:** Hediye menüsü (beğeni = baskı · 1 coin = 10 beğeni · 99 süper atak · 500 uzatma · 1000 penaltı).
- **Sol:** Hediye bildirimleri (en fazla 4 satır, birkaç saniyede kaybolur).
- **Oyuncuların üstünde:** Taraftar isim etiketleri.

**Tam ekran anlar:**
- GOOOL! (ışınlar, konfeti, ekran sallanması, tribün sesi).
- Kart animasyonu, PENALTI, SÜPER ATAK, OFSAYT, KORNER, KURTARIŞ, DİREKTEN DÖNDÜ bantları.
- Oyuncu değişikliği kutusu.
- Takım toplama, devre arası ve maç sonu ekranları.

**Bekleme ekranı (maç saati dışında):** Sıradaki maç ve saati ile puan durumu görünür.

**Ses:**
- Tribün uğultusu, düdük ve gol coşkusu kodla üretilir (telifli ses yok).
- Spiker tarayıcının Türkçe sesini kullanır. Mac'te bu "Yelda" sesidir.

---

## 5. Spiker (Kayra)

- **Takım toplamada:** Yaklaşık 20 sn'de bir konuşur. Örnekler: "Bugün büyük maç günü!", "Takımını seçmek için yoruma 1 ya da 2 yaz", "Sarı-Kırmızı tribününde 46 kişi var", "Maç 19.10'da başlıyor".
- **Maç sırasında:**
  - Pas, atak, şut, kurtarış, faul, kart, korner, penaltı ve değişikliği anlatır.
  - Oranı yorumlar: "Sarı-Kırmızı bastırıyor ama Sarı-Lacivert tribünü susmuyor".
  - Küçük hediyeleri tek tek okumaz. Gol, büyük kurtarış ve süper atakta heyecanlanır.
- **Öncelik:** Gol ve kart gibi önemli anlar, sıradan yorumları keser.
- **Ek almayan cümleler:** İsimler cümlede ek almaz ("{isim} vurdu!"), böylece Türkçe ses uyumu bozulmaz.
- **Kendini tanıtırken** yapay zekâ olduğunu söyler. Ekranda "YZ spiker" yazar.

---

## 6. Hukuki sınırlar ve sorumluluklar

Hukuki tavsiye değildir. Vergi için mali müşavire, marka için marka avukatına danışılmalıdır.

| Konu | Kural |
|---|---|
| **Marka** | Kulüp adı, arması, kuruluş yılı, marşı, forma deseni ve oyuncu adı kullanılmaz. Takma adlar sadece yorum okumada kullanılır, ekrana yazılmaz. |
| **Kumar / bahis (7258 sayılı kanun)** | Hediyenin karşılığı sadece oyun içi etkidir. **Para, ödül, çekiliş, gerçek maç tahmini asla eklenmez.** Ekranda "ödül yok" yazar. |
| **TikTok kuralları** | Hediye ısrarla istenmez, baskı sayacı konmaz. Yayında **"Yapay zekâ ile üretilmiş içerik"** etiketi açılır. 18+ ve LIVE erişimi gerekir. İnsansız 7/24 yayın gelir kaybına yol açabilir. Bu yüzden günde bir saat, akşam programı seçildi. |
| **Telif** | Grafik ve sesler kodla üretilir. Telifli müzik çalınmaz. |
| **KVKK** | Kullanıcı adları yayında gösterilir. Seçilen takımlar (`favs`) ve `gizle` listesi sunucuda saklanır. Instagram'a isimli kart konacağı için profilde kısa bir aydınlatma metni olmalı. `gizle` özelliği korunmalı. |
| **Vergi** | GVK mükerrer 20/B: sosyal içerik üreticisi istisna belgesi alınır, bankada içerik üreticisi hesabı açılır, banka %15 stopaj keser. Yıllık sınır aşılırsa şahıs şirketi kurulur. (Proje sahibinin işi.) |

---

## 7. TikTok bağlantısı ve yayın kurulumu

### 7.1 Oyuna canlı olayların gelmesi
- `tiktok-live-connector` kütüphanesi (resmî değil) yayının yorum, beğeni ve hediyelerini okur. Şifre istemez, sadece kullanıcı adı yeterli.
- Panel → Test → TikTok bağlantısı → kullanıcı adı → **Bağlan.**
- **Ofiste:** TikTok 403 verdi. Euler Stream imza servisi de anahtarsız çalışmadı.
- **Evde:** Önce anahtarsız denenir. Olmazsa eulerstream.com'dan anahtar alınır, panele girilir. Anahtar sadece bellekte tutulur.
- **İlk test:** O an canlı olan herhangi bir yayına bağlanıp olayların aktığı görülür, sonra kendi yayına geçilir.

### 7.2 Görüntünün TikTok'a gönderilmesi (Mac)
- **1. yol: TikTok Studio'nun Mac sürümü.** Varlığı kaynaklarda çelişkili. `tiktok.com/studio/download` adresinden kontrol edilir. Uygulama sadece TikTok'un kendi sitesinden indirilir.
- **2. yol: OBS (ücretsiz) + TikTok yayın anahtarı** (stream key; TikTok uygulamasında canlı yayın ayarlarından bakılır).
- **Tarayıcı kaynağı ayarları:**
  - Adres: `http://127.0.0.1:3000/game.html?obs`
  - Boyut: 1080×1920, FPS 60.
  - "Sesi OBS üzerinden kontrol et" açık.

### 7.3 Mac'te kurulum
```
# Node.js 20+ (nodejs.org) ve git kurulu olmalı
git clone https://github.com/Dogukanyuksel/derbi-canli.git
cd derbi-canli
npm install
node server.js
```
- Panel: http://127.0.0.1:3000
- Oyun: http://127.0.0.1:3000/game.html
- Panel şifresi için `ADMIN_KEY=şifre node server.js`. Sunucu dışarı açılacaksa `HOST=0.0.0.0` ve önüne HTTPS.

---

## 8. Instagram

- **Panelin Instagram sekmesinde üretilenler:**
  - Maç sonucu hikâyesi (1080×1920).
  - İki takımın kadro kartı (1080×1350).
  - Puan durumu ve sezon fikstürü gönderisi.
  - Kopyalanabilir açıklama metni.
- **Önerilen düzen:**
  - Her maç sonu: kadro kartları ve sonuç gönderi/hikâyesi.
  - Haftada bir: puan durumu.
  - Sezon başında: fikstür.
  - Sezon sonunda: şampiyon görseli.
- **Otomatik paylaşım:** Instagram Graph API (işletme hesabı + erişim anahtarı) ile ileride eklenebilir. Şimdilik elle yükleniyor.

---

## 9. Teknik yapı

```
server.js          Node.js (bağımlılıksız) HTTP + SSE sunucusu, veri: data/db.json
public/game.html   Oyun ekranı (canvas 1080×1920)
public/game.js     Oyun motoru + çizim + ses + spiker
public/cards.js    Kadro kartı çizici (oyun ve panel ortak) — YAZILACAK
public/panel.html  Yönetim paneli (test, takımlar, fikstür, Instagram, ayarlar)
```

### 9.1 Veri (`data/db.json`, git'e girmez)
`settings`, `teams` (aliases dahil), `season {no, start, matches[], champion}`, `history[]`, `favs {kullanıcı: takımKodu}`, `hidden []`, `override` (elle başlatılan maç), `snap` (canlı maç anlık kaydı).

### 9.2 Ayarlar (`settings`)
`kickoff "19:10"`, `prepMin 10`, `halfMin 20`, `htMin 10`, `cardSec 120`, `superCoins 99`, `extraCoins 500`, `penCoins 1000`, `subs true`, `handle ""`.
Test maçı süreleri: takım toplama 45 sn, devre 180 sn, devre arası 30 sn, kartlar 60 sn.

### 9.3 Sunucu uçları
| Uç | Şifre | Ne yapar |
|---|---|---|
| `GET /events` | – | SSE olay akışı: `comment` (`pick`), `like`, `gift` (`team`), `hide`, `control`, `status`, `settings`, `fixture-updated` |
| `GET /api/next-match` | – | `{now, current:{match, kickoffAt, dur, friendly}, snap, upcoming, standings, settings, hidden, kickoffToday, season}` |
| `POST /api/snapshot` | – | Canlı maçın anlık kaydı `{id, data}` |
| `POST /api/result` | – | Maç sonucu `{id, score, scorers, mom, lineups:[{td, xi}], stats}` |
| `GET /api/state` | – | Panel için tüm durum |
| `POST /api/event` | ✓ | Test olayları ve kontrol komutları |
| `POST /api/tiktok` | ✓ | `{username, eulerKey}` bağlan / `{stop:true}` |
| `POST /api/settings` | ✓ | Ayarları kaydet |
| `POST /api/teams` | ✓ | Takımları kaydet (aliases dahil) |
| `POST /api/season/new` | ✓ | Yeni sezon `{start}` |
| `POST /api/start` | ✓ | `{kind:'today'\|'test', leadSec}` ya da `{cancel:true}` |

- Olay alanları:
  - `pick`: Yorumdan seçilen takım kodu (`1`/`2` dahil, sunucuda çözülür).
  - `team`: Kişinin kayıtlı takımı.
- Yorum metni oyuna hiç gönderilmez.

### 9.4 Oyun motoru notları (`game.js`)
- **Zamanlama:**
  - Fazlar duvar saatinden hesaplanır: `e = (şimdi − kickoffAt)/1000`. Değerler `prep < 0`, `h1`, `ht`, `h2` (`half+ht` sonrası), `ft`.
  - Animasyonlar oyun zamanı `T` ile akar. Kare hızı düşse de oyun gerçek zamanla ilerler (küçük adımlar, en fazla 1 sn telafi).
- **Oran:** 60 adet 1 saniyelik kovada tutulur (`pow[takım][saniye]`).
- **Simülasyon modu (`?sim=N`):** Çizim yapmadan N maç oynatır. Gol dağılımını konsola yazar, `wall()` sanal saat kullanır.
- **Diğer parametreler:**
  - `?obs`: ses düğmesini gizler.
  - `?mute`: spikeri susturur.
  - `?demo`: sahte izleyici olayları üretir.
- **Anlık kayıt:** 10 sn'de bir gönderilir. İçinde skor, golcüler, istatistik, kırmızı kartlar, uzatma, taraftarlar (takım başına en iyi 300) ve sahadaki isimler vardır.

---

## 10. Durum ve yol haritası

- **`main`:** İlk çalışan prototip. 8 kurgusal takım, kısa maçlar, sürekli fikstür, panel, Instagram.
- **`yeni-kurallar`:** Bu belgedeki kurallara geçiş. Ayrıntılı iş listesi `DEVAM.md`'de.

Sıra:
1. `cards.js`
2. `game.js` revizyonu
3. `panel.html` revizyonu
4. Simülasyonla gol ayarı ve 500 sahte izleyiciyle stres testi
5. README güncellemesi
6. `main`'e birleştirme
7. Evde gerçek TikTok testi

**Sonraki aşama fikirleri (onay gerekir):**
- Instagram otomatik paylaşım.
- Daha doğal spiker sesi (Azure, ElevenLabs).
- Sezon sonu şampiyon görseli.
- Maç arası kısa tekrarlar.
