import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  Switch,
  Animated,
  PanResponder,
  ScrollView,
  Dimensions,
  AppState,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode, Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import { bosluk } from '../theme';
import { useTema } from '../lib/temaBaglami';
import {
  gecmisGetir, kullanicilariGetir, gruplariGetir, grupUyeEkle, grupUyeCikar, grupResimGuncelle,
  medyaAdresi, kullaniciEngelle, kullaniciEngeliKaldir, sessizeAl, profilGetir, grupBilgiGuncelle,
  grupYoneticiAta, grupAyril, grupKapat, grupBilgiGetir,
} from '../lib/api';

import { sonGorulmeMetni } from '../lib/format';
import { onbellektenYukle } from '../lib/mesajOnbellek';
import { useSoket, kisiAnahtari, grupAnahtari } from '../lib/soketBaglami';
import { medyaSec, medyaYukleGonder, kameraIleCek, videoYerelGetir } from '../lib/medya';
import { SOHBET_TEMALARI, sohbetTemasiniYukle, sohbetTemasiniKaydet } from '../lib/temalar';
import MesajBalonu from '../components/MesajBalonu';
import OzelKameraModal from '../components/OzelKameraModal';
import OzelMedyaDuzenleyici from '../components/OzelMedyaDuzenleyici';
import CikartmaPaneli, { CikartmaIkon } from '../components/CikartmaPaneli';
import { ozelCikartmaKaydet } from '../lib/cikartmalar';

const YAZIYOR_GONDERIM_ARALIGI = 2000;
const YAZIYOR_DURDU_GECIKMESI = 2500;
const DUZENLEME_SURESI_MS = 15 * 60 * 1000;

function kayitSuresiFormatla(saniye) {
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  return `${dk}:${sn < 10 ? '0' : ''}${sn}`;
}

function VideoOynatici({ uri, styles, insets, onKapat }) {
  const [videoYukleniyor, setVideoYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    // Ses modunu video için garantiye al
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldRouteThroughEarpiece: false,
        });
      } catch {}
    })();

    // Zaman aşımı koruması: 3.5 saniye sonra yükleniyor animasyonunu kapat
    const zamanlayici = setTimeout(() => {
      setVideoYukleniyor(false);
    }, 3500);

    return () => clearTimeout(zamanlayici);
  }, [uri]);

  return (
    <View style={[styles.tamEkranArkaplan, { width: Dimensions.get('window').width, height: Dimensions.get('window').height }]}>
      <TouchableOpacity
        style={[styles.tamEkranKapat, { top: insets.top + 12, zIndex: 9999 }]}
        onPress={onKapat}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Text style={styles.tamEkranKapatMetni}>✕</Text>
      </TouchableOpacity>

      <Video
        ref={videoRef}
        source={{ uri }}
        style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onLoadStart={() => setVideoYukleniyor(true)}
        onLoad={() => setVideoYukleniyor(false)}
        onReadyForDisplay={() => setVideoYukleniyor(false)}
        onError={(e) => {
          console.warn('Video oynatma hatası:', e);
          setVideoYukleniyor(false);
          setHata('Video oynatılamadı.');
        }}
      />

      {videoYukleniyor && (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }]} pointerEvents="none">
          <ActivityIndicator size="large" color="#00a8ff" />
          <Text style={{ color: '#ffffff', marginTop: 14, fontSize: 14, fontWeight: '600' }}>Video açılıyor...</Text>
        </View>
      )}

      {hata && (
        <View style={{ position: 'absolute', alignSelf: 'center', bottom: 100, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, zIndex: 999 }}>
          <Text style={{ color: '#ff453a', fontSize: 14, fontWeight: '700' }}>{hata}</Text>
        </View>
      )}
    </View>
  );
}

function YaziyorNoktalari({ renkler }) {
  const [nokta, setNokta] = useState(1);
  useEffect(() => {
    const z = setInterval(() => setNokta((n) => (n % 3) + 1), 450);
    return () => clearInterval(z);
  }, []);
  return <Text style={{ color: renkler.metinSoluk, fontSize: 13 }}>{'yazıyor' + '.'.repeat(nokta)}</Text>;
}

// ----------------------------------------------------
// Vektörel Tekrarlayan & Merkez Tema Motifleri
// ----------------------------------------------------

function HelloKittyMotif() {
  return (
    <View style={motifStilleri.kittyKutu}>
      <View style={[motifStilleri.kittyKulak, motifStilleri.kittyKulakSol]} />
      <View style={[motifStilleri.kittyKulak, motifStilleri.kittyKulakSag]} />
      <View style={motifStilleri.kittyKafa}>
        <View style={[motifStilleri.kittyGoz, { left: 9 }]} />
        <View style={motifStilleri.kittyBurun} />
        <View style={[motifStilleri.kittyGoz, { right: 9 }]} />
        <View style={[motifStilleri.kittyBiyik, { left: 2, top: 11 }]} />
        <View style={[motifStilleri.kittyBiyik, { left: 2, top: 15 }]} />
        <View style={[motifStilleri.kittyBiyik, { right: 2, top: 11 }]} />
        <View style={[motifStilleri.kittyBiyik, { right: 2, top: 15 }]} />
      </View>
      <View style={motifStilleri.kittyFiyonkKutu}>
        <View style={[motifStilleri.kittyFiyonkKanat, { transform: [{ rotate: '-25deg' }] }]} />
        <View style={motifStilleri.kittyFiyonkOrta} />
        <View style={[motifStilleri.kittyFiyonkKanat, { transform: [{ rotate: '25deg' }] }]} />
      </View>
    </View>
  );
}

function HelloKittyV2Motif() {
  return (
    <View style={motifStilleri.kittyV2Kutu}>
      <View style={[motifStilleri.kittyV2Kulak, motifStilleri.kittyV2KulakSol]} />
      <View style={[motifStilleri.kittyV2Kulak, motifStilleri.kittyV2KulakSag]} />
      <View style={motifStilleri.kittyV2Kafa}>
        <View style={[motifStilleri.kittyV2Goz, { left: 10 }]} />
        <View style={[motifStilleri.kittyV2Goz, { right: 10 }]} />
        <View style={[motifStilleri.kittyV2Allik, { left: 5 }]} />
        <View style={[motifStilleri.kittyV2Allik, { right: 5 }]} />
        <View style={motifStilleri.kittyV2Burun} />
        <View style={[motifStilleri.kittyV2Biyik, { left: 0, top: 11, transform: [{ rotate: '-8deg' }] }]} />
        <View style={[motifStilleri.kittyV2Biyik, { left: 0, top: 15 }]} />
        <View style={[motifStilleri.kittyV2Biyik, { left: 0, top: 19, transform: [{ rotate: '8deg' }] }]} />
        <View style={[motifStilleri.kittyV2Biyik, { right: 0, top: 11, transform: [{ rotate: '8deg' }] }]} />
        <View style={[motifStilleri.kittyV2Biyik, { right: 0, top: 15 }]} />
        <View style={[motifStilleri.kittyV2Biyik, { right: 0, top: 19, transform: [{ rotate: '-8deg' }] }]} />
      </View>
      <View style={motifStilleri.kittyV2Fiyonk}>
        <View style={[motifStilleri.kittyV2FiyonkKanat, { transform: [{ rotate: '-25deg' }] }]} />
        <View style={motifStilleri.kittyV2FiyonkDugum} />
        <View style={[motifStilleri.kittyV2FiyonkKanat, { transform: [{ rotate: '25deg' }] }]} />
      </View>
    </View>
  );
}

function SpiderManMotif() {
  return (
    <View style={motifStilleri.spiderKutu}>
      <View style={motifStilleri.spiderMaske}>
        <View style={motifStilleri.spiderDikeyCizgi} />
        <View style={motifStilleri.spiderYatayCizgi} />
        <View style={motifStilleri.spiderAgDaire} />
        <View style={[motifStilleri.spiderGozDis, motifStilleri.spiderGozSol]}>
          <View style={motifStilleri.spiderGozIc} />
        </View>
        <View style={[motifStilleri.spiderGozDis, motifStilleri.spiderGozSag]}>
          <View style={motifStilleri.spiderGozIc} />
        </View>
      </View>
    </View>
  );
}

function KuromiMotif() {
  return (
    <View style={motifStilleri.kuromiKutu}>
      <View style={[motifStilleri.kuromiKulak, motifStilleri.kuromiKulakSol]}>
        <View style={motifStilleri.kuromiKulakTopu} />
      </View>
      <View style={[motifStilleri.kuromiKulak, motifStilleri.kuromiKulakSag]}>
        <View style={motifStilleri.kuromiKulakTopu} />
      </View>
      <View style={motifStilleri.kuromiKafa}>
        <View style={motifStilleri.kuromiKuruKafa}>
          <View style={[motifStilleri.kuromiKuruGoz, { left: 2 }]} />
          <View style={[motifStilleri.kuromiKuruGoz, { right: 2 }]} />
        </View>
        <View style={[motifStilleri.kuromiGoz, { left: 8, transform: [{ rotate: '15deg' }] }]} />
        <View style={[motifStilleri.kuromiGoz, { right: 8, transform: [{ rotate: '-15deg' }] }]} />
      </View>
    </View>
  );
}

function KuromiV2Motif() {
  return (
    <View style={motifStilleri.kuromiV2Kutu}>
      <View style={[motifStilleri.kuromiV2Kulak, motifStilleri.kuromiV2KulakSol]}>
        <View style={motifStilleri.kuromiV2Ponpon} />
      </View>
      <View style={[motifStilleri.kuromiV2Kulak, motifStilleri.kuromiV2KulakSag]}>
        <View style={motifStilleri.kuromiV2Ponpon} />
      </View>
      <View style={motifStilleri.kuromiV2Kafa}>
        <View style={motifStilleri.kuromiV2KuruKafa}>
          <View style={[motifStilleri.kuromiV2KuruGoz, { left: 2 }]} />
          <View style={[motifStilleri.kuromiV2KuruGoz, { right: 2 }]} />
        </View>
        <View style={[motifStilleri.kuromiV2Goz, { left: 8, transform: [{ rotate: '12deg' }] }]}>
          <View style={motifStilleri.kuromiV2GozIsik} />
        </View>
        <View style={[motifStilleri.kuromiV2Goz, { right: 8, transform: [{ rotate: '-12deg' }] }]}>
          <View style={motifStilleri.kuromiV2GozIsik} />
        </View>
        <View style={[motifStilleri.kuromiV2Yanak, { left: 6 }]} />
        <View style={[motifStilleri.kuromiV2Yanak, { right: 6 }]} />
      </View>
    </View>
  );
}

// ----------------------------------------------------
// Merkez Vektörel Sahne Motifleri
// ----------------------------------------------------

function SpiderManV2Center() {
  return (
    <View style={motifStilleri.merkezKapsayici} pointerEvents="none">
      <View style={motifStilleri.orumcekAgiKutu}>
        <View style={[motifStilleri.agHalka, { width: 240, height: 240, borderRadius: 120 }]} />
        <View style={[motifStilleri.agHalka, { width: 175, height: 175, borderRadius: 87.5 }]} />
        <View style={[motifStilleri.agHalka, { width: 115, height: 115, borderRadius: 57.5 }]} />
        <View style={[motifStilleri.agHalka, { width: 60, height: 60, borderRadius: 30 }]} />

        <View style={[motifStilleri.agTel, { transform: [{ rotate: '0deg' }] }]} />
        <View style={[motifStilleri.agTel, { transform: [{ rotate: '45deg' }] }]} />
        <View style={[motifStilleri.agTel, { transform: [{ rotate: '90deg' }] }]} />
        <View style={[motifStilleri.agTel, { transform: [{ rotate: '135deg' }] }]} />
      </View>

      <View style={motifStilleri.asiliAgIpi} />

      <View style={motifStilleri.asiliSpiderman}>
        <View style={motifStilleri.asiliBacakSol} />
        <View style={motifStilleri.asiliBacakSag} />

        <View style={motifStilleri.asiliGovde}>
          <View style={motifStilleri.asiliMaviKemer} />
          <View style={motifStilleri.asiliKolSol} />
          <View style={motifStilleri.asiliKolSag} />
          <View style={motifStilleri.asiliOrumcekLogo} />
        </View>

        <View style={motifStilleri.asiliMaske}>
          <View style={[motifStilleri.asiliGozDis, motifStilleri.asiliGozSol]}>
            <View style={motifStilleri.asiliGozIc} />
          </View>
          <View style={[motifStilleri.asiliGozDis, motifStilleri.asiliGozSag]}>
            <View style={motifStilleri.asiliGozIc} />
          </View>
          <View style={motifStilleri.asiliMaskeDikey} />
          <View style={motifStilleri.asiliMaskeYatay} />
        </View>
      </View>
    </View>
  );
}

function BatmanMotif() {
  return (
    <View style={motifStilleri.batmanMotifKutu}>
      <View style={motifStilleri.batmanMotifElips}>
        <View style={motifStilleri.batmanMotifGovde}>
          <View style={[motifStilleri.batmanMotifKulak, { left: 11 }]} />
          <View style={[motifStilleri.batmanMotifKulak, { right: 11 }]} />
          <View style={[motifStilleri.batmanMotifKanat, motifStilleri.batmanMotifKanatSol]} />
          <View style={[motifStilleri.batmanMotifKanat, motifStilleri.batmanMotifKanatSag]} />
          <View style={motifStilleri.batmanMotifKuyruk} />
        </View>
      </View>
    </View>
  );
}

function RickAndMortyMotif() {
  return (
    <View style={motifStilleri.portalMotifKutu}>
      <View style={motifStilleri.portalMotifDis}>
        <View style={motifStilleri.portalMotifOrta}>
          <View style={motifStilleri.portalMotifIc} />
        </View>
      </View>
      <View style={[motifStilleri.portalKivilcimMini, { top: 0, right: 3 }]} />
      <View style={[motifStilleri.portalKivilcimMini, { bottom: 2, left: 3 }]} />
    </View>
  );
}

function SpongeBobMotif() {
  return (
    <View style={motifStilleri.spongeMotifKutu}>
      <View style={motifStilleri.spongeGovde}>
        <View style={[motifStilleri.spongeGoz, { left: 5 }]}>
          <View style={motifStilleri.spongeGozMavi}>
            <View style={motifStilleri.spongeGozBebek} />
          </View>
        </View>
        <View style={[motifStilleri.spongeGoz, { right: 5 }]}>
          <View style={motifStilleri.spongeGozMavi}>
            <View style={motifStilleri.spongeGozBebek} />
          </View>
        </View>
        <View style={motifStilleri.spongeBurun} />
        <View style={motifStilleri.spongeAgiz}>
          <View style={[motifStilleri.spongeDis, { left: 4 }]} />
          <View style={[motifStilleri.spongeDis, { right: 4 }]} />
        </View>
      </View>
      <View style={motifStilleri.spongeGomlek}>
        <View style={motifStilleri.spongeKravat} />
      </View>
    </View>
  );
}

function NarutoMotif() {
  return (
    <View style={motifStilleri.akatsukiKutu}>
      <View style={motifStilleri.akatsukiDisBulut}>
        <View style={motifStilleri.akatsukiPufSol} />
        <View style={motifStilleri.akatsukiPufOrta} />
        <View style={motifStilleri.akatsukiPufSag} />
        <View style={motifStilleri.akatsukiGovde} />
        <View style={motifStilleri.akatsukiSpiral} />
      </View>
    </View>
  );
}

