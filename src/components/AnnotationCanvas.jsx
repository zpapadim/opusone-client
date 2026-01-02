import { useState, useEffect, useRef } from 'react';

const AnnotationCanvas = ({
    pageNumber,
    width,
    height,
    scale,
    tool,
    color,
    size,
    isAnnotating,
    annotations,
    onAddAnnotation,
    onRemoveAnnotation,
    showOriginal
}) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [textInput, setTextInput] = useState(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // Don't draw annotations if showing original
        if (showOriginal) return;

        const pageAnns = annotations[pageNumber] || [];

        pageAnns.forEach(ann => {
            const annColor = ann.color ? JSON.parse(ann.color) : { r: 1, g: 1, b: 0 };
            const colorStr = `rgba(${annColor.r * 255}, ${annColor.g * 255}, ${annColor.b * 255}, ${ann.opacity ?? 1})`;

            if (ann.type === 'path') {
                ctx.beginPath();
                ctx.strokeStyle = colorStr;
                ctx.lineWidth = (ann.strokeWidth || 5) * scale;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ann.points.forEach((p, i) => {
                    const x = p.x * width;
                    const y = p.y * height;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            } else if (ann.type === 'text') {
                ctx.font = `${(ann.size || 12) * scale}px Helvetica`;
                ctx.fillStyle = colorStr;
                ctx.textBaseline = 'top';
                ctx.fillText(ann.text, ann.x * width, ann.y * height);
            }
        });

        if (currentPath.length > 0) {
            const activeColor = JSON.parse(color);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${activeColor.r * 255}, ${activeColor.g * 255}, ${activeColor.b * 255}, ${tool === 'highlighter' ? 0.5 : 1})`;
            ctx.lineWidth = size * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            currentPath.forEach((p, i) => {
                const x = p.x * width;
                const y = p.y * height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    }, [annotations, pageNumber, width, height, scale, currentPath, color, size, tool, showOriginal]);

    // Find annotation at click position (for eraser)
    const findAnnotationAt = (coords) => {
        const pageAnns = annotations[pageNumber] || [];
        for (let i = pageAnns.length - 1; i >= 0; i--) {
            const ann = pageAnns[i];
            if (ann.type === 'path') {
                for (const p of ann.points) {
                    const dx = Math.abs(p.x - coords.x);
                    const dy = Math.abs(p.y - coords.y);
                    if (dx < 0.02 && dy < 0.02) return i;
                }
            } else if (ann.type === 'text') {
                const dx = coords.x - ann.x;
                const dy = coords.y - ann.y;
                if (dx >= 0 && dx < 0.15 && dy >= -0.03 && dy < 0.02) return i;
            }
        }
        return -1;
    };

    const getCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    };

    const handleMouseDown = (e) => {
        if (!isAnnotating) return;
        // Prevent default browser behavior (drag/selection)
        e.preventDefault();

        const coords = getCoords(e);
        if (tool === 'eraser') {
            const annIndex = findAnnotationAt(coords);
            if (annIndex >= 0 && onRemoveAnnotation) {
                onRemoveAnnotation(pageNumber, annIndex);
            }
            return;
        }
        if (tool === 'text') {
            if (textInput) return; // If text input is open, click confirms it (via blur)
            // Use setTimeout to ensure the input renders and receives focus
            setTimeout(() => {
                setTextInput({ x: coords.x, y: coords.y, value: '' });
            }, 0);
            return;
        }
        setIsDrawing(true);
        setCurrentPath([coords]);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !isAnnotating || tool === 'text') return;
        setCurrentPath(prev => [...prev, getCoords(e)]);
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPath.length > 1) {
            onAddAnnotation(pageNumber, {
                type: 'path',
                points: currentPath,
                color: color,
                strokeWidth: size,
                opacity: tool === 'highlighter' ? 0.5 : 1
            });
        }
        setCurrentPath([]);
    };

    const handleTextSubmit = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            if (textInput?.value?.trim()) {
                onAddAnnotation(pageNumber, {
                    type: 'text',
                    x: textInput.x,
                    y: textInput.y,
                    text: textInput.value,
                    color: color,
                    size: size
                });
            }
            setTextInput(null);
        }
    };

    return (
        <>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className={`absolute inset-0 z-10 ${isAnnotating ? (tool === 'eraser' ? 'cursor-pointer' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair') : 'pointer-events-none'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
            {textInput && (
                <input
                    autoFocus
                    placeholder="Type here..."
                    className="absolute z-20 bg-white border border-indigo-500 shadow-lg outline-none text-slate-900 px-2 py-1 rounded min-w-[150px]"
                    style={{
                        left: `${textInput.x * 100}%`,
                        top: `${textInput.y * 100}%`,
                        fontSize: `${size * scale}px`,
                        color: `rgb(${JSON.parse(color).r * 255}, ${JSON.parse(color).g * 255}, ${JSON.parse(color).b * 255})`,
                        transform: 'translateY(-50%)'
                    }}
                    value={textInput.value}
                    onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                    onKeyDown={handleTextSubmit}
                    onBlur={handleTextSubmit}
                />
            )}
        </>
    );
};

export default AnnotationCanvas;
