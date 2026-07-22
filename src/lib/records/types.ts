export type Role = "EMPLOYEE" | "GLOBAL_ADMIN" | "MANAGER";

export type AppUser = {
  id: string;
  username: string;
  role: Role;
  name: string | null;
  isActive: boolean;
  createdAt: string;
};

export type OperatorRecord = {
  id: string;
  collaboratorId: string;
  operatorName: string;
  clientName: string;
  amountInCents: number;
  activated: boolean;
  createdAt: string;
  storeName?: string;
  subRole?: string;
};

export type OperatorSummary = {
  operatorName: string;
  collaboratorId?: string;
  subRole?: string;
  count: number;
  totalInCents: number;
  averageInCents: number;
  percentage: number;
  color: string;
};

export type DateGroup = {
  dateKey: string;
  label: string;
  relativeLabel: string;
  records: OperatorRecord[];
  count: number;
  totalInCents: number;
  operators: OperatorSummary[];
};

export type DailyMetric = {
  id: string;
  storeId: string;
  dateKey: string;
  totalCustomers: number;
  createdAt: string;
};

export type MonthGroup = {
  monthKey: string;
  label: string;
  year: number;
  records: OperatorRecord[];
  digitacoes: import("./digitacoes-repository").Digitacao[];
  count: number;
  activeCount: number;
  totalInCents: number;
  totalCustomers: number;
  dateGroups: DateGroup[];
};

export type DashboardSummary = {
  totalCards: number;
  totalAmountInCents: number;
  operatorCount: number;
  topOperator: OperatorSummary | null;
};

export type RecordsPayload = {
  records: OperatorRecord[];
  digitacoes: import("./digitacoes-repository").Digitacao[];
  dailyMetrics: import("./types").DailyMetric[];
  summary: DashboardSummary;
};

export type CreateRecordPayload = {
  collaboratorId: string; // Trocado de operatorName para usar autocomplete
  clientName: string;
  amountInCents: number;
  activated: boolean;
};

export type CollaboratorSubRole =
  | "Funcionario Operacional"
  | "Caixa"
  | "Lider de Caixa"
  | "VM"
  | "Vendedor"
  | "Gerente";

export type Collaborator = {
  id: string;
  name: string;
  subRole: CollaboratorSubRole;
  isActive: boolean;
  mergedIntoId: string | null;
  storeId?: string | null;
  createdAt: string;
  recordCount?: number;
  totalInCents?: number;
};

export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: any;
  ipAddress: string | null;
  createdAt: string;
};
