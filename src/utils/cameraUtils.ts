
import { toast } from "@/hooks/use-toast";

export async function requestCameraPermission(): Promise<MediaStream | null> {
  try {
    console.log("Requesting camera permission...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 }
      },
      audio: false
    });
    
    console.log("Camera permission granted, stream acquired:", stream);
    return stream;
  } catch (error) {
    console.error("Failed to get camera permission:", error);
    return null;
  }
}

export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log("Available cameras:", videoDevices);
    return videoDevices;
  } catch (error) {
    console.error("Error listing cameras:", error);
    return [];
  }
}

export function selectBestCamera(cameras: MediaDeviceInfo[]): string | null {
  if (cameras.length === 0) return null;
  
  // Try to find a back/rear/environment facing camera first
  const backCamera = cameras.find(device => 
    device.label.toLowerCase().includes('back') || 
    device.label.toLowerCase().includes('rear') ||
    device.label.toLowerCase().includes('environment')
  );
  
  return backCamera ? backCamera.deviceId : cameras[0].deviceId;
}

export function playBeepSound() {
  try {
    const audio = new Audio('/static/sounds/beep.mp3');
    audio.play().catch(e => console.log('Error playing sound:', e));
  } catch (e) {
    console.error("Error playing beep sound:", e);
  }
}
