import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function AnketOlusturModal({ visible, onKapat, onAnketGonder, renkler }) {
  const [soru, setSoru] = useState('');
  const [secenekler, setSecenekler] = useState(['', '']);
  const [cokluSecim, setCokluSecim] = useState(false);

  function secenekDegistir(metin, index) {
    const kopya = [...secenekler];
    kopya[index] = metin;
    setSecenekler(kopya);
  }

  function secenekEkle() {
    if (secenekler.length >= 8) {
      Alert.alert('Sınır', 'En fazla 8 seçenek ekleyebilirsiniz.');
      return;
    }
    setSecenekler((eski) => [...eski, '']);
  }

  function secenekSil(index) {
    if (secenekler.length <= 2) {
      Alert.alert('Uyarı', 'Anket en az 2 seçenek içermelidir.');
      return;
    }
    setSecenekler((eski) => eski.filter((_, i) => i !== index));
  }

  function gonder() {
    const temizSoru = soru.trim();
    if (!temizSoru) {
      Alert.alert('Eksik Bilgi', 'Lütfen anket için bir soru yazın.');
      return;
    }

    const doluSecenekler = secenekler
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (doluSecenekler.length < 2) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az 2 seçenek doldurun.');
      return;
    }

    const payload = {
      soru: temizSoru,
      secenekler: doluSecenekler.map((metin, idx) => ({
        id: idx + 1,
        metin,
        oylar: [],
      })),
      cokluSecim,
    };

    onAnketGonder(payload);
    // Sıfırla ve kapat
    setSoru('');
    setSecenekler(['', '']);
    setCokluSecim(false);
    onKapat();
  }

  function kapat() {
    setSoru('');
    setSecenekler(['', '']);
    setCokluSecim(false);
    onKapat();
  }

  const gecerliMi = soru.trim().length > 0 && secenekler.filter((s) => s.trim().length > 0).length >= 2;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={kapat}>
      <KeyboardAvoidingView
        style={styles.arkaplan}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.kutu}>
          {/* Başlık Barı */}
          <View style={styles.baslikBari}>
            <TouchableOpacity onPress={kapat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.kapatIkon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.baslik}>Yeni Anket Oluştur</Text>
            <TouchableOpacity
              onPress={gonder}
              disabled={!gecerliMi}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.gonderMetin, !gecerliMi && styles.gonderPasif]}>Gönder</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.icerik} keyboardShouldPersistTaps="handled">
            {/* Soru Girişi */}
            <Text style={styles.etiket}>Anket Sorusu</Text>
            <TextInput
              style={styles.soruGirdisi}
              placeholder="Bir soru sor..."
              placeholderTextColor="#8b949e"
              value={soru}
              onChangeText={setSoru}
              maxLength={250}
              multiline
            />

            {/* Seçenekler */}
            <Text style={[styles.etiket, { marginTop: 18 }]}>Seçenekler</Text>
            {secenekler.map((sec, idx) => (
              <View key={idx} style={styles.secenekSatiri}>
                <View style={styles.secenekNumaraKutu}>
                  <Text style={styles.secenekNumara}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={styles.secenekGirdisi}
                  placeholder={`Seçenek ${idx + 1}`}
                  placeholderTextColor="#8b949e"
                  value={sec}
                  onChangeText={(t) => secenekDegistir(t, idx)}
                  maxLength={150}
                />
                {secenekler.length > 2 && (
                  <TouchableOpacity
                    onPress={() => secenekSil(idx)}
                    style={styles.silButon}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.silMetin}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Seçenek Ekle Butonu */}
            {secenekler.length < 8 && (
              <TouchableOpacity style={styles.ekleButon} onPress={secenekEkle} activeOpacity={0.7}>
                <Text style={styles.ekleButonMetin}>+ Seçenek Ekle</Text>
              </TouchableOpacity>
            )}

            {/* Çoklu Seçim Anahtarı */}
            <View style={styles.ayarSatiri}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ayarBaslik}>Birden fazla yanıta izin ver</Text>
                <Text style={styles.ayarAltyazi}>Katılımcılar birden fazla seçeneği işaretleyebilir</Text>
              </View>
              <Switch
                value={cokluSecim}
                onValueChange={setCokluSecim}
                trackColor={{ false: '#30363d', true: '#00a8ff' }}
                thumbColor="#ffffff"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  kutu: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  baslikBari: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  kapatIkon: {
    color: '#8b949e',
    fontSize: 20,
    fontWeight: 'bold',
  },
  baslik: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  gonderMetin: {
    color: '#00a8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  gonderPasif: {
    color: '#484f58',
  },
  icerik: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  etiket: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  soruGirdisi: {
    backgroundColor: '#0d1117',
    color: '#ffffff',
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  secenekSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  secenekNumaraKutu: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#21262d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  secenekNumara: {
    color: '#8b949e',
    fontSize: 12,
    fontWeight: '700',
  },
  secenekGirdisi: {
    flex: 1,
    backgroundColor: '#0d1117',
    color: '#ffffff',
    fontSize: 15,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  silButon: {
    marginLeft: 10,
    padding: 6,
  },
  silMetin: {
    color: '#da3633',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ekleButon: {
    backgroundColor: 'rgba(0, 168, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.3)',
    marginTop: 6,
    marginBottom: 16,
  },
  ekleButonMetin: {
    color: '#00a8ff',
    fontSize: 15,
    fontWeight: '600',
  },
  ayarSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#30363d',
    marginTop: 8,
    marginBottom: 20,
  },
  ayarBaslik: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  ayarAltyazi: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 2,
  },
});
