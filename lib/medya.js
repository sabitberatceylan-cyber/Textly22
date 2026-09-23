import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { medyaYukle, dosyaYukleDirekt } from './api';

const VIDEO_MAKS_SANIYE = 60;

// Sadece secim yapar, YUKLEMEZ - once kullaniciya onizleme + "tek gorunumluk"
// secenegini gostermek icin ikiye boldum.
export async function medyaSec() {
  const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!izin.granted) return { hata: 'Galeriye erişim izni verilmedi.' };

  const sonuc = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.6,
    base64: true,
    videoMaxDuration: VIDEO_MAKS_SANIYE,
  });

  if (sonuc.canceled || !sonuc.assets?.length) return null;
  const varlik = sonuc.assets[0];
  return {
    uri: varlik.uri,
    tur: varlik.type === 'video' ? 'video' : 'foto',
    base64: varlik.base64 || null,
    mimeTuru: varlik.mimeType || null,
  };
}

// Onaylanan secimi sunucuya yukler.
export async function medyaYukleGonder(sunucuAdres, kullanici, sifre, secim) {
  let mimeTuru = secim.mimeTuru;
  if (!mimeTuru) {
    if (secim.tur === 'video') mimeTuru = 'video/mp4';
    else if (secim.tur === 'ses') mimeTuru = 'audio/m4a';
    else mimeTuru = 'image/jpeg';
  }

  // 1. Doğrudan dosya akışı ile yükle (OOM ve bellek sınırını çözer, video/fotoğraf/ses için mükemmel)
  if (secim.uri) {
    const direktSonuc = await dosyaYukleDirekt(sunucuAdres, kullanici, sifre, secim.uri, mimeTuru);
    if (direktSonuc.tamam) {
      return { url: direktSonuc.url, tur: secim.tur };
    }
  }

  // 2. URI yoksa veya akış başarısız olduysa base64 fallback
  let base64Veri = secim.base64;
  if (!base64Veri && secim.uri) {
    try {
      base64Veri = await FileSystem.readAsStringAsync(secim.uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch (e) {
      return { hata: 'Dosya okunamadı.' };
    }
  }
  if (!base64Veri) return { hata: 'Dosya okunamadı.' };
  if (base64Veri.length > 25_000_000) {
    return { hata: secim.tur === 'video' ? 'Video çok büyük, daha kısa bir video seç.' : 'Dosya çok büyük.' };
  }

  const yukleSonucu = await medyaYukle(sunucuAdres, kullanici, sifre, base64Veri, mimeTuru);
  if (!yukleSonucu.tamam) return { hata: yukleSonucu.hata || 'Yükleme başarısız.' };
  return { url: yukleSonucu.url, tur: secim.tur };
}

export async function medyayiBase64Yap(secim) {
  if (!secim) return null;
  if (secim.base64) return secim.base64;
  if (secim.uri) {
    try {
      return await FileSystem.readAsStringAsync(secim.uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {
      return null;
    }
  }
  return null;
}

// Kamera ile anlik fotograf veya video cekme
export async function kameraIleCek(videoDestekle = false) {
  const izin = await ImagePicker.requestCameraPermissionsAsync();
  if (!izin.granted) return { hata: 'Kamera kullanım izni verilmedi.' };

  const sonuc = await ImagePicker.launchCameraAsync({
    mediaTypes: videoDestekle ? ImagePicker.MediaTypeOptions.All : ImagePicker.MediaTypeOptions.Images,
    quality: 0.5,
    base64: true,
    videoMaxDuration: VIDEO_MAKS_SANIYE,
  });

  if (sonuc.canceled || !sonuc.assets?.length) return null;
  const varlik = sonuc.assets[0];
  let base64Veri = varlik.base64 || null;
  if (!base64Veri && varlik.uri) {
    try {
      base64Veri = await FileSystem.readAsStringAsync(varlik.uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {
      base64Veri = null;
    }
  }

  return {
    uri: varlik.uri,
    tur: varlik.type === 'video' ? 'video' : 'foto',
    base64: base64Veri,
    mimeTuru: varlik.mimeType || (varlik.type === 'video' ? 'video/mp4' : 'image/jpeg'),
  };
}

const VIDEO_DIZINI = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}videolar/`;

// Videoyu cihaza indirip yerelden acar, sonraki acilislarda aninda gelir
export async function videoYerelGetir(uzakUrl, onProgress) {
  try {
    const dirInfo = await FileSystem.getInfoAsync(VIDEO_DIZINI);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VIDEO_DIZINI, { intermediates: true });
    }

    const dosyaAdiEslesme = uzakUrl.match(/\/medya\/([^?#/]+)/);
    const dosyaAdi = dosyaAdiEslesme ? dosyaAdiEslesme[1] : `video_${Date.now()}.mp4`;
    const yerelYol = VIDEO_DIZINI + dosyaAdi;

    const dosyaBilgi = await FileSystem.getInfoAsync(yerelYol);
    if (dosyaBilgi.exists && dosyaBilgi.size > 0) {
      return { tamam: true, yerelUri: yerelYol };
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      uzakUrl,
      yerelYol,
      {},
      (downloadProgress) => {
        if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
          const ilerleme = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress(ilerleme);
        }
      }
    );

    const sonuc = await downloadResumable.downloadAsync();
    if (sonuc && sonuc.uri) {
      return { tamam: true, yerelUri: sonuc.uri };
    }
    return { tamam: false, hata: 'İndirme tamamlanamadı' };
  } catch (e) {
    return { tamam: false, hata: e.message || 'Video indirilemedi' };
  }
}
