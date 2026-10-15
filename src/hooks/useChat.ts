import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import Toast from 'react-native-toast-message';

import { DiscussionStatus } from '@/data_api/models/discussion.types';
import { Message, MessageType } from '@/data_api/models/message.types';
import { messageService } from '@/data_api/services/messageService';
import { socketService } from '@/data_api/services/socketService';
import { useAuth } from '@/hooks/useAuth';

const ACK_TIMEOUT_MS = 10000;

function emitWithAck<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Le serveur ne répond pas, veuillez réessayer.'));
        }, ACK_TIMEOUT_MS);

        socket.emit(event, payload, (ack: any) => {
            clearTimeout(timer);
            if (ack?.success === false) {
                reject(new Error(ack.error ?? 'Action refusée par le serveur.'));
            } else if (ack) {
                resolve(ack as T);
            } else {
                reject(new Error('Aucune confirmation du serveur.'));
            }
        });
    });
}

export function useChat(discussionId: string, initialLimit?: number) {
    const { user, token } = useAuth();

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [discussionActive, setDiscussionActive] = useState<boolean | null>(null);

    // ── Pagination historique (scroll vers le haut, façon WhatsApp) ──
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);

    const socketRef = useRef(socketService.getSocket());

    const appendMessage = useCallback((msg: Message) => {
        setMessages(prev => {
            if (prev.some(m => m.trackingId === msg.trackingId)) return prev;
            return [...prev, msg];
        });
    }, []);

    // =========================
    // SOCKET INIT
    // =========================
    useEffect(() => {
        if (!token || !discussionId) return;

        socketService.connect(token);
        const socket = socketService.getSocket();
        socketRef.current = socket;

        if (!socket) return;

        socket.emit('joinDiscussion', discussionId);

        const handleNewMessage = (msg: Message) => {
            if (msg.discussionTrackingId !== discussionId) return;
            appendMessage(msg);
        };

        const handleUpdate = (updated: Message) => {
            if (updated.discussionTrackingId !== discussionId) return;
            setMessages(prev =>
                prev.map(m =>
                    m.trackingId === updated.trackingId ? updated : m
                )
            );
        };

        const handleDelete = ({ messageId, discussionId: dId }: { messageId: string; discussionId?: string }) => {
            if (dId && dId !== discussionId) return;
            setMessages(prev =>
                prev.map(m =>
                    m.trackingId === messageId
                        ? { ...m, isDeleted: true, contenu: 'Message supprimé' }
                        : m
                )
            );
        };

        const handleMessagesRead = (updatedMessages: Message[]) => {
            const relevant = updatedMessages.filter(m => m.discussionTrackingId === discussionId);
            if (relevant.length === 0) return;
            setMessages(prev =>
                prev.map(m => relevant.find(u => u.trackingId === m.trackingId) ?? m)
            );
        };

        const handleLockChanged = ({ discussionId: dId, active }: { discussionId: string; active: boolean }) => {
            if (dId === discussionId) setDiscussionActive(active);
        };

        socket.on('newMessage', handleNewMessage);
        socket.on('messageUpdated', handleUpdate);
        socket.on('messageDeleted', handleDelete);
        socket.on('messagesRead', handleMessagesRead);
        socket.on('discussionLockChanged', handleLockChanged);

        return () => {
            socket.off('newMessage', handleNewMessage);
            socket.off('messageUpdated', handleUpdate);
            socket.off('messageDeleted', handleDelete);
            socket.off('messagesRead', handleMessagesRead);
            socket.off('discussionLockChanged', handleLockChanged);
            socket.emit('leaveDiscussion', discussionId);
        };
    }, [token, discussionId, appendMessage]);

    // =========================
    // HISTORY LOAD (initial)
    // =========================
    useEffect(() => {
        if (!discussionId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        const loadHistory = async () => {
            try {
                setLoading(true);
                setHasMoreHistory(true); // reset à chaque changement de discussion
                const history = await messageService.getByDiscussion(discussionId, undefined, initialLimit);
                setMessages(history);
            } catch (e) {
                console.error('Failed to load messages:', e);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [discussionId, initialLimit]);

    // =========================
    // LOAD MORE (tranche précédente, sur scroll vers le haut)
    // =========================
   // useChat.ts — remplace uniquement loadMoreHistory par ceci

const loadMoreHistory = useCallback(async () => {
    if (loadingMore || !discussionId) return;

    if (!hasMoreHistory) {
        Toast.show({
            type: 'info',
            text1: 'Vous avez atteint le début de la conversation',
            visibilityTime: 1500,
        });
        return;
    }

    setMessages(current => {
        if (current.length === 0) return current;

        const oldest = current[0];
        const beforeDate = oldest.dateEnvoi ?? oldest.createdAt;

        setLoadingMore(true);
        messageService
            .getByDiscussion(discussionId, beforeDate)
            .then((older) => {
                if (older.length === 0) {
                    setHasMoreHistory(false);
                    Toast.show({
                        type: 'info',
                        text1: 'Vous avez atteint le début de la conversation',
                        visibilityTime: 1500,
                    });
                    return;
                }
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.trackingId));
                    const deduped = older.filter(m => !existingIds.has(m.trackingId));
                    if (deduped.length === 0) {
                        setHasMoreHistory(false);
                        Toast.show({
                            type: 'info',
                            text1: 'Vous avez atteint le début de la conversation',
                            visibilityTime: 1500,
                        });
                        return prev;
                    }
                    return [...deduped, ...prev];
                });
            })
            .catch((e) => {
                console.error('Load more history failed:', e);
                Toast.show({ type: 'error', text1: 'Impossible de charger les messages précédents' });
            })
            .finally(() => setLoadingMore(false));

        return current;
    });
}, [discussionId, loadingMore, hasMoreHistory]);
    // =========================
    // SEND TEXT / FILE / STICKER / MODÉRATION — inchangés
    // =========================
    const sendText = useCallback(
        async (text: string, statut?: DiscussionStatus) => {
            if (!text.trim() || !user) return;

            setSending(true);
            try {
                const socket = socketRef.current;

                const payload = {
                    contenu: text.trim(),
                    discussionId,
                    senderId: user.trackingId,
                    type: MessageType.TEXT,
                    discussionStatut: statut,
                };

                const created = socket?.connected
                    ? await emitWithAck<Message>(socket, 'sendMessage', payload)
                    : await messageService.send({
                        contenu: payload.contenu,
                        discussionId,
                        senderId: user.trackingId,
                        type: MessageType.TEXT,
                    });

                appendMessage(created);
            } catch (e: any) {
                console.error('Send text failed:', e);
                Toast.show({ type: 'error', text1: e?.message ?? "Échec de l'envoi du message" });
            } finally {
                setSending(false);
            }
        },
        [discussionId, user, appendMessage]
    );

    const sendFile = useCallback(
        async (
            file: { uri: string; name: string; type: string },
            messageType: MessageType
        ) => {
            if (!user) return;

            setSending(true);
            try {
                const fileUrl = await messageService.uploadFile(file);

                const socket = socketRef.current;

                const payload = {
                    contenu: messageType === MessageType.STICKER ? file.name : fileUrl,
                    discussionId,
                    senderId: user.trackingId,
                    type: messageType,
                    image: fileUrl,
                };

                const created = socket?.connected
                    ? await emitWithAck<Message>(socket, 'sendMessage', payload)
                    : await messageService.send({
                        contenu: payload.contenu,
                        discussionId,
                        senderId: user.trackingId,
                        type: messageType,
                        image: fileUrl,
                    });

                appendMessage(created);
            } catch (e: any) {
                console.error('Send file failed:', e);
                Toast.show({ type: 'error', text1: e?.message ?? "Échec de l'envoi du fichier" });
            } finally {
                setSending(false);
            }
        },
        [discussionId, user, appendMessage]
    );

    const sendSticker = useCallback(
        async (stickerImage: string) => {
            if (!user) return;

            setSending(true);
            try {
                const socket = socketRef.current;

                const payload = {
                    contenu: stickerImage,
                    discussionId,
                    senderId: user.trackingId,
                    type: MessageType.STICKER,
                };

                const created = socket?.connected
                    ? await emitWithAck<Message>(socket, 'sendMessage', payload)
                    : await messageService.send({
                        contenu: stickerImage,
                        discussionId,
                        senderId: user.trackingId,
                        type: MessageType.STICKER,
                    });

                appendMessage(created);
            } catch (e: any) {
                console.error('Send sticker failed:', e);
                Toast.show({ type: 'error', text1: e?.message ?? "Échec de l'envoi du sticker" });
            } finally {
                setSending(false);
            }
        },
        [discussionId, user, appendMessage]
    );

    const deleteMessage = useCallback(async (messageId: string) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
            Toast.show({ type: 'error', text1: 'Veuillez vérifier votre connexion.' });
            return;
        }
        try {
            await emitWithAck(socket, 'deleteMessage', { messageId });
        } catch (e: any) {
            console.error('Delete message failed:', e);
            Toast.show({ type: 'error', text1: e?.message ?? 'Échec de la suppression' });
        }
    }, []);

    const pinMessage = useCallback(async (messageId: string) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
            Toast.show({ type: 'error', text1: 'Veuillez vérifier votre connexion.' });
            return;
        }
        try {
            await emitWithAck(socket, 'pinMessage', { messageId });
        } catch (e: any) {
            console.error('Pin message failed:', e);
            Toast.show({ type: 'error', text1: e?.message ?? "Échec de l'épinglage" });
        }
    }, []);

    const unpinMessage = useCallback(async (messageId: string) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
            Toast.show({ type: 'error', text1: 'Veuillez vérifier votre connexion.' });
            return;
        }
        try {
            await emitWithAck(socket, 'unpinMessage', { messageId });
        } catch (e: any) {
            console.error('Unpin message failed:', e);
            Toast.show({ type: 'error', text1: e?.message ?? 'Échec du désépinglage' });
        }
    }, []);

    const toggleDiscussionLock = useCallback(async (active: boolean) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
            Toast.show({ type: 'error', text1: 'Veuillez vérifier votre connexion.' });
            return;
        }
        try {
            await emitWithAck(socket, 'toggleDiscussionLock', { discussionId, active });
        } catch (e: any) {
            console.error('Toggle discussion lock failed:', e);
            Toast.show({ type: 'error', text1: e?.message ?? 'Échec du verrouillage' });
        }
    }, [discussionId]);

    return {
        messages,
        loading,
        loadingMore,
        hasMoreHistory,
        loadMoreHistory,
        sending,
        discussionActive,
        sendText,
        sendFile,
        sendSticker,
        deleteMessage,
        pinMessage,
        unpinMessage,
        toggleDiscussionLock,
        currentUserId: user?.trackingId,
        currentUserRole: user?.role,
    };
}
