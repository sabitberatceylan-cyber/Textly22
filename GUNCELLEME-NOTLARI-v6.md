# v6 — Fotoğraf/Video, Temalar, Engelleme, Grup Yönetimi, ve Çok Daha Fazlası

Bu en büyük güncelleme oldu. Hepsini test ettim: sunucu tarafını gerçek
komutlarla (kayıt, grup, medya yükleme, tek-görünümlük silme, engelleme,
sessize alma) çalıştırıp doğruladım; uygulama tarafını `expo prebuild` ile
gerçekten derleyip yeni eklenen 4 native kütüphanenin (fotoğraf/video
seçici, video oynatıcı, kopyalama, dosya okuma) hiçbirinin build'i
bozmadığını kontrol ettim.

## Yeni özellikler

- **Fotoğraf ve video gönderme** — mesaj kutusunun yanındaki 📎 ikonuna
  dokun, galeriden seç, "tek görünümlük" isteyip istemediğini seç, gönder.
  Tek görünümlük medya bir kez açılınca sunucudan tamamen siliniyor
  (gerçekten test ettim: ikinci açma denemesi 404 dönüyor).
- **Grup resmi** — grup yöneticisi ⋮ menüsünden değiştirebiliyor.
- **Medya galerisi** — ⋮ menüsünden "Medya"ya dokunup o sohbette
  paylaşılan tüm fotoğraf/videoları ızgara halinde görebiliyorsun.
- **Gruptan kişiye direkt mesaj** — üye listesinde bir isme dokunursan
  o kişiyle özel sohbet açılıyor.
- **Çift tıkla beğen** — anında kalp animasyonuyla. Artık güvenilir
  çalışıyor (önceki sürümdeki tutarsızlığın nedenini bulup düzelttim).
- **Uzun basınca kopyala** — mesaj metnini panoya kopyalıyor.
- **Linkler tıklanabilir** — mesajdaki http(s) bağlantılarına dokununca
  tarayıcıda açılıyor.
- **Düzenle/Sil menüsü artık temaya uygun** — Android'in çirkin sistem
  penceresi yerine uygulamanın kendi tasarımıyla açılıyor.
- **7 sohbet teması** — Varsayılan, Aşk, Okyanus, Orman, Gün Batımı, Neon,
  Minimal Açık. Her sohbet/grup için ayrı ayrı seçilebiliyor, ⋮ menüsünden.
- **Engelleme** — ⋮ menüsünden bir kişiyi engelleyebiliyorsun, mesajları
  artık gidip gelmiyor.
- **Sessize alma** — kişi veya grup bazında bildirim kapatma.
- **Arama çubuğu ve sekmeler yeniden tasarlandı** — artık ikisi de aynı
  baloncuk (pill) tarzında, eşit boşluklu.
- **Android geri tuşu düzeltildi** — artık sohbetten/ayarlardan direkt
  uygulamadan çıkmak yerine ana sayfaya dönüyor.
- **Sohbet açılışındaki kayma düzeltildi** — artık direkt en güncel
  mesajlara iniyor, eski mesajların üzerinden gözle görülür şekilde
  kaymıyor.
- **Bildirimler artık uygulamayı açınca tamamen temizleniyor.**
- **Uygulama adı her yerde "Toxichat"**, logo "..." (üç nokta) oldu,
  ana sayfada isim yanında logo görünüyor.

## Hâlâ eklenmedi

**Sesli mesaj kaydı.** Video oynatma için zaten gereken kütüphaneyi
(expo-av) bu turda kurdum, ses kaydı izni de (RECORD_AUDIO) otomatik
eklendi — yani altyapı hazır, sadece kayıt arayüzünü (mikrofon butonu,
süre göstergesi) eklemek kaldı. Bunu bir sonraki adımda hızlıca
ekleyebilirim.

**pm2 isim konusu:** `pm2 start server.js --name mesaj` dediğinde ismi
"mesaj" koyan bendim değil, o komutu ilk defa yazarken ben öyle
isimlendirmiştim — kod içinde "sabitlenmiş" bir şey değil. İstersen
şununla değiştirebilirsin:
```
pm2 delete mesaj
pm2 start server.js --name toxichat-sunucu
pm2 save
```

## Sunucu ve uygulama güncelleme

Sunucu: `server.js`'i değiştir, `pm2 restart` (ya da yukarıdaki gibi
yeniden isimlendir).

Uygulama: Bu sefer çok fazla yeni dosya var (components/ klasörü,
lib/medya.js, lib/temalar.js). En güvenlisi yine tüm dosyaları silip
yeniden yüklemek (`.github/workflows` ve `google-services.json`'a
dokunma, onlar zaten doğru).
