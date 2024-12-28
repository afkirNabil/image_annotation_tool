import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';

const CanvasStage = ({ imageUrl, boxes, onNewBox, classColors, classes }) => {
    const [konvaImage, setKonvaImage] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [newBox, setNewBox] = useState(null);
    const stageRef = useRef();

    useEffect(() => {
        const img = new window.Image();
        img.src = imageUrl;
        img.onload = () => {
            setKonvaImage(img);
        };
    }, [imageUrl]);

    // Event handlers para detectar el mouseDown y coger la posición inicial
    const handleMouseDown = (e) => {
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        setIsDrawing(true);
        setNewBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        setNewBox(prev => ({
            ...prev,
            width: pos.x - prev.x,
            height: pos.y - prev.y
        }));
    };

    const handleMouseUp = () => {
        // Cuando se suelta el ratón, normalizamos la caja y llamamos a onNewBox
        if (isDrawing && newBox) {
            const normalizedBox = {
                x: Math.min(newBox.x, newBox.x + newBox.width),
                y: Math.min(newBox.y, newBox.y + newBox.height),
                width: Math.abs(newBox.width),
                height: Math.abs(newBox.height)
            };
            onNewBox(normalizedBox);
        }
        setIsDrawing(false);
        setNewBox(null);
    };

    return (
    <div>
        <Stage 
            width={konvaImage ? konvaImage.width : 600} 
            height={konvaImage ? konvaImage.height : 400}
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
        <Layer>
            {/* Imagen de fondo */}
            {konvaImage && <KonvaImage image={konvaImage} listening={false} />}

            {/* Cajas ya dibujadas (con el color y la etiqueta de la clase) */}
            {boxes.map((box, i) => {
                const className = classes[box.classId] || "";
                // El color para esta clase
                const strokeColor = classColors[className] || "red";
                return (
                    <React.Fragment key={i}>
                    <Rect
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        stroke={strokeColor}
                        strokeWidth={2}
                    />
                    <Text
                        x={box.x + box.width}
                        y={box.y}
                        text={className}
                        fill={strokeColor}
                        fontSize={14}
                        fontStyle="bold"
                        offsetX={className.length * 7}
                    />
                    </React.Fragment>
                );
        })}

        {/* Bounding box en tiempo real mientras se dibuja (color verde) */}
        {newBox && (
            <Rect
                x={newBox.x}
                y={newBox.y}
                width={newBox.width}
                height={newBox.height}
                stroke="green"
                strokeWidth={2}
            />
        )}
        </Layer>
        </Stage>
    </div>
    );
};

export default CanvasStage;
