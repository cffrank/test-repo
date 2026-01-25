# Cloudflare Infrastructure Setup

This document describes how to set up the Cloudflare infrastructure for the large file upload queue system.

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Authenticated with Cloudflare: `wrangler login`

## Infrastructure Components

| Component | Binding | Resource Name | Purpose |
|-----------|---------|---------------|---------|
| R2 Bucket | `UPLOADS_BUCKET` | `finops-uploads` | Store uploaded files |
| Queue | `FILE_QUEUE` | `file-processing` | Process file jobs asynchronously |
| KV Namespace | `JOB_STATUS` | `job-status` | Track job status and metadata |

## Setup Instructions

### 1. Create R2 Bucket

```bash
wrangler r2 bucket create finops-uploads
```

Optional: Enable public access if needed:
```bash
wrangler r2 bucket update finops-uploads --public
```

### 2. Create Cloudflare Queue

Create the main processing queue:
```bash
wrangler queues create file-processing
```

Create the dead letter queue for failed messages:
```bash
wrangler queues create file-processing-dlq
```

### 3. Create KV Namespace

```bash
wrangler kv:namespace create job-status
```

This will output something like:
```
Add the following to your configuration file in your kv_namespaces array:
{ binding = "JOB_STATUS", id = "abc123..." }
```

**Important:** Copy the `id` value and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "JOB_STATUS"
id = "YOUR_NAMESPACE_ID_HERE"
```

For local development, also create a preview namespace:
```bash
wrangler kv:namespace create job-status --preview
```

Then add the `preview_id` to `wrangler.toml`.

## Quick Setup Script

Run all setup commands at once:

```bash
#!/bin/bash
set -e

echo "Creating R2 bucket..."
wrangler r2 bucket create finops-uploads

echo "Creating processing queue..."
wrangler queues create file-processing

echo "Creating dead letter queue..."
wrangler queues create file-processing-dlq

echo "Creating KV namespace..."
wrangler kv:namespace create job-status

echo ""
echo "Setup complete!"
echo "IMPORTANT: Update wrangler.toml with the KV namespace ID from the output above."
```

## Verify Setup

List your resources to verify they were created:

```bash
# List R2 buckets
wrangler r2 bucket list

# List queues
wrangler queues list

# List KV namespaces
wrangler kv:namespace list
```

## Queue Consumer Configuration

The queue consumer is configured in `wrangler.toml` with the following settings:

| Setting | Value | Description |
|---------|-------|-------------|
| `max_batch_size` | 10 | Maximum messages per batch |
| `max_batch_timeout` | 30 | Seconds to wait before processing partial batch |
| `max_retries` | 3 | Retry attempts before sending to DLQ |
| `dead_letter_queue` | `file-processing-dlq` | Queue for failed messages |

## Environment Bindings

After setup, these bindings are available in your Worker:

```typescript
interface Env {
  UPLOADS_BUCKET: R2Bucket;
  FILE_QUEUE: Queue;
  JOB_STATUS: KVNamespace;
}
```

## Usage Examples

### Upload a file to R2

```typescript
await env.UPLOADS_BUCKET.put(key, fileData, {
  httpMetadata: { contentType: 'application/octet-stream' },
  customMetadata: { uploadedBy: userId }
});
```

### Send a message to the queue

```typescript
await env.FILE_QUEUE.send({
  jobId: crypto.randomUUID(),
  fileKey: key,
  action: 'process',
  timestamp: Date.now()
});
```

### Track job status in KV

```typescript
// Set status
await env.JOB_STATUS.put(jobId, JSON.stringify({
  status: 'processing',
  progress: 50,
  updatedAt: Date.now()
}), { expirationTtl: 86400 }); // 24 hour TTL

// Get status
const status = await env.JOB_STATUS.get(jobId, 'json');
```

## Cleanup

To remove all resources:

```bash
wrangler r2 bucket delete finops-uploads
wrangler queues delete file-processing
wrangler queues delete file-processing-dlq
wrangler kv:namespace delete --namespace-id YOUR_NAMESPACE_ID
```

## Troubleshooting

### Queue messages not being processed
- Ensure the consumer is deployed: `wrangler deploy`
- Check the queue dashboard in Cloudflare for pending messages
- Review dead letter queue for failed messages

### KV namespace ID not found
- Run `wrangler kv:namespace list` to find the correct ID
- Ensure the ID in `wrangler.toml` matches exactly

### R2 bucket access denied
- Verify the bucket exists: `wrangler r2 bucket list`
- Check the binding name matches in code and config
