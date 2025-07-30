import { useEffect, useState } from "react";
import "./AnimatedLogo.css";
import BackgroundParticles from "./BackgroundParticles";

type AnimatedLogoProps = {
    onFinish: () => void;
};

export default function AnimatedLogo({ onFinish }: AnimatedLogoProps) {
    const [showSpinner, setShowSpinner] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const paths = document.querySelectorAll(".logo-path");
        paths.forEach((el, index) => {
            const path = el as SVGPathElement;
            const mod = index % 4;

            path.classList.add("logo-fade-wave");
            if (mod === 0) path.classList.add("from-left");
            else if (mod === 1) path.classList.add("from-right");
            else if (mod === 2) path.classList.add("from-top");
            else path.classList.add("from-bottom");

            path.style.animationDelay = `${index * 0.5}s`;
        });

        const totalDuration = paths.length * 600 + 2000;
        const timer1 = setTimeout(() => setShowSpinner(true), totalDuration);
        const timer2 = setTimeout(() => setFadeOut(true), totalDuration + 2000);
        const timer3 = setTimeout(() => onFinish(), totalDuration + 2500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [onFinish]);

    return (
        <>
            <BackgroundParticles />
            <div className={`logo-wrapper ${fadeOut ? "fade-out" : ""}`}>
                <svg
                    className="logo-svg"
                    viewBox="-100 -50 943 250"
                    preserveAspectRatio="xMidYMid meet"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path className="logo-path" d="M83.2 150H24.8V134H44.8V16H15.2V39.2H0V-1.52588e-05H108V39.2H92.8V16H63.2V134H83.2V150Z" />
                    <path className="logo-path" d="M190.008 150V134H203.208L194.608 109.2H144.608L136.008 134H149.408V150H107.008V134H117.608L151.408 36H143.008V20H196.408V36H187.808L221.608 134H232.408V150H190.008ZM169.608 36.6L150.008 93.2H189.208L169.608 36.6Z" />
                    <path className="logo-path" d="M323.053 104.4L313.453 94.6H271.853L251.453 73.2V42L272.253 20H318.653L339.453 42V67.2H322.853V49.6L310.853 37.2H280.253L269.853 47.8V67.4L279.653 77.4H321.253L341.453 98.6V128L320.653 150H270.253L249.453 128V102.8H266.053V120.4L278.253 132.8H312.853L323.053 122.2V104.4Z" />
                    <path className="logo-path" d="M485.175 150H442.775V134H452.975L423.575 93H403.775V134H417.775V150H371.375V134H385.375V36H371.375V20H417.775V36H403.775V77H421.375L450.975 36H440.775V20H483.175V36H471.575L437.375 83.6L473.575 134H485.175V150Z" />
                    <path className="logo-path" d="M505.164 20H600.364V59.2H584.364V36H537.564V77H584.364V93H537.564V134H584.364V110.8H600.364V150H505.164V134H519.164V36H505.164V20Z" />
                    <path className="logo-path" d="M632.312 20H712.312L733.112 42V82L712.912 103.2L731.513 134H742.112V150H706.513V134H712.112L694.112 104H664.713V134H676.713V150H632.312V134H646.312V36H632.312V20ZM704.312 86.8L715.912 75V49L704.513 37.2H664.713V86.8H704.312Z" />
                </svg>
            </div>

            {showSpinner && (
                <div className={`spinner-container ${fadeOut ? "fade-out" : ""}`}>
                    <div className="spinner" />
                </div>
            )}
        </>
    );
}
