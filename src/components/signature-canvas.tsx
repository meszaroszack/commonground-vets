"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import SignaturePad from "signature_pad";

export type SignatureHandle = {
  toDataUrl: () => string | null;
  clear: () => void;
};

export const SignatureCanvas = forwardRef<SignatureHandle>(function SignatureCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const data = padRef.current && !padRef.current.isEmpty() ? padRef.current.toData() : null;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const context = canvas.getContext("2d");
      context?.scale(ratio, ratio);
      const pad = new SignaturePad(canvas, { penColor: "#1C2826", minWidth: 1, maxWidth: 2.4 });
      if (data) pad.fromData(data);
      padRef.current = pad;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useImperativeHandle(ref, () => ({
    toDataUrl: () => {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return null;
      return pad.toDataURL("image/png");
    },
    clear: () => padRef.current?.clear(),
  }));

  return (
    <canvas
      ref={canvasRef}
      className="h-36 w-full touch-none rounded-2xl border border-sand bg-white"
      aria-label="Signature pad"
    />
  );
});
