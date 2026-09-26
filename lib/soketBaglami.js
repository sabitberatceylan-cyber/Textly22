import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onbellegeKaydet } from './mesajOnbellek';
import { yerelBildirimGoster, bildirimSayaciniSifirla, tumBildirimleriTemizle } from './bildirim';
import { medyaAdresi, gruplariGetir } from './api';
import { sohbetTemasiniKaydet } from './temalar';

const SoketBaglami = createContext(null);

function wsAdresiYap(httpAdres, kullanici, sifre) {
  const taban = httpAdres.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  return `${taban}/?kullanici=${encodeURIComponent(kullanici)}&sifre=${encodeURIComponent(sifre)}`;
}

function anahtarHesaplaMesajdan(kullanici, mesaj) {
  if (mesaj.hedefTuru === 'grup') return `grup:${String(mesaj.hedef)}`;
  if (mesaj.sohbetKisi) return `kisi:${mesaj.sohbetKisi}`;
  const digerTaraf = (mesaj.gonderen && mesaj.gonderen.toLowerCase() === (kullanici || '').toLowerCase()) ? mesaj.hedef : mesaj.gonderen;
  return `kisi:${digerTaraf}`;
}

export function kisiAnahtari(kullaniciAdi) {
  return `kisi:${kullaniciAdi}`;
}
export function grupAnahtari(grupId) {
  return `grup:${String(grupId)}`;
}

