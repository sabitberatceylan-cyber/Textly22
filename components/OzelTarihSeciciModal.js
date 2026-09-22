import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useTema } from '../lib/temaBaglami';

const { width: EKRAN_GENISLIK } = Dimensions.get('window');

const AYLAR = [
  { id: 1, isim: 'Ocak' },
  { id: 2, isim: 'Şubat' },
  { id: 3, isim: 'Mart' },
  { id: 4, isim: 'Nisan' },
  { id: 5, isim: 'Mayıs' },
  { id: 6, isim: 'Haziran' },
  { id: 7, isim: 'Temmuz' },
  { id: 8, isim: 'Ağustos' },
  { id: 9, isim: 'Eylül' },
  { id: 10, isim: 'Ekim' },
  { id: 11, isim: 'Kasım' },
  { id: 12, isim: 'Aralık' },
];

const ITEM_YUKSEKLIK = 42;

export default function OzelTarihSeciciModal({
  visible,
  mevcutTarih,
  onKapat,
  onKaydet,
}) {
  const { renkler } = useTema();

  const [seciliGun, setSeciliGun] = useState(15);
  const [seciliAy, setSeciliAy] = useState(6);
  const [seciliYil, setSeciliYil] = useState(2000);

  const gunListRef = useRef(null);
  const ayListRef = useRef(null);
  const yilListRef = useRef(null);

  // Yıllar: 2026'dan 1940'a geriye doğru
  const yillar = useMemo(() => {
    const arr = [];
    const buYil = new Date().getFullYear();
    for (let y = buYil; y >= 1940; y--) {
      arr.push(y);
    }
    return arr;
  }, []);

  // Seçili ay ve yıla göre gün sayısı
  const gunSayisi = useMemo(() => {
    if (seciliAy === 2) {
      const artikYil = (seciliYil % 4 === 0 && seciliYil % 100 !== 0) || seciliYil % 400 === 0;
      return artikYil ? 29 : 28;
    }
    if ([4, 6, 9, 11].includes(seciliAy)) return 30;
    return 31;
  }, [seciliAy, seciliYil]);

  const gunler = useMemo(() => {
    const arr = [];
    for (let g = 1; g <= gunSayisi; g++) {
      arr.push(g);
    }
    return arr;
  }, [gunSayisi]);

  // Modal açıldığında mevcut tarihi ayrıştır ve state'e yükle
  useEffect(() => {
    if (visible) {
      if (mevcutTarih && typeof mevcutTarih === 'string' && mevcutTarih.includes('.')) {
        const parcalar = mevcutTarih.split('.');
        const g = parseInt(parcalar[0], 10);
        const a = parseInt(parcalar[1], 10);
        const y = parseInt(parcalar[2], 10);
        if (g >= 1 && g <= 31) setSeciliGun(g);
        if (a >= 1 && a <= 12) setSeciliAy(a);
        if (y >= 1940 && y <= 2030) setSeciliYil(y);
      } else {
        setSeciliGun(15);
        setSeciliAy(6);
        setSeciliYil(2000);
      }
    }
  }, [visible, mevcutTarih]);

  // Gün sayısı aşılırsa düzelt
  useEffect(() => {
    if (seciliGun > gunSayisi) {
      setSeciliGun(gunSayisi);
    }
  }, [gunSayisi, seciliGun]);

  // Modal açıldığında seçili elemanlara scroll yap
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const gunIdx = Math.max(0, seciliGun - 1);
        const ayIdx = Math.max(0, seciliAy - 1);
        const yilIdx = Math.max(0, yillar.indexOf(seciliYil));

        try {
          gunListRef.current?.scrollToIndex({ index: gunIdx, animated: false, viewPosition: 0.5 });
        } catch {}
        try {
          ayListRef.current?.scrollToIndex({ index: ayIdx, animated: false, viewPosition: 0.5 });
        } catch {}
        try {
          if (yilIdx >= 0) {
            yilListRef.current?.scrollToIndex({ index: yilIdx, animated: false, viewPosition: 0.5 });
          }
        } catch {}
      }, 120);
    }
  }, [visible]);

  function tamamla() {
    const formatli = `${String(seciliGun).padStart(2, '0')}.${String(seciliAy).padStart(2, '0')}.${seciliYil}`;
    onKaydet(formatli);
  }

  const ayAdi = AYLAR.find((a) => a.id === seciliAy)?.isim || '';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onKapat}
    >
      <View style={styles.arkaplan}>
        <View style={[styles.kutu, { backgroundColor: renkler.yuzey, borderColor: renkler.cizgi }]}>
          {/* Başlık */}
          <Text style={[styles.baslik, { color: renkler.metin }]}>Doğum Tarihi Seç</Text>
          <Text style={[styles.altBaslik, { color: renkler.metinSoluk }]}>
            Günü, ayı ve yılı dokunarak belirleyin
          </Text>

          {/* Seçili Tarih Önizleme Kartı */}
          <View style={[styles.onizlemeKutusu, { backgroundColor: renkler.arkaplan, borderColor: renkler.cizgi }]}>
            <Text style={[styles.onizlemeMetin, { color: renkler.vurgu }]}>
              {seciliGun} {ayAdi} {seciliYil}
            </Text>
            <Text style={[styles.onizlemeFormat, { color: renkler.metinSoluk }]}>
              ({String(seciliGun).padStart(2, '0')}.{String(seciliAy).padStart(2, '0')}.{seciliYil})
            </Text>
          </View>

          {/* 3 Sütunlu Seçici Alanı */}
          <View style={[styles.seciciGovdesi, { borderColor: renkler.cizgi }]}>
            {/* GÜN Sütunu */}
            <View style={styles.sutun}>
              <Text style={[styles.sutunBaslik, { color: renkler.metinSoluk }]}>GÜN</Text>
              <FlatList
                ref={gunListRef}
                data={gunler}
                keyExtractor={(item) => `g-${item}`}
                showsVerticalScrollIndicator={false}
                getItemLayout={(_, index) => ({ length: ITEM_YUKSEKLIK, offset: ITEM_YUKSEKLIK * index, index })}
                onScrollToIndexFailed={() => {}}
                style={styles.liste}
                renderItem={({ item }) => {
                  const secili = item === seciliGun;
                  return (
                    <TouchableOpacity
                      style={[styles.oge, secili && [styles.ogeSecili, { backgroundColor: renkler.vurgu }]]}
                      onPress={() => setSeciliGun(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.ogeMetin, { color: secili ? '#ffffff' : renkler.metin }, secili && styles.ogeMetinSecili]}>
                        {String(item).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            <View style={[styles.sutunAyirici, { backgroundColor: renkler.cizgi }]} />

            {/* AY Sütunu */}
            <View style={[styles.sutun, { flex: 1.4 }]}>
              <Text style={[styles.sutunBaslik, { color: renkler.metinSoluk }]}>AY</Text>
              <FlatList
                ref={ayListRef}
                data={AYLAR}
                keyExtractor={(item) => `a-${item.id}`}
                showsVerticalScrollIndicator={false}
                getItemLayout={(_, index) => ({ length: ITEM_YUKSEKLIK, offset: ITEM_YUKSEKLIK * index, index })}
                onScrollToIndexFailed={() => {}}
                style={styles.liste}
                renderItem={({ item }) => {
                  const secili = item.id === seciliAy;
                  return (
                    <TouchableOpacity
                      style={[styles.oge, secili && [styles.ogeSecili, { backgroundColor: renkler.vurgu }]]}
                      onPress={() => setSeciliAy(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.ogeMetin, { color: secili ? '#ffffff' : renkler.metin }, secili && styles.ogeMetinSecili]}>
                        {item.isim}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            <View style={[styles.sutunAyirici, { backgroundColor: renkler.cizgi }]} />

            {/* YIL Sütunu */}
            <View style={styles.sutun}>
              <Text style={[styles.sutunBaslik, { color: renkler.metinSoluk }]}>YIL</Text>
              <FlatList
                ref={yilListRef}
                data={yillar}
                keyExtractor={(item) => `y-${item}`}
                showsVerticalScrollIndicator={false}
                getItemLayout={(_, index) => ({ length: ITEM_YUKSEKLIK, offset: ITEM_YUKSEKLIK * index, index })}
                onScrollToIndexFailed={() => {}}
                style={styles.liste}
                renderItem={({ item }) => {
                  const secili = item === seciliYil;
                  return (
                    <TouchableOpacity
                      style={[styles.oge, secili && [styles.ogeSecili, { backgroundColor: renkler.vurgu }]]}
                      onPress={() => setSeciliYil(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.ogeMetin, { color: secili ? '#ffffff' : renkler.metin }, secili && styles.ogeMetinSecili]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>

          {/* Butonlar */}
          <TouchableOpacity
            style={[styles.onayButon, { backgroundColor: renkler.vurgu }]}
            onPress={tamamla}
            activeOpacity={0.8}
          >
            <Text style={styles.onayButonMetin}>Tarihi Kaydet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.vazgecButon, { borderColor: renkler.cizgi }]}
            onPress={onKapat}
            activeOpacity={0.8}
          >
            <Text style={[styles.vazgecButonMetin, { color: renkler.metinSoluk }]}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  kutu: {
    width: Math.min(EKRAN_GENISLIK - 32, 380),
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  baslik: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  altBaslik: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
    textAlign: 'center',
  },
  onizlemeKutusu: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  onizlemeMetin: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  onizlemeFormat: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  seciciGovdesi: {
    width: '100%',
    height: 210,
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
  },
  sutun: {
    flex: 1,
    alignItems: 'center',
  },
  sutunAyirici: {
    width: 1,
    height: '100%',
  },
  sutunBaslik: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingVertical: 6,
    textAlign: 'center',
    width: '100%',
  },
  liste: {
    width: '100%',
  },
  oge: {
    height: ITEM_YUKSEKLIK,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 8,
  },
  ogeSecili: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ogeMetin: {
    fontSize: 14,
    fontWeight: '500',
  },
  ogeMetinSecili: {
    fontWeight: '800',
  },
  onayButon: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  onayButonMetin: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  vazgecButon: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  vazgecButonMetin: {
    fontSize: 14,
    fontWeight: '600',
  },
});
