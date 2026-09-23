import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bosluk } from '../theme';

const { width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK } = Dimensions.get('window');

const RENKLER = [
  '#ffffff', // Beyaz
  '#000000', // Siyah
  '#00a8ff', // Neon Mavi
  '#ff2d6a', // Canlı Pembe
  '#ffd600', // Güneş Sarısı
  '#00e676', // Parlak Yeşil
  '#ff6d00', // Sıcak Turuncu
  '#b388ff', // Pastel Mor
];

const ARKA_PLAN_MODLARI = [
  { id: 'yok', etiket: 'Saydam' },
  { id: 'yariSaydam', etiket: 'Hap Kutu' },
  { id: 'dolu', etiket: 'Dolu Renk' },
  { id: 'neon', etiket: 'Neon Çerçeve' },
];

export default function OzelMedyaDuzenleyici({
  visible,
  medya, // { uri, tur: 'foto' | 'video', base64, mimeTuru }
  mod = 'sohbet', // 'sohbet' | 'hikaye'
  onKapat,
  onGonder, // ({ secim, yaziKatmani, baslik, tekGorunum, sigdir }) => void
}) {
  const insets = useSafeAreaInsets();

  // Aktif Medya ve Sığdır Modu
  const [aktifMedya, setAktifMedya] = useState(medya);
  const [sigdir, setSigdir] = useState(false);

  useEffect(() => {
    setAktifMedya(medya);
    setSigdir(false);
  }, [medya]);

  // Metin Düzenleme State'leri
  const [yaziDuzenlemeAcik, setYaziDuzenlemeAcik] = useState(false);
  const [yaziMetni, setYaziMetni] = useState('');
  const [yaziRengi, setYaziRengi] = useState('#ffffff');
  const [arkaplanModuIndex, setArkaplanModuIndex] = useState(1); // Varsayılan: 'yariSaydam'

  // Alt Bar State'leri
  const [altBaslik, setAltBaslik] = useState('');
  const [tekGorunum, setTekGorunum] = useState(false);

  // Sürüklenebilir Metin Konumu (Dikey ve Yatay)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: EKRAN_YUKSEKLIK * 0.35 })).current;
  const sonKonum = useRef({ x: 0, y: EKRAN_YUKSEKLIK * 0.35 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !yaziDuzenlemeAcik && !!yaziMetni,
        onMoveShouldSetPanResponder: () => !yaziDuzenlemeAcik && !!yaziMetni,
        onPanResponderGrant: () => {
          pan.setOffset({
            x: sonKonum.current.x,
            y: sonKonum.current.y,
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (e, gesture) => {
          pan.flattenOffset();
          sonKonum.current = {
            x: Math.min(Math.max(sonKonum.current.x + gesture.dx, -EKRAN_GENISLIK * 0.35), EKRAN_GENISLIK * 0.35),
            y: Math.min(Math.max(sonKonum.current.y + gesture.dy, 80), EKRAN_YUKSEKLIK - 180),
          };
          pan.setValue(sonKonum.current);
        },
      }),
    [yaziDuzenlemeAcik, yaziMetni, pan]
  );

  if (!visible || !medya || !aktifMedya) return null;

  const aktifArkaplanModu = ARKA_PLAN_MODLARI[arkaplanModuIndex].id;

  function arkaplanModuDegistir() {
    setArkaplanModuIndex((prev) => (prev + 1) % ARKA_PLAN_MODLARI.length);
  }

  function yaziDuzenlemeBitir() {
    setYaziDuzenlemeAcik(false);
  }

  async function kirpmaBaslat() {
    try {
      const sonuc = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.95,
      });
      if (!sonuc.canceled && sonuc.assets && sonuc.assets[0]) {
        setAktifMedya((prev) => ({
          ...prev,
          uri: sonuc.assets[0].uri,
          mimeTuru: sonuc.assets[0].mimeType || 'image/jpeg',
          tur: 'foto',
        }));
      }
    } catch (e) {
      console.warn('Kırpma açılamadı:', e.message);
    }
  }

  function gonder() {
    const yaziKatmani = yaziMetni.trim()
      ? {
          metin: yaziMetni.trim(),
          renk: yaziRengi,
          arkaplanModu: aktifArkaplanModu,
          konumYOrani: sonKonum.current.y / EKRAN_YUKSEKLIK,
          konumXOrani: sonKonum.current.x / EKRAN_GENISLIK,
        }
      : null;

    onGonder({
      secim: aktifMedya,
      yaziKatmani,
      baslik: altBaslik.trim(),
      tekGorunum,
      sigdir,
    });
  }

  // Metin Kutusunun Stilleri (Moda Göre)
  const yaziKutuStili = () => {
    switch (aktifArkaplanModu) {
      case 'yariSaydam':
        return {
          backgroundColor: 'rgba(15, 20, 28, 0.72)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        };
      case 'dolu':
        return {
          backgroundColor: yaziRengi,
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      case 'neon':
        return {
          backgroundColor: 'rgba(12, 16, 24, 0.85)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: yaziRengi,
        };
      case 'yok':
      default:
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          textShadowColor: 'rgba(0, 0, 0, 0.85)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 6,
        };
    }
  };

  const yaziRenkStili = () => {
    if (aktifArkaplanModu === 'dolu') {
      // Dolu renkte zıt metin rengi
      return yaziRengi === '#ffffff' || yaziRengi === '#ffd600' || yaziRengi === '#00e676'
        ? '#121620'
        : '#ffffff';
    }
    return yaziRengi;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onKapat}>
      <StatusBar hidden />
      <View style={styles.kok}>
        {/* Medya Görüntüleyici */}
        <View style={styles.medyaKonteyner}>
          {sigdir && (
            <>
              <Image
                source={{ uri: aktifMedya.uri }}
                style={styles.sigdirBulanikArkaplan}
                blurRadius={24}
                resizeMode="cover"
              />
              <View style={styles.sigdirKarartma} />
            </>
          )}
          {aktifMedya.tur === 'video' ? (
            <Video
              source={{ uri: aktifMedya.uri }}
              style={styles.tamEkranMedya}
              resizeMode={sigdir ? ResizeMode.CONTAIN : ResizeMode.COVER}
              isLooping
              shouldPlay
              isMuted={false}
              useNativeControls={false}
            />
          ) : (
            <Image
              source={{ uri: aktifMedya.uri }}
              style={styles.tamEkranMedya}
              resizeMode={sigdir ? 'contain' : 'cover'}
            />
          )}
        </View>

        {/* Sürüklenebilir Metin Katmanı (Düzenleme kapalıyken) */}
        {!yaziDuzenlemeAcik && yaziMetni.trim() ? (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.suruklenebilirYaziKapsayici,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={() => setYaziDuzenlemeAcik(true)}>
              <View style={yaziKutuStili()}>
                <Text style={[styles.canliMetin, { color: yaziRenkStili() }]}>{yaziMetni}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Üst Araç Çubuğu (Düzenleme kapalıyken) */}
        {!yaziDuzenlemeAcik && (
          <View style={[styles.ustBar, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.ustIkonButon} onPress={onKapat}>
              <Text style={styles.ustIkonMetin}>✕</Text>
            </TouchableOpacity>

            <View style={styles.ustSagGrup}>
              {/* Sığdır / Doldur Butonu */}
              <TouchableOpacity
                style={[styles.ustIkonButon, sigdir && styles.ustIkonAktif]}
                onPress={() => setSigdir((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={styles.ustIkonMetin}>{sigdir ? '⤢' : '📐'}</Text>
              </TouchableOpacity>

              {/* Kırpma Butonu (Fotoğraflar için) */}
              {aktifMedya.tur !== 'video' && (
                <TouchableOpacity
                  style={styles.ustIkonButon}
                  onPress={kirpmaBaslat}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ustIkonMetin}>✂</Text>
                </TouchableOpacity>
              )}

              {/* Metin Aracı Butonu */}
              <TouchableOpacity
                style={[styles.ustIkonButon, yaziMetni.trim() && styles.ustIkonAktif]}
                onPress={() => setYaziDuzenlemeAcik(true)}
              >
                <Text style={styles.aaIkonMetin}>Aa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Canlı Metin Düzenleme Modu (Instagram Tarzı Overlay) */}
        {yaziDuzenlemeAcik && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.yaziDuzenlemeOverlay}
          >
            {/* Üst Ayarlar: Bitti, Arkaplan Kutusu Değiştirici */}
            <View style={[styles.yaziDuzenlemeUstBar, { top: insets.top + 8 }]}>
              <TouchableOpacity style={styles.arkaplanModuButon} onPress={arkaplanModuDegistir}>
                <View style={styles.arkaplanModuIkonKare}>
                  <Text style={styles.arkaplanModuIkonHarf}>A</Text>
                </View>
                <Text style={styles.arkaplanModuMetin}>{ARKA_PLAN_MODLARI[arkaplanModuIndex].etiket}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.bittiButon} onPress={yaziDuzenlemeBitir}>
                <Text style={styles.bittiButonMetni}>Bitti</Text>
              </TouchableOpacity>
            </View>

            {/* Merkez Metin Girişi */}
            <View style={styles.metinGirdiMerkez}>
              <View style={yaziKutuStili()}>
                <TextInput
                  style={[styles.metinGirdisi, { color: yaziRenkStili() }]}
                  placeholder="Yazı ekle..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={yaziMetni}
                  onChangeText={setYaziMetni}
                  multiline
                  autoFocus
                  maxLength={160}
                />
              </View>
            </View>

            {/* Renk Seçim Paleti */}
            <View style={styles.renkPaleti}>
              {RENKLER.map((renk) => (
                <TouchableOpacity
                  key={renk}
                  style={[
                    styles.renkNoktasi,
                    { backgroundColor: renk },
                    yaziRengi === renk && styles.renkSecili,
                  ]}
                  onPress={() => setYaziRengi(renk)}
                />
              ))}
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Alt Çubuk (Açıklama Girişi + Gönder Butonu) */}
        {!yaziDuzenlemeAcik && (
          <View style={[styles.altBar, { paddingBottom: Math.max(insets.bottom, bosluk.sm) }]}>
            {/* Tek Görünüm (Sohbet için) */}
            {mod === 'sohbet' && (
              <TouchableOpacity
                style={[styles.tekGorunumButon, tekGorunum && styles.tekGorunumSecili]}
                onPress={() => setTekGorunum(!tekGorunum)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tekGorunumSayi, tekGorunum && styles.tekGorunumSayiSecili]}>1</Text>
              </TouchableOpacity>
            )}

            {/* Açıklama Girişi */}
            <TextInput
              style={styles.altBaslikGirdi}
              placeholder="Açıklama ekle..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={altBaslik}
              onChangeText={setAltBaslik}
              maxLength={200}
            />

            {/* Gönder Butonu */}
            <TouchableOpacity style={styles.gonderDaireButon} onPress={gonder} activeOpacity={0.85}>
              <Text style={styles.gonderOk}>➤</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: '#000000',
  },
  medyaKonteyner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tamEkranMedya: {
    width: EKRAN_GENISLIK,
    height: EKRAN_YUKSEKLIK,
  },
  sigdirBulanikArkaplan: {
    ...StyleSheet.absoluteFillObject,
    width: EKRAN_GENISLIK,
    height: EKRAN_YUKSEKLIK,
    opacity: 0.55,
  },
  sigdirKarartma: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  ustIkonButon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ustIkonAktif: {
    backgroundColor: '#00a8ff',
    borderColor: '#00a8ff',
  },
  ustIkonMetin: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  ustSagGrup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aaIkonMetin: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    fontStyle: 'italic',
  },

  // Canlı Sürüklenebilir Metin
  suruklenebilirYaziKapsayici: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 5,
    maxWidth: EKRAN_GENISLIK * 0.85,
  },
  canliMetin: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
  },

  // Metin Düzenleme Modu
  yaziDuzenlemeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'space-between',
    zIndex: 20,
    paddingHorizontal: 20,
  },
  yaziDuzenlemeUstBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  arkaplanModuButon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 8,
  },
  arkaplanModuIkonKare: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arkaplanModuIkonHarf: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  arkaplanModuMetin: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  bittiButon: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bittiButonMetni: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
  },

  metinGirdiMerkez: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metinGirdisi: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 120,
    maxWidth: EKRAN_GENISLIK * 0.85,
  },

  renkPaleti: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
    gap: 12,
  },
  renkNoktasi: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  renkSecili: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.25 }],
    shadowColor: '#ffffff',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },

  // Alt Bar
  altBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(12, 15, 20, 0.85)',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tekGorunumButon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tekGorunumSecili: {
    backgroundColor: '#00a8ff',
    borderColor: '#00a8ff',
  },
  tekGorunumSayi: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '800',
    fontSize: 15,
  },
  tekGorunumSayiSecili: {
    color: '#ffffff',
  },
  altBaslikGirdi: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    color: '#ffffff',
    fontSize: 14,
  },
  gonderDaireButon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00a8ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00a8ff',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  gonderOk: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 2,
  },
});
