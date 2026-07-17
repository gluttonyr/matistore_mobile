import { User } from "./user.types";

 export enum MessageType {
   TEXT = 'text',
   IMAGE = 'image',
    AUDIO = 'audio',
    STICKER = 'sticker',
 }


export interface Message {
  trackingId: string;
  contenu: string;
  type:MessageType;
  file?: string | null;
  lu: boolean;
  dateLu?: string | null;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  epingle: boolean;
  dateEnvoi?: string | null;
  senderTrackingId?: string | null;
  sender?: User | null;
  discussionTrackingId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Messages = Message[];