function TemaDeseni({ temaId }) {
  if (!temaId || temaId === 'varsayilan') return null;

  if (temaId === 'spiderman-v2') return <SpiderManV2Center />;

  if ([
    'hello-kitty',
    'hello-kitty-v2',
    'spiderman',
    'kuromi',
    'kuromi-v2',
    'batman',
    'rick-and-morty',
    'spongebob',
    'naruto',
  ].includes(temaId)) {
    const satirlar = [0, 1, 2, 3, 4, 5, 6, 7];
    const sutunlar = [0, 1, 2, 3];

    return (
      <View style={motifStilleri.desenKapsayici} pointerEvents="none">
        {satirlar.map((r) => (
          <View key={`r-${r}`} style={[motifStilleri.desenSatir, { marginLeft: r % 2 === 0 ? 0 : 26 }]}>
            {sutunlar.map((c) => (
              <View
                key={`c-${r}-${c}`}
                style={[
                  motifStilleri.desenHucre,
                  { transform: [{ rotate: (r + c) % 2 === 0 ? '-7deg' : '7deg' }] },
                ]}
              >
                {temaId === 'hello-kitty' && <HelloKittyMotif />}
                {temaId === 'hello-kitty-v2' && <HelloKittyV2Motif />}
                {temaId === 'spiderman' && <SpiderManMotif />}
                {temaId === 'kuromi' && <KuromiMotif />}
                {temaId === 'kuromi-v2' && <KuromiV2Motif />}
                {temaId === 'batman' && <BatmanMotif />}
                {temaId === 'rick-and-morty' && <RickAndMortyMotif />}
                {temaId === 'spongebob' && <SpongeBobMotif />}
                {temaId === 'naruto' && <NarutoMotif />}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return null;
}

export default function SohbetEkrani({
  sunucuAdres, kullanici, sifre, hedefTuru, hedef, baslik, uyeler, yonetici, yoneticiler, resimUrl = null,
  engellenenler, sessizeAlinanlar, ilkMedya = null, ilkYaziKatmani = null, ilkBaslik = '', ilkTekGorunum = false,
  onAyarGuncellendi, onSohbetGecis, onGeri,
}) {
  const { renkler: globalRenkler } = useTema();
  const [ozelTema, setOzelTema] = useState(null);
  const renkler = ozelTema?.renkler || globalRenkler;
  const styles = useMemo(() => olusturStiller(renkler), [renkler]);

  const {
    baglandi, mesajDeposu, kullaniciDurumlari, yaziyorlar, grupBilgileri,
    mesajGonder, okunduBildir, yaziyorBildir, yazmayiBiraktimBildir,
    begeniDegistir, mesajDuzenle, mesajSil, gecmisiIcinYukle, aktifSohbetAyarla, benimAdim,
    tekGorunumGorulduBildir, temaDegistirBildir, temaHaberleri, sonIslemHatasi, sohbetiGizle,
    grupGuncelle, gruplar, gruplariAyarla, grupBilgiGuncelleTekil, sohbetiTemizle, sohbetTemizlemeZamanlari, grupSil,
  } = useSoket();


  const insets = useSafeAreaInsets();

  const [metin, setMetin] = useState('');
  const [yanitlanan, setYanitlanan] = useState(null);
  const [uyelerModalAcik, setUyelerModalAcik] = useState(false);
  const [uyeEkleModalAcik, setUyeEkleModalAcik] = useState(false);
  const [buyukFotoUrl, setBuyukFotoUrl] = useState(null);
  const [oncekiModal, setOncekiModal] = useState(null);
  const [seciliUyeIslemleri, setSeciliUyeIslemleri] = useState(null);
  const [eklenebilirKullanicilar, setEklenebilirKullanicilar] = useState([]);
  const [yerelGrupResimUrl, setYerelGrupResimUrl] = useState(resimUrl || null);
  const [yerelGrupBilgi, setYerelGrupBilgi] = useState(null);
  const [uyeAramaMetni, setUyeAramaMetni] = useState('');

  function buyukFotoKapat() {
    setBuyukFotoUrl(null);
    if (oncekiModal === 'profil') {
      setProfilModalAcik(true);
    } else if (oncekiModal === 'grup') {
      setGrupDetayAcik(true);
    }
    setOncekiModal(null);
  }
  const [duzenlemeModal, setDuzenlemeModal] = useState(null);
  const [eskileriYukleniyor, setEskileriYukleniyor] = useState(false);
  const [dahaEskisiVarMi, setDahaEskisiVarMi] = useState(true);
  const [menuModalAcik, setMenuModalAcik] = useState(false);
  const [temaModalAcik, setTemaModalAcik] = useState(false);
  const [galeriModalAcik, setGaleriModalAcik] = useState(false);
  const [tamEkranMedya, setTamEkranMedya] = useState(null);
  const [secilenMedya, setSecilenMedya] = useState(null);
  const [ozelKameraAcik, setOzelKameraAcik] = useState(false);
  const [tekGorunumSecili, setTekGorunumSecili] = useState(false);
  const [medyaGonderiliyor, setMedyaGonderiliyor] = useState(false);
  const [mesajMenu, setMesajMenu] = useState(null);
  const [aksiyonYukleniyor, setAksiyonYukleniyor] = useState(false);
  const [yerelDigerDurum, setYerelDigerDurum] = useState(null);
  const [digerProfilResmi, setDigerProfilResmi] = useState(hedefTuru === 'kisi' ? (resimUrl || null) : null);
  const [sesKayitYapiliyor, setSesKayitYapiliyor] = useState(false);
  const [kayitKilitli, setKayitKilitli] = useState(false);
  const kayitKilitliRef = useRef(false);
  const [onayDiyalog, setOnayDiyalog] = useState(null);
  const sesKayitRef = useRef(null);
  const [vurgulananId, setVurgulananId] = useState(null);
  const [kayitSuresi, setKayitSuresi] = useState(0);
  const kayitZamanlayici = useRef(null);
  const kayitBaslangic = useRef(0);
  const iptalEdildiRef = useRef(false);
  const kayitBasliyorRef = useRef(false);
  const kayitDurdurmaIsteniyorRef = useRef(false);
  const kayitIptalIsteniyorRef = useRef(false);
  const kayitNoktaAnim = useRef(new Animated.Value(1)).current;
  const [profilModalAcik, setProfilModalAcik] = useState(false);
  const [hedefProfilBilgi, setHedefProfilBilgi] = useState(null);
  const [grupDetayAcik, setGrupDetayAcik] = useState(false);
  const [grupIsimDuzenle, setGrupIsimDuzenle] = useState(baslik);
  const [grupAciklamaDuzenle, setGrupAciklamaDuzenle] = useState('');
  const [grupKaydediliyor, setGrupKaydediliyor] = useState(false);
  const [grupGuncellemeDurumu, setGrupGuncellemeDurumu] = useState(null);
  const [gorulduModal, setGorulduModal] = useState(null); // { item, okuyanlar: [] }
  const [cikartmaPaneliAcik, setCikartmaPaneliAcik] = useState(false);

  // Gelen ve sohbetteki tüm çıkartmaları anında yerel hafızaya/diske indir (çevrimdışı ve gecikmesiz gösterim)
  useEffect(() => {
    (mesajlar || []).forEach((m) => {
      if (m && m.medyaTuru === 'sticker' && m.medyaUrl) {
        const tamUrl = m._tamMedyaUrl || medyaAdresi(sunucuAdres, kullanici, sifre, m.medyaUrl);
        Image.prefetch(tamUrl).catch(() => {});
      }
    });
  }, [mesajlar, sunucuAdres, kullanici, sifre]);

  const listeRef = useRef(null);
  const sonYaziyorGonderimi = useRef(0);
  const yazmayiBiraktimZamanlayici = useRef(null);

  const anahtar = hedefTuru === 'grup' ? grupAnahtari(hedef) : kisiAnahtari(hedef);
  const temizlemeZamani = sohbetTemizlemeZamanlari?.[anahtar] || 0;
  const mesajlarHam = useMemo(() => {
    const ham = mesajDeposu[anahtar] || [];
    if (!temizlemeZamani) return ham;
    return ham.filter((m) => (m.zaman || 0) > temizlemeZamani);
  }, [mesajDeposu, anahtar, temizlemeZamani]);

  const mesajlar = useMemo(
    () => mesajlarHam.map((m) => (m.medyaUrl ? { ...m, _tamMedyaUrl: medyaAdresi(sunucuAdres, kullanici, sifre, m.medyaUrl) } : m)),
    [mesajlarHam, sunucuAdres, kullanici, sifre]
  );
  const tersMesajlar = useMemo(() => [...mesajlar].reverse(), [mesajlar]);

  const grupCanli = useMemo(() => {
    if (hedefTuru !== 'grup') return null;
    const gId = String(hedef);
    return (
      yerelGrupBilgi ||
      (grupBilgileri && grupBilgileri[gId]) ||
      (gruplar || []).find((g) => String(g?.id) === gId) ||
      null
    );
  }, [hedefTuru, hedef, yerelGrupBilgi, grupBilgileri, gruplar]);

  const canliBaslik = grupCanli?.isim || baslik || 'Grup';
  const guncelUyeler = grupCanli?.uyeler || uyeler || [];
  const guncelYonetici = grupCanli?.yonetici || yonetici;
  const guncelYoneticiler = useMemo(() => {
    if (hedefTuru !== 'grup') return [];
    if (Array.isArray(grupCanli?.yoneticiler) && grupCanli.yoneticiler.length > 0) return grupCanli.yoneticiler;
    if (Array.isArray(yoneticiler) && yoneticiler.length > 0) return yoneticiler;
    return guncelYonetici ? [guncelYonetici] : [];
  }, [hedefTuru, grupCanli, yoneticiler, guncelYonetici]);
  const guncelResimUrl = grupCanli !== undefined && grupCanli !== null
    ? (grupCanli.resimUrl || null)
    : (yerelGrupResimUrl || resimUrl || null);

  useEffect(() => {
    if (grupCanli) {
      setYerelGrupResimUrl(grupCanli.resimUrl || null);
    }
  }, [grupCanli?.resimUrl, grupCanli]);

  // Bildirimden veya doğrudan açılışta grup bilgileri eksikse sunucudan anında tazele
  useEffect(() => {
    if (hedefTuru === 'grup') {
      grupBilgiGetir(sunucuAdres, kullanici, sifre, hedef)
        .then((res) => {
          if (res && res.tamam && res.grup) {
            setYerelGrupBilgi(res.grup);
            setYerelGrupResimUrl(res.grup.resimUrl || null);
            if (grupBilgiGuncelleTekil) grupBilgiGuncelleTekil(res.grup);
          }
        })
        .catch(() => {});

      gruplariGetir(sunucuAdres, kullanici, sifre)
        .then((res) => {
          if (res && res.tamam && Array.isArray(res.liste)) {
            if (gruplariAyarla) gruplariAyarla(res.liste);
            const bul = res.liste.find((g) => String(g?.id) === String(hedef));
            if (bul) {
              setYerelGrupBilgi((eski) => ({ ...eski, ...bul }));
              setYerelGrupResimUrl(bul.resimUrl || null);
            }
          }
        })
        .catch(() => {});
    }
  }, [hedefTuru, hedef, sunucuAdres, kullanici, sifre, gruplariAyarla, grupBilgiGuncelleTekil]);


  const filtrelenmisEklenebilirKullanicilar = useMemo(() => {
    if (!uyeAramaMetni.trim()) return eklenebilirKullanicilar;
    const q = uyeAramaMetni.trim().toLowerCase();
    return eklenebilirKullanicilar.filter((k) => (k?.kullanici || '').toLowerCase().includes(q));
  }, [eklenebilirKullanicilar, uyeAramaMetni]);

  const benYoneticiMiyim = hedefTuru === 'grup' && (
    guncelYoneticiler.some((y) => (y || '').toLowerCase() === (benimAdim || '').toLowerCase()) ||
    (guncelYonetici || '').toLowerCase() === (benimAdim || '').toLowerCase()
  );

  const benEngelledimMi = hedefTuru === 'kisi' && (engellenenler || []).includes(hedef);
  const sessizMi = (sessizeAlinanlar || []).includes(anahtar);

  // DM acildiginda karsidaki kisinin son gorulmesini ve profil fotosunu aninda cek
  useEffect(() => {
    if (hedefTuru === 'kisi') {
      // Yerel önbellekten profil fotoğrafını anında çek (varsa hemen göster)
      AsyncStorage.getItem(`@textly_kisiler_cache_${kullanici}`)
        .then((raw) => {
          if (raw) {
            const list = JSON.parse(raw);
            const bul = (list || []).find((k) => (k.kullanici || '').toLowerCase() === (hedef || '').toLowerCase());
            if (bul && bul.profilResimUrl) {
              setDigerProfilResmi((mevcut) => mevcut || bul.profilResimUrl);
            }
          }
        })
        .catch(() => {});

      kullanicilariGetir(sunucuAdres, kullanici, sifre).then((res) => {
        if (res.tamam) {
          const bul = (res.liste || []).find((k) => k.kullanici === hedef);
          if (bul) {
            setYerelDigerDurum(bul);
            if (bul.profilResimUrl) setDigerProfilResmi(bul.profilResimUrl);
          }
        }
      });
      profilGetir(sunucuAdres, kullanici, sifre, hedef).then((res) => {
        if (res.tamam && res.profilResimUrl) {
          setDigerProfilResmi(res.profilResimUrl);
        }
      });
    }
  }, [hedefTuru, hedef, sunucuAdres, kullanici, sifre]);

  // @mention listesi hesaplama
  const mentionAdaylari = useMemo(() => {
    const sonKelime = metin.split(/\s+/).pop() || '';
    if (!sonKelime.startsWith('@')) return [];
    const sorgu = sonKelime.slice(1).toLowerCase();
    const liste = hedefTuru === 'grup' ? ['herkes', ...guncelUyeler.filter((u) => u !== benimAdim)] : ['herkes', hedef];
    return liste.filter((ad) => ad.toLowerCase().startsWith(sorgu));
  }, [metin, hedefTuru, guncelUyeler, benimAdim, hedef]);

  function mentionSec(ad) {
    const kelimeler = metin.split(/\s+/);
    kelimeler.pop();
    const yeniMetin = [...kelimeler, `@${ad} `].join(' ').trimStart();
    setMetin(yeniMetin);
  }

  useEffect(() => {
    aktifSohbetAyarla(anahtar);
    // Sunucunun sonAktifZaman'ını canlı tutmak için heartbeat — bildirim engeli çalışsın
    const heartbeat = setInterval(() => {
      aktifSohbetAyarla(anahtar);
    }, 20000);
    return () => {
      clearInterval(heartbeat);
      aktifSohbetAyarla(null);
    };
  }, [anahtar, aktifSohbetAyarla]);

  useEffect(() => {
    (async () => setOzelTema(await sohbetTemasiniYukle(anahtar)))();
  }, [anahtar]);

  // Karsidan tema degisikligi gelince aninda uygula
  useEffect(() => {
    if (temaHaberleri && temaHaberleri.anahtar === anahtar) {
      const bulunan = SOHBET_TEMALARI.find((t) => t.id === temaHaberleri.temaId);
      if (bulunan) {
        setOzelTema(bulunan);
        sohbetTemasiniKaydet(anahtar, bulunan.id);
      }
    }
  }, [temaHaberleri, anahtar]);

  // Islem hatasi (ornek: engellenen kisiye mesaj atilamama)
  useEffect(() => {
    if (sonIslemHatasi && sonIslemHatasi.islem === 'mesaj') {
      Alert.alert('Mesaj Gönderilemedi', sonIslemHatasi.hata || 'Bu kullanıcıya mesaj gönderilemiyor.');
    }
  }, [sonIslemHatasi]);

  // Dışarıdan veya ana sayfadan anlık çekilip gelen ilk medya varsa otomatik gönder
  const ilkMedyaGonderildiRef = useRef(false);
  useEffect(() => {
    if (ilkMedya && !ilkMedyaGonderildiRef.current) {
      ilkMedyaGonderildiRef.current = true;
      medyaGonderDuzenlenmis({
        secim: ilkMedya,
        yaziKatmani: ilkYaziKatmani,
        baslik: ilkBaslik,
        tekGorunum: ilkTekGorunum,
      });
    }
  }, [ilkMedya]);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const onbellek = await onbellektenYukle(anahtar);
      if (!iptal && onbellek.length) gecmisiIcinYukle(anahtar, onbellek);
      const sonuc = await gecmisGetir(sunucuAdres, kullanici, sifre, hedefTuru, hedef);
      if (!iptal && sonuc.tamam) {
        gecmisiIcinYukle(anahtar, sonuc.liste);
        if (sonuc.liste.length < 50) setDahaEskisiVarMi(false);
      }
    })();
    return () => { iptal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar]);

  // Kisi veya grup mesajlari icin okundu bildirme (SADECE uygulama aktifken!)
  useEffect(() => {
    if (AppState.currentState !== 'active') return;
    const okunmamislar = mesajlarHam
      .filter((m) => (m.gonderen || '').toLowerCase() !== (benimAdim || '').toLowerCase() && m.id && (hedefTuru === 'grup' ? !(m.okuyanlar || []).some(x => (x || '').toLowerCase() === (benimAdim || '').toLowerCase()) : m.durum !== 'gorundu'))
      .map((m) => m.id);
    if (okunmamislar.length) okunduBildir(okunmamislar);
  }, [mesajlarHam, hedefTuru, benimAdim, okunduBildir]);

  // Uygulama arka plandan öne geldiğinde açık sohbetteki okunmamış mesajları okundu bildir
  useEffect(() => {
    const abonelik = AppState.addEventListener('change', (durum) => {
      if (durum === 'active') {
        const okunmamislar = mesajlarHam
          .filter((m) => (m.gonderen || '').toLowerCase() !== (benimAdim || '').toLowerCase() && m.id && (hedefTuru === 'grup' ? !(m.okuyanlar || []).some(x => (x || '').toLowerCase() === (benimAdim || '').toLowerCase()) : m.durum !== 'gorundu'))
          .map((m) => m.id);
        if (okunmamislar.length) okunduBildir(okunmamislar);
      }
    });
    return () => abonelik.remove();
  }, [mesajlarHam, hedefTuru, benimAdim, okunduBildir]);

  useEffect(() => () => clearTimeout(yazmayiBiraktimZamanlayici.current), []);

  async function eskileriYukle() {
    if (eskileriYukleniyor || !dahaEskisiVarMi || !mesajlarHam.length) return;
    setEskileriYukleniyor(true);
    const enEskiId = mesajlarHam.reduce((m, x) => (x.id && (!m || x.id < m) ? x.id : m), null);
    const sonuc = await gecmisGetir(sunucuAdres, kullanici, sifre, hedefTuru, hedef, enEskiId);
    setEskileriYukleniyor(false);
    if (sonuc.tamam) {
      if (sonuc.liste.length < 50) setDahaEskisiVarMi(false);
      if (sonuc.liste.length) gecmisiIcinYukle(anahtar, sonuc.liste);
    }
  }

  function metinDegisti(yeniMetin) {
    setMetin(yeniMetin);
    const simdi = Date.now();
    if (yeniMetin.trim() && simdi - sonYaziyorGonderimi.current > YAZIYOR_GONDERIM_ARALIGI) {
      sonYaziyorGonderimi.current = simdi;
      yaziyorBildir(hedefTuru, hedef);
    }
    clearTimeout(yazmayiBiraktimZamanlayici.current);
    yazmayiBiraktimZamanlayici.current = setTimeout(() => yazmayiBiraktimBildir(hedefTuru, hedef), YAZIYOR_DURDU_GECIKMESI);
  }

  function gonder() {
    let ozet = yanitlanan?.metin;
    if (yanitlanan && !ozet) {
      if (yanitlanan.medyaTuru === 'ses') ozet = '🎤 Ses kaydı';
      else if (yanitlanan.medyaTuru === 'video') ozet = '🎥 Video';
      else if (yanitlanan.medyaUrl) ozet = '📷 Fotoğraf';
      else ozet = 'Mesaj';
    }
    const yanitPayload = yanitlanan
      ? { id: yanitlanan.id, gonderen: yanitlanan.gonderen, metinOzet: ozet.slice(0, 120) }
      : undefined;
    const sonuc = mesajGonder(hedefTuru, hedef, metin, yanitPayload);
    if (!sonuc.basarili) {
      if (sonuc.hata) Alert.alert('Gönderilemedi', sonuc.hata);
      return;
    }
    setMetin('');
    setYanitlanan(null);
    clearTimeout(yazmayiBiraktimZamanlayici.current);
    yazmayiBiraktimBildir(hedefTuru, hedef);
  }

  function cikartmaGonder(sticker) {
    if (!sticker || !sticker.url) return;
    let ozet = '🎨 Çıkartma';
    if (yanitlanan) {
      if (yanitlanan.metin) ozet = yanitlanan.metin;
      else if (yanitlanan.medyaTuru === 'ses') ozet = '🎤 Ses kaydı';
      else if (yanitlanan.medyaTuru === 'video') ozet = '🎥 Video';
      else if (yanitlanan.medyaTuru === 'sticker') ozet = '🎨 Çıkartma';
      else if (yanitlanan.medyaUrl) ozet = '📷 Fotoğraf';
    }
    const yanitPayload = yanitlanan
      ? { id: yanitlanan.id, gonderen: yanitlanan.gonderen, metinOzet: ozet.slice(0, 120) }
      : undefined;

    const sonuc = mesajGonder(hedefTuru, hedef, '', yanitPayload, {
      url: sticker.url,
      tur: 'sticker',
      tekGorunum: false,
    });
    if (!sonuc.basarili) {
      if (sonuc.hata) Alert.alert('Gönderilemedi', sonuc.hata);
      return;
    }
    setYanitlanan(null);
  }

  function mesajSilOnayla(id) {
    setOnayDiyalog({
      baslik: 'Mesajı Sil',
      mesaj: 'Bu mesajı silmek istediğinize emin misiniz?',
      onayMetni: 'Sil',
      tehlikeli: true,
      onOnayla: () => mesajSil(id),
    });
  }

  function duzenlemeKaydet() {
    if (!duzenlemeModal) return;
    const yeni = duzenlemeModal.metin.trim();
    if (!yeni) return;
    mesajDuzenle(duzenlemeModal.id, yeni);
    setDuzenlemeModal(null);
  }

  async function uyeEkleModalAc() {
    setUyeAramaMetni('');
    const sonuc = await kullanicilariGetir(sunucuAdres, kullanici, sifre);
    if (sonuc.tamam) setEklenebilirKullanicilar(sonuc.liste.filter((k) => !guncelUyeler.includes(k.kullanici)));
    setUyeEkleModalAcik(true);
  }

  async function uyeEkle(yeniUye) {
    const sonuc = await grupUyeEkle(sunucuAdres, kullanici, sifre, hedef, yeniUye);
    if (!sonuc.tamam) return Alert.alert('Olmadı', sonuc.hata || 'Üye eklenemedi.');
    setUyeEkleModalAcik(false);
  }

  function uyeCikarOnayla(uyeAdi) {
    setOnayDiyalog({
      baslik: 'Üyeyi Çıkar',
      mesaj: `${uyeAdi} gruptan çıkarılsın mı?`,
      onayMetni: 'Çıkar',
      tehlikeli: true,
      onOnayla: async () => {
        const sonuc = await grupUyeCikar(sunucuAdres, kullanici, sifre, hedef, uyeAdi);
        if (!sonuc.tamam) Alert.alert('Olmadı', sonuc.hata || 'Üye çıkarılamadı.');
      },
    });
  }

  function uyeyeDmAc(uyeAdi) {
    if (uyeAdi === benimAdim) return;
    setUyelerModalAcik(false);
    onSohbetGecis({ hedefTuru: 'kisi', hedef: uyeAdi, baslik: uyeAdi });
  }

  async function temaSec(tema) {
    setOzelTema(tema);
    await sohbetTemasiniKaydet(anahtar, tema.id);
    setTemaModalAcik(false);
    temaDegistirBildir(hedefTuru, hedef, tema.id, tema.isim);
  }

  async function medyaSecBaslat() {
    setMenuModalAcik(false);
    const secim = await medyaSec();
    if (!secim) return;
    if (secim.hata) return Alert.alert('Olmadı', secim.hata);
    setSecilenMedya(secim);
    setTekGorunumSecili(false);
  }

  function kameraIleFotoCek() {
    setOzelKameraAcik(true);
  }

  function medyaAc(m) {
    if (m.tekGorunum) {
      const benKucuk = (benimAdim || '').toLowerCase();
      const benGonderendim = (m.gonderen || '').toLowerCase() === benKucuk;

      if (hedefTuru === 'grup') {
        // Grup: tekGorunumGorenler array'inde bu kullanıcı varsa zaten açmış demektir
        const gorenler = Array.isArray(m.tekGorunumGorenler) ? m.tekGorunumGorenler : [];
        const benGordum = gorenler.some((u) => (u || '').toLowerCase() === benKucuk);
        if (!benGonderendim && benGordum) {
          Alert.alert('Görüntülendi', 'Bu medyayı zaten bir kez açtınız.');
          return;
        }
        if (!benGonderendim && !benGordum) {
          tekGorunumGorulduBildir(m.id);
        }
      } else {
        // Kişisel sohbet: eski davranış
        if (m.tekGorunumGoruldu) {
          Alert.alert('Görüntülendi', 'Bu fotoğraf tek görünümlük olduğu için tekrar açılamaz.');
          return;
        }
        if (!benGonderendim) {
          tekGorunumGorulduBildir(m.id);
        }
      }
    }
    setTamEkranMedya(m);
  }

  function tamEkranKapat() {
    if (tamEkranMedya?.tekGorunum && (tamEkranMedya.gonderen || '').toLowerCase() !== (benimAdim || '').toLowerCase()) {
      tekGorunumGorulduBildir(tamEkranMedya.id);
    }
    setTamEkranMedya(null);
  }

  async function medyaGonderDuzenlenmis({ secim, yaziKatmani, baslik, tekGorunum }) {
    if (!secim) return;
    setMedyaGonderiliyor(true);
    const yuklendi = await medyaYukleGonder(sunucuAdres, kullanici, sifre, secim);
    setMedyaGonderiliyor(false);
    if (yuklendi.hata) {
      Alert.alert('Olmadı', yuklendi.hata);
      return;
    }
    mesajGonder(hedefTuru, hedef, baslik || '', undefined, {
      url: yuklendi.url,
      tur: yuklendi.tur,
      tekGorunum: !!tekGorunum,
      yaziKatmani: yaziKatmani || null,
    });
    setSecilenMedya(null);
    setTekGorunumSecili(false);
  }

  async function sesKaydiBaslat() {
    if (sesKayitRef.current || kayitBasliyorRef.current) return;
    kayitBasliyorRef.current = true;
    kayitDurdurmaIsteniyorRef.current = false;
    kayitIptalIsteniyorRef.current = false;
    iptalEdildiRef.current = false;
    setKayitSuresi(0);
    setSesKayitYapiliyor(true);

    try {
      const izin = await Audio.requestPermissionsAsync();
      if (!izin.granted) {
        setSesKayitYapiliyor(false);
        kayitBasliyorRef.current = false;
        Alert.alert('İzin Gerekli', 'Ses kaydetmek için mikrofon izni vermelisiniz.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      if (sesKayitRef.current) {
        try { await sesKayitRef.current.stopAndUnloadAsync(); } catch {}
        sesKayitRef.current = null;
      }

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      sesKayitRef.current = recording;
      kayitBaslangic.current = Date.now();

      if (kayitIptalIsteniyorRef.current) {
        try { await recording.stopAndUnloadAsync(); } catch {}
        sesKayitRef.current = null;
        setSesKayitYapiliyor(false);
        return;
      }
      if (kayitDurdurmaIsteniyorRef.current) {
        await sesKaydiDurdurGonder(true);
        return;
      }

      Animated.loop(
        Animated.sequence([
          Animated.timing(kayitNoktaAnim, { toValue: 0.2, duration: 450, useNativeDriver: true }),
          Animated.timing(kayitNoktaAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      ).start();

      clearInterval(kayitZamanlayici.current);
      kayitZamanlayici.current = setInterval(() => {
        setKayitSuresi((sn) => sn + 1);
      }, 1000);
    } catch (e) {
      console.warn('Ses kaydı başlatılamadı:', e);
      setSesKayitYapiliyor(false);
      sesKayitRef.current = null;
    } finally {
      kayitBasliyorRef.current = false;
    }
  }

  async function sesKaydiDurdurGonder(zorla = false) {
    if (kayitKilitliRef.current && !zorla) return;
    clearInterval(kayitZamanlayici.current);

    if (kayitBasliyorRef.current) {
      kayitDurdurmaIsteniyorRef.current = true;
      return;
    }

    if (!sesKayitRef.current) {
      setSesKayitYapiliyor(false);
      setKayitKilitli(false);
      kayitKilitliRef.current = false;
      return;
    }

    const rec = sesKayitRef.current;
    sesKayitRef.current = null;
    setSesKayitYapiliyor(false);
    setKayitKilitli(false);
    kayitKilitliRef.current = false;

    try {
      await new Promise((r) => setTimeout(r, 180));
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      if (!uri) return;

      const secim = { uri, tur: 'ses', base64: null, mimeTuru: 'audio/m4a' };
      setMedyaGonderiliyor(true);
      const yuklendi = await medyaYukleGonder(sunucuAdres, kullanici, sifre, secim);
      setMedyaGonderiliyor(false);
      if (yuklendi.hata) { Alert.alert('Olmadı', yuklendi.hata); return; }

      let ozet = yanitlanan?.metin;
      if (yanitlanan && !ozet) {
        if (yanitlanan.medyaTuru === 'ses') ozet = '🎤 Ses kaydı';
        else if (yanitlanan.medyaTuru === 'video') ozet = '🎥 Video';
        else if (yanitlanan.medyaUrl) ozet = '📷 Fotoğraf';
        else ozet = 'Mesaj';
      }
      const yanitPayload = yanitlanan
        ? { id: yanitlanan.id, gonderen: yanitlanan.gonderen, metinOzet: ozet.slice(0, 120) }
        : undefined;

      const hesaplananSure = Math.max(1, Math.round((Date.now() - (kayitBaslangic.current || Date.now())) / 1000));
      mesajGonder(hedefTuru, hedef, '', yanitPayload, { url: yuklendi.url, tur: 'ses', tekGorunum: false, sure: hesaplananSure });
      setYanitlanan(null);
    } catch (e) {
      console.warn('Ses gönderme hatası:', e);
      setMedyaGonderiliyor(false);
    }
  }

  async function sesKaydiIptal() {
    clearInterval(kayitZamanlayici.current);
    if (kayitBasliyorRef.current) {
      kayitIptalIsteniyorRef.current = true;
      setSesKayitYapiliyor(false);
      setKayitKilitli(false);
      kayitKilitliRef.current = false;
      return;
    }
    const rec = sesKayitRef.current;
    sesKayitRef.current = null;
    setSesKayitYapiliyor(false);
    setKayitKilitli(false);
    kayitKilitliRef.current = false;
    if (rec) {
      try { await rec.stopAndUnloadAsync(); } catch {}
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }

  const kayitPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderGrant: () => {
        kayitKilitliRef.current = false;
        setKayitKilitli(false);
        kayitBaslangic.current = Date.now();
        sesKaydiBaslat();
      },
      onPanResponderMove: (_, g) => {
        if (g.dx < -50) {
          sesKaydiIptal();
        }
      },
      onPanResponderRelease: () => {
        const sureMs = Date.now() - (kayitBaslangic.current || 0);
        if (sureMs < 300) {
          // Çok kısa dokunma, iptal et
          sesKaydiIptal();
        } else {
          // Basılı tutup bırakınca doğrudan gönder
          sesKaydiDurdurGonder(true);
        }
      },
      onPanResponderTerminate: () => {
        const sureMs = Date.now() - (kayitBaslangic.current || 0);
        if (sureMs >= 300) {
          sesKaydiDurdurGonder(true);
        } else {
          sesKaydiIptal();
        }
      },
    })
  ).current;

  async function yoneticiRolDegistir(uyeAdi) {
    const yoneticiMi = guncelYoneticiler.some((y) => (y || '').toLowerCase() === (uyeAdi || '').toLowerCase());
    const aksiyon = yoneticiMi ? 'al' : 'ata';
    const sonuc = await grupYoneticiAta(sunucuAdres, kullanici, sifre, hedef, uyeAdi, aksiyon);
    if (!sonuc.tamam) {
      Alert.alert('Olmadı', sonuc.hata || 'İşlem başarısız.');
    }
  }

  function gruptanAyrilOnayla() {
    setMenuModalAcik(false);
    setOnayDiyalog({
      baslik: 'Gruptan Çık',
      mesaj: 'Bu gruptan çıkmak istediğinize emin misiniz? Grup ve mesajları cihazınızdan tamamen silinecektir.',
      onayMetni: 'Gruptan Çık',
      tehlikeli: true,
      onOnayla: async () => {
        const res = await grupAyril(sunucuAdres, kullanici, sifre, hedef);
        if (res.tamam) {
          onGeri();
          if (grupSil) grupSil(hedef);
        } else {
          Alert.alert('Olmadı', res.hata || 'Gruptan çıkılamadı.');
        }
      },
    });
  }

  function grubuKapatOnayla() {
    setMenuModalAcik(false);
    setOnayDiyalog({
      baslik: 'Grubu Kapat',
      mesaj: 'Bu grubu kalıcı olarak kapatmak istediğinize emin misiniz? Grup tüm üyeler için sonlandırılacaktır.',
      onayMetni: 'Grubu Kapat',
      tehlikeli: true,
      onOnayla: async () => {
        const res = await grupKapat(sunucuAdres, kullanici, sifre, hedef);
        if (res.tamam) {
          onGeri();
          if (grupSil) grupSil(hedef);
        } else {
          Alert.alert('Olmadı', res.hata || 'Grup kapatılamadı.');
        }
      },
    });
  }

  function sohbetiSilOnayla() {
    setMenuModalAcik(false);
    setOnayDiyalog({
      baslik: hedefTuru === 'grup' ? 'Grubu Sil' : 'Sohbeti Sil',
      mesaj: hedefTuru === 'grup'
        ? 'Bu grup listeden gizlenecektir ve önceki mesajlar temizlenecektir. Yeni bir mesaj geldiğinde ana sayfaya grup tekrar gelir ama eski mesajlar gelmez.'
        : 'Bu sohbetteki tüm eski mesajlar temizlenecektir. Kişi sohbet listenizde kalmaya devam eder.',
      onayMetni: 'Sil',
      tehlikeli: true,
      onOnayla: async () => {
        if (sohbetiTemizle) await sohbetiTemizle(anahtar, hedefTuru);
        if (hedefTuru === 'grup') {
          onGeri();
        }
      },
    });
  }


  function alintiyaKaydir(mesajId) {
    const idx = tersMesajlar.findIndex((m) => String(m.id) === String(mesajId));
    if (idx !== -1 && listeRef.current) {
      try {
        listeRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      } catch {
        // scrollToIndex başarısız olursa offset hesapla
        try {
          listeRef.current.scrollToOffset({ offset: idx * 80, animated: true });
        } catch {}
      }
    }
    setVurgulananId(mesajId);
    setTimeout(() => setVurgulananId(null), 1800);
  }

  async function kullaniciProfilAc() {
    setProfilModalAcik(true);
    const res = await profilGetir(sunucuAdres, kullanici, sifre, hedef);
    if (res.tamam) {
      setHedefProfilBilgi(res);
    }
  }

  async function grupDetayAc() {
    setGrupIsimDuzenle(baslik);
    setGrupAciklamaDuzenle(grupCanli?.aciklama || '');
    setGrupGuncellemeDurumu(null);
    setGrupDetayAcik(true);
  }

  async function grupBilgileriKaydet() {
    if (!benYoneticiMiyim) return;
    setGrupKaydediliyor(true);
    setGrupGuncellemeDurumu(null);
    const sonuc = await grupBilgiGuncelle(sunucuAdres, kullanici, sifre, hedef, grupIsimDuzenle, grupAciklamaDuzenle);
    setGrupKaydediliyor(false);
    if (!sonuc.tamam) {
      setGrupGuncellemeDurumu({ basarili: false, mesaj: sonuc.hata || 'Grup güncellenemedi.' });
    } else {
      setGrupGuncellemeDurumu({ basarili: true, mesaj: '✓ Grup bilgileri başarıyla güncellendi' });
      if (grupGuncelle) {
        grupGuncelle(hedef, { isim: grupIsimDuzenle, aciklama: grupAciklamaDuzenle });
      }
      setTimeout(() => {
        setGrupGuncellemeDurumu(null);
      }, 3500);
    }
  }

  async function grupResimSec() {
    setMenuModalAcik(false);
    const secim = await medyaSec();
    if (!secim) return;
    if (secim.hata) return Alert.alert('Olmadı', secim.hata);
    if (secim.tur === 'video') return Alert.alert('Olmadı', 'Grup resmi için video seçemezsin.');

    const yuklendi = await medyaYukleGonder(sunucuAdres, kullanici, sifre, secim);
    if (yuklendi.hata) return Alert.alert('Olmadı', yuklendi.hata);

    const sonuc = await grupResimGuncelle(sunucuAdres, kullanici, sifre, hedef, yuklendi.url);
    if (!sonuc.tamam) {
      Alert.alert('Olmadı', sonuc.hata || 'Grup resmi güncellenemedi.');
    } else {
      setYerelGrupResimUrl(yuklendi.url);
      if (grupGuncelle) {
        grupGuncelle(hedef, { resimUrl: yuklendi.url });
      }
    }
  }

  async function engelleToggle() {
    setMenuModalAcik(false);
    if (!benEngelledimMi) {
      setOnayDiyalog({
        baslik: 'Kullanıcıyı Engelle',
        mesaj: `${hedef} adlı kullanıcıyı engellemek istediğinize emin misiniz? Artık size mesaj gönderemez.`,
        onayMetni: 'Engelle',
        tehlikeli: true,
        onOnayla: async () => {
          setAksiyonYukleniyor(true);
          const sonuc = await kullaniciEngelle(sunucuAdres, kullanici, sifre, hedef);
          setAksiyonYukleniyor(false);
          if (!sonuc.tamam) return Alert.alert('Olmadı', sonuc.hata || 'İşlem başarısız.');
          onAyarGuncellendi({ engellenenler: sonuc.engellenenler });
        },
      });
    } else {
      setAksiyonYukleniyor(true);
      const sonuc = await kullaniciEngeliKaldir(sunucuAdres, kullanici, sifre, hedef);
      setAksiyonYukleniyor(false);
      if (!sonuc.tamam) return Alert.alert('Olmadı', sonuc.hata || 'İşlem başarısız.');
      onAyarGuncellendi({ engellenenler: sonuc.engellenenler });
    }
  }

  async function sessizeAlToggle() {
    setMenuModalAcik(false);
    const sonuc = await sessizeAl(sunucuAdres, kullanici, sifre, anahtar, !sessizMi);
    if (!sonuc.tamam) return Alert.alert('Olmadı', sonuc.hata || 'İşlem başarısız.');
    onAyarGuncellendi({ sessizeAlinanlar: sonuc.sessizeAlinanlar });
  }

  const canliDurum = hedefTuru === 'kisi' ? kullaniciDurumlari[hedef] : null;
  const digerDurum = canliDurum || yerelDigerDurum;
  const digerYaziyorMu =
    hedefTuru === 'kisi'
      ? !!(yaziyorlar[anahtar] && yaziyorlar[anahtar][hedef])
      : !!(yaziyorlar[anahtar] && Object.keys(yaziyorlar[anahtar]).length > 0);
  const grupYazanlar = hedefTuru === 'grup' && yaziyorlar[anahtar] ? Object.keys(yaziyorlar[anahtar]) : [];

  let altYaziMetni;
  let altYaziRengi = renkler.metinSoluk;
  if (benEngelledimMi) {
    altYaziMetni = 'Engellendi';
  } else if (hedefTuru === 'grup') {
    altYaziMetni = `${guncelUyeler.length} kişi · dokun`;
  } else if (digerYaziyorMu) {
    altYaziMetni = 'yazıyor...';
    altYaziRengi = renkler.basarili || '#32d74b';
  } else if (digerDurum?.cevrimici) {
    altYaziMetni = 'Çevrim içi';
    altYaziRengi = renkler.basarili || '#32d74b';
  } else {
    const sg = digerDurum ? sonGorulmeMetni(digerDurum.sonGorulme) : null;
    altYaziMetni = sg ? `Son görülme: ${sg}` : baglandi ? 'Çevrim dışı' : 'Bağlanıyor...';
  }

  const medyaliMesajlar = mesajlar.filter((m) => m.medyaUrl && !m.tekGorunumGoruldu && !(m.tekGorunum && !m.tekGorunumGoruldu));

  function mesajOgesi({ item }) {
    return (
      <MesajBalonu
        item={item}
        benim={(item.gonderen || '').toLowerCase() === (benimAdim || '').toLowerCase()}
        hedefTuru={hedefTuru}
        benimAdim={benimAdim}
        renkler={renkler}
        styles={styles}
        onYanitla={setYanitlanan}
        onBegen={(m) => begeniDegistir(m.id)}
        onTekliMenu={(m, layout) => setMesajMenu({ item: m, layout })}
        onMedyaAc={medyaAc}
        onAlintiTikla={alintiyaKaydir}
        vurgulu={String(item.id) === String(vurgulananId)}
      />
    );
  }

  return (
    <View style={styles.kok}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onGeri} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.geriIkon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerOrta}>
          {/* Avatar */}
          {hedefTuru === 'grup' && guncelResimUrl ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, guncelResimUrl))}
            >
              <Image source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, guncelResimUrl) }} style={styles.headerAvatar} />
            </TouchableOpacity>
          ) : hedefTuru === 'kisi' && digerProfilResmi ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, digerProfilResmi))}
            >
              <Image source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, digerProfilResmi) }} style={styles.headerAvatar} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerAvatarKutu}>
              <Text style={styles.headerAvatarMetin}>{canliBaslik.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.headerBilgi}
            activeOpacity={0.7}
            onPress={() => {
              if (hedefTuru === 'grup') {
                grupDetayAc();
              } else {
                kullaniciProfilAc();
              }
            }}
          >
            <Text style={styles.headerBaslik} numberOfLines={1}>{canliBaslik}</Text>
            {!!altYaziMetni && <Text style={[styles.headerAltyazi, { color: altYaziRengi }]} numberOfLines={1}>{altYaziMetni}</Text>}
          </TouchableOpacity>

        </View>
        <TouchableOpacity onPress={() => setMenuModalAcik(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.menuIkon}>⋮</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.icerikAlani} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TemaDeseni temaId={ozelTema?.id} />
        <FlatList
          ref={listeRef}
          data={tersMesajlar}
          extraData={tersMesajlar}
          inverted
          keyboardShouldPersistTaps="handled"
          maxToRenderPerBatch={15}
          updateCellsBatchingPeriod={50}
          initialNumToRender={20}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          keyExtractor={(item) => String(item.id ?? item.gecici)}
          renderItem={mesajOgesi}
          contentContainerStyle={styles.mesajListesi}
          onEndReached={eskileriYukle}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            eskileriYukleniyor ? (
              <View style={styles.eskiYukleniyorKutu}>
                <ActivityIndicator color={renkler.metinSoluk} size="small" />
              </View>
            ) : null
          }
        />

        {digerYaziyorMu && (
          <View style={styles.yaziyorSatiri}>
            {hedefTuru === 'grup' && <Text style={styles.yaziyorIsim}>{grupYazanlar.join(', ')} </Text>}
            <YaziyorNoktalari renkler={renkler} />
          </View>
        )}

        {/* @mention önerileri kutusu */}
        {mentionAdaylari.length > 0 && (
          <View style={styles.mentionKutusu}>
            {mentionAdaylari.map((ad) => (
              <TouchableOpacity
                key={ad}
                style={styles.mentionSatiri}
                onPress={() => mentionSec(ad)}
              >
                <Text style={styles.mentionMetin}>@{ad}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!!yanitlanan && (
          <View style={styles.yanitBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.yanitBarBaslik}>{yanitlanan.gonderen}'a yanıt</Text>
              <Text style={styles.yanitBarMetin} numberOfLines={1}>
                {yanitlanan.metin || (yanitlanan.medyaTuru === 'ses' ? '🎤 Ses kaydı' : yanitlanan.medyaTuru === 'video' ? '🎥 Video' : '📷 Fotoğraf')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setYanitlanan(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.yanitBarKapat}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {benEngelledimMi ? (
          <View style={[styles.engellendiBar, { paddingBottom: Math.max(insets.bottom, bosluk.sm) }]}>
            <Text style={styles.engellendiMetin}>Bu kullanıcıyı engellediniz.</Text>
            <TouchableOpacity onPress={engelleToggle} style={styles.engelKaldirButon}>
              <Text style={styles.engelKaldirMetin}>Engeli Kaldır</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.girdiSatiri, { paddingBottom: Math.max(insets.bottom, bosluk.sm) }]}>
            {sesKayitYapiliyor ? (
              <View style={styles.kayitBari}>
                <TouchableOpacity onPress={sesKaydiIptal} style={styles.kayitSilButon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.kayitSilMetin}>🗑</Text>
                </TouchableOpacity>
                <Animated.View style={[styles.kayitNokta, { opacity: kayitNoktaAnim }]} />
                <Text style={styles.kayitSureMetin}>{kayitSuresiFormatla(kayitSuresi)}</Text>
                <Text style={styles.kayitIptalMetin} numberOfLines={1}>
                  {kayitKilitli ? 'Kaydediliyor...' : '‹ İptal için sola kaydır'}
                </Text>
                <TouchableOpacity
                  onPress={() => sesKaydiDurdurGonder(true)}
                  style={styles.kayitGonderButon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.kayitGonderIkon}>↑</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Kamera ikonu - her zaman solda */}
                <TouchableOpacity style={styles.ikonButon} onPress={kameraIleFotoCek} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                  <View style={styles.kameraIkon}>
                    <View style={styles.kameraGovde} />
                    <View style={styles.kameraLens} />
                  </View>
                </TouchableOpacity>

                <TextInput
                  style={styles.mesajGirdi}
                  placeholder="Mesaj yaz..."
                  placeholderTextColor={renkler.metinSoluk}
                  value={metin}
                  onChangeText={metinDegisti}
                  onFocus={() => setCikartmaPaneliAcik(false)}
                  multiline
                />

                {/* Yazı varsa: Çıkartma + Gönder | Yazı yoksa: Galeri + Çıkartma + Mikrofon */}
                {metin.trim().length > 0 ? (
                  <View style={styles.sagIkonlar}>
                    <TouchableOpacity
                      style={styles.ikonButon}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCikartmaPaneliAcik((acik) => !acik);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    >
                      <CikartmaIkon
                        renk={cikartmaPaneliAcik ? (renkler.vurgu || '#00a8ff') : (renkler.metinSoluk || '#8b949e')}
                        aktif={cikartmaPaneliAcik}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.gonderButon, !baglandi && styles.gonderButonPasif]}
                      onPress={gonder}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.gonderButonMetni}>↑</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.sagIkonlar}>
                    {/* Galeri ikonu */}
                    <TouchableOpacity style={styles.ikonButon} onPress={medyaSecBaslat} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                      <View style={styles.galeriIkon}>
                        <View style={styles.galeriKare} />
                        <View style={styles.galeriKare2} />
                      </View>
                    </TouchableOpacity>
                    {/* Çıkartma ikonu - Galeri ikonunun hemen yanında */}
                    <TouchableOpacity
                      style={styles.ikonButon}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCikartmaPaneliAcik((acik) => !acik);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    >
                      <CikartmaIkon
                        renk={cikartmaPaneliAcik ? (renkler.vurgu || '#00a8ff') : (renkler.metinSoluk || '#8b949e')}
                        aktif={cikartmaPaneliAcik}
                      />
                    </TouchableOpacity>
                    <View
                      {...kayitPanResponder.panHandlers}
                      style={styles.ikonButon}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    >
                      <View style={styles.mikrofonIkon}>
                        <View style={styles.mikrofonKapsul} />
                        <View style={styles.mikrofonYay} />
                        <View style={styles.mikrofonSap} />
                        <View style={styles.mikrofonTaban} />
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Çıkartma Paneli (WhatsApp tarzı alt çekmece) */}
        <CikartmaPaneli
          visible={cikartmaPaneliAcik}
          onKapat={() => setCikartmaPaneliAcik(false)}
          onCikartmaSec={cikartmaGonder}
          sunucuAdres={sunucuAdres}
          kullanici={kullanici}
          sifre={sifre}
          renkler={renkler}
        />
      </KeyboardAvoidingView>

      <Modal visible={!!mesajMenu} animationType="fade" transparent onRequestClose={() => setMesajMenu(null)}>
        <TouchableOpacity
          style={styles.mesajMenuArkaplan}
          activeOpacity={1}
          onPress={() => setMesajMenu(null)}
        >
          <View
            style={[
              styles.aksiyonKutu,
              styles.mesajMenuKutu,
              mesajMenu?.layout
                ? {
                    top: Math.max(
                      insets.top + 50,
                      mesajMenu.layout.y - 180 > insets.top + 50
                        ? mesajMenu.layout.y - 175
                        : mesajMenu.layout.y + mesajMenu.layout.height + 6
                    ),
                    ...(mesajMenu.item.gonderen === benimAdim ? { right: 16 } : { left: 16 }),
                  }
                : { alignSelf: 'center', bottom: insets.bottom + 80 },
            ]}
          >
            {!!mesajMenu?.item?.metin && (
              <TouchableOpacity
                style={styles.aksiyonSatiri}
                onPress={async () => {
                  await Clipboard.setStringAsync(mesajMenu.item.metin);
                  setMesajMenu(null);
                }}
              >
                <Text style={styles.aksiyonMetni}>Kopyala</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.aksiyonSatiri}
              onPress={() => {
                setYanitlanan(mesajMenu.item);
                setMesajMenu(null);
              }}
            >
              <Text style={styles.aksiyonMetni}>Yanıtla</Text>
            </TouchableOpacity>
            {mesajMenu?.item?.medyaTuru === 'sticker' && !!mesajMenu.item.medyaUrl && (
              <TouchableOpacity
                style={styles.aksiyonSatiri}
                onPress={async () => {
                  const sUrl = mesajMenu.item.medyaUrl;
                  setMesajMenu(null);
                  await ozelCikartmaKaydet(kullanici, {
                    isim: 'Kaydedilen Çıkartma',
                    url: sUrl,
                  });
                  Alert.alert('Harika!', '✓ Çıkartma "Çıkartmalarım" listenize eklendi.');
                }}
              >
                <Text style={[styles.aksiyonMetni, { color: renkler.vurgu || '#00a8ff', fontWeight: '700' }]}>
                  ★ Çıkartmalarıma Ekle
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.aksiyonSatiri}
              onPress={() => {
                const id = mesajMenu.item.id;
                setMesajMenu(null);
                begeniDegistir(id);
              }}
            >
              <Text style={styles.aksiyonMetni}>
                {(mesajMenu?.item?.begenenler || []).includes(benimAdim) ? 'Beğeniyi Kaldır' : 'Beğen'}
              </Text>
            </TouchableOpacity>
            {mesajMenu?.item && mesajMenu.item.gonderen === benimAdim && Date.now() - mesajMenu.item.zaman <= DUZENLEME_SURESI_MS && (
              <TouchableOpacity
                style={styles.aksiyonSatiri}
                onPress={() => {
                  setDuzenlemeModal({ id: mesajMenu.item.id, metin: mesajMenu.item.metin });
                  setMesajMenu(null);
                }}
              >
                <Text style={styles.aksiyonMetni}>Düzenle</Text>
              </TouchableOpacity>
            )}
            {mesajMenu?.item && mesajMenu.item.gonderen === benimAdim && hedefTuru === 'grup' && (
              <TouchableOpacity
                style={styles.aksiyonSatiri}
                onPress={() => {
                  const okuyanlar = mesajMenu.item.okuyanlar || [];
                  setGorulduModal({ item: mesajMenu.item, okuyanlar });
                  setMesajMenu(null);
                }}
              >
                <Text style={styles.aksiyonMetni}>
                  Görüldü Bilgisi
                </Text>
              </TouchableOpacity>
            )}
            {mesajMenu?.item && mesajMenu.item.gonderen === benimAdim && hedefTuru === 'kisi' && (
              <TouchableOpacity
                style={styles.aksiyonSatiri}
                onPress={() => {
                  setGorulduModal({ item: mesajMenu.item, tip: 'kisi' });
                  setMesajMenu(null);
                }}
              >
                <Text style={styles.aksiyonMetni}>Görüldü Bilgisi</Text>
              </TouchableOpacity>
            )}
            {mesajMenu?.item && mesajMenu.item.gonderen === benimAdim && (
              <TouchableOpacity
                style={[styles.aksiyonSatiri, { borderBottomWidth: 0 }]}
                onPress={() => {
                  const id = mesajMenu.item.id;
                  setMesajMenu(null);
                  mesajSilOnayla(id);
                }}
              >
                <Text style={[styles.aksiyonMetni, { color: renkler.hata }]}>Sil</Text>
              </TouchableOpacity>
            )}

          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!duzenlemeModal} animationType="fade" transparent onRequestClose={() => setDuzenlemeModal(null)}>
        <View style={styles.modalArkaplan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Mesajı düzenle</Text>
            <TextInput
              style={[styles.girdi, { minHeight: 80, textAlignVertical: 'top' }]}
              value={duzenlemeModal?.metin || ''}
              onChangeText={(t) => setDuzenlemeModal((m) => ({ ...m, metin: t }))}
              multiline
              autoFocus
            />
            <TouchableOpacity style={styles.buton} onPress={duzenlemeKaydet}>
              <Text style={styles.butonMetni}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setDuzenlemeModal(null)}>
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Kim Gördü? Modalı */}
      <Modal visible={!!gorulduModal} animationType="fade" transparent onRequestClose={() => setGorulduModal(null)}>
        <TouchableOpacity style={styles.modalArkaplan} activeOpacity={1} onPress={() => setGorulduModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalKutu, { maxHeight: 480 }]}>
            <Text style={[styles.modalBaslik, { marginBottom: 8 }]}>Görüldü Bilgisi</Text>

            {/* Mesaj Özeti */}
            {gorulduModal?.item?.metin ? (
              <View style={{ backgroundColor: (renkler.kendiBalon || '#00a8ff') + '22', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                <Text style={{ color: renkler.metinSoluk, fontSize: 11, marginBottom: 2 }}>Gönderilen Mesaj:</Text>
                <Text style={{ color: renkler.metin, fontSize: 13 }} numberOfLines={2}>
                  {gorulduModal.item.metin}
                </Text>
              </View>
            ) : null}

            {/* Kişisel Sohbet Görüldü Bilgisi */}
            {gorulduModal?.tip === 'kisi' ? (() => {
              const buMesaj = mesajlar.find((m) => String(m.id) === String(gorulduModal?.item?.id)) || gorulduModal?.item;
              const goruldu = buMesaj?.durum === 'gorundu' || buMesaj?.okundu === 1;
              const gorulmeTarihi = buMesaj?.okunduZamani || null;
              const tarihStr = gorulmeTarihi
                ? new Date(gorulmeTarihi).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : null;
              return (
                <View style={{ width: '100%', paddingVertical: 8 }}>
                  {goruldu ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: renkler.vurgu || '#00a8ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{(hedef || '?').slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: renkler.metin, fontSize: 14, fontWeight: '500' }}>{hedef}</Text>
                        {tarihStr && <Text style={{ color: renkler.metinSoluk, fontSize: 11, marginTop: 2 }}>{tarihStr}</Text>}
                      </View>
                      <Text style={{ color: renkler.basarili || '#32d74b', fontSize: 12, fontWeight: '600' }}>✓✓ Gördü</Text>
                    </View>
                  ) : (
                    <Text style={{ color: renkler.metinSoluk, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 }}>
                      Henüz görülmedi.
                    </Text>
                  )}
                </View>
              );
            })() : null}

            {/* Grup Görüldü Bilgisi */}
            {gorulduModal?.tip !== 'kisi' ? (() => {
              const buMesaj = mesajlar.find((m) => String(m.id) === String(gorulduModal?.item?.id)) || gorulduModal?.item;
              const okuyanlar = buMesaj?.okuyanlar || [];
              const okuyanZamanlar = buMesaj?.okuyanZamanlar || {};
              const okumayanlar = (guncelUyeler || []).filter(
                (u) => (u || '').toLowerCase() !== (benimAdim || '').toLowerCase() &&
                       !okuyanlar.some((o) => (o || '').toLowerCase() === (u || '').toLowerCase())
              );

              return (
                <ScrollView style={{ maxHeight: 280, width: '100%' }} showsVerticalScrollIndicator={false}>
                  <Text style={{ color: renkler.metinSoluk, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 }}>
                    GÖRENLER ({okuyanlar.length})
                  </Text>
                  {okuyanlar.length > 0 ? (
                    okuyanlar.map((kullaniciAdi, idx) => {
                      const ts = okuyanZamanlar[kullaniciAdi];
                      const tarihStr = ts ? new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
                      return (
                        <View
                          key={`okuyan-${kullaniciAdi}-${idx}`}
                          style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingVertical: 8, paddingHorizontal: 4,
                            borderBottomWidth: idx < okuyanlar.length - 1 ? 0.5 : 0,
                            borderBottomColor: renkler.cizgi,
                          }}
                        >
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: renkler.vurgu || '#00a8ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{(kullaniciAdi || '?').slice(0, 1).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: renkler.metin, fontSize: 14, fontWeight: '500' }}>{kullaniciAdi}</Text>
                            {tarihStr && <Text style={{ color: renkler.metinSoluk, fontSize: 11, marginTop: 1 }}>{tarihStr}</Text>}
                          </View>
                          <Text style={{ color: renkler.basarili || '#32d74b', fontSize: 12, fontWeight: '600' }}>✓✓ Gördü</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: renkler.metinSoluk, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 }}>
                      Henüz kimse görmedi.
                    </Text>
                  )}

                  {okumayanlar.length > 0 && (
                    <>
                      <Text style={{ color: renkler.metinSoluk, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 14 }}>
                        HENÜZ GÖRMEYENLER ({okumayanlar.length})
                      </Text>
                      {okumayanlar.map((kullaniciAdi, idx) => (
                        <View
                          key={`okumayan-${kullaniciAdi}-${idx}`}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4, opacity: 0.7 }}
                        >
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: renkler.yuzey || '#333', borderWidth: 1, borderColor: renkler.cizgi, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                            <Text style={{ color: renkler.metinSoluk, fontWeight: '600', fontSize: 12 }}>
                              {(kullaniciAdi || '?').slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={{ color: renkler.metinSoluk, fontSize: 13, flex: 1 }}>{kullaniciAdi}</Text>
                          <Text style={{ color: renkler.metinSoluk, fontSize: 11 }}>İletildi</Text>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
              );
            })() : null}

            <TouchableOpacity
              style={[styles.ikincilButon, { marginTop: 14 }]}
              onPress={() => setGorulduModal(null)}
            >
              <Text style={styles.ikincilButonMetni}>Kapat</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={menuModalAcik} animationType="fade" transparent onRequestClose={() => setMenuModalAcik(false)}>

        <TouchableOpacity style={styles.ustMenuArkaplan} activeOpacity={1} onPress={() => setMenuModalAcik(false)}>
          <View style={[styles.aksiyonKutu, styles.ustMenuKutu, { top: insets.top + 46, right: 12 }]}>
            {medyaliMesajlar.length > 0 && (
              <TouchableOpacity style={styles.aksiyonSatiri} onPress={() => { setMenuModalAcik(false); setGaleriModalAcik(true); }}>
                <Text style={styles.aksiyonMetni}>Medya</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.aksiyonSatiri} onPress={() => { setMenuModalAcik(false); setTemaModalAcik(true); }}>
              <Text style={styles.aksiyonMetni}>Tema Değiştir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aksiyonSatiri} onPress={sessizeAlToggle}>
              <Text style={styles.aksiyonMetni}>{sessizMi ? 'Sesi Aç' : 'Sessize Al'}</Text>
            </TouchableOpacity>
            {hedefTuru === 'kisi' && (
              <TouchableOpacity style={styles.aksiyonSatiri} onPress={engelleToggle} disabled={aksiyonYukleniyor}>
                <Text style={[styles.aksiyonMetni, { color: renkler.hata }]}>
                  {benEngelledimMi ? 'Engeli Kaldır' : 'Engelle'}
                </Text>
              </TouchableOpacity>
            )}
            {benYoneticiMiyim && (
              <TouchableOpacity style={styles.aksiyonSatiri} onPress={grupResimSec}>
                <Text style={styles.aksiyonMetni}>Grup Resmini Değiştir</Text>
              </TouchableOpacity>
            )}
            {hedefTuru === 'grup' && (
              <>
                <TouchableOpacity style={styles.aksiyonSatiri} onPress={gruptanAyrilOnayla}>
                  <Text style={[styles.aksiyonMetni, { color: '#ff9f0a' }]}>Gruptan Çık</Text>
                </TouchableOpacity>
                {benYoneticiMiyim && (
                  <TouchableOpacity style={styles.aksiyonSatiri} onPress={grubuKapatOnayla}>
                    <Text style={[styles.aksiyonMetni, { color: renkler.hata }]}>Grubu Kapat</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity style={[styles.aksiyonSatiri, { borderBottomWidth: 0 }]} onPress={sohbetiSilOnayla}>
              <Text style={[styles.aksiyonMetni, { color: renkler.hata }]}>
                {hedefTuru === 'grup' ? 'Grubu Sil' : 'Sohbeti Sil'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!onayDiyalog} animationType="fade" transparent onRequestClose={() => setOnayDiyalog(null)}>
        <View style={styles.onayModalArkaplan}>
          <View style={styles.onayModalKutu}>
            <Text style={styles.onayModalBaslik}>{onayDiyalog?.baslik}</Text>
            {!!onayDiyalog?.mesaj && <Text style={styles.onayModalMesaj}>{onayDiyalog.mesaj}</Text>}
            <View style={styles.onayModalButonlar}>
              <TouchableOpacity
                style={styles.onayModalIptal}
                onPress={() => setOnayDiyalog(null)}
              >
                <Text style={styles.onayModalIptalMetni}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.onayModalTamam,
                  onayDiyalog?.tehlikeli && { backgroundColor: renkler.hata },
                ]}
                onPress={() => {
                  const cb = onayDiyalog?.onOnayla;
                  setOnayDiyalog(null);
                  if (cb) cb();
                }}
              >
                <Text style={styles.onayModalTamamMetni}>{onayDiyalog?.onayMetni || 'Tamam'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={temaModalAcik} animationType="slide" transparent onRequestClose={() => setTemaModalAcik(false)}>
        <View style={styles.modalArkaplan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Sohbet Teması</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {SOHBET_TEMALARI.map((t) => (
                <TouchableOpacity key={t.id} style={styles.temaSatiri} onPress={() => temaSec(t)}>
                  <View style={[styles.temaOrnegi, { backgroundColor: t.ornekRenk }]} />
                  <Text style={styles.uyeMetin}>{t.isim}</Text>
                  {ozelTema?.id === t.id && <Text style={{ color: renkler.vurgu }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setTemaModalAcik(false)}>
              <Text style={styles.ikincilButonMetni}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {hedefTuru === 'grup' && (
        <Modal visible={grupDetayAcik} animationType="slide" transparent onRequestClose={() => setGrupDetayAcik(false)}>
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalKutu, { maxHeight: '88%' }]}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                {guncelResimUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setOncekiModal('grup');
                      setGrupDetayAcik(false);
                      setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, guncelResimUrl));
                    }}
                  >
                    <Image source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, guncelResimUrl) }} style={{ width: 68, height: 68, borderRadius: 34, marginBottom: 6 }} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 68, height: 68, borderRadius: 34, marginBottom: 6, backgroundColor: renkler.kendiBalon, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, color: '#ffffff', fontWeight: '800' }}>{baslik.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                {benYoneticiMiyim && (
                  <TouchableOpacity onPress={grupResimSec} style={{ paddingVertical: 4 }}>
                    <Text style={{ color: renkler.vurgu || '#00a8ff', fontSize: 13, fontWeight: '600' }}>Grup Resmini Değiştir</Text>
                  </TouchableOpacity>
                )}
              </View>

              {benYoneticiMiyim ? (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: renkler.metinSoluk, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>GRUP ADI</Text>
                  <TextInput
                    style={styles.girdi}
                    value={grupIsimDuzenle}
                    onChangeText={setGrupIsimDuzenle}
                    placeholder="Grup ismi..."
                    placeholderTextColor={renkler.metinSoluk}
                  />

                  <Text style={{ color: renkler.metinSoluk, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>GRUP AÇIKLAMASI</Text>
                  <TextInput
                    style={[styles.girdi, { height: 50 }]}
                    value={grupAciklamaDuzenle}
                    onChangeText={setGrupAciklamaDuzenle}
                    placeholder="Açıklama ekle..."
                    placeholderTextColor={renkler.metinSoluk}
                    multiline
                  />

                  <TouchableOpacity style={[styles.buton, { paddingVertical: 10, marginBottom: 10 }]} onPress={grupBilgileriKaydet} disabled={grupKaydediliyor}>
                    <Text style={styles.butonMetni}>{grupKaydediliyor ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}</Text>
                  </TouchableOpacity>

                  {grupGuncellemeDurumu && (
                    <View style={{
                      backgroundColor: grupGuncellemeDurumu.basarili ? 'rgba(35, 134, 54, 0.22)' : 'rgba(218, 54, 51, 0.22)',
                      borderColor: grupGuncellemeDurumu.basarili ? '#238636' : '#da3633',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginBottom: 10,
                      alignItems: 'center',
                    }}>
                      <Text style={{ color: grupGuncellemeDurumu.basarili ? '#3fb950' : '#ff7b72', fontSize: 13, fontWeight: '700' }}>
                        {grupGuncellemeDurumu.mesaj}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ marginBottom: 12, alignItems: 'center' }}>
                  <Text style={{ color: renkler.metin, fontSize: 18, fontWeight: '700' }}>{baslik}</Text>
                  {!!grupCanli?.aciklama && (
                    <Text style={{ color: renkler.metinSoluk, fontSize: 13, marginTop: 4, textAlign: 'center' }}>{grupCanli.aciklama}</Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, backgroundColor: renkler.arkaplan, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: renkler.cizgi }}
                onPress={() => { setGrupDetayAcik(false); setTemaModalAcik(true); }}
              >
                <Text style={{ color: renkler.metin, fontWeight: '600', fontSize: 14 }}>🎨 Sohbet Temasını Değiştir</Text>
              </TouchableOpacity>

              <Text style={[styles.modalBaslik, { fontSize: 14, marginBottom: 6 }]}>Üyeler ({guncelUyeler.length})</Text>
              <FlatList
                data={guncelUyeler}
                keyExtractor={(item) => item}
                style={{ maxHeight: 200 }}
                renderItem={({ item: u }) => {
                  const uyeYoneticiMi = guncelYoneticiler.some((y) => (y || '').toLowerCase() === (u || '').toLowerCase());
                  return (
                    <TouchableOpacity
                      style={styles.uyeSatiri}
                      onPress={() => {
                        if (u !== benimAdim) setSeciliUyeIslemleri(u);
                      }}
                      disabled={u === benimAdim}
                    >
                      <View style={styles.uyeAvatar}>
                        <Text style={styles.uyeAvatarMetin}>{u.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.uyeMetin}>
                          {u} {u === benimAdim ? '(sen)' : ''}
                        </Text>
                        {uyeYoneticiMi && (
                          <Text style={{ color: renkler.vurgu || '#00a8ff', fontSize: 11, fontWeight: '600' }}>👑 Yönetici</Text>
                        )}
                      </View>
                      {u !== benimAdim && (
                        <Text style={{ color: renkler.metinSoluk, fontSize: 13 }}>•••</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />

              {benYoneticiMiyim && (
                <TouchableOpacity style={styles.uyeEkleButon} onPress={() => { setGrupDetayAcik(false); uyeEkleModalAc(); }}>
                  <Text style={styles.uyeEkleButonMetni}>+ Üye Ekle</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.ikincilButon} onPress={() => setGrupDetayAcik(false)}>
                <Text style={styles.ikincilButonMetni}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {hedefTuru === 'kisi' && (
        <Modal visible={profilModalAcik} animationType="slide" transparent onRequestClose={() => setProfilModalAcik(false)}>
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalKutu, { alignItems: 'center', paddingVertical: 20 }]}>
              {hedefProfilBilgi?.profilResimUrl || digerProfilResmi ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setOncekiModal('profil');
                    setProfilModalAcik(false);
                    setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, hedefProfilBilgi?.profilResimUrl || digerProfilResmi));
                  }}
                >
                  <Image
                    source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, hedefProfilBilgi?.profilResimUrl || digerProfilResmi) }}
                    style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 10 }}
                  />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 10, backgroundColor: renkler.kendiBalon, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 34, color: '#ffffff', fontWeight: '800' }}>{hedef.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <Text style={{ color: renkler.metin, fontSize: 18, fontWeight: '700' }}>{hedef}</Text>
              <Text style={{ color: altYaziRengi, fontSize: 12, marginTop: 2, marginBottom: 14 }}>{altYaziMetni}</Text>

              {!!hedefProfilBilgi?.biyografi && (
                <View style={{ width: '100%', backgroundColor: renkler.arkaplan, padding: 10, borderRadius: 10, marginBottom: 10 }}>
                  <Text style={{ color: renkler.metinSoluk, fontSize: 11, marginBottom: 2 }}>BİYOGRAFİ</Text>
                  <Text style={{ color: renkler.metin, fontSize: 13 }}>{hedefProfilBilgi.biyografi}</Text>
                </View>
              )}

              {!!hedefProfilBilgi?.dogumTarihi && (
                <View style={{ width: '100%', backgroundColor: renkler.arkaplan, padding: 10, borderRadius: 10, marginBottom: 14 }}>
                  <Text style={{ color: renkler.metinSoluk, fontSize: 11, marginBottom: 2 }}>DOĞUM TARİHİ</Text>
                  <Text style={{ color: renkler.metin, fontSize: 13 }}>🎂 {hedefProfilBilgi.dogumTarihi}</Text>
                </View>
              )}

              <View style={{ width: '100%', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.buton, { backgroundColor: sessizMi ? '#ff9f0a' : renkler.arkaplan, borderWidth: 1, borderColor: renkler.cizgi, paddingVertical: 11 }]}
                  onPress={sessizeAlToggle}
                >
                  <Text style={[styles.butonMetni, { color: sessizMi ? '#ffffff' : renkler.metin }]}>
                    {sessizMi ? '🔔 Bildirimleri Aç' : '🔕 Bildirimleri Sessize Al'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.buton, { backgroundColor: benEngelledimMi ? '#30d158' : '#ff453a', paddingVertical: 11 }]}
                  onPress={engelleToggle}
                >
                  <Text style={styles.butonMetni}>
                    {benEngelledimMi ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.ikincilButon} onPress={() => setProfilModalAcik(false)}>
                  <Text style={styles.ikincilButonMetni}>Kapat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {hedefTuru === 'grup' && (
        <Modal visible={uyeEkleModalAcik} animationType="slide" transparent onRequestClose={() => setUyeEkleModalAcik(false)}>
          <View style={styles.modalArkaplan}>
            <View style={[styles.modalKutu, { maxHeight: '80%' }]}>
              <Text style={styles.modalBaslik}>Üye Ekle</Text>
              <TextInput
                style={[styles.girdi, { marginBottom: 12 }]}
                placeholder="Kişi ara..."
                placeholderTextColor={renkler.metinSoluk}
                value={uyeAramaMetni}
                onChangeText={setUyeAramaMetni}
                autoCapitalize="none"
              />
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {filtrelenmisEklenebilirKullanicilar.length === 0 ? (
                  <Text style={styles.bosMetin}>
                    {eklenebilirKullanicilar.length === 0 ? 'Eklenebilecek başka kullanıcı yok.' : 'Eşleşen kullanıcı bulunamadı.'}
                  </Text>
                ) : (
                  filtrelenmisEklenebilirKullanicilar.map((k) => (
                    <TouchableOpacity key={k.kullanici} style={styles.uyeSatiri} onPress={() => uyeEkle(k.kullanici)}>
                      <View style={styles.uyeAvatar}>
                        {k.profilResimUrl ? (
                          <Image
                            source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, k.profilResimUrl) }}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                          />
                        ) : (
                          <Text style={styles.uyeAvatarMetin}>{(k.kullanici || '?').slice(0, 1).toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={styles.uyeMetin}>{k.kullanici}</Text>
                      <Text style={{ color: renkler.vurgu, fontWeight: '700', fontSize: 13 }}>+ Ekle</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity style={[styles.ikincilButon, { marginTop: 12 }]} onPress={() => setUyeEkleModalAcik(false)}>
                <Text style={styles.ikincilButonMetni}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={galeriModalAcik} animationType="slide" transparent onRequestClose={() => setGaleriModalAcik(false)}>
        <View style={styles.modalArkaplan}>
          <View style={[styles.modalKutu, { maxHeight: '85%' }]}>
            <Text style={styles.modalBaslik}>Medya</Text>
            <View style={styles.galeriGrid}>
              {medyaliMesajlar.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.galeriHucre}
                  onPress={() => { setGaleriModalAcik(false); setTamEkranMedya(m); }}
                >
                  {m.medyaTuru === 'video' ? (
                    <View style={[styles.galeriHucreResim, styles.galeriVideoKutu]}>
                      <Text style={{ fontSize: 20 }}>▶</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: m._tamMedyaUrl }} style={styles.galeriHucreResim} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setGaleriModalAcik(false)}>
              <Text style={styles.ikincilButonMetni}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!tamEkranMedya} animationType="fade" transparent={false} onRequestClose={tamEkranKapat}>
        {tamEkranMedya?.medyaTuru === 'video' ? (
          <View style={styles.tamEkranArkaplan}>
            <VideoOynatici
              uri={tamEkranMedya._tamMedyaUrl}
              styles={styles}
              insets={insets}
              onKapat={tamEkranKapat}
            />
            {tamEkranMedya?.yaziKatmani && tamEkranMedya.yaziKatmani.metin && (
              <View
                style={[
                  styles.tamEkranYaziKapsayici,
                  {
                    top: (tamEkranMedya.yaziKatmani.konumYOrani || 0.4) * Dimensions.get('window').height,
                  },
                  tamEkranMedya.yaziKatmani.arkaplanModu === 'yariSaydam' && styles.yaziKatmaniYariSaydam,
                  tamEkranMedya.yaziKatmani.arkaplanModu === 'dolu' && { backgroundColor: tamEkranMedya.yaziKatmani.renk },
                  tamEkranMedya.yaziKatmani.arkaplanModu === 'neon' && {
                    borderColor: tamEkranMedya.yaziKatmani.renk,
                    borderWidth: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tamEkranYaziMetni,
                    {
                      color:
                        tamEkranMedya.yaziKatmani.arkaplanModu === 'dolu'
                          ? tamEkranMedya.yaziKatmani.renk === '#ffffff'
                            ? '#000000'
                            : '#ffffff'
                          : tamEkranMedya.yaziKatmani.renk,
                    },
                  ]}
                >
                  {tamEkranMedya.yaziKatmani.metin}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tamEkranArkaplan}>
            <TouchableOpacity style={[styles.tamEkranKapat, { top: insets.top + 12 }]} onPress={tamEkranKapat}>
              <Text style={styles.tamEkranKapatMetni}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: tamEkranMedya?._tamMedyaUrl }} style={styles.tamEkranResim} resizeMode="contain" />
            {tamEkranMedya?.yaziKatmani && tamEkranMedya.yaziKatmani.metin && (
              <View
                style={[
                  styles.tamEkranYaziKapsayici,
                  {
                    top: (tamEkranMedya.yaziKatmani.konumYOrani || 0.4) * Dimensions.get('window').height,
                  },
                  tamEkranMedya.yaziKatmani.arkaplanModu === 'yariSaydam' && styles.yaziKatmaniYariSaydam,
                  tamEkranMedya.yaziKatmani.arkaplanModu === 'dolu' && { backgroundColor: tamEkranMedya.yaziKatmani.renk },
                  tamEkranMedya.yaziKatmani.arkaplanModu === 'neon' && {
                    borderColor: tamEkranMedya.yaziKatmani.renk,
                    borderWidth: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tamEkranYaziMetni,
                    {
                      color:
                        tamEkranMedya.yaziKatmani.arkaplanModu === 'dolu'
                          ? tamEkranMedya.yaziKatmani.renk === '#ffffff'
                            ? '#000000'
                            : '#ffffff'
                          : tamEkranMedya.yaziKatmani.renk,
                    },
                  ]}
                >
                  {tamEkranMedya.yaziKatmani.metin}
                </Text>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Özel Medya & Hikaye Tarzı Düzenleyici (Galeriden seçilen veya çekilen medya için) */}
      <OzelMedyaDuzenleyici
        visible={!!secilenMedya}
        medya={secilenMedya}
        mod="sohbet"
        onKapat={() => setSecilenMedya(null)}
        onGonder={medyaGonderDuzenlenmis}
      />

      {/* Özel Kamera Modalı (Instagram / WhatsApp benzeri vizör ve stüdyo) */}
      <OzelKameraModal
        visible={ozelKameraAcik}
        mod="sohbet"
        onKapat={() => setOzelKameraAcik(false)}
        onGonder={medyaGonderDuzenlenmis}
      />

      {/* Üye İşlemleri Seçenek Menüsü (Sohbete Git, Yönetici Yap/Al, Gruptan At) */}
      <Modal
        visible={!!seciliUyeIslemleri}
        animationType="fade"
        transparent
        onRequestClose={() => setSeciliUyeIslemleri(null)}
      >
        <TouchableOpacity
          style={styles.modalArkaplan}
          activeOpacity={1}
          onPress={() => setSeciliUyeIslemleri(null)}
        >
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>@{seciliUyeIslemleri}</Text>

            <TouchableOpacity
              style={styles.aksiyonSatiri}
              onPress={() => {
                const hedefKisi = seciliUyeIslemleri;
                setSeciliUyeIslemleri(null);
                setGrupDetayAcik(false);
                uyeyeDmAc(hedefKisi);
              }}
            >
              <Text style={styles.aksiyonMetni}>💬 Sohbete Git</Text>
            </TouchableOpacity>

            {benYoneticiMiyim && (
              <>
                <TouchableOpacity
                  style={styles.aksiyonSatiri}
                  onPress={async () => {
                    const hedefKisi = seciliUyeIslemleri;
                    setSeciliUyeIslemleri(null);
                    await yoneticiRolDegistir(hedefKisi);
                  }}
                >
                  <Text style={styles.aksiyonMetni}>
                    {guncelYoneticiler.some((y) => (y || '').toLowerCase() === (seciliUyeIslemleri || '').toLowerCase())
                      ? '👑 Yöneticiliği Al'
                      : '👑 Yönetici Yap'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.aksiyonSatiri, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    const hedefKisi = seciliUyeIslemleri;
                    setSeciliUyeIslemleri(null);
                    uyeCikarOnayla(hedefKisi);
                  }}
                >
                  <Text style={[styles.aksiyonMetni, { color: renkler.hata }]}>🚫 Gruptan At</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.ikincilButon, { marginTop: 12 }]}
              onPress={() => setSeciliUyeIslemleri(null)}
            >
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Büyük Profil / Medya Fotoğrafı Modal */}
      <Modal
        visible={!!buyukFotoUrl}
        animationType="fade"
        transparent
        onRequestClose={buyukFotoKapat}
      >
        <View style={styles.tamEkranArkaplan}>
          <TouchableOpacity
            style={[styles.tamEkranKapat, { top: insets.top + 12 }]}
            onPress={buyukFotoKapat}
          >
            <Text style={styles.tamEkranKapatMetni}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: buyukFotoUrl }}
            style={styles.tamEkranResim}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
}

function olusturStiller(renkler) {
  return StyleSheet.create({
    kok: { flex: 1, backgroundColor: renkler.arkaplan },
    icerikAlani: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: bosluk.md,
      paddingBottom: bosluk.sm,
      borderBottomWidth: 1,
      borderBottomColor: renkler.cizgi,
      backgroundColor: renkler.yuzey,
    },
    geriIkon: { color: renkler.metin, fontSize: 22, width: 24 },
    headerOrta: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-start', marginLeft: bosluk.sm },
    headerGrupResmi: { width: 28, height: 28, borderRadius: 14, marginRight: bosluk.sm },
    headerBaslik: { color: renkler.metin, fontSize: 16, fontWeight: '700', textAlign: 'left' },
    headerAltyazi: { fontSize: 11, marginTop: 1, textAlign: 'left' },
    menuIkon: { color: renkler.metin, fontSize: 20, width: 24, textAlign: 'right' },

    eskiYukleniyorKutu: { paddingVertical: bosluk.sm, alignItems: 'center' },

    mesajListesi: { padding: bosluk.md, paddingBottom: bosluk.lg },
    balonSatir: { marginVertical: 3, flexDirection: 'row', paddingHorizontal: 4 },
    sagaYasli: { justifyContent: 'flex-end' },
    solaYasli: { justifyContent: 'flex-start' },
    balon: { minWidth: 80, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, position: 'relative', overflow: 'visible' },
    kendiBalon: { backgroundColor: renkler.kendiBalon, borderBottomRightRadius: 4 },
    digerBalon: { backgroundColor: renkler.digerBalon, borderWidth: 1, borderColor: renkler.cizgi, borderBottomLeftRadius: 4 },
    kendiBalonMetin: { color: renkler.kendiBalonMetin, fontSize: 15 },
    digerBalonMetin: { color: renkler.digerBalonMetin, fontSize: 15 },
    silinmisMetin: { color: renkler.metinSoluk, fontSize: 14, fontStyle: 'italic' },
    gonderenAdi: { color: renkler.metinSoluk, fontSize: 11, fontWeight: '700', marginBottom: 2 },

    alintiKutu: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6, borderLeftWidth: 3 },
    alintiKutuKendi: { backgroundColor: 'rgba(0,0,0,0.06)', borderLeftColor: '#000000' },
    alintiKutuDiger: { backgroundColor: 'rgba(255,255,255,0.08)', borderLeftColor: renkler.vurgu || '#ffffff' },
    alintiGonderen: { fontSize: 11, fontWeight: '700' },
    alintiGonderenKendi: { color: '#111111' },
    alintiGonderenDiger: { color: '#ffffff' },
    alintiMetin: { fontSize: 12, marginTop: 1 },
    alintiMetinKendi: { color: '#444444' },
    alintiMetinDiger: { color: 'rgba(255,255,255,0.7)' },

    sistemMesajSatiri: { alignItems: 'center', marginVertical: 8 },
    sistemMesajKutu: {
      backgroundColor: renkler.yuzey, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4,
      borderWidth: 1, borderColor: renkler.cizgi,
    },
    sistemMesajMetin: { color: renkler.metinSoluk, fontSize: 12, textAlign: 'center' },

    altSatir: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, alignItems: 'center' },
    duzenlendiEtiketi: { fontSize: 10, color: renkler.metinSoluk, fontStyle: 'italic' },
    saat: { fontSize: 10, color: renkler.metinSoluk },
    saatKendi: { color: 'rgba(0,0,0,0.55)' },
    durumYazi: { fontSize: 10, color: renkler.metinSoluk },

    begeniRozeti: {
      position: 'absolute', bottom: -12, backgroundColor: renkler.yuzey,
      borderWidth: 1, borderColor: renkler.cizgi, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
      zIndex: 20, elevation: 4,
    },
    begeniRozetiSol: { left: 8 },
    begeniRozetiSag: { right: 8 },
    begeniMetni: { fontSize: 11, color: '#ff453a' },

    kalpPatlama: { position: 'absolute', alignSelf: 'center', top: '30%' },
    kalpPatlamaMetni: { fontSize: 46, color: '#ff453a' },

    tekGorunumKutu: {
      backgroundColor: renkler.arkaplan, borderRadius: 10, paddingVertical: 24, paddingHorizontal: 12,
      alignItems: 'center', marginBottom: 6, minWidth: 160,
    },
    tekGorunumMetni: { color: renkler.metinSoluk, fontSize: 13 },
    tekGorunumBadge: {
      backgroundColor: renkler.arkaplan, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14,
      alignItems: 'center', marginBottom: 4, alignSelf: 'flex-start',
      borderWidth: 1, borderColor: renkler.cizgi,
    },
    tekGorunumBadgeMetni: { color: renkler.metin, fontSize: 13, fontWeight: '600' },
    fotoOnizlemeKutu: { width: 220, height: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: renkler.arkaplan, marginBottom: 6 },
    fotoOnizleme: { width: '100%', height: '100%', resizeMode: 'cover' },
    videoOnizleme: {
      width: 200, height: 140, borderRadius: 10, backgroundColor: renkler.arkaplan,
      justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    videoOynatIkonu: { fontSize: 32, color: renkler.metin },
    videoEtiketi: { color: renkler.metinSoluk, fontSize: 12, marginTop: 4 },
    balonYaziKatmaniKutu: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      right: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'center',
    },
    balonYaziKatmaniMetin: {
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    tamEkranYaziKapsayici: {
      position: 'absolute',
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      maxWidth: '85%',
      zIndex: 20,
    },
    tamEkranYaziMetni: {
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    yaziKatmaniYariSaydam: {
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
    },

    yaziyorSatiri: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: bosluk.md, paddingBottom: bosluk.xs },
    yaziyorIsim: { color: renkler.metinSoluk, fontSize: 13, fontWeight: '600' },

    yanitBar: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: renkler.yuzey,
      paddingHorizontal: bosluk.md, paddingVertical: bosluk.sm, borderTopWidth: 1, borderTopColor: renkler.cizgi,
    },
    yanitBarBaslik: { color: renkler.metin, fontSize: 12, fontWeight: '700' },
    yanitBarMetin: { color: renkler.metinSoluk, fontSize: 12, marginTop: 2 },
    yanitBarKapat: { color: renkler.metinSoluk, fontSize: 16, paddingHorizontal: 8 },

    girdiSatiri: {
      flexDirection: 'row', alignItems: 'center', padding: bosluk.sm,
      borderTopWidth: 1, borderTopColor: renkler.cizgi, backgroundColor: renkler.yuzey,
    },
    ekleButon: { paddingHorizontal: 6, paddingBottom: 10 },
    ekleButonMetni: { fontSize: 22 },
    mesajGirdi: {
      flex: 1, backgroundColor: renkler.arkaplan, color: renkler.metin, borderWidth: 1, borderColor: renkler.cizgi,
      borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, marginHorizontal: bosluk.xs,
    },
    gonderButon: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: renkler.kendiBalon,
      justifyContent: 'center', alignItems: 'center',
    },
    gonderButonPasif: { opacity: 0.4 },
    gonderButonMetni: { color: renkler.kendiBalonMetin, fontWeight: '700', fontSize: 18 },

    engellendiBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: bosluk.md, backgroundColor: renkler.yuzey, borderTopWidth: 1, borderTopColor: renkler.cizgi,
    },
    engellendiMetin: { color: renkler.hata, fontSize: 14, fontWeight: '600', flex: 1 },
    engelKaldirButon: {
      backgroundColor: renkler.arkaplan, borderWidth: 1, borderColor: renkler.cizgi,
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    },
    engelKaldirMetin: { color: renkler.metin, fontSize: 13, fontWeight: '600' },

    altModalArkaplan: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 16,
    },
    aksiyonKutu: {
      backgroundColor: renkler.yuzey,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: renkler.cizgi,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    aksiyonSatiri: { paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: renkler.cizgi },
    aksiyonMetni: { color: renkler.metin, fontSize: 13.5, fontWeight: '600' },

    kayitBari: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: renkler.arkaplan,
      borderRadius: 22,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#ff453a',
    },
    kayitNokta: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ff453a',
      marginRight: 8,
    },
    kayitSureMetin: {
      color: '#ff453a',
      fontSize: 14,
      fontWeight: '700',
      marginRight: 10,
      minWidth: 36,
    },
    kayitIptalMetin: {
      flex: 1,
      color: renkler.metinSoluk,
      fontSize: 12,
      textAlign: 'center',
    },
    kayitSilButon: {
      padding: 4,
    },
    kayitSilMetin: {
      fontSize: 18,
    },

    modalArkaplan: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalKutu: { backgroundColor: renkler.yuzey, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: bosluk.lg, paddingBottom: 40, maxHeight: '80%' },
    modalBaslik: { color: renkler.metin, fontSize: 18, fontWeight: '700', marginBottom: bosluk.md },
    girdi: {
      backgroundColor: renkler.arkaplan, color: renkler.metin, borderWidth: 1, borderColor: renkler.cizgi,
      borderRadius: 10, paddingHorizontal: bosluk.md, paddingVertical: 12, fontSize: 15, marginBottom: bosluk.md,
    },
    uyeSatiri: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    uyeAvatar: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: renkler.digerBalon, borderWidth: 1, borderColor: renkler.cizgi,
      justifyContent: 'center', alignItems: 'center', marginRight: bosluk.sm,
    },
    uyeAvatarMetin: { color: renkler.metin, fontWeight: '700', fontSize: 14 },
    uyeMetin: { color: renkler.metin, fontSize: 15, flex: 1 },
    uyeCikarMetni: { color: renkler.hata, fontSize: 13 },
    uyeEkleButon: { paddingVertical: 12, alignItems: 'center' },
    uyeEkleButonMetni: { color: renkler.vurgu, fontSize: 14, fontWeight: '700' },
    bosMetin: { color: renkler.metinSoluk, textAlign: 'center', marginVertical: bosluk.md },
    buton: { backgroundColor: renkler.kendiBalon, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    butonMetni: { color: renkler.kendiBalonMetin, fontWeight: '700', fontSize: 15 },
    ikincilButon: { paddingVertical: 14, alignItems: 'center', marginTop: bosluk.sm },
    ikincilButonMetni: { color: renkler.metinSoluk, fontSize: 14 },

    temaSatiri: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    temaOrnegi: { width: 24, height: 24, borderRadius: 12, marginRight: bosluk.sm, borderWidth: 1, borderColor: renkler.cizgi },

    galeriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    galeriHucre: { width: '32%', aspectRatio: 1, marginBottom: 4 },
    galeriHucreResim: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: renkler.arkaplan },
    galeriVideoKutu: { justifyContent: 'center', alignItems: 'center' },

    tamEkranArkaplan: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    tamEkranKapat: { position: 'absolute', right: 16, zIndex: 10, padding: 8 },
    tamEkranKapatMetni: { color: '#ffffff', fontSize: 24 },
    tamEkranResim: { width: '100%', height: '100%', resizeMode: 'contain' },
    tamEkranVideo: { width: '100%', height: '100%' },

    onizlemeResim: { width: '100%', height: 240, borderRadius: 10, marginBottom: bosluk.md, backgroundColor: renkler.arkaplan },
    onizlemeVideoKutu: {
      width: '100%', height: 160, borderRadius: 10, marginBottom: bosluk.md, backgroundColor: renkler.arkaplan,
      justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    tekGorunumSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: bosluk.md },
    satirMetin: { color: renkler.metin, fontSize: 15 },

    // Header
    headerAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: bosluk.sm },
    headerAvatarKutu: {
      width: 34, height: 34, borderRadius: 17, backgroundColor: renkler.digerBalon,
      borderWidth: 1, borderColor: renkler.cizgi, justifyContent: 'center', alignItems: 'center', marginRight: bosluk.sm,
    },
    headerAvatarMetin: { color: renkler.metin, fontWeight: '700', fontSize: 14 },
    headerBilgi: { flex: 1 },

    // Ust menu (3 nokta)
    ustMenuArkaplan: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
    ustMenuKutu: { position: 'absolute', width: 175 },

    // Mesaj Menusu (floating bubble menu)
    mesajMenuArkaplan: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    mesajMenuKutu: { position: 'absolute', width: 175 },

    // Onay Modalı (Custom dark confirmation)
    onayModalArkaplan: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    onayModalKutu: {
      backgroundColor: renkler.yuzey,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 320,
      borderWidth: 1,
      borderColor: renkler.cizgi,
    },
    onayModalBaslik: {
      color: renkler.metin,
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 8,
    },
    onayModalMesaj: {
      color: renkler.metinSoluk,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
    },
    onayModalButonlar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    onayModalIptal: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: renkler.arkaplan,
      borderWidth: 1,
      borderColor: renkler.cizgi,
    },
    onayModalIptalMetni: {
      color: renkler.metinSoluk,
      fontSize: 13.5,
      fontWeight: '600',
    },
    onayModalTamam: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: renkler.kendiBalon,
    },
    onayModalTamamMetni: {
      color: '#ffffff',
      fontSize: 13.5,
      fontWeight: '700',
    },

    kayitGonderButon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: renkler.kendiBalon,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 6,
    },
    kayitGonderIkon: {
      color: renkler.kendiBalonMetin,
      fontSize: 16,
      fontWeight: '700',
    },

    // Input ikonlari
    ikonButon: { paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
    ikonButonAktif: { backgroundColor: renkler.kendiBalon + '33', borderRadius: 20 },
    sagIkonlar: { flexDirection: 'row', alignItems: 'center' },

    // Kamera ikonu (custom)
    kameraIkon: { width: 24, height: 20, justifyContent: 'center', alignItems: 'center' },
    kameraGovde: {
      width: 22, height: 16, borderRadius: 4, borderWidth: 2,
      borderColor: renkler.metinSoluk, backgroundColor: 'transparent',
    },
    kameraLens: {
      position: 'absolute', width: 8, height: 8, borderRadius: 4,
      backgroundColor: renkler.metinSoluk,
    },

    // Galeri ikonu (custom)
    galeriIkon: { width: 22, height: 22, justifyContent: 'flex-end' },
    galeriKare: {
      position: 'absolute', top: 0, left: 0, width: 14, height: 14,
      borderRadius: 3, borderWidth: 2, borderColor: renkler.metinSoluk,
    },
    galeriKare2: {
      position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
      borderRadius: 3, borderWidth: 2, borderColor: renkler.metinSoluk,
    },

    // Mikrofon ikonu (custom - modern capsule + cradle)
    mikrofonIkon: { width: 22, height: 26, alignItems: 'center', justifyContent: 'center' },
    mikrofonKapsul: {
      width: 9, height: 13, borderRadius: 5,
      backgroundColor: renkler.metinSoluk,
    },
    mikrofonYay: {
      width: 15, height: 8,
      borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
      borderWidth: 1.8, borderTopWidth: 0, borderColor: renkler.metinSoluk,
      marginTop: -5,
    },
    mikrofonSap: {
      width: 2, height: 4,
      backgroundColor: renkler.metinSoluk,
    },
    mikrofonTaban: {
      width: 10, height: 2, borderRadius: 1,
      backgroundColor: renkler.metinSoluk,
    },

    // Gönder butonu yeni stili
    gonderButonYuvarlak: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: renkler.kendiBalon,
      justifyContent: 'center', alignItems: 'center',
    },

    // Ses oynatıcı stili
    sesOynaticiKutu: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      minWidth: 220,
    },
    sesOynatButon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: renkler.yuzey,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: bosluk.md,
    },
    sesOynatIkon: {
      color: renkler.metin,
      fontSize: 16,
    },
    sesDalgaAlani: {
      flex: 1,
      justifyContent: 'center',
    },
    sesCubuguDokunmaAlani: {
      height: 28,
      justifyContent: 'center',
      position: 'relative',
    },
    sesCubuguArkaplan: {
      height: 10,
      borderRadius: 5,
      backgroundColor: 'rgba(255,255,255,0.22)',
      overflow: 'hidden',
    },
    sesCubuguDolu: {
      height: '100%',
      backgroundColor: renkler.vurgu || '#00a8ff',
      borderRadius: 5,
    },
    sesScrubberNokta: {
      position: 'absolute',
      top: 7,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.35,
      shadowRadius: 2,
      elevation: 3,
    },
    sesSureMetni: {
      color: renkler.metinSoluk,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 6,
    },

    // Mention kutusu stili
    mentionKutusu: {
      backgroundColor: renkler.yuzey,
      borderTopWidth: 1,
      borderTopColor: renkler.cizgi,
      maxHeight: 140,
    },
    mentionSatiri: {
      paddingHorizontal: bosluk.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: renkler.cizgi,
    },
    mentionMetin: {
      color: renkler.metin,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

const motifStilleri = StyleSheet.create({
  desenKapsayici: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
    opacity: 0.16,
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  desenSatir: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 12,
  },
  desenHucre: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hello Kitty
  kittyKutu: {
    width: 44,
    height: 38,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kittyKulak: {
    position: 'absolute',
    top: 0,
    width: 13,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ff80ab',
  },
  kittyKulakSol: {
    left: 4,
    transform: [{ rotate: '-25deg' }],
  },
  kittyKulakSag: {
    right: 4,
    transform: [{ rotate: '25deg' }],
  },
  kittyKafa: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ff80ab',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kittyGoz: {
    position: 'absolute',
    top: 13,
    width: 4,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#333333',
  },
  kittyBurun: {
    position: 'absolute',
    top: 16,
    width: 5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#ffd600',
  },
  kittyBiyik: {
    position: 'absolute',
    width: 7,
    height: 1.2,
    backgroundColor: '#444444',
    borderRadius: 1,
  },
  kittyFiyonkKutu: {
    position: 'absolute',
    top: 2,
    left: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  kittyFiyonkKanat: {
    width: 9,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff1744',
  },
  kittyFiyonkOrta: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
    marginHorizontal: -2,
    zIndex: 6,
  },

  // Spider-Man
  spiderKutu: {
    width: 40,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  spiderMaske: {
    width: 36,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#d32f2f',
    borderWidth: 1.8,
    borderColor: '#ffffff',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  spiderDikeyCizgi: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  spiderYatayCizgi: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  spiderAgDaire: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  spiderGozDis: {
    position: 'absolute',
    top: 14,
    width: 12,
    height: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spiderGozSol: {
    left: 4,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopLeftRadius: 3,
    borderBottomRightRadius: 3,
    transform: [{ rotate: '12deg' }],
  },
  spiderGozSag: {
    right: 4,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 3,
    transform: [{ rotate: '-12deg' }],
  },
  spiderGozIc: {
    width: 9,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },

  // Kuromi
  kuromiKutu: {
    width: 44,
    height: 46,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kuromiKulak: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#4a148c',
    borderWidth: 1.2,
    borderColor: '#ba68c8',
    alignItems: 'center',
  },
  kuromiKulakSol: {
    left: 4,
    transform: [{ rotate: '-22deg' }],
  },
  kuromiKulakSag: {
    right: 4,
    transform: [{ rotate: '22deg' }],
  },
  kuromiKulakTopu: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ea80fc',
    marginTop: -3,
  },
  kuromiKafa: {
    position: 'absolute',
    bottom: 0,
    width: 42,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4a148c',
    borderWidth: 1.5,
    borderColor: '#ba68c8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kuromiKuruKafa: {
    position: 'absolute',
    top: 4,
    width: 12,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#ea80fc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kuromiKuruGoz: {
    position: 'absolute',
    top: 4,
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#4a148c',
  },
  kuromiGoz: {
    position: 'absolute',
    top: 17,
    width: 5,
    height: 7,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },

  // ------------------------------------
  // Merkez Sahne Kapsayıcısı (Ekran Ortası)
  // ------------------------------------
  merkezKapsayici: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
    opacity: 0.28,
  },

  // ------------------------------------
  // Spider-Man V2 (Ağda Asılı)
  // ------------------------------------
  orumcekAgiKutu: {
    position: 'absolute',
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agHalka: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  agTel: {
    position: 'absolute',
    width: 250,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  asiliAgIpi: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    height: '52%',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  asiliSpiderman: {
    width: 48,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 35,
  },
  asiliBacakSol: {
    position: 'absolute',
    top: 0,
    left: 8,
    width: 8,
    height: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#0d47a1',
    transform: [{ rotate: '-25deg' }],
  },
  asiliBacakSag: {
    position: 'absolute',
    top: 0,
    right: 8,
    width: 8,
    height: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#0d47a1',
    transform: [{ rotate: '25deg' }],
  },
  asiliGovde: {
    position: 'absolute',
    top: 13,
    width: 26,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  asiliMaviKemer: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 7,
    backgroundColor: '#0d47a1',
    borderRadius: 3,
  },
  asiliKolSol: {
    position: 'absolute',
    left: -6,
    top: 2,
    width: 7,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#d32f2f',
    transform: [{ rotate: '-35deg' }],
  },
  asiliKolSag: {
    position: 'absolute',
    right: -6,
    top: 2,
    width: 7,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#d32f2f',
    transform: [{ rotate: '35deg' }],
  },
  asiliOrumcekLogo: {
    width: 5,
    height: 6,
    backgroundColor: '#000000',
    borderRadius: 2,
    zIndex: 4,
  },
  asiliMaske: {
    position: 'absolute',
    bottom: 2,
    width: 30,
    height: 32,
    borderRadius: 15,
    backgroundColor: '#d32f2f',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  asiliMaskeDikey: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  asiliMaskeYatay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  asiliGozDis: {
    position: 'absolute',
    bottom: 8,
    width: 10,
    height: 13,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  asiliGozSol: {
    left: 3,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    transform: [{ rotate: '-12deg' }],
  },
  asiliGozSag: {
    right: 3,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    transform: [{ rotate: '12deg' }],
  },
  asiliGozIc: {
    width: 7,
    height: 10,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },

  // ------------------------------------
  // Hello Kitty V2 (Kawaii Deluxe)
  // ------------------------------------
  kittyV2Kutu: {
    width: 48,
    height: 42,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kittyV2Kulak: {
    position: 'absolute',
    top: 0,
    width: 15,
    height: 15,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1.8,
    borderColor: '#ff4081',
  },
  kittyV2KulakSol: {
    left: 4,
    transform: [{ rotate: '-25deg' }],
  },
  kittyV2KulakSag: {
    right: 4,
    transform: [{ rotate: '25deg' }],
  },
  kittyV2Kafa: {
    position: 'absolute',
    bottom: 0,
    width: 48,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1.8,
    borderColor: '#ff4081',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kittyV2Goz: {
    position: 'absolute',
    top: 14,
    width: 4.5,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#222222',
  },
  kittyV2Allik: {
    position: 'absolute',
    top: 18,
    width: 6,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 64, 129, 0.45)',
  },
  kittyV2Burun: {
    position: 'absolute',
    top: 17,
    width: 5.5,
    height: 4,
    borderRadius: 2.5,
    backgroundColor: '#ffd600',
  },
  kittyV2Biyik: {
    position: 'absolute',
    width: 8,
    height: 1.3,
    backgroundColor: '#333333',
    borderRadius: 1,
  },
  kittyV2Fiyonk: {
    position: 'absolute',
    top: 1,
    left: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 6,
  },
  kittyV2FiyonkKanat: {
    width: 11,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff1744',
    borderWidth: 1,
    borderColor: '#b71c1c',
  },
  kittyV2FiyonkDugum: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginHorizontal: -2.5,
    zIndex: 7,
    borderWidth: 1,
    borderColor: '#ff1744',
  },

  // ------------------------------------
  // Kuromi V2 (Gothic Deluxe)
  // ------------------------------------
  kuromiV2Kutu: {
    width: 48,
    height: 50,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kuromiV2Kulak: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 22,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#210833',
    borderWidth: 1.5,
    borderColor: '#ba68c8',
    alignItems: 'center',
  },
  kuromiV2KulakSol: {
    left: 3,
    transform: [{ rotate: '-25deg' }],
  },
  kuromiV2KulakSag: {
    right: 3,
    transform: [{ rotate: '25deg' }],
  },
  kuromiV2Ponpon: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ff4081',
    marginTop: -3.5,
  },
  kuromiV2Kafa: {
    position: 'absolute',
    bottom: 0,
    width: 46,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#210833',
    borderWidth: 1.8,
    borderColor: '#ba68c8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kuromiV2KuruKafa: {
    position: 'absolute',
    top: 4,
    width: 14,
    height: 12,
    borderRadius: 7,
    backgroundColor: '#ff4081',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kuromiV2KuruGoz: {
    position: 'absolute',
    top: 4,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#210833',
  },
  kuromiV2Goz: {
    position: 'absolute',
    top: 17,
    width: 6,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 1,
  },
  kuromiV2GozIsik: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#d500f9',
  },
  kuromiV2Yanak: {
    position: 'absolute',
    top: 23,
    width: 5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'rgba(213, 0, 249, 0.4)',
  },

  // ------------------------------------
  // Batman (Tekrarlayan Bat-Symbol)
  // ------------------------------------
  batmanMotifKutu: {
    width: 48,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batmanMotifElips: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffd600',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batmanMotifGovde: {
    width: 32,
    height: 16,
    backgroundColor: '#0a0c10',
    borderRadius: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batmanMotifKulak: {
    position: 'absolute',
    top: -4,
    width: 3,
    height: 6,
    backgroundColor: '#0a0c10',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  batmanMotifKanat: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#ffd600',
  },
  batmanMotifKanatSol: {
    top: -5,
    left: 2,
  },
  batmanMotifKanatSag: {
    top: -5,
    right: 2,
  },
  batmanMotifKuyruk: {
    position: 'absolute',
    bottom: -3,
    width: 6,
    height: 4,
    backgroundColor: '#0a0c10',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  // ------------------------------------
  // Rick and Morty (Tekrarlayan Portal)
  // ------------------------------------
  portalMotifKutu: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  portalMotifDis: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: 'rgba(0, 230, 118, 0.7)',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portalMotifOrta: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#76ff03',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portalMotifIc: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#b2ff59',
  },
  portalKivilcimMini: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00e676',
  },

  // ------------------------------------
  // SpongeBob (Tekrarlayan SüngerBob Yüzü)
  // ------------------------------------
  spongeMotifKutu: {
    width: 40,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spongeGovde: {
    width: 36,
    height: 32,
    backgroundColor: '#ffeb3b',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#f57f17',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spongeGoz: {
    position: 'absolute',
    top: 4,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spongeGozMavi: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00b0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spongeGozBebek: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
  spongeBurun: {
    position: 'absolute',
    top: 13,
    width: 4,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#fbc02d',
    borderWidth: 0.8,
    borderColor: '#f57f17',
  },
  spongeAgiz: {
    position: 'absolute',
    bottom: 3,
    width: 18,
    height: 8,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    borderWidth: 1,
    borderColor: '#b71c1c',
    backgroundColor: '#d32f2f',
    overflow: 'hidden',
  },
  spongeDis: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 4,
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#b71c1c',
  },
  spongeGomlek: {
    width: 36,
    height: 9,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#5d4037',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  spongeKravat: {
    width: 6,
    height: 8,
    backgroundColor: '#d50000',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },

  // ------------------------------------
  // Naruto (Tekrarlayan Akatsuki Bulutu)
  // ------------------------------------
  akatsukiKutu: {
    width: 48,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  akatsukiDisBulut: {
    width: 44,
    height: 28,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  akatsukiPufSol: {
    position: 'absolute',
    left: 2,
    top: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d50000',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  akatsukiPufOrta: {
    position: 'absolute',
    left: 12,
    top: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#d50000',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 2,
  },
  akatsukiPufSag: {
    position: 'absolute',
    right: 2,
    top: 7,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#d50000',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  akatsukiGovde: {
    position: 'absolute',
    bottom: 2,
    width: 36,
    height: 14,
    backgroundColor: '#d50000',
    borderRadius: 7,
    zIndex: 3,
  },
  akatsukiSpiral: {
    position: 'absolute',
    top: 8,
    left: 17,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.2,
    borderColor: '#ffffff',
    borderTopColor: 'transparent',
    zIndex: 4,
    transform: [{ rotate: '45deg' }],
  },
});
