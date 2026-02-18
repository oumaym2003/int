import React, { useEffect, useMemo, useRef, useState } from 'react';

const AnnotationCanvas = ({ imageSrc, onClose, onSave, initialPoints = [] }) => {
  const imageRef = useRef(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [points, setPoints] = useState(initialPoints);
  const [error, setError] = useState('');

  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  const handleImageLoad = () => {
    if (!imageRef.current) return;
    setNaturalSize({
      width: imageRef.current.naturalWidth,
      height: imageRef.current.naturalHeight,
    });
    setDisplaySize({
      width: imageRef.current.clientWidth,
      height: imageRef.current.clientHeight,
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (!imageRef.current) return;
      setDisplaySize({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pointsForDisplay = useMemo(() => {
    return points.map((point) => ({
      x: point.x * displaySize.width,
      y: point.y * displaySize.height,
    }));
  }, [points, displaySize.width, displaySize.height]);

  const handleAddPoint = (event) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    setError('');
    setPoints((prev) => [...prev, { x, y }]);
  };

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    setPoints([]);
    setError('');
  };

  const buildAnnotationPayload = () => {
    const pixelPoints = points.map((point) => ({
      x: Math.round(point.x * naturalSize.width),
      y: Math.round(point.y * naturalSize.height),
    }));

    const xs = pixelPoints.map((point) => point.x);
    const ys = pixelPoints.map((point) => point.y);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      version: 1,
      shape: 'polygon',
      image: {
        width: naturalSize.width,
        height: naturalSize.height,
      },
      points_normalized: points,
      points_pixels: pixelPoints,
      bounding_box: {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
      },
      created_at: new Date().toISOString(),
    };
  };

  const handleSave = () => {
    if (points.length < 3) {
      setError('Le contour doit contenir au moins 3 points.');
      return;
    }

    if (!naturalSize.width || !naturalSize.height) {
      setError('Image non chargée correctement.');
      return;
    }

    onSave(buildAnnotationPayload());
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-800 border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">Annotation par contour</h3>
          <p className="text-[10px] text-slate-400 uppercase">Cliquez sur l'image pour tracer le polygone</p>
        </div>

        <div className="p-6">
          <div className="relative w-full bg-slate-900 rounded-2xl border border-white/10 p-3 min-h-[420px] flex items-center justify-center">
            <div className="relative inline-block max-h-[70vh]">
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Annotation"
                onLoad={handleImageLoad}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />

              <svg
                width={displaySize.width}
                height={displaySize.height}
                className="absolute inset-0 cursor-crosshair"
                onClick={handleAddPoint}
              >
                {pointsForDisplay.length > 1 && (
                  <polyline
                    points={pointsForDisplay.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                  />
                )}

                {pointsForDisplay.length > 2 && (
                  <polygon
                    points={pointsForDisplay.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="rgba(34,211,238,0.2)"
                    stroke="#22d3ee"
                    strokeWidth="2"
                  />
                )}

                {pointsForDisplay.map((point, index) => (
                  <g key={`${point.x}-${point.y}-${index}`}>
                    <circle cx={point.x} cy={point.y} r="4" fill="#22d3ee" />
                    <text x={point.x + 7} y={point.y - 7} fill="#e2e8f0" fontSize="10">
                      {index + 1}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[11px] text-slate-300">Points: <span className="font-bold text-cyan-300">{points.length}</span></p>
            <div className="flex gap-2">
              <button onClick={handleUndo} className="px-4 py-2 text-xs font-bold uppercase bg-slate-700 rounded-xl hover:bg-slate-600">
                Annuler point
              </button>
              <button onClick={handleReset} className="px-4 py-2 text-xs font-bold uppercase bg-slate-700 rounded-xl hover:bg-slate-600">
                Réinitialiser
              </button>
              <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase bg-slate-700 rounded-xl hover:bg-slate-600">
                Fermer
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-xs font-bold uppercase bg-cyan-600 rounded-xl hover:bg-cyan-500">
                Sauvegarder contour
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-[11px] text-red-400 font-bold uppercase">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default AnnotationCanvas;
