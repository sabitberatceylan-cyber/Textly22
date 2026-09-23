import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { pushTokenKaydet } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Belirtilen sohbet için gelen yeni mesaj bildirimini gösterir (eski mesajları biriktirmez, sadece yeni mesajı gösterir)
export async function yerelBildirimGoster(anahtar, baslik, yeniMetin, resimUrl) {
  const govde = yeniMetin || 'Yeni bir mesajınız var';
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'sohbet-' + anahtar,
      content: {
        title: baslik,
        body: govde,
        sound: true,
        data: { anahtar, profilResimUrl: resimUrl || '' },
        attachments: resimUrl ? [{ url: resimUrl }] : [],
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Yerel bildirim gosterilemedi:', e.message);
  }
}

// Kullanici o sohbeti actiginda bekleyen bildirimi temizle
export async function bildirimSayaciniSifirla(anahtar) {
  try {
    await Notifications.dismissNotificationAsync('sohbet-' + anahtar);
  } catch {}
}

// Uygulama one gelince TUM bekleyen bildirimleri temizle
export async function tumBildirimleriTemizle() {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {}
}

// Bildirim izni ister, cihazin FCM push token'ini alir ve sunucuya kaydeder.
// Herhangi bir adimda sorun olursa (izin verilmedi, gercek cihaz degil, vs.)
// sessizce vazgecer - bildirimler olmadan da uygulama calismaya devam eder.
export async function bildirimlerICinKurulumYap(sunucuAdres, kullanici, sifre) {
  try {
    if (!Device.isDevice) return; // emulatorde push token alinamaz

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('varsayilan', {
        name: 'Mesajlar ve Bildirimler',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00a8ff',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const mevcutIzin = await Notifications.getPermissionsAsync();
    let durum = mevcutIzin.status;
    if (durum !== 'granted') {
      const istek = await Notifications.requestPermissionsAsync();
      durum = istek.status;
    }
    if (durum !== 'granted') return;

    const sonuc = await Notifications.getDevicePushTokenAsync();
    if (sonuc?.data) {
      await pushTokenKaydet(sunucuAdres, kullanici, sifre, sonuc.data);
    }
  } catch (e) {
    console.warn('Bildirim kurulumu basarisiz (sorun degil, uygulama calismaya devam eder):', e.message);
  }
}
