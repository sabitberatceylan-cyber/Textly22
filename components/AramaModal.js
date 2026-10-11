import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  araniyorSesiCal,
  gelenZilSesiCal,
  baglandiSesiCal,
  kapandiSesiCal,
  sesleriDurdur,
} from '../lib/aramaSesleri';
import { medyaAdresi } from '../lib/api';

const { width } = Dimensions.get('window');

function saniyeFormatla(sn) {
  const m = Math.floor(sn / 60);
  const s = sn % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function AramaModal({
  aktifArama,
  sunucuAdres,
  kullanici,
  sifre,
  onYanitla,
  onReddet,
  onSonlandir,
  onAyril,
  onDurumGonder,
}) {
  const [mikrofonSessiz, setMikrofonSessiz] = useState(false);
  const [hoparlorAcik, setHoparlorAcik] = useState(false);
  const [gecenSure, setGecenSure] = useState(0);

  // Dalga animasyonu
  const dalgaAnim1 = useRef(new Animated.Value(0)).current;
  const dalgaAnim2 = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const durum = aktifArama?.durum;
  const aramaId = aktifArama?.aramaId;
  const hedefTuru = aktifArama?.hedefTuru;
  const baslatan = aktifArama?.baslatan;
  const benimAramam = String(baslatan || '').toLowerCase() === String(kullanici || '').toLowerCase();
  const katilimcilar = aktifArama?.katilimcilar || [];

  // Dalga halkası döngüsü
  useEffect(() => {
    if (!aktifArama) return;

    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(dalgaAnim1, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(dalgaAnim1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(dalgaAnim2, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(dalgaAnim2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim1.start();
    anim2.start();

    return () => {
      anim1.stop();
      anim2.stop();
    };
  }, [aktifArama]);

  // Ses efektleri yönetimi
  useEffect(() => {
    if (!aktifArama) {
      sesleriDurdur();
      return;
    }

    if (durum === 'caliyor') {
      if (benimAramam) {
        araniyorSesiCal();
      } else {
        gelenZilSesiCal();
      }
    } else if (durum === 'baglandi') {
      baglandiSesiCal();
      // Görüşme süresi sayacı
      setGecenSure(0);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setGecenSure((s) => s + 1);
      }, 1000);
    } else if (durum === 'sonlandi') {
      clearInterval(timerRef.current);
      kapandiSesiCal();
    }

    return () => {
      clearInterval(timerRef.current);
      sesleriDurdur();
    };
  }, [durum, benimAramam, aramaId]);

  // Hoparlör modu değiştir
  useEffect(() => {
    if (durum === 'baglandi') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldRouteThroughEarpiece: !hoparlorAcik,
        playThroughEarpieceAndroid: !hoparlorAcik,
      }).catch(() => {});
    }
    return () => {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldRouteThroughEarpiece: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    };
  }, [hoparlorAcik, durum]);

  if (!aktifArama) return null;

  function mikrofonToggle() {
    const yeni = !mikrofonSessiz;
    setMikrofonSessiz(yeni);
    if (onDurumGonder && aramaId) {
      onDurumGonder(aramaId, { mikrofonKapali: yeni });
    }
  }

  function hoparlorToggle() {
    setHoparlorAcik((h) => !h);
  }

  const gosterilenBaslik =
    hedefTuru === 'grup'
      ? (aktifArama.grupIsim || 'Grup Araması')
      : (benimAramam ? aktifArama.hedef : aktifArama.arayan);

  const profilUrl =
    hedefTuru === 'grup'
      ? (aktifArama.grupResimUrl || null)
      : (benimAramam ? aktifArama.hedefFoto : aktifArama.arayanFoto);

  const dalgaOlcek1 = dalgaAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const dalgaOpak1 = dalgaAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const dalgaOlcek2 = dalgaAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const dalgaOpak2 = dalgaAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Modal visible={!!aktifArama} animationType="slide" transparent={false} onRequestClose={() => {}}>
      <View style={styles.kok}>
        {/* Üst Durum ve Başlık Alanı */}
        <View style={styles.ustKisim}>
          <View style={styles.guvenliRozet}>
            <Text style={styles.guvenliRozetMetin}>🔒 Uçtan Uca Şifreli Sesli Arama</Text>
          </View>
          <Text style={styles.kisiAdi} numberOfLines={1}>{gosterilenBaslik}</Text>
          <Text style={styles.durumMetni}>
            {durum === 'baglandi'
              ? saniyeFormatla(gecenSure)
              : durum === 'sonlandi'
              ? (aktifArama.neden === 'mesgul' ? 'Meşgul' : 'Arama Sonlandı')
              : benimAramam
              ? 'Çalıyor...'
              : 'Gelen Sesli Arama...'}
          </Text>

          {hedefTuru === 'grup' && (
            <View style={styles.grupKatilimciBari}>
              <Text style={styles.grupKatilimciMetin}>
                👥 {katilimcilar.length} katılımcı aramada
              </Text>
            </View>
          )}
        </View>

        {/* Orta Avatar ve Dalga Animasyonu */}
        <View style={styles.ortaKisim}>
          <Animated.View
            style={[
              styles.dalgaHalka,
              { transform: [{ scale: dalgaOlcek1 }], opacity: dalgaOpak1 },
            ]}
          />
          <Animated.View
            style={[
              styles.dalgaHalka,
              { transform: [{ scale: dalgaOlcek2 }], opacity: dalgaOpak2 },
            ]}
          />

          <View style={styles.avatarKutu}>
            {profilUrl ? (
              <Image
                source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, profilUrl) }}
                style={styles.avatarResim}
              />
            ) : (
              <View style={styles.avatarVarsayilan}>
                <Text style={styles.avatarHarf}>
                  {(gosterilenBaslik || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Grup araması katılımcı listesi mini avatar çipleri */}
          {hedefTuru === 'grup' && katilimcilar.length > 1 && (
            <View style={styles.katilimcilarSatir}>
              {katilimcilar.map((kat) => (
                <View key={kat} style={styles.katilimciCip}>
                  <Text style={styles.katilimciCipMetin} numberOfLines={1}>
                    {kat === kullanici ? 'Sen' : kat}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Alt Butonlar */}
        <View style={styles.altKisim}>
          {durum === 'caliyor' && !benimAramam ? (
            /* Gelen Arama Kontrolleri: Reddet ve Yanıtla */
            <View style={styles.gelenKontroller}>
              <TouchableOpacity
                style={[styles.yuvarlakButon, styles.kirmiziButon]}
                onPress={() => onReddet(aramaId)}
                activeOpacity={0.8}
              >
                <Text style={styles.butonIkonMetin}>✕</Text>
                <Text style={styles.butonAltEtiket}>Reddet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.yuvarlakButon, styles.yesilButon]}
                onPress={() => onYanitla(aramaId)}
                activeOpacity={0.8}
              >
                <Text style={styles.butonIkonMetin}>📞</Text>
                <Text style={styles.butonAltEtiket}>Yanıtla</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Aktif / Giden Arama Kontrolleri */
            <View style={styles.aktifKontroller}>
              {/* Mikrofon Kapat / Aç */}
              <TouchableOpacity
                style={[
                  styles.kontrolKucukButon,
                  mikrofonSessiz ? styles.kontrolKucukButonSessiz : null,
                ]}
                onPress={mikrofonToggle}
                activeOpacity={0.7}
              >
                <Text style={styles.kontrolIkon}>{mikrofonSessiz ? '🔇' : '🎤'}</Text>
                <Text style={[styles.kontrolMetin, mikrofonSessiz && { color: '#ff4d4f', fontWeight: '700' }]}>
                  {mikrofonSessiz ? 'Sessizde' : 'Mikrofon'}
                </Text>
              </TouchableOpacity>

              {/* Hoparlör Aç / Kapat */}
              <TouchableOpacity
                style={[
                  styles.kontrolKucukButon,
                  hoparlorAcik ? styles.kontrolKucukButonHoparlor : null,
                ]}
                onPress={hoparlorToggle}
                activeOpacity={0.7}
              >
                <Text style={styles.kontrolIkon}>{hoparlorAcik ? '🔊' : '🔈'}</Text>
                <Text style={[styles.kontrolMetin, hoparlorAcik && { color: '#00a8ff', fontWeight: '700' }]}>
                  {hoparlorAcik ? 'Hoparlör' : 'Ahize'}
                </Text>
              </TouchableOpacity>

              {/* Aramayı Sonlandır / Ayrıl */}
              <TouchableOpacity
                style={[styles.yuvarlakButon, styles.kirmiziButon]}
                onPress={() => {
                  if (hedefTuru === 'grup' && katilimcilar.length > 1) {
                    onAyril(aramaId);
                  } else {
                    onSonlandir(aramaId);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.butonIkonMetin}>✕</Text>
                <Text style={styles.butonAltEtiket}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  ustKisim: {
    alignItems: 'center',
    marginTop: 20,
  },
  guvenliRozet: {
    backgroundColor: 'rgba(56, 239, 125, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 239, 125, 0.25)',
  },
  guvenliRozetMetin: {
    color: '#38ef7d',
    fontSize: 12,
    fontWeight: '600',
  },
  kisiAdi: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  durumMetni: {
    color: '#8b949e',
    fontSize: 16,
    fontWeight: '500',
  },
  grupKatilimciBari: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 168, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  grupKatilimciMetin: {
    color: '#00a8ff',
    fontSize: 13,
    fontWeight: '600',
  },
  ortaKisim: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  dalgaHalka: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(0, 168, 255, 0.35)',
  },
  avatarKutu: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: '#161b22',
    borderWidth: 3,
    borderColor: '#00a8ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#00a8ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  avatarResim: {
    width: 140,
    height: 140,
  },
  avatarVarsayilan: {
    width: 140,
    height: 140,
    backgroundColor: '#1f6feb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHarf: {
    color: '#ffffff',
    fontSize: 52,
    fontWeight: '700',
  },
  katilimcilarSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    maxWidth: width * 0.85,
  },
  katilimciCip: {
    backgroundColor: '#21262d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  katilimciCipMetin: {
    color: '#c9d1d9',
    fontSize: 12,
    fontWeight: '500',
  },
  altKisim: {
    marginBottom: 20,
  },
  gelenKontroller: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  aktifKontroller: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  yuvarlakButon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  yesilButon: {
    backgroundColor: '#2ea043',
    shadowColor: '#2ea043',
  },
  kirmiziButon: {
    backgroundColor: '#da3633',
    shadowColor: '#da3633',
  },
  butonIkonMetin: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  butonAltEtiket: {
    position: 'absolute',
    bottom: -22,
    color: '#8b949e',
    fontSize: 12,
    fontWeight: '600',
  },
  kontrolKucukButon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#21262d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kontrolKucukButonAktif: {
    backgroundColor: 'rgba(0, 168, 255, 0.25)',
    borderWidth: 1,
    borderColor: '#00a8ff',
  },
  kontrolKucukButonHoparlor: {
    backgroundColor: 'rgba(0, 168, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: '#00a8ff',
  },
  kontrolKucukButonSessiz: {
    backgroundColor: 'rgba(218, 54, 51, 0.25)',
    borderWidth: 1.5,
    borderColor: '#da3633',
  },
  kontrolIkon: {
    fontSize: 22,
  },
  kontrolMetin: {
    position: 'absolute',
    bottom: -20,
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '500',
  },
});
