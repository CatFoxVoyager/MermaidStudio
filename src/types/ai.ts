export type MachineSize = 'low' | 'high';

export interface AIProviderConfig {
  machineSize: MachineSize;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
