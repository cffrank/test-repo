# Queue System Quick Reference

## Import Everything

```typescript
import {
  // Types
  type JobStatus,
  type ChunkMessage,
  type R2Bucket,
  type KVNamespace,

  // Constants
  CHUNK_SIZE,
  BATCH_SIZE,

  // Job Management
  createJob,
  getJobStatus,
  updateJobStatus,
  incrementJobCounter,

  // R2 Operations
  putChunk,
  getChunk,

  // CSV Processing
  extractHeader,
  parseChunkCSV,
  validateChunk,
  batchRows,

  // Helpers
  generateJobId,
  calculateTotalChunks,
  createJobSummary,
} from '@/lib/queue';
```

## Common Patterns

### Initialize Upload

```typescript
const jobId = generateJobId();
const totalChunks = calculateTotalChunks(fileSize, CHUNK_SIZE);

await createJob(kv, {
  id: jobId,
  userId,
  fileName,
  fileSize,
  totalChunks,
  chunksUploaded: 0,
  chunksValidated: 0,
  chunksProcessed: 0,
  rowsInserted: 0,
  totalRows: 0,
  status: 'uploading',
  errors: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

### Upload Chunk

```typescript
await putChunk(r2, jobId, chunkIndex, arrayBuffer);
await incrementJobCounter(kv, jobId, 'chunksUploaded');
```

### Process Chunk

```typescript
const chunk = await getChunk(r2, jobId, chunkIndex);
const text = await chunk.text();

const isFirst = chunkIndex === 0;
const header = isFirst ? extractHeader(text) : storedHeader;
const rows = parseChunkCSV(text, isFirst, header);

const validation = validateChunk(rows);
if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}
```

### Insert to Database

```typescript
const batches = batchRows(rows, BATCH_SIZE);

for (const batch of batches) {
  await db.insert(costs).values(batch);
  await incrementJobCounter(kv, jobId, 'rowsInserted', batch.length);
}
```

### Check Progress

```typescript
const job = await getJobStatus(kv, jobId);
const summary = createJobSummary(job);

console.log(summary.statusMessage);
console.log(`${summary.progress.overall}% complete`);
console.log(summary.timeRemaining);
```

## Status Flow

```
uploading → validating → processing → complete
    ↓           ↓            ↓
               failed
```

## Error Handling

```typescript
try {
  const job = await getJobStatus(kv, jobId);
  if (!job) {
    return { error: 'Job not found' };
  }
} catch (error) {
  await updateJobStatus(kv, jobId, {
    status: 'failed',
    errors: [error.message],
  });
}
```

## Testing

```typescript
import { vi } from 'vitest';

const mockKV: KVNamespace = {
  get: vi.fn().mockResolvedValue(JSON.stringify(mockJob)),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
};

const mockR2: R2Bucket = {
  get: vi.fn().mockResolvedValue({ text: () => csvData }),
  put: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue(undefined),
};
```
