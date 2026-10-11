import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableWithoutFeedback, TouchableOpacity,
  Animated, PanResponder, Image, ActivityIndicator, Linking, StyleSheet,
} from 'react-native';
import { Audio, Video, ResizeMode } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import BaglantiliMetin from './BaglantiliMetin';

const CIFT_TIK_ARALIGI = 280; // ms

function saatFormatla(zamanMs) {
  const d = new Date(zamanMs);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function durumMetni(durum) {
  if (durum === 'gonderiliyor') return 'gönderiliyor';
  if (durum === 'gonderildi') return 'gönderildi';
  if (durum === 'gorundu') return 'görüldü';
  if (durum === 'hata') return 'gönderilemedi ✕';
  return '';
}

function MesajBalonu({
  item, benim, hedefTuru, benimAdim, renkler, styles,
  onYanitla, onBegen, onTepki, onTekliMenu, onMedyaAc, onAlintiTikla, onAnketOyVer, vurgulu,
}) {
  const pan = useRef(new Animated.Value(0)).current;
  const kalpOlcek = useRef(new Animated.Value(0)).current;
  const vurguAnim = useRef(new Animated.Value(0)).current;
  const sonTiklama = useRef(0);
  const tekTikZamanlayici = useRef(null);
  const balonRef = useRef(null);

  useEffect(() => () => clearTimeout(tekTikZamanlayici.current), []);

  useEffect(() => {
    if (vurgulu) {
      Animated.sequence([
        Animated.timing(vurguAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(vurguAnim, { toValue: 0, duration: 800, delay: 600, useNativeDriver: false }),
      ]).start();
    }
  }, [vurgulu]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        !item.silindi && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !item.silindi && g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        pan.setValue(Math.max(0, Math.min(g.dx, 70)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 40) {
          onYanitla(item);
        }
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 6 }).start(),
    })
  ).current;

  function kalpGoster() {
    kalpOlcek.setValue(0);
    Animated.sequence([
      Animated.spring(kalpOlcek, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 12 }),
      Animated.timing(kalpOlcek, { toValue: 0, duration: 300, delay: 250, useNativeDriver: true }),
    ]).start();
  }

  function basildi() {
    if (item.silindi) return;
    const simdi = Date.now();
    if (simdi - sonTiklama.current < CIFT_TIK_ARALIGI) {
      clearTimeout(tekTikZamanlayici.current);
      sonTiklama.current = 0;
      onBegen(item);
      kalpGoster();
    } else {
      sonTiklama.current = simdi;
      tekTikZamanlayici.current = setTimeout(() => {
        // Link varsa tıklandığında direkt yönlendir
        const urlEslesme = item.metin?.match(/https?:\/\/[^\s]+/i);
        if (urlEslesme) {
          Linking.openURL(urlEslesme[0]).catch(() => {});
        }
      }, CIFT_TIK_ARALIGI + 20);
    }
  }

  function uzunBasildi() {
    if (item.silindi) return;
    if (balonRef.current && balonRef.current.measureInWindow) {
      balonRef.current.measureInWindow((x, y, width, height) => {
        onTekliMenu(item, { x, y, width, height });
      });
    } else {
      onTekliMenu(item, null);
    }
  }

  if (item.sistem) {
    return (
      <View style={styles.sistemMesajSatiri}>
        <View style={styles.sistemMesajKutu}>
          <Text style={styles.sistemMesajMetin}>{item.metin}</Text>
        </View>
      </View>
    );
  }

  const begeniSayisi = (item.begenenler || []).length;
  const okuyanlarSayisi = (item.okuyanlar || []).length;

  // Grup veya kisi icin durum metni
  let durumGostergesi = '';
  if (benim && !item.silindi) {
    if (item.durum === 'hata') {
      durumGostergesi = ' · gönderilemedi ✕';
    } else if (hedefTuru === 'grup') {
      if (okuyanlarSayisi > 0) {
        durumGostergesi = ` · ${okuyanlarSayisi} kişi gördü`;
      } else if (item.durum === 'gonderildi') {
        durumGostergesi = ' · iletildi';
      } else if (item.durum === 'gonderiliyor') {
        durumGostergesi = ' · gönderiliyor';
      }
    } else if (durumMetni(item.durum)) {
      durumGostergesi = ` · ${durumMetni(item.durum)}`;
    }
  }

  const vurguKenar = vurguAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 168, 255, 0)', 'rgba(0, 168, 255, 0.9)'],
  });

  const stickerMi = item.medyaTuru === 'sticker' ||
    item.medyaTuru === 'webp' ||
    item.medyaTuru === 'gif' ||
    Boolean(item.medyaUrl && /\.(webp|gif)$/i.test((item.medyaUrl || '').split('?')[0]));

  const tepkiSayisi = item.tepkiler && typeof item.tepkiler === 'object' ? Object.keys(item.tepkiler).length : 0;

  return (
    <View style={[styles.balonSatir, benim ? styles.sagaYasli : styles.solaYasli, (begeniSayisi > 0 || tepkiSayisi > 0) && { marginBottom: 18 }]}>
      <Animated.View {...panResponder.panHandlers} style={{ maxWidth: '82%', transform: [{ translateX: pan }] }}>
        <TouchableWithoutFeedback onPress={basildi} onLongPress={uzunBasildi} delayLongPress={300}>
          <Animated.View
            ref={balonRef}
            style={[
              styles.balon,
              stickerMi
                ? { backgroundColor: 'transparent', padding: 2, paddingHorizontal: 4, elevation: 0, shadowOpacity: 0, borderWidth: 0 }
                : (benim ? styles.kendiBalon : styles.digerBalon),
              {
                borderColor: vurguKenar,
                borderWidth: stickerMi ? 0 : 1.5,
              },
            ]}
          >
            {hedefTuru === 'grup' && !benim && !item.silindi && <Text style={styles.gonderenAdi}>{item.gonderen}</Text>}

            {!!item.yanit && !item.silindi && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onAlintiTikla && item.yanit?.id && onAlintiTikla(item.yanit.id)}
                style={[styles.alintiKutu, benim ? styles.alintiKutuKendi : styles.alintiKutuDiger]}
              >
                <Text style={[styles.alintiGonderen, benim ? styles.alintiGonderenKendi : styles.alintiGonderenDiger]}>
                  {item.yanit.gonderen}
                </Text>
                <Text
                  style={[styles.alintiMetin, benim ? styles.alintiMetinKendi : styles.alintiMetinDiger]}
                  numberOfLines={2}
                >
                  {item.yanit.metinOzet}
                </Text>
              </TouchableOpacity>
            )}

            {item.silindi ? (
              <Text style={styles.silinmisMetin}>Bu mesaj silindi</Text>
            ) : item.medyaUrl ? (
              <MedyaIcerik item={item} benim={benim} benimAdim={benimAdim} hedefTuru={hedefTuru} styles={styles} renkler={renkler} onMedyaAc={onMedyaAc} />
            ) : null}

            {!item.silindi && !!item.anket && (
              <AnketIcerik
                anket={item.anket}
                benimAdim={benimAdim}
                renkler={renkler}
                onOyVer={(secenekId) => onAnketOyVer && onAnketOyVer(item.id, secenekId)}
              />
            )}

            {!item.silindi && !item.anket && !!item.metin && (
              <BaglantiliMetin
                metin={item.metin}
                style={benim ? styles.kendiBalonMetin : styles.digerBalonMetin}
                baglantiStili={{ textDecorationLine: 'underline' }}
                mentionStili={{ fontWeight: '700', color: benim ? '#ffffff' : (renkler.vurgu || '#007aff') }}
              />
            )}

            <View
              style={[
                styles.altSatir,
                stickerMi && {
                  backgroundColor: 'rgba(15, 20, 28, 0.75)',
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  alignSelf: benim ? 'flex-end' : 'flex-start',
                  marginTop: 3,
                  borderWidth: 0.5,
                  borderColor: 'rgba(255, 255, 255, 0.18)',
                },
              ]}
            >
              {item.duzenlendi && !item.silindi && (
                <Text
                  style={[
                    styles.duzenlendiEtiketi,
                    stickerMi ? { color: 'rgba(255, 255, 255, 0.85)' } : (benim && styles.saatKendi),
                  ]}
                >
                  düzenlendi ·{' '}
                </Text>
              )}
              <Text
                style={[
                  styles.saat,
                  stickerMi ? { color: 'rgba(255, 255, 255, 0.9)' } : (benim && styles.saatKendi),
                ]}
              >
                {saatFormatla(item.zaman)}
              </Text>
              {!!durumGostergesi && (
                <Text
                  style={[
                    styles.durumYazi,
                    stickerMi
                      ? (item.durum === 'gorundu'
                          ? { color: '#38ef7d', fontWeight: '700' }
                          : { color: 'rgba(255, 255, 255, 0.95)' })
                      : (benim && styles.saatKendi),
                    item.durum === 'hata' && { color: renkler.hata },
                  ]}
                >
                  {durumGostergesi}
                </Text>
              )}
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.kalpPatlama,
                { opacity: kalpOlcek, transform: [{ scale: kalpOlcek.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }] },
              ]}
            >
              <Text style={styles.kalpPatlamaMetni}>♥</Text>
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Beğeni veya Emoji Tepki Rozetleri */}
        {(() => {
          const tepkiListesi = item.tepkiler && typeof item.tepkiler === 'object'
            ? Object.entries(item.tepkiler).filter(([, list]) => Array.isArray(list) && list.length > 0)
            : [];

          if (tepkiListesi.length > 0) {
            return (
              <View style={[balonEkstraStiller.tepkilerSatir, benim ? balonEkstraStiller.tepkilerSatirSag : balonEkstraStiller.tepkilerSatirSol]}>
                {tepkiListesi.map(([emoji, list]) => {
                  const benVerdim = list.some((u) => (u || '').toLowerCase() === (benimAdim || '').toLowerCase());
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        balonEkstraStiller.tepkiKapsul,
                        benVerdim && balonEkstraStiller.tepkiKapsulBenim,
                      ]}
                      onPress={() => onTepki && onTepki(item, emoji)}
                      activeOpacity={0.7}
                    >
                      <Text style={balonEkstraStiller.tepkiEmojiMetin}>{emoji}</Text>
                      {list.length > 1 && (
                        <Text style={[balonEkstraStiller.tepkiSayiMetin, benVerdim && balonEkstraStiller.tepkiSayiBenim]}>
                          {list.length}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          }

          if (begeniSayisi > 0) {
            return (
              <View style={[styles.begeniRozeti, benim ? styles.begeniRozetiSol : styles.begeniRozetiSag]}>
                <Text style={styles.begeniMetni}>♥ {begeniSayisi > 1 ? begeniSayisi : ''}</Text>
              </View>
            );
          }

          return null;
        })()}
      </Animated.View>
    </View>
  );
}

function OynatDurdurVektorIkon({ caliyor, renk }) {
  if (caliyor) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3.5, width: 16, height: 16 }}>
        <View style={{ width: 3.5, height: 13, backgroundColor: renk, borderRadius: 1.5 }} />
        <View style={{ width: 3.5, height: 13, backgroundColor: renk, borderRadius: 1.5 }} />
      </View>
    );
  }
  return (
    <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderStyle: 'solid',
          borderLeftWidth: 11,
          borderTopWidth: 6.5,
          borderBottomWidth: 6.5,
          borderLeftColor: renk,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          marginLeft: 2.5, // Üçgenin optik ağırlık merkezi
        }}
      />
    </View>
  );
}

