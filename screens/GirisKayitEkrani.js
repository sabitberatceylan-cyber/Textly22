import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bosluk } from '../theme';
import { useTema } from '../lib/temaBaglami';
import { kayitOl, girisYap } from '../lib/api';

const SABIT_SUNUCU = 'https://exzehub.com.tr';

export default function GirisKayitEkrani({ onGiris }) {
  const { renkler } = useTema();
  const styles = useMemo(() => olusturStiller(renkler), [renkler]);
  const [kayitModu, setKayitModu] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  function dogumTarihiFormatla(text) {
    const rakamlar = text.replace(/\D/g, '').slice(0, 8);
    if (rakamlar.length <= 2) {
      setDogumTarihi(rakamlar);
    } else if (rakamlar.length <= 4) {
      setDogumTarihi(`${rakamlar.slice(0, 2)}.${rakamlar.slice(2)}`);
    } else {
      setDogumTarihi(`${rakamlar.slice(0, 2)}.${rakamlar.slice(2, 4)}.${rakamlar.slice(4)}`);
    }
  }

  async function gonder() {
    const adres = SABIT_SUNUCU;
    const kAdi = kullaniciAdi.trim();

    if (!kAdi) return setHata('Kullanıcı adı gir.');
    if (!sifre) return setHata('Şifre gir.');

    setHata('');
    setYukleniyor(true);

    const sonuc = kayitModu
      ? await kayitOl(adres, kAdi, sifre, dogumTarihi.trim() || null)
      : await girisYap(adres, kAdi, sifre);

    setYukleniyor(false);

    if (!sonuc.tamam) {
      setHata(sonuc.hata || 'Bir şeyler ters gitti.');
      return;
    }

    onGiris({
      sunucuAdres: adres,
      kullanici: sonuc.kullanici || kAdi,
      sifre,
      sonGorulmeGizli: !!sonuc.sonGorulmeGizli,
      bildirimlerKapali: !!sonuc.bildirimlerKapali,
      dogumTarihiGizli: !!sonuc.dogumTarihiGizli,
      okunduBilgisiGizli: !!sonuc.okunduBilgisiGizli,
      biyografi: sonuc.biyografi || '',
      dogumTarihi: sonuc.dogumTarihi || dogumTarihi,
      profilResimUrl: sonuc.profilResimUrl || null,
      engellenenler: sonuc.engellenenler || [],
      sessizeAlinanlar: sonuc.sessizeAlinanlar || [],
    });
  }

  return (
    <SafeAreaView style={styles.kok} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.kok} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text style={styles.baslik}>Textly</Text>
          <Text style={styles.altBaslik}>Özgür ve modern mesajlaşma</Text>

          <View style={styles.sekmeler}>
            <TouchableOpacity
              style={[styles.sekme, !kayitModu && styles.sekmeAktif]}
              onPress={() => { setKayitModu(false); setHata(''); }}
            >
              <Text style={[styles.sekmeMetin, !kayitModu && styles.sekmeMetinAktif]}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sekme, kayitModu && styles.sekmeAktif]}
              onPress={() => { setKayitModu(true); setHata(''); }}
            >
              <Text style={[styles.sekmeMetin, kayitModu && styles.sekmeMetinAktif]}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.alanGrubu}>
            <Text style={styles.etiket}>KULLANICI ADI</Text>
            <TextInput
              style={styles.girdi}
              placeholder="orn. beratcan"
              placeholderTextColor={renkler.metinSoluk}
              value={kullaniciAdi}
              onChangeText={setKullaniciAdi}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.alanGrubu}>
            <Text style={styles.etiket}>ŞİFRE</Text>
            <TextInput
              style={styles.girdi}
              placeholder="Şifreni gir"
              placeholderTextColor={renkler.metinSoluk}
              value={sifre}
              onChangeText={setSifre}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          {kayitModu && (
            <View style={styles.alanGrubu}>
              <Text style={styles.etiket}>DOĞUM TARİHİ (İSTEĞE BAĞLI)</Text>
              <TextInput
                style={styles.girdi}
                placeholder="GG.AA.YYYY (Örn. 15.06.2000)"
                placeholderTextColor={renkler.metinSoluk}
                value={dogumTarihi}
                onChangeText={dogumTarihiFormatla}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          )}

          {!!hata && <Text style={styles.hataMetni}>{hata}</Text>}

          <TouchableOpacity style={styles.buton} onPress={gonder} activeOpacity={0.7} disabled={yukleniyor}>
            {yukleniyor ? (
              <ActivityIndicator color={renkler.kendiBalonMetin} />
            ) : (
              <Text style={styles.butonMetni}>{kayitModu ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.ipucu}>
            Sunucu adresi Cloudflare Tunnel'ı her başlattığında değişir.
            Değiştiğinde buraya yeni adresi yapıştırman yeterli.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function olusturStiller(renkler) {
  return StyleSheet.create({
  kok: { flex: 1, backgroundColor: renkler.arkaplan },
  icerik: { flexGrow: 1, justifyContent: 'center', padding: bosluk.lg },
  baslik: { color: renkler.metin, fontSize: 40, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
  altBaslik: { color: renkler.metinSoluk, fontSize: 14, textAlign: 'center', marginTop: bosluk.xs, marginBottom: bosluk.lg },
  sekmeler: { flexDirection: 'row', backgroundColor: renkler.yuzey, borderRadius: 10, padding: 4, marginBottom: bosluk.lg },
  sekme: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  sekmeAktif: { backgroundColor: renkler.kendiBalon },
  sekmeMetin: { color: renkler.metinSoluk, fontWeight: '600', fontSize: 14 },
  sekmeMetinAktif: { color: renkler.kendiBalonMetin },
  alanGrubu: { marginBottom: bosluk.md },
  etiket: { color: renkler.metinSoluk, fontSize: 11, letterSpacing: 1, marginBottom: bosluk.xs },
  girdi: {
    backgroundColor: renkler.yuzey,
    color: renkler.metin,
    borderWidth: 1,
    borderColor: renkler.cizgi,
    borderRadius: 10,
    paddingHorizontal: bosluk.md,
    paddingVertical: 14,
    fontSize: 16,
  },
  hataMetni: { color: renkler.hata, fontSize: 13, marginBottom: bosluk.md },
  buton: {
    backgroundColor: renkler.kendiBalon,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: bosluk.sm,
    minHeight: 52,
    justifyContent: 'center',
  },
  butonMetni: { color: renkler.kendiBalonMetin, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  ipucu: { color: renkler.metinSoluk, fontSize: 12, textAlign: 'center', marginTop: bosluk.xl, lineHeight: 18 },
});
}
