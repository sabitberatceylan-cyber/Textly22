const fs = require('fs');
const path = require('path');

const expoCameraDir = path.join(__dirname, '..', 'node_modules', 'expo-camera', 'android', 'src', 'main', 'java', 'expo', 'modules', 'camera');
const viewFile = path.join(expoCameraDir, 'ExpoCameraView.kt');
const moduleFile = path.join(expoCameraDir, 'CameraViewModule.kt');

if (!fs.existsSync(viewFile)) {
  console.log('[patch-camera] expo-camera android dosyalari bulunamadi, atlaniyor.');
  process.exit(0);
}

// ==========================================
// 1. ExpoCameraView.kt Güncellemesi
// ==========================================
let viewContent = fs.readFileSync(viewFile, 'utf8');
let viewModified = false;

// 1.a Deklanşör sesini kaldır (MediaActionSound.SHUTTER_CLICK)
const soundPattern = /if\s*\(volume\s*!=\s*0\)\s*\{\s*MediaActionSound\(\)\.play\(MediaActionSound\.SHUTTER_CLICK\)\s*\}/g;
if (soundPattern.test(viewContent)) {
  viewContent = viewContent.replace(soundPattern, '// MediaActionSound().play(MediaActionSound.SHUTTER_CLICK) // deklansor sesi kaldirildi');
  console.log('[patch-camera] Deklansor sesi basariyla kaldirildi.');
  viewModified = true;
} else if (viewContent.includes('MediaActionSound().play(MediaActionSound.SHUTTER_CLICK)')) {
  viewContent = viewContent.replace(/MediaActionSound\(\)\.play\(MediaActionSound\.SHUTTER_CLICK\)/g, '// MediaActionSound().play(MediaActionSound.SHUTTER_CLICK)');
  console.log('[patch-camera] Deklansor sesi satiri yorum satiri yapildi.');
  viewModified = true;
}

// 1.b Kamera Seçici: Odak uzaklığı < 3.0mm olan ultra-geniş açıyı eler, fiziksel ana kamerayı (~5mm) seçer
const defaultSelector = `        val cameraSelector = CameraSelector.Builder()
          .requireLensFacing(lensFacing.mapToCharacteristic())
          .build()`;

const patchedSelector = `        val cameraSelectorBuilder = CameraSelector.Builder()
          .requireLensFacing(lensFacing.mapToCharacteristic())

        if (lensFacing == CameraType.BACK) {
          cameraSelectorBuilder.addCameraFilter { cameraInfos ->
            val filtered = cameraInfos.filter { camInfo ->
              try {
                val characteristics = Camera2CameraInfo.from(camInfo)
                val focalLengths = characteristics.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
                val focal = focalLengths?.getOrNull(0) ?: 0f
                focal >= 3.0f
              } catch (e: Exception) {
                true
              }
            }
            if (filtered.isNotEmpty()) {
              val best = filtered.minByOrNull { camInfo ->
                try {
                  val characteristics = Camera2CameraInfo.from(camInfo)
                  val focal = characteristics.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)?.getOrNull(0) ?: 5.0f
                  Math.abs(focal - 5.0f)
                } catch (e: Exception) {
                  0f
                }
              }
              if (best != null) listOf(best) else filtered
            } else {
              cameraInfos
            }
          }
        }

        val cameraSelector = cameraSelectorBuilder.build()`;

if (viewContent.includes(defaultSelector)) {
  viewContent = viewContent.replace(defaultSelector, patchedSelector);
  console.log('[patch-camera] Ana kamera (focal >= 3.0mm) secici filtresi eklendi.');
  viewModified = true;
}

// 1.c Zoom ve Exposure (Donanımsal Pozlama / Gerçek Parlaklık)
const zoomPropCode = `  var zoom: Float = 1.0f
    set(value) {
      field = value
      camera?.let { cam ->
        try {
          val zoomState = cam.cameraInfo.zoomState.value
          val minRatio = zoomState?.minZoomRatio ?: 1f
          val maxRatio = zoomState?.maxZoomRatio ?: 10f
          val base1x = if (minRatio < 1.0f) 1.0f else minRatio
          val target = if (value >= 1.0f) {
            Math.min(value, maxRatio)
          } else {
            base1x + value * (Math.min(maxRatio, 10.0f) - base1x)
          }
          cam.cameraControl.setZoomRatio(Math.max(1.0f, target))
        } catch (e: Exception) {}
      }
    }

  var exposure: Float = 0.5f
    set(value) {
      field = value
      camera?.let { cam ->
        try {
          val exp = cam.cameraInfo.exposureState
          if (exp.isExposureCompensationSupported) {
            val range = exp.exposureCompensationRange
            val min = range.lower
            val max = range.upper
            val idx = if (value >= 0.5f) {
              Math.round((value - 0.5f) * 2f * max)
            } else {
              Math.round((0.5f - value) * 2f * min)
            }
            cam.cameraControl.setExposureCompensationIndex(idx)
          }
        } catch (e: Exception) {}
      }
    }`;

if (!viewContent.includes('var exposure: Float')) {
  // Add zoom and exposure properties to ExpoCameraView class
  const lensFacingAnchor = 'var lensFacing = CameraType.BACK';
  if (viewContent.includes(lensFacingAnchor)) {
    viewContent = viewContent.replace(lensFacingAnchor, `${zoomPropCode}\n\n  ${lensFacingAnchor}`);
    console.log('[patch-camera] Donanimsal zoom ve exposure propertyleri eklendi.');
    viewModified = true;
  }
}

// Apply zoom and exposure when camera is bound in createCamera()
if (viewContent.includes('observeCameraState(it.cameraInfo)') && !viewContent.includes('this.zoom = zoom')) {
  viewContent = viewContent.replace(
    'observeCameraState(it.cameraInfo)',
    'observeCameraState(it.cameraInfo)\n            this.zoom = zoom\n            this.exposure = exposure'
  );
  viewModified = true;
}

if (viewModified) {
  fs.writeFileSync(viewFile, viewContent, 'utf8');
  console.log('[patch-camera] ExpoCameraView.kt basariyla guncellendi.');
}

// ==========================================
// 2. CameraViewModule.kt Güncellemesi (Prop exposure)
// ==========================================
if (fs.existsSync(moduleFile)) {
  let moduleContent = fs.readFileSync(moduleFile, 'utf8');
  if (!moduleContent.includes('Prop("exposure")')) {
    const zoomPropRegex = /(Prop\("zoom"\)\s*\{\s*view:\s*ExpoCameraView,\s*zoom:\s*Float\s*->[^}]*\})/;
    if (zoomPropRegex.test(moduleContent)) {
      const exposurePropCode = `\n\n      Prop("exposure") { view: ExpoCameraView, exposure: Float ->\n        view.exposure = exposure\n      }`;
      moduleContent = moduleContent.replace(zoomPropRegex, `$1${exposurePropCode}`);
      fs.writeFileSync(moduleFile, moduleContent, 'utf8');
      console.log('[patch-camera] CameraViewModule.kt icine exposure Prop tanimi eklendi.');
    }
  }
}

console.log('[patch-camera] Tum kamera yamalari tamamlandi.');
