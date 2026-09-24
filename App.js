import React, { useEffect, useState, useCallback, useRef } from 'react';

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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { grupBilgiGetir } from './lib/api';
import appConfig from './app.json';


const MEVCUT_VERSIYON_KODU = Number(appConfig?.expo?.android?.versionCode) || 516;


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

  const sonIslenenBildirimRef = useRef(null);
  const sogukAcilisKontrolEdildiRef = useRef(false);

  const bildirimleSohbetAc = useCallback((yanit) => {
    if (!yanit || !oturum) return;
    const veri = yanit?.notification?.request?.content?.data;
    const anahtar = veri?.anahtar || yanit?.notification?.request?.identifier?.replace('sohbet-', '');
    if (!anahtar) return;

    // Aynı bildirimin tekrar tekrar açılmasını ve geri tuşuna basınca tekrar gruba girilmesini önle
    const bildirimId = String(
      yanit?.notification?.request?.identifier ||
      `${anahtar}_${yanit?.notification?.date || ''}_${veri?.zaman || ''}`
    );
    if (sonIslenenBildirimRef.current === bildirimId) return;
    sonIslenenBildirimRef.current = bildirimId;

    tumBildirimleriTemizle();

    if (anahtar.startsWith('kisi:')) {
      const kisiAdi = anahtar.replace('kisi:', '');
      const bildirimResim = veri?.profilResimUrl || null;
      setAktifSohbet({ hedefTuru: 'kisi', hedef: kisiAdi, baslik: kisiAdi, resimUrl: bildirimResim });
      setEkran('sohbet');
    } else if (anahtar.startsWith('grup:')) {
      const grupId = anahtar.replace('grup:', '');
      const bildirimBaslik = veri?.grupIsim || veri?.title || yanit?.notification?.request?.content?.title || 'Grup';
      // Grupta grup resmi yoksa ASLA gönderenin profil resmini grubun resmi gibi gösterme!
      const bildirimGrupResim = veri?.grupResimUrl || null;

      // İlk olarak bildirimdeki bilgilerle hemen aç
      setAktifSohbet({
        hedefTuru: 'grup',
        hedef: grupId,
        baslik: bildirimBaslik,
        resimUrl: bildirimGrupResim,
      });
      setEkran('sohbet');

      // Ardından yerel grup önbelleğinden detayları (üyeler, yöneticiler, resim vb.) yükle
      AsyncStorage.getItem(`@textly_gruplar_cache_${oturum.kullanici}`)
        .then((raw) => {
          if (raw) {
            const list = JSON.parse(raw);
            const bul = (list || []).find((g) => String(g?.id) === String(grupId));
            if (bul) {
              setAktifSohbet((mevcut) => {
                if (mevcut && String(mevcut.hedef) === String(grupId)) {
                  return {
                    ...mevcut,
                    baslik: bul.isim || mevcut.baslik,
                    uyeler: bul.uyeler || [],
                    yonetici: bul.yonetici,
                    yoneticiler: Array.isArray(bul.yoneticiler) ? bul.yoneticiler : (bul.yonetici ? [bul.yonetici] : []),
                    resimUrl: bul.resimUrl || mevcut.resimUrl,
                  };
                }
                return mevcut;
              });
            }
          }
        })
        .catch(() => {});

      // Sunucudan taze grup detaylarını anında al
      grupBilgiGetir(oturum.sunucuAdres, oturum.kullanici, oturum.sifre, grupId)
        .then((res) => {
          if (res && res.tamam && res.grup) {
            setAktifSohbet((mevcut) => {
              if (mevcut && String(mevcut.hedef) === String(grupId)) {
                return {
                  ...mevcut,
                  baslik: res.grup.isim || mevcut.baslik,
                  uyeler: res.grup.uyeler || [],
                  yonetici: res.grup.yonetici,
                  yoneticiler: Array.isArray(res.grup.yoneticiler) ? res.grup.yoneticiler : (res.grup.yonetici ? [res.grup.yonetici] : []),
                  resimUrl: res.grup.resimUrl || mevcut.resimUrl,
                };
              }
              return mevcut;
            });
          }
        })
        .catch(() => {});
    }
  }, [oturum]);

  // Uygulama açıldığında, bildirim tıklandığında ve arka plandan öne geldiğinde bildirimleri temizle
  useEffect(() => {
    tumBildirimleriTemizle();
    const abonelik = AppState.addEventListener('change', (yeniDurum) => {
      if (yeniDurum === 'active') {
        tumBildirimleriTemizle();
      }
    });

    const bildirimTiklamaAbonelik = Notifications.addNotificationResponseReceivedListener((yanit) => {
      bildirimleSohbetAc(yanit);
    });

    // Soğuk açılış (cold start): Uygulama kapalıyken bildirime tıklandıysa SADECE BİR KEZ çalıştır
    if (!sogukAcilisKontrolEdildiRef.current && oturum) {
      sogukAcilisKontrolEdildiRef.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((yanit) => {
          if (yanit) {
            bildirimleSohbetAc(yanit);
          }
        })
        .catch(() => {});
    }

    return () => {
      abonelik.remove();
      bildirimTiklamaAbonelik.remove();
    };
  }, [bildirimleSohbetAc, oturum]);



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
