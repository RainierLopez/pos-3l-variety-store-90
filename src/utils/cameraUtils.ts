
import { toast } from "@/hooks/use-toast";

export async function requestCameraPermission(): Promise<MediaStream | null> {
  try {
    console.log("Requesting camera permission...");
    // More lenient constraints - try to get any video stream first
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    
    console.log("Camera permission granted, basic stream acquired");
    return stream;
  } catch (error) {
    console.error("Failed to get camera permission:", error);
    toast({
      title: "Camera Error",
      description: "Failed to access your camera. Please check permissions.",
      variant: "destructive"
    });
    return null;
  }
}

export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
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
  
  // On most mobile devices, the back camera has 'environment' in the label or facing mode
  const backCamera = cameras.find(device => 
    device.label.toLowerCase().includes('back') || 
    device.label.toLowerCase().includes('rear') ||
    device.label.toLowerCase().includes('environment')
  );
  
  if (backCamera) {
    console.log("Selected back camera:", backCamera.label);
    return backCamera.deviceId;
  }
  
  console.log("No back camera found, using first available camera:", cameras[0].label);
  return cameras[0].deviceId;
}

export function playBeepSound() {
  try {
    const audio = new Audio('/static/sounds/beep.mp3');
    audio.play().catch(e => console.log('Error playing sound:', e));
  } catch (e) {
    console.error("Error playing beep sound:", e);
  }
}

// New helper function to attach video stream to an element
export function attachStreamToVideo(stream: MediaStream, element: HTMLVideoElement | null): boolean {
  if (!element || !stream) {
    console.error("Missing video element or stream", { elementExists: !!element, streamExists: !!stream });
    return false;
  }
  
  try {
    // Ensure we're working with a valid video element
    element.srcObject = stream;
    element.style.display = 'block';
    element.style.width = '100%';
    element.style.height = '100%';
    element.play().catch(e => console.error("Error playing video:", e));
    console.log("Stream attached to video element successfully");
    return true;
  } catch (error) {
    console.error("Error attaching stream to video:", error);
    return false;
  }
}
