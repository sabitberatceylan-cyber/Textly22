import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, BackHandler, AppState } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GirisKayitEkrani from './screens/GirisKayitEkrani';
import AnaSayfaEkrani from './screens/AnaSayfaEkrani';
import SohbetEkrani from './screens/SohbetEkrani';
import AyarlarEkrani from './screens/AyarlarEkrani';
import GuncellemeModal from './components/GuncellemeModal';
import { SoketSaglayici, useSoket } from './lib/soketBaglami';
import { TemaSaglayici, useTema } from './lib/temaBaglami';
import { ayarlariYukle, ayarlariKaydet, ayarlariTemizle } from './lib/depolama';
import { bildirimlerICinKurulumYap, tumBildirimleriTemizle } from './lib/bildirim';
import * as Notifications from 'expo-notifications';
import appConfig from './app.json';

const MEVCUT_VERSIYON_KODU = Number(appConfig?.expo?.android?.versionCode) || 509;
const SABIT_SUNUCU_URL = 'https://exzehub.com.tr';

function SoketGuncellemeDinleyici({ onYeniGuncelleme }) {
  const { guncellemeHaberi, guncellemeHaberiTemizle } = useSoket();
  useEffect(() => {
    if (guncellemeHaberi) {
      onYeniGuncelleme(guncellemeHaberi);
      guncellemeHaberiTemizle();
    }
  }, [guncellemeHaberi, onYeniGuncelleme, guncellemeHaberiTemizle]);
  return null;
}

