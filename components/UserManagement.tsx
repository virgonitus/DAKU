
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { UserPlus, Save, Users, Edit, Plus, ArrowLeft, Settings, Trash2, List } from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface UserManagementProps {
  onCancel: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onCancel }) => {
  const { showModal } = useModal();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'SETTINGS'>('LIST');
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Master Data State
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  // Form States
  const [role, setRole] = useState<Role>('AO');
  const [idSuffix, setIdSuffix] = useState('');
  const [name, setName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Settings Input State
  const [newBranch, setNewBranch] = useState('');
  const [newArea, setNewArea] = useState('');

  // User List Filters
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userAreaFilter, setUserAreaFilter] = useState('ALL');

  // Fetch users and master data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh user list every 10 seconds
  useEffect(() => {
    if (viewMode !== 'LIST') return;

    const intervalId = setInterval(() => {
      db.getUsers().then(u => setUsers(u));
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [viewMode]);

  const loadData = async () => {
    setIsLoading(true);
    // Supabase Load
    const { data: usersData } = await supabase.from('profiles').select('*');
    const u = usersData?.map((p: any) => ({
      id: p.id,
      name: p.full_name,
      role: p.role as Role,
      branchCode: p.branch_code,
      areaCode: p.area_code,
      username: p.username
    })) || [];

    const { data: branchesData } = await supabase.from('branches').select('code');
    const { data: areasData } = await supabase.from('areas').select('code');

    const b = branchesData?.map((x: any) => x.code) || [];
    const a = areasData?.map((x: any) => x.code) || [];
    setUsers(u);
    setAvailableBranches(b);
    setAvailableAreas(a);

    // Set default selected values for form if not set
    if (!branchCode && b.length > 0) setBranchCode(b[0]);
    if (!areaCode && a.length > 0) setAreaCode(a[0]);

    setIsLoading(false);
  };

  const resetForm = () => {
    setRole('AO');
    setIdSuffix('');
    setName('');
    setBranchCode(availableBranches[0] || '');
    setAreaCode(availableAreas[0] || '');
    setUsername('');
    setPassword('');
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    resetForm();
    setViewMode('FORM');
  };

  const handleEdit = (user: User) => {
    // Parse ID suffix (e.g., AO-123 -> 123)
    const splitId = user.id.split('-');
    const suffix = splitId.length > 1 ? splitId[1] : user.id;

    setRole(user.role);
    setIdSuffix(suffix);
    setName(user.name);
    setBranchCode(user.branchCode);
    setAreaCode(user.areaCode);
    setUsername(user.username);
    setPassword(user.password || '');

    setIsEditing(true);
    setViewMode('FORM');
  };

  const getFullId = () => {
    const prefix = role === 'AO' ? 'AO' : role === 'AK' ? 'AK' : role === 'AKA' ? 'AKA' : role === 'AKP' ? 'AKP' : role === 'IT_SUPPORT' ? 'IT' : role;
    return `${prefix}-${idSuffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username) {
      showModal({ title: 'Gagal Menyimpan', message: 'Mohon lengkapi Nama dan Username.', type: 'warning' });
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing) {
        // Update Profile Only (Cannot change password or email via Client SDK for other users)
        const { error } = await supabase.from('profiles').update({
          full_name: name,
          branch_code: branchCode,
          area_code: areaCode,
          username: username
        }).eq('username', username); // Use username as key for now if ID is UUID

        if (error) throw error;
        showModal({ title: 'Berhasil', message: 'Data user berhasil diperbarui! (Password tidak berubah)', type: 'success' });

      } else {
        // Create New User (SignUp)
        if (!password) {
          showModal({ title: 'Gagal', message: 'Password wajib diisi untuk user baru.', type: 'warning' });
          setIsLoading(false);
          return;
        }

        const email = `${username}@daku.com`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              full_name: name,
              role,
              branch_code: branchCode,
              area_code: areaCode
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Manual Insert to Profile (in case Trigger missing)
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            username,
            full_name: name,
            role,
            branch_code: branchCode,
            area_code: areaCode
          });
          if (profileError) console.error("Profile insert warning:", profileError);
        }

        showModal({ title: 'Berhasil', message: 'User baru berhasil ditambahkan ke Supabase!', type: 'success' });
      }

      await loadData();
      setViewMode('LIST');
    } catch (err: any) {
      console.error(err);
      showModal({ title: 'Error', message: err.message || 'Terjadi kesalahan.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- MASTER DATA HANDLERS ---

  const handleAddBranch = async () => {
    if (!newBranch) return;
    const code = newBranch.toUpperCase();
    const { error } = await supabase.from('branches').insert({ code });
    if (error) {
      showModal({ title: 'Gagal', message: error.message, type: 'error' });
      return;
    }
    setNewBranch('');
    // Ensure UI updates
    if (!availableBranches.includes(code)) {
      setAvailableBranches(prev => [...prev, code]);
    }
  };

  const handleDeleteBranch = async (code: string) => {
    showModal({
      title: 'Hapus Cabang?',
      message: `Apakah Anda yakin ingin menghapus Kantor Cabang ${code}?`,
      type: 'confirm',
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        // Perform DB Deletion
        const { error } = await supabase.from('branches').delete().eq('code', code);
        if (error) {
          showModal({ title: 'Gagal', message: error.message, type: 'error' });
          return;
        }
        // Optimistic UI Update: Remove immediately from screen
        setAvailableBranches(prev => prev.filter(b => b !== code));
      }
    });
  };

  const handleAddArea = async () => {
    if (!newArea) return;
    const code = newArea.toUpperCase();
    const { error } = await supabase.from('areas').insert({ code });
    if (error) {
      showModal({ title: 'Gagal', message: error.message, type: 'error' });
      return;
    }
    setNewArea('');
    if (!availableAreas.includes(code)) {
      setAvailableAreas(prev => [...prev, code]);
    }
  };

  const handleDeleteArea = async (code: string) => {
    showModal({
      title: 'Hapus Area?',
      message: `Apakah Anda yakin ingin menghapus Area Kerja ${code}?`,
      type: 'confirm',
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        // Perform DB Deletion
        const { error } = await supabase.from('areas').delete().eq('code', code);
        if (error) {
          showModal({ title: 'Gagal', message: error.message, type: 'error' });
          return;
        }
        // Optimistic UI Update
        setAvailableAreas(prev => prev.filter(a => a !== code));
      }
    });
  };

  // --- DELETE USER HANDLER ---
  const handleDeleteUser = async (user: User) => {
    if (user.role === 'ADMIN') {
      showModal({ title: 'Tidak Diizinkan', message: 'Akun Administrator tidak dapat dihapus.', type: 'warning' });
      return;
    }

    showModal({
      title: 'Hapus User?',
      message: `Apakah Anda yakin ingin menghapus user "${user.name}"? User tidak akan bisa login lagi.`,
      type: 'confirm',
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        // Delete from Profiles (Effective Ban)
        // Note: Auth User remains but cannot login if app checks profile.
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);

        if (error) {
          showModal({ title: 'Gagal', message: error.message, type: 'error' });
          return;
        }

        setUsers(prev => prev.filter(u => u.id !== user.id));
        showModal({ title: 'Berhasil', message: 'User berhasil dihapus.', type: 'success' });
      }
    });
  };

  // --- RENDER LIST VIEW ---
  if (viewMode === 'LIST') {
    return (
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-8">
        <div className="flex items-center justify-between border-b pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Manajemen User</h2>
              <p className="text-sm text-gray-500">Kelola akun Account Officer dan Admin Kredit</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('SETTINGS')}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 border border-gray-300"
            >
              <Settings size={18} /> Master Data
            </button>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg"
            >
              <Plus size={18} /> Tambah User
            </button>
            <button
              onClick={() => {
                const admin = users.find(u => u.role === 'ADMIN');
                if (admin) handleEdit(admin);
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg"
            >
              <Edit size={18} /> Ganti Password Admin
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg border">
          <input
            type="text"
            placeholder="Cari nama atau ID user..."
            className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={userAreaFilter}
            onChange={(e) => setUserAreaFilter(e.target.value)}
          >
            <option value="ALL">Semua Area</option>
            {availableAreas.map(area => (
              <option key={area} value={area}>Area {area}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
                <th className="p-4">ID User</th>
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">Role</th>
                <th className="p-4">Cabang</th>
                <th className="p-4 text-center">Area</th>
                <th className="p-4">Username</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm">
              {users.filter(u => {
                // Search filter
                if (userSearchTerm) {
                  const searchLower = userSearchTerm.toLowerCase();
                  if (!u.name.toLowerCase().includes(searchLower) && !u.id.toLowerCase().includes(searchLower)) {
                    return false;
                  }
                }
                // Area filter
                if (userAreaFilter !== 'ALL' && u.areaCode !== userAreaFilter) {
                  return false;
                }
                return true;
              }).map((user, index, array) => {
                const isLast = index === array.length - 1;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono font-semibold">{user.id}</td>
                    <td className="p-4 font-medium text-gray-800">{user.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'AO' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">{user.branchCode}</td>
                    <td className="p-4 text-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold text-xs">
                        {user.areaCode}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{user.username}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit size={16} />
                        </button>
                        {user.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Hapus User"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {users.filter(u => {
                if (userSearchTerm) {
                  const searchLower = userSearchTerm.toLowerCase();
                  if (!u.name.toLowerCase().includes(searchLower) && !u.id.toLowerCase().includes(searchLower)) return false;
                }
                if (userAreaFilter !== 'ALL' && u.areaCode !== userAreaFilter) return false;
                return true;
              }).length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">Belum ada data user. Silakan tambah baru.</td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-800 font-semibold px-4">
            Kembali ke Dashboard
          </button>
        </div>
      </div >
    );
  }

  // --- RENDER MASTER DATA SETTINGS ---
  if (viewMode === 'SETTINGS') {
    return (
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-8">
        <div className="flex items-center gap-3 border-b pb-4 mb-6">
          <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-100 rounded-full mr-2">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <Settings className="text-gray-700 w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Kelola Master Data</h2>
            <p className="text-sm text-gray-500">Tambah atau hapus opsi Kantor Cabang dan Area Kerja</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* BRANCH MANAGEMENT */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center gap-2">
              <List size={20} /> Kantor Cabang
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="Kode Cabang (e.g., KC-MEDAN)"
                className="flex-1 p-2 border rounded text-sm uppercase"
              />
              <button
                type="button"
                onClick={handleAddBranch}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="bg-white rounded border h-64 overflow-y-auto">
              <ul className="divide-y">
                {availableBranches.map(branch => (
                  <li key={branch} className="p-3 flex justify-between items-center hover:bg-gray-50">
                    <span className="font-mono text-sm">{branch}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBranch(branch)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {availableBranches.length === 0 && (
                  <li className="p-4 text-center text-gray-400 text-sm">Tidak ada data cabang.</li>
                )}
              </ul>
            </div>
          </div>

          {/* AREA MANAGEMENT */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-lg mb-4 text-green-800 flex items-center gap-2">
              <List size={20} /> Area Kerja
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Kode Area (e.g., 10)"
                className="flex-1 p-2 border rounded text-sm uppercase"
              />
              <button
                type="button"
                onClick={handleAddArea}
                className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="bg-white rounded border h-64 overflow-y-auto">
              <ul className="divide-y">
                {availableAreas.map(area => (
                  <li key={area} className="p-3 flex justify-between items-center hover:bg-gray-50">
                    <span className="font-bold text-sm bg-gray-200 px-2 rounded">{area}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteArea(area)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {availableAreas.length === 0 && (
                  <li className="p-4 text-center text-gray-400 text-sm">Tidak ada data area.</li>
                )}
              </ul>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- RENDER FORM VIEW ---
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-8">
      <div className="flex items-center gap-3 border-b pb-4 mb-6">
        <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-100 rounded-full mr-2">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        {isEditing ? <Edit className="text-blue-600 w-8 h-8" /> : <UserPlus className="text-blue-600 w-8 h-8" />}
        <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'Edit Data User' : 'Tambah User Baru'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Role User</label>

          {role === 'ADMIN' ? (
            <div className="p-4 bg-purple-100 border border-purple-300 rounded-lg text-purple-800 font-bold text-center">
              👑 Administrator System (Super User)
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Account Officer */}
              <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${role === 'AO' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 text-gray-500'}`}>
                <input type="radio" name="role" value="AO" checked={role === 'AO'} onChange={() => !isEditing && setRole('AO')} className="hidden" disabled={isEditing} />
                <span className="font-bold text-sm text-center">Account Officer</span>
                <span className="text-xs mt-1 font-mono">(AO)</span>
              </label>

              {/* Admin Kredit (AK) */}
              <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${role === 'AK' ? 'border-green-600 bg-green-50 text-green-700 shadow-sm' : 'border-gray-100 hover:border-green-200 hover:bg-green-50/50 text-gray-500'}`}>
                <input type="radio" name="role" value="AK" checked={role === 'AK'} onChange={() => !isEditing && setRole('AK')} className="hidden" disabled={isEditing} />
                <span className="font-bold text-sm text-center">Admin Kredit</span>
                <span className="text-xs mt-1 font-mono">(AK - Cabang)</span>
              </label>

              {/* Admin Area */}
              <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${role === 'AKA' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-gray-500'}`}>
                <input type="radio" name="role" value="AKA" checked={role === 'AKA'} onChange={() => !isEditing && setRole('AKA')} className="hidden" disabled={isEditing} />
                <span className="font-bold text-sm text-center">Admin Area</span>
                <span className="text-xs mt-1 font-mono">(AKA)</span>
              </label>

              {/* Admin Pusat */}
              <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${role === 'AKP' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 text-gray-500'}`}>
                <input type="radio" name="role" value="AKP" checked={role === 'AKP'} onChange={() => !isEditing && setRole('AKP')} className="hidden" disabled={isEditing} />
                <span className="font-bold text-sm text-center">Admin Pusat</span>
                <span className="text-xs mt-1 font-mono">(AKP)</span>
              </label>

              {/* Area Manager */}
              <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${role === 'AM' ? 'border-orange-600 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 text-gray-500'}`}>
                <input type="radio" name="role" value="AM" checked={role === 'AM'} onChange={() => !isEditing && setRole('AM')} className="hidden" disabled={isEditing} />
                <span className="font-bold text-sm text-center">Area Manager</span>
                <span className="text-xs mt-1 font-mono">(AM)</span>
              </label>

              {/* General Manager */}
              <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${role === 'GM' ? 'border-yellow-600 bg-yellow-50 text-yellow-700 shadow-sm' : 'border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/50 text-gray-500'}`}>
                <input type="radio" name="role" value="GM" checked={role === 'GM'} onChange={() => !isEditing && setRole('GM')} className="hidden" disabled={isEditing} />
                <span className="font-bold text-sm text-center">General Manager</span>
                <span className="text-xs mt-1 font-mono">(GM)</span>
              </label>

              {/* IT Support */}
              <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${role === 'IT_SUPPORT' ? 'border-red-600 bg-red-50 text-red-700 shadow-sm' : 'border-gray-100 hover:border-red-200 hover:bg-red-50/50 text-gray-500'}`}>
                <input type="radio" name="role" value="IT_SUPPORT" checked={role === 'IT_SUPPORT'} onChange={() => !isEditing && setRole('IT_SUPPORT')} className="hidden" disabled={isEditing} />
                <span className="font-bold text-sm text-center">IT Support</span>
                <span className="text-xs mt-1 font-mono">(IT)</span>
              </label>
            </div>
          )}
          {isEditing && role !== 'ADMIN' && <p className="text-xs text-red-500 mt-1">*Role tidak dapat diubah saat mode edit.</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Custom ID Input */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">ID User</label>
            <div className="flex items-center">
              <span className="bg-gray-100 border border-r-0 border-gray-300 p-2.5 rounded-l text-gray-500 font-mono text-sm">
                {role === 'AO' ? 'AO-' : role === 'AK' ? 'AK-' : role === 'AKA' ? 'AKA-' : role === 'AKP' ? 'AKP-' : role === 'IT_SUPPORT' ? 'IT-' : `${role}-`}
              </span>
              <input
                type="text"
                className={`w-full p-2.5 border border-gray-300 rounded-r font-mono text-sm ${isEditing ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-blue-500'}`}
                placeholder="999"
                value={idSuffix}
                onChange={(e) => setIdSuffix(e.target.value)}
                maxLength={5}
                disabled={isEditing}
              />
            </div>
            {isEditing && <p className="text-[10px] text-gray-400 mt-1">*ID tidak dapat diubah.</p>}
          </div>

          {/* Full Name */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Lengkap</label>
            <input
              type="text"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder={`Nama ${role}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {/* Branch Dropdown (Dynamic) */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Kode Kantor Cabang</label>
          <select
            className="w-full p-2.5 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
            value={branchCode}
            onChange={(e) => setBranchCode(e.target.value)}
          >
            <option value="" disabled>Pilih Cabang</option>
            {availableBranches.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {availableBranches.length === 0 && <p className="text-red-500 text-xs mt-1">Belum ada data cabang. Tambahkan di menu Master Data.</p>}
        </div>

        {/* Area Options (Dynamic Radio) */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Kode Area Kerja (Kunci Interaksi)</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {availableAreas.map(opt => (
              <label key={opt} className={`flex flex-col items-center justify-center p-3 rounded border cursor-pointer hover:bg-gray-50 ${areaCode === opt ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  name="areaCode"
                  value={opt}
                  checked={areaCode === opt}
                  onChange={(e) => setAreaCode(e.target.value)}
                  className="mb-1 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-lg font-bold text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
          {availableAreas.length === 0 && <p className="text-red-500 text-xs mt-1">Belum ada data area. Tambahkan di menu Master Data.</p>}
          <p className="text-xs text-gray-400 mt-2 italic">*AO hanya dapat mengirim laporan ke Admin Kredit di Area Kerja yang sama.</p>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="col-span-2 text-sm font-bold text-gray-500 border-b pb-1 mb-1">Kredensial Login</div>
          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Username</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: ao999"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: pass123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => setViewMode('LIST')}
            className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Save size={18} /> {isLoading ? 'Menyimpan...' : 'Simpan Data User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserManagement;
