// Sunucuyla HTTP uzerinden konusan yardimci fonksiyonlar.
// Her fonksiyon { tamam: true, ... } ya da { tamam: false, hata: '...' } dondurur.
import * as FileSystem from 'expo-file-system';

async function govdeliIstek(url, gövde) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gövde),
    });
    const veri = await res.json().catch(() => ({}));
    if (!res.ok) return { tamam: false, hata: veri.hata || `Sunucu hatasi (${res.status})` };
    return { tamam: true, ...veri };
  } catch (e) {
    return { tamam: false, hata: 'Sunucuya ulasilamadi. Adresi kontrol et.' };
  }
}

async function getIstek(url) {
  try {
    const res = await fetch(url);
    const veri = await res.json().catch(() => ({}));
    if (!res.ok) return { tamam: false, hata: veri.hata || `Sunucu hatasi (${res.status})` };
    return { tamam: true, veri };
  } catch (e) {
    return { tamam: false, hata: 'Sunucuya ulasilamadi. Adresi kontrol et.' };
  }
}

export function kayitOl(sunucuAdres, kullanici, sifre, dogumTarihi = null) {
  return govdeliIstek(`${sunucuAdres}/kayit-ol`, { kullanici, sifre, dogumTarihi });
}

export function girisYap(sunucuAdres, kullanici, sifre) {
  return govdeliIstek(`${sunucuAdres}/giris`, { kullanici, sifre });
}

export async function kullanicilariGetir(sunucuAdres, kullanici, sifre) {
  const sonuc = await getIstek(
    `${sunucuAdres}/kullanicilar?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`
  );
  if (!sonuc.tamam) return sonuc;
  return { tamam: true, liste: sonuc.veri };
}

export async function gruplariGetir(sunucuAdres, kullanici, sifre) {
  const sonuc = await getIstek(
    `${sunucuAdres}/gruplarim?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`
  );
  if (!sonuc.tamam) return sonuc;
  return { tamam: true, liste: sonuc.veri };
}

export function grupOlustur(sunucuAdres, kullanici, sifre, isim, uyeler) {
  return govdeliIstek(`${sunucuAdres}/grup-olustur?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`, {
    isim,
    uyeler,
  });
}

export function grupUyeEkle(sunucuAdres, kullanici, sifre, grupId, yeniUye) {
  return govdeliIstek(
    `${sunucuAdres}/grup-uye-ekle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { grupId, yeniUye }
  );
}

export function grupUyeCikar(sunucuAdres, kullanici, sifre, grupId, uye) {
  return govdeliIstek(
    `${sunucuAdres}/grup-uye-cikar?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { grupId, uye }
  );
}

export function grupResimGuncelle(sunucuAdres, kullanici, sifre, grupId, resimUrl) {
  return govdeliIstek(
    `${sunucuAdres}/grup-resim-guncelle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { grupId, resimUrl }
  );
}

export function medyaYukle(sunucuAdres, kullanici, sifre, veriBase64, mimeTuru) {
  return govdeliIstek(
    `${sunucuAdres}/medya-yukle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { veriBase64, mimeTuru }
  );
}

// Büyük dosyalar ve videolar için bellek tüketmeyen doğrudan akışlı yükleme (OOM engeller)
export async function dosyaYukleDirekt(sunucuAdres, kullanici, sifre, dosyaUri, mimeTuru) {
  try {
    const url = `${sunucuAdres}/medya-dosya-yukle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`;
    const yukleSonuc = await FileSystem.uploadAsync(url, dosyaUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': mimeTuru || 'application/octet-stream',
      },
    });

    if (yukleSonuc.status >= 200 && yukleSonuc.status < 300) {
      let veri;
      try { veri = JSON.parse(yukleSonuc.body); } catch { veri = {}; }
      return { tamam: true, url: veri.url, dosya: veri.dosya };
    }
    let hata = 'Yükleme başarısız';
    try {
      const errJson = JSON.parse(yukleSonuc.body);
      if (errJson.hata) hata = errJson.hata;
    } catch {}
    return { tamam: false, hata };
  } catch (e) {
    return { tamam: false, hata: e.message || 'Dosya yüklenemedi.' };
  }
}

export function medyaAdresi(sunucuAdres, kullanici, sifre, medyaUrl) {
  return `${sunucuAdres}${medyaUrl}?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`;
}

export function kullaniciEngelle(sunucuAdres, kullanici, sifre, hedef) {
  return govdeliIstek(`${sunucuAdres}/engelle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`, { hedef });
}

export function kullaniciEngeliKaldir(sunucuAdres, kullanici, sifre, hedef) {
  return govdeliIstek(`${sunucuAdres}/engeli-kaldir?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`, { hedef });
}

export function sessizeAl(sunucuAdres, kullanici, sifre, anahtar, sessiz) {
  return govdeliIstek(`${sunucuAdres}/sessize-al?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`, { anahtar, sessiz });
}

export async function mesajAra(sunucuAdres, kullanici, sifre, sorgu) {
  const sonuc = await getIstek(
    `${sunucuAdres}/mesaj-ara?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}&sorgu=${encodeURIComponent(sorgu)}`
  );
  if (!sonuc.tamam) return sonuc;
  return { tamam: true, liste: sonuc.veri };
}

