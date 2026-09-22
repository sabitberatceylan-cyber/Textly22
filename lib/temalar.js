import AsyncStorage from '@react-native-async-storage/async-storage';

// Her tema, mevcut renk anahtarlarinin (theme.js) tamamini icerir,
// boylece SohbetEkrani stilleri degisiklik yapmadan calisir.
export const SOHBET_TEMALARI = [
  {
    id: 'varsayilan',
    isim: 'Varsayılan Grafit',
    ornekRenk: '#00a8ff',
    renkler: {
      arkaplan: '#0c0e12', yuzey: '#13161c', cizgi: '#222630',
      metin: '#edf1f7', metinSoluk: '#858d9b',
      kendiBalon: '#202634', kendiBalonMetin: '#ffffff',
      digerBalon: '#161920', digerBalonMetin: '#e2e7ef',
      vurgu: '#00a8ff', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'ask',
    isim: 'Pudra Gül',
    ornekRenk: '#d45d79',
    renkler: {
      arkaplan: '#140d12', yuzey: '#1e131b', cizgi: '#341f2e',
      metin: '#faebf0', metinSoluk: '#c28b9e',
      kendiBalon: '#782d46', kendiBalonMetin: '#ffffff',
      digerBalon: '#241620', digerBalonMetin: '#faebf0',
      vurgu: '#d45d79', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'okyanus',
    isim: 'Okyanus',
    ornekRenk: '#3a86ff',
    renkler: {
      arkaplan: '#09111a', yuzey: '#0f1d2c', cizgi: '#1a2f45',
      metin: '#eaf2fc', metinSoluk: '#7fa3c7',
      kendiBalon: '#1d4875', kendiBalonMetin: '#ffffff',
      digerBalon: '#142538', digerBalonMetin: '#eaf2fc',
      vurgu: '#3a86ff', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'orman',
    isim: 'Okaliptüs',
    ornekRenk: '#4e9b6f',
    renkler: {
      arkaplan: '#0a130e', yuzey: '#112018', cizgi: '#1d3629',
      metin: '#ecf7f0', metinSoluk: '#83ab93',
      kendiBalon: '#245437', kendiBalonMetin: '#ffffff',
      digerBalon: '#15291e', digerBalonMetin: '#ecf7f0',
      vurgu: '#4e9b6f', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'gunbatimi',
    isim: 'Gün Batımı',
    ornekRenk: '#d97736',
    renkler: {
      arkaplan: '#140e0a', yuzey: '#201610', cizgi: '#36251b',
      metin: '#fdf2e9', metinSoluk: '#c7997b',
      kendiBalon: '#6b371b', kendiBalonMetin: '#ffffff',
      digerBalon: '#261a13', digerBalonMetin: '#fdf2e9',
      vurgu: '#d97736', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'neon',
    isim: 'Ametist',
    ornekRenk: '#8f62cc',
    renkler: {
      arkaplan: '#100c17', yuzey: '#191324', cizgi: '#2c203f',
      metin: '#f5eefa', metinSoluk: '#aa93c7',
      kendiBalon: '#4b2c75', kendiBalonMetin: '#ffffff',
      digerBalon: '#1f162d', digerBalonMetin: '#f5eefa',
      vurgu: '#8f62cc', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'minimal-acik',
    isim: 'Minimal Kağıt',
    ornekRenk: '#2b3445',
    renkler: {
      arkaplan: '#f4f6f9', yuzey: '#ffffff', cizgi: '#e1e5ec',
      metin: '#1b2230', metinSoluk: '#697587',
      kendiBalon: '#253248', kendiBalonMetin: '#ffffff',
      digerBalon: '#eaedf3', digerBalonMetin: '#1b2230',
      vurgu: '#253248', hata: '#d70015', basarili: '#248a3d',
    },
  },
  {
    id: 'lavanta',
    isim: 'Lavanta Rüyası',
    ornekRenk: '#a390e4',
    renkler: {
      arkaplan: '#110f18', yuzey: '#1a1725', cizgi: '#2b263d',
      metin: '#f4effe', metinSoluk: '#9e94ba',
      kendiBalon: '#433663', kendiBalonMetin: '#ffffff',
      digerBalon: '#201c2e', digerBalonMetin: '#f4effe',
      vurgu: '#a390e4', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'mocha',
    isim: 'Sıcak Mocha',
    ornekRenk: '#a87b51',
    renkler: {
      arkaplan: '#14100d', yuzey: '#1f1915', cizgi: '#332a23',
      metin: '#fbf1e8', metinSoluk: '#baa08a',
      kendiBalon: '#4e3725', kendiBalonMetin: '#ffffff',
      digerBalon: '#261e19', digerBalonMetin: '#fbf1e8',
      vurgu: '#a87b51', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'ada-cayi',
    isim: 'Huzurlu Adaçayı',
    ornekRenk: '#6e937b',
    renkler: {
      arkaplan: '#0d1310', yuzey: '#141d18', cizgi: '#223129',
      metin: '#ecf4ef', metinSoluk: '#88a794',
      kendiBalon: '#294534', kendiBalonMetin: '#ffffff',
      digerBalon: '#18241e', digerBalonMetin: '#ecf4ef',
      vurgu: '#6e937b', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'gece-mavisi',
    isim: 'Gece Yarısı Safiri',
    ornekRenk: '#4d82a6',
    renkler: {
      arkaplan: '#090e14', yuzey: '#101721', cizgi: '#1b2838',
      metin: '#eaf2f8', metinSoluk: '#7b9eb8',
      kendiBalon: '#213c54', kendiBalonMetin: '#ffffff',
      digerBalon: '#141f2c', digerBalonMetin: '#eaf2f8',
      vurgu: '#4d82a6', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'nordik',
    isim: 'Nordik Sis',
    ornekRenk: '#6e859e',
    renkler: {
      arkaplan: '#0e1115', yuzey: '#161a20', cizgi: '#252b36',
      metin: '#eef2f7', metinSoluk: '#8494a8',
      kendiBalon: '#2e3b4d', kendiBalonMetin: '#ffffff',
      digerBalon: '#1b2129', digerBalonMetin: '#eef2f7',
      vurgu: '#6e859e', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'seftali',
    isim: 'Pudra Şeftali',
    ornekRenk: '#d47a61',
    renkler: {
      arkaplan: '#140e0d', yuzey: '#201715', cizgi: '#362623',
      metin: '#fdf0ed', metinSoluk: '#c49387',
      kendiBalon: '#5c3127', kendiBalonMetin: '#ffffff',
      digerBalon: '#271b18', digerBalonMetin: '#fdf0ed',
      vurgu: '#d47a61', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'hello-kitty',
    isim: 'Hello Kitty',
    ornekRenk: '#ff80ab',
    desen: 'hello-kitty',
    renkler: {
      arkaplan: '#170e14', yuzey: '#241520', cizgi: '#3d1e33',
      metin: '#fff0f6', metinSoluk: '#d49ab5',
      kendiBalon: '#d81b60', kendiBalonMetin: '#ffffff',
      digerBalon: '#261621', digerBalonMetin: '#fff0f6',
      vurgu: '#ff80ab', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'spiderman',
    isim: 'Spider-Man',
    ornekRenk: '#e53935',
    desen: 'spiderman',
    renkler: {
      arkaplan: '#0a0e17', yuzey: '#121824', cizgi: '#1f2b3e',
      metin: '#f0f4f8', metinSoluk: '#7d92ab',
      kendiBalon: '#c62828', kendiBalonMetin: '#ffffff',
      digerBalon: '#151e2e', digerBalonMetin: '#f0f4f8',
      vurgu: '#2979ff', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'kuromi',
    isim: 'Kuromi',
    ornekRenk: '#b388ff',
    desen: 'kuromi',
    renkler: {
      arkaplan: '#0e0b14', yuzey: '#181222', cizgi: '#2c1e3d',
      metin: '#f5efff', metinSoluk: '#a491bd',
      kendiBalon: '#7b1fa2', kendiBalonMetin: '#ffffff',
      digerBalon: '#1f162c', digerBalonMetin: '#f5efff',
      vurgu: '#ea80fc', hata: '#ff5252', basarili: '#34d399',
    },
  },
];

const ONEK = 'sohbet-tema:';

export async function sohbetTemasiniYukle(anahtar) {
  try {
    const id = await AsyncStorage.getItem(ONEK + anahtar);
    return SOHBET_TEMALARI.find((t) => t.id === id) || SOHBET_TEMALARI[0];
  } catch {
    return SOHBET_TEMALARI[0];
  }
}

export async function sohbetTemasiniKaydet(anahtar, temaId) {
  try {
    await AsyncStorage.setItem(ONEK + anahtar, temaId);
  } catch {}
}
