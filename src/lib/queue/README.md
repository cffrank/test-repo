# Queue-Based File Upload System

A TypeScript library for handling large CSV file uploads through a chunked, queue-based architecture using Cloudflare services (R2, KV, Queues).

## Architecture

```
Client Upload → API Route → R2 Storage → Queue → Worker → Database
                    ↓
                   KV (Job Status)
```

### Components

1. **R2 (Object Storage)**: Stores uploaded file chunks
2. **KV (Key-Value Store)**: Tracks job status and progress
3. **Queue**: Manages chunk processing jobs
4. **Worker**: Processes chunks, validates, and inserts into database

## Files

### `types.ts`
Core TypeScript types for the queue system.

- `JobStatus`: Tracks upload job progress
- `ChunkMessage`: Message format for queue processing
- `ChunkValidationResult`: Validation results for CSV chunks

### `constants.ts`
System configuration constants.

- `CHUNK_SIZE`: 5MB chunks for upload
- `BATCH_SIZE`: 500 rows per database batch insert
- `MAX_CONCURRENT_UPLOADS`: 3 concurrent uploads
- `VALIDATOR_URL`: CSV validation service endpoint

### `r2.ts`
R2 object storage utilities.

```typescript
import { getChunk, putChunk, deleteJob } from '@/lib/queue';

// Store a chunk
await putChunk(bucket, jobId, chunkIndex, data);

// Retrieve a chunk
const chunk = await getChunk(bucket, jobId, chunkIndex);

// Clean up completed job
const cleanup = await deleteJob(bucket, jobId);
await cleanup(totalChunks);
```

### `kv.ts`
KV store utilities for job management.

```typescript
import { createJob, getJobStatus, updateJobStatus } from '@/lib/queue';

// Create a new job
const job = await createJob(kv, {
  id: 'job-123',
  userId: 'user-456',
  fileName: 'costs.csv',
  fileSize: 10485760,
  totalChunks: 2,
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

// Check progress
const status = await getJobStatus(kv, 'job-123');

// Update status
await updateJobStatus(kv, 'job-123', {
  chunksUploaded: 1,
  status: 'validating',
});
```

### `csv.ts`
CSV parsing utilities for chunked processing.

```typescript
import { extractHeader, parseChunkCSV, validateChunk, batchRows } from '@/lib/queue';

// First chunk - extract header
const header = extractHeader(csvText);
const rows = parseChunkCSV(csvText, true);

// Subsequent chunks - provide header
const moreRows = parseChunkCSV(nextChunkText, false, header);

// Validate data
const result = validateChunk(rows, ['service', 'amount', 'date']);

// Batch for insertion
const batches = batchRows(rows, 500);
```

## Usage Examples

### API Route: Upload Initialization

```typescript
import { createJob, CHUNK_SIZE } from '@/lib/queue';

export async function POST(req: Request) {
  const { fileName, fileSize } = await req.json();
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  const job = await createJob(env.KV, {
    id: crypto.randomUUID(),
    userId: session.userId,
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

  return Response.json({ jobId: job.id, totalChunks });
}
```

### API Route: Chunk Upload

```typescript
import { putChunk, updateJobStatus, incrementJobCounter } from '@/lib/queue';

export async function POST(req: Request) {
  const data = await req.arrayBuffer();
  const { jobId, chunkIndex } = await req.json();

  // Store chunk in R2
  await putChunk(env.R2, jobId, chunkIndex, data);

  // Update progress
  await incrementJobCounter(env.KV, jobId, 'chunksUploaded');

  // Queue for processing
  await env.QUEUE.send({
    jobId,
    chunkIndex,
    totalChunks,
    userId,
    projectId,
  });

  return Response.json({ success: true });
}
```

### Queue Consumer Worker

```typescript
import { getChunk, parseChunkCSV, extractHeader, validateChunk, updateJobStatus } from '@/lib/queue';

export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      const { jobId, chunkIndex } = message.body;

      try {
        // Get chunk from R2
        const chunk = await getChunk(env.R2, jobId, chunkIndex);
        const text = await chunk.text();

        // Parse CSV
        const isFirst = chunkIndex === 0;
        const header = isFirst ? extractHeader(text) : await getHeader(env.KV, jobId);
        const rows = parseChunkCSV(text, isFirst, header);

        // Validate
        const validation = validateChunk(rows);
        if (!validation.valid) {
          await addJobError(env.KV, jobId, validation.errors.join(', '));
          return;
        }

        // Process rows...
        await incrementJobCounter(env.KV, jobId, 'chunksProcessed');

      } catch (error) {
        await updateJobStatus(env.KV, jobId, {
          status: 'failed',
          errors: [error.message],
        });
      }
    }
  }
};
```

## Error Handling

All functions throw descriptive errors that can be caught and handled:

```typescript
try {
  const job = await getJobStatus(kv, jobId);
  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
} catch (error) {
  console.error('Failed to get job:', error);
  return Response.json({ error: 'Internal error' }, { status: 500 });
}
```

## Type Safety

All functions are fully typed with TypeScript. Import types as needed:

```typescript
import type { JobStatus, ChunkMessage, KVNamespace, R2Bucket } from '@/lib/queue';
```

## Testing

The utilities are designed to work with both Cloudflare Workers and Next.js API routes. You can mock the R2Bucket and KVNamespace interfaces for testing:

```typescript
const mockKV: KVNamespace = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

const mockR2: R2Bucket = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
```
