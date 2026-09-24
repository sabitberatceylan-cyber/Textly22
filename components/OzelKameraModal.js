import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { medyaSec } from '../lib/medya';
import OzelMedyaDuzenleyici from './OzelMedyaDuzenleyici';

const { width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK } = Dimensions.get('window');

// ----------------------------------------------------
// Sade ve Modern Vektörel İkonlar (Sıfır Emoji)
// ----------------------------------------------------

function KapatVektorIkon() {
  return (
    <View style={ikonStilleri.kapatKutu}>
      <View style={[ikonStilleri.caprazCizgi, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[ikonStilleri.caprazCizgi, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

function FlasVektorIkon({ mod }) {
  // mod: 'off' | 'on' | 'auto'
  return (
    <View style={ikonStilleri.flasKutu}>
      <View style={ikonStilleri.simsekUst} />
      <View style={ikonStilleri.simsekAlt} />
      {mod === 'auto' && <Text style={ikonStilleri.flasOtoYazi}>A</Text>}
      {mod === 'off' && <View style={ikonStilleri.flasCizik} />}
    </View>
  );
}

function GaleriVektorIkon() {
  return (
    <View style={ikonStilleri.galeriCerceve}>
      <View style={ikonStilleri.galeriDaire} />
      <View style={ikonStilleri.galeriTepeler}>
        <View style={ikonStilleri.galeriTepeSol} />
        <View style={ikonStilleri.galeriTepeSag} />
      </View>
    </View>
  );
}

function CevirVektorIkon() {
  return (
    <View style={ikonStilleri.cevirDaire}>
      <View style={ikonStilleri.cevirYayUst} />
      <View style={ikonStilleri.cevirOkUst} />
      <View style={ikonStilleri.cevirYayAlt} />
      <View style={ikonStilleri.cevirOkAlt} />
    </View>
  );
}

export default function OzelKameraModal({
  visible,
  mod = 'sohbet', // 'sohbet' | 'hikaye'
  onKapat,
  onGonder, // ({ secim, yaziKatmani, baslik, tekGorunum }) => void
}) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);

  // İzinler
  const [kameraIzin, requestKameraIzin] = useCameraPermissions();
  const [mikrofonIzin, requestMikrofonIzin] = useMicrophonePermissions();

  // Kamera State'leri
  const [kameraYonu, setKameraYonu] = useState('back'); // 'back' | 'front'
  const [flasModu, setFlasModu] = useState('off'); // 'off' | 'on' | 'auto'
  const [kameraModu, setKameraModu] = useState('picture'); // 'picture' | 'video'
  const [videoKayitYapiliyor, setVideoKayitYapiliyor] = useState(false);
  const [kayitSuresi, setKayitSuresi] = useState(0);
  const [odakNoktasi, setOdakNoktasi] = useState(null);

  // Çekilen veya Seçilen Medya
  const [yakalananMedya, setYakalananMedya] = useState(null);

  const odakKaybolTimerRef = useRef(null);
  const kayitSayacRef = useRef(null);
  const kayitAnim = useRef(new Animated.Value(1)).current;
  const odakAnim = useRef(new Animated.Value(0)).current;

  // Modal açıldığında izin iste ve varsayılanları sıfırla
  useEffect(() => {
    if (visible) {
      if (!kameraIzin?.granted) requestKameraIzin();
      if (!mikrofonIzin?.granted) requestMikrofonIzin();
      setOdakNoktasi(null);
    }
  }, [visible]);

  useEffect(() => {
    if (videoKayitYapiliyor) {
      kayitSayacRef.current = setInterval(() => {
        setKayitSuresi((s) => s + 1);
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(kayitAnim, { toValue: 1.25, duration: 400, useNativeDriver: true }),
          Animated.timing(kayitAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      if (kayitSayacRef.current) clearInterval(kayitSayacRef.current);
      setKayitSuresi(0);
      kayitAnim.setValue(1);
    }
    return () => {
      if (kayitSayacRef.current) clearInterval(kayitSayacRef.current);
    };
  }, [videoKayitYapiliyor, kayitAnim]);

  function ekranaDokunuldu(e) {
    const { locationX, locationY } = e.nativeEvent;
    // Üst bar ve alt bar kontrollerine denk gelen basışlarda odaklama yapma
    if (locationY < 80 || locationY > EKRAN_YUKSEKLIK - 170) return;

    setOdakNoktasi({
      x: Math.max(50, Math.min(EKRAN_GENISLIK - 50, locationX)),
      y: Math.max(90, Math.min(EKRAN_YUKSEKLIK - 210, locationY)),
    });

    odakAnim.setValue(0);
    Animated.spring(odakAnim, { toValue: 1, useNativeDriver: true }).start();

    if (odakKaybolTimerRef.current) clearTimeout(odakKaybolTimerRef.current);
    odakKaybolTimerRef.current = setTimeout(() => {
      Animated.timing(odakAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setOdakNoktasi(null);
      });
    }, 4000);
  }

  if (!visible) return null;

  function kameraCevir() {
    setKameraYonu((m) => (m === 'back' ? 'front' : 'back'));
  }

  function flasDegistir() {
    setFlasModu((m) => (m === 'off' ? 'on' : m === 'on' ? 'auto' : 'off'));
  }

  // Deklanşöre Tek Tık: Fotoğraf Çek veya Video Kaydını Başlat/Durdur
  async function deklansorTiklandi() {
    if (kameraModu === 'video' && mod !== 'profil') {
      if (videoKayitYapiliyor) {
        videoKaydiDurdur();
      } else {
        videoKaydiBaslat();
      }
    } else {
      fotografCek();
    }
  }

  // Fotoğraf Çek
  async function fotografCek() {
    if (!cameraRef.current) return;
    try {
      const foto = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        shutterSound: false,
        skipProcessing: false,
      });
      if (foto?.uri) {
        if (mod === 'profil') {
          onGonder({ secim: { uri: foto.uri, tur: 'foto', base64: null, mimeTuru: 'image/jpeg' } });
          onKapat();
          return;
        }

        // Vizör tam ekran dikey gösteriyor; fotoğraf sensörden 4:3 geliyor.
        // Çekilen fotovu vizör aspect ratio'suna (ekran) krop ediyoruz.
        let finalUri = foto.uri;
        try {
          const fotoGenislik = foto.width || 0;
          const fotoYukseklik = foto.height || 0;
          if (fotoGenislik > 0 && fotoYukseklik > 0) {
            // Hedef oran: vizör portrait (ekran yükseklik / ekran genişlik)
            const hedefOran = EKRAN_YUKSEKLIK / EKRAN_GENISLIK;
            const mevcut = fotoYukseklik / fotoGenislik;
            if (Math.abs(mevcut - hedefOran) > 0.05) {
              // Krop gerekli
              let kropGenislik = fotoGenislik;
              let kropYukseklik = Math.round(fotoGenislik * hedefOran);
              if (kropYukseklik > fotoYukseklik) {
                kropYukseklik = fotoYukseklik;
                kropGenislik = Math.round(fotoYukseklik / hedefOran);
              }
              const originX = Math.round((fotoGenislik - kropGenislik) / 2);
              const originY = Math.round((fotoYukseklik - kropYukseklik) / 2);
              const kirpilmis = await ImageManipulator.manipulateAsync(
                foto.uri,
                [{ crop: { originX, originY, width: kropGenislik, height: kropYukseklik } }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
              );
              finalUri = kirpilmis.uri;
            }
          }
        } catch (e) {
          console.warn('Krop başarısız, orijinal kullanılıyor:', e);
        }

        setYakalananMedya({
          uri: finalUri,
          tur: 'foto',
          base64: null,
          mimeTuru: 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('Fotoğraf çekme hatası:', err);
    }
  }

  // Video Kaydı Başlat
  async function videoKaydiBaslat() {
    if (mod === 'profil') return;
    if (!cameraRef.current || videoKayitYapiliyor) return;
    try {
      if (kameraModu !== 'video') {
        setKameraModu('video');
        await new Promise((r) => setTimeout(r, 250));
      }
      setVideoKayitYapiliyor(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      setVideoKayitYapiliyor(false);
      if (video?.uri) {
        setYakalananMedya({
          uri: video.uri,
          tur: 'video',
          base64: null,
          mimeTuru: 'video/mp4',
        });
      }
    } catch (err) {
      console.warn('Video kayıt hatası:', err);
      setVideoKayitYapiliyor(false);
    }
  }

  // Video Kaydını Bitir
  function videoKaydiDurdur() {
    if (videoKayitYapiliyor && cameraRef.current) {
      try {
        cameraRef.current.stopRecording();
      } catch (e) {}
    }
  }

  // Galeriden Seçim
  async function galeridenSec() {
    const secim = await medyaSec();
    if (secim && !secim.hata) {
      setYakalananMedya(secim);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onKapat}>
      <StatusBar hidden />
      <View style={styles.kok}>
        {/* İzin Verilmemişse */}
        {!kameraIzin?.granted ? (
          <View style={styles.izinKutusu}>
            <Text style={styles.izinBaslik}>Kamera İzni Gerekli</Text>
            <Text style={styles.izinMetin}>
              Fotoğraf ve video çekebilmek için lütfen kamera erişimine izin verin.
            </Text>
            <TouchableOpacity style={styles.izinButon} onPress={requestKameraIzin}>
              <Text style={styles.izinButonMetin}>İzin Ver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.izinKapatButon} onPress={onKapat}>
              <Text style={styles.izinKapatMetin}>Kapat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Canlı Kamera Vizörü (Ana Kamera Sabit 1x) */}
            <TouchableOpacity activeOpacity={1} onPress={ekranaDokunuldu} style={StyleSheet.absoluteFill}>
              <CameraView
                ref={cameraRef}
                style={styles.vizor}
                facing={kameraYonu}
                enableTorch={flasModu === 'on'}
                mode={kameraModu}
                videoQuality="720p"
                shutterSound={false}
                mute={kameraModu !== 'video'}
                autofocus="on"
                autoFocus="on"
              />

              {/* Yuvarlak Sarı Odak Halkası */}
              {odakNoktasi && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.odakKapsayici,
                    {
                      left: odakNoktasi.x - 36,
                      top: odakNoktasi.y - 36,
                      opacity: odakAnim,
                      transform: [
                        {
                          scale: odakAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1.3, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.odakHalkasi}>
                    <View style={styles.odakMerkezNokta} />
                  </View>
                </Animated.View>
              )}
            </TouchableOpacity>

            {/* Üst Bar: Kapat, Flaş, Video Kayıt Sayacı */}
            <View style={[styles.ustBar, { top: insets.top + 10 }]}>
              <TouchableOpacity style={styles.yuvarlakButon} onPress={onKapat} activeOpacity={0.8}>
                <KapatVektorIkon />
              </TouchableOpacity>

              {videoKayitYapiliyor && (
                <View style={styles.kayitSayacKutusu}>
                  <Animated.View style={[styles.kirmiziNokta, { transform: [{ scale: kayitAnim }] }]} />
                  <Text style={styles.kayitSayacMetin}>
                    {Math.floor(kayitSuresi / 60)}:{(kayitSuresi % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.yuvarlakButon} onPress={flasDegistir} activeOpacity={0.8}>
                <FlasVektorIkon mod={flasModu} />
              </TouchableOpacity>
            </View>

            {/* Mod Seçici: FOTOĞRAF / VİDEO (Profil modunda gizli) */}
            {mod !== 'profil' && (
              <View style={[styles.modSeciciKutusu, { bottom: Math.max(insets.bottom, 24) + 96 }]}>
                <TouchableOpacity
                  onPress={() => !videoKayitYapiliyor && setKameraModu('picture')}
                  style={[styles.modButon, kameraModu === 'picture' && styles.modButonAktif]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modMetin, kameraModu === 'picture' && styles.modMetinAktif]}>
                    FOTOĞRAF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => !videoKayitYapiliyor && setKameraModu('video')}
                  style={[styles.modButon, kameraModu === 'video' && styles.modButonAktif]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modMetin, kameraModu === 'video' && styles.modMetinAktif]}>
                    VİDEO
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Alt Bar: Galeri, Deklanşör, Kamera Çevir (Instagram / Snapchat Stili) */}
            <View style={[styles.altBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              {/* Sol: Minimalist Galeri İkonu */}
              <TouchableOpacity style={styles.yuvarlakButon} onPress={galeridenSec} activeOpacity={0.8}>
                <GaleriVektorIkon />
              </TouchableOpacity>

              {/* Orta: Hibrit Deklanşör (Tek dokun: Çek/Kaydet, Basılı tut: Hızlı Video) */}
              <TouchableOpacity
                style={[
                  styles.deklansorDis,
                  kameraModu === 'video' && styles.deklansorDisVideo,
                  videoKayitYapiliyor && styles.deklansorDisKayit,
                ]}
                onPress={deklansorTiklandi}
                onLongPress={videoKaydiBaslat}
                onPressOut={videoKaydiDurdur}
                delayLongPress={350}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.deklansorIc,
                    kameraModu === 'video' && styles.deklansorIcVideo,
                    videoKayitYapiliyor && styles.deklansorIcKayit,
                  ]}
                />
              </TouchableOpacity>

              {/* Sağ: Minimalist Kamera Çevir İkonu */}
              <TouchableOpacity style={styles.yuvarlakButon} onPress={kameraCevir} activeOpacity={0.8}>
                <CevirVektorIkon />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Fotoğraf/Video Çekildiğinde Açılan Instagram/WhatsApp Stüdyosu */}
        <OzelMedyaDuzenleyici
          visible={!!yakalananMedya}
          medya={yakalananMedya}
          mod={mod}
          onKapat={() => setYakalananMedya(null)}
          onGonder={(sonuc) => {
            setYakalananMedya(null);
            onGonder(sonuc);
            onKapat();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: '#000000',
  },
  izinKutusu: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  izinBaslik: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  izinMetin: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  izinButon: {
    backgroundColor: '#00a8ff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  izinButonMetin: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  izinKapatButon: {
    paddingVertical: 10,
  },
  izinKapatMetin: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  vizor: {
    ...StyleSheet.absoluteFillObject,
  },
  ustBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  yuvarlakButon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 20, 28, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  kayitSayacKutusu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff2d55',
  },
  kirmiziNokta: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff2d55',
  },
  kayitSayacMetin: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Alt Bar
  altBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  deklansorDis: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deklansorDisKayit: {
    borderColor: '#ff2d55',
    transform: [{ scale: 1.15 }],
  },
  deklansorIc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
  },
  deklansorIcKayit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ff2d55',
  },
  deklansorDisVideo: {
    borderColor: '#ff3b30',
  },
  deklansorIcVideo: {
    backgroundColor: '#ff3b30',
  },
  modSeciciKutusu: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  modButon: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modButonAktif: {
    borderBottomWidth: 2,
    borderBottomColor: '#f1c40f',
  },
  modMetin: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modMetinAktif: {
    color: '#ffffff',
  },
  odakKapsayici: {
    position: 'absolute',
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  odakHalkasi: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ffd600',
    backgroundColor: 'rgba(255, 214, 0, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  odakMerkezNokta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffd600',
  },
});

const ikonStilleri = StyleSheet.create({
  // Kapat
  kapatKutu: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  caprazCizgi: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },

  // Flaş
  flasKutu: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  simsekUst: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 3,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
    transform: [{ rotate: '-15deg' }],
  },
  simsekAlt: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 5,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
    marginTop: -3,
    marginLeft: 3,
    transform: [{ rotate: '-15deg' }],
  },
  flasOtoYazi: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    color: '#00a8ff',
    fontSize: 9,
    fontWeight: '900',
  },
  flasCizik: {
    position: 'absolute',
    width: 22,
    height: 2,
    backgroundColor: '#ff3b30',
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },

  // Galeri
  galeriCerceve: {
    width: 24,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 2,
  },
  galeriDaire: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  galeriTepeler: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 8,
  },
  galeriTepeSol: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
  },
  galeriTepeSag: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
    marginLeft: -2,
  },

  // Çevir
  cevirDaire: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cevirYayUst: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#ffffff',
  },
  cevirOkUst: {
    position: 'absolute',
    top: 6,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
  },
  cevirYayAlt: {
    position: 'absolute',
    bottom: 2,
    width: 20,
    height: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#ffffff',
  },
  cevirOkAlt: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderRightWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#ffffff',
  },
});
