/**
 * WebRTC Yönetici Modülü (React Native / Android & iOS)
 * Sesli görüşmeler için gerçek zamanlı, düşük gecikmeli P2P ses akışı ve
 * donanım düzeyinde yankı engelleme (AEC) sağlar.
 */

let RTCPeerConnection = null;
let RTCIceCandidate = null;
let RTCSessionDescription = null;
let mediaDevices = null;

try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  mediaDevices = webrtc.mediaDevices;
} catch (e) {
  console.warn('[WebRTC] react-native-webrtc modülü yüklenemedi:', e?.message);
}

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

class WebRTCYonetici {
  constructor() {
    this.pc = null;
    this.localStream = null;
    this.candidateQueue = [];
    this.aramaId = null;
    this.onSinyal = null;
    this.hazir = false;
    this.bekleyenOffer = null;
  }

  isAvailable() {
    return !!(RTCPeerConnection && mediaDevices);
  }

  async baslat({ aramaId, isCaller, onSinyal }) {
    this.durdur();
    this.aramaId = aramaId;
    this.onSinyal = onSinyal;

    if (!this.isAvailable()) {
      console.warn('[WebRTC] react-native-webrtc kullanılamıyor.');
      return false;
    }

    try {
      this.pc = new RTCPeerConnection(RTC_CONFIG);
      this.candidateQueue = [];

      // Mikrofon akışını al - Donanım AEC ve Gürültü Engelleme ile
      this.localStream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Ses track'lerini PeerConnection'a ekle
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream);
      });

      // ICE Adayları oluşunca sinyalle karşı tarafa ilet
      this.pc.onicecandidate = (event) => {
        if (event.candidate && this.onSinyal) {
          this.onSinyal({
            tip: 'ice-candidate',
            candidate: event.candidate,
          });
        }
      };

      this.pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Bağlantı durumu:', this.pc?.connectionState);
      };

      this.hazir = true;

      // Eğer baslat'tan önce bir Offer gelmişse hemen işle
      if (this.bekleyenOffer) {
        const offer = this.bekleyenOffer;
        this.bekleyenOffer = null;
        await this.sinyalIsle({ tip: 'sdp-offer', sdp: offer });
      } else if (isCaller) {
        // Arayan taraf ise Offer üret ve gönder
        const offer = await this.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await this.pc.setLocalDescription(offer);
        if (this.onSinyal) {
          this.onSinyal({
            tip: 'sdp-offer',
            sdp: this.pc.localDescription,
          });
        }
      }

      return true;
    } catch (e) {
      console.error('[WebRTC] Başlatma hatası:', e);
      this.durdur();
      return false;
    }
  }

  async sinyalIsle(sinyal) {
    if (!sinyal) return;

    if (!this.hazir || !this.pc) {
      if (sinyal.tip === 'sdp-offer') {
        this.bekleyenOffer = sinyal.sdp;
      } else if (sinyal.tip === 'ice-candidate' && sinyal.candidate) {
        this.candidateQueue.push(sinyal.candidate);
      }
      return;
    }

    try {
      if (sinyal.tip === 'sdp-offer') {
        // Karşı tarafın teklifini al, ayarla ve yanıt üret
        await this.pc.setRemoteDescription(new RTCSessionDescription(sinyal.sdp));
        await this._kuyruktakiAdaylariEkle();

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        if (this.onSinyal) {
          this.onSinyal({
            tip: 'sdp-answer',
            sdp: this.pc.localDescription,
          });
        }
      } else if (sinyal.tip === 'sdp-answer') {
        // Karşı tarafın cevabını kaydet
        await this.pc.setRemoteDescription(new RTCSessionDescription(sinyal.sdp));
        await this._kuyruktakiAdaylariEkle();
      } else if (sinyal.tip === 'ice-candidate' && sinyal.candidate) {
        if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
          await this.pc.addIceCandidate(new RTCIceCandidate(sinyal.candidate));
        } else {
          this.candidateQueue.push(sinyal.candidate);
        }
      }
    } catch (e) {
      console.warn('[WebRTC] Sinyal işleme hatası:', e?.message);
    }
  }

  async _kuyruktakiAdaylariEkle() {
    while (this.candidateQueue.length > 0) {
      const candidate = this.candidateQueue.shift();
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] ICE adayı eklenemedi:', e?.message);
      }
    }
  }

  mikrofonAyarla(sessiz) {
    if (!this.localStream) return;
    try {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !sessiz;
      });
    } catch (e) {
      console.warn('[WebRTC] Mikrofon ayar hatası:', e);
    }
  }

  durdur() {
    this.hazir = false;
    this.bekleyenOffer = null;
    this.candidateQueue = [];

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.localStream = null;
    }

    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }

    this.aramaId = null;
    this.onSinyal = null;
  }
}

export default new WebRTCYonetici();
