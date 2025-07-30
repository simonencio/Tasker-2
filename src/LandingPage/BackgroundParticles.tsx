import { useRef, useEffect } from "react";

export default function BackgroundParticles() {
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

        // === STELLE STATICHE COLORATE ===
        const stars = Array.from({ length: 300 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5 + 0.3,
            color: `hsl(${Math.random() * 360}, 70%, 85%)`,
            speedX: (Math.random() - 0.5) * 0.05,
            speedY: (Math.random() - 0.5) * 0.05,
        }));

        // === STELLE CADENTI SOLO DIAGONALI ===
        const shootingStars: {
            x: number;
            y: number;
            vx: number;
            vy: number;
            length: number;
            life: number;
            alpha: number;
        }[] = [];

        const spawnShootingStar = () => {
            shootingStars.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.3,
                vx: Math.random() * 4 + 4,
                vy: Math.random() * 2 + 2,
                length: Math.random() * 100 + 80,
                life: 0,
                alpha: 1,
            });
        };

        let lastTime = performance.now();

        const animate = (now: number) => {
            const delta = now - lastTime;
            lastTime = now;

            ctx.clearRect(0, 0, width, height);

            // Stelle statiche
            stars.forEach((star) => {
                star.x += star.speedX;
                star.y += star.speedY;

                if (star.x < 0) star.x = width;
                if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height;
                if (star.y > height) star.y = 0;

                ctx.fillStyle = star.color;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Stelle cadenti diagonali
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const s = shootingStars[i];
                s.x += s.vx;
                s.y += s.vy;
                s.life += delta;
                s.alpha -= 0.005;

                const trailX = s.x - s.vx * 4;
                const trailY = s.y - s.vy * 4;

                const gradient = ctx.createLinearGradient(s.x, s.y, trailX, trailY);
                gradient.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
                gradient.addColorStop(1, `rgba(255,255,255,0)`);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(trailX, trailY);
                ctx.stroke();

                if (
                    s.x > width + s.length ||
                    s.y > height + s.length ||
                    s.alpha <= 0
                ) {
                    shootingStars.splice(i, 1);
                }
            }

            // Maggiore frequenza stelle cadenti
            if (Math.random() < 0.04) spawnShootingStar();

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                zIndex: 0,
                pointerEvents: "none",
                width: "100vw",
                height: "100vh",
                background: `
                    radial-gradient(circle at 30% 40%, rgba(111,0,255,0.1), transparent 50%),
                    radial-gradient(circle at 70% 70%, rgba(0,200,255,0.07), transparent 60%),
                    linear-gradient(150deg, #000000, #010101, #1F2937, #000)
                `,
            }}
        />
    );
}
