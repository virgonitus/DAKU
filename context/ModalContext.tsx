import React, { createContext, useContext, useState, ReactNode } from 'react';
import Modal, { ModalType } from '../components/Modal';

interface ModalOptions {
    type?: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [modalProps, setModalProps] = useState<ModalOptions>({
        title: '',
        message: '',
        type: 'info'
    });

    const showModal = (options: ModalOptions) => {
        setModalProps(options);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    return (
        <ModalContext.Provider value={{ showModal, closeModal }}>
            {children}
            <Modal
                isOpen={isOpen}
                onClose={closeModal}
                {...modalProps}
            />
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