function SesOynatici({ item, styles, renkler }) {
  const [caliyor, setCaliyor] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pozisyon, setPozisyon] = useState(0);
  const [sure, setSure] = useState(item.sure ? (item.sure < 1000 ? item.sure * 1000 : item.sure) : 0);
  const [barGenislik, setBarGenislik] = useState(140);
  const sesRef = useRef(null);

  useEffect(() => {
    return () => {
      if (sesRef.current) {
        sesRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  async function oynatDurdur() {
    try {
      if (caliyor && sesRef.current) {
        await sesRef.current.pauseAsync();
        setCaliyor(false);
        return;
      }
      if (sesRef.current) {
        const st = await sesRef.current.getStatusAsync();
        if (st.isLoaded) {
          if (st.didJustFinish || (st.positionMillis || 0) >= (st.durationMillis || 0) || pozisyon >= (sure || 1)) {
            await sesRef.current.setPositionAsync(0);
            await sesRef.current.playAsync();
            setPozisyon(0);
          } else {
            await sesRef.current.playAsync();
          }
          setCaliyor(true);
          return;
        }
      }
      setYukleniyor(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false, // Ses seviyesini kısma
        playThroughEarpieceAndroid: false, // Ahize yerine ana hoparlörden yüksek sesle çal
      }).catch(() => {});
      const { sound } = await Audio.Sound.createAsync(
        { uri: item._tamMedyaUrl },
        { shouldPlay: true, isLooping: false, progressUpdateIntervalMillis: 100 },
        (durum) => {
          if (durum.isLoaded) {
            setPozisyon(durum.positionMillis || 0);
            if (durum.durationMillis) setSure(durum.durationMillis);
            setCaliyor(durum.isPlaying);
            if (durum.didJustFinish) {
              setCaliyor(false);
              setPozisyon(0);
              sound.stopAsync().catch(() => {});
            }
          }
        }
      );
      await sound.setVolumeAsync(1.0);
      sesRef.current = sound;
      setYukleniyor(false);
      setCaliyor(true);
    } catch (e) {
      setYukleniyor(false);
      setCaliyor(false);
    }
  }

  async function konumaAtla(xKonum) {
    if (sure <= 0 || barGenislik <= 0) return;
    const yeniOran = Math.max(0, Math.min(1, xKonum / barGenislik));
    const hedefMs = Math.round(yeniOran * sure);
    setPozisyon(hedefMs);
    if (sesRef.current) {
      try {
        await sesRef.current.setPositionAsync(hedefMs);
      } catch (e) {}
    }
  }

  const sarmaPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        konumaAtla(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        konumaAtla(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const formatZaman = (ms) => {
    const saniye = Math.floor((ms || 0) / 1000);
    const dk = Math.floor(saniye / 60);
    const sn = saniye % 60;
    return `${dk}:${sn < 10 ? '0' : ''}${sn}`;
  };

  const oran = sure > 0 ? Math.min(1, pozisyon / sure) : 0;

  return (
    <View style={styles.sesOynaticiKutu}>
      <TouchableOpacity onPress={oynatDurdur} style={styles.sesOynatButon} disabled={yukleniyor}>
        {yukleniyor ? (
          <ActivityIndicator size="small" color={renkler.metin} />
        ) : (
          <OynatDurdurVektorIkon caliyor={caliyor} renk={renkler.metin} />
        )}
      </TouchableOpacity>
      <View style={styles.sesDalgaAlani}>
        <View
          style={styles.sesCubuguDokunmaAlani}
          onLayout={(e) => setBarGenislik(e.nativeEvent.layout.width)}
          {...sarmaPan.panHandlers}
        >
          <View style={styles.sesCubuguArkaplan}>
            <View style={[styles.sesCubuguDolu, { width: `${Math.round(oran * 100)}%` }]} />
          </View>
          <View
            style={[
              styles.sesScrubberNokta,
              {
                left: Math.max(0, Math.min(barGenislik - 14, oran * (barGenislik - 14))),
              },
            ]}
          />
        </View>
        <Text style={styles.sesSureMetni}>{formatZaman(caliyor ? pozisyon : sure || pozisyon)}</Text>
      </View>
    </View>
  );
}

function MedyaIcerik({ item, benim, benimAdim, hedefTuru, styles, renkler, onMedyaAc }) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hataVar, setHataVar] = useState(false);
  const [videoHata, setVideoHata] = useState(false);

  const stickerMi = item.medyaTuru === 'sticker' ||
    item.medyaTuru === 'webp' ||
    item.medyaTuru === 'gif' ||
    Boolean(item.medyaUrl && /\.(webp|gif)$/i.test((item.medyaUrl || '').split('?')[0]));

  if (item.tekGorunum) {
    if (benim) {
      return (
        <View style={[styles.tekGorunumBadge, { opacity: 0.85 }]}>
          <Text style={styles.tekGorunumBadgeMetni}>
            ① {item.medyaTuru === 'video' ? 'Video' : 'Fotoğraf'}
          </Text>
        </View>
      );
    }

    const isGrup = hedefTuru === 'grup' || item.hedefTuru === 'grup';
    const benKucuk = (benimAdim || '').trim().toLowerCase();
    const gorenler = Array.isArray(item.tekGorunumGorenler) ? item.tekGorunumGorenler : [];
    const benGordum = isGrup
      ? gorenler.some((u) => (u || '').trim().toLowerCase() === benKucuk)
      : (item.tekGorunumGoruldu || gorenler.some((u) => (u || '').trim().toLowerCase() === benKucuk));

    if (benGordum) {
      return (
        <View style={styles.tekGorunumBadge}>
          <Text style={styles.tekGorunumBadgeMetni}>Görüntülendi</Text>
        </View>
      );
    }

    return (
      <TouchableWithoutFeedback onPress={() => onMedyaAc(item)}>
        <View style={styles.tekGorunumBadge}>
          <Text style={styles.tekGorunumBadgeMetni}>
            ① {item.medyaTuru === 'video' ? 'Video' : 'Fotoğraf'}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  if (item.medyaTuru === 'ses') {
    return <SesOynatici item={item} styles={styles} renkler={renkler} />;
  }

  if (item.medyaTuru === 'video') {
    return (
      <TouchableWithoutFeedback onPress={() => onMedyaAc(item)}>
        <View style={styles.videoOnizleme}>
          <Text style={styles.videoOynatIkonu}>▶</Text>
          <Text style={styles.videoEtiketi}>Video</Text>
          {item.yaziKatmani && item.yaziKatmani.metin && (
            <View
              style={[
                styles.balonYaziKatmaniKutu,
                item.yaziKatmani.arkaplanModu === 'yariSaydam' && { backgroundColor: 'rgba(0, 0, 0, 0.72)' },
                item.yaziKatmani.arkaplanModu === 'dolu' && { backgroundColor: item.yaziKatmani.renk },
                item.yaziKatmani.arkaplanModu === 'neon' && {
                  borderColor: item.yaziKatmani.renk,
                  borderWidth: 1.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                },
              ]}
            >
              <Text
                style={[
                  styles.balonYaziKatmaniMetin,
                  {
                    color:
                      item.yaziKatmani.arkaplanModu === 'dolu'
                        ? item.yaziKatmani.renk === '#ffffff'
                          ? '#000000'
                          : '#ffffff'
                        : item.yaziKatmani.renk,
                  },
                ]}
                numberOfLines={2}
              >
                {item.yaziKatmani.metin}
              </Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  if (stickerMi) {
    const rawUrl = (item.medyaUrl || item._tamMedyaUrl || '').toLowerCase();
    const isVideoSticker = (
      /\.(mp4|webm|mov)(\?|$)/i.test(rawUrl) ||
      item.tur === 'video' ||
      item.stickerTuru === 'video' ||
      (item.mimeTuru && item.mimeTuru.startsWith('video/'))
    );
    const stickerUri = item._tamMedyaUrl || item.medyaUrl;

    return (
      <View style={{ width: 145, height: 145, justifyContent: 'center', alignItems: 'center', marginVertical: 2 }}>
        {yukleniyor && !hataVar && (
          <ActivityIndicator style={{ position: 'absolute' }} color={renkler.metinSoluk} />
        )}
        {isVideoSticker && !videoHata && stickerUri ? (
          <Video
            source={{ uri: stickerUri }}
            style={{ width: 140, height: 140 }}
            resizeMode={ResizeMode?.CONTAIN || 'contain'}
            isLooping
            shouldPlay
            isMuted
            useNativeControls={false}
            onLoadStart={() => setYukleniyor(true)}
            onReadyForDisplay={() => {
              setYukleniyor(false);
              setHataVar(false);
            }}
            onError={(e) => {
              console.warn('[VideoSticker] Video hatası, ExpoImage deneniyor:', e);
              setVideoHata(true);
            }}
          />
        ) : stickerUri ? (
          <ExpoImage
            source={{ uri: stickerUri }}
            style={{ width: 140, height: 140 }}
            contentFit="contain"
            autoplay={true}
            cachePolicy="memory-disk"
            onLoadStart={() => setYukleniyor(true)}
            onLoad={() => {
              setYukleniyor(false);
              setHataVar(false);
            }}
            onError={(e) => {
              console.warn('[StickerImage] Görsel yükleme hatası:', e);
              setYukleniyor(false);
              setHataVar(true);
            }}
          />
        ) : null}
        {hataVar && (
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Yüklenemedi</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => onMedyaAc(item)}>
      <View style={styles.fotoOnizlemeKutu}>
        {yukleniyor && !hataVar && (
          <ActivityIndicator style={{ position: 'absolute', alignSelf: 'center', top: '40%' }} color={renkler.metinSoluk} />
        )}
        {hataVar ? (
          <Text style={styles.tekGorunumMetni}>📷 Yüklenemedi</Text>
        ) : (
          <Image
            source={{ uri: item._tamMedyaUrl }}
            style={styles.fotoOnizleme}
            onLoadEnd={() => setYukleniyor(false)}
            onError={() => { setYukleniyor(false); setHataVar(true); }}
          />
        )}
        {item.yaziKatmani && item.yaziKatmani.metin && (
          <View
            style={[
              styles.balonYaziKatmaniKutu,
              item.yaziKatmani.arkaplanModu === 'yariSaydam' && { backgroundColor: 'rgba(0, 0, 0, 0.72)' },
              item.yaziKatmani.arkaplanModu === 'dolu' && { backgroundColor: item.yaziKatmani.renk },
              item.yaziKatmani.arkaplanModu === 'neon' && {
                borderColor: item.yaziKatmani.renk,
                borderWidth: 1.5,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
              },
            ]}
          >
            <Text
              style={[
                styles.balonYaziKatmaniMetin,
                {
                  color:
                    item.yaziKatmani.arkaplanModu === 'dolu'
                      ? item.yaziKatmani.renk === '#ffffff'
                        ? '#000000'
                        : '#ffffff'
                      : item.yaziKatmani.renk,
                },
              ]}
              numberOfLines={2}
            >
              {item.yaziKatmani.metin}
            </Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

function AnketIcerik({ anket, benimAdim, renkler, onOyVer }) {
  const soru = anket?.soru || 'Anket';
  const secenekler = anket?.secenekler || [];
  const cokluSecim = !!anket?.cokluSecim;

  const toplamOy = secenekler.reduce((acc, s) => acc + (Array.isArray(s.oylar) ? s.oylar.length : 0), 0);

  return (
    <View style={anketStilleri.kutu}>
      <Text style={anketStilleri.soru}>{soru}</Text>
      <Text style={anketStilleri.altBilgi}>
        Anket · {toplamOy} oy · {cokluSecim ? 'Çoklu seçim' : 'Tek seçim'}
      </Text>

      <View style={anketStilleri.seceneklerListesi}>
        {secenekler.map((sec) => {
          const oySayisi = Array.isArray(sec.oylar) ? sec.oylar.length : 0;
          const yuzde = toplamOy > 0 ? Math.round((oySayisi / toplamOy) * 100) : 0;
          const benimOyum = Array.isArray(sec.oylar) && sec.oylar.some((u) => (u || '').toLowerCase() === (benimAdim || '').toLowerCase());

          return (
            <TouchableOpacity
              key={sec.id}
              style={[anketStilleri.secenekKart, benimOyum && anketStilleri.secenekKartSecili]}
              onPress={() => onOyVer && onOyVer(sec.id)}
              activeOpacity={0.7}
            >
              {/* Dolgu Barı */}
              <View style={[anketStilleri.dolguBari, { width: `${yuzde}%` }, benimOyum && anketStilleri.dolguBariSecili]} />

              <View style={anketStilleri.secenekIcerik}>
                {/* Checkbox / Radio Daire */}
                <View style={[anketStilleri.daire, benimOyum && anketStilleri.daireSecili]}>
                  {benimOyum && <Text style={anketStilleri.tikMetin}>✓</Text>}
                </View>

                {/* Seçenek Metni */}
                <Text style={[anketStilleri.secenekMetin, benimOyum && anketStilleri.secenekMetinSecili]} numberOfLines={2}>
                  {sec.metin}
                </Text>

                {/* Yüzde & Sayı */}
                <Text style={anketStilleri.yuzdeMetin}>
                  %{yuzde} ({oySayisi})
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const anketStilleri = StyleSheet.create({
  kutu: {
    minWidth: 230,
    maxWidth: 290,
    paddingVertical: 4,
    marginBottom: 4,
  },
  soru: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  altBilgi: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    marginBottom: 10,
  },
  seceneklerListesi: {
    gap: 7,
  },
  secenekKart: {
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 38,
    justifyContent: 'center',
  },
  secenekKartSecili: {
    borderColor: '#00a8ff',
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
  },
  dolguBari: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dolguBariSecili: {
    backgroundColor: 'rgba(0, 168, 255, 0.28)',
  },
  secenekIcerik: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    zIndex: 1,
  },
  daire: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  daireSecili: {
    borderColor: '#00a8ff',
    backgroundColor: '#00a8ff',
  },
  tikMetin: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  secenekMetin: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  secenekMetinSecili: {
    fontWeight: '700',
  },
  yuzdeMetin: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
});

const balonEkstraStiller = StyleSheet.create({
  tepkilerSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: -8,
    marginBottom: 6,
    zIndex: 2,
  },
  tepkilerSatirSag: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  tepkilerSatirSol: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  tepkiKapsul: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f242c',
    borderRadius: 14,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  tepkiKapsulBenim: {
    backgroundColor: 'rgba(0, 168, 255, 0.22)',
    borderColor: '#00a8ff',
  },
  tepkiEmojiMetin: {
    fontSize: 13,
  },
  tepkiSayiMetin: {
    color: '#c9d1d9',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  tepkiSayiBenim: {
    color: '#00a8ff',
    fontWeight: '700',
  },
});

export default React.memo(MesajBalonu, (prevProps, nextProps) => {
  return (
    prevProps.item === nextProps.item &&
    prevProps.item?.tepkiler === nextProps.item?.tepkiler &&
    prevProps.item?.anket === nextProps.item?.anket &&
    prevProps.benim === nextProps.benim &&
    prevProps.hedefTuru === nextProps.hedefTuru &&
    prevProps.benimAdim === nextProps.benimAdim &&
    prevProps.renkler === nextProps.renkler &&
    prevProps.vurgulu === nextProps.vurgulu
  );
});
