const fs = require('fs');
const path = require('path');

const expoNotificationsDir = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'notifications'
);

const remoteContentFile = path.join(expoNotificationsDir, 'notifications', 'model', 'RemoteNotificationContent.kt');
const builderFile = path.join(expoNotificationsDir, 'notifications', 'presentation', 'builders', 'ExpoNotificationBuilder.kt');

if (!fs.existsSync(remoteContentFile) || !fs.existsSync(builderFile)) {
  console.log('[patch-notifications] expo-notifications dosyalari bulunamadi, atlaniyor.');
  process.exit(0);
}

// ==========================================
// 1. RemoteNotificationContent.kt Güncellemesi
// data["imageUrl"] ve data["profilResimUrl"] desteği ekle
// ==========================================
try {
  let remoteContent = fs.readFileSync(remoteContentFile, 'utf8');
  let remoteModified = false;

  const targetGetImage = `  override suspend fun getImage(context: Context): Bitmap? {
    val uri = remoteMessage.notification?.imageUrl
    return uri?.let { downloadImage(it) }
  }`;

  const replacementGetImage = `  override suspend fun getImage(context: Context): Bitmap? {
    val uri = remoteMessage.notification?.imageUrl
      ?: remoteMessage.data["imageUrl"]?.let { android.net.Uri.parse(it) }
      ?: remoteMessage.data["profilResimUrl"]?.let { android.net.Uri.parse(it) }
    return uri?.let { downloadImage(it) }
  }`;

  const targetContainsImage = `  override fun containsImage(): Boolean {
    return remoteMessage.notification?.imageUrl != null
  }`;

  const replacementContainsImage = `  override fun containsImage(): Boolean {
    return remoteMessage.notification?.imageUrl != null
      || !remoteMessage.data["imageUrl"].isNullOrEmpty()
      || !remoteMessage.data["profilResimUrl"].isNullOrEmpty()
  }`;

  if (remoteContent.includes(targetGetImage)) {
    remoteContent = remoteContent.replace(targetGetImage, replacementGetImage);
    remoteModified = true;
  }
  if (remoteContent.includes(targetContainsImage)) {
    remoteContent = remoteContent.replace(targetContainsImage, replacementContainsImage);
    remoteModified = true;
  }

  if (remoteModified) {
    fs.writeFileSync(remoteContentFile, remoteContent, 'utf8');
    console.log('[patch-notifications] RemoteNotificationContent.kt basariyla yamalandi.');
  } else {
    console.log('[patch-notifications] RemoteNotificationContent.kt zaten guncel.');
  }
} catch (e) {
  console.error('[patch-notifications] RemoteNotificationContent hata:', e.message);
}

// ==========================================
// 2. ExpoNotificationBuilder.kt Güncellemesi
// Snapchat stili: Solda dairesel profil avatarı + minik uygulama rozeti, sağda thumbnail yok (MessagingStyle)
// ==========================================
try {
  let builderContent = fs.readFileSync(builderFile, 'utf8');
  let builderModified = false;

  const helperMethod = `
  private fun getCircularBitmap(bitmap: Bitmap): Bitmap {
    val size = Math.min(bitmap.width, bitmap.height)
    val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = android.graphics.Canvas(output)
    val paint = android.graphics.Paint()
    val rect = android.graphics.Rect((bitmap.width - size) / 2, (bitmap.height - size) / 2, (bitmap.width + size) / 2, (bitmap.height + size) / 2)
    val rectDest = android.graphics.Rect(0, 0, size, size)
    paint.isAntiAlias = true
    canvas.drawARGB(0, 0, 0, 0)
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
    paint.xfermode = android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN)
    canvas.drawBitmap(bitmap, rect, rectDest, paint)
    return output
  }
`;

  const messagingStyleReplacement = `    if (notificationContent.containsImage()) {
      val bitmap = notificationContent.getImage(context)
      val circular = bitmap?.let { getCircularBitmap(it) }
      if (circular != null) {
        val sender = androidx.core.app.Person.Builder()
          .setName(content.title ?: "Textly")
          .setIcon(androidx.core.graphics.drawable.IconCompat.createWithBitmap(circular))
          .build()
        val user = androidx.core.app.Person.Builder()
          .setName("You")
          .build()
        val messagingStyle = androidx.core.app.NotificationCompat.MessagingStyle(user)
          .setConversationTitle(null)
          .setGroupConversation(false)
          .addMessage(content.text ?: "", System.currentTimeMillis(), sender)
        builder.setStyle(messagingStyle)
        builder.setLargeIcon(null as android.graphics.Bitmap?)
      } else {
        builder.setLargeIcon(largeIcon)
      }
    } else {
      builder.setLargeIcon(largeIcon)
    }`;

  // Hem orijinal Expo bloğunu hem de önceki dairesel LargeIcon bloğunu eşleştirip MessagingStyle ile değiştir
  const targetRegex = /if\s*\(notificationContent\.containsImage\(\)\)\s*\{[\s\S]*?builder\.setLargeIcon\(largeIcon\)\s*\}/;

  if (targetRegex.test(builderContent)) {
    builderContent = builderContent.replace(targetRegex, messagingStyleReplacement);
    if (!builderContent.includes('fun getCircularBitmap')) {
      builderContent = builderContent.replace('open class ExpoNotificationBuilder', helperMethod + '\nopen class ExpoNotificationBuilder');
    }
    builderModified = true;
  }

  if (builderModified) {
    fs.writeFileSync(builderFile, builderContent, 'utf8');
    console.log('[patch-notifications] ExpoNotificationBuilder.kt basariyla Snapchat MessagingStyle stiline yamalandi.');
  } else {
    console.log('[patch-notifications] ExpoNotificationBuilder.kt zaten guncel.');
  }
} catch (e) {
  console.error('[patch-notifications] ExpoNotificationBuilder hata:', e.message);
}
