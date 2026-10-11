import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

function bytesToBase64(bytes) {
  let binary = '';
  const len = bytes.length;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// 16-bit PCM Harmonik Zil Melodisi Üreteci (Akustik Çan / Marimba melodi döngüsü)
function melodiWavUretBase64() {
  const sampleRate = 16000;
  const durationSec = 3.2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const totalLength = 44 + numSamples * 2;

  const bytes = new Uint8Array(totalLength);
  const headerStr = 'RIFF';
  for (let i = 0; i < 4; i++) bytes[i] = headerStr.charCodeAt(i);

  const fileLength = totalLength - 8;
  bytes[4] = fileLength & 0xff;
  bytes[5] = (fileLength >> 8) & 0xff;
  bytes[6] = (fileLength >> 16) & 0xff;
  bytes[7] = (fileLength >> 24) & 0xff;

  const waveFmt = 'WAVEfmt ';
  for (let i = 0; i < 8; i++) bytes[8 + i] = waveFmt.charCodeAt(i);

  bytes[16] = 16; bytes[17] = 0; bytes[18] = 0; bytes[19] = 0;
  bytes[20] = 1; bytes[21] = 0; // PCM
  bytes[22] = 1; bytes[23] = 0; // mono

  bytes[24] = sampleRate & 0xff;
  bytes[25] = (sampleRate >> 8) & 0xff;
  bytes[26] = (sampleRate >> 16) & 0xff;
  bytes[27] = (sampleRate >> 24) & 0xff;

  const byteRate = sampleRate * 2;
  bytes[28] = byteRate & 0xff;
  bytes[29] = (byteRate >> 8) & 0xff;
  bytes[30] = (byteRate >> 16) & 0xff;
  bytes[31] = (byteRate >> 24) & 0xff;

  bytes[32] = 2; bytes[33] = 0; // block align
  bytes[34] = 16; bytes[35] = 0; // 16-bit

  const dataStr = 'data';
  for (let i = 0; i < 4; i++) bytes[36 + i] = dataStr.charCodeAt(i);

  const dataSize = numSamples * 2;
  bytes[40] = dataSize & 0xff;
  bytes[41] = (dataSize >> 8) & 0xff;
  bytes[42] = (dataSize >> 16) & 0xff;
  bytes[43] = (dataSize >> 24) & 0xff;

  // Modern akıllı telefon zil melodisi notaları: E5, G#5, B5, E6, B5, E6
  const notes = [
    [0.00, 659.25, 0.22],
    [0.18, 830.61, 0.22],
    [0.36, 987.77, 0.22],
    [0.54, 1318.51, 0.35],
    [0.85, 987.77, 0.22],
    [1.05, 1318.51, 0.50],
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (let n = 0; n < notes.length; n++) {
      const nStart = notes[n][0];
      const freq = notes[n][1];
      const nDur = notes[n][2];
      if (t >= nStart && t < nStart + nDur) {
        const dt = t - nStart;
        const env = Math.exp(-6.5 * dt);
        const s1 = Math.sin(2 * Math.PI * freq * dt);
        const s2 = Math.sin(2 * Math.PI * freq * 2 * dt) * 0.35;
        const s3 = Math.sin(2 * Math.PI * freq * 3 * dt) * 0.12;
        sample += (s1 + s2 + s3) * env * 0.75;
      }
    }

    const val = Math.max(-1, Math.min(1, sample));
    const intVal = Math.floor(val * 28000);
    const uVal = intVal < 0 ? intVal + 65536 : intVal;
    bytes[44 + i * 2] = uVal & 0xff;
    bytes[44 + i * 2 + 1] = (uVal >> 8) & 0xff;
  }

  return bytesToBase64(bytes);
}

// 8-bit PCM basit ton üreteci (Arayan kişiye tuuutt sesi / arama sonu bip sesi için)
function wavUretBase64(freq1, freq2, durationSec, beepOnSec, beepOffSec) {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const totalLength = 44 + numSamples;

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

  bytes[16] = 16; bytes[17] = 0; bytes[18] = 0; bytes[19] = 0;
  bytes[20] = 1; bytes[21] = 0;
  bytes[22] = 1; bytes[23] = 0;

  bytes[24] = sampleRate & 0xff;
  bytes[25] = (sampleRate >> 8) & 0xff;
  bytes[26] = (sampleRate >> 16) & 0xff;
  bytes[27] = (sampleRate >> 24) & 0xff;

  bytes[28] = sampleRate & 0xff;
  bytes[29] = (sampleRate >> 8) & 0xff;
  bytes[30] = (sampleRate >> 16) & 0xff;
  bytes[31] = (sampleRate >> 24) & 0xff;

  bytes[32] = 1; bytes[33] = 0;
  bytes[34] = 8; bytes[35] = 0;

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
      bytes[44 + i] = Math.floor(128 + 55 * combined);
    } else {
      bytes[44 + i] = 128;
    }
  }

  return bytesToBase64(bytes);
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
    const s = aktifSesObjesi;
    aktifSesObjesi = null;
    try {
      await s.stopAsync();
      await s.unloadAsync();
    } catch {}
  }
}

// Çalıyor tonu (Giden arama: tuuutt... tuuutt...)
export async function araniyorSesiCal() {
  await sesleriDurdur();
  try {
    const b64 = wavUretBase64(425, 450, 3.2, 1.2, 2.0);
    const uri = await sesDosyasiHazirla('araniyor_ton_v2.wav', b64);
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

// Gerçekçi telefon zil melodisi (Gelen arama)
export async function gelenZilSesiCal() {
  await sesleriDurdur();
  try {
    const b64 = melodiWavUretBase64();
    const uri = await sesDosyasiHazirla('gelen_zil_melodisi_v2.wav', b64);
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

// Bağlandı sesi (Kısa olumlu ton)
export async function baglandiSesiCal() {
  await sesleriDurdur();
  try {
    const b64 = wavUretBase64(587, 880, 0.35, 0.35, 0);
    const uri = await sesDosyasiHazirla('baglandi_ton_v2.wav', b64);
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
    const b64 = wavUretBase64(425, 0, 1.2, 0.25, 0.15);
    const uri = await sesDosyasiHazirla('kapandi_ton_v2.wav', b64);
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
