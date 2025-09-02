import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faCodeBranch } from "@fortawesome/free-solid-svg-icons";

export default function Footer() {
    return (
        <footer className="w-full bg-theme text-theme border-t border-gray-300 dark:border-gray-700 px-6 py-3 text-sm flex items-center justify-between">
            <p>
                © {new Date().getFullYear()} Tasker – Tutti i diritti riservati
            </p>
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faHeart} className="text-red-500" />
                    <span>Made with love</span>
                </span>
                <a
                    href="https://github.com/tuo-repo/tasker"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:underline"
                >
                    <FontAwesomeIcon icon={faCodeBranch} />
                    <span>GitHub</span>
                </a>
            </div>
        </footer>
    );
}
