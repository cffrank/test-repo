# Cloudflare Queue Consumer Worker

## Overview

This directory contains the Cloudflare Worker that processes file upload chunks from the `file-processing` queue. The worker validates CSV chunks via the Railway validator service and inserts validated data into the Neon database.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  API Route   │────▶│   R2 Bucket │
│  (Upload)   │     │ (chunk data) │     │   (chunks)  │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  FILE_QUEUE  │
                    │  (messages)  │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │Queue Consumer│◀────┐
                    │    Worker    │     │ (retry on error)
                    └──────────────┘     │
                            │            │
                    ┌───────┴────────┐   │
                    ▼                ▼   │
            ┌──────────────┐  ┌─────────┴──┐
            │   Validator  │  │  Database  │
            │  (Railway)   │  │   (Neon)   │
            └──────────────┘  └────────────┘
```

## Files

- **`queue-consumer.ts`** - Main worker that processes chunk messages
- **`types.ts`** - TypeScript definitions for worker environment bindings
- **`README.md`** - This file

## Message Processing Flow

1. **Download Chunk**: Fetch chunk from R2 storage (`uploads/{jobId}/chunk_{index}.csv`)
2. **Extract Header**: For first chunk, extract CSV header and store in KV
3. **Validate**: Send chunk to Railway validator service (`POST /validate`)
4. **Parse CSV**: Parse rows using `parseChunkCSV` utility
5. **Batch Insert**: Insert rows to Neon database (500 rows per batch)
6. **Update Progress**: Increment counters in KV (chunksValidated, chunksProcessed, rowsInserted)
7. **Complete Job**: When all chunks processed, update job status to 'complete'

## Error Handling

### Retryable Errors
- Network failures (validator unavailable)
- Database connection errors
- Temporary service outages

**Behavior**: Message is retried (up to `max_retries` configured in wrangler.toml)

### Non-Retryable Errors
- Validation failures (invalid CSV format)
- Missing job data
- Job already failed/completed

**Behavior**: Message is acknowledged immediately (no retry)

### Dead Letter Queue
After `max_retries` failed attempts, messages are sent to the `file-processing-dlq` dead letter queue for manual investigation.

## Configuration

### Environment Variables (wrangler.toml)

```toml
# Required bindings
[[r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "finops-uploads"

[[queues.consumers]]
queue = "file-processing"
max_batch_size = 10        # Process up to 10 messages per batch
max_batch_timeout = 30     # Wait max 30s to fill batch
max_retries = 3            # Retry failed messages 3 times
dead_letter_queue = "file-processing-dlq"

[[kv_namespaces]]
binding = "JOB_STATUS"
id = "YOUR_KV_NAMESPACE_ID"

# Required secrets (set via wrangler secret put)
DATABASE_URL = "postgresql://..."
VALIDATOR_URL = "https://validator-production.railway.app"
```

### Secrets

Set these via Wrangler CLI:

```bash
# Neon database connection string
wrangler secret put DATABASE_URL

# Railway validator service URL
wrangler secret put VALIDATOR_URL
```

## Deployment

### Prerequisites

1. **Cloudflare Account** with Workers enabled
2. **R2 Bucket** created (`finops-uploads`)
3. **KV Namespace** created for job status
4. **Queue** created (`file-processing`)
5. **Neon Database** with expenses table
6. **Railway Validator** service deployed

### Deploy Steps

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Create R2 Bucket**:
   ```bash
   wrangler r2 bucket create finops-uploads
   ```

3. **Create KV Namespace**:
   ```bash
   wrangler kv:namespace create JOB_STATUS
   # Copy the namespace ID to wrangler.toml
   ```

4. **Create Queue**:
   ```bash
   wrangler queues create file-processing
   wrangler queues create file-processing-dlq
   ```

5. **Set Secrets**:
   ```bash
   wrangler secret put DATABASE_URL
   wrangler secret put VALIDATOR_URL
   ```

6. **Deploy Worker**:
   ```bash
   wrangler deploy
   ```

## Monitoring

### Logs

View real-time logs:
```bash
wrangler tail
```

### Metrics

Monitor in Cloudflare Dashboard:
- Queue depth (pending messages)
- Consumer throughput (messages/second)
- Error rate
- Dead letter queue size

### KV Job Status

Check job progress:
```bash
wrangler kv:key get --namespace-id=YOUR_ID "job:YOUR_JOB_ID"
```

## Local Development

### Testing with Miniflare

```bash
# Install Miniflare
npm install -D miniflare

# Run local worker
wrangler dev
```

### Mock Services

For local testing, you can mock:
- **R2**: Use local file system or mock R2 responses
- **Validator**: Point to localhost validator service
- **Database**: Use local Neon branch or mock database

## Database Schema

The worker expects expenses table with this schema:

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  service TEXT,
  account_id TEXT,
  region TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Performance Optimization

### Batch Size Tuning

- **Small batches (100-200 rows)**: Better for real-time feedback, higher overhead
- **Large batches (500-1000 rows)**: Better throughput, delayed feedback
- **Current setting**: 500 rows per batch (good balance)

### Queue Configuration

- **max_batch_size**: Higher = more messages processed per invocation (lower cost)
- **max_batch_timeout**: Lower = faster processing start, may process partial batches
- **max_retries**: Higher = more resilient, but delays error detection

### Database Optimization

- Use connection pooling (Neon Serverless handles this)
- Batch inserts (currently 500 rows per batch)
- Use indexes on frequently queried columns (projectId, date, category)

## Troubleshooting

### Messages stuck in queue

**Cause**: Worker failing to process messages
**Solution**: Check worker logs for errors, verify DATABASE_URL and VALIDATOR_URL

### High dead letter queue size

**Cause**: Persistent validation or database errors
**Solution**: Inspect DLQ messages, check validator service, verify CSV format

### Slow processing

**Cause**: Large chunks, slow database inserts, validator latency
**Solution**: Reduce chunk size, tune batch size, check database performance

### Job stuck in "processing" status

**Cause**: Worker crashed, message lost
**Solution**: Check queue depth, manually update job status, reprocess chunks

## Security

- **KV Access**: Isolated by namespace, no cross-job access
- **R2 Access**: Bucket-scoped, chunks isolated by jobId
- **Database**: Use read/write role with minimal permissions
- **Validator**: Validate response to prevent injection attacks

## Future Enhancements

- [ ] Parallel chunk processing (currently sequential)
- [ ] Automatic chunk cleanup after configurable retention period
- [ ] Dead letter queue processing and retry mechanism
- [ ] Enhanced validation with custom rules
- [ ] Real-time progress streaming via WebSockets
- [ ] Multi-region deployment for global performance
