import AsyncStorage from '@react-native-async-storage/async-storage';

const ONEK = 'mesaj-onbellek:';
const MAKS_MESAJ = 100; // her sohbet icin yerelde tutulan en fazla mesaj sayisi

export async function onbellektenYukle(anahtar) {
  try {
    const ham = await AsyncStorage.getItem(ONEK + anahtar);
    if (!ham) return [];
    return JSON.parse(ham);
  } catch {
    return [];
  }
}

export async function onbellegeKaydet(anahtar, mesajlar) {
  try {
    // Sadece sunucudan onay almis (id'si olan) mesajlari kalicilastir;
    // "gonderiliyor" durumundaki gecici mesajlar bir sonraki acilista yanlislikla takilip kalmasin.
    const onayli = mesajlar.filter((m) => m.id != null);
    const kisaltilmis = onayli.slice(-MAKS_MESAJ);
    await AsyncStorage.setItem(ONEK + anahtar, JSON.stringify(kisaltilmis));
  } catch {
    // onbellek yazilamazsa sessizce gec, uygulama sunucudan yuklemeye devam eder
  }
}
