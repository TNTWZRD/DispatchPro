
"use server";

import 'dotenv/config';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Message } from '@/lib/types';
import { getThreadIds } from '@/lib/utils';

export async function deleteMessage(messageId: string) {
    try {
        await deleteDoc(doc(db, 'messages', messageId));
        revalidatePath('/'); // Revalidate the main dispatch page
        revalidatePath('/driver'); // Revalidate the driver page
        return { type: "success", message: "Message deleted." };
    } catch (error: any) {
        console.error("Failed to delete message:", error);
        return { type: "error", message: `Failed to delete message: ${error.message}` };
    }
}

export async function forwardMessage(message: Message, recipientId: string, senderId: string) {
     try {
        const { id, ...originalMessage } = message;

        const newMessage: Omit<Message, 'id'> = {
            threadId: getThreadIds(senderId, recipientId),
            recipientId: recipientId,
            senderId: senderId,
            timestamp: serverTimestamp() as any,
            isRead: false,
            text: originalMessage.text,
            imageUrl: originalMessage.imageUrl,
            audioUrl: originalMessage.audioUrl,
        };

        await addDoc(collection(db, 'messages'), newMessage);
        
        revalidatePath('/');
        revalidatePath('/driver');
        return { type: "success", message: "Message forwarded." };
    } catch (error: any) {
        console.error("Failed to forward message:", error);
        return { type: "error", message: `Failed to forward message: ${error.message}` };
    }
}
