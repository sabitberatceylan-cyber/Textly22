import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import JSZip from 'jszip';
import { dosyaYukleDirekt } from './api';

export const VARSAYILAN_PAKETLER = [
  {
    id: 'duygular',
    baslik: 'Duygular',
    rozet: 'kalp',
    cikartmalar: [
      { id: 'duygu_ask', isim: 'Sevdim', url: '/medya/stickers/duygu_ask.png' },
      { id: 'duygu_ates', isim: 'Alev', url: '/medya/stickers/duygu_ates.png' },
      { id: 'duygu_kahkaha', isim: 'Kahkaha', url: '/medya/stickers/duygu_kahkaha.png' },
      { id: 'duygu_sok', isim: 'Şok', url: '/medya/stickers/duygu_sok.png' },
      { id: 'duygu_parti', isim: 'Parti', url: '/medya/stickers/duygu_parti.png' },
      { id: 'duygu_havali', isim: 'Cool', url: '/medya/stickers/duygu_havali.png' },
      { id: 'duygu_uzgun', isim: 'Üzdün', url: '/medya/stickers/duygu_uzgun.png' },
      { id: 'duygu_merak', isim: 'Hmm', url: '/medya/stickers/duygu_merak.png' },
    ],
  },
  {
    id: 'tepkiler',
    baslik: 'Tepkiler',
    rozet: 'tik',
    cikartmalar: [
      { id: 'tepki_aynen', isim: 'Aynen', url: '/medya/stickers/tepki_aynen.png' },
      { id: 'tepki_tamamdir', isim: 'Tamam', url: '/medya/stickers/tepki_tamamdir.png' },
      { id: 'tepki_bosyapma', isim: 'Dur', url: '/medya/stickers/tepki_bosyapma.png' },
      { id: 'tepki_kactim', isim: 'Kaçtım', url: '/medya/stickers/tepki_kactim.png' },
      { id: 'tepki_helal', isim: 'Helal', url: '/medya/stickers/tepki_helal.png' },
      { id: 'tepki_yokartik', isim: 'Yok Artık', url: '/medya/stickers/tepki_yokartik.png' },
      { id: 'tepki_uyuyorum', isim: 'Uyuyorum', url: '/medya/stickers/tepki_uyuyorum.png' },
      { id: 'tepki_bakariz', isim: 'Bakarız', url: '/medya/stickers/tepki_bakariz.png' },
    ],
  },
  {
    id: 'gundelik',
    baslik: 'Gündelik',
    rozet: 'selam',
    cikartmalar: [
      { id: 'gun_gunaydin', isim: 'Günaydın', url: '/medya/stickers/gun_gunaydin.png' },
      { id: 'gun_iyigeceler', isim: 'İyi Geceler', url: '/medya/stickers/gun_iyigeceler.png' },
      { id: 'gun_afiyet', isim: 'Afiyet Olsun', url: '/medya/stickers/gun_afiyet.png' },
      { id: 'gun_tesekkur', isim: 'Sağol', url: '/medya/stickers/gun_tesekkur.png' },
      { id: 'gun_kolaygelsin', isim: 'Kolay Gelsin', url: '/medya/stickers/gun_kolaygelsin.png' },
      { id: 'gun_gorusuruz', isim: 'Görüşürüz', url: '/medya/stickers/gun_gorusuruz.png' },
      { id: 'gun_selam', isim: 'Selam', url: '/medya/stickers/gun_selam.png' },
      { id: 'gun_bolsans', isim: 'Bol Şans', url: '/medya/stickers/gun_bolsans.png' },
    ],
  },
];

const ON_EK = '@textly_custom_stickers_';

// En son kullanılan en üstte, en eski kullanılan en altta olacak şekilde sırala
export function cikartmalariSirala(liste) {
  if (!Array.isArray(liste)) return [];
  return [...liste].sort((a, b) => {
    const timeA = a.sonKullanilmaZamani || a.zaman || 0;
    const timeB = b.sonKullanilmaZamani || b.zaman || 0;
    return timeB - timeA;
  });
}

