
import { User } from '../types';

export const INITIAL_USERS: User[] = [
    {
        id: 'ADMIN-001',
        username: 'admin',
        password: 'admin', // TODO: Move to env or change on first login
        name: 'Administrator Pusat',
        role: 'ADMIN',
        branchCode: 'PUSAT',
        areaCode: 'ALL'
    },
    {
        id: 'AO-001',
        username: 'ao1',
        password: '123',
        name: 'Budi Santoso',
        role: 'AO',
        branchCode: 'KC-JAKARTA-PUSAT',
        areaCode: '1'
    },
    {
        id: 'ADM-001',
        username: 'ak1',
        password: '123',
        name: 'Siti Aminah',
        role: 'AK',
        branchCode: 'KC-JAKARTA-PUSAT',
        areaCode: '1'
    },
    {
        id: 'ADM-002',
        username: 'ak2',
        password: '123',
        name: 'Rudi Hartono',
        role: 'AK',
        branchCode: 'KC-JAKARTA-SELATAN',
        areaCode: '1'
    },
    {
        id: 'AM-001',
        username: 'am1',
        password: '123',
        name: 'Area Manager 1',
        role: 'AM',
        branchCode: 'KANWIL',
        areaCode: '1'
    },
    {
        id: 'GM-001',
        username: 'gm1',
        password: '123',
        name: 'General Manager',
        role: 'GM',
        branchCode: 'PUSAT',
        areaCode: 'ALL'
    },
    {
        id: 'IT-001',
        username: 'it1',
        password: '123',
        name: 'IT Support',
        role: 'IT_SUPPORT',
        branchCode: 'PUSAT',
        areaCode: 'ALL'
    },
    {
        id: 'AKA-001',
        username: 'aka1',
        password: '123',
        name: 'Admin Kredit Area 1',
        role: 'AKA',
        branchCode: 'KANWIL',
        areaCode: '1'
    },
    {
        id: 'AKP-001',
        username: 'akp1',
        password: '123',
        name: 'Admin Kredit Pusat',
        role: 'AKP',
        branchCode: 'PUSAT',
        areaCode: 'ALL'
    }
];

export const INITIAL_BRANCHES = [
    'KC-JAKARTA-PUSAT',
    'KC-JAKARTA-SELATAN',
    'KC-BANDUNG',
    'KC-SURABAYA',
    'KC-SEMARANG'
];

export const INITIAL_AREAS = [
    '1', '2', '3', '4', '5'
];