function AnaIcerik() {
  const { renkler } = useTema();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [oturum, setOturum] = useState(null); // { sunucuAdres, kullanici, sifre, sonGorulmeGizli, bildirimlerKapali }
  const [ekran, setEkran] = useState('anasayfa'); // 'anasayfa' | 'sohbet' | 'ayarlar'
  const [aktifSohbet, setAktifSohbet] = useState(null);
  const [guncellemeBilgi, setGuncellemeBilgi] = useState(null);
  const [guncellemeModalAcik, setGuncellemeModalAcik] = useState(false);

  // Android geri tusu: uygulamadan direkt cikmak yerine bir onceki ekrana don
  useEffect(() => {
    const geriTusu = BackHandler.addEventListener('hardwareBackPress', () => {
      if (ekran === 'sohbet' || ekran === 'ayarlar') {
        setEkran('anasayfa');
        setAktifSohbet(null);
        return true; // varsayilan (uygulamadan cikma) davranisini engelle
      }
      return false; // ana sayfadaysak normal davransin (uygulamadan cik)
    });
    return () => geriTusu.remove();
  }, [ekran]);

  useEffect(() => {
    (async () => {
      const kayitli = await ayarlariYukle();
      if (kayitli) {
        const guncel = { ...kayitli, sunucuAdres: SABIT_SUNUCU_URL };
        setOturum(guncel);
        ayarlariKaydet(guncel);
      }
      setYukleniyor(false);
    })();
  }, []);

  // Uygulama açıldığında, bildirim tıklandığında ve arka plandan öne geldiğinde bildirimleri temizle
  useEffect(() => {
    tumBildirimleriTemizle();
    const abonelik = AppState.addEventListener('change', (yeniDurum) => {
      if (yeniDurum === 'active') {
        tumBildirimleriTemizle();
      }
    });

    const bildirimTiklamaAbonelik = Notifications.addNotificationResponseReceivedListener((yanit) => {
      tumBildirimleriTemizle();
      const veri = yanit?.notification?.request?.content?.data;
      const anahtar = veri?.anahtar || yanit?.notification?.request?.identifier?.replace('sohbet-', '');
      if (anahtar && oturum) {
        if (anahtar.startsWith('kisi:')) {
          const kisiAdi = anahtar.replace('kisi:', '');
          setAktifSohbet({ hedefTuru: 'kisi', hedef: kisiAdi, baslik: kisiAdi });
          setEkran('sohbet');
        } else if (anahtar.startsWith('grup:')) {
          const grupId = anahtar.replace('grup:', '');
          setAktifSohbet({ hedefTuru: 'grup', hedef: grupId, baslik: 'Grup' });
          setEkran('sohbet');
        }
      }
    });

    return () => {
      abonelik.remove();
      bildirimTiklamaAbonelik.remove();
    };
  }, [oturum]);

  useEffect(() => {
    if (oturum) {
      bildirimlerICinKurulumYap(oturum.sunucuAdres, oturum.kullanici, oturum.sifre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturum?.sunucuAdres, oturum?.kullanici, oturum?.sifre]);

  const guncellemeKontrolEt = useCallback((adres) => {
    if (!adres) return;
    const temiz = String(adres).trim().replace(/\/$/, '');
    fetch(`${temiz}/guncelleme-kontrol`)
      .then((r) => r.json())
      .then((veri) => {
        if (veri && veri.tamam && Number(veri.versiyonKodu) > MEVCUT_VERSIYON_KODU) {
          setGuncellemeBilgi(veri);
          setGuncellemeModalAcik(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    guncellemeKontrolEt(oturum?.sunucuAdres || SABIT_SUNUCU_URL);
  }, [oturum?.sunucuAdres, guncellemeKontrolEt]);

  const girisYapildi = useCallback(async (yeniOturum) => {
    const oturumObj = { ...yeniOturum, sunucuAdres: SABIT_SUNUCU_URL };
    await ayarlariKaydet(oturumObj);
    setOturum(oturumObj);
    guncellemeKontrolEt(SABIT_SUNUCU_URL);
  }, [guncellemeKontrolEt]);

  const adresGuncelle = useCallback(async () => {
    setOturum((mevcut) => {
      const guncel = { ...mevcut, sunucuAdres: SABIT_SUNUCU_URL };
      ayarlariKaydet(guncel);
      return guncel;
    });
    guncellemeKontrolEt(SABIT_SUNUCU_URL);
  }, [guncellemeKontrolEt]);

  const ayarGuncellendi = useCallback((kismiAyar) => {
    setOturum((mevcut) => {
      const guncel = { ...mevcut, ...kismiAyar, sunucuAdres: SABIT_SUNUCU_URL };
      ayarlariKaydet(guncel);
      return guncel;
    });
  }, []);

  const cikisYap = useCallback(async () => {
    await ayarlariTemizle();
    setOturum(null);
    setEkran('anasayfa');
    setAktifSohbet(null);
  }, []);

  if (yukleniyor) {
    return (
      <View style={[styles.yukleniyorKok, { backgroundColor: renkler.arkaplan }]}>
        <ActivityIndicator color={renkler.metin} size="large" />
      </View>
    );
  }

  if (!oturum) {
    return (
      <View style={[styles.kok, { backgroundColor: renkler.arkaplan }]}>
        <GirisKayitEkrani onGiris={girisYapildi} />
        <GuncellemeModal
          visible={guncellemeModalAcik}
          bilgi={guncellemeBilgi}
          sunucuAdres={SABIT_SUNUCU_URL}
          onKapat={() => setGuncellemeModalAcik(false)}
        />
      </View>
    );
  }

  return (
    <SoketSaglayici sunucuAdres={oturum.sunucuAdres} kullanici={oturum.kullanici} sifre={oturum.sifre}>
      <View style={[styles.kok, { backgroundColor: renkler.arkaplan }]}>
        {ekran === 'sohbet' && aktifSohbet ? (
          <SohbetEkrani
            sunucuAdres={oturum.sunucuAdres}
            kullanici={oturum.kullanici}
            sifre={oturum.sifre}
            hedefTuru={aktifSohbet.hedefTuru}
            hedef={aktifSohbet.hedef}
            baslik={aktifSohbet.baslik}
            uyeler={aktifSohbet.uyeler}
            yonetici={aktifSohbet.yonetici}
            yoneticiler={aktifSohbet.yoneticiler}
            resimUrl={aktifSohbet.resimUrl}
            engellenenler={oturum.engellenenler || []}
            sessizeAlinanlar={oturum.sessizeAlinanlar || []}
            ilkMedya={aktifSohbet.ilkMedya}
            ilkYaziKatmani={aktifSohbet.ilkYaziKatmani}
            ilkBaslik={aktifSohbet.ilkBaslik}
            ilkTekGorunum={aktifSohbet.ilkTekGorunum}
            onAyarGuncellendi={ayarGuncellendi}
            onSohbetGecis={setAktifSohbet}
            onGeri={() => { setEkran('anasayfa'); setAktifSohbet(null); }}
          />
        ) : ekran === 'ayarlar' ? (
          <AyarlarEkrani
            sunucuAdres={oturum.sunucuAdres}
            kullanici={oturum.kullanici}
            sifre={oturum.sifre}
            sonGorulmeGizli={!!oturum.sonGorulmeGizli}
            bildirimlerKapali={!!oturum.bildirimlerKapali}
            dogumTarihiGizli={!!oturum.dogumTarihiGizli}
            okunduBilgisiGizli={!!oturum.okunduBilgisiGizli}
            onAyarGuncellendi={ayarGuncellendi}
            onAdresGuncelle={adresGuncelle}
            onCikis={cikisYap}
            onGeri={() => setEkran('anasayfa')}
          />
        ) : (
          <AnaSayfaEkrani
            sunucuAdres={oturum.sunucuAdres}
            kullanici={oturum.kullanici}
            sifre={oturum.sifre}
            oturum={oturum}
            onAyarGuncellendi={ayarGuncellendi}
            onCikis={cikisYap}
            onAdresGuncelle={adresGuncelle}
            onSohbetAc={(hedef) => { setAktifSohbet(hedef); setEkran('sohbet'); }}
            onAyarlarAc={() => setEkran('ayarlar')}
          />
        )}

        {/* Canlı Soket Güncelleme Dinleyicisi */}
        <SoketGuncellemeDinleyici
          onYeniGuncelleme={(hab) => {
            if (Number(hab.versiyonKodu) > MEVCUT_VERSIYON_KODU) {
              setGuncellemeBilgi(hab);
              setGuncellemeModalAcik(true);
            }
          }}
        />

        {/* Otomatik Güncelleme Modalı */}
        <GuncellemeModal
          visible={guncellemeModalAcik}
          bilgi={guncellemeBilgi}
          sunucuAdres={oturum?.sunucuAdres}
          onKapat={() => setGuncellemeModalAcik(false)}
        />
      </View>
    </SoketSaglayici>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TemaSaglayici>
        <StatusBar barStyle="light-content" />
        <ExpoStatusBar style="auto" />
        <AnaIcerik />
      </TemaSaglayici>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  yukleniyorKok: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
