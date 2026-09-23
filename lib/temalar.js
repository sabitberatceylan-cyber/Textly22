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
  {
    id: 'spiderman-v2',
    isim: 'Spider-Man 2 (Ağda Asılı)',
    ornekRenk: '#ff1744',
    desen: 'spiderman-v2',
    renkler: {
      arkaplan: '#000000', yuzey: '#0a0d12', cizgi: '#1b222d',
      metin: '#f0f4f8', metinSoluk: '#7d8b99',
      kendiBalon: '#b71c1c', kendiBalonMetin: '#ffffff',
      digerBalon: '#12161f', digerBalonMetin: '#f0f4f8',
      vurgu: '#00b0ff', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'hello-kitty-v2',
    isim: 'Hello Kitty V2 (Kawaii)',
    ornekRenk: '#ff4081',
    desen: 'hello-kitty-v2',
    renkler: {
      arkaplan: '#140c12', yuzey: '#1f121b', cizgi: '#361d2e',
      metin: '#fff5f8', metinSoluk: '#e098b8',
      kendiBalon: '#e91e63', kendiBalonMetin: '#ffffff',
      digerBalon: '#241420', digerBalonMetin: '#fff5f8',
      vurgu: '#ff4081', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'kuromi-v2',
    isim: 'Kuromi V2 (Gothic)',
    ornekRenk: '#d500f9',
    desen: 'kuromi-v2',
    renkler: {
      arkaplan: '#090510', yuzey: '#140a22', cizgi: '#271240',
      metin: '#faf4ff', metinSoluk: '#b597d9',
      kendiBalon: '#8e24aa', kendiBalonMetin: '#ffffff',
      digerBalon: '#190c2a', digerBalonMetin: '#faf4ff',
      vurgu: '#d500f9', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'batman',
    isim: 'Batman (Kara Şövalye)',
    ornekRenk: '#ffd600',
    desen: 'batman',
    renkler: {
      arkaplan: '#060709', yuzey: '#101217', cizgi: '#20242e',
      metin: '#f2f4f8', metinSoluk: '#788292',
      kendiBalon: '#232936', kendiBalonMetin: '#ffffff',
      digerBalon: '#14171d', digerBalonMetin: '#f2f4f8',
      vurgu: '#ffd600', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'rick-and-morty',
    isim: 'Rick & Morty (Portal)',
    ornekRenk: '#00e676',
    desen: 'rick-and-morty',
    renkler: {
      arkaplan: '#040b10', yuzey: '#0a1620', cizgi: '#122636',
      metin: '#e8faf0', metinSoluk: '#68b088',
      kendiBalon: '#00897b', kendiBalonMetin: '#ffffff',
      digerBalon: '#0c1b26', digerBalonMetin: '#e8faf0',
      vurgu: '#00e676', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'spongebob',
    isim: 'SüngerBob (Bikini)',
    ornekRenk: '#ffea00',
    desen: 'spongebob',
    renkler: {
      arkaplan: '#04101d', yuzey: '#0a1b2e', cizgi: '#12304d',
      metin: '#fffde7', metinSoluk: '#6ea2cc',
      kendiBalon: '#f57f17', kendiBalonMetin: '#ffffff',
      digerBalon: '#0d2238', digerBalonMetin: '#fffde7',
      vurgu: '#ffea00', hata: '#ff5252', basarili: '#34d399',
    },
  },
  {
    id: 'naruto',
    isim: 'Naruto (Sharingan)',
    ornekRenk: '#ff1744',
    desen: 'naruto',
    renkler: {
      arkaplan: '#100505', yuzey: '#1a0909', cizgi: '#331212',
      metin: '#fff0f0', metinSoluk: '#c47d7d',
      kendiBalon: '#b71c1c', kendiBalonMetin: '#ffffff',
      digerBalon: '#220b0b', digerBalonMetin: '#fff0f0',
      vurgu: '#ff1744', hata: '#ff5252', basarili: '#34d399',
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
