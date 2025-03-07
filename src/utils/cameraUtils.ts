
import { toast } from "@/hooks/use-toast";

export async function requestCameraPermission(): Promise<MediaStream | null> {
  try {
    console.log("Requesting camera permission...");
    
    // First try with environment-facing camera (usually back camera on mobile)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      console.log("Camera permission granted with environment facing camera");
      return stream;
    } catch (e) {
      console.log("Could not get environment camera, trying any camera", e);
      // If that fails, try with any camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      console.log("Camera permission granted with any available camera");
      return stream;
    }
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
    // Ensure we have permission first
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

// Attaches video stream to an element
export function attachStreamToVideo(stream: MediaStream, element: HTMLVideoElement | null): boolean {
  if (!element || !stream) {
    console.error("Missing video element or stream", { elementExists: !!element, streamExists: !!stream });
    return false;
  }
  
  try {
    // Ensure we're working with a valid video element
    element.srcObject = stream;
    element.muted = true; // Ensure video is muted
    element.playsInline = true; // Important for iOS
    element.style.display = 'block';
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'cover';
    
    // Force play and handle errors
    element.play().catch(e => {
      console.error("Error playing video:", e);
      // On some browsers, play needs to be triggered by user gesture
      // In this case, we'll add a hint to click the video
      element.setAttribute('data-needs-interaction', 'true');
    });
    
    console.log("Stream attached to video element successfully");
    return true;
  } catch (error) {
    console.error("Error attaching stream to video:", error);
    return false;
  }
}

// Completely resets the video element
export function resetVideoElement(element: HTMLVideoElement | null): void {
  if (!element) return;
  
  try {
    // Stop any existing stream
    if (element.srcObject instanceof MediaStream) {
      element.srcObject.getTracks().forEach(track => track.stop());
    }
    
    // Reset properties
    element.srcObject = null;
    element.style.display = 'none';
    console.log("Video element reset successfully");
  } catch (error) {
    console.error("Error resetting video element:", error);
  }
}

// Stop and clean up all tracks in a stream
export function stopStreamTracks(stream: MediaStream | null): void {
  if (!stream) return;
  
  try {
    const tracks = stream.getTracks();
    tracks.forEach(track => {
      track.stop();
      console.log(`Track ${track.kind} stopped`);
    });
    console.log(`All ${tracks.length} tracks stopped successfully`);
  } catch (error) {
    console.error("Error stopping stream tracks:", error);
  }
}