export async function gecmisGetir(sunucuAdres, kullanici, sifre, hedefTuru, hedef, oncekiId) {
  let url = `${sunucuAdres}/gecmis?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}&hedefTuru=${hedefTuru}&hedef=${encodeURIComponent(hedef)}&limit=50`;
  if (oncekiId) url += `&oncekiId=${oncekiId}`;
  const sonuc = await getIstek(url);
  if (!sonuc.tamam) return sonuc;
  return { tamam: true, liste: sonuc.veri };
}

export function ayarGuncelle(sunucuAdres, kullanici, sifre, ayarlar) {
  return govdeliIstek(
    `${sunucuAdres}/ayar-guncelle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    ayarlar
  );
}

export function pushTokenKaydet(sunucuAdres, kullanici, sifre, token) {
  return govdeliIstek(
    `${sunucuAdres}/push-token?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { token }
  );
}

export async function profilGetir(sunucuAdres, kullanici, sifre, hedefKullanici) {
  try {
    const res = await fetch(`${sunucuAdres}/profil/${encodeURIComponent(hedefKullanici)}`, {
      headers: { Authorization: 'Basic ' + btoa(`${kullanici}:${sifre}`) },
    });
    if (!res.ok) return { tamam: false };
    const veri = await res.json();
    return { tamam: true, ...veri };
  } catch {
    return { tamam: false };
  }
}

export async function profilGuncelle(sunucuAdres, kullanici, sifre, { biyografi, dogumTarihi, base64, mimeTuru }) {
  try {
    const res = await fetch(`${sunucuAdres}/profil-guncelle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullanici, sifre, biyografi, dogumTarihi, base64, mimeTuru }),
    });
    const veri = await res.json();
    return veri;
  } catch {
    return { tamam: false, hata: 'Bağlantı hatası.' };
  }
}

export async function kullaniciAdiDegistir(sunucuAdres, kullanici, sifre, yeniAd) {
  try {
    const res = await fetch(`${sunucuAdres}/kullanici-adi-degistir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullanici, sifre, yeniAd }),
    });
    const veri = await res.json();
    return veri;
  } catch {
    return { tamam: false, hata: 'Bağlantı hatası.' };
  }
}

export function grupBilgiGuncelle(sunucuAdres, kullanici, sifre, grupId, isim, aciklama) {
  return govdeliIstek(
    `${sunucuAdres}/grup-bilgi-guncelle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { grupId, isim, aciklama }
  );
}

export function dogumTarihiGuncelle(sunucuAdres, kullanici, sifre, dogumTarihi) {
  return govdeliIstek(
    `${sunucuAdres}/dogum-tarihi-guncelle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { dogumTarihi }
  );
}

export function sifreDegistir(sunucuAdres, kullanici, sifre, yeniSifre) {
  return govdeliIstek(
    `${sunucuAdres}/sifre-degistir?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { yeniSifre }
  );
}

export async function hikayeleriGetir(sunucuAdres, kullanici, sifre, tur = 'aktif') {
  const sonuc = await getIstek(
    `${sunucuAdres}/hikayeler?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}&tur=${encodeURIComponent(tur)}`
  );
  if (!sonuc.tamam) return sonuc;
  const liste = Array.isArray(sonuc.veri) ? sonuc.veri : (sonuc.veri?.liste || sonuc.liste || []);
  return { tamam: true, liste };
}

export function hikayeEkle(sunucuAdres, kullanici, sifre, veriBase64, mimeTuru, metin, yaziKatmani, sigdir) {
  return govdeliIstek(
    `${sunucuAdres}/hikaye-ekle?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { veriBase64, mimeTuru, metin, yaziKatmani, sigdir: !!sigdir }
  );
}

export function hikayeEkleUrl(sunucuAdres, kullanici, sifre, medyaUrl, medyaTuru, metin, yaziKatmani, sigdir) {
  return govdeliIstek(
    `${sunucuAdres}/hikaye-ekle-url?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { medyaUrl, medyaTuru, metin, yaziKatmani, sigdir: !!sigdir }
  );
}

export function hikayeGorulduBildir(sunucuAdres, kullanici, sifre, hikayeId) {
  return govdeliIstek(
    `${sunucuAdres}/hikaye-goruldu?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { hikayeId }
  );
}

export function hikayeSil(sunucuAdres, kullanici, sifre, hikayeId) {
  return govdeliIstek(
    `${sunucuAdres}/hikaye-sil?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { hikayeId }
  );
}

export function hikayeBegen(sunucuAdres, kullanici, sifre, hikayeId) {
  return govdeliIstek(
    `${sunucuAdres}/hikaye-begen?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { hikayeId }
  );
}

export function grupYoneticiAta(sunucuAdres, kullanici, sifre, grupId, uye, aksiyon = 'ata') {
  return govdeliIstek(
    `${sunucuAdres}/grup-yonetici-ata?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { grupId, uye, aksiyon }
  );
}

export function grupAyril(sunucuAdres, kullanici, sifre, grupId) {
  return govdeliIstek(
    `${sunucuAdres}/grup-ayril?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { grupId }
  );
}

export function grupKapat(sunucuAdres, kullanici, sifre, grupId) {
  return govdeliIstek(
    `${sunucuAdres}/grup-kapat?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`,
    { grupId }
  );
}