export function kullaniciBahsedildiMi(mesajMetni, kullaniciAdi) {
  if (!mesajMetni || typeof mesajMetni !== 'string' || !kullaniciAdi) return false;
  if (/@herkes(?:\b|[\s.,!?\-_()]|$)/i.test(mesajMetni) || /@all(?:\b|[\s.,!?\-_()]|$)/i.test(mesajMetni)) {
    return true;
  }
  const kAdi = String(kullaniciAdi).trim().toLowerCase();
  const parcalar = mesajMetni.match(/@[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+/gi) || [];
  return parcalar.some((p) => p.slice(1).toLowerCase() === kAdi);
}

export function SoketSaglayici({ sunucuAdres, kullanici, sifre, children }) {
  const [baglandi, setBaglandi] = useState(false);
  const [sonHata, setSonHata] = useState(null);
  const [sonIslemHatasi, setSonIslemHatasi] = useState(null);
  const [mesajDeposu, setMesajDeposu] = useState({}); // { anahtar: [mesaj,...] }
  const [sonMesajZamanlari, setSonMesajZamanlari] = useState({}); // { anahtar: timestamp }
  const [sonMesajlar, setSonMesajlar] = useState({}); // { anahtar: { metin, zaman, gonderen, ... } }
  const [temaHaberleri, setTemaHaberleri] = useState(null); // { anahtar, temaId, temaIsmi, kullanici, zaman }
  const [okunmamisSayilar, setOkunmamisSayilar] = useState({}); // { anahtar: sayi }
  const [kullaniciDurumlari, setKullaniciDurumlari] = useState({}); // { kullaniciAdi: {cevrimici, sonGorulme} }
  const [yaziyorlar, setYaziyorlar] = useState({}); // { anahtar: { kullaniciAdi: true } }
  const [grupGuncellemeSayaci, setGrupGuncellemeSayaci] = useState(0);
  const [grupBilgileri, setGrupBilgileri] = useState({}); // { grupId: {isim, uyeler, yonetici} }
  const [gruplar, setGruplar] = useState([]); // Persistent gruplar listesi (sohbetler ve ekran geçişlerinde asla kaybolmaz)
  const [gizlenenSohbetler, setGizlenenSohbetler] = useState([]); // [anahtar, ...]
  const [guncellemeHaberi, setGuncellemeHaberi] = useState(null);
  const [sohbetTemizlemeZamanlari, setSohbetTemizlemeZamanlari] = useState({}); // { [anahtar]: timestamp }

  useEffect(() => {
    (async () => {
      try {
        const kayitli = await AsyncStorage.getItem(`@textly_sohbet_temizleme_${kullanici}`);
        if (kayitli) {
          const parsed = JSON.parse(kayitli);
          if (parsed && typeof parsed === 'object') {
            setSohbetTemizlemeZamanlari(parsed);
          }
        }
      } catch {}
    })();
  }, [kullanici]);


  // Grupları yerel önbellekten anında yükle (ekran açıldığında boş kalmaz)
  useEffect(() => {
    (async () => {
      try {
        const kayitli = await AsyncStorage.getItem(`@textly_gruplar_cache_${kullanici}`);
        if (kayitli) {
          const parsed = JSON.parse(kayitli);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGruplar(parsed);
            const bil = {};
            parsed.forEach((g) => {
              if (g && g.id) {
                bil[String(g.id)] = {
                  isim: g.isim,
                  uyeler: g.uyeler || [],
                  yonetici: g.yonetici,
                  yoneticiler: Array.isArray(g.yoneticiler) ? g.yoneticiler : (g.yonetici ? [g.yonetici] : []),
                  resimUrl: g.resimUrl || null,
                  aciklama: g.aciklama || '',
                };
              }
            });
            setGrupBilgileri((eski) => ({ ...bil, ...eski }));
          }
        }
      } catch {}
    })();
  }, [kullanici]);

  // Gizlenen sohbetleri yerel önbellekten yükle
  useEffect(() => {
    (async () => {
      try {
        const kayitli = await AsyncStorage.getItem(`@textly_gizlenen_${kullanici}`);
        if (kayitli) {
          const parsed = JSON.parse(kayitli);
          if (Array.isArray(parsed)) {
            setGizlenenSohbetler(parsed);
          }
        }
      } catch {}
    })();
  }, [kullanici]);

  const yaziyorZamanlayicilari = useRef({}); // "anahtar:kullanici" -> timeout

  const soketRef = useRef(null);
  const kapatildiMi = useRef(false);
  const yenidenBaglanZamanlayici = useRef(null);
  const geciciSayac = useRef(0);
  const aktifAnahtarRef = useRef(null); // su an ekranda acik olan sohbet

  const gruplariAyarla = useCallback((gelenGruplar) => {
    if (!Array.isArray(gelenGruplar)) return;

    setGruplar((mevcut) => {
      const mevcutMap = new Map();
      (mevcut || []).forEach((g) => {
        if (g && g.id) mevcutMap.set(String(g.id), g);
      });

      // gelenGruplar yetkili kaynaktır; sunucuda silinen eski grupları diriltmeyiz!
      const guncelGruplar = gelenGruplar.map((g) => {
        const eski = mevcutMap.get(String(g.id));
        return {
          ...g,
          id: String(g.id),
          resimUrl: g.resimUrl || eski?.resimUrl || null,
          aciklama: g.aciklama !== undefined ? g.aciklama : (eski?.aciklama || ''),
        };
      });

      AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(guncelGruplar)).catch(() => {});
      return guncelGruplar;
    });

    const bil = {};
    gelenGruplar.forEach((g) => {
      if (g && g.id) {
        bil[String(g.id)] = {
          isim: g.isim,
          uyeler: g.uyeler || [],
          yonetici: g.yonetici,
          yoneticiler: Array.isArray(g.yoneticiler) ? g.yoneticiler : (g.yonetici ? [g.yonetici] : []),
          resimUrl: g.resimUrl || null,
          aciklama: g.aciklama || '',
        };
      }
    });
    setGrupBilgileri(bil);
  }, [kullanici]);

  const grupBilgiGuncelleTekil = useCallback((g) => {
    if (!g || !g.id) return;
    const gId = String(g.id);
    setGrupBilgileri((eski) => ({
      ...eski,
      [gId]: {
        isim: g.isim,
        uyeler: g.uyeler || [],
        yonetici: g.yonetici,
        yoneticiler: Array.isArray(g.yoneticiler) ? g.yoneticiler : (g.yonetici ? [g.yonetici] : []),
        resimUrl: g.resimUrl || null,
        aciklama: g.aciklama || '',
      },
    }));
    setGruplar((mevcut) => {
      const varMi = (mevcut || []).some((item) => String(item.id) === gId);
      let yeni;
      if (varMi) {
        yeni = (mevcut || []).map((item) => (String(item.id) === gId ? { ...item, ...g } : item));
      } else {
        yeni = [g, ...(mevcut || [])];
      }
      AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
      return yeni;
    });
  }, [kullanici]);

  const baglan = useCallback(() => {
    if (kapatildiMi.current) return;
    // Zaten acik ya da baglanmakta olan bir soket varsa ikinci bir tane ACMA.
    // (Ayni cihazdan cift baglanti = sunucunun "baska cihazdan giris" sanip
    // eskisini atmasi ve surekli kopma dongusune girmesinin asil sebebiydi.)
    if (soketRef.current && (soketRef.current.readyState === WebSocket.OPEN || soketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    clearTimeout(yenidenBaglanZamanlayici.current);

    const ws = new WebSocket(wsAdresiYap(sunucuAdres, kullanici, sifre));
    soketRef.current = ws;

    ws.onopen = () => {
      setBaglandi(true);
      setSonHata(null);
      const aktifMi = AppState.currentState === 'active';
      ws.send(JSON.stringify({
        tip: 'aktif-sohbet',
        anahtar: aktifMi ? (aktifAnahtarRef.current || null) : null,
        arkaPlan: !aktifMi,
      }));
      gruplariGetir(sunucuAdres, kullanici, sifre)
        .then((res) => {
          if (res && res.tamam && Array.isArray(res.liste)) {
            gruplariAyarla(res.liste);
          }
        })
        .catch(() => {});
    };

    ws.onmessage = (olay) => {
      let veri;
      try { veri = JSON.parse(olay.data); } catch { return; }

      if (veri.tip === 'hosgeldin') return;

      if (veri.tip === 'durum-degisti') {
        setKullaniciDurumlari((mevcut) => ({
          ...mevcut,
          [veri.kullanici]: { cevrimici: veri.cevrimici, sonGorulme: veri.sonGorulme },
        }));
        return;
      }

      if (veri.tip === 'yaziyor' || veri.tip === 'yazmayi-birakti') {
        const anahtar = veri.hedefTuru === 'grup' ? grupAnahtari(veri.hedef) : kisiAnahtari(veri.kullanici);
        const zamanlayiciAnahtari = `${anahtar}:${veri.kullanici}`;
        clearTimeout(yaziyorZamanlayicilari.current[zamanlayiciAnahtari]);

        if (veri.tip === 'yaziyor') {
          setYaziyorlar((mevcut) => ({
            ...mevcut,
            [anahtar]: { ...(mevcut[anahtar] || {}), [veri.kullanici]: true },
          }));
          // Guvenlik agi: "yazmayi-birakti" mesaji kaybolursa 5 sn sonra otomatik temizle
          yaziyorZamanlayicilari.current[zamanlayiciAnahtari] = setTimeout(() => {
            setYaziyorlar((mevcut) => {
              const kopya = { ...(mevcut[anahtar] || {}) };
              delete kopya[veri.kullanici];
              return { ...mevcut, [anahtar]: kopya };
            });
          }, 5000);
        } else {
          setYaziyorlar((mevcut) => {
            const kopya = { ...(mevcut[anahtar] || {}) };
            delete kopya[veri.kullanici];
            return { ...mevcut, [anahtar]: kopya };
          });
        }
        return;
      }

      if (veri.tip === 'mesaj') {
        const anahtar = anahtarHesaplaMesajdan(kullanici, veri);
        setMesajDeposu((mevcut) => {
          const liste = mevcut[anahtar] || [];
          if (liste.some((m) => m.id === veri.id)) return mevcut;
          return {
            ...mevcut,
            [anahtar]: [
              ...liste,
              {
                id: veri.id,
                gonderen: veri.gonderen,
                hedefTuru: veri.hedefTuru,
                hedef: veri.hedef,
                metin: veri.metin,
                zaman: veri.zaman,
                durum: 'gonderildi',
                yanit: veri.yanit || null,
                begenenler: [],
                okuyanlar: veri.okuyanlar || [],
                sistem: !!veri.sistem,
                medyaUrl: veri.medyaUrl || null,
                medyaTuru: veri.medyaTuru || null,
                stickerTuru: veri.stickerTuru || null,
                mimeTuru: veri.mimeTuru || null,
                tekGorunum: !!veri.tekGorunum,
                tekGorunumGoruldu: !!veri.tekGorunumGoruldu,
                sure: veri.sure || null,
              },
            ],
          };
        });
        setSonMesajZamanlari((mevcut) => ({ ...mevcut, [anahtar]: veri.zaman }));
        setSonMesajlar((mevcut) => ({
          ...mevcut,
          [anahtar]: {
            id: veri.id,
            metin: veri.metin || '',
            gonderen: veri.gonderen,
            zaman: veri.zaman,
            medyaTuru: veri.medyaTuru || null,
            medyaUrl: veri.medyaUrl || null,
            tekGorunum: !!veri.tekGorunum,
            sistem: !!veri.sistem,
          },
        }));
        setGizlenenSohbetler((mevcut) => {
          if (!mevcut.includes(anahtar)) return mevcut;
          const yeni = mevcut.filter((k) => k !== anahtar);
          AsyncStorage.setItem(`@textly_gizlenen_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
          return yeni;
        });
        const simdi = Date.now();
        const cevrimeGecikmis = !!veri.bekleyen || (simdi - (veri.zaman || 0) > 3000);
        if (aktifAnahtarRef.current !== anahtar && !veri.sistem) {
          setOkunmamisSayilar((mevcut) => ({ ...mevcut, [anahtar]: (mevcut[anahtar] || 0) + 1 }));
          // Kullanıcı uygulama içindeyken (ama farklı sohbetteyken) bildirim göster
          // Arka plandayken zaten doğrudan sunucu (FCM) bildirim gönderdiği için çift bildirim çıkmaz
          if (!cevrimeGecikmis && AppState.currentState === 'active') {
            const bahsedildiMi = veri.hedefTuru === 'grup' && kullaniciBahsedildiMi(veri.metin, kullanici);
            const baslik = veri.hedefTuru === 'grup'
              ? (bahsedildiMi ? `${veri.grupIsim || 'Grup'} (Senden bahsetti)` : (veri.grupIsim || 'Grup'))
              : veri.gonderen;
            const govde = veri.hedefTuru === 'grup' ? `${veri.gonderen}: ${veri.metin}` : veri.metin;
            const resim = veri.profilResimUrl ? medyaAdresi(sunucuAdres, kullanici, sifre, veri.profilResimUrl) : null;
            yerelBildirimGoster(anahtar, baslik, govde, resim);
          }
        }
        return;
      }

      if (veri.tip === 'onay') {
        setMesajDeposu((mevcut) => {
          const yeni = { ...mevcut };
          for (const anahtar of Object.keys(yeni)) {
            const idx = yeni[anahtar].findIndex((m) => m.gecici === veri.gecici);
            if (idx !== -1) {
              const kopya = [...yeni[anahtar]];
              kopya[idx] = { ...kopya[idx], id: veri.id, durum: 'gonderildi', gecici: undefined };
              yeni[anahtar] = kopya;
              break;
            }
          }
          return yeni;
        });
        return;
      }

      if (veri.tip === 'begeni-guncelle') {
        setMesajDeposu((mevcut) => {
          const yeni = { ...mevcut };
          const sId = String(veri.id);
          for (const anahtar of Object.keys(yeni)) {
            const idx = (yeni[anahtar] || []).findIndex((m) => String(m.id) === sId);
            if (idx !== -1) {
              const kopya = [...yeni[anahtar]];
              kopya[idx] = { ...kopya[idx], begenenler: veri.begenenler };
              yeni[anahtar] = kopya;
              break;
            }
          }
          return yeni;
        });
        return;
      }

      if (veri.tip === 'mesaj-duzenlendi') {
        setMesajDeposu((mevcut) => {
          const yeni = { ...mevcut };
          const sId = String(veri.id);
          for (const anahtar of Object.keys(yeni)) {
            const idx = (yeni[anahtar] || []).findIndex((m) => String(m.id) === sId);
            if (idx !== -1) {
              const kopya = [...yeni[anahtar]];
              kopya[idx] = { ...kopya[idx], metin: veri.yeniMetin, duzenlendi: true };
              yeni[anahtar] = kopya;
              break;
            }
          }
          return yeni;
        });
        return;
      }

      if (veri.tip === 'mesaj-silindi') {
        setMesajDeposu((mevcut) => {
          const yeni = { ...mevcut };
          const sId = String(veri.id);
          for (const anahtar of Object.keys(yeni)) {
            const idx = (yeni[anahtar] || []).findIndex((m) => String(m.id) === sId);
            if (idx !== -1) {
              const kopya = [...yeni[anahtar]];
              kopya[idx] = { ...kopya[idx], metin: '', silindi: true };
              yeni[anahtar] = kopya;
              break;
            }
          }
          return yeni;
        });
        return;
      }

      if (veri.tip === 'islem-hatasi') {
        setSonIslemHatasi({ islem: veri.islem, id: veri.id, hata: veri.hata, zaman: Date.now() });
        if (veri.islem === 'mesaj') {
          // Gonderilmekte olan gecici mesaji hata durumuna getir
          setMesajDeposu((mevcut) => {
            const yeni = { ...mevcut };
            for (const anahtar of Object.keys(yeni)) {
              const liste = yeni[anahtar];
              if (!liste) continue;
              const idx = liste.findIndex((m) => m.durum === 'gonderiliyor');
              if (idx !== -1) {
                const kopya = [...liste];
                kopya[idx] = { ...kopya[idx], durum: 'hata' };
                yeni[anahtar] = kopya;
                break;
              }
            }
            return yeni;
          });
        }
        return;
      }

      if (veri.tip === 'grup-guncellendi') {
        setGrupGuncellemeSayaci((n) => n + 1);
        const gId = String(veri.grupId);
        const benKucuk = (kullanici || '').trim().toLowerCase();
        const uyeler = Array.isArray(veri.uyeler) ? veri.uyeler : [];
        const cikarilanKucuk = (veri.cikarilan || '').trim().toLowerCase();
        const benUyeMiyim = uyeler.some((u) => (u || '').trim().toLowerCase() === benKucuk) && cikarilanKucuk !== benKucuk;

        if (!benUyeMiyim) {
          // Bu grupta artık üye değiliz! Grubu, mesajlarını ve önbelleğini tamamen temizle
          setGruplar((mevcut) => {
            const yeni = (mevcut || []).filter((g) => String(g.id) !== gId);
            AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
            return yeni;
          });
          setGrupBilgileri((mevcut) => {
            const kopya = { ...mevcut };
            delete kopya[gId];
            return kopya;
          });
          setMesajDeposu((mevcut) => {
            const kopya = { ...mevcut };
            delete kopya[`grup:${gId}`];
            return kopya;
          });
          onbellegeKaydet(`grup:${gId}`, []);
          return;
        }

        setGrupBilgileri((mevcut) => ({
          ...mevcut,
          [gId]: {
            isim: veri.isim,
            uyeler: veri.uyeler,
            yonetici: veri.yonetici,
            yoneticiler: Array.isArray(veri.yoneticiler) ? veri.yoneticiler : (veri.yonetici ? [veri.yonetici] : []),
            resimUrl: veri.resimUrl,
            aciklama: veri.aciklama,
          },
        }));


        setGruplar((mevcut) => {
          const varMi = (mevcut || []).some((g) => String(g.id) === gId);
          let yeni;
          if (varMi) {
            yeni = (mevcut || []).map((g) => {
              if (String(g.id) === gId) {
                return {
                  ...g,
                  isim: veri.isim || g.isim,
                  uyeler: veri.uyeler || g.uyeler,
                  yonetici: veri.yonetici || g.yonetici,
                  yoneticiler: Array.isArray(veri.yoneticiler) ? veri.yoneticiler : (veri.yonetici ? [veri.yonetici] : (g.yoneticiler || [])),
                  resimUrl: veri.resimUrl !== undefined ? veri.resimUrl : g.resimUrl,
                  aciklama: veri.aciklama !== undefined ? veri.aciklama : g.aciklama,
                };
              }
              return g;
            });
          } else {
            yeni = [
              {
                id: gId,
                isim: veri.isim || 'Grup',
                uyeler: veri.uyeler || [],
                yonetici: veri.yonetici,
                yoneticiler: Array.isArray(veri.yoneticiler) ? veri.yoneticiler : (veri.yonetici ? [veri.yonetici] : []),
                resimUrl: veri.resimUrl || null,
                aciklama: veri.aciklama || '',
                olusturuldu: veri.olusturuldu || Date.now(),
              },
              ...(mevcut || []),
            ];
          }
          AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
          return yeni;
        });

        if (veri.olusturuldu) {
          setSonMesajZamanlari((mevcut) => ({
            ...mevcut,
            [`grup:${gId}`]: mevcut[`grup:${gId}`] || veri.olusturuldu,
          }));
        }
        return;
      }

      if (veri.tip === 'grup-listesi' && Array.isArray(veri.gruplar)) {
        gruplariAyarla(veri.gruplar);
        const zamanlar = {};
        veri.gruplar.forEach((g) => {
          if (g && g.id) {
            const z = g.sonMesajZamani || g.olusturuldu;
            if (z) zamanlar[grupAnahtari(g.id)] = z;
          }
        });
        if (Object.keys(zamanlar).length > 0) {
          setSonMesajZamanlari((mevcut) => ({ ...zamanlar, ...mevcut }));
        }
        setGrupGuncellemeSayaci((n) => n + 1);
        return;
      }

      if (veri.tip === 'grup-silindi') {
        const silinenId = String(veri.grupId);
        setGruplar((mevcut) => {
          const yeni = (mevcut || []).filter((g) => String(g.id) !== silinenId);
          AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
          return yeni;
        });
        setGrupBilgileri((mevcut) => {
          const kopya = { ...mevcut };
          delete kopya[silinenId];
          return kopya;
        });
        setMesajDeposu((mevcut) => {
          const kopya = { ...mevcut };
          delete kopya[`grup:${silinenId}`];
          return kopya;
        });
        onbellegeKaydet(`grup:${silinenId}`, []);
        setGrupGuncellemeSayaci((n) => n + 1);
        return;
      }

      if (veri.tip === 'okundu-bildirim' && Array.isArray(veri.idler)) {
        // idler formatı: [{ id, zaman }] veya eski format [id] — her ikisini de destekle
        const idZamanHarita = {};
        veri.idler.forEach((item) => {
          if (item && typeof item === 'object') {
            idZamanHarita[String(item.id)] = item.zaman;
            idZamanHarita[Number(item.id)] = item.zaman;
          } else {
            idZamanHarita[String(item)] = null;
            idZamanHarita[Number(item)] = null;
          }
        });
        const idSeti = new Set(Object.keys(idZamanHarita).map(Number).concat(Object.keys(idZamanHarita)));
        setMesajDeposu((mevcut) => {
          const yeni = { ...mevcut };
          let degisti = false;
          for (const anahtar of Object.keys(yeni)) {
            const liste = yeni[anahtar];
            if (!liste) continue;
            let listeDegisti = false;
            const yeniListe = liste.map((m) => {
              if (idSeti.has(m.id) || idSeti.has(String(m.id))) {
                listeDegisti = true;
                const gorulmeTarihi = idZamanHarita[m.id] || idZamanHarita[String(m.id)] || null;
                if (m.hedefTuru === 'grup') {
                  const mevcutOkuyanlar = m.okuyanlar || [];
                  const yeniOkuyanlar = mevcutOkuyanlar.some((u) => (u || '').toLowerCase() === (veri.kullanici || '').toLowerCase())
                    ? mevcutOkuyanlar
                    : [...mevcutOkuyanlar, veri.kullanici];
                  const yeniOkuyanZamanlar = { ...(m.okuyanZamanlar || {}) };
                  if (gorulmeTarihi) yeniOkuyanZamanlar[veri.kullanici] = gorulmeTarihi;
                  return { ...m, okuyanlar: yeniOkuyanlar, okuyanZamanlar: yeniOkuyanZamanlar, durum: 'gorundu' };
                } else {
                  return { ...m, durum: 'gorundu', okunduZamani: gorulmeTarihi || m.okunduZamani };
                }
              }
              return m;
            });
            if (listeDegisti) {
              degisti = true;
              yeni[anahtar] = yeniListe;
            }
          }
          return degisti ? yeni : mevcut;
        });
        return;
      }

      if (veri.tip === 'tek-gorunum-guncellendi' && veri.id) {
        setMesajDeposu((mevcut) => {
          const yeni = { ...mevcut };
          for (const anahtar of Object.keys(yeni)) {
            const idx = (yeni[anahtar] || []).findIndex((m) => String(m.id) === String(veri.id));
            if (idx !== -1) {
              const kopya = [...yeni[anahtar]];
              kopya[idx] = {
                ...kopya[idx],
                // Global flag (kişisel sohbet veya grup tamamlandıysa)
                ...(veri.tekGorunumGoruldu !== undefined ? { tekGorunumGoruldu: !!veri.tekGorunumGoruldu } : {}),
                // Grup için kişi bazlı takip
                ...(Array.isArray(veri.tekGorunumGorenler) ? { tekGorunumGorenler: veri.tekGorunumGorenler } : {}),
              };
              yeni[anahtar] = kopya;
              break;
            }
          }
          return yeni;
        });
        return;
      }

      if (veri.tip === 'tema-degisti') {
        const diger = (veri.kullanici && veri.kullanici.toLowerCase() === (kullanici || '').toLowerCase()) ? veri.hedef : veri.kullanici;
        const anahtar = veri.hedefTuru === 'grup' ? grupAnahtari(veri.hedef) : kisiAnahtari(diger);
        // Sohbet ekranı açık olmasa bile AsyncStorage'a kaydet — bir sonraki açılışta uygulanır
        if (veri.temaId) {
          sohbetTemasiniKaydet(anahtar, veri.temaId).catch(() => {});
        }
        setTemaHaberleri({
          anahtar,
          temaId: veri.temaId,
          temaIsmi: veri.temaIsmi,
          kullanici: veri.kullanici,
          zaman: Date.now(),
        });
        return;
      }

      if (veri.tip === 'guncelleme-var') {
        setGuncellemeHaberi(veri);
        return;
      }
    };

    ws.onclose = (olay) => {
      if (soketRef.current === ws) soketRef.current = null;
      setBaglandi(false);
      setSonHata({ tur: 'kapandi', kod: olay?.code, mesaj: olay?.reason });
      if (!kapatildiMi.current) {
        yenidenBaglanZamanlayici.current = setTimeout(baglan, 2500);
      }
    };

    ws.onerror = (olay) => {
      setSonHata({ tur: 'hata', mesaj: olay?.message });
    };
  }, [sunucuAdres, kullanici, sifre]);

  useEffect(() => {
    kapatildiMi.current = false;
    baglan();
    tumBildirimleriTemizle();

    const altAbonelik = AppState.addEventListener('change', (durum) => {
      if (durum === 'active') {
        tumBildirimleriTemizle();
        if (soketRef.current && soketRef.current.readyState === WebSocket.OPEN) {
          soketRef.current.send(JSON.stringify({ tip: 'aktif-sohbet', anahtar: aktifAnahtarRef.current || null, arkaPlan: false }));
        }
        if (!soketRef.current || soketRef.current.readyState === WebSocket.CLOSED) {
          baglan();
        }
        if (sunucuAdres && kullanici && sifre) {
          gruplariGetir(sunucuAdres, kullanici, sifre).then((res) => {
            if (res && res.tamam && Array.isArray(res.liste)) {
              gruplariAyarla(res.liste);
              setGrupGuncellemeSayaci((n) => n + 1);
            }
          }).catch(() => {});
        }
      } else {
        if (soketRef.current && soketRef.current.readyState === WebSocket.OPEN) {
          soketRef.current.send(JSON.stringify({ tip: 'aktif-sohbet', anahtar: null, arkaPlan: true }));
        }
      }
    });

    return () => {
      kapatildiMi.current = true;
      clearTimeout(yenidenBaglanZamanlayici.current);
      soketRef.current?.close();
      soketRef.current = null;
      altAbonelik.remove();
    };
  }, [baglan]);

  const mesajGonder = useCallback(
    (hedefTuru, hedef, metin, yanit, medya) => {
      const gonderilecek = (metin || '').trim();
      if (!gonderilecek && (!medya || !medya.url)) {
        return { basarili: false, hata: 'Mesaj veya medya boş olamaz.' };
      }
      if (!soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) {
        return { basarili: false, hata: 'Bağlı değilsin. Sunucu adresini kontrol et.' };
      }

      const geciciId = `g-${Date.now()}-${geciciSayac.current++}`;
      const simdi = Date.now();
      const anahtar = hedefTuru === 'grup' ? grupAnahtari(hedef) : kisiAnahtari(hedef);

      setSonMesajZamanlari((mevcut) => ({ ...mevcut, [anahtar]: simdi }));
      setSonMesajlar((mevcut) => ({
        ...mevcut,
        [anahtar]: {
          id: geciciId,
          metin: gonderilecek || '',
          gonderen: kullanici,
          zaman: simdi,
          medyaTuru: medya?.tur || null,
          medyaUrl: medya?.url || null,
          tekGorunum: !!medya?.tekGorunum,
        },
      }));
      setGizlenenSohbetler((mevcut) => (mevcut.includes(anahtar) ? mevcut.filter((k) => k !== anahtar) : mevcut));

      setMesajDeposu((mevcut) => ({
        ...mevcut,
        [anahtar]: [
          ...(mevcut[anahtar] || []),
          {
            gecici: geciciId, gonderen: kullanici, hedefTuru, hedef, metin: gonderilecek, zaman: simdi,
            durum: 'gonderiliyor', yanit: yanit || null, begenenler: [], okuyanlar: [],
            medyaUrl: medya?.url || null, medyaTuru: medya?.tur || null,
            stickerTuru: medya?.stickerTuru || null, mimeTuru: medya?.mimeTuru || null,
            tekGorunum: !!medya?.tekGorunum,
            tekGorunumGoruldu: false, sure: medya?.sure || null,
          },
        ],
      }));

      soketRef.current.send(JSON.stringify({
        tip: 'mesaj', hedefTuru, hedef, metin: gonderilecek, gecici: geciciId,
        yanit: yanit || undefined, medya: medya || undefined,
      }));
      return { basarili: true };
    },
    [kullanici]
  );

  const begeniDegistir = useCallback((id) => {
    if (!soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'begeni-degistir', id }));
    // İyimser (optimistic) güncelleme
    setMesajDeposu((mevcut) => {
      const yeni = { ...mevcut };
      const sId = String(id);
      const kucukKullanici = String(kullanici || '').toLowerCase();
      for (const anahtar of Object.keys(yeni)) {
        const idx = (yeni[anahtar] || []).findIndex((m) => String(m.id) === sId);
        if (idx !== -1) {
          const kopya = [...yeni[anahtar]];
          const eskiBegenenler = kopya[idx].begenenler || [];
          const begenildiMi = eskiBegenenler.some((u) => String(u || '').toLowerCase() === kucukKullanici);
          const yeniBegenenler = begenildiMi
            ? eskiBegenenler.filter((u) => String(u || '').toLowerCase() !== kucukKullanici)
            : [...eskiBegenenler, kullanici];
          kopya[idx] = { ...kopya[idx], begenenler: yeniBegenenler };
          yeni[anahtar] = kopya;
          break;
        }
      }
      return yeni;
    });
  }, [kullanici]);

  const mesajDuzenle = useCallback((id, yeniMetin) => {
    if (!soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'mesaj-duzenle', id, yeniMetin }));
    // iyimser (optimistic) guncelleme
    setMesajDeposu((mevcut) => {
      const yeni = { ...mevcut };
      for (const anahtar of Object.keys(yeni)) {
        const idx = yeni[anahtar].findIndex((m) => m.id === id);
        if (idx !== -1) {
          const kopya = [...yeni[anahtar]];
          kopya[idx] = { ...kopya[idx], metin: yeniMetin, duzenlendi: true };
          yeni[anahtar] = kopya;
          break;
        }
      }
      return yeni;
    });
  }, []);

  const mesajSil = useCallback((id) => {
    if (!soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'mesaj-sil', id }));
    setMesajDeposu((mevcut) => {
      const yeni = { ...mevcut };
      for (const anahtar of Object.keys(yeni)) {
        const idx = yeni[anahtar].findIndex((m) => m.id === id);
        if (idx !== -1) {
          const kopya = [...yeni[anahtar]];
          kopya[idx] = { ...kopya[idx], metin: '', silindi: true };
          yeni[anahtar] = kopya;
          break;
        }
      }
      return yeni;
    });
  }, []);

  const okunduBildir = useCallback((idler) => {
    if (AppState.currentState !== 'active') return;
    if (!idler || !idler.length) return;
    if (soketRef.current && soketRef.current.readyState === WebSocket.OPEN) {
      soketRef.current.send(JSON.stringify({ tip: 'okundu', idler }));
    }

    // Yerel mesaj deposunu aninda guncelle (hem bireysel hem grup mesajlarinda)
    const idSet = new Set(idler.map((id) => String(id)));
    const kucukKullanici = String(kullanici || '').toLowerCase();

    setMesajDeposu((mevcut) => {
      let degisti = false;
      const yeni = { ...mevcut };
      for (const anahtar of Object.keys(yeni)) {
        const liste = yeni[anahtar] || [];
        let listeDegisti = false;
        const yeniListe = liste.map((m) => {
          if (!m.id || !idSet.has(String(m.id))) return m;
          const okuyanlar = m.okuyanlar || [];
          const zatenOkudu = okuyanlar.some((u) => (u || '').toLowerCase() === kucukKullanici);
          if (m.durum === 'gorundu' && zatenOkudu) return m;
          listeDegisti = true;
          return {
            ...m,
            durum: 'gorundu',
            okuyanlar: zatenOkudu ? okuyanlar : [...okuyanlar, kullanici],
          };
        });
        if (listeDegisti) {
          yeni[anahtar] = yeniListe;
          degisti = true;
        }
      }
      return degisti ? yeni : mevcut;
    });
  }, [kullanici]);

  const yaziyorBildir = useCallback((hedefTuru, hedef) => {
    if (!soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'yaziyor', hedefTuru, hedef }));
  }, []);

  const yazmayiBiraktimBildir = useCallback((hedefTuru, hedef) => {
    if (!soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'yazmayi-birakti', hedefTuru, hedef }));
  }, []);

  const tekGorunumGorulduBildir = useCallback((id) => {
    if (!id || !soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'tek-gorunum-goruldu', id }));
    setMesajDeposu((mevcut) => {
      const yeni = { ...mevcut };
      for (const anahtar of Object.keys(yeni)) {
        const idx = (yeni[anahtar] || []).findIndex((m) => m.id === id);
        if (idx !== -1) {
          const kopya = [...yeni[anahtar]];
          kopya[idx] = { ...kopya[idx], tekGorunumGoruldu: true };
          yeni[anahtar] = kopya;
          break;
        }
      }
      return yeni;
    });
  }, []);

  const temaDegistirBildir = useCallback((hedefTuru, hedef, temaId, temaIsmi) => {
    if (!soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'tema-degistir', hedefTuru, hedef, temaId, temaIsmi }));
  }, []);

  const gecmisiIcinYukle = useCallback((anahtar, gelenListe) => {
    setMesajDeposu((mevcut) => {
      const temizlemeZamani = sohbetTemizlemeZamanlari[anahtar] || 0;
      const temizlenmisGelen = temizlemeZamani > 0
        ? (gelenListe || []).filter((m) => (m.zaman || 0) > temizlemeZamani)
        : (gelenListe || []);

      const yerel = (mevcut[anahtar] || []).filter((m) => temizlemeZamani === 0 || (m.zaman || 0) > temizlemeZamani);
      const gelenHarita = new Map(temizlenmisGelen.map((m) => [m.id, m]));

      // Yerelde zaten olan mesajları sunucudan gelen en güncel okuyanlar / begenenler ile tazele
      const guncellenmisYerel = yerel.map((m) => {
        const sunucuM = m.id ? gelenHarita.get(m.id) : null;
        if (!sunucuM) return m;
        return {
          ...m,
          ...sunucuM,
          okuyanlar: sunucuM.okuyanlar || m.okuyanlar || [],
          begenenler: sunucuM.begenenler || m.begenenler || [],
          durum: sunucuM.okundu || (sunucuM.okuyanlar && sunucuM.okuyanlar.length > 0) ? 'gorundu' : (m.durum || 'gonderildi'),
        };
      });

      const yerelIdler = new Set(guncellenmisYerel.map((m) => m.id));
      const yeniler = temizlenmisGelen
        .filter((m) => !yerelIdler.has(m.id))
        .map((m) => ({
          ...m,
          durum: m.okundu || (m.okuyanlar && m.okuyanlar.length > 0) ? 'gorundu' : 'gonderildi',
          okuyanlar: m.okuyanlar || [],
          begenenler: m.begenenler || [],
        }));

      const birlesmis = [...yeniler, ...guncellenmisYerel].sort((a, b) => a.zaman - b.zaman);
      if (birlesmis.length > 0) {
        const enSon = birlesmis[birlesmis.length - 1];
        setSonMesajZamanlari((eskiler) => ({
          ...eskiler,
          [anahtar]: Math.max(eskiler[anahtar] || 0, enSon.zaman),
        }));
        setSonMesajlar((mevcutSonlar) => {
          const mevcutSon = mevcutSonlar[anahtar];
          if (!mevcutSon || (enSon.zaman || 0) >= (mevcutSon.zaman || 0)) {
            return {
              ...mevcutSonlar,
              [anahtar]: {
                id: enSon.id,
                metin: enSon.metin || '',
                gonderen: enSon.gonderen,
                zaman: enSon.zaman,
                medyaTuru: enSon.medyaTuru || null,
                medyaUrl: enSon.medyaUrl || null,
                tekGorunum: !!enSon.tekGorunum,
              },
            };
          }
          return mevcutSonlar;
        });
      }
      return { ...mevcut, [anahtar]: birlesmis };
    });
  }, [sohbetTemizlemeZamanlari]);



  // Mesajlar degistikce yerel onbellege yaz (gecikmeli, art arda degisimde tek seferde)
  const onbellekZamanlayici = useRef(null);
  useEffect(() => {
    clearTimeout(onbellekZamanlayici.current);
    onbellekZamanlayici.current = setTimeout(() => {
      for (const [anahtar, liste] of Object.entries(mesajDeposu)) {
        onbellegeKaydet(anahtar, liste);
      }
    }, 600);
    return () => clearTimeout(onbellekZamanlayici.current);
  }, [mesajDeposu]);

  const aktifSohbetAyarla = useCallback((anahtar) => {
    aktifAnahtarRef.current = anahtar;
    if (soketRef.current && soketRef.current.readyState === WebSocket.OPEN) {
      soketRef.current.send(JSON.stringify({ tip: 'aktif-sohbet', anahtar: anahtar || null, arkaPlan: false }));
    }
    if (anahtar) {
      bildirimSayaciniSifirla(anahtar);
      setOkunmamisSayilar((mevcut) => {
        if (!mevcut[anahtar]) return mevcut;
        return { ...mevcut, [anahtar]: 0 };
      });
    }
  }, []);

  const sohbetiGizle = useCallback((anahtar) => {
    setGizlenenSohbetler((mevcut) => {
      if (mevcut.includes(anahtar)) return mevcut;
      const yeni = [...mevcut, anahtar];
      AsyncStorage.setItem(`@textly_gizlenen_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
      return yeni;
    });
  }, [kullanici]);

  const sohbetiTemizle = useCallback(async (anahtar, hedefTuru) => {
    const simdi = Date.now();
    // 1. Temizleme zamanını kaydet
    setSohbetTemizlemeZamanlari((mevcut) => {
      const yeni = { ...mevcut, [anahtar]: simdi };
      AsyncStorage.setItem(`@textly_sohbet_temizleme_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
      return yeni;
    });

    // 2. Mesaj deposundaki ve yerel disk önbelleğindeki eski mesajları sıfırla
    setMesajDeposu((mevcut) => ({ ...mevcut, [anahtar]: [] }));
    onbellegeKaydet(anahtar, []);

    // 3. Son mesaj özetini sıfırla
    setSonMesajlar((mevcut) => {
      const kopya = { ...mevcut };
      delete kopya[anahtar];
      return kopya;
    });

    // 4. Eğer grup ise ana sayfadan gizle (yeni mesaj gelince ws.onmessage otomatik olarak gizlenenSohbetler'den çıkaracak)
    if (hedefTuru === 'grup') {
      sohbetiGizle(anahtar);
    }
  }, [kullanici, sohbetiGizle]);

  const grupSil = useCallback((grupId) => {
    if (!grupId) return;
    const gId = String(grupId);
    const anahtar = `grup:${gId}`;
    setGruplar((mevcut) => {
      const yeni = (mevcut || []).filter((g) => String(g.id) !== gId);
      AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
      return yeni;
    });
    setGrupBilgileri((mevcut) => {
      const kopya = { ...mevcut };
      delete kopya[gId];
      return kopya;
    });
    setMesajDeposu((mevcut) => {
      const kopya = { ...mevcut };
      delete kopya[anahtar];
      return kopya;
    });
    onbellegeKaydet(anahtar, []);
  }, [kullanici]);


  const sonZamanlariGuncelle = useCallback((yeniZamanlar) => {
    if (!yeniZamanlar || typeof yeniZamanlar !== 'object') return;
    setSonMesajZamanlari((mevcut) => ({ ...yeniZamanlar, ...mevcut }));
  }, []);

  const okunmamislariGuncelle = useCallback((yeniOkunmamislar) => {
    if (!yeniOkunmamislar || typeof yeniOkunmamislar !== 'object') return;
    setOkunmamisSayilar((mevcut) => ({ ...yeniOkunmamislar, ...mevcut }));
  }, []);



  const grupEkle = useCallback((yeniGrup) => {
    if (!yeniGrup || !yeniGrup.id) return;
    const gId = String(yeniGrup.id);
    setGruplar((mevcut) => {
      const filtrelenmis = (mevcut || []).filter((g) => String(g.id) !== gId);
      const yeni = [yeniGrup, ...filtrelenmis];
      AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
      return yeni;
    });
    setGrupBilgileri((mevcut) => ({
      ...mevcut,
      [gId]: {
        isim: yeniGrup.isim,
        uyeler: yeniGrup.uyeler,
        yonetici: yeniGrup.yonetici,
        yoneticiler: yeniGrup.yoneticiler,
        resimUrl: yeniGrup.resimUrl,
        aciklama: yeniGrup.aciklama,
      },
    }));
  }, [kullanici]);

  const grupGuncelle = useCallback((grupId, guncelAlanlar) => {
    if (!grupId) return;
    const gId = String(grupId);
    setGruplar((mevcut) => {
      const yeni = (mevcut || []).map((g) => {
        if (String(g.id) === gId) {
          return { ...g, ...guncelAlanlar };
        }
        return g;
      });
      AsyncStorage.setItem(`@textly_gruplar_cache_${kullanici}`, JSON.stringify(yeni)).catch(() => {});
      return yeni;
    });
    setGrupBilgileri((mevcut) => ({
      ...mevcut,
      [gId]: {
        ...(mevcut[gId] || {}),
        ...guncelAlanlar,
      },
    }));
  }, [kullanici]);

  const deger = {
    baglandi,
    sonHata,
    sonIslemHatasi,
    mesajDeposu,
    sonMesajZamanlari,
    sonMesajlar,
    sonZamanlariGuncelle,
    okunmamislariGuncelle,
    gizlenenSohbetler,
    sohbetiGizle,
    sohbetTemizlemeZamanlari,
    sohbetiTemizle,
    grupSil,
    temaHaberleri,

    okunmamisSayilar,
    kullaniciDurumlari,
    setKullaniciDurumlari,
    yaziyorlar,
    grupGuncellemeSayaci,
    grupBilgileri,
    gruplar,
    gruplariAyarla,
    grupBilgiGuncelleTekil,
    grupEkle,
    grupGuncelle,
    mesajGonder,
    okunduBildir,
    yaziyorBildir,
    yazmayiBiraktimBildir,
    begeniDegistir,
    mesajDuzenle,
    mesajSil,
    tekGorunumGorulduBildir,
    temaDegistirBildir,
    gecmisiIcinYukle,
    aktifSohbetAyarla,
    guncellemeHaberi,
    guncellemeHaberiTemizle: () => setGuncellemeHaberi(null),
    benimAdim: kullanici,
  };

  return <SoketBaglami.Provider value={deger}>{children}</SoketBaglami.Provider>;
}

export function useSoket() {
  const ctx = useContext(SoketBaglami);
  if (!ctx) throw new Error('useSoket, SoketSaglayici icinde kullanilmali');
  return ctx;
}
