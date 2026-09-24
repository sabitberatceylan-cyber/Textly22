import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
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

// Kullanıcının kaydettiği veya ürettiği özel çıkartmaları getir
export async function ozelCikartmalariYukle(kullanici) {
  try {
    const raw = await AsyncStorage.getItem(ON_EK + kullanici);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Yeni özel çıkartma kaydet (mesajdan veya galeriden)
export async function ozelCikartmaKaydet(kullanici, sticker) {
  try {
    const mevcut = await ozelCikartmalariYukle(kullanici);
    // Zaten ekli mi kontrol et
    if (mevcut.some((s) => s.url === sticker.url)) return mevcut;
    const yeni = [{ id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...sticker, zaman: Date.now() }, ...mevcut];
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
    };

    const guncelListe = await ozelCikartmaKaydet(kullanici, yeniCikartma);
    return { tamam: true, cikartma: yeniCikartma, liste: guncelListe };
  } catch (e) {
    return { tamam: false, hata: e.message || 'Çıkartma oluşturulamadı.' };
  }
}

// WhatsApp çıkartma dosyasını aktar (.webp / görsel dosyası seçip çıkartma yapma)
export async function whatsappCikartmasiAktar(sunucuAdres, kullanici, sifre) {
  try {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) return { tamam: false, hata: 'Erişim izni verilmedi.' };

    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Orijinal WebP/şeffaflığı koru
      quality: 0.95,
    });

    if (sonuc.canceled || !sonuc.assets?.length) return { iptal: true };

    const varlik = sonuc.assets[0];

    // Orijinal dosya boyutunu kontrol et ve gerekiyorsa 512x512'ye getir
    const manipule = await ImageManipulator.manipulateAsync(
      varlik.uri,
      [{ resize: { width: 512 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.PNG }
    );

    const yukle = await dosyaYukleDirekt(sunucuAdres, kullanici, sifre, manipule.uri, 'image/png');
    if (!yukle.tamam || !yukle.url) {
      return { tamam: false, hata: yukle.hata || 'Çıkartma aktarılamadı.' };
    }

    const yeniCikartma = {
      isim: 'WhatsApp Çıkartması',
      url: yukle.url,
      yerelUri: manipule.uri,
    };

    const guncelListe = await ozelCikartmaKaydet(kullanici, yeniCikartma);
    return { tamam: true, cikartma: yeniCikartma, liste: guncelListe };
  } catch (e) {
    return { tamam: false, hata: e.message || 'Çıkartma aktarılamadı.' };
  }
}
