import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { onbellegeKaydet } from './mesajOnbellek';
import { yerelBildirimGoster, bildirimSayaciniSifirla, tumBildirimleriTemizle } from './bildirim';
import { medyaAdresi } from './api';

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
  const [gizlenenSohbetler, setGizlenenSohbetler] = useState([]); // [anahtar, ...]
  const [guncellemeHaberi, setGuncellemeHaberi] = useState(null);

  const yaziyorZamanlayicilari = useRef({}); // "anahtar:kullanici" -> timeout

  const soketRef = useRef(null);
  const kapatildiMi = useRef(false);
  const yenidenBaglanZamanlayici = useRef(null);
  const geciciSayac = useRef(0);
  const aktifAnahtarRef = useRef(null); // su an ekranda acik olan sohbet

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
      if (aktifAnahtarRef.current) {
        ws.send(JSON.stringify({ tip: 'aktif-sohbet', anahtar: aktifAnahtarRef.current, arkaPlan: false }));
      }
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
        setGizlenenSohbetler((mevcut) => (mevcut.includes(anahtar) ? mevcut.filter((k) => k !== anahtar) : mevcut));
        const simdi = Date.now();
        const cevrimeGecikmis = !!veri.bekleyen || (simdi - (veri.zaman || 0) > 3000);
        if (aktifAnahtarRef.current !== anahtar && !veri.sistem) {
          setOkunmamisSayilar((mevcut) => ({ ...mevcut, [anahtar]: (mevcut[anahtar] || 0) + 1 }));
          // Kullanıcı uygulama içindeyken (ama farklı sohbetteyken) bildirim göster
          // Arka plandayken zaten doğrudan sunucu (FCM) bildirim gönderdiği için çift bildirim çıkmaz
          if (!cevrimeGecikmis && AppState.currentState === 'active') {
            const baslik = veri.hedefTuru === 'grup' ? (veri.grupIsim || 'Grup') : veri.gonderen;
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
          for (const anahtar of Object.keys(yeni)) {
            const idx = yeni[anahtar].findIndex((m) => m.id === veri.id);
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
          for (const anahtar of Object.keys(yeni)) {
            const idx = yeni[anahtar].findIndex((m) => m.id === veri.id);
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
          for (const anahtar of Object.keys(yeni)) {
            const idx = yeni[anahtar].findIndex((m) => m.id === veri.id);
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
        setGrupBilgileri((mevcut) => ({
          ...mevcut,
          [veri.grupId]: {
            isim: veri.isim,
            uyeler: veri.uyeler,
            yonetici: veri.yonetici,
            yoneticiler: Array.isArray(veri.yoneticiler) ? veri.yoneticiler : (veri.yonetici ? [veri.yonetici] : []),
            resimUrl: veri.resimUrl,
            aciklama: veri.aciklama,
          },
        }));
        return;
      }

      if (veri.tip === 'okundu-bildirim' && Array.isArray(veri.idler)) {
        const idSeti = new Set(veri.idler.flatMap((id) => [id, String(id), Number(id)]));
        setMesajDeposu((mevcut) => {
          const yeni = { ...mevcut };
          let degisti = false;
          for (const anahtar of Object.keys(yeni)) {
            const liste = yeni[anahtar];
            if (!liste) continue;
            let listeDegisti = false;
            const yeniListe = liste.map((m) => {
              if (idSeti.has(m.id)) {
                listeDegisti = true;
                if (m.hedefTuru === 'grup') {
                  const mevcutOkuyanlar = m.okuyanlar || [];
                  const yeniOkuyanlar = mevcutOkuyanlar.includes(veri.kullanici) ? mevcutOkuyanlar : [...mevcutOkuyanlar, veri.kullanici];
                  return { ...m, okuyanlar: yeniOkuyanlar, durum: 'gorundu' };
                } else {
                  return { ...m, durum: 'gorundu' };
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
            const idx = (yeni[anahtar] || []).findIndex((m) => m.id === veri.id);
            if (idx !== -1) {
              const kopya = [...yeni[anahtar]];
              kopya[idx] = { ...kopya[idx], tekGorunumGoruldu: true };
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
            medyaUrl: medya?.url || null, medyaTuru: medya?.tur || null, tekGorunum: !!medya?.tekGorunum,
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
      for (const anahtar of Object.keys(yeni)) {
        const idx = (yeni[anahtar] || []).findIndex((m) => m.id === id);
        if (idx !== -1) {
          const kopya = [...yeni[anahtar]];
          const eskiBegenenler = kopya[idx].begenenler || [];
          const yeniBegenenler = eskiBegenenler.includes(kullanici)
            ? eskiBegenenler.filter((u) => u !== kullanici)
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
    if (!idler.length || !soketRef.current || soketRef.current.readyState !== WebSocket.OPEN) return;
    soketRef.current.send(JSON.stringify({ tip: 'okundu', idler }));
  }, []);

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
      const yerel = mevcut[anahtar] || [];
      const yerelIdler = new Set(yerel.map((m) => m.id));
      const yeniler = gelenListe
        .filter((m) => !yerelIdler.has(m.id))
        .map((m) => ({ ...m, durum: m.okundu ? 'gorundu' : 'gonderildi' }));
      const birlesmis = [...yeniler, ...yerel].sort((a, b) => a.zaman - b.zaman);
      if (birlesmis.length > 0) {
        const enSon = birlesmis[birlesmis.length - 1];
        setSonMesajZamanlari((eskiler) => ({
          ...eskiler,
          [anahtar]: Math.max(eskiler[anahtar] || 0, enSon.zaman),
        }));
      }
      return { ...mevcut, [anahtar]: birlesmis };
    });
  }, []);

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
    setGizlenenSohbetler((mevcut) => (mevcut.includes(anahtar) ? mevcut : [...mevcut, anahtar]));
  }, []);

  const sonZamanlariGuncelle = useCallback((yeniZamanlar) => {
    if (!yeniZamanlar || typeof yeniZamanlar !== 'object') return;
    setSonMesajZamanlari((mevcut) => ({ ...yeniZamanlar, ...mevcut }));
  }, []);

  const okunmamislariGuncelle = useCallback((yeniOkunmamislar) => {
    if (!yeniOkunmamislar || typeof yeniOkunmamislar !== 'object') return;
    setOkunmamisSayilar((mevcut) => ({ ...yeniOkunmamislar, ...mevcut }));
  }, []);

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
    temaHaberleri,
    okunmamisSayilar,
    kullaniciDurumlari,
    yaziyorlar,
    grupGuncellemeSayaci,
    grupBilgileri,
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
