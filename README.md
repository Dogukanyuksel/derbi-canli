# Derbi Canlı

Hediye ve beğeniyle akan, yapay zekâ spikerli canlı yayın futbol oyunu. Dikey (1080×1920) ekran için yapıldı. OBS'e ya da TikTok LIVE Studio'ya tarayıcı kaynağı olarak eklenir.

## Nasıl çalışır?

- **Takım seçimi:** İzleyici yorumlara takım kodunu yazar (ör. `KZL`) ve o takımın tribününe geçer. Bir sonraki maçta takımı yine oynuyorsa otomatik olarak aynı tarafa yazılır.
- **Baskı oranı:** Beğeniler ve hediyeler takımın **baskı** oranını artırır. Ekrandaki çubuk iki takımın payını yüzde olarak gösterir (%100 = ikisinin toplamı). Oyun bu orana göre kendiliğinden akar: pas, top kaybı, şut ve gol olasılıkları bu orandan hesaplanır. Ekranda "10 sn bekleyin" gibi bir sayaç çıkmaz.
- **Hediye büyüklüğü:**
  - **Küçük hediye:** Bağışçının sahadaki oyuncusu bir sonraki pası alır.
  - **≥ 99 coin:** ⚡ **Büyük atak**. Top bu takıma geçer ve hemen şut denenir.
  - **≥ 1000 coin:** **Penaltı**.
- **Sonuç garanti edilmez.** Hediye yalnızca olasılığı artırır. Para kimin elindeyse onun kazandığı sıkıcı bir oyun olmasın diye böyle kuruldu.
- **Sahadaki isimler:** En çok destek veren 11 izleyici formayı giyer ve ismi sahada görünür. Biri, sahadaki en az destek vermiş oyuncuyu geçerse **oyuncu değişikliği** animasyonuyla oyuna girer.
- **Olaylar:** Gol, sarı/kırmızı kart, kurtarış, korner, penaltı, uzatma, devre arası ve maç sonu ekranları var.
- **Yapay zekâ spiker "Kayra":**
  - Kodla çizilmiş bir robot spiker olayları anlatır.
  - Altyazısı her zaman ekranda görünür.
  - Sesi bilgisayarın Türkçe sesiyle okunur.
- **Ses efektleri:** Tribün, düdük ve gol sesleri kodla üretilir, telifli ses kullanılmaz.
- **Maç sonu:** Sonuç, fikstüre ve puan durumuna otomatik işlenir. Ardından fikstürdeki sıradaki maç başlar.

## Çalıştırma

Gerekenler: Node.js 20 veya üstü.

```powershell
node server.js
```

| Adres | Ne işe yarar |
|---|---|
| `http://127.0.0.1:3000/` | Panel: test olayları, takımlar, fikstür, puan durumu, Instagram görselleri, ayarlar |
| `http://127.0.0.1:3000/game.html` | Oyun ekranı |
| `http://127.0.0.1:3000/game.html?obs` | OBS için (ses butonu gizli) |
| `http://127.0.0.1:3000/game.html?demo` | Sahte izleyicilerle kendi kendine oynar (deneme için) |

### TikTok'a bağlanma

```powershell
npm install
node server.js
```

Ardından **Panel → Test → TikTok bağlantısı** bölümüne kullanıcı adını yazıp **Bağlan**'a basın. Panelin üst kısmında gelen yorum, beğeni ve hediye sayıları görünür.

İsterseniz kullanıcı adını başlatırken de verebilirsiniz: `$env:TIKTOK_USERNAME="kullaniciadi"; node server.js`.

**Euler Stream anahtarı:**
- Test bilgisayarında TikTok doğrudan isteklere **403** (engellendi) döndürdü.
- Bu durumda kütüphane bağlantıyı Euler Stream adlı imza servisi üzerinden kurar, bu servis de **API anahtarı** ister.
- Anahtarı eulerstream.com'dan alın. Panele girin ya da `EULER_API_KEY` ortam değişkenine yazın. Panelden girilen anahtar diske kaydedilmez, sunucu yeniden başlayınca tekrar girmek gerekir.

- Yayın açılınca bağlanır. Bağlantı koparsa kendisi tekrar dener.
- Şifre istenmez.
- Kullanılan kütüphane (`tiktok-live-connector`) **resmî değildir**. TikTok bir güncelleme yaparsa bozulabilir, o durumda kütüphanenin güncellenmesi gerekir.
- **Gerçek bir TikTok yayınıyla henüz test edilmedi.** İlk denemeyi kısa bir test yayınında yapın.

### OBS / TikTok LIVE Studio

1. Tarayıcı kaynağı ekleyin: URL `.../game.html?obs`, genişlik 1080, yükseklik 1920.
2. "Sesi OBS üzerinden kontrol et" seçeneğini açın.
3. LIVE Studio'da: **Kaynak ekle → Link**.

## Hangi platform?

**Başlangıç için TikTok.**

