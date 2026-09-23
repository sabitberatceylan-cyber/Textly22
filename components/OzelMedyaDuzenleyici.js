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
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
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

  // Aktif Medya, Sığdır Modu ve Uygulama İçi Kırpıcı
  const [aktifMedya, setAktifMedya] = useState(medya);
  const [sigdir, setSigdir] = useState(false);
  const [kirpmaModalAcik, setKirpmaModalAcik] = useState(false);

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

  function kirpmaBaslat() {
    if (aktifMedya?.tur !== 'video' && aktifMedya?.uri) {
      setKirpmaModalAcik(true);
    }
  }

  function kirpmaTamamlandi(yeniUri) {
    if (yeniUri) {
      setAktifMedya((prev) => ({
        ...prev,
        uri: yeniUri,
        tur: 'foto',
        mimeTuru: 'image/jpeg',
      }));
    }
    setKirpmaModalAcik(false);
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

        {/* 4 Yandan Etkileşimli Kırpıcı Modalı */}
        <GorselKirpici
          visible={kirpmaModalAcik}
          resimUri={aktifMedya?.tur !== 'video' ? aktifMedya?.uri : null}
          onKapat={() => setKirpmaModalAcik(false)}
          onKirpildi={kirpmaTamamlandi}
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

  // 4 Yandan Kırpıcı Stilleri
  kirpmaKok: {
    flex: 1,
    backgroundColor: '#0a0d12',
  },
  kirpmaUstBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  kirpmaIptalMetin: {
    color: '#ff5252',
    fontSize: 15,
    fontWeight: '600',
  },
  kirpmaBaslikMetin: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  kirpmaUygulaMetin: {
    color: '#00a8ff',
    fontSize: 15,
    fontWeight: '700',
  },
  kirpmaGovde: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  kirpmaCanvas: {
    position: 'relative',
    overflow: 'hidden',
  },
  kirpmaMaske: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  kirpmaKutusu: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  kirpmaIzgaraYatay1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  kirpmaIzgaraYatay2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  kirpmaIzgaraDikey1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  kirpmaIzgaraDikey2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  tutamacKose: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#00a8ff',
  },
  tutamacSolUst: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  tutamacSagUst: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  tutamacSolAlt: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  tutamacSagAlt: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  tutamacKenarUst: {
    position: 'absolute',
    top: -12,
    left: 32,
    right: 32,
    height: 24,
  },
  tutamacKenarAlt: {
    position: 'absolute',
    bottom: -12,
    left: 32,
    right: 32,
    height: 24,
  },
  tutamacKenarSol: {
    position: 'absolute',
    left: -12,
    top: 32,
    bottom: 32,
    width: 24,
  },
  tutamacKenarSag: {
    position: 'absolute',
    right: -12,
    top: 32,
    bottom: 32,
    width: 24,
  },
  kirpmaAltBar: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0d1117',
  },
  oranlarSatiri: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  oranButon: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  oranButonAktif: {
    backgroundColor: '#00a8ff',
  },
  oranMetin: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '600',
  },
  oranMetinAktif: {
    color: '#ffffff',
    fontWeight: '800',
  },
});

