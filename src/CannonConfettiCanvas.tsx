import { useEffect, useRef } from "react";

export default function CannonConfettiCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const confetti: {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            shape: "circle" | "rect" | "oval" | "triangle";
            rotation: number;
            rotateSpeed: number;
            alpha: number;
        }[] = [];

        const shapes = ["circle", "rect", "oval", "triangle"] as const;

        const emitters = [
            { x: 0, y: 0, angle: Math.PI / 4 },                // top-left
            { x: width, y: 0, angle: (3 * Math.PI) / 4 },       // top-right
            { x: 0, y: height, angle: -Math.PI / 4 },           // bottom-left
            { x: width, y: height, angle: (-3 * Math.PI) / 4 }, // bottom-right
        ];

        const confettiPerEmitter = 1000;

        emitters.forEach(({ x, y, angle }) => {
            for (let i = 0; i < confettiPerEmitter; i++) {
                const spread = (Math.random() - 0.5) * (Math.PI / 3); // ±30°
                const finalAngle = angle + spread;
                const speed = Math.random() * 4 + 2;

                confetti.push({
                    x,
                    y,
                    vx: Math.cos(finalAngle) * speed,
                    vy: Math.sin(finalAngle) * speed,
                    size: Math.random() * 10 + 8,
                    color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                    shape: shapes[Math.floor(Math.random() * shapes.length)],
                    rotation: Math.random() * 360,
                    rotateSpeed: (Math.random() - 0.5) * 10,
                    alpha: 1,
                });
            }
        });

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            for (const c of confetti) {
                if (c.alpha <= 0) continue;

                c.x += c.vx;
                c.y += c.vy;
                c.rotation += c.rotateSpeed;
                c.alpha -= 0.003;

                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate((c.rotation * Math.PI) / 180);
                ctx.globalAlpha = c.alpha;
                ctx.fillStyle = c.color;

                switch (c.shape) {
                    case "circle":
                        ctx.beginPath();
                        ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case "oval":
                        ctx.beginPath();
                        ctx.ellipse(0, 0, c.size / 2, c.size / 4, 0, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case "rect":
                        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
                        break;
                    case "triangle":
                        ctx.beginPath();
                        ctx.moveTo(0, -c.size / 2);
                        ctx.lineTo(c.size / 2, c.size / 2);
                        ctx.lineTo(-c.size / 2, c.size / 2);
                        ctx.closePath();
                        ctx.fill();
                        break;
                }

                ctx.restore();
            }

            // Clean up invisibili
            const visible = confetti.filter((c) => c.alpha > 0);
            confetti.length = visible.length;
            for (let i = 0; i < visible.length; i++) confetti[i] = visible[i];

            requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 30,
                pointerEvents: "none",
            }}
        />
    );
}
