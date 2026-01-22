import { Link } from "react-router-dom";

const NotFoundPage = () => {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
            <div className="relative">
                <h1 className="text-9xl font-black text-white/5 select-none">404</h1>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-accent/20 rounded-full blur-3xl animate-pulse" />
                    <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tighter">
                        LOST IN <span className="text-accent">SPACE</span>
                    </h2>
                </div>
            </div>

            <p className="mt-8 text-text-muted max-w-md text-lg">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
                <Link
                    to="/"
                    className="px-8 py-3 bg-accent text-background font-black rounded-xl hover:shadow-[0_0_30px_rgba(0,238,228,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    RETURN HOME
                </Link>
                <button
                    onClick={() => window.history.back()}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                    GO BACK
                </button>
            </div>

            <div className="mt-20 flex gap-8 grayscale opacity-20 hover:opacity-100 transition-opacity">
                {/* Decorative robot/tech icons could go here */}
                <svg className="w-12 h-12 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            </div>
        </div>
    );
};

export default NotFoundPage;
