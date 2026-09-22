import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';

export default function GuncellemeModal({
  visible,
  bilgi,
  sunucuAdres,
  onKapat,
}) {
  const [indiriliyor, setIndiriliyor] = useState(false);
  const [indirmeYuzdesi, setIndirmeYuzdesi] = useState(0);
  const [indirildi, setIndirildi] = useState(false);
  const [hataMesaji, setHataMesaji] = useState(null);

  if (!visible || !bilgi) return null;

  const zorunlu = !!bilgi.zorunluMu;
  const tamApkUrl = `${sunucuAdres}${bilgi.apkUrl || '/guncelleme/app.apk'}`;

  async function guncellemeyiBaslat() {
    setHataMesaji(null);
    setIndiriliyor(true);
    setIndirmeYuzdesi(0);

    const yerelDosyaYolu = `${FileSystem.documentDirectory}Textly-Guncelleme.apk`;

    try {
      // Önce eski indirme varsa temizle
      const mevcut = await FileSystem.getInfoAsync(yerelDosyaYolu).catch(() => null);
      if (mevcut && mevcut.exists) {
        await FileSystem.deleteAsync(yerelDosyaYolu, { idempotent: true }).catch(() => {});
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        tamApkUrl,
        yerelDosyaYolu,
        {},
        (progress) => {
          if (progress.totalBytesExpectedToWrite > 0) {
            const p = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
            setIndirmeYuzdesi(Math.min(100, Math.max(0, Math.round(p * 100))));
          }
        }
      );

      const res = await downloadResumable.downloadAsync();
      setIndiriliyor(false);

      if (res && res.uri) {
        setIndirildi(true);
        setIndirmeYuzdesi(100);
        await kurulumuAc(res.uri);
      } else {
        // Doğrudan tarayıcı/indirme yöneticisi ile aç
        await Linking.openURL(tamApkUrl).catch(() => {});
      }
    } catch (e) {
      setIndiriliyor(false);
      // Yerel indirmede sorun olursa doğrudan Android tarayıcısı ile aç
      try {
        await Linking.openURL(tamApkUrl);
      } catch (err) {
        setHataMesaji('İndirme başlatılamadı. Lütfen sunucu adresinizi kontrol edin.');
      }
    }
  }

  async function kurulumuAc(yerelUri) {
    try {
      const cUri = await FileSystem.getContentUriAsync(yerelUri);
      let acildi = false;
      try {
        const IntentLauncher = require('expo-intent-launcher');
        if (IntentLauncher && IntentLauncher.startActivityAsync) {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: cUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
          });
          acildi = true;
        }
      } catch (intentHata) {
        console.warn('IntentLauncher hatasi:', intentHata);
      }

      if (!acildi) {
        await Linking.openURL(cUri).catch(async () => {
          await Linking.openURL(tamApkUrl).catch(() => {});
        });
      }
    } catch (e) {
      // Herhangi bir aksilikte doğrudan APK indirme linkini tarayıcıda aç
      Linking.openURL(tamApkUrl).catch(() => {});
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!zorunlu) onKapat();
      }}
    >
      <View style={styles.arkaplan}>
        <View style={styles.kutu}>
          {/* Üst İkon & Başlık */}
          <View style={styles.ikonKutusu}>
            <Text style={styles.ikonMetin}>🚀</Text>
          </View>

          <Text style={styles.baslik}>Yeni Güncelleme Mevcut!</Text>
          <Text style={styles.versiyonEtiketi}>
            Sürüm: v{bilgi.versiyonAdi || '2.0.0'}
            {bilgi.apkBoyutMb ? `  •  ${bilgi.apkBoyutMb} MB` : ''}
          </Text>

          {/* Yenilikler / Açıklama */}
          {!!bilgi.aciklama && (
            <View style={styles.aciklamaKutusu}>
              <Text style={styles.aciklamaBaslik}>YENİLİKLER</Text>
              <ScrollView style={{ maxHeight: 120 }}>
                <Text style={styles.aciklamaMetin}>{bilgi.aciklama}</Text>
              </ScrollView>
            </View>
          )}

          {/* İndirme İlerleme Çubuğu */}
          {indiriliyor && (
            <View style={styles.ilerlemeKutusu}>
              <View style={styles.ilerlemeCizgisi}>
                <View style={[styles.ilerlemeDolgusu, { width: `${indirmeYuzdesi}%` }]} />
              </View>
              <Text style={styles.ilerlemeYuzde}>İndiriliyor: %{indirmeYuzdesi}</Text>
            </View>
          )}

          {/* Hata Mesajı */}
          {hataMesaji && (
            <Text style={styles.hataMetin}>{hataMesaji}</Text>
          )}

          {/* Butonlar */}
          <View style={styles.butonlarKapsayici}>
            {indirildi ? (
              <TouchableOpacity
                style={[styles.anaButon, { backgroundColor: '#30d158' }]}
                onPress={() => kurulumuAc(`${FileSystem.documentDirectory}Textly-Guncelleme.apk`)}
                activeOpacity={0.8}
              >
                <Text style={styles.anaButonMetin}>Yüklemeyi Başlat</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.anaButon, indiriliyor && styles.anaButonPasif]}
                onPress={guncellemeyiBaslat}
                disabled={indiriliyor}
                activeOpacity={0.8}
              >
                {indiriliyor ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.anaButonMetin}>Şimdi Güncelle</Text>
                )}
              </TouchableOpacity>
            )}

            {!zorunlu && !indiriliyor && (
              <TouchableOpacity
                style={styles.ikincilButon}
                onPress={onKapat}
                activeOpacity={0.7}
              >
                <Text style={styles.ikincilButonMetin}>Daha Sonra</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
  },
  kutu: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#161b22',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  ikonKutusu: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 168, 255, 0.35)',
  },
  ikonMetin: {
    fontSize: 28,
  },
  baslik: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  versiyonEtiketi: {
    color: '#00a8ff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  aciklamaKutusu: {
    width: '100%',
    backgroundColor: '#0d1117',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  aciklamaBaslik: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  aciklamaMetin: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 13,
    lineHeight: 18,
  },
  ilerlemeKutusu: {
    width: '100%',
    marginBottom: 16,
  },
  ilerlemeCizgisi: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  ilerlemeDolgusu: {
    height: '100%',
    backgroundColor: '#00a8ff',
    borderRadius: 3,
  },
  ilerlemeYuzde: {
    color: '#00a8ff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  hataMetin: {
    color: '#ff453a',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  butonlarKapsayici: {
    width: '100%',
    gap: 8,
  },
  anaButon: {
    width: '100%',
    backgroundColor: '#00a8ff',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anaButonPasif: {
    opacity: 0.6,
  },
  anaButonMetin: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  ikincilButon: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  ikincilButonMetin: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
});
