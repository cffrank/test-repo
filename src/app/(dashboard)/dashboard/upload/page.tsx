"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { CHUNK_SIZE, MAX_CONCURRENT_UPLOADS } from "@/lib/queue/constants";
import type { JobStatus, JobStatusType } from "@/lib/queue/types";

interface InitUploadResponse {
  jobId: string;
  presignedUrls: string[];
}

interface UploadState {
  status: "idle" | "uploading" | "validating" | "processing" | "complete" | "failed";
  jobId: string | null;
  uploadProgress: number;
  validationProgress: number;
  processingProgress: number;
  currentMessage: string;
  errors: string[];
  jobDetails: JobStatus | null;
}

const initialState: UploadState = {
  status: "idle",
  jobId: null,
  uploadProgress: 0,
  validationProgress: 0,
  processingProgress: 0,
  currentMessage: "",
  errors: [],
  jobDetails: null,
};

export default function UploadPage() {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>(initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setState(initialState);
  };

  // Split file into chunks
  const splitFileIntoChunks = (file: File): Blob[] => {
    const chunks: Blob[] = [];
    let start = 0;
    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      chunks.push(file.slice(start, end));
      start = end;
    }
    return chunks;
  };

  // Upload a single chunk to presigned URL
  const uploadChunk = async (
    chunk: Blob,
    presignedUrl: string,
    signal: AbortSignal
  ): Promise<void> => {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: chunk,
      headers: {
        "Content-Type": "application/octet-stream",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload chunk: ${response.status} ${response.statusText}`);
    }
  };

  // Upload chunks with concurrency limit
  const uploadChunksWithConcurrency = async (
    chunks: Blob[],
    presignedUrls: string[],
    signal: AbortSignal,
    onProgress: (completed: number) => void
  ): Promise<void> => {
    let completed = 0;
    const queue = chunks.map((chunk, index) => ({ chunk, url: presignedUrls[index], index }));
    const active: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;

      const item = queue.shift()!;
      try {
        await uploadChunk(item.chunk, item.url, signal);
        completed++;
        onProgress(completed);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          throw error;
        }
        throw new Error(`Failed to upload chunk ${item.index + 1}: ${(error as Error).message}`);
      }
    };

    // Process chunks with concurrency limit
    while (queue.length > 0 || active.length > 0) {
      // Fill up active promises to MAX_CONCURRENT_UPLOADS
      while (active.length < MAX_CONCURRENT_UPLOADS && queue.length > 0) {
        const promise = processNext();
        active.push(promise);
      }

      if (active.length > 0) {
        // Wait for at least one to complete
        await Promise.race(active);
        // Remove completed promises
        for (let i = active.length - 1; i >= 0; i--) {
          const p = active[i];
          // Check if promise is settled by racing with an immediate resolve
          const result = await Promise.race([p.then(() => "done"), Promise.resolve("pending")]);
          if (result === "done") {
            active.splice(i, 1);
          }
        }
      }
    }
  };

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: string): Promise<void> => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/upload/status/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const jobStatus: JobStatus = await response.json();

        setState((prev) => {
          const validationProgress =
            jobStatus.totalChunks > 0
              ? Math.round((jobStatus.chunksValidated / jobStatus.totalChunks) * 100)
              : 0;
          const processingProgress =
            jobStatus.totalRows > 0
              ? Math.round((jobStatus.rowsInserted / jobStatus.totalRows) * 100)
              : jobStatus.chunksProcessed > 0 && jobStatus.totalChunks > 0
              ? Math.round((jobStatus.chunksProcessed / jobStatus.totalChunks) * 100)
              : 0;

          let currentMessage = "";
          let status = prev.status;

          switch (jobStatus.status as JobStatusType) {
            case "uploading":
              currentMessage = "Uploading file chunks...";
              status = "uploading";
              break;
            case "validating":
              currentMessage = `Validating data... (${jobStatus.chunksValidated}/${jobStatus.totalChunks} chunks)`;
              status = "validating";
              break;
            case "processing":
              currentMessage = `Processing records... (${jobStatus.rowsInserted.toLocaleString()}/${jobStatus.totalRows.toLocaleString()} rows)`;
              status = "processing";
              break;
            case "complete":
              currentMessage = `Successfully processed ${jobStatus.rowsInserted.toLocaleString()} records`;
              status = "complete";
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              break;
            case "failed":
              currentMessage = "Processing failed";
              status = "failed";
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              break;
          }

          return {
            ...prev,
            status,
            validationProgress,
            processingProgress,
            currentMessage,
            errors: jobStatus.errors,
            jobDetails: jobStatus,
          };
        });
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Initial poll
    await poll();

    // Set up interval polling
    pollingIntervalRef.current = setInterval(poll, 2000);
  }, []);

  // Main upload function
  const startUpload = async () => {
    if (!file || !user) return;

    // Create abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Calculate chunks
    const chunks = splitFileIntoChunks(file);
    const totalChunks = chunks.length;

    setState({
      status: "uploading",
      jobId: null,
      uploadProgress: 0,
      validationProgress: 0,
      processingProgress: 0,
      currentMessage: "Initializing upload...",
      errors: [],
      jobDetails: null,
    });

    try {
      // Step 1: Initialize upload and get presigned URLs
      const initResponse = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
        }),
        signal,
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || "Failed to initialize upload");
      }

      const { jobId, presignedUrls }: InitUploadResponse = await initResponse.json();

      setState((prev) => ({
        ...prev,
        jobId,
        currentMessage: `Uploading ${totalChunks} chunk${totalChunks > 1 ? "s" : ""}...`,
      }));

      // Step 2: Upload chunks in parallel
      await uploadChunksWithConcurrency(
        chunks,
        presignedUrls,
        signal,
        (completed) => {
          const progress = Math.round((completed / totalChunks) * 100);
          setState((prev) => ({
            ...prev,
            uploadProgress: progress,
            currentMessage: `Uploading chunks... (${completed}/${totalChunks})`,
          }));
        }
      );

      // Step 3: Trigger processing
      setState((prev) => ({
        ...prev,
        uploadProgress: 100,
        status: "validating",
        currentMessage: "Upload complete. Starting validation...",
      }));

      const processResponse = await fetch("/api/upload/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
        signal,
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || "Failed to trigger processing");
      }

      // Step 4: Start polling for status
      await pollJobStatus(jobId);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setState((prev) => ({
          ...prev,
          status: "idle",
          currentMessage: "Upload cancelled",
          errors: [],
        }));
        return;
      }

      console.error("Upload error:", error);
      setState((prev) => ({
        ...prev,
        status: "failed",
        currentMessage: "Upload failed",
        errors: [(error as Error).message],
      }));
    }
  };

  // Cancel upload
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setState(initialState);
  };

  // Retry upload
  const retryUpload = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setState(initialState);
    if (file) {
      startUpload();
    }
  };

  // Reset to initial state
  const resetUpload = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setFile(null);
    setState(initialState);
  };

  const isUploading = state.status === "uploading";
  const isProcessing = state.status === "validating" || state.status === "processing";
  const isComplete = state.status === "complete";
  const isFailed = state.status === "failed";
  const isIdle = state.status === "idle";

  // Calculate overall progress
  const overallProgress =
    isComplete
      ? 100
      : isUploading
      ? state.uploadProgress * 0.4
      : state.status === "validating"
      ? 40 + state.validationProgress * 0.3
      : state.status === "processing"
      ? 70 + state.processingProgress * 0.3
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Ingestion</h1>
          <p className="text-slate-400">Upload your FOCUS-compliant AWS Cost & Usage Reports.</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-700 p-6">
        {/* File Drop Zone */}
        <div
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-slate-900/50 transition-colors
            ${dragActive ? "border-green-500 bg-green-500/10" : "border-slate-700 hover:bg-slate-800/50"}
            ${!isIdle ? "pointer-events-none opacity-50" : ""}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => isIdle && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".csv,.parquet"
            onChange={handleChange}
          />

          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {!file ? (
              <>
                <svg
                  className="w-10 h-10 mb-3 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">FOCUS-compliant CSV or Parquet files (chunked upload for large files)</p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-green-500 font-semibold mb-2">{file.name}</p>
                <p className="text-slate-500 text-xs">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {file.size > CHUNK_SIZE && (
                    <span className="ml-2 text-slate-400">
                      ({Math.ceil(file.size / CHUNK_SIZE)} chunks)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Display */}
        {!isIdle && (
          <div className="mt-6 space-y-4">
            {/* Current Status Message */}
            <div className="flex items-center gap-3">
              {(isUploading || isProcessing) && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              {isComplete && (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isFailed && (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span
                className={`text-sm ${
                  isComplete ? "text-green-400" : isFailed ? "text-red-400" : "text-blue-400"
                }`}
              >
                {state.currentMessage}
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Overall Progress</span>
                <span className="text-xs text-slate-400">{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isComplete ? "bg-green-500" : isFailed ? "bg-red-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Detailed Progress Steps */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* Upload Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Upload</span>
                  <span className="text-xs text-slate-500">{state.uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      state.uploadProgress >= 100 ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${state.uploadProgress}%` }}
                  />
                </div>
              </div>

              {/* Validation Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Validation</span>
                  <span className="text-xs text-slate-500">{state.validationProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      state.validationProgress >= 100 ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${state.validationProgress}%` }}
                  />
                </div>
              </div>

              {/* Processing Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Processing</span>
                  <span className="text-xs text-slate-500">{state.processingProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      state.processingProgress >= 100 ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${state.processingProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Job Details (if available) */}
            {state.jobDetails && (isProcessing || isComplete) && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-xs">
                <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <div>Chunks: {state.jobDetails.chunksUploaded}/{state.jobDetails.totalChunks}</div>
                  <div>Validated: {state.jobDetails.chunksValidated}/{state.jobDetails.totalChunks}</div>
                  <div>Rows: {state.jobDetails.rowsInserted.toLocaleString()}</div>
                  <div>Total Rows: {state.jobDetails.totalRows.toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {state.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-900/20 rounded-lg border border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-400 font-medium">Errors occurred</span>
                </div>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {state.errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-300 pl-2 border-l-2 border-red-700">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Message */}
            {isComplete && (
              <div className="mt-4 p-4 bg-green-900/20 rounded-lg border border-green-800">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 font-medium">Upload Complete</span>
                </div>
                <p className="text-sm text-green-300 mt-2">
                  Successfully processed {state.jobDetails?.rowsInserted.toLocaleString() || 0} records from {file?.name}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {/* Cancel button during upload/processing */}
          {(isUploading || isProcessing) && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                cancelUpload();
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
          )}

          {/* Reset/Start Over button */}
          {(isComplete || isFailed) && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                resetUpload();
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              {isComplete ? "Upload Another" : "Start Over"}
            </Button>
          )}

          {/* Retry button on failure */}
          {isFailed && file && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                retryUpload();
              }}
            >
              Retry Upload
            </Button>
          )}

          {/* Start upload button */}
          {file && isIdle && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                startUpload();
              }}
            >
              Start Upload
            </Button>
          )}
        </div>
      </Card>

      {/* Info Section */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>Supported format: FOCUS (FinOps Open Cost and Usage Specification) v1.2</p>
        <p>Required columns: BilledCost, ServiceName, ChargePeriodStart, RegionName</p>
        <p>Large files are automatically split into {CHUNK_SIZE / 1024 / 1024}MB chunks for reliable upload</p>
      </div>
    </div>
  );
}
