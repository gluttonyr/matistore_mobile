export type TransactionType = 'DEPOT' | 'RETRAIT';
export type TransactionStatus =
  | 'EN_ATTENTE_AUTO'
  | 'EN_VERIFICATION'
  | 'EN_ATTENTE_PREUVE'
  | 'EN_ATTENTE_ADMIN'
  | 'EN_RECLAMATION'
  | 'VALIDEE'
  | 'REJETEE'
  | 'ANNULEE';

export interface AdminCaptureStatus {
  available: boolean;
  deviceAvailable: boolean;
  manualOverride: boolean;
  reason: string | null;
  lastHeartbeatAt: string | null;
  consecutiveHealthySignalsRequired: number;
  heartbeatIntervalSeconds: number;
  staleAfterSeconds: number;
  reminderIntervalMinutes: number;
}
export type ValidationMethod = 'AUTO_NOTIFICATION' | 'ADMIN_MANUEL';

export interface Transaction {
  trackingId: string;
  userId: number;
  userName?: string;
  type: TransactionType;
  statut: TransactionStatus;
  montant: number;
  operateur?: string | null;
  numeroTelephone?: string | null;
  compteDestinataire?: string | null;
  codeRetrait?: string | null;
  discussionTrackingId: string;
  referencePaiement?: string | null;
  referenceClient?: string | null;
  notificationBruteClient?: string | null;
  notificationBrute?: string | null;
  methodeValidation?: ValidationMethod | null;
  preuveFichier?: string | null;
  valideParId?: number | null;
  motifRejet?: string | null;
  creditError?: string | null;
  dateReclamation?: string | null;
  dateTraitementReclamation?: string | null;
  captureReconciliationRequired?: boolean;
  dateValidation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  counts?: {
    claims: number;
    captureReconciliation: number;
  };
}

export interface TransactionPageParams {
  page: number;
  limit: number;
  search?: string;
  type?: TransactionType | 'all';
  status?: TransactionStatus | 'all';
  discussionId?: string;
}

export interface CreateTransactionDto {
  type: TransactionType;
  montant?: number;
  operateur?: string;
  numeroTelephone?: string;
  compteDestinataire?: string;
  codeRetrait?: string;
}

export interface UpdateTransactionDto {
  statut?: TransactionStatus;
  referencePaiement?: string;
  notificationBrute?: string;
  methodeValidation?: ValidationMethod;
  preuveFichier?: string;
  motifRejet?: string;
}

export interface AdminCaptureDto {
  operateur: string;
  montant: number;
  referencePaiement: string;
  numeroTelephoneClient: string;
  notificationBrute: string;
  packageNotification: string;
}

export interface ResolveClaimDto {
  decision: 'VALIDEE' | 'REJETEE';
  motif?: string;
}

export interface RejectTransactionDto {
  motif: string;
}
