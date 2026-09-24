import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { bosluk } from '../theme';
import { useTema } from '../lib/temaBaglami';
import {
  kullanicilariGetir,
  gruplariGetir,
  grupOlustur,
  medyaAdresi,
  medyaYukle,
  dosyaYukleDirekt,
  hikayeleriGetir,
  hikayeEkle,
  hikayeEkleUrl,
  hikayeGorulduBildir,
  hikayeSil,
  profilGetir,
  profilGuncelle,
  kullaniciAdiDegistir,
  dogumTarihiGuncelle,
  sifreDegistir,
  kullaniciEngeliKaldir,
  ayarGuncelle,
  hikayeBegen,
} from '../lib/api';
import { sonGorulmeMetni } from '../lib/format';
import { useSoket, kisiAnahtari, grupAnahtari } from '../lib/soketBaglami';
import { kameraIleCek, medyaSec, medyayiBase64Yap } from '../lib/medya';
import OzelKameraModal from '../components/OzelKameraModal';
import OzelMedyaDuzenleyici from '../components/OzelMedyaDuzenleyici';
import OzelTarihSeciciModal from '../components/OzelTarihSeciciModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK } = Dimensions.get('window');

function zamanOnce(ts) {
  const fark = Math.max(0, Date.now() - ts);
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return 'Az önce';
  if (dk < 60) return `${dk} dk önce`;
  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} sa önce`;
  const gun = Math.floor(saat / 24);
  return `${gun} gün önce`;
}

function TabSohbetIkon({ aktif, renkler }) {
  const renk = aktif ? (renkler.vurgu || '#00a8ff') : renkler.metinSoluk;
  return (
    <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 19,
          height: 15,
          borderRadius: 5,
          borderWidth: 1.8,
          borderColor: renk,
          backgroundColor: aktif ? renk + '22' : 'transparent',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 2,
          left: 3,
          width: 4.5,
          height: 4.5,
          backgroundColor: renk,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

function TabKesfetIkon({ aktif, renkler }) {
  const renk = aktif ? (renkler.vurgu || '#00a8ff') : renkler.metinSoluk;
  return (
    <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 19,
          height: 19,
          borderRadius: 9.5,
          borderWidth: 1.8,
          borderColor: renk,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: aktif ? renk + '22' : 'transparent',
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            backgroundColor: renk,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  );
}

function PusulaVektorIkon({ boyut = 24, renk = '#00a8ff' }) {
  const cizgiKalinlik = Math.max(1.8, Math.round(boyut * 0.08));
  const elmasBoyut = Math.round(boyut * 0.44);
  return (
    <View
      style={{
        width: boyut,
        height: boyut,
        borderRadius: boyut / 2,
        borderWidth: cizgiKalinlik,
        borderColor: renk,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ position: 'absolute', top: 1, width: cizgiKalinlik, height: Math.max(3, Math.round(boyut * 0.12)), backgroundColor: renk, borderRadius: 1 }} />
      <View style={{ position: 'absolute', bottom: 1, width: cizgiKalinlik, height: Math.max(3, Math.round(boyut * 0.12)), backgroundColor: renk, borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: 1, width: Math.max(3, Math.round(boyut * 0.12)), height: cizgiKalinlik, backgroundColor: renk, borderRadius: 1 }} />
      <View style={{ position: 'absolute', right: 1, width: Math.max(3, Math.round(boyut * 0.12)), height: cizgiKalinlik, backgroundColor: renk, borderRadius: 1 }} />

      <View
        style={{
          width: elmasBoyut,
          height: elmasBoyut,
          transform: [{ rotate: '45deg' }],
          overflow: 'hidden',
          borderRadius: 2,
          borderWidth: 1.2,
          borderColor: renk,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: '50%',
            backgroundColor: renk,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: Math.max(3, Math.round(boyut * 0.14)),
          height: Math.max(3, Math.round(boyut * 0.14)),
          borderRadius: 99,
          backgroundColor: '#fff',
        }}
      />
    </View>
  );
}

function TabHikayeIkon({ aktif, renkler }) {
  const renk = aktif ? (renkler.vurgu || '#00a8ff') : renkler.metinSoluk;
  return (
    <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 19,
          height: 19,
          borderRadius: 6,
          borderWidth: 1.8,
          borderColor: renk,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: aktif ? renk + '22' : 'transparent',
        }}
      >
        <View style={{ width: 9, height: 1.8, backgroundColor: renk, position: 'absolute' }} />
        <View style={{ width: 1.8, height: 9, backgroundColor: renk, position: 'absolute' }} />
      </View>
    </View>
  );
}

function TabProfilIkon({ aktif, renkler }) {
  const renk = aktif ? (renkler.vurgu || '#00a8ff') : renkler.metinSoluk;
  return (
    <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          borderWidth: 1.8,
          borderColor: renk,
          marginBottom: 2,
          backgroundColor: aktif ? renk : 'transparent',
        }}
      />
      <View
        style={{
          width: 16,
          height: 7,
          borderTopLeftRadius: 7,
          borderTopRightRadius: 7,
          borderWidth: 1.8,
          borderBottomWidth: 0,
          borderColor: renk,
          backgroundColor: aktif ? renk + '22' : 'transparent',
        }}
      />
    </View>
  );
}

export default function AnaSayfaEkrani({
  sunucuAdres,
  kullanici,
  sifre,
  oturum,
  onAyarGuncellendi,
  onCikis,
  onSohbetAc,
  onAyarlarAc,
}) {
  const { renkler, koyuMu, toggleTema } = useTema();
  const styles = useMemo(() => olusturStiller(renkler), [renkler]);
  const {
    baglandi,
    okunmamisSayilar,
    kullaniciDurumlari,
    grupGuncellemeSayaci,
    sonMesajZamanlari,
    sonMesajlar,
    mesajDeposu,
    yaziyorlar,
    mesajGonder,
    gizlenenSohbetler,
    sohbetTemizlemeZamanlari,
    sonZamanlariGuncelle,
    okunmamislariGuncelle,
    gruplar,
    gruplariAyarla,
    grupEkle,
    grupBilgileri,
  } = useSoket();

  // 4 Bottom Tabs: 'sohbetler' | 'kesfet' | 'hikayeEkle' | 'profil'
  const [aktifTab, setAktifTab] = useState('sohbetler');

  // Sohbetler verisi
  const [sohbetFiltresi, setSohbetFiltresi] = useState('hepsi'); // 'hepsi' | 'kisiler' | 'gruplar'
  const [kullanicilar, setKullanicilar] = useState([]);
  const [dogumTarihiGizli, setDogumTarihiGizli] = useState(!!oturum?.dogumTarihiGizli);
  const [okunduBilgisiGizli, setOkunduBilgisiGizli] = useState(!!oturum?.okunduBilgisiGizli);
  const [sonGorulmeGizli, setSonGorulmeGizli] = useState(!!oturum?.sonGorulmeGizli);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [aramaMetni, setAramaMetni] = useState('');

  // Kişisel sohbet listesini başlangıçta önbellekten yükle (çevrimdışıyken bile görünsün)
  useEffect(() => {
    (async () => {
      try {
        const onbellekAnahtari = `@textly_kisiler_cache_${kullanici}`;
        const ham = await AsyncStorage.getItem(onbellekAnahtari);
        if (ham) {
          const liste = JSON.parse(ham);
          if (Array.isArray(liste) && liste.length > 0) {
            setKullanicilar(liste);
          }
        }
      } catch {}
    })();
  }, [kullanici]);

  // Büyük Profil / Medya Fotoğrafı Modal State
  const [buyukFotoUrl, setBuyukFotoUrl] = useState(null);

  // Grup Oluşturma Modalı
  const [grupModalAcik, setGrupModalAcik] = useState(false);
  const [grupIsim, setGrupIsim] = useState('');
  const [seciliUyeler, setSeciliUyeler] = useState([]);
  const [grupKaydediliyor, setGrupKaydediliyor] = useState(false);

  // Hikayeler
  const [aktifHikayeler, setAktifHikayeler] = useState([]);
  const [kesfetHikayeler, setKesfetHikayeler] = useState([]);
  const [hikayeYukleniyor, setHikayeYukleniyor] = useState(false);
  const [aktifHikayeListesi, setAktifHikayeListesi] = useState([]);
  const [aktifHikayeIndex, setAktifHikayeIndex] = useState(0);
  const [seciliHikaye, setSeciliHikaye] = useState(null);
  const [goruntuleyenlerModalAcik, setGoruntuleyenlerModalAcik] = useState(false);
  const [silinecekHikayeId, setSilinecekHikayeId] = useState(null);
  const [aktifVideoUri, setAktifVideoUri] = useState(null);
  const [videoYukleniyor, setVideoYukleniyor] = useState(false);
  const [hikayeResimYukleniyor, setHikayeResimYukleniyor] = useState(false);
  const hikayeIlerleme = useRef(new Animated.Value(0)).current;

  // Profil Fotoğrafı Modalları
  const [profilFotoSecModalAcik, setProfilFotoSecModalAcik] = useState(false);
  const [profilKameraAcik, setProfilKameraAcik] = useState(false);

  // Şifre ve Kullanıcı Adı Değişti Bilgi Modalları
  const [sifreDegistiModalAcik, setSifreDegistiModalAcik] = useState(false);
  const [kullaniciAdiDegistiModalAcik, setKullaniciAdiDegistiModalAcik] = useState(false);

  // Hikaye Ekleme Tab'i state
  const [yeniHikayeMedya, setYeniHikayeMedya] = useState(null);
  const [yeniHikayeMetin, setYeniHikayeMetin] = useState('');
  const [hikayePaylasiliyor, setHikayePaylasiliyor] = useState(false);
  const [hikayeKameraModalAcik, setHikayeKameraModalAcik] = useState(false);
  const [hizliKameraHedef, setHizliKameraHedef] = useState(null);

  // Profil & Ayarlar Tab'i state
  const [benimProfil, setBenimProfil] = useState({
    biyografi: oturum?.biyografi || '',
    dogumTarihi: oturum?.dogumTarihi || '',
    profilResimUrl: oturum?.profilResimUrl || null,
  });
  const [kullaniciAdiModal, setKullaniciAdiModal] = useState(false);
  const [yeniKullaniciAdi, setYeniKullaniciAdi] = useState('');
  const [biyografiModal, setBiyografiModal] = useState(false);
  const [yeniBiyografi, setYeniBiyografi] = useState('');
  const [dogumTarihiModal, setDogumTarihiModal] = useState(false);
  const [yeniDogumTarihi, setYeniDogumTarihi] = useState('');
  const [sifreModal, setSifreModal] = useState(false);
  const [yeniSifre, setYeniSifre] = useState('');
  const [engellenenlerModal, setEngellenenlerModal] = useState(false);
  const [cikisOnayModalAcik, setCikisOnayModalAcik] = useState(false);

  // Profil verisini getir
  const profilYukle = useCallback(async () => {
    const res = await profilGetir(sunucuAdres, kullanici, sifre, kullanici);
    if (res.tamam) {
      setBenimProfil({
        biyografi: res.biyografi || '',
        dogumTarihi: res.dogumTarihi || '',
        profilResimUrl: res.profilResimUrl || null,
      });
      if (onAyarGuncellendi) {
        onAyarGuncellendi({
          biyografi: res.biyografi,
          dogumTarihi: res.dogumTarihi,
          profilResimUrl: res.profilResimUrl,
        });
      }
    }
  }, [sunucuAdres, kullanici, sifre, onAyarGuncellendi]);

  // Sohbetleri ve kullanıcıları yükle
  const veriyiYukle = useCallback(async () => {
    try {
      const sonuclar = await Promise.allSettled([
        kullanicilariGetir(sunucuAdres, kullanici, sifre),
        gruplariGetir(sunucuAdres, kullanici, sifre),
      ]);
      const kSonuc = sonuclar[0].status === 'fulfilled' ? sonuclar[0].value : null;
      const gSonuc = sonuclar[1].status === 'fulfilled' ? sonuclar[1].value : null;

      const harita = {};
      const okunmamisHarita = {};
      if (kSonuc && kSonuc.tamam && Array.isArray(kSonuc.liste)) {
        setKullanicilar(kSonuc.liste);
        // Önbelleğe kaydet — çevrimdışıyken de göstermek için
        AsyncStorage.setItem(`@textly_kisiler_cache_${kullanici}`, JSON.stringify(kSonuc.liste)).catch(() => {});
        const yeniDurumlar = {};
        kSonuc.liste.forEach((k) => {
          if (!k || !k.kullanici) return;
          yeniDurumlar[k.kullanici] = {
            cevrimici: !!k.cevrimici,
            sonGorulme: k.sonGorulme || null,
          };
          if (k.sonMesajZamani) {
            harita[kisiAnahtari(k.kullanici)] = k.sonMesajZamani;
          }
          if (typeof k.okunmamisSayisi === 'number') {
            okunmamisHarita[kisiAnahtari(k.kullanici)] = k.okunmamisSayisi;
          }
        });
        setKullaniciDurumlari((eski) => ({ ...eski, ...yeniDurumlar }));
      }
      if (gSonuc && gSonuc.tamam && Array.isArray(gSonuc.liste)) {
        gruplariAyarla(gSonuc.liste);
        gSonuc.liste.forEach((g) => {
          if (!g || !g.id) return;
          if (g.sonMesajZamani) {
            harita[grupAnahtari(g.id)] = g.sonMesajZamani;
          }
          if (typeof g.okunmamisSayisi === 'number') {
            okunmamisHarita[grupAnahtari(g.id)] = g.okunmamisSayisi;
          }
        });
      }
      if (Object.keys(harita).length > 0 && sonZamanlariGuncelle) {
        sonZamanlariGuncelle(harita);
      }
      if (Object.keys(okunmamisHarita).length > 0 && okunmamislariGuncelle) {
        okunmamislariGuncelle(okunmamisHarita);
      }
    } catch (e) {
      console.warn('[veriyiYukle] Hata:', e);
    }
  }, [sunucuAdres, kullanici, sifre, sonZamanlariGuncelle, okunmamislariGuncelle, gruplariAyarla]);

  // Video hikayelerini yerel önbelleğe alma (Gecikmesiz / Anında başlatma)
  const videoOnbellekHaritasi = useRef(new Map()).current;

  const videoOnbellekYoluAl = useCallback(async (url) => {
    if (!url || typeof url !== 'string') return url;
    try {
      const temizIsim = url.split('/').pop().split('?')[0];
      const yerelYol = `${FileSystem.cacheDirectory}story_vid_${temizIsim}`;

      if (videoOnbellekHaritasi.has(url)) {
        return videoOnbellekHaritasi.get(url);
      }

      const info = await FileSystem.getInfoAsync(yerelYol).catch(() => null);
      if (info && info.exists && info.size > 0) {
        videoOnbellekHaritasi.set(url, yerelYol);
        return yerelYol;
      }

      // Arka planda indir (çağrıyı engellemez)
      FileSystem.downloadAsync(url, yerelYol)
        .then((res) => {
          if (res && res.uri) {
            videoOnbellekHaritasi.set(url, res.uri);
          }
        })
        .catch(() => {});
    } catch (e) {}
    return url;
  }, [videoOnbellekHaritasi]);

  // Hikayeleri getir (24 saatlik ve 30 günlük Keşfet)
  const hikayeleriYukle = useCallback(async () => {
    try {
      const [h24, h30] = await Promise.all([
        hikayeleriGetir(sunucuAdres, kullanici, sifre, 'aktif'),
        hikayeleriGetir(sunucuAdres, kullanici, sifre, 'kesfet'),
      ]);
      if (h24 && h24.tamam && Array.isArray(h24.liste)) {
        const liste = h24.liste;
        setAktifHikayeler(liste);
        // ÖN YÜKLEME: 24 saatlik tüm aktif hikayeleri (resim ve video) ve profil fotoğraflarını arka planda önden indir
        liste.forEach((h) => {
          if (h && h.medyaUrl) {
            const tamUrl = medyaAdresi(sunucuAdres, kullanici, sifre, h.medyaUrl);
            if (h.medyaTuru === 'video') {
              videoOnbellekYoluAl(tamUrl);
            } else {
              Image.prefetch(tamUrl).catch(() => {});
            }
          }
          if (h && h.profilResimUrl) {
            const pUrl = medyaAdresi(sunucuAdres, kullanici, sifre, h.profilResimUrl);
            Image.prefetch(pUrl).catch(() => {});
          }
        });
      }
      if (h30 && h30.tamam && Array.isArray(h30.liste)) {
        setKesfetHikayeler(h30.liste);
        // Keşfet hikayelerinin ilk 15 görselini de önden yükle
        h30.liste.slice(0, 15).forEach((h) => {
          if (h && h.medyaUrl && h.medyaTuru !== 'video') {
            const tamUrl = medyaAdresi(sunucuAdres, kullanici, sifre, h.medyaUrl);
            Image.prefetch(tamUrl).catch(() => {});
          }
        });
      }
    } catch (e) {
      console.warn('[hikayeleriYukle] Hata:', e);
    }
  }, [sunucuAdres, kullanici, sifre, videoOnbellekYoluAl]);

  useEffect(() => {
    veriyiYukle();
    hikayeleriYukle();
    profilYukle();
  }, [veriyiYukle, hikayeleriYukle, profilYukle, grupGuncellemeSayaci]);

  useEffect(() => {
    const altAbonelik = AppState.addEventListener('change', (durum) => {
      if (durum === 'active') {
        veriyiYukle();
        hikayeleriYukle();
      }
    });
    return () => {
      altAbonelik.remove();
    };
  }, [veriyiYukle, hikayeleriYukle]);

  async function yenile() {
    if (yenileniyor) return;
    setYenileniyor(true);
    // Asla sonsuza kadar dönmemesi için 7 saniyelik kesin emniyet zamanlayıcısı
    const emniyetTimer = setTimeout(() => {
      setYenileniyor(false);
    }, 7000);
    try {
      await Promise.all([veriyiYukle(), hikayeleriYukle(), profilYukle()]);
    } catch (e) {
      console.warn('[yenile] Hata:', e);
    } finally {
      clearTimeout(emniyetTimer);
      setYenileniyor(false);
    }
  }

  // Toplam okunmamış mesaj sayısı
  const toplamOkunmamis = useMemo(() => {
    return Object.values(okunmamisSayilar).reduce((t, n) => t + (n || 0), 0);
  }, [okunmamisSayilar]);

  // Hikaye Kapatma
  function hikayeKapat() {
    setGoruntuleyenlerModalAcik(false);
    setSeciliHikaye(null);
    setAktifHikayeListesi([]);
    setAktifHikayeIndex(0);
  }

  // Sonraki hikayeye geç (veya bitince kapat)
  function sonrakiHikayeyeGec() {
    if (aktifHikayeIndex < aktifHikayeListesi.length - 1) {
      const sonraki = aktifHikayeIndex + 1;
      setAktifHikayeIndex(sonraki);
      setSeciliHikaye(aktifHikayeListesi[sonraki]);
    } else {
      hikayeKapat();
    }
  }

  // Önceki hikayeye dön
  function oncekiHikayeyeGec() {
    if (aktifHikayeIndex > 0) {
      const onceki = aktifHikayeIndex - 1;
      setAktifHikayeIndex(onceki);
      setSeciliHikaye(aktifHikayeListesi[onceki]);
    } else {
      hikayeIlerleme.setValue(0);
    }
  }

  // Hikaye listesini oynatmaya başla
  function hikayeOynat(liste, baslangicIndex = 0) {
    if (!liste || liste.length === 0) return;
    const gecerliIndex = Math.min(Math.max(0, baslangicIndex), liste.length - 1);
    setAktifHikayeListesi(liste);
    setAktifHikayeIndex(gecerliIndex);
    setSeciliHikaye(liste[gecerliIndex]);
  }

  // Hikaye izleme animasyonu & otomatik sonraki hikayeye ilerleme
  useEffect(() => {
    if (!seciliHikaye || goruntuleyenlerModalAcik) return;
    hikayeIlerleme.setValue(0);

    // Başkasının hikayesiyse ve henüz görülmediyse sunucuya bildir
    if ((seciliHikaye.kullanici || '').toLowerCase() !== (kullanici || '').toLowerCase() && !seciliHikaye.goruldu) {
      hikayeGorulduBildir(sunucuAdres, kullanici, sifre, seciliHikaye.id);
      setAktifHikayeler((mevcut) =>
        mevcut.map((h) => (h.id === seciliHikaye.id ? { ...h, goruldu: true } : h))
      );
    }

    // Video hikayelerinde ilerleme video oynatım durumu (onPlaybackStatusUpdate) ile senkronize edilir
    if (seciliHikaye.medyaTuru === 'video') {
      return;
    }

    const animasyon = Animated.timing(hikayeIlerleme, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    });
    animasyon.start(({ finished }) => {
      if (finished) {
        sonrakiHikayeyeGec();
      }
    });

    return () => animasyon.stop();
  }, [seciliHikaye, aktifHikayeIndex, aktifHikayeListesi, sunucuAdres, kullanici, sifre, hikayeIlerleme, goruntuleyenlerModalAcik]);

  // Video hikayesi seçildiğinde yerel önbellekten veya uzaktan anında başlat
  useEffect(() => {
    if (!seciliHikaye || seciliHikaye.medyaTuru !== 'video') {
      setAktifVideoUri(null);
      setVideoYukleniyor(false);
      return;
    }

    setVideoYukleniyor(true);
    const uzakUrl = medyaAdresi(sunucuAdres, kullanici, sifre, seciliHikaye.medyaUrl);
    const temizIsim = uzakUrl.split('/').pop().split('?')[0];
    const yerelYol = `${FileSystem.cacheDirectory}story_vid_${temizIsim}`;

    FileSystem.getInfoAsync(yerelYol)
      .then((info) => {
        if (info && info.exists && info.size > 0) {
          setAktifVideoUri(yerelYol);
        } else {
          setAktifVideoUri(uzakUrl);
          FileSystem.downloadAsync(uzakUrl, yerelYol)
            .then((res) => {
              if (res && res.uri) {
                videoOnbellekHaritasi.set(uzakUrl, res.uri);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        setAktifVideoUri(uzakUrl);
      });

    // Sonraki hikayeyi de arka planda önden indir (resim veya video)
    if (aktifHikayeIndex < aktifHikayeListesi.length - 1) {
      const sonraki = aktifHikayeListesi[aktifHikayeIndex + 1];
      if (sonraki && sonraki.medyaUrl) {
        const sonrakiUrl = medyaAdresi(sunucuAdres, kullanici, sifre, sonraki.medyaUrl);
        if (sonraki.medyaTuru === 'video') {
          videoOnbellekYoluAl(sonrakiUrl);
        } else {
          Image.prefetch(sonrakiUrl).catch(() => {});
        }
      }
    }
  }, [seciliHikaye, aktifHikayeIndex, aktifHikayeListesi, sunucuAdres, kullanici, sifre, videoOnbellekYoluAl, videoOnbellekHaritasi]);

  // Hikaye Silme (Özel Temalı Onay Modalı)
  function hikayeSilOnayla(hikayeId) {
    setSilinecekHikayeId(hikayeId);
  }

  async function hikayeSilIcra(hikayeId) {
    setSilinecekHikayeId(null);
    const kalan = aktifHikayeListesi.filter((h) => h.id !== hikayeId);
    if (kalan.length === 0) {
      hikayeKapat();
    } else {
      const yeniIdx = Math.min(aktifHikayeIndex, kalan.length - 1);
      setAktifHikayeListesi(kalan);
      setAktifHikayeIndex(yeniIdx);
      setSeciliHikaye(kalan[yeniIdx]);
    }
    const res = await hikayeSil(sunucuAdres, kullanici, sifre, hikayeId);
    if (res.tamam) {
      hikayeleriYukle();
    }
  }

  // Kamera ikonu ile anlık çekip sohbete gitme (Android kamerası değil, özel stüdyo vizörü açar)
  function kameraylaHemenGonder(hedefTuru, hedef, baslik, uyeler, yonetici, yoneticiler) {
    setHizliKameraHedef({ hedefTuru, hedef, baslik, uyeler, yonetici, yoneticiler });
  }

  // Profil fotoğrafı güncelle (Özel Temalı Menü)
  function profilFotoDegistir() {
    setProfilFotoSecModalAcik(true);
  }

  async function profilKameraGonder(secim) {
    setProfilKameraAcik(false);
    if (secim && secim.base64) {
      const res = await profilGuncelle(sunucuAdres, kullanici, sifre, {
        base64: secim.base64,
        mimeTuru: secim.mimeTuru || 'image/jpeg',
      });
      if (res.tamam) {
        setBenimProfil((p) => ({ ...p, profilResimUrl: res.profilResimUrl }));
        if (onAyarGuncellendi) onAyarGuncellendi({ profilResimUrl: res.profilResimUrl });
      }
    }
  }

  async function profilGaleridenSec() {
    setProfilFotoSecModalAcik(false);
    const secim = await medyaSec();
    if (secim && secim.base64) {
      const res = await profilGuncelle(sunucuAdres, kullanici, sifre, {
        base64: secim.base64,
        mimeTuru: secim.mimeTuru || 'image/jpeg',
      });
      if (res.tamam) {
        setBenimProfil((p) => ({ ...p, profilResimUrl: res.profilResimUrl }));
        if (onAyarGuncellendi) onAyarGuncellendi({ profilResimUrl: res.profilResimUrl });
      }
    }
  }

  // Biyografi kaydet
  async function biyografiKaydet() {
    const res = await profilGuncelle(sunucuAdres, kullanici, sifre, { biyografi: yeniBiyografi });
    if (res.tamam) {
      setBenimProfil((p) => ({ ...p, biyografi: res.biyografi }));
      if (onAyarGuncellendi) onAyarGuncellendi({ biyografi: res.biyografi });
      setBiyografiModal(false);
    } else {
      Alert.alert('Hata', res.hata || 'Biyografi güncellenemedi');
    }
  }

  // Doğum tarihi kaydet
  async function dogumTarihiKaydet() {
    const res = await dogumTarihiGuncelle(sunucuAdres, kullanici, sifre, yeniDogumTarihi);
    if (res.tamam) {
      setBenimProfil((p) => ({ ...p, dogumTarihi: res.dogumTarihi }));
      if (onAyarGuncellendi) onAyarGuncellendi({ dogumTarihi: res.dogumTarihi });
      setDogumTarihiModal(false);
    } else {
      Alert.alert('Hata', res.hata || 'Doğum tarihi kaydedilemedi');
    }
  }

  // Kullanıcı adı kaydet
  async function kullaniciAdiKaydet() {
    const temiz = yeniKullaniciAdi.trim();
    if (temiz.length < 3) return Alert.alert('Hata', 'Kullanıcı adı en az 3 karakter olmalıdır.');
    const res = await kullaniciAdiDegistir(sunucuAdres, kullanici, sifre, temiz);
    if (res.tamam) {
      if (onAyarGuncellendi) onAyarGuncellendi({ kullanici: temiz });
      setKullaniciAdiModal(false);
      setKullaniciAdiDegistiModalAcik(true);
    } else {
      Alert.alert('Hata', res.hata || 'Kullanıcı adı değiştirilemedi');
    }
  }

  // Şifre kaydet
  async function sifreKaydet() {
    if (yeniSifre.length < 4) return Alert.alert('Hata', 'Yeni şifre en az 4 karakter olmalıdır.');
    const res = await sifreDegistir(sunucuAdres, kullanici, sifre, yeniSifre);
    if (res.tamam) {
      if (onAyarGuncellendi) onAyarGuncellendi({ sifre: yeniSifre });
      setSifreModal(false);
      setSifreDegistiModalAcik(true);
    } else {
      Alert.alert('Hata', res.hata || 'Şifre değiştirilemedi');
    }
  }

  async function dogumTarihiGizliToggle(deger) {
    setDogumTarihiGizli(deger);
    const res = await ayarGuncelle(sunucuAdres, kullanici, sifre, { dogumTarihiGizli: deger });
    if (res.tamam && onAyarGuncellendi) onAyarGuncellendi({ dogumTarihiGizli: deger });
  }

  async function okunduBilgisiGizliToggle(deger) {
    setOkunduBilgisiGizli(deger);
    const res = await ayarGuncelle(sunucuAdres, kullanici, sifre, { okunduBilgisiGizli: deger });
    if (res.tamam && onAyarGuncellendi) onAyarGuncellendi({ okunduBilgisiGizli: deger });
  }

  async function sonGorulmeGizliToggle(deger) {
    setSonGorulmeGizli(deger);
    const res = await ayarGuncelle(sunucuAdres, kullanici, sifre, { sonGorulmeGizli: deger });
    if (res.tamam && onAyarGuncellendi) onAyarGuncellendi({ sonGorulmeGizli: deger });
  }

  function hikayeKameraAc() {
    setHikayeKameraModalAcik(true);
  }

  async function hikayeGaleriAc() {
    const secim = await medyaSec();
    if (secim && (secim.uri || secim.base64)) {
      setYeniHikayeMedya(secim);
    }
  }

  // Hikaye Paylaş (Özel Stüdyo veya Tab 3)
  async function hikayePaylasSonuc({ secim, yaziKatmani, baslik, sigdir }) {
    const medyaKaynagi = secim || yeniHikayeMedya;
    if (!medyaKaynagi) return Alert.alert('Uyarı', 'Önce bir fotoğraf veya video seçin.');
    setHikayePaylasiliyor(true);

    const mimeTuru = medyaKaynagi.mimeTuru || (medyaKaynagi.tur === 'video' ? 'video/mp4' : 'image/jpeg');
    const medyaTuru = (medyaKaynagi.tur === 'video' || (mimeTuru && mimeTuru.startsWith('video'))) ? 'video' : 'foto';
    const hikayeMetinIcerik = baslik !== undefined ? baslik : yeniHikayeMetin;

    let res = null;

    // 1. Dosya URI'si varsa doğrudan streaming (uploadAsync) ile yükle - bellekte OOM olmaz, videolar ve fotolar için sorunsuz
    if (medyaKaynagi.uri) {
      const yukleSonuc = await dosyaYukleDirekt(sunucuAdres, kullanici, sifre, medyaKaynagi.uri, mimeTuru);
      if (yukleSonuc.tamam) {
        res = await hikayeEkleUrl(
          sunucuAdres,
          kullanici,
          sifre,
          yukleSonuc.url,
          medyaTuru,
          hikayeMetinIcerik,
          yaziKatmani || null,
          sigdir
        );
      } else {
        setHikayePaylasiliyor(false);
        return Alert.alert('Hata', yukleSonuc.hata || 'Dosya sunucuya yüklenemedi.');
      }
    } else {
      // 2. URI yoksa base64 ile yükle
      const base64Veri = await medyayiBase64Yap(medyaKaynagi);
      if (!base64Veri) {
        setHikayePaylasiliyor(false);
        return Alert.alert('Hata', 'Medya dosyası okunamadı.');
      }
      res = await hikayeEkle(
        sunucuAdres,
        kullanici,
        sifre,
        base64Veri,
        mimeTuru,
        hikayeMetinIcerik,
        yaziKatmani || null,
        sigdir
      );
    }

    setHikayePaylasiliyor(false);
    if (res && res.tamam) {
      setYeniHikayeMedya(null);
      setYeniHikayeMetin('');
      if (res.hikaye) {
        setAktifHikayeler((eski) => [
          {
            ...res.hikaye,
            sigdir: !!sigdir,
            profilResimUrl: benimProfil?.profilResimUrl || null,
            goruldu: true,
            goruntulenmeSayisi: 0,
            goruntuleyenler: [],
          },
          ...eski.filter((x) => x.id !== res.hikaye.id),
        ]);
      }
      setAktifTab('sohbetler');
      hikayeleriYukle();
    } else {
      Alert.alert('Hata', res?.hata || 'Hikaye paylaşılamadı');
    }
  }

  async function hikayePaylas() {
    return hikayePaylasSonuc({ secim: yeniHikayeMedya, yaziKatmani: null, baslik: yeniHikayeMetin });
  }

  // Kişileri ve grupları sırala (gizlenen sohbetleri filtrele ve son mesaja göre sırala)
  const siraliKullanicilar = useMemo(() => {
    return kullanicilar
      .filter((k) => !(gizlenenSohbetler || []).includes(kisiAnahtari(k.kullanici)))
      .sort((a, b) => {
        const tA = sonMesajZamanlari[kisiAnahtari(a.kullanici)] || a.sonMesajZamani || 0;
        const tB = sonMesajZamanlari[kisiAnahtari(b.kullanici)] || b.sonMesajZamani || 0;
        return tB - tA;
      });
  }, [kullanicilar, sonMesajZamanlari, gizlenenSohbetler]);

  const siraliGruplar = useMemo(() => {
    const benKucuk = (kullanici || '').trim().toLowerCase();
    return (gruplar || [])
      .filter((g) => {
        if (!g || !g.id) return false;
        const uyeler = Array.isArray(g.uyeler) ? g.uyeler : [];
        if (!uyeler.some((u) => (u || '').trim().toLowerCase() === benKucuk)) return false;
        const anahtar = grupAnahtari(g.id);
        const temizlemeZamani = sohbetTemizlemeZamanlari?.[anahtar] || 0;
        const sonMesajZamani = sonMesajZamanlari[anahtar] || g?.sonMesajZamani || 0;
        if ((gizlenenSohbetler || []).includes(anahtar)) {
          if (!sonMesajZamani || sonMesajZamani <= temizlemeZamani) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const tA = sonMesajZamanlari[grupAnahtari(a.id)] || a?.sonMesajZamani || a?.olusturuldu || 0;
        const tB = sonMesajZamanlari[grupAnahtari(b.id)] || b?.sonMesajZamani || b?.olusturuldu || 0;
        return tB - tA;
      });
  }, [gruplar, sonMesajZamanlari, gizlenenSohbetler, sohbetTemizlemeZamanlari, kullanici]);

  // Arama filtreleme
  const aramaAktif = aramaMetni.trim().length > 0;
  const filtrelenmisKisiler = useMemo(() => {
    if (!aramaAktif) return siraliKullanicilar;
    const q = aramaMetni.toLowerCase();
    return siraliKullanicilar.filter((k) => (k?.kullanici || '').toLowerCase().includes(q));
  }, [siraliKullanicilar, aramaMetni, aramaAktif]);

  const filtrelenmisGruplar = useMemo(() => {
    if (!aramaAktif) return siraliGruplar;
    const q = aramaMetni.toLowerCase();
    return siraliGruplar.filter((g) => (g?.isim || '').toLowerCase().includes(q));
  }, [siraliGruplar, aramaMetni, aramaAktif]);

  // Tüm Sohbetler (Kişiler ve Gruplar BİR ARADA, en son mesaja göre sıralı)
  const tumSohbetler = useMemo(() => {
    const birlesik = [
      ...(filtrelenmisGruplar || []).map((g) => ({ ...g, _sohbetTuru: 'grup' })),
      ...(filtrelenmisKisiler || []).map((k) => ({ ...k, _sohbetTuru: 'kisi' })),
    ];
    return birlesik.sort((a, b) => {
      const keyA = a._sohbetTuru === 'grup' ? grupAnahtari(a.id) : kisiAnahtari(a.kullanici);
      const keyB = b._sohbetTuru === 'grup' ? grupAnahtari(b.id) : kisiAnahtari(b.kullanici);
      const tA = sonMesajZamanlari[keyA] || a.sonMesajZamani || a.olusturuldu || 0;
      const tB = sonMesajZamanlari[keyB] || b.sonMesajZamani || b.olusturuldu || 0;
      if (tB !== tA) return tB - tA;
      // Mesaj yoksa gruplar en üstte görünsün
      if (a._sohbetTuru === 'grup' && b._sohbetTuru !== 'grup') return -1;
      if (b._sohbetTuru === 'grup' && a._sohbetTuru !== 'grup') return 1;
      return 0;
    });
  }, [filtrelenmisGruplar, filtrelenmisKisiler, sonMesajZamanlari]);

  // Kullanıcının kendi 24s hikayeleri (eskiden yeniye kronolojik)
  const benimAktifHikayelerim = useMemo(() => {
    return aktifHikayeler
      .filter((h) => (h.kullanici || '').toLowerCase() === (kullanici || '').toLowerCase())
      .sort((a, b) => (a.zaman || 0) - (b.zaman || 0));
  }, [aktifHikayeler, kullanici]);

  const benimAktifHikayem = benimAktifHikayelerim[0] || null;

  // Diğer kullanıcıların hikayelerini kullanıcı adına göre grupla (her kullanıcı için tek daire)
  const digerKullaniciGruplari = useMemo(() => {
    const gruplarMap = {};
    for (const h of aktifHikayeler) {
      if ((h.kullanici || '').toLowerCase() === (kullanici || '').toLowerCase()) continue;
      const k = h.kullanici;
      if (!gruplarMap[k]) {
        gruplarMap[k] = {
          kullanici: k,
          profilResimUrl: h.profilResimUrl,
          hikayeler: [],
          hepsiGoruldu: true,
        };
      }
      gruplarMap[k].hikayeler.push(h);
      if (!h.goruldu) {
        gruplarMap[k].hepsiGoruldu = false;
      }
      if (!gruplarMap[k].profilResimUrl && h.profilResimUrl) {
        gruplarMap[k].profilResimUrl = h.profilResimUrl;
      }
    }
    const liste = Object.values(gruplarMap);
    // Hikayeleri kendi içinde kronolojik sırala
    liste.forEach((g) => g.hikayeler.sort((a, b) => (a.zaman || 0) - (b.zaman || 0)));
    // Henüz görülmemiş olanları başa al
    return liste.sort((a, b) => {
      if (a.hepsiGoruldu === b.hepsiGoruldu) {
        const sonA = Math.max(...a.hikayeler.map((x) => x.zaman || 0));
        const sonB = Math.max(...b.hikayeler.map((x) => x.zaman || 0));
        return sonB - sonA;
      }
      return a.hepsiGoruldu ? 1 : -1;
    });
  }, [aktifHikayeler, kullanici]);

  // ----------------------------------------------------
  // RENDER: Sohbet Satırı (Kişi)
  // ----------------------------------------------------
  function kisiSatiriRender({ item }) {
    const anahtar = kisiAnahtari(item.kullanici);
    const temizlemeZamani = sohbetTemizlemeZamanlari?.[anahtar] || 0;
    const okunmamis = (okunmamisSayilar && okunmamisSayilar[anahtar] !== undefined)
      ? okunmamisSayilar[anahtar]
      : (item.okunmamisSayisi || 0);
    const canliDurum = kullaniciDurumlari[item.kullanici];
    const cevrimici = canliDurum ? canliDurum.cevrimici : item.cevrimici;
    const yaziyorMu = !!(yaziyorlar && yaziyorlar[anahtar] && yaziyorlar[anahtar][item.kullanici]);

    // Son gönderilen mesajın önizlemesi (canlı soket, depo veya sunucu)
    const depoMesajlari = (mesajDeposu && mesajDeposu[anahtar]) || [];
    const gecerliDepoMesajlari = temizlemeZamani
      ? depoMesajlari.filter((m) => (m.zaman || 0) > temizlemeZamani)
      : depoMesajlari;
    const sonDepoMesaji = gecerliDepoMesajlari.length > 0 ? gecerliDepoMesajlari[gecerliDepoMesajlari.length - 1] : null;

    let hamSonMesaj = (sonMesajlar && sonMesajlar[anahtar]) || sonDepoMesaji || item.sonMesaj;
    if (hamSonMesaj && (hamSonMesaj.zaman || 0) <= temizlemeZamani) {
      hamSonMesaj = null;
    }
    const gercekSonMesaj = hamSonMesaj;

    let sonMesajMetin = null;
    if (gercekSonMesaj) {
      const benMi = (gercekSonMesaj.gonderen || '').toLowerCase() === (kullanici || '').toLowerCase();
      const onEk = benMi ? 'Sen: ' : '';
      if (gercekSonMesaj.tekGorunum) sonMesajMetin = `${onEk}📷 Tek seferlik fotoğraf`;
      else if (gercekSonMesaj.medyaTuru === 'video') sonMesajMetin = `${onEk}🎥 Video`;
      else if (gercekSonMesaj.medyaTuru === 'ses') sonMesajMetin = `${onEk}🎤 Ses mesajı`;
      else if (gercekSonMesaj.medyaTuru === 'foto') sonMesajMetin = `${onEk}📷 Fotoğraf`;
      else if (gercekSonMesaj.metin) sonMesajMetin = `${onEk}${gercekSonMesaj.metin}`;
    }

    return (
      <TouchableOpacity
        style={styles.satir}
        activeOpacity={0.7}
        onPress={() => onSohbetAc({
          hedefTuru: 'kisi',
          hedef: item.kullanici,
          baslik: item.kullanici,
          resimUrl: item.profilResimUrl || null,
        })}
      >
        <TouchableOpacity
          style={styles.avatarKutu}
          activeOpacity={item.profilResimUrl ? 0.75 : 1}
          onPress={() => {
            if (item.profilResimUrl) {
              setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, item.profilResimUrl));
            }
          }}
        >
          {item.profilResimUrl ? (
            <Image source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, item.profilResimUrl) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: renkler.digerBalon }]}>
              <Text style={styles.avatarMetin}>{item.kullanici.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          {cevrimici && <View style={styles.cevrimiciNokta} />}
        </TouchableOpacity>

        <View style={styles.satirOrta}>
          <Text style={styles.satirBaslik}>{item.kullanici}</Text>
          {yaziyorMu ? (
            <Text style={[styles.satirAltyazi, { color: renkler.basarili, fontWeight: '600' }]} numberOfLines={1}>yazıyor...</Text>
          ) : sonMesajMetin ? (
            <Text
              style={[
                styles.satirAltyazi,
                okunmamis > 0
                  ? { color: '#ffffff', fontWeight: '700', opacity: 1 }
                  : { color: renkler.metinSoluk, fontWeight: '400', opacity: 0.8 },
              ]}
              numberOfLines={1}
            >
              {sonMesajMetin}
            </Text>
          ) : (
            <Text style={[styles.satirAltyazi, { fontStyle: 'italic', opacity: 0.5 }]} numberOfLines={1}>
              Sohbeti başlatın
            </Text>
          )}
        </View>

        {okunmamis > 0 && (
          <View style={styles.rozet}>
            <Text style={styles.rozetMetin}>{okunmamis > 99 ? '99+' : okunmamis}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.satirKameraButon}
          onPress={() => kameraylaHemenGonder('kisi', item.kullanici, item.kullanici)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.satirKameraDaire}>
            <View style={styles.satirKameraGovde} />
            <View style={styles.satirKameraLens} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // ----------------------------------------------------
  // RENDER: Sohbet Satırı (Grup)
  // ----------------------------------------------------
  function grupSatiriRender({ item }) {
    const anahtar = grupAnahtari(item.id);
    const temizlemeZamani = sohbetTemizlemeZamanlari?.[anahtar] || 0;
    const gBilgi = grupBilgileri && grupBilgileri[item.id];
    const gIsim = gBilgi?.isim || item?.isim || 'Grup';
    const gResim = gBilgi?.resimUrl || item?.resimUrl || null;
    const gUyeler = gBilgi?.uyeler || item?.uyeler || [];
    const gYonetici = gBilgi?.yonetici || item?.yonetici;
    const gYoneticiler = gBilgi?.yoneticiler || item?.yoneticiler || (gYonetici ? [gYonetici] : []);

    const okunmamis = (okunmamisSayilar && okunmamisSayilar[anahtar] !== undefined)
      ? okunmamisSayilar[anahtar]
      : (item.okunmamisSayisi || 0);

    const grupYazanlar = yaziyorlar && yaziyorlar[anahtar]
      ? Object.keys(yaziyorlar[anahtar]).filter((u) => u.toLowerCase() !== (kullanici || '').toLowerCase())
      : [];
    const grupYaziyorMetni = grupYazanlar.length > 0 ? `${grupYazanlar[0]} yazıyor...` : null;

    let grupSonMesajMetin = null;
    const depoMesajlari = (mesajDeposu && mesajDeposu[anahtar]) || [];
    const gecerliDepoMesajlari = temizlemeZamani
      ? depoMesajlari.filter((m) => (m.zaman || 0) > temizlemeZamani)
      : depoMesajlari;
    const sonDepoMesaji = gecerliDepoMesajlari.length > 0 ? gecerliDepoMesajlari[gecerliDepoMesajlari.length - 1] : null;

    let hamSonMesaj = (sonMesajlar && sonMesajlar[anahtar]) || sonDepoMesaji || item.sonMesaj;
    if (hamSonMesaj && (hamSonMesaj.zaman || 0) <= temizlemeZamani) {
      hamSonMesaj = null;
    }
    const gercekSonMesaj = hamSonMesaj;

    if (gercekSonMesaj) {
      const benMi = (gercekSonMesaj.gonderen || '').toLowerCase() === (kullanici || '').toLowerCase();
      const onEk = benMi ? 'Sen: ' : `${gercekSonMesaj.gonderen}: `;
      if (gercekSonMesaj.tekGorunum) grupSonMesajMetin = `${onEk}📷 Tek seferlik fotoğraf`;
      else if (gercekSonMesaj.medyaTuru === 'video') grupSonMesajMetin = `${onEk}🎥 Video`;
      else if (gercekSonMesaj.medyaTuru === 'ses') grupSonMesajMetin = `${onEk}🎤 Ses mesajı`;
      else if (gercekSonMesaj.medyaTuru === 'foto') grupSonMesajMetin = `${onEk}📷 Fotoğraf`;
      else if (gercekSonMesaj.metin) grupSonMesajMetin = `${onEk}${gercekSonMesaj.metin}`;
    }

    return (
      <TouchableOpacity
        style={styles.satir}
        activeOpacity={0.7}
        onPress={() =>
          onSohbetAc({
            hedefTuru: 'grup',
            hedef: item.id,
            baslik: gIsim,
            uyeler: gUyeler,
            yonetici: gYonetici,
            yoneticiler: gYoneticiler,
            resimUrl: gResim,
          })
        }
      >
        <TouchableOpacity
          style={styles.avatarKutu}
          activeOpacity={gResim ? 0.75 : 1}
          onPress={() => {
            if (gResim) {
              setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, gResim));
            }
          }}
        >
          {gResim ? (
            <Image source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, gResim) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: renkler.kendiBalon }]}>
              <Text style={[styles.avatarMetin, { color: '#ffffff' }]}>{gIsim.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.satirOrta}>
          <Text style={styles.satirBaslik}>{gIsim}</Text>
          {grupYaziyorMetni ? (
            <Text style={[styles.satirAltyazi, { color: renkler.basarili, fontWeight: '600' }]} numberOfLines={1}>{grupYaziyorMetni}</Text>
          ) : grupSonMesajMetin ? (
            <Text
              style={[
                styles.satirAltyazi,
                okunmamis > 0
                  ? { color: '#ffffff', fontWeight: '700', opacity: 1 }
                  : { color: renkler.metinSoluk, fontWeight: '400', opacity: 0.8 },
              ]}
              numberOfLines={1}
            >
              {grupSonMesajMetin}
            </Text>
          ) : (
            <Text style={styles.satirAltyazi} numberOfLines={1}>{(item?.uyeler || []).length} üye</Text>
          )}
        </View>

        {okunmamis > 0 && (
          <View style={styles.rozet}>
            <Text style={styles.rozetMetin}>{okunmamis > 99 ? '99+' : okunmamis}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.satirKameraButon}
          onPress={() =>
            kameraylaHemenGonder(
              'grup',
              item.id,
              item.isim,
              item?.uyeler,
              item?.yonetici,
              item?.yoneticiler || (item?.yonetici ? [item?.yonetici] : [])
            )
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.satirKameraDaire}>
            <View style={styles.satirKameraGovde} />
            <View style={styles.satirKameraLens} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.kok} edges={['top']}>
      {/* ----------------------------------------------------
          TAB 1: SOHBETLER
      ---------------------------------------------------- */}
      {aktifTab === 'sohbetler' && (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSol}>
              <Image source={require('../assets/icon.png')} style={styles.headerLogo} />
              <View>
                <Text style={styles.headerBaslik}>Textly</Text>
                <Text style={styles.headerAltyazi}>
                  {kullanici} · {baglandi ? 'çevrim içi' : 'bağlanıyor...'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.grupOlusturBtn}
              onPress={() => setGrupModalAcik(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.grupOlusturMetin}>+ Grup</Text>
            </TouchableOpacity>
          </View>

          {/* 24 Saatlik Hikayeler Çubuğu */}
          <View style={styles.hikayelerKapsayici}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hikayeListesi}>
              {/* Kendi Hikayen */}
              <TouchableOpacity
                style={styles.hikayeOgesi}
                onPress={() => {
                  if (benimAktifHikayelerim.length > 0) {
                    hikayeOynat(benimAktifHikayelerim, 0);
                  } else {
                    setHikayeKameraModalAcik(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.hikayeHalka,
                    benimAktifHikayelerim.length > 0 ? styles.hikayeHalkaAktif : styles.hikayeHalkaPasif,
                  ]}
                >
                  {benimProfil?.profilResimUrl ? (
                    <Image
                      source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, benimProfil.profilResimUrl) }}
                      style={styles.hikayeResim}
                    />
                  ) : (
                    <View style={[styles.hikayeResim, { backgroundColor: renkler.kendiBalon, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{kullanici.slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  {/* + Rozeti: her zaman doğrudan kamera stüdyosunu açar */}
                  <TouchableOpacity
                    style={styles.hikayeArtiRozet}
                    onPress={() => setHikayeKameraModalAcik(true)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.hikayeArtiMetin}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hikayeKullaniciAdi} numberOfLines={1}>Hikayen</Text>
              </TouchableOpacity>

              {/* Diğer Kullanıcıların Hikayeleri (Kullanıcı başına tek daire) */}
              {digerKullaniciGruplari.map((grup) => (
                <TouchableOpacity
                  key={grup.kullanici}
                  style={styles.hikayeOgesi}
                  onPress={() => {
                    const ilkGorulmeyenIdx = grup.hikayeler.findIndex((h) => !h.goruldu);
                    hikayeOynat(grup.hikayeler, ilkGorulmeyenIdx >= 0 ? ilkGorulmeyenIdx : 0);
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.hikayeHalka,
                      !grup.hepsiGoruldu ? styles.hikayeHalkaRenkli : styles.hikayeHalkaGoruldu,
                    ]}
                  >
                    {grup.profilResimUrl ? (
                      <Image
                        source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, grup.profilResimUrl) }}
                        style={styles.hikayeResim}
                      />
                    ) : (
                      <View style={[styles.hikayeResim, { backgroundColor: renkler.digerBalon, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: renkler.metin, fontWeight: '700', fontSize: 16 }}>{grup.kullanici.slice(0, 1).toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.hikayeKullaniciAdi} numberOfLines={1}>{grup.kullanici}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Arama Kutusu */}
          <View style={styles.aramaKutusu}>
            <View style={styles.buyutecKutu}>
              <View style={styles.buyutecHalka} />
              <View style={styles.buyutecSap} />
            </View>
            <TextInput
              style={styles.aramaGirdi}
              placeholder="Sohbetlerde veya mesajlarda ara..."
              placeholderTextColor={renkler.metinSoluk}
              value={aramaMetni}
              onChangeText={setAramaMetni}
              autoCapitalize="none"
            />
            {aramaAktif && (
              <TouchableOpacity onPress={() => setAramaMetni('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.aramaTemizle}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Segment Butonları: Tümü / Kişiler / Gruplar */}
          {!aramaAktif && (
            <View style={styles.sekmeler}>
              <TouchableOpacity
                style={[styles.sekme, sohbetFiltresi === 'hepsi' && styles.sekmeAktif]}
                onPress={() => setSohbetFiltresi('hepsi')}
              >
                <Text style={[styles.sekmeMetin, sohbetFiltresi === 'hepsi' && styles.sekmeMetinAktif]}>Tümü</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sekme, sohbetFiltresi === 'kisiler' && styles.sekmeAktif]}
                onPress={() => setSohbetFiltresi('kisiler')}
              >
                <Text style={[styles.sekmeMetin, sohbetFiltresi === 'kisiler' && styles.sekmeMetinAktif]}>Kişiler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sekme, sohbetFiltresi === 'gruplar' && styles.sekmeAktif]}
                onPress={() => setSohbetFiltresi('gruplar')}
              >
                <Text style={[styles.sekmeMetin, sohbetFiltresi === 'gruplar' && styles.sekmeMetinAktif]}>Gruplar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sohbet Listesi */}
          <ScrollView
            refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={renkler.metin} />}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            {sohbetFiltresi === 'hepsi' && (
              <>
                {tumSohbetler.map((item) =>
                  item._sohbetTuru === 'grup' ? (
                    <View key={`grup-${item.id}`}>{grupSatiriRender({ item })}</View>
                  ) : (
                    <View key={`kisi-${item.kullanici}`}>{kisiSatiriRender({ item })}</View>
                  )
                )}
              </>
            )}

            {sohbetFiltresi === 'kisiler' && (
              <>
                {filtrelenmisKisiler.map((item) => (
                  <View key={`kisi-${item.kullanici}`}>{kisiSatiriRender({ item })}</View>
                ))}
              </>
            )}

            {sohbetFiltresi === 'gruplar' && (
              <>
                <TouchableOpacity
                  style={[styles.grupOlusturKarti, { borderColor: renkler.cizgi, backgroundColor: renkler.yuzey }]}
                  onPress={() => setGrupModalAcik(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.grupOlusturKartiIkon, { backgroundColor: (renkler.vurgu || '#00a8ff') + '22' }]}>
                    <Text style={{ fontSize: 22, color: renkler.vurgu || '#00a8ff', fontWeight: 'bold' }}>+</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: renkler.metin, fontSize: 15, fontWeight: '700' }}>Yeni Grup Oluştur</Text>
                    <Text style={{ color: renkler.metinSoluk, fontSize: 12 }}>Arkadaşlarınla grup sohbeti başlat</Text>
                  </View>
                </TouchableOpacity>

                {filtrelenmisGruplar.map((item) => (
                  <View key={`grup-${item.id}`}>{grupSatiriRender({ item })}</View>
                ))}
              </>
            )}

            {filtrelenmisKisiler.length === 0 && filtrelenmisGruplar.length === 0 && (
              <Text style={styles.bosMetin}>Henüz bir sohbet yok.</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* ----------------------------------------------------
          TAB 2: KEŞFET (30 Günlük Hikayeler Grid)
      ---------------------------------------------------- */}
      {aktifTab === 'kesfet' && (
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PusulaVektorIkon boyut={22} renk={renkler.vurgu} />
              <View>
                <Text style={styles.headerBaslik}>Keşfet</Text>
                <Text style={styles.headerAltyazi}>Son 30 Günün Paylaşımları</Text>
              </View>
            </View>
            <TouchableOpacity onPress={hikayeleriYukle} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18, color: renkler.vurgu }}>↻</Text>
            </TouchableOpacity>
          </View>

          {kesfetHikayeler.length === 0 ? (
            <ScrollView
              contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
              refreshControl={
                <RefreshControl
                  refreshing={yenileniyor}
                  onRefresh={async () => {
                    setYenileniyor(true);
                    await hikayeleriYukle();
                    setYenileniyor(false);
                  }}
                  tintColor={renkler.vurgu}
                  colors={[renkler.vurgu]}
                />
              }
            >
              <View style={{ marginBottom: 16 }}>
                <PusulaVektorIkon boyut={54} renk={renkler.vurgu} />
              </View>
              <Text style={{ color: renkler.metin, fontSize: 16, fontWeight: '700' }}>Henüz Hikaye Yok</Text>
              <Text style={{ color: renkler.metinSoluk, textAlign: 'center', marginTop: 4 }}>
                Arkadaşlarının son 30 gün içindeki paylaşımları burada listelenir. Yenilemek için aşağı çekin.
              </Text>
            </ScrollView>
          ) : (
            <FlatList
              data={kesfetHikayeler}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              refreshControl={
                <RefreshControl
                  refreshing={yenileniyor}
                  onRefresh={async () => {
                    setYenileniyor(true);
                    await hikayeleriYukle();
                    setYenileniyor(false);
                  }}
                  tintColor={renkler.vurgu}
                  colors={[renkler.vurgu]}
                />
              }
              contentContainerStyle={{ padding: 8, paddingBottom: 90 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.kesfetKart}
                  activeOpacity={0.8}
                  onPress={() => setSeciliHikaye(item)}
                >
                  <Image
                    source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, item.medyaUrl) }}
                    style={styles.kesfetKartResim}
                    resizeMode="cover"
                  />
                  <View style={styles.kesfetKartBilgi}>
                    <Text style={styles.kesfetKullanici} numberOfLines={1}>@{item.kullanici}</Text>
                    <Text style={styles.kesfetZaman}>{zamanOnce(item.zaman)}</Text>
                  </View>
                  {item.medyaTuru === 'video' && (
                    <View style={styles.videoRozet}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>▶ Video</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}



      {/* ----------------------------------------------------
          TAB 4: PROFİL & AYARLAR
      ---------------------------------------------------- */}
      {aktifTab === 'profil' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Profil Başlığı */}
          <View style={styles.profilKart}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                activeOpacity={benimProfil.profilResimUrl ? 0.8 : 1}
                onPress={() => {
                  if (benimProfil.profilResimUrl) {
                    setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, benimProfil.profilResimUrl));
                  } else {
                    profilFotoDegistir();
                  }
                }}
              >
                {benimProfil.profilResimUrl ? (
                  <Image
                    source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, benimProfil.profilResimUrl) }}
                    style={styles.profilBuyukAvatar}
                  />
                ) : (
                  <View style={[styles.profilBuyukAvatar, { backgroundColor: renkler.kendiBalon, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 36, color: '#fff', fontWeight: '800' }}>{kullanici.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profilKameraIkonKutu}
                onPress={profilFotoDegistir}
                activeOpacity={0.7}
              >
                <View style={{ width: 12, height: 9, borderRadius: 2, borderWidth: 1.5, borderColor: '#fff' }} />
              </TouchableOpacity>
            </View>

            <Text style={styles.profilKullaniciAdi}>@{kullanici}</Text>
            <Text style={styles.profilBiyografi}>
              {benimProfil.biyografi ? benimProfil.biyografi : 'Biyografi henüz eklenmedi'}
            </Text>

            {!!benimProfil.dogumTarihi && (
              <Text style={styles.profilDogumTarihi}>🎂 {benimProfil.dogumTarihi}</Text>
            )}
          </View>

          {/* Hesap Yönetimi Bölümü */}
          <Text style={styles.ayarGrupBaslik}>HESAP BİLGİLERİ</Text>
          <View style={styles.ayarGrupKutu}>
            <TouchableOpacity
              style={styles.ayarSatiri}
              onPress={() => {
                setYeniBiyografi(benimProfil.biyografi || '');
                setBiyografiModal(true);
              }}
            >
              <Text style={styles.ayarSatirBaslik}>Biyografiyi Düzenle</Text>
              <Text style={styles.ayarSatirOk}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ayarSatiri}
              onPress={() => {
                setYeniDogumTarihi(benimProfil.dogumTarihi || '');
                setDogumTarihiModal(true);
              }}
            >
              <Text style={styles.ayarSatirBaslik}>Doğum Tarihi Ekle / Güncelle</Text>
              <Text style={styles.ayarSatirOk}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ayarSatiri}
              onPress={() => {
                setYeniKullaniciAdi(kullanici);
                setKullaniciAdiModal(true);
              }}
            >
              <Text style={styles.ayarSatirBaslik}>Kullanıcı Adını Değiştir</Text>
              <Text style={styles.ayarSatirOk}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ayarSatiri, { borderBottomWidth: 0 }]}
              onPress={() => {
                setYeniSifre('');
                setSifreModal(true);
              }}
            >
              <Text style={styles.ayarSatirBaslik}>Şifreyi Değiştir</Text>
              <Text style={styles.ayarSatirOk}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Gizlilik & Tercihler */}
          <Text style={styles.ayarGrupBaslik}>GİZLİLİK VE TERCİHLER</Text>
          <View style={styles.ayarGrupKutu}>
            <View style={styles.ayarSatiri}>
              <Text style={styles.ayarSatirBaslik}>Koyu Tema (Karanlık Mod)</Text>
              <Switch
                value={koyuMu}
                onValueChange={toggleTema}
                trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.ayarSatiri}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.ayarSatirBaslik}>Doğum Tarihimi Gizle</Text>
                <Text style={styles.ayarSatirAciklama}>Profilinizde diğer kullanıcılara görünmez</Text>
              </View>
              <Switch
                value={dogumTarihiGizli}
                onValueChange={dogumTarihiGizliToggle}
                trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.ayarSatiri}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.ayarSatirBaslik}>Okundu Bilgisini Kapat</Text>
                <Text style={styles.ayarSatirAciklama}>Mesajları okuduğunuzda görüldü iletilmez</Text>
              </View>
              <Switch
                value={okunduBilgisiGizli}
                onValueChange={okunduBilgisiGizliToggle}
                trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.ayarSatiri}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.ayarSatirBaslik}>Son Görülme Bilgisini Kapat</Text>
                <Text style={styles.ayarSatirAciklama}>Son görülmeniz ve çevrim içi durumunuz gizlenir</Text>
              </View>
              <Switch
                value={sonGorulmeGizli}
                onValueChange={sonGorulmeGizliToggle}
                trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
                thumbColor="#ffffff"
              />
            </View>

            <TouchableOpacity
              style={[styles.ayarSatiri, { borderBottomWidth: 0 }]}
              onPress={() => setEngellenenlerModal(true)}
            >
              <Text style={styles.ayarSatirBaslik}>
                Engellenen Hesaplar ({oturum?.engellenenler?.length || 0})
              </Text>
              <Text style={styles.ayarSatirOk}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Çıkış Yap Butonu */}
          <TouchableOpacity
            style={styles.cikisButon}
            onPress={() => setCikisOnayModalAcik(true)}
          >
            <Text style={styles.cikisButonMetin}>Çıkış Yap</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ----------------------------------------------------
          ALT TAB ÇUBUĞU (4 TAB)
      ---------------------------------------------------- */}
      <View style={styles.tabBari}>
        <TouchableOpacity
          style={styles.tabButon}
          onPress={() => setAktifTab('sohbetler')}
          activeOpacity={0.7}
        >
          <TabSohbetIkon aktif={aktifTab === 'sohbetler'} renkler={renkler} />
          <Text style={[styles.tabMetin, aktifTab === 'sohbetler' && styles.tabMetinAktif]}>Sohbetler</Text>
          {toplamOkunmamis > 0 && (
            <View style={styles.tabRozet}>
              <Text style={styles.tabRozetMetin}>{toplamOkunmamis > 99 ? '99+' : toplamOkunmamis}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButon}
          onPress={() => setAktifTab('kesfet')}
          activeOpacity={0.7}
        >
          <TabKesfetIkon aktif={aktifTab === 'kesfet'} renkler={renkler} />
          <Text style={[styles.tabMetin, aktifTab === 'kesfet' && styles.tabMetinAktif]}>Keşfet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButon}
          onPress={() => {
            setHikayeKameraModalAcik(true);
          }}
          activeOpacity={0.7}
        >
          <TabHikayeIkon aktif={false} renkler={renkler} />
          <Text style={styles.tabMetin}>Hikaye Ekle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButon}
          onPress={() => setAktifTab('profil')}
          activeOpacity={0.7}
        >
          <TabProfilIkon aktif={aktifTab === 'profil'} renkler={renkler} />
          <Text style={[styles.tabMetin, aktifTab === 'profil' && styles.tabMetinAktif]}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* ----------------------------------------------------
          TAM EKRAN HİKAYE İZLEYİCİ MODAL
      ---------------------------------------------------- */}
      <Modal
        visible={!!seciliHikaye}
        animationType="fade"
        transparent={false}
        onRequestClose={hikayeKapat}
      >
        {seciliHikaye && (
          <View style={styles.hikayeTamEkranKok}>
            {/* Segmentli İlerleme Çubukları */}
            <View style={styles.hikayeIlerlemeKutusu}>
              {(aktifHikayeListesi.length > 0 ? aktifHikayeListesi : [seciliHikaye]).map((item, idx) => {
                const tamamlandi = idx < aktifHikayeIndex;
                const aktif = idx === aktifHikayeIndex;
                return (
                  <View key={`seg-${item?.id || idx}`} style={styles.hikayeIlerlemeSegment}>
                    {tamamlandi ? (
                      <View style={[styles.hikayeIlerlemeDolu, { width: '100%' }]} />
                    ) : aktif ? (
                      <Animated.View
                        style={[
                          styles.hikayeIlerlemeDolu,
                          {
                            width: hikayeIlerleme.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Üst Bilgi Barı */}
            <View style={styles.hikayeHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {seciliHikaye.profilResimUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setBuyukFotoUrl(medyaAdresi(sunucuAdres, kullanici, sifre, seciliHikaye.profilResimUrl))}
                  >
                    <Image
                      source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, seciliHikaye.profilResimUrl) }}
                      style={{ width: 38, height: 38, borderRadius: 19 }}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#00a8ff', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{seciliHikaye.kullanici.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{seciliHikaye.kullanici}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{zamanOnce(seciliHikaye.zaman)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {(seciliHikaye.kullanici || '').toLowerCase() === (kullanici || '').toLowerCase() && (
                  <TouchableOpacity onPress={() => hikayeSilOnayla(seciliHikaye.id)}>
                    <Text style={{ color: '#ff453a', fontSize: 18 }}>🗑</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={hikayeKapat}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Medya İçeriği */}
            <View style={styles.hikayeMedyaAlani}>
              {seciliHikaye.medyaTuru === 'video' ? (
                <View style={{ width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK, justifyContent: 'center', alignItems: 'center' }}>
                  {seciliHikaye.sigdir && (
                    <>
                      <Image
                        source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, seciliHikaye.medyaUrl) }}
                        style={[StyleSheet.absoluteFillObject, { width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK, opacity: 0.45 }]}
                        blurRadius={24}
                        resizeMode="cover"
                      />
                      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
                    </>
                  )}
                  <Video
                    key={`hikaye-vid-${seciliHikaye.id}`}
                    source={{ uri: aktifVideoUri || medyaAdresi(sunucuAdres, kullanici, sifre, seciliHikaye.medyaUrl) }}
                    style={{ width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK }}
                    resizeMode={seciliHikaye.sigdir ? ResizeMode.CONTAIN : ResizeMode.COVER}
                    shouldPlay={!goruntuleyenlerModalAcik}
                    isLooping={false}
                    useNativeControls={false}
                    progressUpdateIntervalMillis={50}
                    onLoadStart={() => setVideoYukleniyor(true)}
                    onReadyForDisplay={() => setVideoYukleniyor(false)}
                    onError={(e) => {
                      console.warn('Hikaye video hatası:', e);
                      setVideoYukleniyor(false);
                    }}
                    onPlaybackStatusUpdate={(status) => {
                      if (!status.isLoaded) return;
                      if (status.isPlaying && videoYukleniyor) {
                        setVideoYukleniyor(false);
                      }
                      if (status.durationMillis && status.durationMillis > 0) {
                        const oran = Math.min(1, Math.max(0, status.positionMillis / status.durationMillis));
                        hikayeIlerleme.setValue(oran);
                      }
                      if (status.didJustFinish) {
                        sonrakiHikayeyeGec();
                      }
                    }}
                  />
                  {videoYukleniyor && (
                    <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]} pointerEvents="none">
                      <ActivityIndicator size="large" color="#ffffff" />
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK, justifyContent: 'center', alignItems: 'center' }}>
                  {seciliHikaye.sigdir && (
                    <>
                      <Image
                        source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, seciliHikaye.medyaUrl) }}
                        style={[StyleSheet.absoluteFillObject, { width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK, opacity: 0.45 }]}
                        blurRadius={24}
                        resizeMode="cover"
                      />
                      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
                    </>
                  )}
                  <Image
                    source={{ uri: medyaAdresi(sunucuAdres, kullanici, sifre, seciliHikaye.medyaUrl) }}
                    style={{ width: EKRAN_GENISLIK, height: EKRAN_YUKSEKLIK }}
                    resizeMode={seciliHikaye.sigdir ? 'contain' : 'cover'}
                    onLoadStart={() => setHikayeResimYukleniyor(true)}
                    onLoadEnd={() => setHikayeResimYukleniyor(false)}
                    onError={() => setHikayeResimYukleniyor(false)}
                  />
                  {hikayeResimYukleniyor && (
                    <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]} pointerEvents="none">
                      <ActivityIndicator size="large" color="#ffffff" />
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Sol / Sağ Dokunma Alanları (Önceki / Sonraki Hikaye) */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
              <View style={styles.hikayeDokunmaSatiri} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.hikayeDokunmaSol}
                  activeOpacity={1}
                  onPress={oncekiHikayeyeGec}
                />
                <TouchableOpacity
                  style={styles.hikayeDokunmaSag}
                  activeOpacity={1}
                  onPress={sonrakiHikayeyeGec}
                />
              </View>
            </View>

            {/* Çıkartma / Metin Katmanı */}
            {seciliHikaye.yaziKatmani && seciliHikaye.yaziKatmani.metin && (
              <View
                style={[
                  styles.tamEkranYaziKapsayici,
                  {
                    top: (seciliHikaye.yaziKatmani.konumYOrani || 0.4) * EKRAN_YUKSEKLIK,
                  },
                  seciliHikaye.yaziKatmani.arkaplanModu === 'yariSaydam' && { backgroundColor: 'rgba(0,0,0,0.72)' },
                  seciliHikaye.yaziKatmani.arkaplanModu === 'dolu' && { backgroundColor: seciliHikaye.yaziKatmani.renk },
                  seciliHikaye.yaziKatmani.arkaplanModu === 'neon' && {
                    borderColor: seciliHikaye.yaziKatmani.renk,
                    borderWidth: 2,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tamEkranYaziMetni,
                    {
                      color:
                        seciliHikaye.yaziKatmani.arkaplanModu === 'dolu'
                          ? seciliHikaye.yaziKatmani.renk === '#ffffff'
                            ? '#000000'
                            : '#ffffff'
                          : seciliHikaye.yaziKatmani.renk,
                    },
                  ]}
                >
                  {seciliHikaye.yaziKatmani.metin}
                </Text>
              </View>
            )}

            {/* Metin Açıklaması */}
            {!!seciliHikaye.metin && (
              <View style={styles.hikayeMetinOverlay}>
                <Text style={styles.hikayeMetinYazi}>{seciliHikaye.metin}</Text>
              </View>
            )}

            {/* Alt İşlem Barı (Kendi Hikayen ise 'N kişi gördü' butonu, başkasınınki ise Şeffaf/Dolu Kalp butonu) */}
            {(seciliHikaye.kullanici || '').toLowerCase() === (kullanici || '').toLowerCase() ? (
              <TouchableOpacity
                style={styles.hikayeGoruntuleyenlerButon}
                onPress={async () => {
                  setGoruntuleyenlerModalAcik(true);
                  try {
                    const hedefSunucu = sunucuAdres || 'https://exzehub.com.tr';
                    const h24 = await hikayeleriGetir(hedefSunucu, kullanici, sifre, 'aktif');
                    if (h24?.tamam && Array.isArray(h24?.liste)) {
                      const guncel = h24.liste.find((h) => h.id === seciliHikaye?.id);
                      if (guncel) setSeciliHikaye((prev) => ({ ...prev, ...guncel }));
                    }
                  } catch {}
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  👁 {seciliHikaye.goruntulenmeSayisi || seciliHikaye.goruntuleyenler?.length || 0} kişi gördü ›
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.hikayeYanitBar}>
                <TouchableOpacity
                  style={styles.hikayeKalpButon}
                  onPress={async () => {
                    const yeniDurum = !seciliHikaye.begenildi;
                    setSeciliHikaye((prev) => ({ ...prev, begenildi: yeniDurum }));
                    setAktifHikayeListesi((prevList) =>
                      prevList.map((h) => (h.id === seciliHikaye.id ? { ...h, begenildi: yeniDurum } : h))
                    );
                    setAktifHikayeler((prevList) =>
                      prevList.map((h) => (h.id === seciliHikaye.id ? { ...h, begenildi: yeniDurum } : h))
                    );
                    await hikayeBegen(sunucuAdres || 'https://exzehub.com.tr', kullanici, sifre, seciliHikaye.id);
                  }}
                >
                  <Text style={{ fontSize: 30, color: seciliHikaye.begenildi ? '#ff453a' : 'rgba(255,255,255,0.9)' }}>
                    {seciliHikaye.begenildi ? '❤️' : '♡'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Görüntüleyenler Alt Sayfası (Dahili Bottom-Sheet - Android WindowManager Çökmesini Önler) */}
            {goruntuleyenlerModalAcik && !!seciliHikaye && (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end', zIndex: 100 }]}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => setGoruntuleyenlerModalAcik(false)}
                />
                <View style={[styles.modalKutu, { maxHeight: '65%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 28 }]}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 14 }} />
                  <Text style={styles.modalBaslik}>
                    Hikayeyi Görenler ({seciliHikaye?.goruntulenmeSayisi || seciliHikaye?.goruntuleyenler?.length || 0})
                  </Text>
                  {(!seciliHikaye?.goruntuleyenler || !Array.isArray(seciliHikaye.goruntuleyenler) || seciliHikaye.goruntuleyenler.length === 0) ? (
                    <Text style={styles.bosMetin}>Henüz kimse bu hikayeyi görmedi.</Text>
                  ) : (
                    <FlatList
                      data={Array.isArray(seciliHikaye?.goruntuleyenler) ? seciliHikaye.goruntuleyenler : []}
                      keyExtractor={(item, idx) => {
                        const ad = typeof item === 'string' ? item : (item?.kullanici || `uye-${idx}`);
                        return `${ad}-${idx}`;
                      }}
                      contentContainerStyle={{ paddingBottom: 16 }}
                      renderItem={({ item, index }) => {
                        try {
                          if (!item) return null;
                          const viewerKadi = String(typeof item === 'string' ? item : (item?.kullanici || 'Bilinmiyor'));
                          const viewerZaman = typeof item === 'object' && item?.zaman ? Number(item.zaman) : null;
                          const viewerBegendi = typeof item === 'object' && !!item?.begendiMi;
                          const kList = Array.isArray(kullanicilar) ? kullanicilar : [];
                          const bulunanKisi = kList.find((k) => (k?.kullanici || '').toLowerCase() === viewerKadi.toLowerCase());
                          const viewerFoto = (typeof item === 'object' && item?.profilResimUrl) || bulunanKisi?.profilResimUrl || null;
                          let fotoTamUrl = null;
                          const hedefSunucu = sunucuAdres || 'https://exzehub.com.tr';
                          if (viewerFoto && hedefSunucu) {
                            try { fotoTamUrl = medyaAdresi(hedefSunucu, kullanici, sifre, viewerFoto); } catch {}
                          }

                          return (
                            <View style={styles.uyeSatiri}>
                              <View style={styles.avatarKutu}>
                                {fotoTamUrl ? (
                                  <Image source={{ uri: fotoTamUrl }} style={[styles.avatar, { width: 44, height: 44, borderRadius: 22 }]} />
                                ) : (
                                  <View style={[styles.avatar, { width: 44, height: 44, borderRadius: 22, backgroundColor: renkler.kendiBalon }]}>
                                    <Text style={[styles.avatarMetin, { fontSize: 16 }]}>{(viewerKadi || '?').slice(0, 1).toUpperCase()}</Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ flex: 1, marginLeft: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View>
                                  <Text style={styles.satirBaslik}>@{viewerKadi}</Text>
                                  {viewerZaman && Number.isFinite(viewerZaman) ? (
                                    <Text style={styles.satirAltyazi}>{zamanOnce(viewerZaman)}</Text>
                                  ) : null}
                                </View>
                                {viewerBegendi && (
                                  <Text style={{ fontSize: 20 }}>❤️</Text>
                                )}
                              </View>
                            </View>
                          );
                        } catch (err) {
                          return null;
                        }
                      }}
                    />
                  )}
                  <TouchableOpacity style={[styles.ikincilButon, { marginTop: 12 }]} onPress={() => setGoruntuleyenlerModalAcik(false)}>
                    <Text style={styles.ikincilButonMetni}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* ----------------------------------------------------
          MODAL: GRUP OLUŞTUR
      ---------------------------------------------------- */}
      <Modal visible={grupModalAcik} animationType="slide" transparent onRequestClose={() => setGrupModalAcik(false)}>
        <View style={styles.modalArkaplan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Yeni Grup Oluştur</Text>
            <TextInput
              style={styles.girdi}
              placeholder="Grup ismi..."
              placeholderTextColor={renkler.metinSoluk}
              value={grupIsim}
              onChangeText={setGrupIsim}
            />
            <Text style={[styles.etiket, { marginTop: 12, marginBottom: 8 }]}>ÜYELERİ SEÇ</Text>
            <ScrollView style={styles.uyeListesi}>
              {(kullanicilar || [])
                .filter((k) => k && k.kullanici && k.kullanici.toLowerCase() !== (kullanici || '').toLowerCase())
                .map((k) => {
                  const secili = seciliUyeler.includes(k.kullanici);
                  return (
                    <TouchableOpacity
                      key={k.kullanici}
                      style={styles.uyeSatiri}
                      onPress={() => {
                        setSeciliUyeler((prev) =>
                          prev.includes(k.kullanici) ? prev.filter((u) => u !== k.kullanici) : [...prev, k.kullanici]
                        );
                      }}
                    >
                      <View style={[styles.onayKutusu, secili && styles.onayKutusuSecili]}>
                        {secili && <Text style={styles.onayIsareti}>✓</Text>}
                      </View>
                      <Text style={styles.uyeMetin}>{k.kullanici}</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.buton, { marginTop: 16 }]}
              onPress={async () => {
                const isim = grupIsim.trim();
                if (!isim) return Alert.alert('Hata', 'Grup ismi giriniz.');
                if (seciliUyeler.length < 1) return Alert.alert('Hata', 'En az 1 üye seçiniz.');
                setGrupKaydediliyor(true);
                const res = await grupOlustur(sunucuAdres, kullanici, sifre, isim, seciliUyeler);
                setGrupKaydediliyor(false);
                if (res.id) {
                  setGrupModalAcik(false);
                  setGrupIsim('');
                  setSeciliUyeler([]);
                  const simdi = Date.now();
                  const yeniGrupObj = {
                    id: String(res.id),
                    isim: res.isim || isim,
                    uyeler: res.uyeler || [kullanici, ...seciliUyeler],
                    yonetici: res.yonetici || kullanici,
                    yoneticiler: res.yoneticiler || [kullanici],
                    olusturan: kullanici,
                    olusturuldu: simdi,
                    sonMesajZamani: simdi,
                    sonMesaj: null,
                    okunmamisSayisi: 0,
                  };
                  grupEkle(yeniGrupObj);
                  if (sonZamanlariGuncelle) {
                    sonZamanlariGuncelle({ [grupAnahtari(res.id)]: simdi });
                  }
                  veriyiYukle();
                } else {
                  Alert.alert('Hata', res.hata || 'Grup oluşturulamadı.');
                }
              }}
              disabled={grupKaydediliyor}
            >
              {grupKaydediliyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.butonMetni}>Oluştur</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setGrupModalAcik(false)}>
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------
          MODAL: BİYOGRAFİ DÜZENLE
      ---------------------------------------------------- */}
      <Modal visible={biyografiModal} animationType="fade" transparent onRequestClose={() => setBiyografiModal(false)}>
        <View style={styles.modalArkaplan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Biyografiyi Düzenle</Text>
            <TextInput
              style={[styles.girdi, { height: 80 }]}
              placeholder="Kendinden bahset..."
              placeholderTextColor={renkler.metinSoluk}
              value={yeniBiyografi}
              onChangeText={setYeniBiyografi}
              multiline
              maxLength={150}
            />
            <TouchableOpacity style={[styles.buton, { marginTop: 12 }]} onPress={biyografiKaydet}>
              <Text style={styles.butonMetni}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setBiyografiModal(false)}>
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------
          MODAL: ÖZEL DOĞUM TARİHİ SEÇİCİ
      ---------------------------------------------------- */}
      <OzelTarihSeciciModal
        visible={dogumTarihiModal}
        mevcutTarih={benimProfil.dogumTarihi || '15.06.2000'}
        onKapat={() => setDogumTarihiModal(false)}
        onKaydet={async (secilenFormatliTarih) => {
          setDogumTarihiModal(false);
          const res = await dogumTarihiGuncelle(sunucuAdres, kullanici, sifre, secilenFormatliTarih);
          if (res.tamam) {
            setBenimProfil((p) => ({ ...p, dogumTarihi: res.dogumTarihi }));
            if (onAyarGuncellendi) onAyarGuncellendi({ dogumTarihi: res.dogumTarihi });
          } else {
            Alert.alert('Hata', res.hata || 'Doğum tarihi kaydedilemedi');
          }
        }}
      />

      {/* ----------------------------------------------------
          MODAL: KULLANICI ADI DEĞİŞTİR
      ---------------------------------------------------- */}
      <Modal visible={kullaniciAdiModal} animationType="fade" transparent onRequestClose={() => setKullaniciAdiModal(false)}>
        <View style={styles.modalArkaplan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Kullanıcı Adını Değiştir</Text>
            <TextInput
              style={styles.girdi}
              placeholder="Yeni kullanıcı adı..."
              placeholderTextColor={renkler.metinSoluk}
              value={yeniKullaniciAdi}
              onChangeText={setYeniKullaniciAdi}
              autoCapitalize="none"
            />
            <TouchableOpacity style={[styles.buton, { marginTop: 12 }]} onPress={kullaniciAdiKaydet}>
              <Text style={styles.butonMetni}>Değiştir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setKullaniciAdiModal(false)}>
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------
          MODAL: ŞİFRE DEĞİŞTİR
      ---------------------------------------------------- */}
      <Modal visible={sifreModal} animationType="fade" transparent onRequestClose={() => setSifreModal(false)}>
        <View style={styles.modalArkaplan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Şifreyi Değiştir</Text>
            <TextInput
              style={styles.girdi}
              placeholder="Yeni şifre (en az 4 karakter)..."
              placeholderTextColor={renkler.metinSoluk}
              value={yeniSifre}
              onChangeText={setYeniSifre}
              secureTextEntry
            />
            <TouchableOpacity style={[styles.buton, { marginTop: 12 }]} onPress={sifreKaydet}>
              <Text style={styles.butonMetni}>Güncelle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setSifreModal(false)}>
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------
          MODAL: ENGELLENENLER
      ---------------------------------------------------- */}
      <Modal visible={engellenenlerModal} animationType="slide" transparent onRequestClose={() => setEngellenenlerModal(false)}>
        <View style={styles.modalArkaplan}>
          <View style={[styles.modalKutu, { maxHeight: '70%' }]}>
            <Text style={styles.modalBaslik}>Engellenen Hesaplar</Text>
            {(!oturum?.engellenenler || oturum.engellenenler.length === 0) ? (
              <Text style={styles.bosMetin}>Engellediğiniz herhangi bir kullanıcı yok.</Text>
            ) : (
              <FlatList
                data={oturum.engellenenler}
                keyExtractor={(u) => u}
                renderItem={({ item: u }) => (
                  <View style={styles.uyeSatiri}>
                    <Text style={[styles.satirBaslik, { flex: 1 }]}>@{u}</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        const res = await kullaniciEngeliKaldir(sunucuAdres, kullanici, sifre, u);
                        if (res.tamam && onAyarGuncellendi) {
                          onAyarGuncellendi({ engellenenler: res.engellenenler });
                        }
                      }}
                    >
                      <Text style={{ color: renkler.vurgu, fontWeight: '600' }}>Engeli Kaldır</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
            <TouchableOpacity style={[styles.ikincilButon, { marginTop: 14 }]} onPress={() => setEngellenenlerModal(false)}>
              <Text style={styles.ikincilButonMetni}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Özel Kamera Modalı (Instagram / WhatsApp stili) */}
      <OzelKameraModal
        visible={hikayeKameraModalAcik}
        mod="hikaye"
        onKapat={() => setHikayeKameraModalAcik(false)}
        onGonder={hikayePaylasSonuc}
      />

      {/* Kişi veya Grup yanındaki kamera butonu için Hızlı Özel Vizör */}
      {!!hizliKameraHedef && (
        <OzelKameraModal
          visible={!!hizliKameraHedef}
          mod="sohbet"
          onKapat={() => setHizliKameraHedef(null)}
          onGonder={async ({ secim, yaziKatmani, baslik, tekGorunum }) => {
            const hedefBilgi = { ...hizliKameraHedef };
            setHizliKameraHedef(null);
            onSohbetAc({
              ...hedefBilgi,
              ilkMedya: secim,
              ilkYaziKatmani: yaziKatmani,
              ilkBaslik: baslik,
              ilkTekGorunum: tekGorunum,
            });
          }}
        />
      )}

      {/* Galeriden seçilen hikaye için Özel Stüdyo */}
      <OzelMedyaDuzenleyici
        visible={!!yeniHikayeMedya}
        medya={yeniHikayeMedya}
        mod="hikaye"
        onKapat={() => setYeniHikayeMedya(null)}
        onGonder={hikayePaylasSonuc}
      />

      {/* Özel Çıkış Onay Modalı (Karanlık & Şık) */}
      <Modal
        visible={cikisOnayModalAcik}
        transparent
        animationType="fade"
        onRequestClose={() => setCikisOnayModalAcik(false)}
      >
        <View style={styles.onayModalArkaplan}>
          <View style={styles.onayModalKutu}>
            <View style={styles.onayModalIkonDaire}>
              <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 14, height: 18, borderWidth: 2, borderColor: '#ff453a', borderRightWidth: 0, borderRadius: 2, position: 'absolute', left: 0 }} />
                <View style={{ width: 12, height: 2, backgroundColor: '#ff453a', position: 'absolute', right: 0 }} />
                <View style={{ width: 6, height: 6, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#ff453a', transform: [{ rotate: '45deg' }], position: 'absolute', right: 0 }} />
              </View>
            </View>
            <Text style={styles.onayModalBaslik}>Çıkış Yapılsın mı?</Text>
            <Text style={styles.onayModalMesaj}>
              Hesabınızdan çıkış yapmak istediğinize emin misiniz?
            </Text>
            <View style={styles.onayModalButonlar}>
              <TouchableOpacity
                style={styles.onayModalVazgecButon}
                onPress={() => setCikisOnayModalAcik(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.onayModalVazgecMetin}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.onayModalCikisButon}
                onPress={() => {
                  setCikisOnayModalAcik(false);
                  onCikis();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.onayModalCikisMetin}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profil Fotoğrafı Seçenek Modalı (Özel Temalı) */}
      <Modal
        visible={profilFotoSecModalAcik}
        animationType="fade"
        transparent
        onRequestClose={() => setProfilFotoSecModalAcik(false)}
      >
        <TouchableOpacity
          style={styles.modalArkaplan}
          activeOpacity={1}
          onPress={() => setProfilFotoSecModalAcik(false)}
        >
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Profil Fotoğrafı</Text>

            <TouchableOpacity
              style={styles.secenekSatiri}
              onPress={() => {
                setProfilFotoSecModalAcik(false);
                setProfilKameraAcik(true);
              }}
            >
              <Text style={styles.secenekMetni}>📷 Kamera ile Çek</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secenekSatiri, { borderBottomWidth: 0 }]}
              onPress={profilGaleridenSec}
            >
              <Text style={styles.secenekMetni}>🖼 Galeriden Seç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ikincilButon, { marginTop: 14 }]}
              onPress={() => setProfilFotoSecModalAcik(false)}
            >
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profil Fotoğrafı Çekmek için Özel Vizör Kamera Modalı */}
      <OzelKameraModal
        visible={profilKameraAcik}
        mod="profil"
        onKapat={() => setProfilKameraAcik(false)}
        onGonder={async ({ secim }) => {
          await profilKameraGonder(secim);
        }}
      />

      {/* Hikaye Sil Onay Modalı (Özel Temalı) */}
      <Modal
        visible={!!silinecekHikayeId}
        animationType="fade"
        transparent
        onRequestClose={() => setSilinecekHikayeId(null)}
      >
        <View style={styles.onayModalArkaplan}>
          <View style={styles.onayModalKutu}>
            <Text style={styles.onayModalBaslik}>Hikayeyi Sil</Text>
            <Text style={styles.onayModalMesaj}>
              Bu hikayeyi silmek istediğinize emin misiniz?
            </Text>
            <View style={styles.onayModalButonlar}>
              <TouchableOpacity
                style={styles.onayModalVazgecButon}
                onPress={() => setSilinecekHikayeId(null)}
              >
                <Text style={styles.onayModalVazgecMetin}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.onayModalCikisButon, { backgroundColor: renkler.hata || '#ff453a' }]}
                onPress={() => hikayeSilIcra(silinecekHikayeId)}
              >
                <Text style={styles.onayModalCikisMetin}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Şifre Değiştirildi Bilgilendirme Modalı */}
      <Modal
        visible={sifreDegistiModalAcik}
        animationType="fade"
        transparent
        onRequestClose={onCikis}
      >
        <View style={styles.onayModalArkaplan}>
          <View style={styles.onayModalKutu}>
            <Text style={styles.onayModalBaslik}>Şifreniz Değiştirildi</Text>
            <Text style={styles.onayModalMesaj}>
              Güvenliğiniz için lütfen yeni şifrenizle tekrar giriş yapın.
            </Text>
            <TouchableOpacity
              style={[styles.buton, { marginTop: 16 }]}
              onPress={onCikis}
            >
              <Text style={styles.butonMetni}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Kullanıcı Adı Değiştirildi Bilgilendirme Modalı */}
      <Modal
        visible={kullaniciAdiDegistiModalAcik}
        animationType="fade"
        transparent
        onRequestClose={onCikis}
      >
        <View style={styles.onayModalArkaplan}>
          <View style={styles.onayModalKutu}>
            <Text style={styles.onayModalBaslik}>Kullanıcı Adınız Değiştirildi</Text>
            <Text style={styles.onayModalMesaj}>
              Lütfen yeni kullanıcı adınızla tekrar giriş yapın.
            </Text>
            <TouchableOpacity
              style={[styles.buton, { marginTop: 16 }]}
              onPress={onCikis}
            >
              <Text style={styles.butonMetni}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Büyük Fotoğraf / Medya Önizleme Modalı */}
      <Modal
        visible={!!buyukFotoUrl}
        animationType="fade"
        transparent
        onRequestClose={() => setBuyukFotoUrl(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setBuyukFotoUrl(null)}
          >
            <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: buyukFotoUrl }}
            style={{ width: '100%', height: '80%' }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function olusturStiller(renkler) {
  return StyleSheet.create({
    kok: { flex: 1, backgroundColor: renkler.arkaplan },
    secenekSatiri: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: renkler.cizgi,
      flexDirection: 'row',
      alignItems: 'center',
    },
    secenekMetni: {
      color: renkler.metin,
      fontSize: 16,
      fontWeight: '600',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: bosluk.md,
      paddingVertical: bosluk.sm,
      backgroundColor: renkler.yuzey,
      borderBottomWidth: 1,
      borderBottomColor: renkler.cizgi,
    },
    headerSol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerLogo: { width: 36, height: 36, borderRadius: 10 },
    headerBaslik: { color: renkler.metin, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    headerAltyazi: { color: renkler.metinSoluk, fontSize: 11, marginTop: 1 },
    grupOlusturBtn: {
      backgroundColor: renkler.arkaplan,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    grupOlusturMetin: { color: renkler.metin, fontSize: 13, fontWeight: '600' },
    grupOlusturKarti: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      marginHorizontal: bosluk.md,
      marginTop: 10,
      marginBottom: 6,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    grupOlusturKartiIkon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 24 Saatlik Hikayeler Çubuğu
    hikayelerKapsayici: {
      paddingVertical: 10,
      backgroundColor: renkler.yuzey,
      borderBottomWidth: 1,
      borderBottomColor: renkler.cizgi,
    },
    hikayeListesi: { paddingHorizontal: bosluk.md, gap: 14, alignItems: 'center' },
    hikayeOgesi: { alignItems: 'center', width: 66 },
    hikayeHalka: {
      width: 58,
      height: 58,
      borderRadius: 29,
      padding: 2.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hikayeHalkaRenkli: {
      borderWidth: 2.5,
      borderColor: '#00a8ff',
    },
    hikayeHalkaAktif: {
      borderWidth: 2.5,
      borderColor: '#00a8ff',
    },
    hikayeHalkaGoruldu: {
      borderWidth: 2,
      borderColor: renkler.cizgi,
    },
    hikayeHalkaPasif: {
      borderWidth: 1.5,
      borderColor: renkler.cizgi,
      borderStyle: 'dashed',
    },
    hikayeResim: { width: '100%', height: '100%', borderRadius: 27 },
    hikayeArtiRozet: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      backgroundColor: '#00a8ff',
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: renkler.yuzey,
    },
    hikayeArtiMetin: { color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 14 },
    hikayeKullaniciAdi: { color: renkler.metin, fontSize: 11, marginTop: 4, textAlign: 'center' },

    // Arama Kutusu
    aramaKutusu: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: renkler.yuzey,
      marginHorizontal: bosluk.md,
      marginVertical: bosluk.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      paddingHorizontal: 12,
    },
    buyutecKutu: { width: 18, height: 18, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
    buyutecHalka: {
      width: 12, height: 12, borderRadius: 6,
      borderWidth: 1.8, borderColor: renkler.metinSoluk,
      position: 'absolute', top: 1, left: 1,
    },
    buyutecSap: {
      width: 2, height: 6, backgroundColor: renkler.metinSoluk,
      borderRadius: 1, position: 'absolute', bottom: 1, right: 2,
      transform: [{ rotate: '-45deg' }],
    },
    aramaGirdi: {
      flex: 1,
      color: renkler.metin,
      fontSize: 14,
      paddingVertical: 9,
    },
    aramaTemizle: { color: renkler.metinSoluk, fontSize: 14, padding: 4 },

    // Sekmeler (Tümü / Kişiler / Gruplar)
    sekmeler: { flexDirection: 'row', paddingHorizontal: bosluk.md, gap: 8, marginBottom: 6 },
    sekme: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: renkler.yuzey,
      borderWidth: 1,
      borderColor: renkler.cizgi,
    },
    sekmeAktif: { backgroundColor: renkler.kendiBalon, borderColor: renkler.kendiBalon },
    sekmeMetin: { color: renkler.metinSoluk, fontSize: 12, fontWeight: '600' },
    sekmeMetinAktif: { color: '#ffffff', fontWeight: '700' },

    bolumBaslik: {
      color: renkler.metinSoluk,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginHorizontal: bosluk.md,
      marginTop: 10,
      marginBottom: 4,
    },

    // Sohbet Satırı
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: bosluk.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: renkler.cizgi,
    },
    avatarKutu: { position: 'relative' },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarMetin: { color: renkler.metin, fontWeight: '700', fontSize: 18 },
    cevrimiciNokta: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#30d158',
      borderWidth: 2,
      borderColor: renkler.arkaplan,
    },
    satirOrta: { flex: 1, marginLeft: 12 },
    satirBaslik: { color: renkler.metin, fontSize: 16, fontWeight: '600' },
    satirAltyazi: { color: renkler.metinSoluk, fontSize: 12, marginTop: 3 },
    satirKameraButon: { padding: 6, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
    satirKameraDaire: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: renkler.yuzey,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      justifyContent: 'center',
      alignItems: 'center',
    },
    satirKameraGovde: {
      width: 15,
      height: 11,
      borderRadius: 2.5,
      borderWidth: 1.5,
      borderColor: renkler.metinSoluk,
    },
    satirKameraLens: {
      position: 'absolute',
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: renkler.metinSoluk,
    },
    rozet: {
      backgroundColor: '#00a8ff',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rozetMetin: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
    bosMetin: { color: renkler.metinSoluk, textAlign: 'center', marginVertical: 20 },
    ayarSatirAciklama: { color: renkler.metinSoluk, fontSize: 11, marginTop: 2 },

    // Alt Tab Çubuğu
    tabBari: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      flexDirection: 'row',
      backgroundColor: renkler.yuzey,
      borderTopWidth: 1,
      borderTopColor: renkler.cizgi,
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    tabButon: { alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative' },
    tabIkon: { fontSize: 20, opacity: 0.6 },
    tabIkonAktif: { opacity: 1 },
    tabMetin: { color: renkler.metinSoluk, fontSize: 10, marginTop: 2, fontWeight: '600' },
    tabMetinAktif: { color: '#00a8ff', fontWeight: '700' },
    tabRozet: {
      position: 'absolute',
      top: -2,
      right: 22,
      backgroundColor: '#ff453a',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    tabRozetMetin: { color: '#fff', fontSize: 9, fontWeight: '800' },

    // Keşfet Tab Stilleri
    kesfetKart: {
      flex: 1,
      aspectRatio: 0.8,
      margin: 5,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: renkler.yuzey,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      position: 'relative',
    },
    kesfetKartResim: { width: '100%', height: '100%' },
    kesfetKartBilgi: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 8,
      backgroundColor: 'rgba(0,0,0,0.65)',
    },
    kesfetKullanici: { color: '#fff', fontWeight: '700', fontSize: 12 },
    kesfetZaman: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
    videoRozet: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },

    // Hikaye Ekle Tab Stilleri
    hikayeSecimKart: {
      backgroundColor: renkler.yuzey,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    yeniHikayeOnizlemeKutu: {
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: renkler.yuzey,
      paddingBottom: 16,
    },
    yeniHikayeOnizlemeResim: { width: '100%', height: 380, borderRadius: 16 },
    yeniHikayeKapatButon: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hikayeMetinGirdi: {
      backgroundColor: renkler.arkaplan,
      color: renkler.metin,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      padding: 12,
      fontSize: 14,
      marginTop: 12,
    },

    // Profil Tab Stilleri
    profilKart: {
      backgroundColor: renkler.yuzey,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      padding: 20,
      alignItems: 'center',
      marginBottom: 20,
    },
    profilBuyukAvatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 8 },
    profilKameraIkonKutu: {
      position: 'absolute',
      bottom: 6,
      right: 0,
      backgroundColor: '#00a8ff',
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: renkler.yuzey,
    },
    profilKullaniciAdi: { color: renkler.metin, fontSize: 20, fontWeight: '700' },
    profilBiyografi: { color: renkler.metinSoluk, fontSize: 13, marginTop: 4, textAlign: 'center' },
    profilDogumTarihi: { color: renkler.vurgu || '#00a8ff', fontSize: 12, marginTop: 6, fontWeight: '600' },

    ayarGrupBaslik: {
      color: renkler.metinSoluk,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    ayarGrupKutu: {
      backgroundColor: renkler.yuzey,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      overflow: 'hidden',
      marginBottom: 20,
    },
    ayarSatiri: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: renkler.cizgi,
    },
    ayarSatirBaslik: { color: renkler.metin, fontSize: 15, fontWeight: '500' },
    ayarSatirOk: { color: renkler.metinSoluk, fontSize: 18 },
    cikisButon: {
      backgroundColor: 'rgba(255, 69, 58, 0.12)',
      borderWidth: 1,
      borderColor: '#ff453a',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    cikisButonMetin: { color: '#ff453a', fontSize: 15, fontWeight: '700' },

    // Tam Ekran Hikaye İzleyici
    hikayeTamEkranKok: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
    hikayeIlerlemeKutusu: {
      position: 'absolute',
      top: 38,
      left: 12,
      right: 12,
      zIndex: 10,
      flexDirection: 'row',
      gap: 4,
    },
    hikayeIlerlemeSegment: {
      flex: 1,
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 1.5,
      overflow: 'hidden',
    },
    hikayeIlerlemeDolu: { height: '100%', backgroundColor: '#ffffff' },
    hikayeDokunmaSatiri: {
      position: 'absolute',
      top: 90,
      bottom: 90,
      left: 0,
      right: 0,
      flexDirection: 'row',
      zIndex: 5,
    },
    hikayeDokunmaSol: {
      width: '35%',
      height: '100%',
    },
    hikayeDokunmaSag: {
      width: '65%',
      height: '100%',
    },
    hikayeHeader: {
      position: 'absolute',
      top: 50,
      left: 14,
      right: 14,
      zIndex: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    hikayeMedyaAlani: { width: '100%', height: '75%', justifyContent: 'center', alignItems: 'center' },
    hikayeMetinOverlay: {
      position: 'absolute',
      bottom: 70,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 12,
      borderRadius: 10,
    },
    hikayeMetinYazi: { color: '#fff', fontSize: 15, textAlign: 'center' },
    hikayeYaziKatmaniKutu: {
      position: 'absolute',
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      maxWidth: '85%',
      zIndex: 20,
    },
    hikayeYaziKatmaniMetin: {
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    },
    yaziKatmaniYariSaydam: {
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
    },
    hikayeGoruntuleyenlerButon: {
      position: 'absolute',
      bottom: 24,
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    hikayeYanitBar: {
      position: 'absolute',
      bottom: 24,
      right: 24,
    },
    hikayeKalpButon: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Modallar Genel
    modalArkaplan: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalKutu: {
      backgroundColor: renkler.yuzey,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: bosluk.lg,
      paddingBottom: 36,
      maxHeight: '85%',
    },
    modalBaslik: { color: renkler.metin, fontSize: 18, fontWeight: '700', marginBottom: bosluk.md },
    etiket: { color: renkler.metinSoluk, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    girdi: {
      backgroundColor: renkler.arkaplan,
      color: renkler.metin,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      borderRadius: 10,
      paddingHorizontal: bosluk.md,
      paddingVertical: 12,
      fontSize: 15,
    },
    uyeListesi: { marginBottom: bosluk.md, maxHeight: 180 },
    uyeSatiri: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    onayKutusu: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      marginRight: bosluk.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    onayKutusuSecili: { backgroundColor: renkler.kendiBalon, borderColor: renkler.kendiBalon },
    onayIsareti: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
    uyeMetin: { color: renkler.metin, fontSize: 15 },
    buton: { backgroundColor: renkler.kendiBalon, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    butonMetni: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
    ikincilButon: { paddingVertical: 14, alignItems: 'center' },
    ikincilButonMetni: { color: renkler.metinSoluk, fontSize: 14 },

    // Çıkış Onay Modalı
    onayModalArkaplan: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    onayModalKutu: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: renkler.yuzey,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: renkler.cizgi,
    },
    onayModalIkonDaire: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: 'rgba(255, 69, 58, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    onayModalBaslik: {
      color: renkler.metin,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    onayModalMesaj: {
      color: renkler.metinSoluk,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 22,
    },
    onayModalButonlar: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    onayModalVazgecButon: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    onayModalVazgecMetin: {
      color: renkler.metin,
      fontSize: 15,
      fontWeight: '600',
    },
    onayModalCikisButon: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#ff453a',
      alignItems: 'center',
      justifyContent: 'center',
    },
    onayModalCikisMetin: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
