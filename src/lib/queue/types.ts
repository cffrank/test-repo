export type JobStatusType =
  | "uploading"
  | "validating"
  | "processing"
  | "complete"
  | "failed";

export interface JobStatus {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  chunksUploaded: number;
  chunksValidated: number;
  chunksProcessed: number;
  rowsInserted: number;
  totalRows: number;
  status: JobStatusType;
  errors: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChunkMessage {
  jobId: string;
  chunkIndex: number;
  totalChunks: number;
  userId: string;
  projectId: string;
}

export interface ChunkValidationResult {
  valid: boolean;
  rowCount: number;
  errors: string[];
}