// Kullanıcının kaydettiği veya ürettiği özel çıkartmaları getir (son kullanılan en üstte)
export async function ozelCikartmalariYukle(kullanici) {
  try {
    const raw = await AsyncStorage.getItem(ON_EK + kullanici);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return cikartmalariSirala(Array.isArray(list) ? list : []);
  } catch {
    return [];
  }
}

// Yeni özel çıkartma kaydet (mesajdan veya galeriden) - en üste eklenir
export async function ozelCikartmaKaydet(kullanici, sticker) {
  try {
    const mevcut = await ozelCikartmalariYukle(kullanici);
    // Zaten ekli ise en üste taşı
    const kalan = mevcut.filter((s) => s.url !== sticker.url);
    const yeniItem = {
      id: sticker.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...sticker,
      zaman: sticker.zaman || Date.now(),
      sonKullanilmaZamani: Date.now(),
    };
    const yeni = [yeniItem, ...kalan];
    await AsyncStorage.setItem(ON_EK + kullanici, JSON.stringify(yeni));
    return yeni;
  } catch {
    return [];
  }
}

// Çıkartma gönderildiğinde onu "Çıkartmalarım" listesinin en tepesine taşı
export async function ozelCikartmaKullanildi(kullanici, sticker) {
  try {
    if (!kullanici || !sticker || !sticker.url) return;
    const mevcut = await ozelCikartmalariYukle(kullanici);
    const bul = mevcut.find((s) => s.url === sticker.url);
    let guncelItem;
    let kalan;
    if (bul) {
      guncelItem = { ...bul, sonKullanilmaZamani: Date.now() };
      kalan = mevcut.filter((s) => s.url !== sticker.url);
    } else {
      guncelItem = {
        id: sticker.id || `stk_${Date.now()}`,
        isim: sticker.isim || 'Çıkartma',
        url: sticker.url,
        yerelUri: sticker.yerelUri || null,
        zaman: Date.now(),
        sonKullanilmaZamani: Date.now(),
      };
      kalan = mevcut;
    }
    const yeni = [guncelItem, ...kalan];
    await AsyncStorage.setItem(ON_EK + kullanici, JSON.stringify(yeni));
    return yeni;
  } catch {
    return [];
  }
}

// Özel çıkartma sil
export async function ozelCikartmaSil(kullanici, stickerId) {
  try {
    const mevcut = await ozelCikartmalariYukle(kullanici);
    const yeni = mevcut.filter((s) => s.id !== stickerId && s.url !== stickerId);
    await AsyncStorage.setItem(ON_EK + kullanici, JSON.stringify(yeni));
    return yeni;
  } catch {
    return [];
  }
}

