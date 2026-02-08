import React, { useState } from 'react';
import { Report } from '../types';
import { Trophy, Medal, Award, TrendingUp, Globe, MapPin } from 'lucide-react';

interface AreaRankingSidebarProps {
    reports: Report[];
    areaCode: string;
}

interface RankedAO {
    name: string;
    count: number;
    rank: number;
    level: string;
    area: string; // Add area to track origin
}

export default function AreaRankingSidebar({ reports, areaCode }: AreaRankingSidebarProps) {
    const [activeTab, setActiveTab] = useState<'AREA' | 'GLOBAL'>('AREA');

    // Helper to process reports and generate ranking
    const getRankedAOs = (targetScope: 'AREA' | 'GLOBAL') => {
        // 1. Filter reports
        const filteredReports = reports.filter(r =>
            r.status === 'APPROVED' &&
            (targetScope === 'GLOBAL' || r.areaCode === areaCode)
        );

        // 2. Group by Unique Identity (AO ID)
        const aoCounts: { [aoId: string]: { count: number, name: string, area: string } } = {};

        filteredReports.forEach(r => {
            // Use aoId as the unique key
            if (r.aoId) {
                if (!aoCounts[r.aoId]) {
                    aoCounts[r.aoId] = {
                        count: 0,
                        name: r.aoName,
                        area: r.areaCode
                    };
                }
                aoCounts[r.aoId].count += 1;
            }
        });

        // 3. Convert to array and sort
        const ranked: RankedAO[] = Object.values(aoCounts)
            .map((data) => ({
                name: data.name,
                area: data.area,
                count: data.count,
                rank: 0,
                level: ''
            }))
            .sort((a, b) => b.count - a.count);

        // 4. Assign ranks and levels
        let currentRank = 1;
        ranked.forEach((ao, index) => {
            if (index > 0 && ao.count < ranked[index - 1].count) {
                currentRank = index + 1;
            }
            ao.rank = currentRank;

            // Determine Level
            if (ao.count >= 20) ao.level = 'Diamond';
            else if (ao.count >= 15) ao.level = 'Platinum';
            else if (ao.count >= 10) ao.level = 'Gold';
            else if (ao.count >= 5) ao.level = 'Silver';
            else ao.level = 'Bronze';
        });

        return ranked;
    };

    const rankedAos = getRankedAOs(activeTab);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Trophy className="text-yellow-500 w-5 h-5" />;
            case 2: return <Medal className="text-gray-400 w-5 h-5" />;
            case 3: return <Medal className="text-amber-700 w-5 h-5" />;
            default: return <Award className="text-blue-300 w-5 h-5" />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'Diamond': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
            case 'Platinum': return 'bg-slate-100 text-slate-800 border-slate-200';
            case 'Gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Silver': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-orange-50 text-orange-800 border-orange-200';
        }
    };

    return (
        <div className="w-full h-auto lg:h-full flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col shadow-sm">
            {/* Header & Tabs */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-4 text-gray-800">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                    <h2 className="text-lg font-bold">Top Performance</h2>
                </div>

                <div className="flex bg-gray-200 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('AREA')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'AREA'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <MapPin size={14} />
                        Area {areaCode}
                    </button>
                    <button
                        onClick={() => setActiveTab('GLOBAL')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'GLOBAL'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Globe size={14} />
                        CUPS
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {rankedAos.length === 0 ? (
                    <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500 text-sm">Belum ada data performa untuk ditampilkan.</p>
                    </div>
                ) : (
                    rankedAos.map((ao, idx) => (
                        <div
                            key={`${ao.name}-${ao.area}`}
                            className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-md ${ao.rank === 1
                                ? (activeTab === 'GLOBAL' ? 'border-blue-300 bg-blue-50/30' : 'border-yellow-400 bg-yellow-50/50')
                                : 'border-gray-100 bg-white'
                                }`}
                        >
                            {ao.rank <= 3 && (
                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border shadow flex items-center justify-center">
                                    {getRankIcon(ao.rank)}
                                </div>
                            )}

                            <div className="flex items-center gap-4 mb-2">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl ${ao.rank <= 3 ? 'bg-gray-800 text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    #{ao.rank}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 leading-tight">
                                        {ao.name}
                                        {/* Add Me indicator if needed? Not scope now */}
                                    </h3>
                                    {activeTab === 'GLOBAL' ? (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-bold bg-blue-100 text-blue-800 mt-1 border border-blue-200">
                                            Area {ao.area}
                                        </span>
                                    ) : (
                                        <p className="text-sm font-bold text-gray-500 mt-1">Area {ao.area}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                                <span className={`text-xs px-2 py-1 rounded border font-semibold ${getLevelColor(ao.level)}`}>
                                    {ao.level}
                                </span>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-gray-800">{ao.count}</span>
                                    <span className="text-xs text-gray-500 ml-1">Pengajuan Sukses</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>


        </div>
    );
}
