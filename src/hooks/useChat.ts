import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import Toast from 'react-native-toast-message';

import { DiscussionStatus } from '@/data_api/models/discussion.types';
import { Message, MessageType } from '@/data_api/models/message.types';
import { messageService } from '@/data_api/services/messageService';
import { socketService } from '@/data_api/services/socketService';
import { useAuth } from '@/hooks/useAuth';

const ACK_TIMEOUT_MS = 10000;

// Émet un événement socket et attend la confirmation (ack) du serveur, avec un
// timeout : sans ça, si le serveur ne répond jamais, l'appelant resterait bloqué
// indéfiniment (ex: "sending" qui ne redevient jamais false). Le serveur peut
// aussi acquitter avec { success: false, error } (ex: action non autorisée) :
// dans ce cas on rejette avec le message renvoyé plutôt que de résoudre.
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

export function useChat(discussionId: string) {
    const { user, token } = useAuth(); // ✅ UNE SEULE source d’auth

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    // null tant qu'aucun événement de verrouillage n'a été reçu : l'appelant
    // doit alors se fier à la valeur `active` obtenue via discussionService.
    const [discussionActive, setDiscussionActive] = useState<boolean | null>(null);

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

        const handleNewMessage = (msg: Message) => appendMessage(msg);

        const handleUpdate = (updated: Message) => {
            setMessages(prev =>
                prev.map(m =>
                    m.trackingId === updated.trackingId ? updated : m
                )
            );
        };

        const handleDelete = ({ messageId }: { messageId: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    m.trackingId === messageId
                        ? { ...m, isDeleted: true, contenu: 'Message supprimé' }
                        : m
                )
            );
        };

        // Envoyé par le serveur quand l'autre participant rejoint la discussion
        // (donc est en ligne et a la conversation ouverte) : ses messages non lus
        // passent à "lu", ce qui fait apparaître la double coche côté expéditeur.
        const handleMessagesRead = (updatedMessages: Message[]) => {
            setMessages(prev =>
                prev.map(m => updatedMessages.find(u => u.trackingId === m.trackingId) ?? m)
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

        // cleanup propre
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
    // HISTORY LOAD
    // =========================
    useEffect(() => {
        if (!discussionId) {
            // Pas de discussion valide : rien à charger, mais il ne faut pas rester
            // bloqué sur "loading" indéfiniment (l'écran tournerait sans jamais rien afficher).
            setMessages([]);
            setLoading(false);
            return;
        }

        const loadHistory = async () => {
            try {
                setLoading(true);
                const history = await messageService.getByDiscussion(discussionId);
                setMessages(history);
            } catch (e) {
                console.error('Failed to load messages:', e);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [discussionId]);

    // =========================
    // SEND TEXT
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

                // On attend une vraie confirmation (ack socket, ou réponse HTTP) avant
                // de considérer l'envoi terminé, et on ajoute nous-mêmes le message reçu
                // à la liste locale : on ne dépend plus uniquement de l'écho "newMessage"
                // (qui pouvait arriver après que l'écran ait déjà changé de vue).
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

    // =========================
    // SEND FILE
    // =========================
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

    // =========================
    // SEND STICKER
    // =========================
    const sendSticker = useCallback(
        async (stickerImage: string) => {
            if (!user) return;

            setSending(true);
            try {
                const socket = socketRef.current;

                // Le contenu du message EST le nom de fichier du sticker (attribut `image`
                // du sticker) : à l'affichage, on ira le chercher via useFileUrl('stickers', ...).
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

    // =========================
    // DELETE / PIN / UNPIN (modération admin)
    // =========================
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
