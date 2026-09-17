import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { X } from "lucide-react";
import { C, Btn, ErrorNote } from "./ui";

// Camera barcode scanning.
//
// iOS Safari does not support the native BarcodeDetector API, so we use ZXing,
// which decodes from video frames in JS and works everywhere getUserMedia does.
// Requires HTTPS — this will not work over plain http, including on a LAN IP.
//
// Restricting formats to retail barcodes (EAN/UPC) makes decoding noticeably
// faster and cuts false reads, since it isn't also hunting for QR codes.
const hints = new Map([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

export default function Scanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader(hints);

    (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              cancelled = true;
              if (navigator.vibrate) navigator.vibrate(40);
              controls.stop();
              onDetected(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        console.error(e);
        if (e?.name === "NotAllowedError") setError("Camera access was blocked. Allow it in your browser settings, or type the barcode instead.");
        else if (e?.name === "NotFoundError") setError("No camera found on this device.");
        else setError("Couldn't start the camera. Type the barcode instead.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        controlsRef.current?.stop();
      } catch {
        /* already stopped */
      }
    };
  }, [onDetected]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Aiming guide — a wide, short window matching the shape of a retail barcode */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "8%",
            right: "8%",
            height: 130,
            transform: "translateY(-50%)",
            border: `2px solid ${C.accent}`,
            borderRadius: 12,
            boxShadow: "0 0 0 100vmax rgba(0,0,0,0.5)",
          }}
        />
        <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 13, textShadow: "0 1px 3px #000" }}>
          Point at the barcode
        </div>
      </div>
      <div style={{ padding: "14px 16px max(14px, env(safe-area-inset-bottom))", background: C.bg }}>
        <ErrorNote>{error}</ErrorNote>
        <Btn variant="ghost" onClick={onClose} style={{ width: "100%", marginTop: error ? 10 : 0 }}>
          <X size={16} />
          Close
        </Btn>
      </div>
    </div>
  );
}