// -------------------------------------------------------------------
// 4 YANDAN VE KÖŞELERDEN KONTROLLÜ UYGULAMA İÇİ GÖRSEL KIRPICI
// -------------------------------------------------------------------
function GorselKirpici({ visible, resimUri, onKapat, onKirpildi }) {
  const insets = useSafeAreaInsets();
  const [dogalBoyut, setDogalBoyut] = useState({ w: 0, h: 0 });
  const [canvasBoyut, setCanvasBoyut] = useState({ w: 0, h: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [seciliOran, setSeciliOran] = useState('serbest');
  const [kirpiliyor, setKirpiliyor] = useState(false);

  const cropRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  cropRef.current = cropBox;
  const canvasRef = useRef({ w: 0, h: 0 });
  canvasRef.current = canvasBoyut;

  // Görsel boyutunu al ve canvası hesapla
  useEffect(() => {
    if (!visible || !resimUri) return;
    Image.getSize(
      resimUri,
      (w, h) => {
        const dogalW = w > 0 ? w : 1080;
        const dogalH = h > 0 ? h : 1920;
        setDogalBoyut({ w: dogalW, h: dogalH });
        const maxW = EKRAN_GENISLIK - 32;
        const maxH = EKRAN_YUKSEKLIK - insets.top - insets.bottom - 180;
        const scale = Math.min(maxW / dogalW, maxH / dogalH);
        const cW = Math.max(100, Math.round(dogalW * scale));
        const cH = Math.max(100, Math.round(dogalH * scale));
        setCanvasBoyut({ w: cW, h: cH });
        setCropBox({ x: 0, y: 0, w: cW, h: cH });
        setSeciliOran('serbest');
      },
      (e) => {
        console.warn('Görsel boyutu alınamadı, varsayılan boyut kullanılıyor:', e);
        const dogalW = 1080;
        const dogalH = 1920;
        setDogalBoyut({ w: dogalW, h: dogalH });
        const maxW = EKRAN_GENISLIK - 32;
        const maxH = EKRAN_YUKSEKLIK - insets.top - insets.bottom - 180;
        const scale = Math.min(maxW / dogalW, maxH / dogalH);
        const cW = Math.max(100, Math.round(dogalW * scale));
        const cH = Math.max(100, Math.round(dogalH * scale));
        setCanvasBoyut({ w: cW, h: cH });
        setCropBox({ x: 0, y: 0, w: cW, h: cH });
        setSeciliOran('serbest');
      }
    );
  }, [visible, resimUri, insets]);

  function oranaAyarla(oranKey) {
    setSeciliOran(oranKey);
    const { w: cW, h: cH } = canvasBoyut;
    if (cW <= 0 || cH <= 0) return;
    if (oranKey === 'serbest') {
      setCropBox({ x: 0, y: 0, w: cW, h: cH });
      return;
    }
    let hedefOran = 1;
    if (oranKey === '1:1') hedefOran = 1;
    else if (oranKey === '4:5') hedefOran = 4 / 5;
    else if (oranKey === '9:16') hedefOran = 9 / 16;
    else if (oranKey === '16:9') hedefOran = 16 / 9;

    let yeniW = cW;
    let yeniH = Math.round(cW / hedefOran);
    if (yeniH > cH) {
      yeniH = cH;
      yeniW = Math.round(cH * hedefOran);
    }
    const x = Math.max(0, Math.round((cW - yeniW) / 2));
    const y = Math.max(0, Math.round((cH - yeniH) / 2));
    setCropBox({ x, y, w: Math.min(yeniW, cW), h: Math.min(yeniH, cH) });
  }

  const dragBaslangic = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // 1. Orta Alan (Taşıma)
  const panOrta = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        const c = canvasRef.current;
        if (!b) return;
        const maxKutuX = Math.max(0, (c.w || EKRAN_GENISLIK) - b.w);
        const maxKutuY = Math.max(0, (c.h || EKRAN_YUKSEKLIK) - b.h);
        const yeniX = Math.min(Math.max(0, b.x + g.dx), maxKutuX);
        const yeniY = Math.min(Math.max(0, b.y + g.dy), maxKutuY);
        setCropBox((prev) => ({ ...prev, x: Math.max(0, Math.round(yeniX)), y: Math.max(0, Math.round(yeniY)) }));
      },
    })
  ).current;

  // 2. Sol-Üst Köşe
  const panSolUst = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        if (!b) return;
        const sag = b.x + b.w;
        const alt = b.y + b.h;
        const yeniX = Math.min(Math.max(0, b.x + g.dx), sag - 50);
        const yeniY = Math.min(Math.max(0, b.y + g.dy), alt - 50);
        setCropBox({ x: Math.round(yeniX), y: Math.round(yeniY), w: Math.max(50, Math.round(sag - yeniX)), h: Math.max(50, Math.round(alt - yeniY)) });
      },
    })
  ).current;

  // 3. Sağ-Üst Köşe
  const panSagUst = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        const c = canvasRef.current;
        if (!b) return;
        const alt = b.y + b.h;
        const maxW = (c.w || EKRAN_GENISLIK) - b.x;
        const yeniW = Math.min(Math.max(50, b.w + g.dx), maxW);
        const yeniY = Math.min(Math.max(0, b.y + g.dy), alt - 50);
        setCropBox({ x: Math.round(b.x), y: Math.round(yeniY), w: Math.round(yeniW), h: Math.max(50, Math.round(alt - yeniY)) });
      },
    })
  ).current;

  // 4. Sol-Alt Köşe
  const panSolAlt = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        const c = canvasRef.current;
        if (!b) return;
        const sag = b.x + b.w;
        const maxH = (c.h || EKRAN_YUKSEKLIK) - b.y;
        const yeniX = Math.min(Math.max(0, b.x + g.dx), sag - 50);
        const yeniH = Math.min(Math.max(50, b.h + g.dy), maxH);
        setCropBox({ x: Math.round(yeniX), y: Math.round(b.y), w: Math.max(50, Math.round(sag - yeniX)), h: Math.round(yeniH) });
      },
    })
  ).current;

  // 5. Sağ-Alt Köşe
  const panSagAlt = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        const c = canvasRef.current;
        if (!b) return;
        const maxW = (c.w || EKRAN_GENISLIK) - b.x;
        const maxH = (c.h || EKRAN_YUKSEKLIK) - b.y;
        const yeniW = Math.min(Math.max(50, b.w + g.dx), maxW);
        const yeniH = Math.min(Math.max(50, b.h + g.dy), maxH);
        setCropBox({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(yeniW), h: Math.round(yeniH) });
      },
    })
  ).current;

  // 6. Üst Kenar
  const panUstKenar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        if (!b) return;
        const alt = b.y + b.h;
        const yeniY = Math.min(Math.max(0, b.y + g.dy), alt - 50);
        setCropBox((prev) => ({ ...prev, y: Math.round(yeniY), h: Math.max(50, Math.round(alt - yeniY)) }));
      },
    })
  ).current;

  // 7. Alt Kenar
  const panAltKenar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        const c = canvasRef.current;
        if (!b) return;
        const maxH = (c.h || EKRAN_YUKSEKLIK) - b.y;
        const yeniH = Math.min(Math.max(50, b.h + g.dy), maxH);
        setCropBox((prev) => ({ ...prev, h: Math.round(yeniH) }));
      },
    })
  ).current;

  // 8. Sol Kenar
  const panSolKenar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        if (!b) return;
        const sag = b.x + b.w;
        const yeniX = Math.min(Math.max(0, b.x + g.dx), sag - 50);
        setCropBox((prev) => ({ ...prev, x: Math.round(yeniX), w: Math.max(50, Math.round(sag - yeniX)) }));
      },
    })
  ).current;

  // 9. Sağ Kenar
  const panSagKenar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBaslangic.current = { ...cropRef.current };
      },
      onPanResponderMove: (e, g) => {
        const b = dragBaslangic.current;
        const c = canvasRef.current;
        if (!b) return;
        const maxW = (c.w || EKRAN_GENISLIK) - b.x;
        const yeniW = Math.min(Math.max(50, b.w + g.dx), maxW);
        setCropBox((prev) => ({ ...prev, w: Math.round(yeniW) }));
      },
    })
  ).current;

  async function kirpVeUygula() {
    if (!resimUri || cropBox.w <= 0 || cropBox.h <= 0 || canvasBoyut.w <= 0 || canvasBoyut.h <= 0) return;
    setKirpiliyor(true);
    try {
      let realW = dogalBoyut.w;
      let realH = dogalBoyut.h;
      if (!realW || isNaN(realW) || realW <= 0) realW = canvasBoyut.w;
      if (!realH || isNaN(realH) || realH <= 0) realH = canvasBoyut.h;

      const scaleW = realW / canvasBoyut.w;
      const scaleH = realH / canvasBoyut.h;

      let originX = Math.round(cropBox.x * scaleW);
      let originY = Math.round(cropBox.y * scaleH);
      let width = Math.round(cropBox.w * scaleW);
      let height = Math.round(cropBox.h * scaleH);

      if (isNaN(originX) || originX < 0) originX = 0;
      if (isNaN(originY) || originY < 0) originY = 0;
      if (isNaN(width) || width <= 10) width = Math.max(10, realW - originX);
      if (isNaN(height) || height <= 10) height = Math.max(10, realH - originY);

      if (originX + width > realW) width = Math.max(10, realW - originX);
      if (originY + height > realH) height = Math.max(10, realH - originY);

      const sonuc = await ImageManipulator.manipulateAsync(
        resimUri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (sonuc && sonuc.uri) {
        onKirpildi(sonuc.uri);
      }
    } catch (e) {
      console.warn('[kirp] Hata:', e);
      Alert.alert('Kırpma Yapılamadı', 'Fotoğraf kırpılırken bir hata oluştu: ' + (e.message || ''));
    } finally {
      setKirpiliyor(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onKapat}>
      <View style={[styles.kirpmaKok, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0d12" />

        {/* Üst Çubuk */}
        <View style={styles.kirpmaUstBar}>
          <TouchableOpacity onPress={onKapat} disabled={kirpiliyor} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.kirpmaIptalMetin}>Vazgeç</Text>
          </TouchableOpacity>
          <Text style={styles.kirpmaBaslikMetin}>Fotoğrafı Kırp</Text>
          <TouchableOpacity onPress={kirpVeUygula} disabled={kirpiliyor} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {kirpiliyor ? (
              <ActivityIndicator color="#00a8ff" size="small" />
            ) : (
              <Text style={styles.kirpmaUygulaMetin}>Kırp</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Görsel ve Kırpma Alanı */}
        <View style={styles.kirpmaGovde}>
          {canvasBoyut.w > 0 && canvasBoyut.h > 0 && (
            <View style={[styles.kirpmaCanvas, { width: canvasBoyut.w, height: canvasBoyut.h }]}>
              <Image source={{ uri: resimUri }} style={{ width: canvasBoyut.w, height: canvasBoyut.h }} resizeMode="contain" />

              {/* 4 Taraflı Karartma Maskeleri */}
              <View style={[styles.kirpmaMaske, { top: 0, left: 0, right: 0, height: cropBox.y }]} />
              <View style={[styles.kirpmaMaske, { top: cropBox.y + cropBox.h, left: 0, right: 0, bottom: 0 }]} />
              <View style={[styles.kirpmaMaske, { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.h }]} />
              <View style={[styles.kirpmaMaske, { top: cropBox.y, left: cropBox.x + cropBox.w, right: 0, height: cropBox.h }]} />

              {/* Kırpma Dikdörtgeni */}
              <View
                style={[
                  styles.kirpmaKutusu,
                  {
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.w,
                    height: cropBox.h,
                  },
                ]}
              >
                {/* Izgara Çizgileri */}
                <View style={styles.kirpmaIzgaraYatay1} pointerEvents="none" />
                <View style={styles.kirpmaIzgaraYatay2} pointerEvents="none" />
                <View style={styles.kirpmaIzgaraDikey1} pointerEvents="none" />
                <View style={styles.kirpmaIzgaraDikey2} pointerEvents="none" />

                {/* Orta Taşıma Alanı */}
                <View {...panOrta.panHandlers} style={StyleSheet.absoluteFillObject} />

                {/* 4 Kenar Tutamacı */}
                <View {...panUstKenar.panHandlers} style={styles.tutamacKenarUst} />
                <View {...panAltKenar.panHandlers} style={styles.tutamacKenarAlt} />
                <View {...panSolKenar.panHandlers} style={styles.tutamacKenarSol} />
                <View {...panSagKenar.panHandlers} style={styles.tutamacKenarSag} />

                {/* 4 Köşe Tutamacı */}
                <View {...panSolUst.panHandlers} style={[styles.tutamacKose, styles.tutamacSolUst]} />
                <View {...panSagUst.panHandlers} style={[styles.tutamacKose, styles.tutamacSagUst]} />
                <View {...panSolAlt.panHandlers} style={[styles.tutamacKose, styles.tutamacSolAlt]} />
                <View {...panSagAlt.panHandlers} style={[styles.tutamacKose, styles.tutamacSagAlt]} />
              </View>
            </View>
          )}
        </View>

        {/* Oran Seçici Alt Bar */}
        <View style={[styles.kirpmaAltBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={styles.oranlarSatiri}>
            {[
              { id: 'serbest', etiket: 'Serbest' },
              { id: '1:1', etiket: '1:1' },
              { id: '4:5', etiket: '4:5' },
              { id: '9:16', etiket: '9:16' },
              { id: '16:9', etiket: '16:9' },
            ].map((o) => (
              <TouchableOpacity
                key={o.id}
                style={[styles.oranButon, seciliOran === o.id && styles.oranButonAktif]}
                onPress={() => oranaAyarla(o.id)}
              >
                <Text style={[styles.oranMetin, seciliOran === o.id && styles.oranMetinAktif]}>{o.etiket}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

