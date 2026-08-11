import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, Keyboard, Volume2, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { playBeepSound } from '../utils/barcode';
import { useLanguage } from '../contexts/LanguageContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title,
  continuous = false
}) => {
  const { language } = useLanguage();
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-camera-reader';

  // Handle hardware douchette / keyboard inputs while modal is open
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is on an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ''; // reset buffer if typing is slow
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim().length > 2) {
          e.preventDefault();
          const code = buffer.trim();
          handleSuccessfulScan(code);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Start Camera
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      setIsScanning(true);

      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label || `Caméra ${d.id}` })));
          
          // Select back/environment camera if available
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('arrière') ||
            d.label.toLowerCase().includes('environment')
          ) || devices[devices.length - 1];

          const cameraIdToUse = selectedCameraId || backCam.id;
          setSelectedCameraId(cameraIdToUse);

          if (!html5QrcodeRef.current) {
            html5QrcodeRef.current = new Html5Qrcode(scannerContainerId);
          }

          try {
            await html5QrcodeRef.current.start(
              cameraIdToUse,
              {
                fps: 15,
                qrbox: { width: 280, height: 160 },
                aspectRatio: 1.777778
              },
              (decodedText) => {
                if (isMounted) {
                  handleSuccessfulScan(decodedText);
                }
              },
              () => {
                // Frame scan failure ignored
              }
            );
          } catch (startErr: any) {
            if (!isMounted) return;
            // Ignore interruption error if modal closed while initializing
            if (startErr?.toString()?.includes('interrupted') || startErr?.name === 'AbortError') {
              return;
            }
            throw startErr;
          }
        } else {
          setCameraError(
            language === 'fr' 
              ? 'Aucune caméra détectée. Vous pouvez utiliser un lecteur douchette USB ou saisir le code manuellement.' 
              : 'No camera found. You can use a USB barcode reader or type the code manually.'
          );
        }
      } catch (err: any) {
        console.warn('Error starting camera barcode scanner:', err);
        if (isMounted) {
          setCameraError(
            language === 'fr' 
              ? 'Impossible d’accéder à la caméra. Vérifiez les autorisations navigateur ou saisissez le code manuellement.' 
              : 'Unable to access camera. Check permissions or enter barcode manually.'
          );
        }
      } finally {
        if (isMounted) setIsScanning(false);
      }
    };

    // Small delay to allow container div to render
    const timer = setTimeout(startCamera, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, selectedCameraId]);

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      const scanner = html5QrcodeRef.current;
      html5QrcodeRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        // Silently catch video element play/stop interrupts when closing modal quickly
      }
    }
  };

  const handleSuccessfulScan = (code: string) => {
    if (!code) return;
    playBeepSound();
    setLastScanned(code);
    onScan(code);

    if (!continuous) {
      stopCamera();
      onClose();
    } else {
      setTimeout(() => setLastScanned(null), 1500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessfulScan(manualCode.trim());
      setManualCode('');
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    stopCamera();
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {title || (language === 'fr' ? 'Scan Code-Barres / Douchette' : 'Barcode / Scanner')}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'fr' ? 'Caméra, douchette USB ou saisie manuelle' : 'Camera, USB barcode reader or manual entry'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Container */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
            <div id={scannerContainerId} className="w-full h-full object-cover"></div>

            {/* Scanning Laser animation overlay */}
            {!cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 h-36 border-2 border-dashed border-emerald-400/80 rounded-2xl relative flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse"></div>
                </div>
                <span className="mt-3 text-xs font-semibold text-emerald-400/90 bg-slate-900/80 px-3 py-1 rounded-full border border-emerald-500/30 backdrop-blur-sm">
                  {language === 'fr' ? 'Pointez la caméra vers le code-barres' : 'Point camera at barcode'}
                </span>
              </div>
            )}

            {/* Error state */}
            {cameraError && (
              <div className="p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                  {cameraError}
                </p>
              </div>
            )}

            {/* Success flash indicator */}
            {lastScanned && (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-150">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2 animate-bounce" />
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  {language === 'fr' ? 'Code Détecté !' : 'Barcode Scanned!'}
                </span>
                <span className="mt-1 px-4 py-1.5 bg-emerald-900/60 border border-emerald-500/50 rounded-xl text-lg font-mono font-bold text-white">
                  {lastScanned}
                </span>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="w-full flex items-center justify-between px-2 gap-2">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition-all border border-slate-700"
              >
                <RefreshCw size={14} />
                <span>{language === 'fr' ? 'Changer caméra' : 'Switch camera'}</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
              <Volume2 size={14} className="text-emerald-400" />
              <span>{language === 'fr' ? 'Bip sonore actif' : 'Audio beep enabled'}</span>
            </div>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="w-full pt-3 border-t border-slate-800 space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Keyboard size={14} />
              <span>{language === 'fr' ? 'Saisie manuelle ou Douchette USB' : 'Manual Entry / USB Douchette'}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={language === 'fr' ? 'Tapez ou scannez un code-barres...' : 'Type or scan barcode...'}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-900/30"
              >
                {language === 'fr' ? 'Valider' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
