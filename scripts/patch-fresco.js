const fs = require('fs');
const path = require('path');

const gradleFile = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(gradleFile)) {
  console.log('[patch-fresco] android/app/build.gradle bulunamadı (henüz prebuild yapılmamış olabilir), atlanıyor.');
  process.exit(0);
}

let content = fs.readFileSync(gradleFile, 'utf8');

const frescoDeps = `
    // Fresco animated WebP and GIF support for animated stickers
    implementation("com.facebook.fresco:animated-gif:3.1.3")
    implementation("com.facebook.fresco:animated-webp:3.1.3")
    implementation("com.facebook.fresco:webpsupport:3.1.3")
`;

if (!content.includes('animated-webp')) {
  content = content.replace(/dependencies\s*\{/, 'dependencies {\n' + frescoDeps);
  fs.writeFileSync(gradleFile, content, 'utf8');
  console.log('[patch-fresco] Fresco animated-webp ve animated-gif bağımlılıkları build.gradle dosyasına başarıyla eklendi.');
} else {
  console.log('[patch-fresco] Fresco bağımlılıkları zaten ekli.');
}
