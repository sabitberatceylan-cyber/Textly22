import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  Switch, ScrollView, Alert, Image, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bosluk } from '../theme';
import { useTema } from '../lib/temaBaglami';
import { ayarGuncelle, medyaAdresi } from '../lib/api';
import { profilGetir, profilGuncelle, kullaniciAdiDegistir } from '../lib/api';
import { medyaSec } from '../lib/medya';

export default function AyarlarEkrani({
  sunucuAdres,
  kullanici,
  sifre,
  sonGorulmeGizli,
  bildirimlerKapali,
  dogumTarihiGizli,
  okunduBilgisiGizli,
  onAyarGuncellendi,
  onAdresGuncelle,
  onCikis,
  onGeri,
}) {
  const { renkler, koyuMu, toggleTema } = useTema();
  const styles = useMemo(() => olusturStiller(renkler), [renkler]);
  const [yeniAdres, setYeniAdres] = useState(sunucuAdres);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [profilYukleniyor, setProfilYukleniyor] = useState(true);
  const [profilResimUrl, setProfilResimUrl] = useState(null);
  const [biyografi, setBiyografi] = useState('');
  const [biyografiDuzenle, setBiyografiDuzenle] = useState(false);
  const [yeniAd, setYeniAd] = useState('');
  const [adDegistirModal, setAdDegistirModal] = useState(false);
  const [cikisOnayModalAcik, setCikisOnayModalAcik] = useState(false);

  useEffect(() => {
    profilGetir(sunucuAdres, kullanici, sifre, kullanici).then((res) => {
      setProfilYukleniyor(false);
      if (res.tamam) {
        setProfilResimUrl(res.profilResimUrl || null);
        setBiyografi(res.biyografi || '');
      }
    });
  }, [sunucuAdres, kullanici, sifre]);

  async function profilFotoSec() {
    const secim = await medyaSec();
    if (!secim) return;
    if (secim.hata) return Alert.alert('Olmadı', secim.hata);
    if (secim.tur === 'video') return Alert.alert('Olmadı', 'Profil resmi için fotoğraf seç.');
    setKaydediliyor(true);
    const sonuc = await profilGuncelle(sunucuAdres, kullanici, sifre, {
      base64: secim.base64,
      mimeTuru: secim.mimeTuru || 'image/jpeg',
    });
    setKaydediliyor(false);
    if (!sonuc.tamam) return Alert.alert('Olmadı', sonuc.hata || 'Yükleme başarısız.');
    setProfilResimUrl(sonuc.profilResimUrl);
  }

  async function biyografiKaydet() {
    setKaydediliyor(true);
    const sonuc = await profilGuncelle(sunucuAdres, kullanici, sifre, { biyografi });
    setKaydediliyor(false);
    if (!sonuc.tamam) return Alert.alert('Olmadı', sonuc.hata || 'Kaydedilemedi.');
    setBiyografiDuzenle(false);
  }

  async function kullaniciAdiniDegistir() {
    const temiz = yeniAd.trim();
    if (temiz.length < 3) return Alert.alert('Hata', 'En az 3 karakter.');
    setKaydediliyor(true);
    const sonuc = await kullaniciAdiDegistir(sunucuAdres, kullanici, sifre, temiz);
    setKaydediliyor(false);
    if (!sonuc.tamam) return Alert.alert('Olmadı', sonuc.hata || 'Değiştirilemedi.');
    Alert.alert('Başarılı', 'Kullanıcı adın değişti. Yeniden giriş yap.', [
      { text: 'Tamam', onPress: onCikis },
    ]);
  }

  async function ayarDegistir(alan, deger) {
    setKaydediliyor(true);
    const sonuc = await ayarGuncelle(sunucuAdres, kullanici, sifre, { [alan]: deger });
    setKaydediliyor(false);
    if (!sonuc.tamam) {
      Alert.alert('Olmadı', sonuc.hata || 'Ayar kaydedilemedi.');
      return;
    }
    onAyarGuncellendi({
      sonGorulmeGizli: sonuc.sonGorulmeGizli,
      bildirimlerKapali: sonuc.bildirimlerKapali,
      dogumTarihiGizli: sonuc.dogumTarihiGizli,
      okunduBilgisiGizli: sonuc.okunduBilgisiGizli,
    });
  }

  function adresKaydet() {
    const temiz = yeniAdres.trim().replace(/\/+$/, '');
    if (temiz && temiz !== sunucuAdres) onAdresGuncelle(temiz);
  }

  const tamProfilResimUrl = profilResimUrl
    ? medyaAdresi(sunucuAdres, kullanici, sifre, profilResimUrl)
    : null;

  return (
    <SafeAreaView style={styles.kok} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGeri} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.geriIkon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerBaslik}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.icerik}>

        {/* PROFİL */}
        <Text style={styles.bolumBaslik}>PROFİL</Text>
        <TouchableOpacity style={styles.profilKutu} onPress={profilFotoSec} activeOpacity={0.7}>
          {profilYukleniyor ? (
            <ActivityIndicator color={renkler.metinSoluk} />
          ) : tamProfilResimUrl ? (
            <Image source={{ uri: tamProfilResimUrl }} style={styles.profilResim} />
          ) : (
            <View style={styles.profilResimPlaceholder}>
              <Text style={styles.profilResimHarf}>{kullanici.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profilBilgi}>
            <Text style={styles.profilKullanici}>{kullanici}</Text>
            <Text style={styles.profilDegistir}>{kaydediliyor ? 'Yükleniyor...' : 'Fotoğrafı değiştir'}</Text>
          </View>
        </TouchableOpacity>

        {/* Biyografi */}
        <Text style={styles.etiket}>BİYOGRAFİ</Text>
        {biyografiDuzenle ? (
          <View>
            <TextInput
              style={[styles.girdi, { minHeight: 80, textAlignVertical: 'top' }]}
              value={biyografi}
              onChangeText={(t) => setBiyografi(t.slice(0, 150))}
              placeholder="Kendin hakkında bir şeyler yaz..."
              placeholderTextColor={renkler.metinSoluk}
              multiline
              autoFocus
            />
            <Text style={styles.karakterSayac}>{biyografi.length}/150</Text>
            <TouchableOpacity style={styles.buton} onPress={biyografiKaydet} disabled={kaydediliyor}>
              <Text style={styles.butonMetni}>{kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setBiyografiDuzenle(false)}>
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.biyografiKutu} onPress={() => setBiyografiDuzenle(true)}>
            <Text style={biyografi ? styles.satirMetin : styles.satirAltMetin}>
              {biyografi || 'Biyografi ekle...'}
            </Text>
            <Text style={styles.duzenleMetni}>Düzenle</Text>
          </TouchableOpacity>
        )}

        {/* Kullanıcı adı değiştir */}
        <Text style={[styles.bolumBaslik, { marginTop: bosluk.lg }]}>KULLANICI ADI</Text>
        <View style={styles.satir}>
          <Text style={styles.satirMetin}>@{kullanici}</Text>
          <TouchableOpacity onPress={() => { setYeniAd(''); setAdDegistirModal(true); }}>
            <Text style={styles.duzenleMetni}>Değiştir</Text>
          </TouchableOpacity>
        </View>

        {adDegistirModal && (
          <View style={{ marginTop: bosluk.sm }}>
            <TextInput
              style={styles.girdi}
              value={yeniAd}
              onChangeText={setYeniAd}
              placeholder="Yeni kullanıcı adı"
              placeholderTextColor={renkler.metinSoluk}
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity style={styles.buton} onPress={kullaniciAdiniDegistir} disabled={kaydediliyor}>
              <Text style={styles.butonMetni}>{kaydediliyor ? 'Değiştiriliyor...' : 'Onayla'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ikincilButon} onPress={() => setAdDegistirModal(false)}>
              <Text style={styles.ikincilButonMetni}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GÖRÜNÜM */}
        <Text style={styles.bolumBaslik}>GÖRÜNÜM</Text>
        <View style={styles.satir}>
          <Text style={styles.satirMetin}>Koyu mod (Karanlık tema)</Text>
          <Switch
            value={koyuMu}
            onValueChange={toggleTema}
            trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
            thumbColor="#ffffff"
          />
        </View>

        {/* GİZLİLİK */}
        <Text style={styles.bolumBaslik}>GİZLİLİK</Text>
        <View style={styles.satir}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.satirMetin}>Son görülmeyi gizle</Text>
            <Text style={styles.satirAltMetin}>Gizlersen başkalarının son görülmesini de göremezsin.</Text>
          </View>
          <Switch
            value={sonGorulmeGizli}
            disabled={kaydediliyor}
            onValueChange={(deger) => ayarDegistir('sonGorulmeGizli', deger)}
            trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.satir}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.satirMetin}>Okundu bilgisini kapat</Text>
            <Text style={styles.satirAltMetin}>Mesajları okuduğunda karşı tarafa mavi tik gitmez.</Text>
          </View>
          <Switch
            value={okunduBilgisiGizli}
            disabled={kaydediliyor}
            onValueChange={(deger) => ayarDegistir('okunduBilgisiGizli', deger)}
            trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.satir}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.satirMetin}>Doğum tarihimi gizle</Text>
            <Text style={styles.satirAltMetin}>Profilinde yaşın ve doğum tarihin başkalarına gösterilmez.</Text>
          </View>
          <Switch
            value={dogumTarihiGizli}
            disabled={kaydediliyor}
            onValueChange={(deger) => ayarDegistir('dogumTarihiGizli', deger)}
            trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.satir}>
          <Text style={styles.satirMetin}>Bildirimleri kapat</Text>
          <Switch
            value={bildirimlerKapali}
            disabled={kaydediliyor}
            onValueChange={(deger) => ayarDegistir('bildirimlerKapali', deger)}
            trackColor={{ false: renkler.cizgi, true: renkler.vurgu }}
            thumbColor="#ffffff"
          />
        </View>

        {/* SUNUCU */}
        <Text style={styles.bolumBaslik}>SUNUCU</Text>
        <Text style={styles.etiket}>SUNUCU ADRESİ</Text>
        <TextInput
          style={styles.girdi}
          value={yeniAdres}
          onChangeText={setYeniAdres}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.buton} onPress={adresKaydet}>
          <Text style={styles.butonMetni}>Adresi Kaydet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cikisButon} onPress={() => setCikisOnayModalAcik(true)}>
          <Text style={styles.cikisButonMetni}>Çıkış yap</Text>
        </TouchableOpacity>
      </ScrollView>

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
    </SafeAreaView>
  );
}

