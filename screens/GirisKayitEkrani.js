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
import OzelTarihSeciciModal from '../components/OzelTarihSeciciModal';

const SABIT_SUNUCU = 'https://textly.exzehub.com.tr';

export default function GirisKayitEkrani({ onGiris }) {
  const { renkler } = useTema();
  const styles = useMemo(() => olusturStiller(renkler), [renkler]);
  const [kayitModu, setKayitModu] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [tarihSeciciAcik, setTarihSeciciAcik] = useState(false);
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

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
          <Text style={styles.altBaslik}>Deneysel mesajlaşma uygulaması</Text>

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
              <TouchableOpacity
                style={[styles.girdi, { justifyContent: 'center' }]}
                onPress={() => setTarihSeciciAcik(true)}
                activeOpacity={0.7}
              >
                <Text style={{ color: dogumTarihi ? renkler.metin : renkler.metinSoluk, fontSize: 16 }}>
                  {dogumTarihi || 'GG.AA.YYYY (Örn. 15.06.2000)'}
                </Text>
              </TouchableOpacity>
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
        </ScrollView>
      </KeyboardAvoidingView>

      <OzelTarihSeciciModal
        visible={tarihSeciciAcik}
        mevcutTarih={dogumTarihi || '01.01.2000'}
        onKapat={() => setTarihSeciciAcik(false)}
        onKaydet={(secilenTarih) => {
          setDogumTarihi(secilenTarih);
          setTarihSeciciAcik(false);
        }}
      />
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