| Platform | Değerlendirme |
|---|---|
| **TikTok** | Hediye ekonomisi yerleşik ve Türk kitlesi burada. Hediyeyle oynanan oyun kültürü de var (halay/horon yayınları). Ana platform bu olmalı. |
| Twitch | 7/24 oyun yayınına uygun ama Türkiye'de Bits geliri düşük. İkinci kanal olur. |
| YouTube Live | Super Chat var. İkinci kanal olur. |
| Kick | Türkiye'de kumar/bahis yayınlarıyla anılıyor. "Derbi + para" algısı bahis şüphesi doğurur. **Önermiyorum.** |

Oyun olayları platformdan bağımsız bir yapıda (yorum / beğeni / hediye). İleride YouTube veya Twitch bağlantısı eklenebilir.

## 7/24 sunucu

Kendi sunucunuzda kurmak için:

1. **Sunucu programı:** `node server.js`, servis olarak sürekli çalışır. Panel şifresi için `ADMIN_KEY` tanımlayın. Dışarıya açacaksanız `HOST=0.0.0.0` yapın ve önüne HTTPS koyun.
2. **Görüntüyü yayına göndermek:** İki yol var:
   - **Windows sunucu + TikTok LIVE Studio veya OBS:** En kolayı.
   - **Linux sunucu + başsız Chrome + ffmpeg:** RTMP ile TikTok'a gönderilir. Bunun için TikTok'un **yayın anahtarı (stream key)** vermesi gerekir. Bu anahtar her hesaba verilmiyor.
3. **Önce bunu öğrenmem gerek:** Sunucunuzun işletim sistemi ve ekran kartı, ve TikTok hesabınızda yayın anahtarı olup olmadığı.

Günde 50 maç mümkün. Varsayılan ayarla bir maç yaklaşık 8,5 dakika sürüyor (saatte ~7 maç). Devre süresi panelden değiştirilir.

## Spiker sesi

- **Şu an:** Windows'un Türkçe sesi kullanılıyor (Microsoft Tolga / Emel; Edge'de daha doğal "Online" sesler var).
- **Bilinmeyen:** OBS içindeki tarayıcının bu sesi çalıp çalmadığını henüz test etmedim. Çalmazsa altyazı yine görünür.
- **Önerilen sonraki adım:** Daha doğal ve heyecanlı bir ses için ücretli bir ses servisi (Azure TTS, ElevenLabs) bağlamak. Bunun için API anahtarı gerekir.

## Hukuk kontrol listesi

Hukuki tavsiye değildir. Vergi için mutlaka bir mali müşavire danışın.

**Kodda zaten çözülenler:**
- [x] **Marka:** Takımlar kurgusal. Panel, gerçek kulüp adı girilince uyarır. Gerçek kulüp adı, logosu veya forma deseni kullanmayın.
- [x] **Telif:** Grafikler ve sesler kodla üretiliyor. Telifli müzik yok.
- [x] **Kumar / bahis (7258 sayılı kanun):** Hediyenin karşılığı yalnızca oyun içi bir etki, para veya ödül verilmiyor. Ekranda da yazıyor. Gerçek maç tahmini veya ödüllü çekiliş **eklemeyin**.
- [x] **Yapay zekâ beyanı:** Spikerin yapay zekâ olduğu ekranda açıkça yazıyor. TikTok'ta "Yapay zekâ ile üretilmiş içerik" etiketini de açın.
- [x] **Uygunsuz isimler:** Küfürlü ve uygunsuz kullanıcı adları ekrana basılmaz ve okunmaz. Yorum metinleri hiç gösterilmez.

**Sizin yapmanız gerekenler:**
- [ ] **Vergi:** GVK mükerrer 20/B kapsamında istisna belgesi alın ve bankada sosyal içerik üreticisi hesabı açın. Banka gelirden %15 keser. Yıllık sınır aşılırsa şahıs şirketi kurmanız gerekir.
- [ ] **TikTok kuralları:**
  - 18+ ve LIVE erişimi gerekiyor.
  - İnsansız 7/24 yayın, monetizasyon kurallarında "düşük kaliteli / otantik olmayan içerik" sayılabilir. Bu yüzden belirli saatlerde bir insanın yayında olmasını öneririm.
  - Hediyeyi ısrarla istemeyin. Spiker de bu yüzden yalnızca nazik hatırlatma yapıyor.
- [ ] **KVKK:** Kullanıcı adları yalnızca yayın sırasında gösteriliyor. Kalıcı bir liste tutacaksanız bir aydınlatma metni ekleyin.

## Instagram

Panelin Instagram sekmesinde şunlar var:
- Maç sonucu hikâyesi (1080×1920)
- Günün sonuçları ve günün fikstürü (1080×1350, 12 maçta bir sayfa)
- Puan durumu
- Kopyalanabilir açıklama metni

**Önerilen paylaşım düzeni:** Her maç sonucunu **hikâyede**, gün sonu özetini **gönderide** paylaşın. Günde 50 gönderi hesabı spam'e düşürür.

**Otomatik paylaşım:** Instagram Graph API (işletme hesabı + erişim anahtarı) ile eklenebilir. Henüz yapılmadı.
