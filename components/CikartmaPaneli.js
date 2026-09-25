import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import {
  VARSAYILAN_PAKETLER,
  ozelCikartmalariYukle,
  ozelCikartmaKaydet,
  ozelCikartmaKullanildi,
  ozelCikartmaSil,
  fotograftanCikartmaYap,
  galeridenCokluCikartmaSec,
  whatsappCikartmasiAktar,
} from '../lib/cikartmalar';
import { medyaAdresi } from '../lib/api';

const { width: EKRAN_GENISLIK } = Dimensions.get('window');

// Emojisiz, saf kodla çizilmiş katlanan çıkartma sembolü (WhatsApp tarzı peeling sticker ikonu)
export function CikartmaIkon({ renk = '#00a8ff', aktif = false, boyut = 22 }) {
  return (
    <View style={{ width: boyut, height: boyut, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: boyut - 2,
          height: boyut - 2,
          borderWidth: 2,
          borderColor: renk,
          borderTopLeftRadius: 7,
          borderTopRightRadius: 7,
          borderBottomLeftRadius: 7,
          borderBottomRightRadius: 2,
          backgroundColor: aktif ? (renk + '33') : 'transparent',
          position: 'relative',
        }}
      >
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 7,
            height: 7,
            backgroundColor: 'transparent',
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderColor: renk,
            borderTopLeftRadius: 3,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: 6,
            height: 3,
            borderBottomWidth: 1.5,
            borderColor: renk,
            borderBottomLeftRadius: 3,
            borderBottomRightRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

export default function CikartmaPaneli({
  visible,
  onKapat,
  onCikartmaSec,
  sunucuAdres,
  kullanici,
  sifre,
  renkler,
}) {
  const [aktifSekme, setAktifSekme] = useState('ozel'); // Her zaman "Çıkartmalarım" sekmesi ile başlar
  const [ozelCikartmalar, setOzelCikartmalar] = useState([]);
  const [islemSuruyor, setIslemSuruyor] = useState(false);
  const [ilerlemeMetni, setIlerlemeMetni] = useState('');

  // Özel çıkartmaları yükle (en son kullanılan en üstte)
  const ozelYukle = useCallback(async () => {
    if (!kullanici) return;
    const liste = await ozelCikartmalariYukle(kullanici);
    setOzelCikartmalar(liste);
  }, [kullanici]);

  useEffect(() => {
    if (visible) {
      setAktifSekme('ozel'); // Panel her açıldığında mutlaka "Çıkartmalarım" sekmesinden açılsın
      ozelYukle();
    }
  }, [visible, ozelYukle]);

  if (!visible) return null;

  // Fotoğraftan tekli çıkartma yap (1:1 kare kırpma)
  async function handleFotoCikartma() {
    setIslemSuruyor(true);
    setIlerlemeMetni('Fotoğraf işleniyor...');
    const sonuc = await fotograftanCikartmaYap(sunucuAdres, kullanici, sifre);
    setIslemSuruyor(false);
    setIlerlemeMetni('');
    if (sonuc.tamam) {
      setOzelCikartmalar(sonuc.liste || []);
      setAktifSekme('ozel');
      Alert.alert('Harika!', 'Çıkartmanız başarıyla oluşturuldu ve Çıkartmalarım bölümüne eklendi.');
    } else if (sonuc.hata) {
      Alert.alert('Hata', sonuc.hata);
    }
  }

  // Galeriden veya WhatsApp klasöründen tek seferde onlarca çıkartmayı seçip ekle
  async function handleCokluGaleri() {
    setIslemSuruyor(true);
    setIlerlemeMetni('Galeri açılıyor...');
    const sonuc = await galeridenCokluCikartmaSec(sunucuAdres, kullanici, sifre, (ilerleme) => {
      if (ilerleme && ilerleme.metin) {
        setIlerlemeMetni(ilerleme.metin);
      }
    });
    setIslemSuruyor(false);
    setIlerlemeMetni('');
    if (sonuc.tamam) {
      setOzelCikartmalar(sonuc.liste || []);
      setAktifSekme('ozel');
      Alert.alert('Harika!', `${sonuc.adet} adet çıkartma başarıyla Çıkartmalarım listesine eklendi!`);
    } else if (sonuc.hata) {
      Alert.alert('Hata', sonuc.hata);
    }
  }

  // ZIP arşivi veya çıkartma dosyası aktar
  async function handleWhatsAppAktar() {
    setIslemSuruyor(true);
    setIlerlemeMetni('Dosya seçici açılıyor...');
    const sonuc = await whatsappCikartmasiAktar(sunucuAdres, kullanici, sifre, (ilerleme) => {
      if (ilerleme && ilerleme.metin) {
        setIlerlemeMetni(ilerleme.metin);
      }
    });
    setIslemSuruyor(false);
    setIlerlemeMetni('');
    if (sonuc.tamam) {
      setOzelCikartmalar(sonuc.liste || []);
      setAktifSekme('ozel');
      if (sonuc.adet && sonuc.adet > 1) {
        Alert.alert('Harika!', `Arşivden ${sonuc.adet} adet çıkartma başarıyla çözüldü ve eklendi!`);
      } else {
        Alert.alert('Başarılı', 'Çıkartma başarıyla aktarıldı.');
      }
    } else if (sonuc.hata) {
      Alert.alert('Bilgi', sonuc.hata);
    }
  }

  // Çıkartma seçildiğinde hem gönder hem de "Çıkartmalarım" listesinin en tepesine taşı
  async function handleCikartmaSec(item) {
    ozelCikartmaKullanildi(kullanici, item)
      .then((guncel) => {
        if (guncel && guncel.length) setOzelCikartmalar(guncel);
      })
      .catch(() => {});
    onCikartmaSec(item);
  }

  // Özel çıkartma silme onayı
  function handleOzelSil(sticker) {
    Alert.alert('Çıkartmayı Sil', 'Bu çıkartmayı listenizden kaldırmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const yeni = await ozelCikartmaSil(kullanici, sticker.id);
          setOzelCikartmalar(yeni);
        },
      },
    ]);
  }

  const aktifPaket = VARSAYILAN_PAKETLER.find((p) => p.id === aktifSekme);
  const gosterilenListe = aktifSekme === 'ozel' ? ozelCikartmalar : (aktifPaket?.cikartmalar || []);

  return (
    <View style={[styles.panel, { backgroundColor: renkler.kart || '#161b22', borderTopColor: renkler.cizgi || '#30363d' }]}>
      {/* Üst Sekme Çubuğu */}
      <View style={[styles.sekmeBari, { borderBottomColor: renkler.cizgi || '#30363d' }]}>
        <TouchableOpacity
          style={[styles.sekmeButon, aktifSekme === 'ozel' && [styles.sekmeAktif, { borderBottomColor: renkler.vurgu || '#00a8ff' }]]}
          onPress={() => setAktifSekme('ozel')}
        >
          <Text style={[styles.sekmeMetin, { color: aktifSekme === 'ozel' ? (renkler.vurgu || '#00a8ff') : (renkler.metinSoluk || '#8b949e') }]}>
            ★ Çıkartmalarım
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sekmeButon, aktifSekme === 'duygular' && [styles.sekmeAktif, { borderBottomColor: renkler.vurgu || '#00a8ff' }]]}
          onPress={() => setAktifSekme('duygular')}
        >
          <Text style={[styles.sekmeMetin, { color: aktifSekme === 'duygular' ? (renkler.vurgu || '#00a8ff') : (renkler.metinSoluk || '#8b949e') }]}>
            Duygular
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sekmeButon, aktifSekme === 'tepkiler' && [styles.sekmeAktif, { borderBottomColor: renkler.vurgu || '#00a8ff' }]]}
          onPress={() => setAktifSekme('tepkiler')}
        >
          <Text style={[styles.sekmeMetin, { color: aktifSekme === 'tepkiler' ? (renkler.vurgu || '#00a8ff') : (renkler.metinSoluk || '#8b949e') }]}>
            Tepkiler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sekmeButon, aktifSekme === 'gundelik' && [styles.sekmeAktif, { borderBottomColor: renkler.vurgu || '#00a8ff' }]]}
          onPress={() => setAktifSekme('gundelik')}
        >
          <Text style={[styles.sekmeMetin, { color: aktifSekme === 'gundelik' ? (renkler.vurgu || '#00a8ff') : (renkler.metinSoluk || '#8b949e') }]}>
            Gündelik
          </Text>
        </TouchableOpacity>

        {/* Kapat Butonu */}
        <TouchableOpacity style={styles.kapatButon} onPress={onKapat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: renkler.metinSoluk || '#8b949e', fontSize: 16, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Özel Çıkartmalar Sekmesindeyken Ekleme Butonları */}
      {aktifSekme === 'ozel' && (
        <View style={styles.ozelAksiyonBari}>
          <TouchableOpacity
            style={[styles.aksiyonButon, { backgroundColor: (renkler.vurgu || '#00a8ff') + '22', borderColor: renkler.vurgu || '#00a8ff' }]}
            onPress={handleFotoCikartma}
            disabled={islemSuruyor}
          >
            <Text style={[styles.aksiyonButonMetin, { color: renkler.vurgu || '#00a8ff' }]}>
              ✂️ Kırp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aksiyonButon, { backgroundColor: '#8e44ad22', borderColor: '#8e44ad' }]}
            onPress={handleCokluGaleri}
            disabled={islemSuruyor}
          >
            <Text style={[styles.aksiyonButonMetin, { color: '#a29bfe' }]}>
              🖼️ Çoklu Seç
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aksiyonButon, { backgroundColor: (renkler.basarili || '#2ea44f') + '22', borderColor: renkler.basarili || '#2ea44f' }]}
            onPress={handleWhatsAppAktar}
            disabled={islemSuruyor}
          >
            <Text style={[styles.aksiyonButonMetin, { color: renkler.basarili || '#2ea44f' }]}>
              📦 ZIP Aktar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {islemSuruyor && (
        <View style={styles.yukleniyorKutu}>
          <ActivityIndicator size="small" color={renkler.vurgu || '#00a8ff'} />
          <Text style={[styles.yukleniyorMetin, { color: renkler.metinSoluk }]}>
            {ilerlemeMetni || 'Çıkartma hazırlanıyor...'}
          </Text>
        </View>
      )}

      {/* Çıkartma Listesi / Grid */}
      {aktifSekme === 'ozel' && ozelCikartmalar.length === 0 ? (
        <View style={styles.bosKutu}>
          <Text style={[styles.bosBaslik, { color: renkler.metin }]}>Özel Çıkartmanız Yok</Text>
          <Text style={[styles.bosAciklama, { color: renkler.metinSoluk }]}>
            Fotoğraflarınızdan veya WhatsApp'tan (.webp / ZIP) çıkartma aktarabilir, sohbette gelen çıkartmalara basılı tutup "Çıkartmalarıma Ekle" diyebilirsiniz.
          </Text>
        </View>
      ) : (
        <FlatList
          data={gosterilenListe}
          keyExtractor={(item, index) => item.id || String(index)}
          numColumns={4}
          contentContainerStyle={styles.gridKonteyner}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const tamUrl = item.url ? medyaAdresi(sunucuAdres, kullanici, sifre, item.url) : item.yerelUri;
            const urlKucuk = (tamUrl || '').toLowerCase();
            const videoMu = urlKucuk.endsWith('.mp4') || urlKucuk.endsWith('.webm') || item.tur === 'video';

            return (
              <TouchableOpacity
                style={styles.cikartmaKutu}
                activeOpacity={0.7}
                onPress={() => handleCikartmaSec(item)}
                onLongPress={() => aktifSekme === 'ozel' && handleOzelSil(item)}
                delayLongPress={400}
              >
                {videoMu && tamUrl ? (
                  <Video
                    source={{ uri: tamUrl }}
                    style={styles.cikartmaResim}
                    resizeMode={ResizeMode?.CONTAIN || 'contain'}
                    isLooping
                    shouldPlay
                    isMuted
                    useNativeControls={false}
                  />
                ) : (
                  <Image
                    source={{ uri: tamUrl }}
                    style={styles.cikartmaResim}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 290,
    width: '100%',
    borderTopWidth: 1,
  },
  sekmeBari: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  sekmeButon: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sekmeAktif: {
    borderBottomWidth: 2,
  },
  sekmeMetin: {
    fontSize: 13,
    fontWeight: '700',
  },
  kapatButon: {
    marginLeft: 'auto',
    padding: 8,
  },
  ozelAksiyonBari: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  aksiyonButon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  aksiyonButonMetin: {
    fontSize: 12,
    fontWeight: '700',
  },
  yukleniyorKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  yukleniyorMetin: {
    fontSize: 12,
  },
  gridKonteyner: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cikartmaKutu: {
    width: (EKRAN_GENISLIK - 32) / 4,
    height: (EKRAN_GENISLIK - 32) / 4,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  cikartmaResim: {
    width: '85%',
    height: '85%',
  },
  bosKutu: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  bosBaslik: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  bosAciklama: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
