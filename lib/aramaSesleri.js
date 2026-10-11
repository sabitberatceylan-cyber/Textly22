import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Basit PCM WAV dosya üreteci (saf JS - hiçbir harici ses dosyasına bağımlılık yok)
function wavUretBase64(freq1, freq2, durationSec, beepOnSec, beepOffSec) {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const totalLength = 44 + numSamples;

  // Header 44 bayt
  const bytes = new Uint8Array(totalLength);
  const headerStr = 'RIFF';
  for (let i = 0; i < 4; i++) bytes[i] = headerStr.charCodeAt(i);

  const fileLength = 36 + numSamples;
  bytes[4] = fileLength & 0xff;
  bytes[5] = (fileLength >> 8) & 0xff;
  bytes[6] = (fileLength >> 16) & 0xff;
  bytes[7] = (fileLength >> 24) & 0xff;

  const waveFmt = 'WAVEfmt ';
  for (let i = 0; i < 8; i++) bytes[8 + i] = waveFmt.charCodeAt(i);

  bytes[16] = 16; bytes[17] = 0; bytes[18] = 0; bytes[19] = 0; // subchunk1 size = 16
  bytes[20] = 1; bytes[21] = 0; // PCM = 1
  bytes[22] = 1; bytes[23] = 0; // mono = 1

  bytes[24] = sampleRate & 0xff;
  bytes[25] = (sampleRate >> 8) & 0xff;
  bytes[26] = (sampleRate >> 16) & 0xff;
  bytes[27] = (sampleRate >> 24) & 0xff;

  bytes[28] = sampleRate & 0xff;
  bytes[29] = (sampleRate >> 8) & 0xff;
  bytes[30] = (sampleRate >> 16) & 0xff;
  bytes[31] = (sampleRate >> 24) & 0xff;

  bytes[32] = 1; bytes[33] = 0; // block align = 1
  bytes[34] = 8; bytes[35] = 0; // 8-bit

  const dataStr = 'data';
  for (let i = 0; i < 4; i++) bytes[36 + i] = dataStr.charCodeAt(i);

  bytes[40] = numSamples & 0xff;
  bytes[41] = (numSamples >> 8) & 0xff;
  bytes[42] = (numSamples >> 16) & 0xff;
  bytes[43] = (numSamples >> 24) & 0xff;

  const cycle = beepOnSec + beepOffSec;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const posInCycle = t % cycle;
    if (posInCycle < beepOnSec) {
      const s1 = Math.sin(2 * Math.PI * freq1 * t);
      const s2 = freq2 ? Math.sin(2 * Math.PI * freq2 * t) : 0;
      const combined = freq2 ? (s1 + s2) * 0.5 : s1;
      bytes[44 + i] = Math.floor(128 + 60 * combined);
    } else {
      bytes[44 + i] = 128;
    }
  }

  // Uint8Array -> base64
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let aktifSesObjesi = null;

async function sesDosyasiHazirla(dosyaAdi, base64Veri) {
  try {
    const dosyaYolu = `${FileSystem.cacheDirectory}${dosyaAdi}`;
    const bilgi = await FileSystem.getInfoAsync(dosyaYolu);
    if (!bilgi.exists) {
      await FileSystem.writeAsStringAsync(dosyaYolu, base64Veri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    return dosyaYolu;
  } catch {
    return null;
  }
}

export async function sesleriDurdur() {
  if (aktifSesObjesi) {
    try {
      await aktifSesObjesi.stopAsync();
      await aktifSesObjesi.unloadAsync();
    } catch {}
    aktifSesObjesi = null;
  }
}

// Çalıyor tonu (Giden arama: tuuutt... tuuutt...)
export async function araniyorSesiCal() {
  await sesleriDurdur();
  try {
    const b64 = wavUretBase64(440, 480, 2.5, 1.2, 1.3);
    const uri = await sesDosyasiHazirla('araniyor_ton.wav', b64);
    if (!uri) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: true, volume: 0.7 }
    );
    aktifSesObjesi = sound;
  } catch {}
}

// Zil sesi (Gelen arama: telefon zil melodisi)
export async function gelenZilSesiCal() {
  await sesleriDurdur();
  try {
    const b64 = wavUretBase64(800, 1000, 2.0, 1.4, 0.6);
    const uri = await sesDosyasiHazirla('gelen_zil_ton.wav', b64);
    if (!uri) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );
    aktifSesObjesi = sound;
  } catch {}
}

// Bağlandı bip sesi (kısa pozitif ton)
export async function baglandiSesiCal() {
  await sesleriDurdur();
  try {
    const b64 = wavUretBase64(600, 800, 0.35, 0.35, 0);
    const uri = await sesDosyasiHazirla('baglandi_ton.wav', b64);
    if (!uri) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: false, volume: 0.6 }
    );
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch {}
}

// Kapandı / Meşgul sesi (düt - düt - düt)
export async function kapandiSesiCal() {
  await sesleriDurdur();
  try {
    const b64 = wavUretBase64(420, 0, 1.2, 0.25, 0.15);
    const uri = await sesDosyasiHazirla('kapandi_ton.wav', b64);
    if (!uri) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: false, volume: 0.7 }
    );
    aktifSesObjesi = sound;
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        aktifSesObjesi = null;
      }
    });
  } catch {}
}
