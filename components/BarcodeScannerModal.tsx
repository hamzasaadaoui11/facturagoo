import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Keyboard, Volume2, CheckCircle2, Zap, AlertCircle, Image as ImageIcon, Upload } from 'lucide-react';
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
  const [fileError, setFileError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  const selectedCameraIdRef = useRef<string>('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const stopCameraInstance = async () => {
    if (html5QrcodeRef.current) {
      const instance = html5QrcodeRef.current;
      html5QrcodeRef.current = null;
      try {
        if (instance.isScanning) {
          await instance.stop();
        } else {
          instance.clear();
        }
      } catch (err) {
        // Silently catch video element play/stop interrupts when closing modal quickly
      }
    }
  };

  // Start Camera
  useEffect(() => {
    if (!isOpen) {
      stopCameraInstance();
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      setFileError(null);
      setIsScanning(true);

      try {
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label || `Caméra ${d.id}` })));
          
          // Select back/environment camera if available
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('arrière') ||
            d.label.toLowerCase().includes('environment')
          ) || devices[devices.length - 1];

          const cameraIdToUse = selectedCameraIdRef.current || backCam.id;
          selectedCameraIdRef.current = cameraIdToUse;
          setSelectedCameraId(cameraIdToUse);

          if (!isMounted) return;

          // Safely stop any previous instance
          await stopCameraInstance();
          if (!isMounted) return;

          const scanner = new Html5Qrcode(scannerContainerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            verbose: false
          });
          html5QrcodeRef.current = scanner;

          try {
            await scanner.start(
              cameraIdToUse,
              {
                fps: 15,
                disableFlip: false
              },
              (decodedText) => {
                if (isMounted) {
                  handleSuccessfulScan(decodedText);
                }
              },
              () => {
                // Ignore per-frame decode failures
              }
            );
          } catch (startErr: any) {
            if (!isMounted) return;
            const errMsg = String(startErr?.message || startErr);
            if (errMsg.includes('interrupted') || errMsg.includes('media was removed') || startErr?.name === 'AbortError') {
              return;
            }
            throw startErr;
          }
        } else {
          setCameraError(
            language === 'fr' 
              ? 'Aucune caméra détectée. Vous pouvez importer une photo de code-barres ou le saisir manuellement.' 
              : 'No camera found. You can upload a barcode image or type it manually.'
          );
        }
      } catch (err: any) {
        if (!isMounted) return;
        const errStr = String(err?.message || err);
        if (errStr.includes('interrupted') || errStr.includes('media was removed') || err?.name === 'AbortError') {
          return;
        }
        console.warn('Error starting camera barcode scanner:', err);
        setCameraError(
          language === 'fr' 
            ? 'Impossible d’accéder à la caméra. Vérifiez les autorisations ou importez une photo.' 
            : 'Unable to access camera. Check permissions or upload an image.'
        );
      } finally {
        if (isMounted) setIsScanning(false);
      }
    };

    // Small delay to allow container div to render
    const timer = setTimeout(startCamera, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCameraInstance();
    };
  }, [isOpen]);

  const handleSuccessfulScan = (code: string) => {
    if (!code) return;
    playBeepSound();
    setLastScanned(code);
    onScan(code);

    if (!continuous) {
      stopCameraInstance();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    try {
      const tempScanner = new Html5Qrcode("file-scanner-temp", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false
      });

      const result = await tempScanner.scanFileV2(file, true);
      if (result && result.decodedText) {
        handleSuccessfulScan(result.decodedText);
      } else {
        setFileError(language === 'fr' ? 'Aucun code-barres lisible trouvé sur cette photo.' : 'No readable barcode found in this image.');
      }
    } catch (err) {
      console.warn('File scan error:', err);
      setFileError(language === 'fr' ? 'Impossible de lire le code-barres. Assayez une photo plus nette ou saisissez le code.' : 'Could not decode barcode. Try a clearer picture or enter manually.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    await stopCameraInstance();
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraIdRef.current);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextId = cameras[nextIndex].id;
    selectedCameraIdRef.current = nextId;
    setSelectedCameraId(nextId);

    // Restart scanner with new camera ID
    if (html5QrcodeRef.current === null && isOpen) {
      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false
      });
      html5QrcodeRef.current = scanner;
      try {
        await scanner.start(
          nextId,
          { fps: 15, disableFlip: false },
          (decodedText) => handleSuccessfulScan(decodedText),
          () => {}
        );
      } catch (err) {
        // ignore
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden container for file scanner */}
      <div id="file-scanner-temp" className="hidden"></div>

      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {title || (language === 'fr' ? 'Scan Code-Barres / Douchette' : 'Barcode Scanner')}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'fr' ? 'Caméra, photo, douchette USB ou saisie' : 'Camera, photo, USB scanner or manual entry'}
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
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="w-64 h-36 border-2 border-emerald-400/60 rounded-2xl relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.25)] bg-emerald-500/5">
                  {/* Moving Green Laser Beam */}
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-laser-scan"></div>
                  
                  {/* Four Corner Accents */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400"></div>
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400"></div>
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400"></div>
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400"></div>
                </div>
                
                <div className="mt-3 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-emerald-400 bg-slate-900/90 px-3 py-1 rounded-full border border-emerald-500/30 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    {language === 'fr' ? 'Pointez la caméra vers le code-barres' : 'Point camera at barcode'}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                    💡 {language === 'fr' ? 'Gardez une distance de 15 à 20 cm (évitez le flou de près)' : 'Keep 15-20cm distance (avoid close blur)'}
                  </span>
                </div>
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
                  {language === 'fr' ? 'Code Détecté avec succès !' : 'Barcode Scanned Successfully!'}
                </span>
                <span className="mt-1 px-4 py-1.5 bg-emerald-900/60 border border-emerald-500/50 rounded-xl text-lg font-mono font-bold text-white">
                  {lastScanned}
                </span>
              </div>
            )}
          </div>

          {/* File error message */}
          {fileError && (
            <div className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Controls bar */}
          <div className="w-full flex items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 rounded-xl transition-all border border-slate-700"
              title="Tester avec une photo de code-barres"
            >
              <Upload size={14} />
              <span>{language === 'fr' ? 'Tester avec une photo' : 'Scan from Photo'}</span>
            </button>

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
              <span>{language === 'fr' ? 'Bip sonore' : 'Beep sound'}</span>
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
                placeholder={language === 'fr' ? 'Ex: 6111234567890...' : 'Ex: 6111234567890...'}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-900/30"
              >
                {language === 'fr' ? 'Tester / Valider' : 'Test / Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
