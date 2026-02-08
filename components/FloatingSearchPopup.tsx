import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { User } from '../types';

interface FloatingSearchPopupProps {
    user: User | null;
    search: string;
    onSearchChange: (value: string) => void;
    branchFilter: string;
    onBranchFilterChange: (value: string) => void;
    typeFilter: string; // Used for AO
    onTypeFilterChange: (value: string) => void;
    branches: string[]; // List of unique branches for the dropdown
}

const FloatingSearchPopup: React.FC<FloatingSearchPopupProps> = ({
    user,
    search,
    onSearchChange,
    branchFilter,
    onBranchFilterChange,
    typeFilter,
    onTypeFilterChange,
    branches
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollThreshold = 150; // Show after scrolling down 150px
            if (window.scrollY > scrollThreshold) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50 transform transition-transform duration-300 ease-in-out py-3 px-4 border-b border-gray-200 animate-slideDown">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 justify-center md:justify-between">
                <div className="flex items-center gap-2 text-gray-700 font-semibold hidden md:flex">
                    <Search size={18} />
                    <span>Pencarian Cepat</span>
                </div>

                <div className="flex gap-2 flex-grow max-w-2xl">
                    {/* Search Input - Common for all */}
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder={user?.role === 'AO' ? "Cari Nama Anggota..." : "Cari AO, Anggota, Cabang..."}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>

                    {/* AO Type Filter */}
                    {user?.role === 'AO' && (
                        <select
                            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white"
                            value={typeFilter}
                            onChange={(e) => onTypeFilterChange(e.target.value)}
                        >
                            <option value="ALL">Semua Jenis</option>
                            <option value="KC">KC</option>
                            <option value="AREA">AREA</option>
                            <option value="KP">KP</option>
                        </select>
                    )}

                    {/* Branch Filter - For Admin/AK/AKA/AKP */}
                    {(['ADMIN', 'AK', 'AKA', 'AKP'].includes(user?.role || '')) && (
                        <select
                            className={`text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 outline-none shadow-sm bg-white ${user?.role === 'AK' ? 'focus:ring-purple-500' :
                                    user?.role === 'AKA' ? 'focus:ring-indigo-500' : 'focus:ring-blue-500'
                                }`}
                            value={branchFilter}
                            onChange={(e) => onBranchFilterChange(e.target.value)}
                        >
                            <option value="ALL">Semua Cabang</option>
                            {branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FloatingSearchPopup;
