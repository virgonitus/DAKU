import React from 'react';
import cupsLogo from '../src/assets/logodoku.png';

export default function LoadingScreen() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative">
            <div className="flex flex-col items-center gap-8 relative z-10">
                {/* Logo Container with Professional Breathing Animation */}
                <div className="relative">
                    {/* Subtle Glow behind logo */}
                    <div className="absolute inset-0 bg-blue-100/50 rounded-full blur-2xl opacity-0 animate-[pulse_3s_ease-in-out_infinite]"></div>
                    <img
                        src={cupsLogo}
                        alt="Loading..."
                        className="w-24 h-24 object-contain animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] drop-shadow-sm"
                    />
                </div>

                {/* Minimalist Loader Line */}
                <div className="flex flex-col items-center gap-3">
                    <div className="h-[1.5px] w-20 bg-gray-100 rounded-full overflow-hidden">
                        {/* Using dash animation defined below */}
                        <div className="h-full bg-blue-600 w-full animate-[dash_1.5s_ease-in-out_infinite] origin-left"></div>
                    </div>

                    <p className="text-gray-400 text-[10px] font-medium tracking-[0.3em] uppercase animate-pulse">
                        Memuat Sistem...
                    </p>
                </div>
            </div>

            {/* Minimal Footer */}
            <div className="absolute bottom-6 w-full text-center">
                <p className="text-gray-300 text-[10px] font-light">Credit Union Pancur Solidaritas</p>
            </div>

            <style>{`
        @keyframes dash {
          0% { transform: translateX(-100%) scaleX(0.5); }
          50% { transform: translateX(0%) scaleX(1); }
          100% { transform: translateX(100%) scaleX(0.5); }
        }
      `}</style>
        </div>
    );
}