function olusturStiller(renkler) {
  return StyleSheet.create({
    kok: { flex: 1, backgroundColor: renkler.arkaplan },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: bosluk.md,
      paddingVertical: bosluk.sm,
      borderBottomWidth: 1,
      borderBottomColor: renkler.cizgi,
      backgroundColor: renkler.yuzey,
    },
    geriIkon: { color: renkler.metin, fontSize: 22, width: 24 },
    headerBaslik: { color: renkler.metin, fontSize: 17, fontWeight: '700' },

    icerik: { padding: bosluk.md, paddingBottom: bosluk.xl },
    bolumBaslik: { color: renkler.metinSoluk, fontSize: 12, letterSpacing: 1, marginTop: bosluk.lg, marginBottom: bosluk.sm },

    // Profil
    profilKutu: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: bosluk.md,
      borderBottomWidth: 1, borderBottomColor: renkler.cizgi,
    },
    profilResim: { width: 64, height: 64, borderRadius: 32, marginRight: bosluk.md },
    profilResimPlaceholder: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: renkler.digerBalon,
      borderWidth: 1, borderColor: renkler.cizgi, justifyContent: 'center', alignItems: 'center', marginRight: bosluk.md,
    },
    profilResimHarf: { color: renkler.metin, fontSize: 26, fontWeight: '700' },
    profilBilgi: { flex: 1 },
    profilKullanici: { color: renkler.metin, fontSize: 17, fontWeight: '700' },
    profilDegistir: { color: renkler.metinSoluk, fontSize: 13, marginTop: 4 },

    // Biyografi
    biyografiKutu: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: renkler.cizgi,
    },
    karakterSayac: { color: renkler.metinSoluk, fontSize: 11, textAlign: 'right', marginBottom: bosluk.xs },
    duzenleMetni: { color: renkler.vurgu || renkler.kendiBalon, fontSize: 13, fontWeight: '600' },

    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: renkler.cizgi,
    },
    satirMetin: { color: renkler.metin, fontSize: 15, flex: 1 },
    satirAltMetin: { color: renkler.metinSoluk, fontSize: 12, marginTop: 2, maxWidth: 240 },

    etiket: { color: renkler.metinSoluk, fontSize: 11, letterSpacing: 1, marginBottom: bosluk.xs, marginTop: bosluk.sm },
    girdi: {
      backgroundColor: renkler.yuzey,
      color: renkler.metin,
      borderWidth: 1,
      borderColor: renkler.cizgi,
      borderRadius: 10,
      paddingHorizontal: bosluk.md,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: bosluk.sm,
    },
    buton: { backgroundColor: renkler.kendiBalon, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    butonMetni: { color: renkler.kendiBalonMetin, fontWeight: '700', fontSize: 15 },
    ikincilButon: { paddingVertical: 10, alignItems: 'center' },
    ikincilButonMetni: { color: renkler.metinSoluk, fontSize: 14 },

    cikisButon: { marginTop: bosluk.xl, paddingVertical: 14, alignItems: 'center' },
    cikisButonMetni: { color: renkler.hata, fontSize: 15, fontWeight: '600' },

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