// Galeriden seçilen fotoğrafı çıkartmaya dönüştür (512x512 ölçekleme + sunucuya yükleme)
export async function fotograftanCikartmaYap(sunucuAdres, kullanici, sifre) {
  try {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) return { tamam: false, hata: 'Galeri izni verilmedi.' };

    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (sonuc.canceled || !sonuc.assets?.length) return { iptal: true };

    const varlik = sonuc.assets[0];

    // WhatsApp çıkartma standardı olan 512x512 piksele boyutlandır
    const manipule = await ImageManipulator.manipulateAsync(
      varlik.uri,
      [{ resize: { width: 512, height: 512 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.PNG }
    );

    // Sunucuya yükle
    const yukle = await dosyaYukleDirekt(sunucuAdres, kullanici, sifre, manipule.uri, 'image/png');
    if (!yukle.tamam || !yukle.url) {
      return { tamam: false, hata: yukle.hata || 'Çıkartma yüklenemedi.' };
    }

    const yeniCikartma = {
      isim: 'Özel Çıkartma',
      url: yukle.url,
      yerelUri: manipule.uri,
      zaman: Date.now(),
      sonKullanilmaZamani: Date.now(),
    };

    const guncelListe = await ozelCikartmaKaydet(kullanici, yeniCikartma);
    return { tamam: true, cikartma: yeniCikartma, liste: guncelListe };
  } catch (e) {
    return { tamam: false, hata: e.message || 'Çıkartma oluşturulamadı.' };
  }
}

// WhatsApp Media klasörü URI (Android dahili depolama -> Android -> media -> com.whatsapp -> WhatsApp -> Media)
const WHATSAPP_MEDIA_URI = 'content://com.android.externalstorage.documents/document/primary%3AAndroid%2Fmedia%2Fcom.whatsapp%2FWhatsApp%2FMedia';

// WhatsApp çıkartmalarını aktar (.zip veya .webp / görsel)
// ZIP seçilirse içindeki tüm png ve webp çıkartmaları çözer, optimize eder ve yükler
export async function whatsappCikartmasiAktar(sunucuAdres, kullanici, sifre, onIlerleme) {
  try {
    let secilenUri = null;

    // 1. Android SAF Document Picker ile doğrudan WhatsApp Media klasörünü hedefle
    try {
      const intentParams = {
        type: '*/*',
        category: 'android.intent.category.OPENABLE',
        extra: {
          'android.intent.extra.MIME_TYPES': [
            'application/zip',
            'application/x-zip-compressed',
            'application/x-zip',
            'image/webp',
            'image/png',
            'image/jpeg',
            'application/octet-stream',
          ],
          'android.provider.extra.INITIAL_URI': WHATSAPP_MEDIA_URI,
        },
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      };

      const intentSonuc = await IntentLauncher.startActivityAsync('android.intent.action.OPEN_DOCUMENT', intentParams);
      if (intentSonuc && intentSonuc.resultCode === -1 && intentSonuc.data) {
        secilenUri = intentSonuc.data;
      } else if (intentSonuc && intentSonuc.resultCode === 0) {
        return { iptal: true };
      }
    } catch {
      // Intent açılamazsa fallback: ImagePicker
    }

    // 2. Fallback: ImagePicker ile görsel seçimi
    if (!secilenUri) {
      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) return { tamam: false, hata: 'Erişim izni verilmedi.' };

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.95,
      });

      if (res.canceled || !res.assets?.length) return { iptal: true };
      secilenUri = res.assets[0].uri;
    }

    if (!secilenUri) return { iptal: true };

    // Seçilen dosyanın base64 içeriğini oku
    if (onIlerleme) onIlerleme({ durum: 'okunuyor', metin: 'Dosya okunuyor...' });
    const dosyaBase64 = await FileSystem.readAsStringAsync(secilenUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // ZIP dosyası kontrolü (PK magic bytes: base64 'UEsDB' veya uzantı .zip)
    const zipMi = dosyaBase64.startsWith('UEsDB') || secilenUri.toLowerCase().includes('.zip');

    if (zipMi) {
      if (onIlerleme) onIlerleme({ durum: 'zip_cozuluyor', metin: 'ZIP arşivi taranıyor...' });
      const zip = await JSZip.loadAsync(dosyaBase64, { base64: true });
      const icerikler = Object.keys(zip.files).filter((dosyaAdi) => {
        const f = zip.files[dosyaAdi];
        if (f.dir) return false;
        if (dosyaAdi.includes('__MACOSX') || dosyaAdi.startsWith('.')) return false;
        return /\.(png|webp|jpg|jpeg)$/i.test(dosyaAdi);
      });

      if (icerikler.length === 0) {
        return { tamam: false, hata: 'Seçilen ZIP dosyasında uygun PNG veya WebP çıkartma bulunamadı.' };
      }

      const eklenenCikartmalar = [];
      const toplam = icerikler.length;

      for (let i = 0; i < toplam; i++) {
        const ad = icerikler[i];
        if (onIlerleme) {
          onIlerleme({
            durum: 'yukleniyor',
            mevcut: i + 1,
            toplam,
            metin: `Çıkartmalar yükleniyor (${i + 1}/${toplam})...`,
          });
        }

        try {
          const imgBase64 = await zip.files[ad].async('base64');
          const uzanti = ad.toLowerCase().endsWith('.webp') ? 'webp' : 'png';
          const tempYol = `${FileSystem.cacheDirectory}wp_zip_${Date.now()}_${i}.${uzanti}`;
          await FileSystem.writeAsStringAsync(tempYol, imgBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // 512x512 standardına getir
          const manipule = await ImageManipulator.manipulateAsync(
            tempYol,
            [{ resize: { width: 512 } }],
            { compress: 0.85, format: ImageManipulator.SaveFormat.PNG }
          );

          // Sunucuya yükle
          const yukle = await dosyaYukleDirekt(sunucuAdres, kullanici, sifre, manipule.uri, 'image/png');
          if (yukle && yukle.tamam && yukle.url) {
            eklenenCikartmalar.push({
              id: `wp_zip_${Date.now()}_${i}`,
              isim: ad.split('/').pop().replace(/\.[^/.]+$/, ''),
              url: yukle.url,
              yerelUri: manipule.uri,
              zaman: Date.now(),
              sonKullanilmaZamani: Date.now() + (toplam - i), // Eklenen sırayla en üstte
            });
          }
          // Geçici dosyaları temizle
          FileSystem.deleteAsync(tempYol, { idempotent: true }).catch(() => {});
        } catch (dosyaHatasi) {
          console.warn('[zip] çıkartma ayıklama hatası:', ad, dosyaHatasi);
        }
      }

      if (eklenenCikartmalar.length === 0) {
        return { tamam: false, hata: 'ZIP içindeki çıkartmalar yüklenemedi.' };
      }

      // Mevcut özel çıkartmaların en tepesine ekle
      const mevcutListe = await ozelCikartmalariYukle(kullanici);
      const yeniUrlSet = new Set(eklenenCikartmalar.map((c) => c.url));
      const kalanlar = mevcutListe.filter((c) => !yeniUrlSet.has(c.url));
      const birlesik = [...eklenenCikartmalar, ...kalanlar];
      await AsyncStorage.setItem(ON_EK + kullanici, JSON.stringify(birlesik));

      return {
        tamam: true,
        adet: eklenenCikartmalar.length,
        liste: birlesik,
      };
    }

    // Tekil dosya (.webp veya görsel) seçilmişse
    if (onIlerleme) onIlerleme({ durum: 'yukleniyor', metin: 'Çıkartma hazırlanıyor...' });
    const uzanti = secilenUri.toLowerCase().endsWith('.webp') ? 'webp' : 'png';
    const tempDosya = `${FileSystem.cacheDirectory}wp_single_${Date.now()}.${uzanti}`;
    await FileSystem.writeAsStringAsync(tempDosya, dosyaBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const manipule = await ImageManipulator.manipulateAsync(
      tempDosya,
      [{ resize: { width: 512 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.PNG }
    );

    const yukle = await dosyaYukleDirekt(sunucuAdres, kullanici, sifre, manipule.uri, 'image/png');
    if (!yukle.tamam || !yukle.url) {
      return { tamam: false, hata: yukle.hata || 'Çıkartma yüklenemedi.' };
    }

    const yeniCikartma = {
      isim: 'WhatsApp Çıkartması',
      url: yukle.url,
      yerelUri: manipule.uri,
      zaman: Date.now(),
      sonKullanilmaZamani: Date.now(),
    };

    const guncelListe = await ozelCikartmaKaydet(kullanici, yeniCikartma);
    return { tamam: true, adet: 1, cikartma: yeniCikartma, liste: guncelListe };
  } catch (e) {
    return { tamam: false, hata: e.message || 'Çıkartma aktarılamadı.' };
  }
}
