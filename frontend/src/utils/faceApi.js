import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadFaceApiModels = async () => {
  if (modelsLoaded) return true;
  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error('Failed to load FaceAPI models', error);
    return false;
  }
};

export const getFaceEmbeddingFromVideo = async (videoEl) => {
  if (!modelsLoaded) throw new Error('Models not loaded');
  
  const detection = await faceapi.detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  if (!detection) return null;
  return Array.from(detection.descriptor);
};

export const compareEmbeddings = (embedding1, embedding2, threshold = 0.5) => {
  if (!embedding1 || !embedding2) return false;
  const desc1 = new Float32Array(embedding1);
  const desc2 = new Float32Array(embedding2);
  const distance = faceapi.euclideanDistance(desc1, desc2);
  return distance < threshold;
};
